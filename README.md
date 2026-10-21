# StudentOS 🎓

> **A personal productivity workspace for students**

StudentOS helps students organize coursework, deadlines, study plans, reminders, and academic communication in one private account. Individuals can optionally create shared workspaces for collaborating on reference materials—without making personal coursework or Gmail data shared by default.

---

## 🌟 Key Features

- **Personal Study Dashboard**: Real-time overview of active tasks, upcoming deadlines, overdue items, recent emails, and connection states.
- **Task Management**: Comprehensive CRUD with priority tags (Urgent, High, Medium, Low), academic categories, due dates, estimated durations, and toggle completion.
- **Academic Deadlines**: Chronological calendar tracking with automated duplicate detection, ambiguous date warnings, and task associations.
- **Read-Only Gmail Integration**: Least-privilege OAuth 2.0 (`gmail.readonly`) integration with AES/Fernet encrypted token storage, untrusted preview sanitization, and best-effort Google grant revocation on disconnect.
- **AI-Assisted Email Understanding & Extraction**:
  - Extracts task and deadline candidate proposals with supporting quoted excerpts and confidence metrics.
  - **Human-in-the-Loop Guardrail**: Extracted proposals are *never* automatically committed without explicit user review and approval.
  - **Adversarial Prompt-Injection Defense**: Isolates untrusted email text, strips injection instructions, and flags suspicious directives.
  - Offline rule-based extraction is the default. An optional Groq chat-completions provider is available when explicitly enabled.
- **Academic AI Assistant**: Grounded conversational assistant answering questions about your authorized academic context (*"What should I work on today?"*, *"Which deadlines are coming up?"*, *"Create a study plan for this week"*).
- **Workspace Knowledge Library**: Private personal references and optionally shared PDF/DOCX libraries, workspace-scoped retrieval, published-version lifecycle, source citations, and explicit insufficient-evidence responses.
- **Personal and Shared Workspaces**: Every account receives a private workspace. Optional organization workspaces can publish shared references; coursework, Gmail, reminders, and assistant context remain account-private.
- **SaaS Billing Foundation**: Workspace-level plan/subscription records and billing status UI. No payment provider, paid plans, or prices are enabled yet.
- **Persistent In-App Reminders**: Background single-process scheduler polling database intervals with duplicate alert suppression and customizable lead times.
- **Privacy & Data Governance**: Transparent disclosures on local storage, data minimization, and password-confirmed account deletion.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 19, TypeScript, Vite 8, responsive StudentOS design system, Lucide React, React Router v7 |
| **Backend** | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0, SQLite (local development); workspace membership and library access are validated server-side |
| **Security** | Bcrypt password hashing, database-revocable JWT sessions, Fernet token encryption (AES-128-CBC + HMAC-SHA256), HttpOnly cookies, CORS whitelisting, CSRF state verification |
| **AI Layer** | Offline rule-based assistant and local FastEmbed embeddings by default; optional Groq chat-completions provider |

---

## 🚀 Quick Start (Windows PowerShell)

### Prerequisites

- Python 3.12+
- Node.js 20+ / npm 10+
- Git

### 1. Clone & Set Up Backend

```powershell
# Create Python virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r backend\requirements.txt

# Create local environment configuration
Copy-Item .env.example .env

# Generate persistent local signing/encryption keys and set them in .env
python -c "import secrets; print(secrets.token_urlsafe(48))"
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Put the first generated value in `SECRET_KEY` and the second in `ENCRYPTION_KEY` in `.env`. Keep `.env` private and out of source control. Development can start with these fields empty, but the app then generates temporary per-process values: logins and encrypted Gmail tokens will not survive a backend restart. Production startup requires configured keys.

### 2. Set Up Frontend

```powershell
cd frontend
npm ci
cd ..
```

### 3. Run Development Servers

Using the provided one-command script:

```powershell
.\run_dev.ps1

```

Or start each service separately:

- **Backend**:

  ```powershell
  $env:PYTHONPATH="."
  .\.venv\Scripts\uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
  ```

- **Frontend**:

  ```powershell
  cd frontend
  npm run dev -- --port 5173
  ```

Visit the application in your browser at: **`http://localhost:5173`**
The public product page is at `/`; the signed-in workspace is at `/app`.
Backend OpenAPI interactive documentation: **`http://localhost:8000/docs`**

For production database setup, run `python -m alembic upgrade head` before starting the backend. Existing databases that already match the current schema should be backed up and verified before using `python -m alembic stamp head`.

