from sqlalchemy import Column, Integer, String, Boolean, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from typing import List, Dict, Any, Optional

from GrafolanaBack.domain.infrastructure.db.session import Base
from GrafolanaBack.domain.metadata.spl_token.models.classes import MintDTO, Creator

class MintModel(Base):
    """SQLAlchemy model for storing MintDTO data in the database"""
    __tablename__ = 'mints'

    mint_address = Column(String, primary_key=True)
    is_nft = Column(Boolean, nullable=False, default=False)
    name = Column(String, nullable=False)
    symbol = Column(String, nullable=False)
    decimals = Column(Integer, nullable=False, default=0)
    supply = Column(Integer, nullable=False, default=0)
    is_initialized = Column(Boolean, nullable=False, default=False)
    update_authority = Column(String, nullable=True)
    primary_sale_happened = Column(Boolean, nullable=False, default=False)
    is_mutable = Column(Boolean, nullable=False, default=False)
    uri = Column(String, nullable=True)
    seller_fee_basis_points = Column(Integer, nullable=False, default=0)
    description = Column(String, nullable=True)
    image = Column(String, nullable=True)
    animation_url = Column(String, nullable=True)
    external_url = Column(String, nullable=True)
    freeze_authority = Column(String, nullable=True)
    mint_authority = Column(String, nullable=True)
    
    # Store structured data as JSON
    links = Column(JSON, nullable=True)
    creators = Column(JSON, nullable=True)
    attributes = Column(JSON, nullable=True)
    properties = Column(JSON, nullable=True)
    extensions = Column(JSON, nullable=True)
    
    # Add timestamps
    created_at = Column(Float, nullable=False, default=lambda: datetime.utcnow().timestamp())
    updated_at = Column(Float, nullable=False, default=lambda: datetime.utcnow().timestamp(), 
                        onupdate=lambda: datetime.utcnow().timestamp())

    def to_dto(self) -> MintDTO:
        """Convert database model to MintDTO"""
        # Convert creators JSON to Creator objects if present
        creators_list = []
        if self.creators:
            for creator_data in self.creators:
                creators_list.append(Creator(
                    address=creator_data.get('address', ''),
                    verified=creator_data.get('verified', False),
                    share=creator_data.get('share', 0)
                ))
        
        return MintDTO(
            mint_address=self.mint_address,
            is_nft=self.is_nft,
            name=self.name,
            symbol=self.symbol,
            decimals=self.decimals,
            supply=self.supply,
            is_initialized=self.is_initialized,
            update_authority=self.update_authority,
            primary_sale_happened=self.primary_sale_happened,
            is_mutable=self.is_mutable,
            uri=self.uri,
            seller_fee_basis_points=self.seller_fee_basis_points,
            description=self.description,
            image=self.image,
            animation_url=self.animation_url,
            external_url=self.external_url,
            freeze_authority=self.freeze_authority,
            mint_authority=self.mint_authority,
            links=self.links if self.links else {},
            creators=creators_list,
            attributes=self.attributes if self.attributes else [],
            properties=self.properties if self.properties else {},
            extensions=self.extensions if self.extensions else {}
        )
    
    @classmethod
    def from_dto(cls, dto: MintDTO) -> 'MintModel':
        """Create a MintModel from a MintDTO"""
        # Convert Creator objects to dictionaries for JSON storage
        creators_list = []
        if dto.creators:
            for creator in dto.creators:
                creators_list.append({
                    'address': creator.address,
                    'verified': creator.verified,
                    'share': creator.share
                })
        
        return cls(
            mint_address=dto.mint_address,
            is_nft=dto.is_nft,
            name=dto.name,
            symbol=dto.symbol,
            decimals=dto.decimals,
            supply=dto.supply,
            is_initialized=dto.is_initialized,
            update_authority=dto.update_authority,
            primary_sale_happened=dto.primary_sale_happened,
            is_mutable=dto.is_mutable,
            uri=dto.uri,
            seller_fee_basis_points=dto.seller_fee_basis_points,
            description=dto.description,
            image=dto.image,
            animation_url=dto.animation_url,
            external_url=dto.external_url,
            freeze_authority=dto.freeze_authority,
            mint_authority=dto.mint_authority,
            links=dto.links,
            creators=creators_list,
            attributes=dto.attributes,
            properties=dto.properties,
            extensions=dto.extensions
        )