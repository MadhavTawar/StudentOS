# Due Items: One Model Design Note

## Decision: Keep both Task and Deadline tables, linked via task_id, behind a shared query layer.

Merging Task and Deadline into a single table would require a migration that
changes every foreign key, reminder, and notification reference. The risk of
data loss and broken foreign keys on existing SQLite databases is high.

Instead, we keep both tables but introduce a shared service layer
(`get_due_items(db, user_id, ...)`) that returns a unified, typed list of
due items. Each item is either a Task or a Deadline (or a linked pair where
a Deadline points back to its Task via `task_id`).

## Shared service

`backend/app/services/due_items.py` provides:

- `DueItem` dataclass: unified view with id, user_id, title, due_date,
  timezone, status, kind ("task" or "deadline"), source_type, source_ref,
  linked_task_id, linked_deadline_id, estimated_duration, priority.
- `get_due_items(db, user_id, *, include_completed=False, kind=None)`:
  returns a list of DueItem sorted by due_date.
- `find_duplicate_task(db, user_id, title, due_date)`: normalised-title
  similarity + same due day.

## Approving a proposal

When an extracted proposal is approved, exactly ONE record is created:
- Task proposal -> Task (kind=task)
- Deadline proposal -> Deadline (kind=deadline)

If an event needs both a task and a deadline (e.g. a submission with a
deadline), the Deadline's task_id is set to the Task's id, linking them.

## Duplicate detection

Tasks now have duplicate detection mirroring deadlines: normalised title
similarity + same due datetime/day. A warning is surfaced in the UI when a
user adds something manually that already exists from an approved proposal.

## Consumers

Dashboard counts/lists, calendar, reminders, assistant, and search all use
`get_due_items` instead of querying Task/Deadline separately.
