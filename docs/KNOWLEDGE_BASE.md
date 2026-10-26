# Workspace Knowledge Library

## How it works

Each user starts with a private personal workspace. A user may create an organization workspace and invite collaborators with a one-time link. Published PDF/DOCX references are shared only inside the selected workspace. Coursework, deadlines, Gmail data, reminders, and personal assistant context remain scoped to the individual user.

The API resolves `X-Workspace-ID` against the authenticated user's membership on every knowledge request. Omitting the header selects that user's personal workspace. A workspace ID alone is never treated as authorization. Owners can manage the workspace library; members can browse and ask questions about currently published documents.

## Creating and joining a workspace

1. Register or sign in to StudentOS.
2. Open **Workspaces**, create a shared workspace, and use **Generate one-time invite link**.
3. Share the resulting URL privately. The link is a bearer credential: anyone who has it can join once before its seven-day expiry. It is stored as a hash, consumed on acceptance, and invite generation is rate-limited.
4. A recipient can create an account or sign in from the invite page. After joining, select the shared workspace in the sidebar. The shared library and its manager are scoped to that selection.

Email delivery is not configured. Email ownership is not verified by the current registration flow, so invitation links must be handled as secrets. Add verified-email delivery before relying on identity-bound invitations.

## Documents and retrieval

Workspace owners upload and manage references from **Library manager**. The backend validates PDF/DOCX structure, file size, archive safety, extracted text limits, and creates randomized storage keys outside frontend assets. Text is chunked and indexed in Chroma with a workspace ID in vector metadata.

Only versions that are currently published in SQL are eligible for download, retrieval, answer composition, and citations. SQL is authoritative; vector results are rechecked against the selected workspace, publication status, and matching version before use. Replacements do not take effect until explicitly published. Archiving removes the reference from the shared library and search.

FastEmbed downloads the configured model on first use and runs local embeddings. `AI_PROVIDER=offline` returns evidence-grounded excerpts on the backend. When `AI_PROVIDER=groq`, the question and selected published passages are sent to the configured Groq endpoint for answer composition; the UI discloses this. Provider failures are surfaced.

Scanned PDFs without a text layer are unsupported; no OCR is provided. DOCX citations do not include page numbers. Processing is synchronous, files and vectors are not encrypted at rest by the application, and there is no retention-purge workflow.

## Data and configuration

| Setting | Default | Purpose |
| --- | --- | --- |
| `KNOWLEDGE_STORAGE_DIR` | `~/.studentos/knowledge` | Private uploaded source files |
| `KNOWLEDGE_VECTOR_DIR` | `~/.studentos/chroma` | Persistent Chroma index |
| `KNOWLEDGE_MAX_UPLOAD_BYTES` | `15728640` | Maximum file size (15 MiB) |
| `KNOWLEDGE_MAX_PAGES` | `300` | Maximum PDF page count |
| `KNOWLEDGE_MAX_EXTRACTED_CHARS` | `1000000` | Maximum extracted text |
| `KNOWLEDGE_CHUNK_SIZE` | `1200` | Approximate chunk size |
| `KNOWLEDGE_CHUNK_OVERLAP` | `160` | Adjacent chunk overlap |
| `KNOWLEDGE_MAX_DISTANCE` | `0.65` | Maximum accepted cosine distance |
| `KNOWLEDGE_EMBEDDING_MODEL` | `BAAI/bge-small-en-v1.5` | FastEmbed model identifier |

On Windows, default paths resolve below `%USERPROFILE%\.studentos\`. Keep data outside the frontend public directory and back it up with the relational database. Legacy knowledge documents are assigned to the uploader's private workspace during the additive startup migration; existing Chroma metadata is updated to match that workspace.

## Known operational limits

- The local MVP uses SQLAlchemy `create_all` plus an additive one-time compatibility migration. It does not yet have a reviewed, versioned deployment migration/rollback workflow.
- Chroma and source files use a local filesystem by default; this is not a multi-instance SaaS storage architecture.
- No background indexing queue, OCR, retention controls, or hard-delete interface is included.
- The synthetic retrieval evaluation does not measure answer factuality or tenant isolation; those behaviors have focused API tests.

Run the synthetic retrieval evaluation with:

```powershell
.\.venv\Scripts\python.exe -m backend.app.evaluations.knowledge_rag_eval
```
