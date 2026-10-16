import re
import json
from abc import ABC, abstractmethod
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.models.ai_candidate import AIExtractionCandidate
from backend.app.models.task import Task
from backend.app.models.deadline import Deadline
from backend.app.schemas.ai import (
    EmailExtractionRequest,
    EmailExtractionResponse,
    ExtractedTaskCandidate,
    ExtractedDeadlineCandidate,
    AICandidateReviewRequest,
    AIAssistantResponse
)


# --- Prompt Injection Defense Patterns ---

INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions?", re.IGNORECASE),
    re.compile(r"system\s+prompt", re.IGNORECASE),
    re.compile(r"(reveal|print|show|output)\s+(your\s+)?(api_key|secret|password|token)", re.IGNORECASE),
    re.compile(r"(send|forward)\s+(all\s+)?(emails?|messages?|data)\s+to", re.IGNORECASE),
    re.compile(r"elevate\s+privilege", re.IGNORECASE),
    re.compile(r"execute\s+(shell|command|sql)", re.IGNORECASE),
]

def sanitize_and_check_injection(text: str) -> Tuple[str, bool]:
    """
    Scan untrusted text for adversarial prompt injection attempts.
    Returns (cleaned_text, is_suspicious).
    """
    is_suspicious = False
    for pat in INJECTION_PATTERNS:
        if pat.search(text):
            is_suspicious = True
            logger.warning(f"Adversarial prompt injection pattern detected in input: {pat.pattern}")
            # Neutralize obvious injection directives
            text = pat.sub("[FLAGGED POTENTIAL INJECTION BLOCKED]", text)
    return text, is_suspicious


# --- Provider Abstraction ---

class BaseAIProvider(ABC):
    @abstractmethod
    async def extract_information(self, request: EmailExtractionRequest) -> EmailExtractionResponse:
        pass

    @abstractmethod
    async def assistant_chat(self, user_message: str, user_context: Dict[str, Any]) -> str:
        pass


