from alembic import context
import os
from dotenv import load_dotenv
from GrafolanaBack.utils.path_utils import find_backend_root
# Find the backend root directory and load .env file from there
backend_root = find_backend_root()
env_path = backend_root / '.env'
load_dotenv(dotenv_path=env_path)

import sys
from sqlalchemy import engine_from_config, pool
from logging.config import fileConfig
from urllib.parse import quote_plus

# Add the parent directory to sys.path so we can import our app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the SQLAlchemy Base object from our models
from GrafolanaBack.domain.metadata.labeling.models import Base

# Import the label models to ensure they're registered with Base metadata
from GrafolanaBack.domain.metadata.labeling.models import Label, LabelPriority

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Override the sqlalchemy.url in the alembic.ini file with environment variables
def get_database_url():
    """
    Builds the database URL from environment variables or uses default values for development
    """
    db_user = os.environ.get('DB_USER', 'grafolana')
    db_password = os.environ.get('DB_PASSWORD', 'grafolana_dev')
    db_host = os.environ.get('DB_HOST', 'localhost')
    db_port = os.environ.get('DB_PORT', '5432')
    db_name = os.environ.get('DB_NAME', 'grafolana')
    
    # Safely quote the password to handle special characters
    quoted_password = quote_plus(db_password)
    
    return f"postgresql://{db_user}:{quoted_password}@{db_host}:{db_port}/{db_name}"

config.set_main_option('sqlalchemy.url', get_database_url())

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

def run_migrations_offline():
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()