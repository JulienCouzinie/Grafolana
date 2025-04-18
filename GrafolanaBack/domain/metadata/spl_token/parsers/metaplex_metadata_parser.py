import base58
import struct

from GrafolanaBack.domain.metadata.spl_token.models.classes import Creator, MetadataData, MetaplexMetadata



class MetaplexMetadataParser:
    @staticmethod
    def unpack_metadata_account(data: bytes) -> MetaplexMetadata:
        """
        Parse Solana metadata account data using struct format strings.
        
        Args:
            data: Raw bytes from the metadata account
            
        Returns:
            SolanaMetadata: Structured metadata object
        """
        if data[0] != 4:
            raise ValueError("Invalid metadata version")
            
        # Starting after the version byte
        offset = 1
        
        # Extract fixed-size data with format string
        # 32 bytes for update_authority + 32 bytes for mint
        update_authority_raw, mint_raw = struct.unpack_from("<32s32s", data, offset)
        offset += 64
        
        # Extract variable length strings (name, symbol, uri)
        name, offset = MetaplexMetadataParser._unpack_string(data, offset)
        symbol, offset = MetaplexMetadataParser._unpack_string(data, offset)
        uri, offset = MetaplexMetadataParser._unpack_string(data, offset)
        
        # Extract seller fee
        fee = struct.unpack_from("<H", data, offset)[0]
        offset += 2
        
        # Check for creators
        has_creator = bool(data[offset])
        offset += 1
        
        creators = []
        if has_creator:
            creator_count = struct.unpack_from("<I", data, offset)[0]
            offset += 4
            
            for _ in range(creator_count):
                creator_raw = struct.unpack_from("<32s", data, offset)[0]
                creator_address = base58.b58encode(creator_raw).decode('utf-8')
                offset += 32
                
                verified = bool(data[offset])
                offset += 1
                
                share = data[offset]
                offset += 1
                
                creators.append(Creator(
                    address=creator_address,
                    verified=verified,
                    share=share
                ))
        
        # Get final boolean flags
        primary_sale_happened = bool(data[offset])
        offset += 1
        is_mutable = bool(data[offset])
        
        return MetaplexMetadata(
            update_authority=base58.b58encode(update_authority_raw).decode('utf-8'),
            mint=base58.b58encode(mint_raw).decode('utf-8'),
            data=MetadataData(
                name=name,
                symbol=symbol,
                uri=uri,
                seller_fee_basis_points=fee,
                creators=creators
            ),
            primary_sale_happened=primary_sale_happened,
            is_mutable=is_mutable
        )
    
    @staticmethod
    def _unpack_string(data: bytes, offset: int) -> tuple[str, int]:
        """
        Unpack a length-prefixed string from binary data.
        
        Args:
            data: The binary data
            offset: Current position in the data
            
        Returns:
            tuple: (string value, new offset)
        """
        length = struct.unpack_from("<I", data, offset)[0]
        offset += 4
        
        string_bytes = struct.unpack_from(f"<{length}s", data, offset)[0]
        offset += length
        
        # Decode and strip null bytes
        string_value = string_bytes.decode("utf-8").strip("\x00")
        return string_value, offset