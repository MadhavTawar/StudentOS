# StudentOS Security Threat Model & Safeguards

## 1. Threat Matrix & Defense Strategy

### 1.1 Authentication & Authorization
| Threat | Risk Level | Implemented Mitigation |
|---|---|---|
| **Brute-Force Password Attacks** | High | Sliding-window IP/account rate limiter (`5 attempts / 60 seconds`). Returns HTTP 429 upon threshold breach. |
| **Credential Dumping / Rainbow Tables** | Critical | Bcrypt salted hashing with 12 rounds. Plaintext passwords never persisted or logged. |
| **Session Theft / XSS Token Exfiltration** | High | HttpOnly, SameSite=Lax secure cookies for browser sessions. Bearer tokens also supported for non-browser automation. |
| **Insecure Direct Object Reference (IDOR)** | Critical | Every data operation strictly validates `Task.user_id == current_user.id` and `Deadline.user_id == current_user.id`. Access to other users' entities returns HTTP 404 (preventing user enumeration). |
| **Cross-User Data Leakage** | Critical | Automated pytest tests verify User B receives 404 attempting to view or delete User A's tasks. |

### 1.2 OAuth 2.0 & Secrets Management
| Threat | Risk Level | Implemented Mitigation |
|---|---|---|
| **OAuth State Forgery (CSRF)** | Critical | Server generates cryptographically random 32-byte `state` tokens bound to initiating user ID with 15-minute expiration in `oauth_states` table. Callbacks with forged or mismatched state tokens fail immediately. |
| **Refresh Token Compromise in Database** | Critical | OAuth tokens are encrypted at rest using `Fernet` (AES-128-CBC + HMAC-SHA256) with a dedicated encryption key stored outside the database. Database file theft yields only ciphertext. |
| **Excessive Permissions Risk** | Critical | Strictly requests `https://www.googleapis.com/auth/gmail.readonly`. No write, send, delete, or modify permissions. |
| **Secret Leakage in Logs** | High | `RedactingFormatter` automatically scrubs JWT tokens, Bearer headers, API keys, passwords, and secrets from application logs. |

### 1.3 AI & LLM Threat Defenses
| Threat | Risk Level | Implemented Mitigation |
|---|---|---|
| **Direct & Indirect Prompt Injection** | Critical | Untrusted email content is wrapped in `<untrusted_student_email>` delimiters. Input scanning actively detects and neutralizes override patterns (*"Ignore previous instructions"*, *"Reveal secrets"*, *"Send emails"*). |
| **Excessive Agency & Autonomous Harm** | Critical | **Zero Autonomous Execution**. AI outputs are strictly treated as proposals (`AIExtractionCandidate`). No task, deadline, or database record is created or modified without explicit user review and approval. |
| **Data Exfiltration via Model Prompts** | High | Only authorized context for the authenticated user is retrieved. Sensitive tokens and system configurations are excluded from model context windows. |
| **Hallucinated Dates** | Medium | Extracted candidates require supporting quoted excerpts and explicit confidence scoring. Ambiguous dates are flagged with user confirmation requirements. |

### 1.4 Web Application Threats
| Threat | Risk Level | Implemented Mitigation |
|---|---|---|
| **Cross-Site Scripting (XSS)** | High | Email HTML is sanitized using BeautifulSoup: all `<script>`, `<iframe>`, `<object>`, `<style>`, and inline `javascript:` handlers are stripped. Plain sanitized text preview is returned. |
| **SQL Injection** | Critical | Exclusively parameterized queries executed through SQLAlchemy 2.0 ORM. Raw string formatting in SQL is strictly disallowed. |
| **CORS Wildcard with Credentials** | High | FastAPI CORS middleware explicitly whitelists trusted origins (`http://localhost:5173`, `http://127.0.0.1:5173`). Wildcard `*` with credentials is explicitly forbidden. |
| **Security Headers** | Medium | Every HTTP response includes `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, and `Referrer-Policy: strict-origin-when-cross-origin`. |

---

## 2. Human Approval Model

StudentOS enforces a 4-tier action classification hierarchy:

```
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
