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
  - Provider abstraction with 100% offline rule-based fallback when no API key is configured.
- **Academic AI Assistant**: Grounded conversational assistant answering questions about your authorized academic context (*"What should I work on today?"*, *"Which deadlines are coming up?"*, *"Create a study plan for this week"*).
- **Persistent In-App Reminders**: Background single-process scheduler polling database intervals with duplicate alert suppression and customizable lead times.
- **Privacy & Data Governance**: Transparent disclosures on local storage, data minimization, and one-click data clearance.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS / Custom Luxury SaaS Tokens, Lucide React, React Router v7 |
| **Backend** | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, SQLite (local development with direct path to PostgreSQL) |
| **Security** | Bcrypt password hashing, signed JWT session tokens, Fernet token encryption (AES-128-CBC + HMAC-SHA256), HttpOnly cookies, CORS whitelisting, CSRF state verification |
| **AI Layer** | Provider-independent adapter interface supporting Groq, OpenAI, and local offline rule-based NLP |

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

# Copy environment variables
Copy-Item .env.example .env
```

### 2. Set Up Frontend
```powershell
cd frontend
npm install --legacy-peer-deps
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

---

## 🧪 Automated Testing

StudentOS includes a comprehensive test suite covering security primitives, authentication, task CRUD, cross-user isolation, deadline duplicate checks, Gmail OAuth state validation, AI extraction, and prompt-injection resistance.

```powershell
# Run the complete test suite
.\run_tests.ps1
```
Or directly via pytest:
```powershell
.\.venv\Scripts\pytest -o pythonpath=. -v backend/app/tests
```

---

## 📚 Complete Documentation Suite

- [Architecture Design & Diagram](docs/architecture.md)
- [Product Requirements Document (PRD)](docs/prd.md)
- [Technical Requirements Document (TRD)](docs/trd.md)
- [Application Flow & State Transitions](docs/app_flow.md)
- [Database Schema & ERD](docs/database.md)
- [Security Threat Model & Guardrails](docs/threat_model.md)
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
