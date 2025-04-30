from typing import Optional
import os
import sys
import importlib.util
from urllib.parse import quote_plus
from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from sqlalchemy.exc import OperationalError
from GrafolanaBack.domain.infrastructure.db.session import engine

def get_database_url() -> str:
    """
    Builds the database URL from environment variables or uses default values for development.
    This should match the logic in migrations/env.py
    """
    db_user = os.environ.get('DB_USER', 'grafolana')
    db_password = os.environ.get('DB_PASSWORD', 'grafolana_dev')
    db_host = os.environ.get('DB_HOST', 'localhost')
    db_port = os.environ.get('DB_PORT', '5432')
    db_name = os.environ.get('DB_NAME', 'grafolana')
    
    # Safely quote the password to handle special characters
    quoted_password = quote_plus(db_password)
    
    return f"postgresql://{db_user}:{quoted_password}@{db_host}:{db_port}/{db_name}"

def get_alembic_config() -> Config:
    """Create Alembic configuration programmatically without relying on alembic.ini file."""
    # Get the directory where migrations are located
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    migrations_dir = os.path.join(base_dir, 'migrations')
    
    # Create Alembic config without a file
    config = Config()
    
    # Set required configuration options
    config.set_main_option('script_location', migrations_dir)
    config.set_main_option('sqlalchemy.url', get_database_url())
    
    # Add additional options that might be needed
    config.set_main_option('file_template', '%%(rev)s_%%(slug)s')
    config.set_main_option('timezone', 'UTC')
    
    return config

def check_and_run_migrations() -> None:
    """Check if database exists and run migrations if needed."""
    try:
        # Try to connect to the database
        inspector = inspect(engine)
        
        # Check if any tables exist
        tables_exist = len(inspector.get_table_names()) > 0
        
        # Get Alembic config
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