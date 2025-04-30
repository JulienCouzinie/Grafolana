from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_

from .model import Spam, Creator


class SpamRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_by_id(self, spam_id: int) -> Optional[Spam]:
        """Get spam entry by ID"""
        return self.session.query(Spam).filter(Spam.id == spam_id).first()

    def get_by_address(self, address: str) -> Optional[Spam]:
        """Get spam entry by address"""
        return self.session.query(Spam).filter(Spam.address == address).first()

    def get_all(self, limit: int = 100, offset: int = 0) -> List[Spam]:
        """Get all spam entries with pagination"""
        return self.session.query(Spam).limit(limit).offset(offset).all()

    def get_for_user(self, user_id: Optional[str] = None) -> List[Spam]:
        """
        Get spam entries based on user access:
        - If user_id is provided: Returns all ADMIN/DEFAULT spam plus the spam entries created by that user
        - If user_id is None: Returns only ADMIN/DEFAULT spam (all non-USER spam)
        
        Args:
            user_id: The user ID to get spam entries for, or None to get non-USER entries
            
        Returns:
            List of spam entries according to the access pattern
        """
        filters = [
            Spam.creator == Creator.ADMIN,
            Spam.creator == Creator.DEFAULT
        ]
        
        if user_id is not None:
            filters.append(Spam.user_id == user_id)
        
        return self.session.query(Spam).filter(or_(*filters)).all()

    def create(self, address: str, creator: Creator = Creator.DEFAULT, user_id: Optional[str] = None) -> Spam:
        """Create a new spam entry"""
        spam = Spam(address=address, creator=creator, user_id=user_id)
        self.session.add(spam)
        self.session.commit()
        return spam

    def update(self, spam_id: int, data: Dict[str, Any]) -> Optional[Spam]:
        """Update an existing spam entry"""
        spam = self.get_by_id(spam_id)
        if spam:
            for key, value in data.items():
                if hasattr(spam, key):
                    setattr(spam, key, value)
            self.session.commit()
        return spam

    def delete(self, spam_id: int) -> bool:
        """Delete a spam entry"""
        spam = self.get_by_id(spam_id)
        if spam:
            self.session.delete(spam)
            self.session.commit()
            return True
        return False

    def delete_by_address(self, address: str) -> bool:
        """Delete a spam entry by address"""
        spam = self.get_by_address(address)
        if spam:
            self.session.delete(spam)
            self.session.commit()
            return True
        return False

    def delete_by_id_and_user(self, spam_id: int, user_id: str) -> bool:
        """
        Delete a spam entry by ID and user ID
        Only deletes the entry if it belongs to the specified user
        
        Args:
            spam_id: The ID of the spam entry to delete
            user_id: The ID of the user trying to delete the entry
            
        Returns:
            True if deletion was successful, False otherwise
        """
        spam = self.get_by_id(spam_id)
        if spam and spam.user_id == user_id and spam.creator == Creator.USER:
            self.session.delete(spam)
            self.session.commit()
            return True
        return False