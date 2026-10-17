# Security and Privacy Notes

StudentOS is a local-development MVP, not a security certification or production-readiness claim. This document records implemented controls and known limitations so users can make informed decisions.

## Implemented controls

- Passwords are stored as bcrypt hashes; private API routes require an authenticated user.
- Task, deadline, reminder, preference, and candidate queries are scoped to the authenticated user's ID.
- Gmail requests use the `gmail.readonly` scope. OAuth state is random, user-bound, expires, and is removed after use.
- Gmail access and refresh tokens are encrypted before database storage with Fernet. Configure a stable, private `ENCRYPTION_KEY` before connecting Gmail; an automatically generated development key is temporary and will not decrypt tokens after a restart.
- Email previews are sanitized before caching. The application stores metadata and snippets, not complete message bodies or attachments.
- AI-generated task and deadline proposals remain pending until the user reviews them. A deadline without a confirmed date cannot be approved until the user supplies one; a candidate can only be reviewed once.
- CORS origins are configured as an explicit list. The application adds standard content-type, frame, and referrer headers.
- OAuth client secrets and local databases are excluded by `.gitignore`.
- Institute roles are stored server-side. Public registration always creates a student account; the initial institute administrator must be claimed by an authenticated operator with a one-time bootstrap secret of at least 32 characters. A database uniqueness constraint permits only one initial administrator. Administrators explicitly grant or revoke document-manager access. Email allowlists are not used as identity proof.
- Knowledge uploads are limited to PDF/DOCX, checked against file signatures and archive structure, size-capped before multipart parsing, and assigned random storage keys outside frontend public assets. Extraction is bounded by configured file, page, and text limits. SHA-256 hashes reject duplicate successfully processed content. Failed versions remain unpublished; a replacement does not replace the current published version until explicitly published.
- Student knowledge search is limited to published document/version rows. Every vector result is rechecked against SQL before text is passed to an answer provider or a citation is returned. Citation excerpts are taken from SQL records, not trusted from model output. Archived and superseded versions are denied even if stale vectors remain on disk.
- FastEmbed and Chroma run locally. First use may download the configured embedding model; subsequent embedding and retrieval are local. If `AI_PROVIDER=groq`, the question and retrieved source passages are sent to Groq for answer composition and this is disclosed in the knowledge UI. Provider failures are surfaced instead of silently substituting an offline answer.
- Institute documents are untrusted prompt context. Known instruction-like source patterns are excluded from answers, and the provider prompt treats remaining source content as data. Pattern matching is not a complete prompt-injection defense.

## Known limitations and residual risks

- Browser authentication uses an HttpOnly cookie; cookie-authenticated writes require an allowed `Origin`. Legacy localStorage tokens are cleared on app startup. The backend still accepts bearer tokens for API clients.
- Authentication rate limiting is an in-memory, single-process mechanism. It resets on restart and is not shared across multiple workers.
- JWTs are time-limited but are not individually revoked server-side on logout. Logging out clears the browser cookie; any client that retained a token may continue to use it until expiry.
- If `SECRET_KEY` or `ENCRYPTION_KEY` is omitted in development, a temporary random value is generated for the process. Set persistent values in the private root `.env` before relying on sessions or stored Gmail credentials across restarts. Production startup rejects missing keys.
- Gmail synchronization currently fetches up to 20 inbox messages on a request and does not implement full-history pagination or a background sync.
- The offline rule-based AI provider is the default. If `AI_PROVIDER=groq` is selected, the selected email's subject, sender, snippet, and email date are sent to the configured Groq endpoint for extraction; assistant requests also send the user's question and their task/deadline context. This transfer is disclosed in the inbox and assistant screens. Do not enable Groq if you do not want this data sent to the configured provider. OpenAI settings are not currently used.
- Groq requests use a configured API key, model, and OpenAI-compatible chat-completions endpoint. The service makes no automatic retries, rejects malformed output, and verifies that returned evidence appears verbatim in the source email. Pattern-matched injection-like emails are not sent to Groq. Heuristic detection is not comprehensive.
- Reminders run in the web application process. They do not run while the app is closed, and multi-worker deployments could run duplicate scheduler loops.
- SQLAlchemy creates missing tables on startup. No Alembic migration history or production upgrade workflow is configured.
- Knowledge source files, vectors, and the SQL database are not encrypted at rest by the application. Protect the host account, disk, and backups. Archived source files and vectors are retained locally; there is no deletion or retention-purge interface.
- Knowledge extraction and indexing are synchronous and intended for a single local instance. Scanned PDFs without a text layer are unsupported, DOCX citations have no page number, and no OCR or background processing queue is included.
- The automated tests cover selected authentication, ownership, AI approval, OAuth-state, and sanitization behavior. They do not constitute a full penetration test or verify deployment configuration.

## Safe local use

1. Keep `.env` private and never commit OAuth client secrets, signing keys, or encryption keys.
2. Use stable, randomly generated `SECRET_KEY` and `ENCRYPTION_KEY` values in `.env`.
3. Keep `AI_PROVIDER=offline` unless you accept sending the disclosed email/chat context and knowledge-source passages to Groq. Keep API keys private; rotate any key that may have been exposed.
4. Keep the backend bound to localhost during development; do not expose the development server directly to the public internet.
5. Review requested Google permissions and use a test account while the OAuth app is in Testing mode.
6. Disconnect Gmail in StudentOS when finished testing.
7. Generate a strong `KNOWLEDGE_ADMIN_BOOTSTRAP_TOKEN`, claim the initial administrator role from the intended account, then remove the token from `.env` and restart. Never share the token in chat or source control.

Report suspected vulnerabilities privately to the repository owner rather than posting credentials or mailbox content in an issue.
