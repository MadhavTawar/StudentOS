# Testing Guide — StudentOS

## Backend unit tests

Run from the repository root:

```powershell
python -m pytest -o pythonpath=. -q backend/app/tests
```

Expected: ~90 passed, ~1 warning, ~100 seconds. The warning is a Starlette/httpx `TestClient` deprecation notice. `conftest.py` sets `KNOWLEDGE_WARMUP_ENABLED=false` so tests never touch the network.

To run a single file:

```powershell
python -m pytest -o pythonpath=. -q backend/app/tests/test_ai.py
```

## End-to-end (Playwright for Python)

The E2E tests live in `backend/app/tests/e2e/` and are skipped by default. They require a running backend and frontend.

1. Start the backend (from repo root):

```powershell
$env:PYTHONPATH = "."
uvicorn backend.app.main:app --port 8000
```

2. Start the frontend (from `frontend/`):

```powershell
npm run dev -- --host 127.0.0.1 --port 5173
```

3. Run the E2E suite (from repo root):

```powershell
$env:RUN_E2E = "1"
$env:E2E_BASE_URL = "http://127.0.0.1:5173"
$env:E2E_API_URL = "http://127.0.0.1:8000"
python -m pytest -o pythonpath=. -m e2e backend/app/tests/e2e
```

Notes:
- Login is rate-limited to 5 attempts/minute; tests register a fresh user and log in once.
- Cookie-authenticated writes need an `Origin: http://127.0.0.1:5173` header.
- The XSS test creates a task with HTML in its title and verifies it renders as text.
- Tests that publish a real document (`test_learn_chat_give_example_deadlock` and
  `test_learn_chat_citation_check`) require the `BAAI/bge-small-en-v1.5` embedding
  model to be downloaded once (via fastembed). On first run with internet access,
  the model is cached to `~/.cache/huggingface/hub`. Without it, those tests are
  skipped with a clear message.

## Frontend checks

```powershell
cd frontend
npm run lint
npm run build
```

There is no frontend unit test framework; verification is via lint, build and the E2E suite above.

## Lint / type check

```powershell
cd frontend
npm run lint          # oxlint
npx tsc -b            # TypeScript
```
