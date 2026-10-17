# Institute Knowledge Base

## What it does

The knowledge area provides one authenticated institute library and a source-grounded question interface. Administrators and document managers maintain official PDF/DOCX references. Students can search only content whose document and version are currently published. The model does not create tasks, deadlines, or other records from an answer.

## Initial administrator setup

All public registrations remain students. Email addresses are not treated as proof of identity because the existing registration flow does not verify ownership.

1. From the repository root, generate a secret:

   ```powershell
   .\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

2. Add the output to the private `.env`:

   ```dotenv
   KNOWLEDGE_ADMIN_BOOTSTRAP_TOKEN=replace-with-generated-value
   ```

   Keep the value at least 32 characters. Do not paste it into chat, commit it, or add it to the frontend.
3. Start StudentOS and sign in to the account intended to become the administrator. Open **Document desk** and claim the one-time administrator role with the secret.
4. Remove the token from `.env` and restart the backend. The grant is stored in the relational database. Only the initial administrator can add/revoke document managers; managers cannot assign staff roles.

The database permits one initial administrator. Recovery of a lost administrator account currently requires a trusted database operator to restore the role; there is no public or self-service escalation route.

## Storage and configuration

| Setting | Default | Purpose |
|---|---|---|
| `KNOWLEDGE_STORAGE_DIR` | `~/.studentos/knowledge` | Private original source files |
| `KNOWLEDGE_VECTOR_DIR` | `~/.studentos/chroma` | Persistent local Chroma vector index |
| `KNOWLEDGE_MAX_UPLOAD_BYTES` | `15728640` | Maximum individual file size (15 MiB) |
| `KNOWLEDGE_MAX_PAGES` | `300` | Maximum pages in a PDF |
| `KNOWLEDGE_MAX_EXTRACTED_CHARS` | `1000000` | Maximum extracted text size |
| `KNOWLEDGE_CHUNK_SIZE` | `1200` | Approximate maximum characters per chunk |
| `KNOWLEDGE_CHUNK_OVERLAP` | `160` | Character overlap for adjacent chunks |
| `KNOWLEDGE_MAX_DISTANCE` | `0.65` | Maximum cosine distance accepted for a retrieved result |
| `KNOWLEDGE_EMBEDDING_MODEL` | `BAAI/bge-small-en-v1.5` | FastEmbed model identifier for local embeddings |

On Windows the default directories resolve below `%USERPROFILE%\.studentos\`. Override them in `.env` for another private disk or data volume. Keep both outside `frontend/public`, any static web root, and source control. The application does not encrypt these files or the vector database at rest; secure the host and backups.

FastEmbed downloads the configured model the first time the system embeds text. After download, embedding and vector search execute locally. A model download or local Chroma failure is surfaced; an upload cannot be published until its extraction and indexing succeed.

## Document lifecycle

1. An authorized manager selects a PDF or DOCX and adds its title/category/description. Request-body and file-size limits apply before expensive parsing.
2. The backend validates extension, signature/archive structure, file size, and relevant page/text limits. It assigns a random storage key; the submitted filename is display metadata only.
3. PyMuPDF extracts text from each PDF page. `python-docx` extracts paragraphs and table text. DOCX pagination is not represented. Scanned PDFs with no text layer fail clearly; OCR is not included.
4. Extracted text is split into overlapping chunks. Chunks, page references, SHA-256 digest, uploader, and version state are stored in SQL. Local embeddings and chunk IDs are written to Chroma. The version becomes `ready` only after indexing succeeds.
5. A manager explicitly publishes a ready version. Publishing makes it the current version and marks the previous one superseded. An upload or processing failure never replaces the current published version.
6. Archiving changes SQL publication state first. Student library/search/download authorization checks SQL and immediately excludes that document even if its old vectors remain in the local index.

Successfully processed duplicate content is rejected by SHA-256. Failed uploads can be retried. Files, chunks, and vectors are retained for audit/history; no hard-delete or retention-purge feature is provided.

## Roles and access boundaries

- **Student:** public registration default; browse published library, ask questions, and download only currently published source versions.
- **Document manager:** role assigned/revoked by the institute administrator; upload, inspect all versions, publish, archive, and download management documents.
- **Institute administrator:** one-time bootstrap role; all manager capabilities plus staff role assignment.

The React navigation only reflects role access for usability. Every management, download, and lifecycle action independently enforces authorization in FastAPI. Chroma metadata is a retrieval filter, never an authorization source.

## Answers, citations, and provider privacy

The chat service retrieves candidate chunks from Chroma, then joins their IDs to relational chunk/document/version rows. It passes only matching chunks from documents and versions still marked published. Source IDs, title, version, page range, and excerpt in the response are constructed by the server from those SQL rows; model-generated citation IDs are not trusted. Results over the configured distance threshold are omitted. If no authorized evidence remains, the service returns an explicit insufficient-evidence answer and makes no model call.

Known instruction-like content in either a question or a candidate chunk is rejected/omitted. The provider prompt treats all retrieved text as untrusted source data and forbids invented dates/policies, citation fabrication, and action claims. This is defense-in-depth, not a guarantee against prompt injection. If relevant publications conflict, the answer should explain the conflict; the offline mode instead returns relevant excerpts and directs students to confirm disagreements with the institute.

- With `AI_PROVIDER=offline`, the question, retrieval, and excerpt-based answer remain local.
- With `AI_PROVIDER=groq`, the question and selected published source passages are sent to the configured Groq chat-completions endpoint for answer composition. The knowledge page discloses this. Do not enable Groq if institute content must not leave the host.
- Provider errors are surfaced to the requester; the system does not silently fall back to an unsupported answer.

## Safe schema updates

The current backend has no versioned Alembic migration history. The knowledge feature adds new SQLAlchemy tables and indexes through the app's existing `Base.metadata.create_all()` startup; it does not add or alter columns in existing user/task tables and must not reset the database. The test client points application startup to the isolated in-memory test engine so tests do not write knowledge tables into the developer's `studentos.db`.

Back up the database before upgrading. A production rollout still needs a versioned migration/rollback process, private persistent file/vector backups, access monitoring, and a reviewed retention policy.

## Synthetic retrieval evaluation

Run a small semantic retrieval check using only synthetic policies and questions:

```powershell
.\.venv\Scripts\python.exe -m backend.app.evaluations.knowledge_rag_eval
```

The first run can download the configured FastEmbed model. The evaluator embeds four synthetic passages and questions in memory, computes cosine ranking, and measures Recall@3 and mean reciprocal rank. It does not access Chroma, the app database, `.env` credentials, real institute documents, or student records. Ranking metrics do not measure answer factuality, citation correctness, access-control security, or model prompt-injection resistance; those have separate tests and controls.

The bundled four-question synthetic set measured **Recall@3 100%** and **MRR 1.000** with `BAAI/bge-small-en-v1.5` in the current local run. This is a smoke baseline on a deliberately small, synthetic corpus, not evidence of quality on institute content.

## Troubleshooting

| Symptom | Check |
|---|---|
| No **Document desk** link | Configure the bootstrap secret, restart, and sign in as the account that will claim the initial administrator role. After the claim, the link appears for admins and assigned managers. |
| Bootstrap returns `503` | Set a non-empty token of at least 32 characters in the backend `.env`; restart the backend. |
| Bootstrap returns `409` | An initial administrator is already stored. A database owner must handle recovery if that account is lost. |
| Upload fails with `415` | Use an actual PDF/DOCX whose file signature/container matches its extension. |
| Upload fails with `422` | Check archive integrity, PDF password protection, searchable text, and document extraction limits. |
| Upload fails with `413` | Check the 15 MiB file limit, PDF page limit, and extracted-text limit in `.env`. |
| Version remains failed/unpublished | Read the manager-visible error. Verify private disk access, install dependencies with `pip install -r backend\requirements.txt`, check local model download/cache access, and retry with a valid file. |
| Library is empty after upload | New versions are not public until a manager explicitly publishes a `ready` version. |
| Chat says evidence is insufficient | Confirm a current version is published, refine the question, and review the relevant passages. Adjust the cosine-distance threshold only after evaluation. |
| Chroma/vector-store unavailable | Confirm `KNOWLEDGE_VECTOR_DIR` is writable and private, then restart. Do not delete the vector directory unless a trusted operator intends to rebuild the index from source files. |
