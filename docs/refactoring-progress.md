# StudentOS Refactoring Progress

This is the running log for the personal-first product simplification workflow.

## Phase 0 — Audit

- **Status:** Complete; awaiting the product owner's next phase selection.
- **Commits:** `docs: audit StudentOS product refactoring baseline`; `docs: tidy audit markdown whitespace`; `docs: record frontend install baseline`.
- **Changes:** Added [`product-refactoring-audit.md`](./product-refactoring-audit.md). No application code, API, model, data, or migration changes.
- **Backend:** `python -m pytest -o pythonpath=. -q backend/app/tests` — **56 passed**, 1 protobuf deprecation warning, 133.23 seconds.
- **Frontend dependency install:** From `frontend`, `npm ci` — **passed**, 32 packages installed, 0 vulnerabilities.
- **Frontend lint:** From `frontend`, `npm run lint` — **passed**, no warnings reported.
- **Frontend TypeScript:** From `frontend`, `npm exec -- tsc --noEmit -p tsconfig.app.json` — **passed**, no diagnostics.
- **Frontend build:** From `frontend`, `npm run build` — **passed**; `tsc -b` and Vite 8.3.4 completed, 1,962 modules transformed.
- **Known issues:** No frontend test framework exists. Re-extracting the same email currently creates new candidate rows. Assistant chat and document Q&A are separate. Knowledge processing contains a user-facing “Institute document” error string that conflicts with student-owned content language. Shared workspaces are stored as `organization` workspace type today; the audit recommends a UI-only terminology change unless a future decision says otherwise.
- **Next step:** Wait for the user to name Phase 1, 2, 3, 4, or 5. Do not start another phase in this session.

## Phase 1 — Academic Planner

- **Status:** Complete; committed as `feat: add academic planner route and redirects`.
- **Features changed:** Added a dedicated Planner destination at `/app/planner` with task/calendar toggle, while keeping `/app/tasks` and `/app/deadlines` as compatibility redirects. The sidebar now presents a single Planner entry rather than separate Coursework/Calendar items without changing the underlying task/deadline data models or API usage.
- **Preserved behavior:** Existing TasksPage and DeadlinesPage logic remain the source of truth, including CRUD flows, filters, duplicate-deadline detection, reminder links, and status handling. Legacy URLs continue to resolve to the same planner experience.
- **Files changed:** [`frontend/src/pages/PlannerPage.tsx`](../frontend/src/pages/PlannerPage.tsx), [`frontend/src/App.tsx`](../frontend/src/App.tsx), [`frontend/src/components/layout/Sidebar.tsx`](../frontend/src/components/layout/Sidebar.tsx).
- **Migrations:** None.
- **Exact validation:**
  - `cd frontend && npm run build` — **passed** (Vite production build completed successfully).
  - `cd frontend && npm run lint` — **passed** (0 warnings, 0 errors).
  - `pytest -o pythonpath=. -q backend/app/tests` — **56 passed** in 76.68s.
- **Known issues:** The Study desk overview remains distinct from the Planner, which is intentional for Phase 1 to avoid duplicating the full planner while preserving the dashboard context. No database or API contract changes were introduced.
- **Recommended next phase:** Phase 2 — Knowledge Hub consolidation.

## Phase log template

For each later phase, record:

- Status and commit hash/message.
- Features changed and preserved behavior.
- Files changed and any migration (or "none").
- Exact test/build/lint commands and actual results.
- Known issues and manual checks requested from the user.
- Recommended next phase.

## UI Redesign Phases (reference screens)

