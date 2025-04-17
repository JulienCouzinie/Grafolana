"""
Unified interface for accessing metadata functionality.

This service layer provides a clean abstraction over the different
metadata subsystems (token, program, labeling) while ensuring they
remain independent from the core transaction analysis logic.
"""
from typing import List, Dict, Optional, Any

# Import token metadata components
from GrafolanaBack.domain.metadata.spl_token.mint_metadata_parser import get_mints_info_dto
from GrafolanaBack.domain.metadata.spl_token.classes import MintDTO

# Import program metadata components
from GrafolanaBack.domain.metadata.program.programs import get_program_metadatas

# Import labeling components
from GrafolanaBack.domain.metadata.labeling import (
    get_labels_for_addresses,
    create_or_update_user_label,
    delete_user_label,
    create_admin_label,
    create_default_label,
    Label,
    LabelPriority
)

class MetadataService:
    """
    Service class that provides a unified interface to all metadata functionality.
    
    This class centralizes access to token metadata, program metadata, and
    the labeling system, without mixing these concerns with transaction analysis.
    """
    
    @staticmethod
    def get_token_metadata(mint_addresses: List[str]) -> List[MintDTO]:
        """Get metadata for a list of token mint addresses."""
        return get_mints_info_dto(mint_addresses)
    
    @staticmethod
    def get_program_metadata(program_addresses: List[str]) -> List[Dict[str, Any]]:
        """Get metadata for a list of program addresses."""
        return get_program_metadatas(program_addresses)
    
    @staticmethod
    def get_labels(addresses: List[str], user_id: Optional[str] = None) -> Dict[str, Dict]:
        """Get labels for a list of addresses."""
        return get_labels_for_addresses(addresses, user_id)
    
    @staticmethod
    def create_or_update_user_label(
        address: str, 
        label: str, 
        user_id: str, 
        description: Optional[str] = None
    ) -> Dict:
        """Create or update a user-defined label."""
        return create_or_update_user_label(address, label, user_id, description)
    
    @staticmethod
    def create_admin_label(
        address: str, 
        label: str, 
        description: Optional[str] = None
    ) -> Dict:
        """Create an admin-level label."""
        return create_admin_label(address, label, description)
    
    @staticmethod
    def create_default_label(
        address: str, 
        label: str, 
        description: Optional[str] = None
    ) -> Dict:
        """Create a default (system-level) label."""
        return create_default_label(address, label, description)
    
    @staticmethod
    def delete_user_label(address: str, user_id: str) -> bool:
        """Delete a user-defined label."""
        return delete_user_label(address, user_id)

# Convenience singleton instance
metadata_service = MetadataService()