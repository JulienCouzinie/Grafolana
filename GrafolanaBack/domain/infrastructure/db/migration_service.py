from typing import Optional
import os
from alembic.config import Config
from alembic import command
from sqlalchemy import inspect
from sqlalchemy.exc import OperationalError
from GrafolanaBack.domain.infrastructure.db.session import engine

def get_alembic_config() -> Config:
    """Get Alembic configuration."""
    # Get the directory where alembic.ini is located
    alembic_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'migrations')
    
    # Create Alembic config
    config = Config(os.path.join(alembic_dir, 'alembic.ini'))
    config.set_main_option('script_location', alembic_dir)
    return config

def check_and_run_migrations() -> None:
    """Check if database exists and run migrations if needed."""
    try:
        # Try to connect to the database
        inspector = inspect(engine)
        
        # Check if any tables exist
        tables_exist = len(inspector.get_table_names()) > 0
        
        # If no tables, or we want to ensure migrations are up to date
        config = get_alembic_config()
        
        # Run migrations
        print("Running database migrations...")
        command.upgrade(config, 'head')
        print("Database migrations completed successfully.")
        
    except OperationalError as e:
        print(f"Database connection error: {e}")
        print("Running migrations to create database...")
        # Try running migrations anyway - this might create the database
        config = get_alembic_config()
        command.upgrade(config, 'head')
        print("Database migrations completed successfully.")
    except Exception as e:
        print(f"Error during migration check: {e}")
        raise