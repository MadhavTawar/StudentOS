# StudentOS Security Threat Model & Safeguards

## 1. Threat Matrix & Defense Strategy

### 1.1 Authentication & Authorization

| Threat | Risk Level | Implemented Mitigation |
| --- | --- | --- |
| **Brute-Force Password Attacks** | High | Sliding-window IP/account rate limiter (`5 attempts / 60 seconds`). Returns HTTP 429 upon threshold breach. |
| **Credential Dumping / Rainbow Tables** | Critical | Bcrypt salted hashing with 12 rounds. Plaintext passwords never persisted or logged. |
| **Session Theft / XSS Token Exfiltration** | High | HttpOnly, SameSite=Lax secure cookies for browser sessions. Bearer tokens also supported for non-browser automation. |
| **Insecure Direct Object Reference (IDOR)** | Critical | Every data operation strictly validates `Task.user_id == current_user.id` and `Deadline.user_id == current_user.id`. Access to other users' entities returns HTTP 404 (preventing user enumeration). |
| **Cross-User Data Leakage** | Critical | Automated pytest tests verify User B receives 404 attempting to view or delete User A's tasks. |

### 1.2 OAuth 2.0 & Secrets Management

| Threat | Risk Level | Implemented Mitigation |
| --- | --- | --- |
| **OAuth State Forgery (CSRF)** | Critical | Server generates cryptographically random 32-byte `state` tokens bound to initiating user ID with 15-minute expiration in `oauth_states` table. Callbacks with forged or mismatched state tokens fail immediately. |
| **Refresh Token Compromise in Database** | Critical | OAuth tokens are encrypted at rest using `Fernet` (AES-128-CBC + HMAC-SHA256) with a dedicated encryption key stored outside the database. Database file theft yields only ciphertext. |
| **Excessive Permissions Risk** | Critical | Strictly requests `https://www.googleapis.com/auth/gmail.readonly`. No write, send, delete, or modify permissions. |
| **Secret Leakage in Logs** | High | `RedactingFormatter` automatically scrubs JWT tokens, Bearer headers, API keys, passwords, and secrets from application logs. |

### 1.3 AI & LLM Threat Defenses

| Threat | Risk Level | Implemented Mitigation |
| --- | --- | --- |
| **Direct & Indirect Prompt Injection** | High | Known instruction-like patterns in user questions and retrieved documents are rejected or omitted. Provider instructions treat remaining source content as untrusted. Heuristics and prompts are not comprehensive. |
| **Excessive Agency & Autonomous Harm** | Critical | **Zero Autonomous Execution**. AI outputs are strictly treated as proposals (`AIExtractionCandidate`). No task, deadline, or database record is created or modified without explicit user review and approval. |
| **Data Exfiltration via Model Prompts** | Medium | Offline is the default. When `AI_PROVIDER=groq`, the selected email context or institute question plus authorized retrieved passages are sent to the configured Groq endpoint; the relevant screens disclose this. |
| **Hallucinated Dates** | Medium | The local extractor only assigns a date when it finds a weekday and explicit time. Deadlines without a confirmed date remain date-less and require the user to supply one before approval. |

### 1.4 Web Application Threats

| Threat | Risk Level | Implemented Mitigation |
| --- | --- | --- |
| **Cross-Site Scripting (XSS)** | High | Email HTML is sanitized using BeautifulSoup: all `<script>`, `<iframe>`, `<object>`, `<style>`, and inline `javascript:` handlers are stripped. Plain sanitized text preview is returned. |
| **SQL Injection** | Critical | Exclusively parameterized queries executed through SQLAlchemy 2.0 ORM. Raw string formatting in SQL is strictly disallowed. |
| **CORS Wildcard with Credentials** | High | FastAPI CORS middleware explicitly whitelists trusted origins (`http://localhost:5173`, `http://127.0.0.1:5173`). Wildcard `*` with credentials is explicitly forbidden. |
| **Security Headers** | Medium | Every HTTP response includes `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, and `Referrer-Policy: strict-origin-when-cross-origin`. |

### 1.5 Institute Knowledge Documents and RAG

| Threat | Risk Level | Implemented Mitigation |
| --- | --- | --- |
| **Unauthorized staff privilege** | Critical | Registration always creates a student. One authenticated user can claim the initial institute-admin role only with a configured, one-time secret; a database uniqueness constraint limits the claim to one account. The admin grants or revokes document-manager roles. |
| **Malicious or oversized upload** | High | Upload request bytes are capped before multipart parsing; only PDF/DOCX with matching file structure/signatures are accepted. Archives, pages, extracted text, and chunks are bounded. Scanned PDFs are rejected when they contain no searchable text. |
| **Private document exposure** | Critical | Source files use random server-generated keys in a configurable private directory. Student library, download, and retrieval paths require a currently published document and version in the relational database. |
| **Stale or forged vector citation** | High | Chroma is not an authorization source. Every result is rechecked against published SQL document/version/chunk rows and matching IDs before provider input or citation output. Citations and excerpts are assembled server-side. |
| **Partial replacement or archive leak** | High | Upload/index failures remain unpublished; the old version remains published until a manager publishes a successful replacement. Archive state is committed in SQL and filters retrieval/download before vector lifecycle cleanup. |
| **Prompt injection in institute files** | High | Known instruction-like patterns are omitted from retrieved context. Remaining text is passed as untrusted data, with no tool execution or automatic task creation. This is defense-in-depth, not a guarantee against model manipulation. |

The local MVP stores source files and vectors without application-level encryption, keeps archived files/vectors for history, and has no retention-purge UI. Protect the host and backups. FastEmbed may download model files on first use; document text is embedded locally. Groq answer generation, when selected, receives the question and retrieved source excerpts.

---

## 2. Human Approval Model

StudentOS enforces a 4-tier action classification hierarchy:

```text

[Level 0: Read-Only]
Reading permitted email headers, viewing tasks, grounded conversational Q&A
Action: Allowed automatically for authenticated user

[Level 1: Reversible Local Writes]
Creating a task, marking complete, editing a deadline, dismissing a reminder
Action: Allowed upon direct user interface click

[Level 2: External Side Effects]
Sending emails, submitting assignments, external webhooks
Action: DISABLED IN PHASE 1. Future phases require explicit multi-step preview and approval.

[Level 3: Destructive Actions]
Deleting user account, revoking tokens, deleting external data
Action: Explicit modal confirmation with irreversible consequence warning.
```
