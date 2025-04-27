"""Create spam addresses table

Revision ID: spam_addresses_table
Revises: sol_prices_table
Create Date: 2025-04-27
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = 'spam_addresses_table'
down_revision = 'sol_prices_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum type if it doesn't exist
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'creator') THEN
                CREATE TYPE creator AS ENUM ('DEFAULT', 'ADMIN', 'OWNER', 'USER');
            END IF;
        END$$;
    """)
    
    # Create spam table
    op.create_table('spam',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('address', sa.String(), nullable=False),
        sa.Column('creator', sa.Enum('DEFAULT', 'ADMIN', 'OWNER', 'USER', name='creator'), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, default=datetime.utcnow),
        sa.Column('updated_at', sa.DateTime(), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('address', 'user_id', name='uix_address_user_id')
    )
    
    # Create index on address for faster lookups
    op.create_index(op.f('ix_spam_address'), 'spam', ['address'], unique=False)
    
    # Insert default spam addresses
    op.execute("""
    INSERT INTO spam (address, creator, created_at, updated_at) VALUES
    ('9WzDXwBbmkg8ZTbNMqUxk32hKYtG2DVR7eD7FeQRqWPD', 'DEFAULT', NOW(), NOW()),
    ('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', 'DEFAULT', NOW(), NOW()),
    ('4NLFD2VR6Q3yPi3CdaQ1hYJEKWUyJ8xQUEUL6YQwwkHB', 'DEFAULT', NOW(), NOW()),
    ('7oPG1sX6ApoCH67XhRCTCDsByQNaiK3sRdsBRbArJAiW', 'ADMIN', NOW(), NOW()),
    ('6XU36wCxWobLx5Rtsb58kmgAJKVYmMVqy4SHXxENAyHy', 'ADMIN', NOW(), NOW())
    """)


def downgrade() -> None:
    # Drop the spam table
    op.drop_index(op.f('ix_spam_address'), table_name='spam')
    op.drop_table('spam')
    
    # We don't drop the creator enum type in case it's used elsewhere