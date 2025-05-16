"""Create spam addresses table

Revision ID: 005_initial_spam_addresses_table
Revises: 004_initial_sol_prices_table
Create Date: 2025-04-27
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '005_initial_spam_addresses_table'
down_revision = '004_initial_sol_prices_table'
branch_labels = None
depends_on = None


def upgrade() -> None:

    # Create spam table
    op.create_table('spam',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('address', sa.String(), nullable=False),
        sa.Column('creator', sa.Enum('DEFAULT', 'ADMIN', 'USER', name='creator'), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, default=datetime.utcnow),
        sa.Column('updated_at', sa.DateTime(), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('address', 'user_id', name='uix_spam_address_user_id')
    )
    
    # Create index on address for faster lookups
    op.create_index(op.f('ix_spam_address'), 'spam', ['address'], unique=False)
    
    # Insert default spam addresses
    op.execute("""
    INSERT INTO spam (address, creator, created_at, updated_at) VALUES
    ('2Tq5W7ydAHFuHbSJ1KTcKAsRaHBAQzoCFiVuNwtagns2', 'DEFAULT', NOW(), NOW()),
    ('H5ft7mjHYafZJCP9UPRu7yP66enrL9t8Hc9ohwyoC9bL', 'DEFAULT', NOW(), NOW()),
    ('Hddi6gcFVbpBSTfwbkT1QGf1neY4m7gwtoG7prZvjRHm', 'DEFAULT', NOW(), NOW()),
    ('SPL8B9sjruc9fA9jEuc8ffhx2ybNENwKUNJdwmdyoXn', 'DEFAULT', NOW(), NOW()),
    ('7pHgWCptaWUThDohtyAbbzejmjnUZZD5PMtvFLwjAdTW', 'DEFAULT', NOW(), NOW()),
    ('HLSHeeM2Q141C4PEYMeeKtWeP4uVQeYsk4fmVCMxhi2F', 'DEFAULT', NOW(), NOW()),
    ('55BRWmA3HV1JvG8U9Uq6R9goEJ6fFzR8txzeE8hr4Fe8', 'DEFAULT', NOW(), NOW()),
    ('66ez2DrxtKWN2yr5PLTACxKwWHawQDVHJPHevKw3wkZJ', 'DEFAULT', NOW(), NOW()),
    ('4wWTK5tkUr3WpKV9cZJ8NpJAo8uzQx6Z9VRCjawbDDjG', 'DEFAULT', NOW(), NOW()),
    ('fLiPgg2yTvmgfhiPkKriAHkDmmXGP6CdeFX9UF5o7Zc', 'DEFAULT', NOW(), NOW()),
    ('Habp5bncMSsBC3vkChyebepym5dcTNRYeg2LVG464E96', 'DEFAULT', NOW(), NOW()),
    ('5Hr7wZg7oBpVhH5nngRqzr5W7ZFUfCsfEhbziZJak7fr', 'DEFAULT', NOW(), NOW()),
    ('FLiPGqowc82LLR173hKiFYBq2fCxLZEST5iHbHwj8xKb', 'DEFAULT', NOW(), NOW()),
    ('FLiPgGTXtBtEJoytikaywvWgbz5a56DdHKZU72HSYMFF', 'DEFAULT', NOW(), NOW()),
    ('5ifyfzJLkpThxrjvCmzTPRfpvUtBBkXLNb4URD7vq7Nm', 'DEFAULT', NOW(), NOW()),
    ('pigVv65eXGHGXdcZHQCR8iDpqdAeccpEqgCifxuyGQt', 'DEFAULT', NOW(), NOW()),
    ('FLiPggWYQyKVTULFWMQjAk26JfK5XRCajfyTmD5weaZ7', 'DEFAULT', NOW(), NOW()),
    ('9KxQy6StbkJhubAbfvfriUK6LYYJ5cSkBoS3ZhcbdUx2', 'DEFAULT', NOW(), NOW()),
    ('HQxuR2L6ZzviXAbtxLPRo9QsmVSZYHVpDF5jcoshNUvh', 'DEFAULT', NOW(), NOW()),
    ('crnkhL22KkRwLWFH5V3Zq33MZ2kH6iJ4Uhy9HDShbU1', 'DEFAULT', NOW(), NOW()),
    ('447rKjHU4LZ2vU6DtXsK565YgBPeatRsP2fdeuKdRSFL', 'DEFAULT', NOW(), NOW()),
    ('6Y7RMcDVouLePL5svWzAbsBGaZs7jFCFEzSH6exxJVuH', 'DEFAULT', NOW(), NOW()),
    ('Trend2Lr6anjVwvKuLLkShFBdw7ZGHQ2RtX9apvytHQ', 'DEFAULT', NOW(), NOW()),
    ('5sBpdPsbMdBz7SQwwUtaph1AS5MeGQTtdHCdPLatdzmq', 'DEFAULT', NOW(), NOW()),
    ('hbf8CdtgRYN936MJD5EkyGu3TsQDLkaswkbMgrBieX3', 'DEFAULT', NOW(), NOW()),
    ('88skwq2sLZoJ5xD1ijosp9DCtE3ckJ6GnR9Y5RYsDHjm', 'DEFAULT', NOW(), NOW()),
    ('99NMXWTvLL9uSRYxDfsgiVi1qjo8w4ecGRVtWu5AM5Au', 'DEFAULT', NOW(), NOW()),
    ('77uaxo9UNB4JHd7G5JcGwcM61t3BaduTwC4ecWX5YMeo', 'DEFAULT', NOW(), NOW()),
    ('66ez2DrxtKWN2yr5PLTACxKwWHawQDVHJPHevKw3wkZJ', 'DEFAULT', NOW(), NOW()),
    ('BACgqeSiUs8WT6Xyr8rvNxE2qkJjnmmhQBmcfm1ZdKRd', 'DEFAULT', NOW(), NOW()),
    ('RecoWuBP1kCPABPVAABCR7f7FY513EVhQwoWcxntNT9', 'DEFAULT', NOW(), NOW()),
    """)


def downgrade() -> None:
    # Drop the spam table
    op.drop_index(op.f('ix_spam_address'), table_name='spam')
    op.drop_table('spam')
    
    # We don't drop the creator enum type in case it's used elsewhere