import asyncio
import os
import json
import socket
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Union
import aiohttp
from solders.pubkey import Pubkey
from solana.rpc.async_api import AsyncClient
from spl.token._layouts import MINT_LAYOUT
from base64 import b64decode

from GrafolanaBack.domain.metadata.spl_token.models.classes import IPv4Resolver, MintDTO, MintMapper, OffchainMetadata, Mint, MintInfo
from GrafolanaBack.domain.metadata.spl_token.parsers.metaplex_metadata_parser import MetaplexMetadataParser
from GrafolanaBack.domain.logging.logging import logger

from dotenv import load_dotenv
# Constants
METAPLEX_PROGRAM_ID = Pubkey.from_string("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")

load_dotenv()
SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL")

class SolanaTokenFetcher:
    def __init__(self, ipv4_only: bool = True):
        """
        Initialize with Solana RPC URL
        
        Args:
            ipv4_only: Force IPv4 only for HTTP connections (default: True)
        """
        self.client = AsyncClient(SOLANA_RPC_URL)
        self.http_session = None
        self.ipv4_only = ipv4_only

    async def __aenter__(self):
        """Set up the HTTP session for async context manager"""
        if self.ipv4_only:
            # Create a custom TCP connector with our IPv4-only resolver
            resolver = IPv4Resolver()
            tcp_connector = aiohttp.TCPConnector(resolver=resolver, family=socket.AF_INET)
            self.http_session = aiohttp.ClientSession(connector=tcp_connector)
        else:
            self.http_session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Clean up resources in async context manager"""
        if self.http_session:
            await self.http_session.close()
        await self.client.close()

    @staticmethod
    def get_metadata_pda(mint_address: Pubkey) -> Pubkey:
        """Compute the PDA (Program Derived Address) for the token metadata."""
        seeds = [b"metadata", bytes(METAPLEX_PROGRAM_ID), bytes(mint_address)]
        metadata_pda, _ = Pubkey.find_program_address(seeds, METAPLEX_PROGRAM_ID)
        return metadata_pda

    async def get_multiple_accounts_data(self, pubkeys: List[Pubkey]) -> Dict[str, bytes]:
        """
        Fetch multiple accounts data and return as a dictionary mapping address to data
        
        Args:
            addresses: List of account addresses to fetch
            
        Returns:
            Dict mapping address string to account data bytes
        """
        if not pubkeys:
            return {}
            
        # Fetch multiple accounts in one RPC call
        response = await self.client.get_multiple_accounts(pubkeys, commitment=None, encoding="base64")
        
        if not response or not response.value:
            return {}
            
        result = {}
        for i, account_info in enumerate(response.value):
            if account_info is None:
                continue
                
            address_str = str(pubkeys[i])

            #Decode the base64 account data
            #if account_info.data:
                #data = b64decode(account_info.data)
            result[address_str] = account_info.data
                
        return result

    def parse_mint_account(self, data: bytes) -> MintInfo:
        """
        Parse mint account data
        
        Args:
            data: Raw bytes from the mint account
            
        Returns:
            MintInfo with parsed mint data
        """
        # Mint account layout:
        # - mint_authority: Option<Pubkey> (36 bytes: 1 byte option + 32 bytes pubkey if Some)
        # - supply: u64 (8 bytes)
        # - decimals: u8 (1 byte)
        # - is_initialized: bool (1 byte)
        # - freeze_authority: Option<Pubkey> (36 bytes: 1 byte option + 32 bytes pubkey if Some)
        
        if len(data) < 82:  # Minimum expected size
            raise ValueError("Mint data too short")
            
        mint_container  = MINT_LAYOUT.parse(data)
        
        return MintInfo(
            address=None,  # Will be filled in later
            decimals=mint_container.decimals,
            supply=mint_container.supply,
            is_initialized=mint_container.is_initialized,
            freeze_authority = str(Pubkey.from_bytes(mint_container.freeze_authority)),
            mint_authority= str(Pubkey.from_bytes(mint_container.mint_authority))
        )

    async def fetch_and_parse_offchain_metadata(self, uri: str) -> Optional[OffchainMetadata]:
        """
        Fetch and parse off-chain metadata from URI
        
        Args:
            uri: URI pointing to JSON metadata
            
        Returns:
            OffchainMetadata object or None if fetching fails
        """
        if not self.http_session:
            # Create an IPv4-only session if not already created
            if self.ipv4_only:
                resolver = IPv4Resolver()
                tcp_connector = aiohttp.TCPConnector(resolver=resolver, family=socket.AF_INET)
                self.http_session = aiohttp.ClientSession(connector=tcp_connector)
            else:
                self.http_session = aiohttp.ClientSession()
            
        try:
            # Handle ipfs:// URIs by converting to HTTP gateway URL
            if uri.startswith('ipfs://'):
                uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
                
            # Handle arweave URIs if needed
            if uri.startswith('ar://'):
                uri = uri.replace('ar://', 'https://arweave.net/')
                
            async with self.http_session.get(uri, timeout=10) as response:
                if response.status != 200:
                    logger.error(f"Failed to fetch metadata from {uri}: {response.status}")
                    return None
                    
                data = await response.json()
                
                return OffchainMetadata(
                    name=data.get('name', ''),
                    symbol=data.get('symbol', ''),
                    description=data.get('description', ''),
                    image=data.get('image'),
                    animation_url=data.get('animation_url'),
                    external_url=data.get('external_url'),
                    attributes=data.get('attributes', []),
                    properties=data.get('properties', {}),
                    logo=data.get('logo'),
                    links=data.get('links', {}),
                    extensions=data.get('extensions', {})
                )
                
        except (aiohttp.ClientError, asyncio.TimeoutError, json.JSONDecodeError) as e:
            logger.error(f"Error fetching off-chain metadata from {uri}: {str(e)}")
            return None

    async def fetch_multiple_tokens(self, mint_addresses: List[str]) -> List[Mint]:
        """
        Fetch complete token data for multiple mint addresses
        
        Args:
            mint_addresses: List of mint address strings
            
        Returns:
            List of TokenData objects with complete token information
        """
        if not mint_addresses:
            return []
            
        token_data_list = []

        fetch_offchain_tasks = []
        mint_pubkeys = [Pubkey.from_string(mint_pubkey) for mint_pubkey in mint_addresses]

        # Get metadata PDAs for all mints
        metadata_pdas = [self.get_metadata_pda(Pubkey.from_string(mint_pubkey)) for mint_pubkey in mint_addresses]
                
        # Fetch mint accounts first
        # Fetch in batch of 100 to avoid exceeding RPC limits
        mint_accounts = {}
        for i in range(0, len(mint_pubkeys), 100):
            batch_pubkeys = mint_pubkeys[i:i + 100]
            mint_accounts.update(await self.get_multiple_accounts_data(batch_pubkeys))  
        
        # Fetch metadata accounts in bulk
        # Fetch in batch of 100 to avoid exceeding RPC limits
        metadata_accounts = {}
        for i in range(0, len(metadata_pdas), 100):
            batch_pubkeys = metadata_pdas[i:i + 100]
            metadata_accounts.update(await self.get_multiple_accounts_data(batch_pubkeys))
        
        # Process each mint address
        for i, mint_addr in enumerate(mint_addresses):
            token_data = Mint(mint_address=mint_addr)
                 
            # Process mint account data if available
            if mint_addr in mint_accounts:
                try:
                    mint_info = self.parse_mint_account(mint_accounts[mint_addr])
                    mint_info.address = mint_addr
                    token_data.mint_info = mint_info
                except Exception as e:
                    logger.error(f"Error parsing mint data for {mint_addr}: {str(e)}")
            
            # Process metadata account if available
            metadata_pda = metadata_pdas[i]
            metadata_pda_str = str(metadata_pda)
            
            if metadata_pda_str in metadata_accounts:
                try:
                    metadata_bytes = metadata_accounts[metadata_pda_str]
                    on_chain_metadata = MetaplexMetadataParser.unpack_metadata_account(metadata_bytes)
                    token_data.on_chain_metadata = on_chain_metadata
                    
                    # Create task to fetch off-chain metadata if URI exists
                    uri = on_chain_metadata.data.uri
                    if uri:
                        task = self.fetch_and_parse_offchain_metadata(uri)
                        fetch_offchain_tasks.append((token_data, task))
                except Exception as e:
                    logger.error(f"Error parsing metadata for mint {mint_addr}: {str(e)}")
            
            token_data_list.append(token_data)
                
        # Fetch all off-chain metadata concurrently
        if fetch_offchain_tasks:
            await asyncio.gather(*(asyncio.create_task(self._process_offchain_task(token, task)) 
                                    for token, task in fetch_offchain_tasks))
        
        return token_data_list

    async def _process_offchain_task(self, token_data: Mint, task):
        """Helper to process off-chain metadata fetch tasks"""
        off_chain = await task
        if off_chain:
            token_data.off_chain_metadata = off_chain

# @cache.memoize(name="SolanaTokenFetcher.get_mints_info")
def get_mints_info(mint_addresses_tuple: tuple) -> List[Mint]:
    """
    Synchronous wrapper for fetching token metadata
    
    Args:
        mint_addresses: List of Solana mint addresses to fetch metadata for
        
    Returns:
        List[Mint]: List of Mint objects containing token metadata
    """
    mint_addresses = list(mint_addresses_tuple)
    async def _fetch_tokens():
        async with SolanaTokenFetcher(ipv4_only=True) as fetcher:
            return await fetcher.fetch_multiple_tokens(mint_addresses)
    
    return asyncio.run(_fetch_tokens())

def get_mints_info_dto(mint_addresses: List[str]) -> List[MintDTO]:
    """
    Fetch token metadata and convert to DTO format
    
    Args:
        mint_addresses: List of Solana mint addresses to fetch metadata for
        
    Returns:
        List[MintDTO]: List of MintDTO objects containing token metadata
    """
    # Convert addresses to tuple For caching memoize
    mint_addresses_key = tuple(sorted(mint_addresses))
    
    mint_data_list = get_mints_info(mint_addresses_key)
    
    return [MintMapper.to_dto(mint) for mint in mint_data_list]