# StudentOS Architecture Documentation

## 1. System Overview
StudentOS is designed as a **Modular Monolith** with clean domain boundaries, combining high developer velocity, operational simplicity, and strict security isolation for sensitive student data.

```
+-------------------------------------------------------------------------+
|                        Browser Client (SPA)                             |
|  React 19 + TypeScript + Vite + Tailwind CSS / Custom Luxury SaaS Tokens |
|  Routes: Dashboard | Tasks | Deadlines | Inbox | Assistant | Settings    |
+------------------------------------+------------------------------------+
                                     |
                       HTTPS / REST (v1) [JSON]
                                     |
+------------------------------------v------------------------------------+
|                       FastAPI Application Gateway                       |
|  - Security Middleware: Nosniff, FrameGuard, CSRF Cookie Verification   |
|  - Correlation ID Tracking & Request Duration Metrics                   |
|  - IP/Email Sliding-Window Rate Limiter                                 |
|  - User Ownership & Access Control Boundary                             |
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
|  - Normalized Tables: Users, Preferences, Tasks, Deadlines, Reminders,  |
|    OAuthIntegrations, OAuthStates, EmailCache, AICandidates             |
+-------------------------------------------------------------------------+
```

## 2. Core Architectural Decisions

### 2.1 Modular Monolith vs. Microservices
We intentionally selected a modular monolith architecture. For student productivity apps, premature microservices introduce unnecessary network overhead, distributed transaction failures, deployment complexity, and synchronization vulnerabilities without adding value. The codebase maintains strict folder-level domain boundaries (`auth`, `tasks`, `deadlines`, `gmail`, `ai`, `reminders`).

### 2.2 Security-First Integration Guardrails
1. **Gmail Read-Only Permission**: Scope is locked strictly to `https://www.googleapis.com/auth/gmail.readonly`. The application refuses full mailbox, send, delete, or modify permissions.
2. **Encrypted Token Storage**: OAuth access and refresh tokens are encrypted at rest using AES/Fernet encryption before persisting to SQLite/PostgreSQL.
3. **Prompt Injection Defense**: Email content is isolated as untrusted data using delimiter tagging. Directives inside emails ("ignore instructions", "reveal secrets", "send emails") are actively detected, neutralized, and prevented from invoking tools.
4. **Human-in-the-Loop Principle**: The AI agent produces *candidates* with supporting quote evidence and confidence metrics. Tasks and deadlines are created only when the student explicitly clicks "Approve".

### 2.3 Provider-Independent AI Architecture
The `BaseAIProvider` interface abstracts LLM providers. When external API keys (`GROQ_API_KEY`, `OPENAI_API_KEY`) are missing, StudentOS automatically falls back to the deterministic local `OfflineRuleBasedProvider` with zero downtime, zero network dependency, and 100% data privacy.
