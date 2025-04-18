from dataclasses import dataclass, field
import socket
from typing import Any, Dict, List, Optional

import aiohttp


@dataclass
class Creator:
    address: str
    verified: bool
    share: int

@dataclass
class MetadataData:
    name: str
    symbol: str
    uri: str
    seller_fee_basis_points: int
    creators: Optional[List[Creator]] = field(default_factory=list)

@dataclass
class MetaplexMetadata:
    update_authority: str
    mint: str
    data: MetadataData
    primary_sale_happened: bool
    is_mutable: bool


# Create a custom resolver that only returns IPv4 addresses
class IPv4Resolver(aiohttp.resolver.DefaultResolver):
    async def resolve(self, host, port=0, family=socket.AF_INET):
        # Force IPv4 by setting family to socket.AF_INET
        return await super().resolve(host, port, family=socket.AF_INET)

@dataclass
class MintInfo:
    """Information about a token mint account"""
    address: str
    decimals: int
    supply: int
    is_initialized: bool
    freeze_authority: Optional[str] = None
    mint_authority: Optional[str] = None

@dataclass
class OffchainMetadata:
    """Represents the off-chain metadata from the URI"""
    name: str
    symbol: str
    description: str
    image: Optional[str] = None
    animation_url: Optional[str] = None
    external_url: Optional[str] = None
    attributes: List[Dict] = field(default_factory=list)
    properties: Dict = field(default_factory=dict)
    
    # Additional fields found in token metadata
    logo: Optional[str] = None
    links: Dict[str, str] = field(default_factory=dict)
    extensions: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Mint:
    """Complete token data combining mint info, on-chain and off-chain metadata"""
    mint_address: str
    mint_info: Optional[MintInfo] = None
    on_chain_metadata: Optional[MetaplexMetadata] = None
    off_chain_metadata: Optional[OffchainMetadata] = None
    
    @property
    def is_nft(self) -> bool:
        """Determine if this token is likely an NFT based on supply and decimals"""
        if not self.mint_info:
            return False
        # NFTs typically have supply of 1 and 0 decimals
        return self.mint_info.supply == 1 and self.mint_info.decimals == 0
    

@dataclass
class MintDTO:
    mint_address: str
    is_nft: bool
    name: str # Map in priority from MetadataData.name or OffchainMetadata.name
    symbol: str # Map in priority from MetadataData.symbol or OffchainMetadata.symbol
    decimals: int
    supply: int
    is_initialized: bool
    update_authority: str
    primary_sale_happened: bool
    is_mutable: bool
    uri: str
    seller_fee_basis_points: int
    
    description: str
    image: Optional[str] = None # Map in priority from MetadataData.image or OffchainMetadata.logo 
    animation_url: Optional[str] = None
    external_url: Optional[str] = None

    freeze_authority: Optional[str] = None
    mint_authority: Optional[str] = None

    links: Dict[str, str] = field(default_factory=dict)
    creators: Optional[List[Creator]] = field(default_factory=list)
    attributes: List[Dict] = field(default_factory=list)
    properties: Dict = field(default_factory=dict)
    extensions: Dict[str, Any] = field(default_factory=dict)

@dataclass
class MintMapper:
    @staticmethod
    def to_dto(mint: Mint) -> MintDTO:
        """
        Maps a Mint object to a MintDTO object
        
        Args:
            mint: Source Mint object
            
        Returns:
            MintDTO: Mapped data transfer object
        """
        name = ""
        symbol = ""
        update_authority = None
        primary_sale_happened = False
        is_mutable = False
        uri = ""
        seller_fee_basis_points = 0
        description = ""
        image = None
        creators = []

        # Get data from on-chain metadata if available
        if mint.on_chain_metadata:
            name = mint.on_chain_metadata.data.name
            symbol = mint.on_chain_metadata.data.symbol
            uri = mint.on_chain_metadata.data.uri
            update_authority = mint.on_chain_metadata.update_authority
            primary_sale_happened = mint.on_chain_metadata.primary_sale_happened
            is_mutable = mint.on_chain_metadata.is_mutable
            seller_fee_basis_points = mint.on_chain_metadata.data.seller_fee_basis_points
            creators = mint.on_chain_metadata.data.creators if mint.on_chain_metadata.data.creators else []

        # Get or override data from off-chain metadata if available
        if mint.off_chain_metadata:
            # Only override name/symbol from on-chain if not already set
            if not name:
                name = mint.off_chain_metadata.name
            if not symbol:
                symbol = mint.off_chain_metadata.symbol
            description = mint.off_chain_metadata.description
            # Prioritize off-chain metadata image if available, fallback to logo
            image = mint.off_chain_metadata.image or mint.off_chain_metadata.logo
            animation_url = mint.off_chain_metadata.animation_url
            external_url = mint.off_chain_metadata.external_url
            links = mint.off_chain_metadata.links
            attributes = mint.off_chain_metadata.attributes
            properties = mint.off_chain_metadata.properties
            extensions = mint.off_chain_metadata.extensions
        else:
            animation_url = None
            external_url = None
            links = {}
            attributes = []
            properties = {}
            extensions = {}

        # Get data from mint info
        decimals = 0
        supply = 0
        is_initialized = False
        freeze_authority = None
        mint_authority = None
        
        if mint.mint_info:
            decimals = mint.mint_info.decimals
            supply = mint.mint_info.supply
            is_initialized = mint.mint_info.is_initialized
            freeze_authority = mint.mint_info.freeze_authority
            mint_authority = mint.mint_info.mint_authority

        return MintDTO(
            mint_address=mint.mint_address,
            is_nft=mint.is_nft,
            name=name,
            symbol=symbol,
            decimals=decimals,
            supply=supply,
            is_initialized=is_initialized,
            update_authority=update_authority,
            primary_sale_happened=primary_sale_happened,
            is_mutable=is_mutable,
            uri=uri,
            seller_fee_basis_points=seller_fee_basis_points,
            description=description,
            image=image,
            animation_url=animation_url,
            external_url=external_url,
            freeze_authority=freeze_authority,
            mint_authority=mint_authority,
            links=links,
            creators=creators,
            attributes=attributes,
            properties=properties,
            extensions=extensions
        )


