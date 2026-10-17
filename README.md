# StudentOS 🎓

> **AI-Powered Student Productivity and Personal Academic Operating System**

StudentOS helps university and college students manage academic communication, coursework assignments, upcoming examination deadlines, study plans, reminders, and everyday student responsibilities through one secure workspace powered by transparent AI guardrails.

---

## 🌟 Key Features

- **Personalized Academic Dashboard**: Real-time overview of active tasks, upcoming deadlines, overdue items, recent academic emails, and connection states.
- **Task Management**: Comprehensive CRUD with priority tags (Urgent, High, Medium, Low), academic categories, due dates, estimated durations, and toggle completion.
- **Academic Deadlines**: Chronological calendar tracking with automated duplicate detection, ambiguous date warnings, and task associations.
- **Read-Only Gmail Integration**: Least-privilege OAuth 2.0 (`gmail.readonly`) integration with AES/Fernet encrypted token storage, untrusted preview sanitization, and disconnect support.
- **AI-Assisted Email Understanding & Extraction**:
  - Extracts task and deadline candidate proposals with supporting quoted excerpts and confidence metrics.
  - **Human-in-the-Loop Guardrail**: Extracted proposals are *never* automatically committed without explicit user review and approval.
  - **Adversarial Prompt-Injection Defense**: Isolates untrusted email text, strips injection instructions, and flags suspicious directives.
  - Offline rule-based extraction is the default. An optional Groq chat-completions provider is available when explicitly enabled.
- **Academic AI Assistant**: Grounded conversational assistant answering questions about your authorized academic context (*"What should I work on today?"*, *"Which deadlines are coming up?"*, *"Create a study plan for this week"*).
- **Institute Knowledge Library**: Role-managed PDF/DOCX policies and references, local embeddings and vector search, published-version lifecycle, source citations, and explicit insufficient-evidence responses.
- **Persistent In-App Reminders**: Background single-process scheduler polling database intervals with duplicate alert suppression and customizable lead times.
- **Privacy & Data Governance**: Transparent disclosures on local storage, data minimization, and one-click data clearance.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 19, TypeScript, Vite 8, responsive StudentOS design system, Lucide React, React Router v7 |
| **Backend** | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0, SQLite (local development); tables are created at startup |
| **Security** | Bcrypt password hashing, signed JWT session tokens, Fernet token encryption (AES-128-CBC + HMAC-SHA256), HttpOnly cookies, CORS whitelisting, CSRF state verification |
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
Backend OpenAPI interactive documentation: **`http://localhost:8000/docs`**

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
- **StudentOS still shows the demo account:** Confirm both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are non-empty in the repository-root `.env`, restart the backend, then disconnect the demo connection and connect again. A missing pair keeps the application in local mock mode; configuring only one value returns a configuration error.

Keep the client secret private and out of source control. Never commit `.env` or share its secret. With neither OAuth credential configured, StudentOS remains in local mock mode and shows synthetic demo emails; setting only one credential is reported as a configuration error. Mock authorization codes are rejected when Google OAuth credentials are configured.

### Optional Groq AI provider

The default `AI_PROVIDER=offline` keeps email processing local. To enable Groq, add or update these values in the private repository-root `.env` file, using a **new, rotated key**:

```dotenv
AI_PROVIDER=groq
GROQ_API_KEY=your-new-groq-api-key
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_MODEL=openai/gpt-oss-20b
```

Restart the backend after changing `.env`. When Groq is selected, email extraction sends the selected email's subject, sender, and snippet to Groq; assistant chat sends the user's question and relevant task/deadline details. This is disclosed in the Inbox and Assistant screens. Do not enable this provider if you do not want that data sent to Groq. The app validates structured extraction output, checks evidence against the source email, does not retry failed requests automatically, and still requires user review before creating tasks or deadlines. The default model is `openai/gpt-oss-20b`; set `GROQ_MODEL` to another model enabled for your Groq project if needed.

### Institute knowledge library

The knowledge module is available to authenticated users. Students can browse published institute documents, ask evidence-grounded questions, and inspect server-validated citations. Administrators and document managers have a separate **Document desk** for processing, versioning, publishing, and archiving documents.

1. Generate a one-time administrator bootstrap secret in PowerShell:

   ```powershell
   .\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

2. Put the generated value in the private repository-root `.env` as `KNOWLEDGE_ADMIN_BOOTSTRAP_TOKEN`. Sign in to the StudentOS account intended to be the initial administrator, open **Document desk**, and claim the role using that secret. Public registration never grants staff access, and the bootstrap can only be claimed once. Remove `KNOWLEDGE_ADMIN_BOOTSTRAP_TOKEN` from `.env` and restart after the claim.
3. The administrator can grant **Document manager** access to a user who has already registered. Document managers can upload valid PDF/DOCX files (15 MB default limit), inspect processing failures, publish a successfully indexed version, upload replacements, and archive documents. A previous published version stays current until its replacement is explicitly published.
4. Students can open **Institute library**. Scanned PDFs without a text layer are not OCR-processed; DOCX source citations do not include page numbers. Files and vectors are stored outside frontend assets in `%USERPROFILE%\.studentos\knowledge` and `%USERPROFILE%\.studentos\chroma` by default.

FastEmbed runs embeddings locally after downloading the configured model on first use. With `AI_PROVIDER=offline`, question retrieval and excerpt answers stay local. With `AI_PROVIDER=groq`, the question and relevant published passages are sent to Groq for answer composition; the UI discloses this. See [the knowledge-base guide](docs/KNOWLEDGE_BASE.md) for configuration, lifecycle, and troubleshooting details.

---

## 🧪 Automated Testing

StudentOS includes a test suite covering security primitives, authentication, task CRUD, cross-user isolation, deadline duplicate checks, Gmail OAuth state validation, AI extraction, and institute knowledge upload/access/lifecycle/citation behavior.

```powershell
# Run the complete test suite
.\run_tests.ps1
```

Or directly via pytest:

```powershell
.\.venv\Scripts\pytest -o pythonpath=. -v backend/app/tests
```

The backend test suite uses an isolated in-memory SQLite database and mocked Gmail OAuth. There is no frontend test runner configured yet; `npm run build` checks TypeScript compilation and the production bundle.

## Current MVP scope and limitations

- Gmail OAuth, read-only inbox metadata sync, task/deadline CRUD, and offline AI proposal review are implemented. Gmail sync currently retrieves up to 20 inbox messages per request.
- The AI extractor runs locally by default; the optional Groq provider is active when explicitly selected. Knowledge embeddings and vector search run locally, while Groq receives knowledge questions and retrieved passages only when configured.
- Institute RAG is a bounded local MVP: PDF/DOCX only, no OCR, synchronous processing, no automated task creation, and no multi-node vector-store deployment.
- AI suggestions require explicit review. When a deadline has no confirmed date, enter one before approving it.
- Database tables are created at application startup with SQLAlchemy `create_all`; Alembic is listed as a dependency, but migration scripts and upgrade workflow are not configured.
- Reminders run in the backend process and cannot notify while the application is stopped. Run a single backend worker for local development.
- Authentication rate limiting is in-memory and is not shared across multiple server processes.
- Browser authentication uses an HttpOnly cookie, and cookie-authenticated writes require a trusted `Origin`. Legacy localStorage tokens are cleared on app startup. JWT sessions are not individually revoked on logout; a retained token can remain valid until expiry.

---

## 📚 Complete Documentation Suite

- [Architecture Design & Diagram](docs/architecture.md)
- [Institute Knowledge Base Setup and Operations](docs/KNOWLEDGE_BASE.md)
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

MIT License. Built for students, educational communities, and productivity engineers.
