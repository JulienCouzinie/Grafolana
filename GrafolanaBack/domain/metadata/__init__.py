"""
GrafolanaBack Metadata System

This package contains components for fetching, managing, and storing metadata
related to tokens, programs, and addresses on the Solana blockchain.

The metadata system is designed to be independent from the transaction analysis
core of the application, serving primarily to enrich the user interface with
human-readable information.

Main components:
- Token metadata (spl_token): Information about tokens (name, symbol, icon, etc.)
- Program metadata (program): Information about Solana programs
- Labeling system (labeling): User-defined labels for addresses
"""

from .metadata_service import MetadataService, metadata_service

__all__ = [
    'MetadataService',
    'metadata_service',
]