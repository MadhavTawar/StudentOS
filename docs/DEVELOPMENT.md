# Development Guide

## Requirements

- Windows PowerShell
- Python 3.12 or newer
- Node.js 20 or newer with npm 10 or newer

Run the following commands from the repository root.

## First-time setup

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
Copy-Item .env.example .env
```

Create persistent local keys and paste their output into the matching entries in `.env`:

```powershell
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
.\.venv\Scripts\python.exe -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

The first value is `SECRET_KEY`; the second is `ENCRYPTION_KEY`. Do not commit `.env`. Configure Google OAuth only if you want to test Gmail; setup instructions are in the root README.

Install frontend dependencies from the frontend directory:

```powershell
Set-Location frontend
npm ci
Set-Location ..
```

## Start the application

```powershell
.\run_dev.ps1
```

The script checks for Python, npm, backend dependencies, frontend dependencies, and `.env`, then opens backend and frontend processes in separate windows. Press Ctrl+C in the script window to stop both services. Open `http://127.0.0.1:5173`; the API docs are at `http://127.0.0.1:8000/docs`.

To run one service manually:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

```powershell
Set-Location frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

The backend creates missing SQLAlchemy tables at startup and runs an additive compatibility migration for legacy knowledge documents, assigning them to the uploader's private workspace and updating existing vector metadata. Back up the local database and vector directory before upgrades; do not use `drop_all()` outside isolated test fixtures. A complete versioned production migration/rollback workflow is still required before a public launch.

## Tests and checks

```powershell
.\run_tests.ps1
```

The script runs the backend pytest suite. To verify the frontend:

```powershell
Set-Location frontend
npm run build
npm run lint
```

The frontend does not currently have a unit-test framework configured. The backend tests use an isolated in-memory SQLite database; OAuth and external services should be mocked and must not require real Google credentials.

## Configuration notes

- `.env` is loaded from the repository root when the backend starts from that directory.
- Keep one backend worker in local development because the reminder scheduler and authentication rate limiter are process-local.
- Leave `AI_PROVIDER=offline` for local rule-based processing. To enable Groq, set `AI_PROVIDER=groq`, `GROQ_API_KEY`, and optionally `GROQ_API_URL` and `GROQ_MODEL` in the private root `.env`, then restart the backend. Groq receives selected email subject/sender/snippet during extraction and the assistant question plus relevant task/deadline context during chat. Never commit or paste the key into chat. See the README's Optional Groq AI provider section for the exact configuration block.
- Groq-compatible defaults are `https://api.groq.com/openai/v1/chat/completions` and `openai/gpt-oss-20b`; change `GROQ_MODEL` if that model is unavailable to your account.
- Keep `DATABASE_URL` pointed at a separate test database only if you add tests that do not use the existing in-memory test fixture.
- New accounts receive a private workspace. Shared workspaces are created and managed from **Workspaces**. Invite links are one-time bearer credentials, expire after seven days, and are not emailed automatically. Share them only with trusted collaborators. See [the workspace knowledge guide](./KNOWLEDGE_BASE.md).
- Source files and the persistent Chroma index default to `%USERPROFILE%\.studentos\knowledge` and `%USERPROFILE%\.studentos\chroma`. FastEmbed downloads the configured embedding model on first use; document text is embedded locally. Keep `AI_PROVIDER=offline` if workspace questions and source excerpts must not be sent to Groq.
- The public landing page and workspace/subscription records are product foundations only. There is no email verification, password recovery, email delivery, payment provider, published pricing, or production hosting configuration yet.