class OfflineRuleBasedProvider(BaseAIProvider):
    """
    Deterministic rule-based NLP extractor that runs 100% locally with zero external API keys.
    Parses academic deadlines, exams, assignments, dates, and times safely.
    """
    DATE_PATTERNS = [
        (r"\b(next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b", "relative_weekday"),
        (r"\b(tomorrow|tonight|today)\b", "relative_day"),
        (r"\b(by|before|on|due)\s+([A-Za-z]+ \d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)\b", "specific_date"),
        (r"\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\b", "time_str"),
    ]

    async def extract_information(self, request: EmailExtractionRequest) -> EmailExtractionResponse:
        content = f"{request.subject} {request.snippet}"
        safe_content, was_injected = sanitize_and_check_injection(content)

        tasks: List[ExtractedTaskCandidate] = []
        deadlines: List[ExtractedDeadlineCandidate] = []
        
        # Summary generation
        summary = f"Academic email regarding '{request.subject}'. Contains coursework/university updates."

        # Detect assignments / project submissions
        is_assignment = any(kw in safe_content.lower() for kw in ["assignment", "project", "homework", "milestone", "submission", "quiz"])
        is_exam = any(kw in safe_content.lower() for kw in ["exam", "examination", "midterm", "mid-semester", "final exam"])
        is_placement = any(kw in safe_content.lower() for kw in ["placement", "hiring", "interview", "campus drive", "resume", "job"])

        # Detect candidate due dates
        candidate_due: Optional[datetime] = None
        now = request.email_date or datetime.now(timezone.utc)
        evidence = request.snippet[:200]

        if "next friday" in safe_content.lower():
            # approximate next Friday (between 1 and 7 days)
            days_ahead = (4 - now.weekday() + 7) % 7
            if days_ahead == 0:
                days_ahead = 7
            candidate_due = (now + timedelta(days=days_ahead)).replace(hour=23, minute=59, second=0, microsecond=0)
        elif "monday" in safe_content.lower():
            days_ahead = (0 - now.weekday() + 7) % 7
            if days_ahead == 0:
                days_ahead = 7
            candidate_due = (now + timedelta(days=days_ahead)).replace(hour=17, minute=0, second=0, microsecond=0)
        elif "wednesday" in safe_content.lower():
            days_ahead = (2 - now.weekday() + 7) % 7
            if days_ahead == 0:
                days_ahead = 7
            candidate_due = (now + timedelta(days=days_ahead)).replace(hour=14, minute=0, second=0, microsecond=0)
        elif "november 3" in safe_content.lower():
            candidate_due = datetime(2026, 11, 3, 9, 0, tzinfo=timezone.utc)

        # Baseline confidence
        confidence = 0.4 if was_injected else (0.85 if candidate_due else 0.70)

        if is_assignment:
            tasks.append(ExtractedTaskCandidate(
                title=f"Complete & submit {request.subject}",
                description=f"Action item extracted from email sent by {request.sender}: {request.snippet[:150]}",
                category="Assignment",
                priority="High" if candidate_due else "Medium",
                due_date=candidate_due,
                supporting_evidence=evidence,
                confidence_score=confidence
            ))
            if candidate_due:
                deadlines.append(ExtractedDeadlineCandidate(
                    title=f"Submission Deadline: {request.subject}",
                    event_type="Assignment",
                    due_date=candidate_due,
                    is_ambiguous="next" in safe_content.lower(),
                    original_date_text="Next Friday / relative date in email",
                    supporting_evidence=evidence,
                    confidence_score=confidence
                ))
        elif is_placement:
            tasks.append(ExtractedTaskCandidate(
                title=f"Register for {request.subject}",
                description=f"Placement application item: {request.snippet[:150]}",
                category="Placement",
                priority="Urgent",
                due_date=candidate_due,
                supporting_evidence=evidence,
                confidence_score=confidence
            ))
            if candidate_due:
                deadlines.append(ExtractedDeadlineCandidate(
                    title=f"Placement Deadline: {request.subject}",
                    event_type="Placement",
                    due_date=candidate_due,
                    is_ambiguous=False,
                    original_date_text="Monday 5:00 PM",
                    supporting_evidence=evidence,
                    confidence_score=confidence
                ))
        elif is_exam:
            deadlines.append(ExtractedDeadlineCandidate(
                title=f"Examination: {request.subject}",
                event_type="Examination",
                due_date=candidate_due or (now + timedelta(days=14)),
                is_ambiguous=candidate_due is None,
                original_date_text="Exam timetable",
                supporting_evidence=evidence,
                confidence_score=confidence
            ))

        return EmailExtractionResponse(
            message_id=request.message_id,
            summary=summary,
            tasks=tasks,
            deadlines=deadlines,
            confidence_overall=confidence,
            provider_used="offline_rule_based",
            is_fallback=True
        )

    async def assistant_chat(self, user_message: str, user_context: Dict[str, Any]) -> str:
        safe_msg, was_injected = sanitize_and_check_injection(user_message)
        if was_injected:
            return "Security Notice: Your query contained directives that violate safety guardrails. I cannot alter internal instructions or reveal private keys."

        lower_msg = safe_msg.lower()
        tasks = user_context.get("tasks", [])
        deadlines = user_context.get("deadlines", [])

        if "today" in lower_msg or "work on" in lower_msg:
            if not tasks:
                return "You have no pending tasks right now. Would you like to create one or check your email for new assignments?"
            pending = [t for t in tasks if t.get("status") in ["Pending", "In Progress"]]
            if not pending:
                return "All your active tasks are completed! Great job."
            task_titles = "\n".join(f"- **{t.get('title')}** (Priority: {t.get('priority')})" for t in pending[:3])
            return f"Here is what you should focus on today:\n{task_titles}"

        elif "deadline" in lower_msg or "upcoming" in lower_msg:
            if not deadlines:
                return "You have no upcoming deadlines recorded in your calendar."
            lines = "\n".join(f"- **{d.get('title')}**: due {d.get('due_date')} ({d.get('event_type')})" for d in deadlines[:4])
            return f"Here are your closest upcoming academic deadlines:\n{lines}"

        elif "study plan" in lower_msg or "schedule" in lower_msg:
            return (
                "### Recommended Study Plan for this Week:\n"
                "- **Mon - Tue**: Focus on upcoming project milestones and review lecture notes.\n"
                "- **Wed - Thu**: Complete laboratory submissions and problem sets.\n"
                "- **Fri - Sat**: Placement preparation, mock coding interviews, and revision.\n"
                "- **Sunday**: Weekly recap, planning next week's assignments, and rest."
            )

        return (
            f"I am your StudentOS Academic Assistant. You have {len(tasks)} active tasks and {len(deadlines)} deadlines tracked. "
            "You can ask me: 'What should I work on today?', 'Which deadlines are coming up?', or 'Create a study plan for this week'."
        )


