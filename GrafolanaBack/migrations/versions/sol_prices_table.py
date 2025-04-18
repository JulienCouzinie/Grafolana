"""Create sol_prices table

Revision ID: sol_prices_table
Revises: 
Create Date: 2025-04-17
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'sol_prices_table'
down_revision = 'mint_tokens_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create sol_prices table
    op.create_table('sol_prices',
        sa.Column('timestamp', sa.BigInteger(), nullable=False),
        sa.Column('price', sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint('timestamp')
    )


def downgrade() -> None:
    # Drop sol_prices table
    op.drop_table('sol_prices')