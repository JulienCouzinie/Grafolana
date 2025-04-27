from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import enum
from datetime import datetime

Base = declarative_base()

class LabelPriority(enum.Enum):
    DEFAULT = 0  # Parser-defined labels (lowest priority)
    ADMIN = 1    # Admin defined labels
    OWNER = 2    # Program/account owner defined labels
    USER = 3     # User private labels (highest priority)

class Label(Base):
    __tablename__ = 'labels'

    id = Column(Integer, primary_key=True)
    address = Column(String, nullable=False, index=True)
    label = Column(String, nullable=False)
    description = Column(String, nullable=True)
    priority = Column(Enum(LabelPriority), nullable=False, default=LabelPriority.DEFAULT)
    user_id = Column(String, nullable=True)  # Only needed for user-private labels
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Ensure we don't have duplicate labels for the same address and user
    __table_args__ = (
        UniqueConstraint('address', 'user_id', name='uix_label_address_user_id'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'address': self.address,
            'label': self.label,
            'description': self.description,
            'priority': self.priority.name,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }