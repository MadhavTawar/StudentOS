"""add_auto_reminder_logs

Revision ID: ccc608cbacc0
Revises: b7c4d1e2f901
Create Date: 2026-10-24 17:42:28.144127

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'ccc608cbacc0'
down_revision: Union[str, None] = 'b7c4d1e2f901'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "auto_reminder_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_id", sa.String(36), nullable=False),
        sa.Column("item_kind", sa.String(16), nullable=False),
        sa.Column("stage", sa.String(16), nullable=False),
        sa.Column("notified_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_auto_reminder_unique", "auto_reminder_logs", ["item_id", "item_kind", "stage"], unique=True)
    op.create_index("ix_auto_reminder_logs_user_id", "auto_reminder_logs", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_auto_reminder_logs_user_id", table_name="auto_reminder_logs")
    op.drop_index("idx_auto_reminder_unique", table_name="auto_reminder_logs")
    op.drop_table("auto_reminder_logs")
