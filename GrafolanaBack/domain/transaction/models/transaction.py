from sqlalchemy import Column, String, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from GrafolanaBack.domain.infrastructure.db.types import CompressedJSON

Base = declarative_base()

class SolanaTransaction(Base):
    __tablename__ = 'solana_transactions'

    # Solana transaction signatures are base58 encoded strings, typically 88 chars max
    # Adjust length if needed, but String() without length is often fine for PG TEXT
    transaction_signature = Column(String, primary_key=True)

    # Use the custom CompressedJSON type
    # Set nullable=False if the JSON is always required
    transaction_json = Column(CompressedJSON, nullable=False)

    def __repr__(self):
        return f"<SolanaTransaction(signature='{self.transaction_signature}')>"

# # Example Usage Setup (replace with your actual connection string)
# DATABASE_URL = "postgresql+psycopg2://user:password@host:port/database"
# # Or for async with psycopg3:
# # DATABASE_URL = "postgresql+psycopg://user:password@host:port/database"

# engine = create_engine(DATABASE_URL)
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# # Create tables if they don't exist (usually done via Alembic)
# # Base.metadata.create_all(bind=engine)