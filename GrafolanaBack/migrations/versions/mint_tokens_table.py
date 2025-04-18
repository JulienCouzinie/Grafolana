"""Mint tokens table

Revision ID: mint_tokens_table
Revises: solana_transactions
Create Date: 2025-04-17
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'mint_tokens_table'
down_revision = 'solana_transactions'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create mints table
    op.create_table('mints',
        sa.Column('mint_address', sa.String(), nullable=False),
        sa.Column('is_nft', sa.Boolean(), nullable=False, default=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('symbol', sa.String(), nullable=False),
        sa.Column('decimals', sa.Integer(), nullable=False, default=0),
        sa.Column('supply', sa.Integer(), nullable=False, default=0),
        sa.Column('is_initialized', sa.Boolean(), nullable=False, default=False),
        sa.Column('update_authority', sa.String(), nullable=True),
        sa.Column('primary_sale_happened', sa.Boolean(), nullable=False, default=False),
        sa.Column('is_mutable', sa.Boolean(), nullable=False, default=False),
        sa.Column('uri', sa.String(), nullable=True),
        sa.Column('seller_fee_basis_points', sa.Integer(), nullable=False, default=0),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('image', sa.String(), nullable=True),
        sa.Column('animation_url', sa.String(), nullable=True),
        sa.Column('external_url', sa.String(), nullable=True),
        sa.Column('freeze_authority', sa.String(), nullable=True),
        sa.Column('mint_authority', sa.String(), nullable=True),
        # Use JSON type for structural data
        sa.Column('links', sa.JSON(), nullable=True),
        sa.Column('creators', sa.JSON(), nullable=True),
        sa.Column('attributes', sa.JSON(), nullable=True),
        sa.Column('properties', sa.JSON(), nullable=True),
        sa.Column('extensions', sa.JSON(), nullable=True),
        # Timestamps
        sa.Column('created_at', sa.Float(), nullable=False),
        sa.Column('updated_at', sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint('mint_address')
    )
    # Create an index on mint_address for faster lookups
    op.create_index(op.f('ix_mints_mint_address'), 'mints', ['mint_address'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_mints_mint_address'), table_name='mints')
    op.drop_table('mints')