"""add ambiguity metadata to AI candidates

Revision ID: 9e5f8d2a4c11
Revises: 6f88a1a1ee30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9e5f8d2a4c11"
down_revision: Union[str, None] = "6f88a1a1ee30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("ai_extraction_candidates") as batch_op:
        batch_op.add_column(sa.Column("is_ambiguous", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column("original_date_text", sa.String(length=255), nullable=True))
    with op.batch_alter_table("ai_extraction_candidates") as batch_op:
        batch_op.alter_column("is_ambiguous", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("ai_extraction_candidates") as batch_op:
        batch_op.drop_column("original_date_text")
        batch_op.drop_column("is_ambiguous")