### Test Gmail with your own account

1. In [Google Cloud Console](https://console.cloud.google.com/), create or select a project and enable the **Gmail API**.
2. Configure the OAuth consent screen in **Google Auth Platform** (or **APIs & Services → OAuth consent screen**):
   - Choose **External** for personal Gmail accounts.
   - Enter the required application and support contact details.
   - Keep the app in **Testing** mode for personal development and add the Google account you will use under **Test users**.
   - StudentOS requests the read-only scope `https://www.googleapis.com/auth/gmail.readonly`.
3. Create an OAuth client with application type **Web application**. Add this exact URI under **Authorized redirect URIs**:

   `http://localhost:5173/oauth/callback`

4. Copy the client ID and client secret into the repository-root `.env` file (beside this README). Create the file if it does not exist:

   ```dotenv
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:5173/oauth/callback
   ```

5. Restart the backend so it loads the credentials. In StudentOS, sign in, open **Inbox**, and choose **Connect Gmail**. Google should open for authorization; sign in with the account added as a test user and grant read-only access.

After authorization, Google redirects to StudentOS's `/oauth/callback` page, which completes the connection and returns you to the inbox. StudentOS then loads up to 20 recent inbox messages as read-only metadata (sender, recipient, subject, date, unread status, and sanitized snippet). It does not cache full message bodies or attachments. Disconnecting Gmail clears cached email previews; reconnecting replaces the previous cached previews.

#### Troubleshooting Gmail authorization

- **Google error 403 `access_denied` / app is being tested:** In Google Cloud Console, verify the OAuth consent screen is in **Testing** and the exact Google account signing in is listed under **Test users**. Make sure you are editing the same Cloud project that owns the OAuth client ID used in `.env`. Allow a few minutes after saving, then try connecting again.
- **Google `redirect_uri_mismatch`:** Ensure the authorized redirect URI in the OAuth client is exactly `http://localhost:5173/oauth/callback`, including scheme, port, and path. Ensure `GOOGLE_REDIRECT_URI` in `.env` matches.
- **StudentOS still shows the demo account:** Confirm both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are non-empty in the repository-root `.env`, restart the backend, then disconnect the demo connection and connect again. A missing pair enables local mock mode only outside production; production returns a configuration error instead. Configuring only one value also returns an error.

Keep the client secret private and out of source control. Never commit `.env` or share its secret. With neither OAuth credential configured, non-production environments use local mock mode and synthetic demo emails; production requires both OAuth credentials and never creates mock tokens or demo emails. Setting only one credential is reported as a configuration error. Mock authorization codes are rejected when Google OAuth credentials are configured.

### Optional Groq AI provider

The default `AI_PROVIDER=offline` keeps email processing local. To enable Groq, add or update these values in the private repository-root `.env` file, using a **new, rotated key**:

```dotenv
AI_PROVIDER=groq
GROQ_API_KEY=your-new-groq-api-key
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_MODEL=openai/gpt-oss-20b
```

Restart the backend after changing `.env`. When Groq is selected, email extraction sends the selected email's subject, sender, and snippet to Groq; assistant chat sends the user's question and relevant task/deadline details. This is disclosed in the Inbox and Assistant screens. Do not enable this provider if you do not want that data sent to Groq. The app validates structured extraction output, checks evidence against the source email, does not retry failed requests automatically, and still requires user review before creating tasks or deadlines. The default model is `openai/gpt-oss-20b`; set `GROQ_MODEL` to another model enabled for your Groq project if needed.

### Personal and shared workspaces

New accounts receive a private personal workspace and a free plan record. Create an optional shared workspace from **Workspaces**, then generate a one-time seven-day invitation link. The invite is a bearer credential: anyone who has it can join, so only share it privately. Workspace members can read its published library; owners can upload, publish, replace, and archive shared references. Coursework, deadlines, Gmail, reminders, and personal assistant context remain scoped to the signed-in account.

FastEmbed and Chroma provide local workspace-scoped retrieval. With `AI_PROVIDER=offline`, retrieval and excerpt answers run on the backend. With `AI_PROVIDER=groq`, the question and relevant published passages are sent to the configured Groq endpoint. See [the workspace knowledge guide](docs/KNOWLEDGE_BASE.md).

### SaaS product foundations and launch limits

The app now has a public product landing page, open account registration, tenant-aware personal and shared workspaces, workspace membership, and workspace-level subscription records. Billing UI is informational only: there is no configured payment processor, no paid plan or price, and no charge can be made.

This is a locally runnable SaaS prototype, **not a production SaaS launch**. Before exposing it publicly, add email verification and account recovery, connect and test an email delivery provider, integrate a payment provider with signed webhooks, validate production PostgreSQL and Alembic deployment operations, deploy private object/vector storage with backups and retention controls, review legal/privacy obligations, and validate production secrets, HTTPS, CORS, and Google OAuth verification. Workspace invitation links are bearer tokens and are not email-verified. Account deletion requires the current password and is blocked while the user owns a shared workspace with other members.

---

## 🧪 Automated Testing

StudentOS includes a test suite covering security primitives, authentication, task CRUD, cross-user isolation, workspace invitation and knowledge isolation, deadline duplicate checks, Gmail OAuth state validation, AI extraction, and knowledge lifecycle/citation behavior.

```powershell
# Run the complete test suite
.\run_tests.ps1
```

Or directly via pytest:

```powershell
.\.venv\Scripts\pytest -o pythonpath=. -v backend/app/tests
```

The backend test suite uses an isolated in-memory SQLite database and mocked Gmail OAuth. There is no frontend test runner configured yet; `npm run build` checks TypeScript compilation and the production bundle.

GitHub Actions also runs the backend suite and frontend install, production build, and lint checks on every push and pull request.

## Current MVP scope and limitations

- Gmail OAuth, read-only inbox metadata sync, task/deadline CRUD, and offline AI proposal review are implemented. Gmail sync currently retrieves up to 20 inbox messages per request.
- The AI extractor runs locally by default; the optional Groq provider is active when explicitly selected. Knowledge embeddings and vector search run locally, while Groq receives knowledge questions and retrieved passages only when configured.
- Workspace RAG is a bounded local MVP: PDF/DOCX only, no OCR, synchronous processing, no automated task creation, and no multi-node vector-store deployment.
- AI suggestions require explicit review. When a deadline has no confirmed date, enter one before approving it.
- Development/testing create missing database tables at startup. Production requires Alembic migrations: `python -m alembic upgrade head`. Existing databases that already match the current schema may be backed up and verified before `python -m alembic stamp head`; stamping does not validate or change the schema. The additive startup migration still assigns legacy knowledge documents to their uploader's private workspace.
- Account email ownership is not verified, self-service password recovery and invitation email delivery are not implemented. Account deletion is available at `DELETE /api/v1/auth/me` with current-password confirmation; the user must first transfer or delete any shared workspace they own that has other members.
- Workspace subscription records are billing-ready structure only. No billing provider, plan catalog, pricing, checkout, tax, or webhook processing is configured.
- Reminders run in the backend process and cannot notify while the application is stopped. Run a single backend worker for local development.
- Authentication and endpoint rate limiting are in-memory and are not shared across multiple server processes. Expired keys are evicted. AI, Gmail message listing, and knowledge chat are limited to 30 requests per user per minute.
- Browser authentication uses an HttpOnly cookie, and cookie-authenticated writes require a trusted `Origin`. Legacy localStorage tokens are cleared on app startup. JWTs are individually revoked on logout through their database-backed session IDs.
- Gmail disconnect asks Google to revoke its stored refresh/access token before deleting local credentials and cached messages. Remote revocation is best-effort; local deletion still proceeds if Google is unavailable. Mock tokens are not sent to Google.

---

## 📚 Complete Documentation Suite

- [Architecture Design & Diagram](docs/architecture.md)
- [Workspace Knowledge Base Setup and Operations](docs/KNOWLEDGE_BASE.md)
- [Pre-implementation Project Audit](docs/PROJECT_AUDIT.md)
- [Product Requirements Document (PRD)](docs/prd.md)
- [Technical Requirements Document (TRD)](docs/trd.md)
- [Application Flow & State Transitions](docs/app_flow.md)
- [Database Schema & ERD](docs/database.md)
- [Security Threat Model & Guardrails](docs/threat_model.md)
- [Security & Privacy Notes](docs/SECURITY.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [REST API Specification](docs/api.md)
- [Windows PowerShell Setup Guide](docs/setup_windows.md)
- [Testing & Quality Guide](docs/testing.md)
- [Troubleshooting Guide](docs/troubleshooting.md)
- [Production Deployment Guide](docs/deployment.md)
- [Backup & Disaster Recovery](docs/backup_recovery.md)
- [Feature Roadmap & Limitations](docs/roadmap.md)

---

## 📄 License

MIT License. Built for students and productivity-minded collaborators.
