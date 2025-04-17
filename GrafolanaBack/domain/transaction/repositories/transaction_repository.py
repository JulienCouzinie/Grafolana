from typing import Dict, List, Optional, Any
from ..models.transaction import SolanaTransaction
from GrafolanaBack.domain.infrastructure.db.session import get_session, close_session

class TransactionRepository:
    """
    Repository for managing Solana transactions storage and retrieval.
    
    This class is responsible for:
    1. Creating new transaction records
    2. Retrieving transactions by signature
    3. Batch retrieval of transactions
    """
    
    @staticmethod
    def save_transaction(transaction_signature: str, transaction_json: Dict[str, Any]) -> bool:
        """
        Save a Solana transaction to the database.
        
        Args:
            transaction_signature: The unique signature of the transaction
            transaction_json: The full transaction data as JSON
            
        Returns:
            bool: True if saved successfully, False otherwise
        """
        session = get_session()
        try:
            # Check if transaction already exists
            existing_transaction = session.query(SolanaTransaction).get(transaction_signature)
            if existing_transaction:
                # Update existing transaction
                existing_transaction.transaction_json = transaction_json
            else:
                # Create new transaction record
                transaction = SolanaTransaction(
                    transaction_signature=transaction_signature,
                    transaction_json=transaction_json
                )
                session.add(transaction)
                
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            print(f"Error saving transaction {transaction_signature}: {e}")
            return False
        finally:
            close_session(session)
    
    @staticmethod
    def get_transaction(transaction_signature: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a transaction by its signature.
        
        Args:
            transaction_signature: The unique signature of the transaction
            
        Returns:
            Optional[Dict[str, Any]]: The transaction data as JSON or None if not found
        """
        session = get_session()
        try:
            transaction = session.query(SolanaTransaction).get(transaction_signature)
            if transaction:
                return transaction.transaction_json
            return None
        except Exception as e:
            print(f"Error retrieving transaction {transaction_signature}: {e}")
            return None
        finally:
            close_session(session)
    
    @staticmethod
    def get_transactions_by_signatures(transaction_signatures: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Retrieve multiple transactions by their signatures.
        
        Args:
            transaction_signatures: List of transaction signatures
            
        Returns:
            Dict[str, Dict[str, Any]]: Dictionary mapping transaction signatures to their data
        """
        if not transaction_signatures:
            return {}
            
        result = {}
        session = get_session()
        try:
            transactions = session.query(SolanaTransaction).filter(
                SolanaTransaction.transaction_signature.in_(transaction_signatures)
            ).all()
            
            for tx in transactions:
                result[tx.transaction_signature] = tx.transaction_json
                
            return result
        except Exception as e:
            print(f"Error retrieving transactions: {e}")
            return result
        finally:
            close_session(session)
    
    @staticmethod
    def delete_transaction(transaction_signature: str) -> bool:
        """
        Delete a transaction from the database.
        
        Args:
            transaction_signature: The unique signature of the transaction
            
        Returns:
            bool: True if deleted successfully, False otherwise
        """
        session = get_session()
        try:
            transaction = session.query(SolanaTransaction).get(transaction_signature)
            if transaction:
                session.delete(transaction)
                session.commit()
                return True
            return False
        except Exception as e:
            session.rollback()
            print(f"Error deleting transaction {transaction_signature}: {e}")
            return False
        finally:
            close_session(session)
    
    @staticmethod
    def count_transactions() -> int:
        """
        Count the total number of transactions in the database.
        
        Returns:
            int: The number of transactions
        """
        session = get_session()
        try:
            return session.query(SolanaTransaction).count()
        except Exception as e:
            print(f"Error counting transactions: {e}")
            return 0
        finally:
            close_session(session)