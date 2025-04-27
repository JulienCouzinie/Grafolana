from typing import List, Optional, Dict, Any
from GrafolanaBack.domain.infrastructure.db.session import get_session, close_session
from .repository import SpamRepository
from .model import Spam, Creator


class SpamService:
    def get_all_spam(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """
        Get all spam addresses with pagination
        
        Returns:
            List of spam addresses as dictionaries
        """
        session = get_session()
        try:
            repo = SpamRepository(session)
            spams = repo.get_all(limit=limit, offset=offset)
            return [spam.to_dict() for spam in spams]
        finally:
            close_session(session)

    def get_spam_for_user(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all ADMIN/DEFAULT spam plus the spam entries created by the specified user
        
        Args:
            user_id: The user ID to get spam entries for
            
        Returns:
            List of spam entries as dictionaries
        """
        session = get_session()
        try:
            repo = SpamRepository(session)
            spams = repo.get_for_user(user_id)
            return [spam.to_dict() for spam in spams]
        finally:
            close_session(session)

    def create_spam(self, address: str, creator: Creator = Creator.DEFAULT, 
                    user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new spam entry
        
        Args:
            address: The Solana address to mark as spam
            creator: The creator type (DEFAULT, ADMIN, OWNER, USER)
            user_id: The ID of the user creating this spam entry (required for USER entries)
            
        Returns:
            The created spam entry as a dictionary
        """
        session = get_session()
        try:
            repo = SpamRepository(session)
            spam = repo.create(address=address, creator=creator, user_id=user_id)
            return spam.to_dict()
        finally:
            close_session(session)

    def delete_user_spam(self, spam_id: int, user_id: str) -> bool:
        """
        Delete a spam entry by ID and user ID
        Only deletes the entry if it belongs to the specified user
        
        Args:
            spam_id: The ID of the spam entry to delete
            user_id: The ID of the user trying to delete the entry
            
        Returns:
            True if deletion was successful, False otherwise
        """
        session = get_session()
        try:
            repo = SpamRepository(session)
            return repo.delete_by_id_and_user(spam_id, user_id)
        finally:
            close_session(session)