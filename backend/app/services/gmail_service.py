import secrets
import urllib.parse
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple, Dict, Any
import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.core.security import encrypt_token, decrypt_token, sanitize_email_content, ensure_utc
from backend.app.models.integration import OAuthIntegration, OAuthState, EmailMetadataCache


class GmailService:
    GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
    GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"

    @staticmethod
    def generate_auth_url(db: Session, user_id: str) -> Tuple[str, str]:
        """
        Generate OAuth authorization URL with CSRF state token bound to user.
        """
        if bool(settings.GOOGLE_CLIENT_ID) != bool(settings.GOOGLE_CLIENT_SECRET):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google OAuth is partially configured. Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
            )
        if (
            settings.ENVIRONMENT.lower() == "production"
            and not settings.GOOGLE_CLIENT_ID
            and not settings.GOOGLE_CLIENT_SECRET
        ):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google OAuth is unavailable in production. Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
            )

        state_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

        # Clean old states for this user
        db.query(OAuthState).filter(OAuthState.user_id == user_id).delete()

        # Save new state in DB
        oauth_state = OAuthState(
            user_id=user_id,
            state_token=state_token,
            expires_at=expires_at
        )
        db.add(oauth_state)
        db.commit()

        # If Google client ID is configured, build real Google OAuth URL
        if settings.GOOGLE_CLIENT_ID:
            params = {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "response_type": "code",
                "scope": settings.GMAIL_READONLY_SCOPE,
                "access_type": "offline",
                "prompt": "consent",
                "state": state_token,
            }
            auth_url = f"{GmailService.GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"
        else:
            # Local development mock OAuth redirect
            params = {
                "mock": "true",
                "state": state_token,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI
            }
            auth_url = f"{settings.GOOGLE_REDIRECT_URI}?code=mock_google_code_12345&state={state_token}"

        return auth_url, state_token

    @staticmethod
    async def handle_callback(db: Session, user_id: str, code: str, state: str) -> OAuthIntegration:
        """
        Validate state and exchange authorization code for tokens.
        Tokens are encrypted before storage.
        """
        # Validate state
        state_record = db.query(OAuthState).filter(
            OAuthState.state_token == state,
            OAuthState.user_id == user_id
        ).first()

        if not state_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OAuth state parameter. Possible CSRF."
            )

        if ensure_utc(state_record.expires_at) < datetime.now(timezone.utc):
            db.delete(state_record)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OAuth authorization session expired. Please try connecting again."
            )

        # Delete used state
        db.delete(state_record)
        db.commit()

        # Check if running in mock dev mode or live Google OAuth
        mock_mode = (
            settings.ENVIRONMENT.lower() != "production"
            and not settings.GOOGLE_CLIENT_ID
            and not settings.GOOGLE_CLIENT_SECRET
        )
        if mock_mode and code.startswith("mock_"):
            logger.info("Using simulated Google OAuth authorization for local development.")
            access_token = f"mock_access_token_{secrets.token_hex(16)}"
            refresh_token = f"mock_refresh_token_{secrets.token_hex(16)}"
            expires_in = 3600
            user_email = "student.demo@university.edu"
        else:
            if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
                )
            if code.startswith("mock_"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Mock authorization codes are only accepted when Google OAuth is not configured."
                )

            # Exchange code with Google token endpoint
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        GmailService.GOOGLE_TOKEN_URL,
                        data={
                            "code": code,
                            "client_id": settings.GOOGLE_CLIENT_ID,
                            "client_secret": settings.GOOGLE_CLIENT_SECRET,
                            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                            "grant_type": "authorization_code",
                        }
                    )
                    if resp.status_code != 200:
                        logger.error(f"Google token exchange failed with status {resp.status_code}")
                        raise HTTPException(
                            status_code=status.HTTP_502_BAD_GATEWAY,
                            detail="Failed to authenticate with Google API."
                        )
                    data = resp.json()
                    access_token = data.get("access_token")
                    refresh_token = data.get("refresh_token")
                    expires_in = data.get("expires_in", 3600)
                    if not access_token:
                        logger.error("Google token exchange response did not include an access token.")
                        raise HTTPException(
                            status_code=status.HTTP_502_BAD_GATEWAY,
                            detail="Google authorization did not return an access token."
                        )

                    # Fetch user's Gmail profile email
                    profile_resp = await client.get(
                        f"{GmailService.GMAIL_API_BASE}/profile",
                        headers={"Authorization": f"Bearer {access_token}"}
                    )
                    if profile_resp.status_code != 200:
                        logger.error(f"Google profile lookup failed with status {profile_resp.status_code}")
                        raise HTTPException(
                            status_code=status.HTTP_502_BAD_GATEWAY,
                            detail="Could not verify the authorized Gmail account."
                        )
                    user_email = profile_resp.json().get("emailAddress")
                    if not user_email:
                        logger.error("Google profile response did not include an email address.")
                        raise HTTPException(
                            status_code=status.HTTP_502_BAD_GATEWAY,
                            detail="Google did not provide an email address for the authorized account."
                        )
            except httpx.RequestError as exc:
                logger.error(f"Network error contacting Google API: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Cannot connect to Google servers. Please verify network connectivity."
                )

        # Encrypt tokens before writing to database
        enc_access = encrypt_token(access_token)
        enc_refresh = encrypt_token(refresh_token) if refresh_token else None
        expiry_dt = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        integration = db.query(OAuthIntegration).filter(
            OAuthIntegration.user_id == user_id,
            OAuthIntegration.provider == "google_gmail"
        ).first()

        if integration:
            integration.encrypted_access_token = enc_access
            if enc_refresh:
                integration.encrypted_refresh_token = enc_refresh
            integration.token_expiry = expiry_dt
            integration.email_address = user_email
            integration.is_active = True
            integration.updated_at = datetime.now(timezone.utc)
        else:
            integration = OAuthIntegration(
                user_id=user_id,
                provider="google_gmail",
                encrypted_access_token=enc_access,
                encrypted_refresh_token=enc_refresh,
                token_expiry=expiry_dt,
                scopes=settings.GMAIL_READONLY_SCOPE,
                email_address=user_email,
                is_active=True
            )
            db.add(integration)

        db.commit()
        db.refresh(integration)
        logger.info(f"Gmail successfully connected for user {user_id} ({user_email})")

        db.query(EmailMetadataCache).filter(
            EmailMetadataCache.user_id == user_id
        ).delete(synchronize_session=False)
        db.commit()

        # Populate initial synthetic seed emails if in mock dev mode so user has real messages to interact with
        if mock_mode and code.startswith("mock_"):
            GmailService._seed_synthetic_emails(db, user_id)

        return integration

    @staticmethod
    def _seed_synthetic_emails(db: Session, user_id: str):
        """Seed realistic academic email metadata for local dev / testing."""
        now = datetime.now(timezone.utc)
        sample_emails = [
            {
                "message_id": "msg_cs301_project",
                "thread_id": "thread_cs301",
                "sender": "Prof. Alan Smith <a.smith@university.edu>",
                "subject": "CS301: Distributed Systems Final Project Milestone 1",
                "snippet": "Reminder: The milestone 1 submission for your distributed key-value store project is due next Friday by 11:59 PM. Please make sure to submit your GitHub repository link and report on Canvas.",
                "internal_date": now - timedelta(hours=2)
            },
            {
                "message_id": "msg_placement_drive",
                "thread_id": "thread_placement",
                "sender": "University Placement Cell <placements@university.edu>",
                "subject": "Urgent: TechCorp Campus Hiring Drive - Application Deadline",
                "snippet": "TechCorp is conducting campus placements for Associate Software Engineer roles. Eligible candidates must complete their registration and upload resumes before Monday 5:00 PM.",
                "internal_date": now - timedelta(hours=8)
            },
            {
                "message_id": "msg_exam_schedule",
                "thread_id": "thread_exam",
                "sender": "Dean of Academic Affairs <academics@university.edu>",
                "subject": "Mid-Semester Examination Schedule Published",
                "snippet": "The timetable for Spring 2026 Mid-Semester Examinations is now live on the portal. Exams begin on November 3rd. Students with scheduling conflicts should report to the department office.",
                "internal_date": now - timedelta(days=1)
            },
            {
                "message_id": "msg_math204_hw",
                "thread_id": "thread_math204",
                "sender": "Dr. Sarah Jenkins <s.jenkins@university.edu>",
                "subject": "MATH204: Homework 4 Assigned - Linear Algebra",
                "snippet": "Homework 4 has been posted. Please complete exercises 4.1 to 4.5. The due date is Wednesday at 2:00 PM before our lecture.",
                "internal_date": now - timedelta(days=2)
            }
        ]

        for item in sample_emails:
            existing = db.query(EmailMetadataCache).filter(
                EmailMetadataCache.user_id == user_id,
                EmailMetadataCache.message_id == item["message_id"]
            ).first()
            if not existing:
                db.add(EmailMetadataCache(
                    user_id=user_id,
                    message_id=item["message_id"],
                    thread_id=item["thread_id"],
                    sender=item["sender"],
                    subject=item["subject"],
                    snippet=sanitize_email_content(item["snippet"]),
                    internal_date=item["internal_date"],
                    is_read=True
                ))
        db.commit()

    @staticmethod
    def get_status(db: Session, user_id: str) -> Dict[str, Any]:
        integration = db.query(OAuthIntegration).filter(
            OAuthIntegration.user_id == user_id,
            OAuthIntegration.provider == "google_gmail"
        ).first()

        if not integration or not integration.is_active:
            return {
                "is_connected": False,
                "email_address": None,
                "last_synced_at": None,
                "scopes": None,
                "message_count": 0
            }

        count = db.query(EmailMetadataCache).filter(EmailMetadataCache.user_id == user_id).count()
        return {
            "is_connected": True,
            "email_address": integration.email_address,
            "last_synced_at": integration.last_synced_at,
            "scopes": integration.scopes,
            "message_count": count
        }

    @staticmethod
    async def sync_messages(db: Session, user_id: str) -> None:
        integration = db.query(OAuthIntegration).filter(
            OAuthIntegration.user_id == user_id,
            OAuthIntegration.provider == "google_gmail",
            OAuthIntegration.is_active.is_(True)
        ).first()
        if not integration:
            return

        access_token = decrypt_token(integration.encrypted_access_token)
        if access_token.startswith("mock_"):
            return

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                if integration.token_expiry and ensure_utc(integration.token_expiry) <= datetime.now(timezone.utc) + timedelta(minutes=5):
                    if not integration.encrypted_refresh_token:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Gmail authorization expired. Disconnect and reconnect your account."
                        )
                    refresh_token = decrypt_token(integration.encrypted_refresh_token)
                    refresh_resp = await client.post(
                        GmailService.GOOGLE_TOKEN_URL,
                        data={
                            "client_id": settings.GOOGLE_CLIENT_ID,
                            "client_secret": settings.GOOGLE_CLIENT_SECRET,
                            "refresh_token": refresh_token,
                            "grant_type": "refresh_token",
                        }
                    )
                    if refresh_resp.status_code != 200:
                        logger.error(f"Google token refresh failed with status {refresh_resp.status_code}")
                        raise HTTPException(
                            status_code=status.HTTP_502_BAD_GATEWAY,
                            detail="Could not refresh Gmail authorization. Please reconnect your account."
                        )
                    refreshed = refresh_resp.json()
                    access_token = refreshed["access_token"]
                    integration.encrypted_access_token = encrypt_token(access_token)
                    integration.token_expiry = datetime.now(timezone.utc) + timedelta(
                        seconds=refreshed.get("expires_in", 3600)
                    )

                headers = {"Authorization": f"Bearer {access_token}"}
                messages_resp = await client.get(
                    f"{GmailService.GMAIL_API_BASE}/messages",
                    headers=headers,
                    params={"maxResults": 20, "labelIds": "INBOX"}
                )
                if messages_resp.status_code != 200:
                    logger.error(f"Gmail message listing failed with status {messages_resp.status_code}")
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="Could not retrieve Gmail messages. Please reconnect your account and try again."
                    )

                message_refs = messages_resp.json().get("messages", [])
                for message_ref in message_refs:
                    message_resp = await client.get(
                        f"{GmailService.GMAIL_API_BASE}/messages/{message_ref['id']}",
                        headers=headers,
                        params={
                            "format": "metadata",
                            "metadataHeaders": ["From", "To", "Subject", "Date"]
                        }
                    )
                    if message_resp.status_code != 200:
                        logger.error(f"Gmail message metadata retrieval failed with status {message_resp.status_code}")
                        raise HTTPException(
                            status_code=status.HTTP_502_BAD_GATEWAY,
                            detail="Could not retrieve Gmail message metadata. Please try again."
                        )

                    message = message_resp.json()
                    headers_by_name = {
                        item["name"].lower(): item["value"]
                        for item in message.get("payload", {}).get("headers", [])
                    }
                    internal_date = datetime.fromtimestamp(
                        int(message.get("internalDate", 0)) / 1000,
                        tz=timezone.utc
                    )
                    date_header = headers_by_name.get("date")
                    if date_header:
                        try:
                            parsed_date = parsedate_to_datetime(date_header)
                            internal_date = ensure_utc(parsed_date)
                        except (TypeError, ValueError, OverflowError):
                            pass

                    cached = db.query(EmailMetadataCache).filter(
                        EmailMetadataCache.user_id == user_id,
                        EmailMetadataCache.message_id == message["id"]
                    ).first()
                    if cached is None:
                        cached = EmailMetadataCache(
                            user_id=user_id,
                            message_id=message["id"]
                        )
                        db.add(cached)

                    cached.thread_id = message.get("threadId")
                    cached.sender = headers_by_name.get("from", "")
                    cached.recipient = headers_by_name.get("to")
                    cached.subject = headers_by_name.get("subject", "(no subject)")
                    cached.snippet = sanitize_email_content(message.get("snippet", ""))
                    cached.internal_date = internal_date
                    cached.is_read = "UNREAD" not in message.get("labelIds", [])

                integration.last_synced_at = datetime.now(timezone.utc)
                db.commit()
        except httpx.RequestError as exc:
            logger.error(f"Network error contacting Gmail API: {exc}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cannot connect to Google servers. Please verify network connectivity."
            )

    @staticmethod
    def list_messages(
        db: Session,
        user_id: str,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None
    ) -> Tuple[List[EmailMetadataCache], int]:
        query = db.query(EmailMetadataCache).filter(EmailMetadataCache.user_id == user_id)
        if search:
            term = f"%{search.strip()}%"
            query = query.filter(
                (EmailMetadataCache.subject.ilike(term)) |
                (EmailMetadataCache.snippet.ilike(term)) |
                (EmailMetadataCache.sender.ilike(term))
            )
        total = query.count()
        messages = query.order_by(EmailMetadataCache.internal_date.desc()).offset((page - 1) * limit).limit(limit).all()
        return messages, total

    @staticmethod
    async def disconnect(db: Session, user_id: str):
        """Safely disconnect Gmail and remove cached tokens."""
        integration = db.query(OAuthIntegration).filter(
            OAuthIntegration.user_id == user_id,
            OAuthIntegration.provider == "google_gmail"
        ).first()
        if integration:
            encrypted_revocation_token = (
                integration.encrypted_refresh_token or integration.encrypted_access_token
            )
            try:
                revocation_token = decrypt_token(encrypted_revocation_token)
                if revocation_token and not revocation_token.startswith("mock_"):
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        response = await client.post(
                            "https://oauth2.googleapis.com/revoke",
                            data={"token": revocation_token},
                        )
                    if response.status_code != 200:
                        logger.warning(
                            "Google OAuth token revocation failed with status %s; "
                            "local Gmail credentials will still be removed.",
                            response.status_code,
                        )
            except (httpx.RequestError, ValueError):
                logger.warning(
                    "Google OAuth token revocation could not be completed; "
                    "local Gmail credentials will still be removed."
                )
            db.delete(integration)
            logger.info(f"Disconnected Gmail for user {user_id}")
        db.query(EmailMetadataCache).filter(
            EmailMetadataCache.user_id == user_id
        ).delete(synchronize_session=False)
        db.commit()
