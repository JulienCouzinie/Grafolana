from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base
import os
from urllib.parse import quote_plus

Base = declarative_base()

# Get database connection parameters from environment variables or use defaults
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

# Create engine
engine = create_engine(get_database_url())

# Create session factory
Session = scoped_session(sessionmaker(bind=engine))

def get_session():
    """
    Returns a new database session
    """
    return Session()

def close_session(session):
    """
    Closes the session
    """
    session.close()
    
def init_db():
    """
    Initialize the database and create all tables
    """
    # Import models to ensure they're registered with Base metadata
    from ...metadata.labeling.models import Label, LabelPriority
    from ...transaction.models.transaction import SolanaTransaction
    from ...metadata.spl_token.models import MintModel
    from ...spam.model import SpamModel

    # Create all tables
    Base.metadata.create_all(engine)