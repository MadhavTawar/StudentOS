# StudentOS Architecture Documentation

## 1. System Overview

StudentOS is a **Modular Monolith** SaaS prototype for individual student accounts with optional shared organization workspaces. Account-owned academic data stays private; workspace memberships authorize access to workspace-scoped published knowledge libraries.

```text

+-------------------------------------------------------------------------+
|                        Browser Client (SPA)                             |
|  React 19 + TypeScript + Vite + responsive StudentOS design system       |
|  Public landing | Account | Private study desk | Shared workspace library |
+------------------------------------+------------------------------------+
                                     |
                       HTTPS / REST (v1) [JSON]
                                     |
+------------------------------------v------------------------------------+
|                       FastAPI Application Gateway                       |
|  - Security Middleware: Nosniff, FrameGuard, CSRF Cookie Verification   |
|  - Correlation ID Tracking & Request Duration Metrics                   |
|  - IP/Email Sliding-Window Rate Limiter                                 |
|  - Account Ownership & Workspace Membership Boundary                   |
+---------+------------------+------------------+-----------------+-------+
          |                  |                  |                 |
+---------v--------+ +-------v--------+ +-------v-------+ +-------v-------+
|  Auth Service    | | Tasks & Deadlines| | Gmail Service | |  AI Engine    |
| - Bcrypt Salted  | | - State Machine | | - Google OAuth| | - Provider    |
| - JWT Tokens     | | - Duplicate Det | | - Fernet Token| |   Abstraction |
| - HttpOnly Cookie| | - Ambiguous Date| |   Encryption  | | - Prompt Inj. |
| - Preferences    | | - UTC Canonical | | - HTML Sanitize | - Offline Rule|
+---------+--------+ +-------+--------+ +-------+-------+ +-------+-------+
          |                  |                  |                 |
          +------------------+------------------+-----------------+
                             |
                   SQLAlchemy 2.0 ORM Engine
                    (PRAGMA foreign_keys=ON)
                             |
+----------------------------v--------------------------------------------+
|                          Data Storage Layer                             |
|  - SQLite (Local Development) / PostgreSQL (Production Target)          |
|  - Users, Workspaces, Memberships, Subscriptions, Tasks, Deadlines,    |
|    Reminders, OAuth, Workspace Documents, Versions, Chunks, Audit      |
+-------------------------------------------------------------------------+

    Private workspace files (outside frontend assets)
                 |                     |
         PDF / DOCX extraction    Local FastEmbed model
                 |                     |
           SQL chunk records <--> Persistent Chroma index
```

## 2. Core Architectural Decisions

### 2.1 Modular Monolith vs. Microservices

We intentionally selected a modular monolith architecture. For student productivity apps, premature microservices introduce unnecessary network overhead, distributed transaction failures, deployment complexity, and synchronization vulnerabilities without adding value. The codebase maintains strict folder-level domain boundaries (`auth`, `tasks`, `deadlines`, `gmail`, `ai`, `reminders`).

### 2.2 Security-First Integration Guardrails

1. **Gmail Read-Only Permission**: Scope is locked strictly to `https://www.googleapis.com/auth/gmail.readonly`. The application refuses full mailbox, send, delete, or modify permissions.
2. **Encrypted Token Storage**: OAuth access and refresh tokens are encrypted at rest using AES/Fernet encryption before persisting to SQLite/PostgreSQL.
3. **Untrusted Email Handling**: Email text is sanitized and selected injection-like phrases are detected by local heuristics. These heuristics are not comprehensive; no external LLM or tool execution is currently connected.
4. **Human-in-the-Loop Principle**: The AI agent produces *candidates* with supporting quote evidence and confidence metrics. Tasks and deadlines are created only when the student explicitly clicks "Approve".

### 2.3 Provider-Independent AI Architecture

The `BaseAIProvider` interface supports the deterministic local `OfflineRuleBasedProvider` and an optional Groq chat-completions provider. Offline processing is the default. When Groq is enabled, selected email metadata/snippets and assistant questions with the authenticated user's task/deadline context are sent to the configured Groq endpoint; the UI discloses this. OpenAI settings are reserved and not used. Provider errors are surfaced rather than silently falling back.

### 2.4 Workspace Knowledge Retrieval

- Each account receives a private workspace. Optional organization workspaces use server-side memberships with owner/admin/member roles. `X-Workspace-ID` is checked against the authenticated user on each knowledge route; personal tasks, deadlines, reminders, Gmail, and assistant context stay user-scoped.
- Organization invitation links are one-use, expiring bearer credentials stored as hashes. Email verification and invite delivery are not implemented, so links must be privately distributed.
- Document content is extracted from validated PDF and DOCX uploads, split into bounded chunks, and retained in relational records alongside page references. Source files are named with server-generated storage keys under `KNOWLEDGE_STORAGE_DIR`, not under frontend static assets.
- FastEmbed generates local CPU embeddings, and Chroma persists vectors under `KNOWLEDGE_VECTOR_DIR`. The first use may download the configured model; text is embedded locally. If `AI_PROVIDER=groq`, retrieved passages and the question are sent to the configured Groq chat endpoint for answer composition, as disclosed in the UI.
- SQL document/version publication state is authoritative. Search results are revalidated against published relational rows before model input, excerpts, or citations are returned. Publishing a replacement supersedes the previous version only after the new version has extracted and indexed successfully. Archiving removes it from library/search immediately at the relational authorization layer.
- The knowledge path creates new SQLAlchemy tables through `Base.metadata.create_all()` and includes an additive compatibility migration for a workspace ownership column on knowledge documents. A versioned production migration/rollback workflow is not yet configured.
- Extraction is synchronous and bounded for the local MVP. Scanned PDFs without a text layer are not OCR-processed, DOCX citations do not include page numbers, and the single-process local Chroma/SQLite deployment is not a multi-node search architecture.

### 2.5 Subscription foundation

Each workspace has a subscription record with plan, status, provider identifiers, and period fields. Workspaces currently start on an unpriced free record. No payment integration, checkout, webhook, or entitlement enforcement is active.
