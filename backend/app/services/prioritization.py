"""Pure prioritisation and study-planning helpers (no DB, no I/O)."""
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any

PRIORITY_RANK = {"Urgent": 0, "High": 1, "Medium": 2, "Low": 3}


@dataclass
class RankedItem:
    id: str
    title: str
    due_date: Optional[datetime]
    priority: str
    status: str
    estimated_duration: int  # minutes
    kind: str  # task / deadline / event
    reason: str
    is_overdue: bool = False


def _priority_rank(p: str) -> int:
    return PRIORITY_RANK.get(p, 2)


def rank_items(items: List[Dict[str, Any]], now: datetime, tz: str = "UTC") -> List[RankedItem]:
    """Rank due items: overdue -> soonest due -> priority -> undated last.

    Excludes completed/cancelled. Each result includes a short human reason.
    """
    now = _ensure_aware(now)
    ranked: List[RankedItem] = []
    for it in items:
        status = it.get("status", "Pending")
        if status in ("Completed", "Cancelled"):
            continue
        due = it.get("due_date")
        due_dt = _parse_dt(due)
        is_overdue = due_dt is not None and due_dt < now
        est = it.get("estimated_duration")
        if est is None:
            est = 60
        # reason
        if is_overdue:
            reason = "overdue"
        elif due_dt is None:
            reason = "no due date"
        else:
            delta = due_dt - now
            if delta.total_seconds() < 86400:
                reason = f"due today {due_dt.strftime('%I:%M %p').lstrip('0')}, {it.get('priority','Medium')}"
            elif delta.total_seconds() < 2 * 86400:
                reason = f"due tomorrow {due_dt.strftime('%I:%M %p').lstrip('0')}, {it.get('priority','Medium')}"
            else:
                reason = f"due {due_dt.strftime('%a %b %d')}, {it.get('priority','Medium')}"
        ranked.append(RankedItem(
            id=str(it.get("id", "")),
            title=it.get("title", ""),
            due_date=due_dt,
            priority=it.get("priority", "Medium"),
            status=status,
            estimated_duration=est,
            kind=it.get("kind", "task"),
            reason=reason,
            is_overdue=is_overdue,
        ))

    def sort_key(r: RankedItem):
        # overdue first
        overdue_key = 0 if r.is_overdue else 1
        # due date: None last
        if r.due_date is None:
            due_key = (1, datetime.max.replace(tzinfo=timezone.utc))
        else:
            due_key = (0, r.due_date)
        prio_key = _priority_rank(r.priority)
        return (overdue_key, due_key[0], due_key[1], prio_key)

    ranked.sort(key=sort_key)
    return ranked


def _ensure_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _parse_dt(v) -> Optional[datetime]:
    if v is None:
        return None
    if isinstance(v, datetime):
        return _ensure_aware(v)
    try:
        return _ensure_aware(datetime.fromisoformat(str(v).replace("Z", "+00:00")))
    except (ValueError, TypeError):
        return None


def workload_minutes_before(items: List[Dict[str, Any]], before: datetime) -> int:
    """Total estimated minutes of pending items due on or before `before`."""
    before = _ensure_aware(before)
    total = 0
    for it in items:
        status = it.get("status", "Pending")
        if status in ("Completed", "Cancelled"):
            continue
        due = _parse_dt(it.get("due_date"))
        if due is not None and due <= before:
            est = it.get("estimated_duration")
            total += est if est is not None else 60
    return total


def study_plan(items: List[Dict[str, Any]], now: datetime, capacity_minutes_per_day: int = 240) -> Dict[str, Any]:
    """Earliest-deadline-first backward scheduling into days up to capacity.

    Returns dict with 'schedule' (list of {date, items: [...]}) and
    'unscheduled' (list of {title, minutes_over}).
    """
    now = _ensure_aware(now)
    ranked = rank_items(items, now)
    # dated items first by due date, then undated
    dated = [r for r in ranked if r.due_date is not None]
    undated = [r for r in ranked if r.due_date is None]
    dated.sort(key=lambda r: r.due_date)

    # Build day buckets
    schedule: Dict[str, List[RankedItem]] = {}
    # Determine date range: from now to max due date (or +7 days)
    if dated:
        max_due = max(r.due_date for r in dated)
    else:
        max_due = now + timedelta(days=7)
    cur = now.date()
    end = max_due.date()
    while cur <= end:
        schedule[cur.isoformat()] = []
        cur = cur + timedelta(days=1)

    # Track remaining capacity per day
    capacity: Dict[str, int] = {d: capacity_minutes_per_day for d in schedule}

    unscheduled: List[Dict[str, Any]] = []

    # Schedule dated items (earliest deadline first) - backward from due date
    for r in dated:
        placed = False
        # try days from due date backwards to now
        day = r.due_date.date()
        start_day = now.date()
        # iterate from due date down to now
        d = day
        while d >= start_day:
            ds = d.isoformat()
            if ds in capacity and capacity[ds] >= r.estimated_duration:
                schedule[ds].append(r)
                capacity[ds] -= r.estimated_duration
                placed = True
                break
            d = d - timedelta(days=1)
        if not placed:
            # try any day with capacity
            for ds in schedule:
                if capacity[ds] >= r.estimated_duration and datetime.fromisoformat(ds).date() <= r.due_date.date():
                    schedule[ds].append(r)
                    capacity[ds] -= r.estimated_duration
                    placed = True
                    break
        if not placed:
            # find best day (most capacity) before due date
            best = None
            for ds in schedule:
                dd = datetime.fromisoformat(ds).date()
                if dd <= r.due_date.date():
                    if best is None or capacity[ds] > capacity[best]:
                        best = ds
            if best is not None and capacity[best] > 0:
                overflow = r.estimated_duration - capacity[best]
                unscheduled.append({"title": r.title, "minutes_over": overflow, "due": r.due_date.isoformat()})
            else:
                unscheduled.append({"title": r.title, "minutes_over": r.estimated_duration, "due": r.due_date.isoformat()})

    # Fill spare capacity with undated items
    for r in undated:
        placed = False
        for ds in schedule:
            if capacity[ds] >= r.estimated_duration:
                schedule[ds].append(r)
                capacity[ds] -= r.estimated_duration
                placed = True
                break
        if not placed:
            unscheduled.append({"title": r.title, "minutes_over": r.estimated_duration, "due": None})

    # Build output
    sched_list = []
    for ds in sorted(schedule.keys()):
        if schedule[ds]:
            sched_list.append({"date": ds, "items": [{"title": r.title, "minutes": r.estimated_duration} for r in schedule[ds]]})

    return {"schedule": sched_list, "unscheduled": unscheduled, "capacity_minutes_per_day": capacity_minutes_per_day}
