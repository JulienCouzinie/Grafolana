from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, NamedTuple, Optional, Set, Tuple
from enum import Enum, auto
from solders.pubkey import Pubkey

from GrafolanaBack.domain.transaction.config.constants import SOL


class AccountType(str, Enum):
    """Enum representing all possible account types in the system"""
    BURN_ACCOUNT  = "BURN_ACCOUNT"
    MINTTO_ACCOUNT = "MINTTO_ACCOUNT"
    TOKEN_MINT_ACCOUNT = "TOKEN_MINT_ACCOUNT"
    STAKE_ACCOUNT = "STAKE_ACCOUNT"
    TOKEN_ACCOUNT = "TOKEN_ACCOUNT" 
    WALLET_ACCOUNT = "WALLET_ACCOUNT"
    FEE_ACCOUNT = "FEE_ACCOUNT"
    PROGRAM_ACCOUNT = "PROGRAM_ACCOUNT"
    UNKNOWN = "UNKNOWN"

@dataclass
class Account:
    """
    Represents an account on the Solana blockchain.
    
    Accounts can hold tokens (SPL tokens) or SOL, and may represent 
    various entities like wallets, token accounts, pools, etc.
    """
    address: str
    type: AccountType = AccountType.UNKNOWN
    mint_address: str = None
    is_pool: bool = False
    authorities: List[str] = field(default_factory=list)
    metadata: Optional[Dict] = field(default_factory=dict)
    
    @property
    def is_token_account(self) -> bool:
        """Check if this is a token account"""
        return self.type == AccountType.TOKEN_ACCOUNT
    
    @property
    def is_wallet_account(self) -> bool:
        """Check if this is a native Wallet account"""
        return self.type == AccountType.WALLET_ACCOUNT and self.mint_address == SOL
    
    @property
    def is_system_account(self) -> bool:
        """Check if this is a special system account (burn, mint, fee)"""
        return self.type in (AccountType.BURN_ACCOUNT, AccountType.MINTTO_ACCOUNT, AccountType.FEE_ACCOUNT)

@dataclass
class AccountVersion:
    """
    Represents a specific version of an account at a point in time.
    
    The Solana blockchain doesn't have the concept of versions, but for transaction
    analysis, we need to track how account states change during a transaction.
    """
    version: int
    account: Account
    transaction_signature: str
    owner: Optional[str]
    balance_token: int
    balance_lamport: int
    
    @property
    def address(self) -> str:
        """Get the account address"""
        return self.account.address
    
    @property
    def mint_address(self) -> str:
        """Get the account's mint address"""
        return self.account.mint_address
    
    @property
    def type(self) -> AccountType:
        """Get the account type"""
        return self.account.type
    
    def get_vertex(self) -> AccountVertex:
        """Get a graph vertex representation of this account version"""
        return AccountVertex(self.account.address, self.version, self.transaction_signature)
        
    def apply_token_debit(self, amount: int) -> None:
        """Deduct tokens from this account version"""
        self.balance_token -= amount
    
    def apply_token_credit(self, amount: int) -> None:
        """Add tokens to this account version"""
        self.balance_token += amount
    
    def apply_lamport_debit(self, amount: int) -> None:
        """Deduct lamports from this account version"""
        self.balance_lamport -= amount
    
    def apply_lamport_credit(self, amount: int) -> None:
        """Add lamports to this account version"""
        self.balance_lamport += amount

class AccountVertex(NamedTuple):
    """Immutable key for graph nodes"""
    address: str
    version: int
    transaction_signature: str

    def to_dict(self) -> Dict[str, str]:
        """Convert the vertex to a dictionary representation"""
        return {
            "address": self.address,
            "version": str(self.version),
            "transaction_signature": self.transaction_signature
        }
    

class AccountTransaction(NamedTuple):
    address: str; 
    mint_address: str; 
    type: AccountType; 

    def to_dict(self) -> Dict[str, str]:
        """Convert the vertex to a dictionary representation"""
        isOnCurve = False
        if (self.type not in [AccountType.BURN_ACCOUNT, AccountType.FEE_ACCOUNT, AccountType.MINTTO_ACCOUNT, AccountType.UNKNOWN]):
            isOnCurve = Pubkey.from_string(self.address).is_on_curve()
        return {
            "address": self.address,
            "mint_address": self.mint_address,
            "type": self.type,
            "isOnCurve": isOnCurve,
        }