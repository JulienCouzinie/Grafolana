from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
import enum
from datetime import datetime

Base = declarative_base()

class Creator(enum.Enum):
    DEFAULT = 0  # Parser-defined labels (lowest priority)
    ADMIN = 1    # Admin defined labels
    OWNER = 2    # Program/account owner defined labels
    USER = 3     # User private labels (highest priority)

class Spam(Base):
    __tablename__ = 'spam'

    id = Column(Integer, primary_key=True, autoincrement=True)
    address = Column(String, nullable=False, unique=True)
    creator = Column(Enum(Creator), nullable=False, default=Creator.DEFAULT)
    user_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Ensure we don't have duplicate spam for the same address and user
    __table_args__ = (
        UniqueConstraint('address', 'user_id', name='uix_address_user_id'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'address': self.address,
            'creator': self.creator,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }