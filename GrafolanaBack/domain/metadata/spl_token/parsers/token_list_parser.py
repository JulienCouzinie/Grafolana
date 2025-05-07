import json
import os
from typing import Dict, List, Optional, Any
import threading
from pathlib import Path

from GrafolanaBack.domain.metadata.spl_token.models.classes import MetadataData, MetaplexMetadata, OffchainMetadata, Mint, MintInfo, MintDTO, Creator
from GrafolanaBack.domain.logging.logging import logger


class TokenListParser:
    """
    Singleton class to parse the Solana token list JSON and provide token information
    """
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, token_list_path: Optional[str] = None):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(TokenListParser, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self, token_list_path: Optional[str] = None):
        # Initialize only once
        if self._initialized:
            return
            
        if token_list_path is None:
            # Default path is in the config directory
            config_dir = Path(__file__).parent.parent / "tokens"
            token_list_path = str(config_dir / "solana.tokenlist.json")
        
        self.token_list_path = token_list_path
        self.tokens_by_address: Dict[str, MintDTO] = {}
        self._load_token_list()
        self._initialized = True
        
    def _load_token_list(self) -> None:
        """Load and parse the token list JSON file into MintDTO objects"""
        if not os.path.exists(self.token_list_path):
            logger.warning(f"Token list file not found: {self.token_list_path}")
            return
            
        try:
            with open(self.token_list_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            # Parse each token in the list
            for token_data in data.get('tokens', []):
                # Skip empty or invalid entries
                if not token_data or not token_data.get('address'):
                    continue
                
                mint_dto = self._create_mint_dto_from_token_data(token_data)
                self.tokens_by_address[mint_dto.mint_address] = mint_dto
                
            logger.info(f"Loaded {len(self.tokens_by_address)} tokens from token list")
        except Exception as e:
            logger.error(f"Error loading token list: {str(e)}")
    
    def _create_mint_dto_from_token_data(self, token_data: Dict[str, Any]) -> MintDTO:
        """
        Create a MintDTO object from token data in the token list
        
        Args:
            token_data: Token data from the token list JSON
            
        Returns:
            MintDTO object populated with token data
        """
        address = token_data.get('address')
        name = token_data.get('name', '')
        symbol = token_data.get('symbol', '')
        decimals = token_data.get('decimals', 0)
        
        # Extract extensions and links
        extensions = token_data.get('extensions', {})
        links = {}
        
        # Map known social links from extensions
        for link_type in ['website', 'twitter', 'facebook', 'telegram', 'discord', 'medium', 'github', 'instagram', 'reddit']:
            if link_type in extensions:
                links[link_type] = extensions.get(link_type)
        
        # Create and return the complete MintDTO object
        return MintDTO(
            mint_address=address,
            is_nft=False,  # Assume not NFT from token list data
            name=name,
            symbol=symbol,
            decimals=decimals,
            supply=0,  # Not available in token list
            is_initialized=True,
            update_authority=None,  # Not available in token list
            primary_sale_happened=False,  # Default value
            is_mutable=False,  # Default value
            uri="",  # Not available in token list
            seller_fee_basis_points=0,  # Not available in token list
            description=extensions.get('description', ''),
            image=token_data.get('logoURI'),
            animation_url=None,  # Not available in token list
            external_url=extensions.get('website'),
            freeze_authority=None,  # Not available in token list
            mint_authority=None,  # Not available in token list
            links=links,
            creators=[],  # Not available in token list
            attributes=token_data.get('tags', []),
            properties={},  # Not available in token list
            extensions=extensions
        )
    
    def get_token_by_address(self, address: str) -> Optional[MintDTO]:
        """
        Get a token by its address
        
        Args:
            address: Token mint address
            
        Returns:
            MintDTO object if found, None otherwise
        """
        return self.tokens_by_address.get(address)
    
    def get_all_tokens(self) -> List[MintDTO]:
        """
        Get all tokens from the token list
        
        Returns:
            List of all MintDTO objects
        """
        return list(self.tokens_by_address.values())


# Create singleton instance
TOKEN_LIST = TokenListParser()