### Phase 1 — TopBar app shell — Complete; committed as `a135582`
Replaced left Sidebar + legacy Navbar with a single `TopBar` component (logo + brand, nav links Dashboard/Planner/Goals/Inbox/Library/Study guide, global search, notifications bell with unread dot, avatar dropdown with workspace switcher labeled "Study group", Reminders, Study groups, Settings, Plan & billing, Log out). `.app-shell` is now a column. Added `topbar.css`. Applied `data-theme` from preferences with before-first-paint localStorage restore (default light). Removed dead nav badge props; real notification counts wired. Fixed Dashboard bugs: Gmail stat text size, stat-tile icon overlap at 390px. Old Sidebar/Navbar files left in place (no remaining references).
- Files: `frontend/src/components/layout/TopBar.tsx` (new), `frontend/src/topbar.css` (new), `frontend/src/components/layout/Layout.tsx`, `frontend/src/main.tsx`, `frontend/index.html`, `frontend/src/layout.css`, `frontend/src/pages/DashboardPage.tsx`
- Validation: lint clean; build pass (1.67s); pytest 61 passed (unchanged).
- Screenshots: not captured (no browser available in environment).

### Phase 2 — Dashboard redesign — Complete; committed as `fcfac08`
Rewrote DashboardPage with greeting row ("Good morning, <first name>"), 4 stat tiles (active tasks, upcoming deadlines, overdue, completed), Today hourly timeline + Anytime row, Active tasks table, month mini-calendar with dots on days with items, Goals card with progress bars, "What deserves attention next" strip, AI proposals strip, quick-add task modal. Moved all inline styles into `.dashboard-*` classes in layout.css; removed orphaned `[style*=...]` dashboard repaint rules.
- Files: `frontend/src/pages/DashboardPage.tsx`, `frontend/src/layout.css`
- Validation: lint clean; build pass (2.64s); pytest 61 passed (unchanged).

### Phase 3 — Planner redesign — Complete; committed as `f9dd5a3`
Rewrote DeadlinesPage as calendar view: month grid with per-day count badges and thin % complete bars, today/selected highlighted, prev/next, Week/Month toggle. Below: "Tasks for <date>" with progress bar and rows (checkbox, title, description, estimated_duration chip, edit icon). Right rail: study streak (consecutive days with completed task from completed_at), AI study assistant "Generate study plan" (calls chatAssistant, confirm-before-write via createTask), quick actions "Add task for <selected date>". Preserved all deadline CRUD, filters, duplicate-deadline warning, ?view= redirects.
- Files: `frontend/src/pages/DeadlinesPage.tsx`, `frontend/src/pages/TasksPage.tsx`, `frontend/src/layout.css`
- Validation: lint clean; build pass (1.43s); pytest 61 passed (unchanged).

### Phase 4 — Knowledge Hub — Complete; committed as `da0da80`
Restored management access: render `KnowledgeAdminPage` at `/app/knowledge/manage` instead of redirecting to `/app/knowledge`; added "Manage library" link when `can_manage_documents` is true; non-managers see access-denied state. Grouped documents by category in documents panel. Added Details tab alongside Ask. Supported `#page=N` for PDF viewer so citation chips jump to cited page. Citation chips show excerpt and open cited document + version. Show "Not enough evidence" clearly when insufficient_evidence.
- Files: `frontend/src/App.tsx`, `frontend/src/pages/KnowledgePage.tsx`, `frontend/src/pages/KnowledgePage.css`
- Validation: lint clean; build pass (1.98s); pytest 61 passed (unchanged).

### Phase 5 — Consistency pass — Complete
Applied shared card/pill/button/table styles to Inbox, Goals, Reminders, Settings, Workspaces, Billing, Login/Register, and the marketing page. Deleted remaining inline `style={{}}` blocks in those pages and moved them into CSS classes. Added `docs/UI-guidelines.md` (tokens, spacing, components, theming).
- Files: `frontend/src/pages/InboxPage.tsx`, `frontend/src/pages/GoalsPage.tsx`, `frontend/src/pages/RemindersPage.tsx`, `frontend/src/pages/SettingsPage.tsx`, `frontend/src/pages/WorkspacesPage.tsx`, `frontend/src/pages/BillingPage.tsx`, `frontend/src/pages/LoginPage.tsx`, `frontend/src/pages/RegisterPage.tsx`, `frontend/src/pages/MarketingHomePage.tsx`, `frontend/src/pages/JoinWorkspacePage.tsx`, `frontend/src/layout.css`, `docs/UI-guidelines.md` (new)
- Validation: lint clean; build pass (2.38s); pytest 61 passed (unchanged).