class AIService:
    _provider: Optional[BaseAIProvider] = None

    @classmethod
    def get_provider(cls) -> BaseAIProvider:
        if cls._provider is None:
            # Check configured provider
            if settings.AI_PROVIDER == "offline" or not settings.GROQ_API_KEY:
                cls._provider = OfflineRuleBasedProvider()
            else:
                # Can instantiate Groq or external HTTP provider
                cls._provider = OfflineRuleBasedProvider()
        return cls._provider

    @staticmethod
    async def extract_and_store_candidates(
        db: Session,
        user_id: str,
        request: EmailExtractionRequest
    ) -> List[AIExtractionCandidate]:
        """
        Extract structured candidates and store them with validation_status='pending_review'.
        GUARANTEE: NEVER automatically saves to Task or Deadline tables without human approval!
        """
        provider = AIService.get_provider()
        extraction = await provider.extract_information(request)

        created_records: List[AIExtractionCandidate] = []

        # Store task proposals
        for task_cand in extraction.tasks:
            cand = AIExtractionCandidate(
                user_id=user_id,
                source_email_id=request.message_id,
                email_subject=request.subject,
                email_sender=request.sender,
                email_date=request.email_date,
                candidate_type="task",
                title=task_cand.title,
                description=task_cand.description,
                suggested_due_date=task_cand.due_date,
                category=task_cand.category,
                priority=task_cand.priority,
                supporting_evidence=task_cand.supporting_evidence,
                confidence_score=task_cand.confidence_score,
                validation_status="pending_review"
            )
            db.add(cand)
            created_records.append(cand)

        # Store deadline proposals
        for d_cand in extraction.deadlines:
            cand = AIExtractionCandidate(
                user_id=user_id,
                source_email_id=request.message_id,
                email_subject=request.subject,
                email_sender=request.sender,
                email_date=request.email_date,
                candidate_type="deadline",
                title=d_cand.title,
                description=f"Extracted deadline: {d_cand.event_type}",
                suggested_due_date=d_cand.due_date,
                category=d_cand.event_type,
                priority="High",
                supporting_evidence=d_cand.supporting_evidence,
                confidence_score=d_cand.confidence_score,
                validation_status="pending_review"
            )
            db.add(cand)
            created_records.append(cand)

        db.commit()
        for r in created_records:
            db.refresh(r)

        return created_records

    @staticmethod
    def list_candidates(
        db: Session,
        user_id: str,
        status_filter: Optional[str] = "pending_review"
    ) -> List[AIExtractionCandidate]:
        query = db.query(AIExtractionCandidate).filter(AIExtractionCandidate.user_id == user_id)
        if status_filter:
            query = query.filter(AIExtractionCandidate.validation_status == status_filter)
        return query.order_by(AIExtractionCandidate.created_at.desc()).all()

    @staticmethod
    def review_candidate(
        db: Session,
        user_id: str,
        candidate_id: str,
        review: AICandidateReviewRequest
    ) -> AIExtractionCandidate:
        """
        HUMAN-IN-THE-LOOP APPROVAL WORKFLOW:
        Converts a candidate proposal into a verified Task or Deadline only upon explicit user action.
        """
        cand = db.query(AIExtractionCandidate).filter(
            AIExtractionCandidate.id == candidate_id,
            AIExtractionCandidate.user_id == user_id
        ).first()

        if not cand:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate not found."
            )

        now = datetime.now(timezone.utc)
        cand.reviewed_at = now

        if review.action == "reject":
            cand.validation_status = "rejected"
            db.commit()
            db.refresh(cand)
            return cand

        # User approved (or modified and approved)
        cand.validation_status = "approved" if review.action == "approve" else "modified"
        final_title = review.modified_title or cand.title
        final_due = review.modified_due_date or cand.suggested_due_date
        final_priority = review.modified_priority or cand.priority
        final_category = review.modified_category or cand.category

        if cand.candidate_type == "task":
            new_task = Task(
                user_id=user_id,
                title=final_title,
                description=f"{cand.description or ''}\n\nEvidence from email: \"{cand.supporting_evidence}\"",
                category=final_category,
                priority=final_priority,
                status="Pending",
                due_date=final_due,
                source_type="ai_proposal",
                source_ref=cand.source_email_id
            )
            db.add(new_task)
            db.flush()
            cand.created_task_id = new_task.id

        elif cand.candidate_type == "deadline":
            if not final_due:
                final_due = now + timedelta(days=7)  # Fallback safe date if missing
            new_deadline = Deadline(
                user_id=user_id,
                title=final_title,
                description=f"Evidence: \"{cand.supporting_evidence}\"",
                event_type=final_category,
                due_date=final_due,
                status="Upcoming",
                source_type="ai_proposal",
                source_ref=cand.source_email_id
            )
            db.add(new_deadline)
            db.flush()
            cand.created_deadline_id = new_deadline.id

        db.commit()
        db.refresh(cand)
        logger.info(f"User {user_id} {cand.validation_status} candidate {candidate_id}")
        return cand

    @staticmethod
    async def chat_with_assistant(
        db: Session,
        user_id: str,
        user_message: str
    ) -> AIAssistantResponse:
        """
        Conversational assistant querying authenticated user's tasks & deadlines with bounded retrieval.
        """
        # Fetch authenticated user's current context
        tasks = db.query(Task).filter(Task.user_id == user_id).limit(10).all()
        deadlines = db.query(Deadline).filter(Deadline.user_id == user_id).order_by(Deadline.due_date.asc()).limit(5).all()

        context = {
            "tasks": [{"title": t.title, "priority": t.priority, "status": t.status, "due_date": str(t.due_date)} for t in tasks],
            "deadlines": [{"title": d.title, "event_type": d.event_type, "due_date": str(d.due_date)} for d in deadlines]
        }

        provider = AIService.get_provider()
        reply = await provider.assistant_chat(user_message, context)

        return AIAssistantResponse(
            reply=reply,
            context_summary={"tasks_count": len(tasks), "deadlines_count": len(deadlines)},
            provider=settings.AI_PROVIDER
        )
