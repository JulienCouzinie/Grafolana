from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from sqlalchemy import select, or_

from GrafolanaBack.domain.infrastructure.db.session import get_session, close_session
from GrafolanaBack.domain.metadata.spl_token.models.models import MintModel
from GrafolanaBack.domain.metadata.spl_token.models.classes import MintDTO
from GrafolanaBack.domain.logging.logging import mint_logger

class MintRepository:
    """Repository for mint token metadata operations"""
    
    @staticmethod
    def create_or_update_mint(mint_dto: MintDTO) -> MintDTO:
        """
        Create or update a mint token metadata entry
        
        Args:
            mint_dto: The MintDTO object to save
            
        Returns:
            MintDTO: The saved MintDTO object
        """
        session = get_session()
        try:
            # Check if mint already exists
            existing_mint = session.query(MintModel).filter(
                MintModel.mint_address == mint_dto.mint_address
            ).first()
            
            if existing_mint:
                # Update the existing record
                mint_model = MintModel.from_dto(mint_dto)
                for key, value in mint_model.__dict__.items():
                    if key != '_sa_instance_state' and key != 'created_at' and key != 'mint_address':
                        setattr(existing_mint, key, value)
                session.commit()
                return existing_mint.to_dto()
            else:
                # Create new record
                mint_model = MintModel.from_dto(mint_dto)
                session.add(mint_model)
                session.commit()
                return mint_model.to_dto()
        except Exception as e:
            session.rollback()
            mint_logger.error(f"Error creating/updating mint {mint_dto.mint_address}: {str(e)}")
            raise
        finally:
            close_session(session)
    
    @staticmethod
    def create_or_update_mints(mint_dtos: List[MintDTO]) -> List[MintDTO]:
        """
        Batch create or update multiple mint token metadata entries
        
        Args:
            mint_dtos: List of MintDTO objects to save
            
        Returns:
            List[MintDTO]: The saved MintDTO objects
        """
        if not mint_dtos:
            return []
            
        session = get_session()
        try:
            result = []
            
            # Get all existing mints in one query for efficiency
            mint_addresses = [dto.mint_address for dto in mint_dtos]
            existing_mints = session.query(MintModel).filter(
                MintModel.mint_address.in_(mint_addresses)
            ).all()
            
            # Create a dict for quick lookup
            existing_mint_dict = {mint.mint_address: mint for mint in existing_mints}
            
            for dto in mint_dtos:
                if dto.mint_address in existing_mint_dict:
                    # Update existing mint
                    existing_mint = existing_mint_dict[dto.mint_address]
                    mint_model = MintModel.from_dto(dto)
                    for key, value in mint_model.__dict__.items():
                        if key != '_sa_instance_state' and key != 'created_at' and key != 'mint_address':
                            setattr(existing_mint, key, value)
                    result.append(existing_mint.to_dto())
                else:
                    # Create new mint
                    mint_model = MintModel.from_dto(dto)
                    session.add(mint_model)
                    result.append(dto)
            
            session.commit()
            return result
        except Exception as e:
            session.rollback()
            mint_logger.error(f"Error in batch creating/updating mints: {str(e)}")
            raise
        finally:
            close_session(session)
    
    @staticmethod
    def get_mint_by_address(mint_address: str) -> Optional[MintDTO]:
        """
        Get mint metadata by address
        
        Args:
            mint_address: The mint address to look up
            
        Returns:
            Optional[MintDTO]: The mint metadata if found, None otherwise
        """
        session = get_session()
        try:
            mint_model = session.query(MintModel).filter(
                MintModel.mint_address == mint_address
            ).first()
            
            if mint_model:
                return mint_model.to_dto()
            return None
        except Exception as e:
            mint_logger.error(f"Error getting mint {mint_address}: {str(e)}")
            return None
        finally:
            close_session(session)
    
    @staticmethod
    def get_mints_by_addresses(mint_addresses: List[str]) -> Dict[str, MintDTO]:
        """
        Get multiple mints by their addresses
        
        Args:
            mint_addresses: List of mint addresses to look up
            
        Returns:
            Dict[str, MintDTO]: Dictionary mapping mint addresses to their MintDTO objects
        """
        if not mint_addresses:
            return {}
            
        session = get_session()
        try:
            mint_models = session.query(MintModel).filter(
                MintModel.mint_address.in_(mint_addresses)
            ).all()
            
            # Create dictionary of address -> MintDTO
            result = {model.mint_address: model.to_dto() for model in mint_models}
            return result
        except Exception as e:
            mint_logger.error(f"Error fetching multiple mints: {str(e)}")
            return {}
        finally:
            close_session(session)
    
    @staticmethod
    def delete_mint(mint_address: str) -> bool:
        """
        Delete a mint metadata entry
        
        Args:
            mint_address: The mint address to delete
            
        Returns:
            bool: True if deleted successfully, False otherwise
        """
        session = get_session()
        try:
            mint = session.query(MintModel).filter(
                MintModel.mint_address == mint_address
            ).first()
            
            if mint:
                session.delete(mint)
                session.commit()
                return True
            return False
        except Exception as e:
            session.rollback()
            mint_logger.error(f"Error deleting mint {mint_address}: {str(e)}")
            return False
        finally:
            close_session(session)
    
    @staticmethod
    def search_mints(query_string: str, limit: int = 20) -> List[MintDTO]:
        """
        Search for mints by name, symbol, or description
        
        Args:
            query_string: The search query
            limit: Maximum number of results to return
            
        Returns:
            List[MintDTO]: List of matching mint metadata
        """
        session = get_session()
        try:
            # Create a search pattern with SQL LIKE
            pattern = f"%{query_string}%"
            
            mint_models = session.query(MintModel).filter(
                or_(
                    MintModel.name.ilike(pattern),
                    MintModel.symbol.ilike(pattern),
                    MintModel.description.ilike(pattern)
                )
            ).limit(limit).all()
            
            return [model.to_dto() for model in mint_models]
        except Exception as e:
            mint_logger.error(f"Error searching mints with query '{query_string}': {str(e)}")
            return []
        finally:
            close_session(session)