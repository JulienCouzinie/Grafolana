"""001_Initial labels table

Revision ID: 001_initial_labels_table
Create Date: 2025-03-29

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial_labels_table'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create labels table
    op.create_table('labels',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('address', sa.String(), nullable=False),
        sa.Column('label', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('priority', sa.Enum('DEFAULT', 'ADMIN', 'OWNER', 'USER', name='labelpriority'), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('address', 'user_id', name='uix_label_address_user_id')
    )
    op.create_index(op.f('ix_labels_address'), 'labels', ['address'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_labels_address'), table_name='labels')
    op.drop_table('labels')
    
    # Drop the enum type
    op.execute('DROP TYPE labelpriority')