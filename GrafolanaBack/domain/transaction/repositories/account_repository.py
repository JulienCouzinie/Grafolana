import copy
from typing import Dict, List, Optional, Set
from GrafolanaBack.domain.transaction.models.account import Account, AccountType, AccountVersion, AccountVertex

class AccountRepository:
    """
    Repository for managing accounts and their versions during transaction analysis.
    
    This class is responsible for:
    1. Creating new accounts
    2. Tracking account versions
    3. Managing account balances and state changes
    """
    
    def __init__(self):
        self.accounts: Dict[str, Account] = {}
        self.account_versions: Dict[str, List[AccountVersion]] = {}
    
    def get_account(self, address: str) -> Optional[Account]:
        """Get an account by its address"""
        return self.accounts.get(address)
    
    def get_latest_version(self, address: str) -> Optional[AccountVersion]:
        """Get the latest version of an account"""
        versions = self.account_versions.get(address)
        if versions:
            return versions[-1]
        return None
    
    def get_version(self, address: str, version: int) -> Optional[AccountVersion]:
        """Get a specific version of an account"""
        versions = self.account_versions.get(address)
        if 0 <= version < len(versions):
            return versions[version]
        return None
    
    def get_version_by_vertex(self, vertex: AccountVertex) -> Optional[AccountVersion]:
        """Get an account version by its vertex representation"""
        return self.get_version(vertex.address, vertex.version)
    
    def create_account(self, 
                      transaction_signature: str,
                      address: str, 
                      mint_address: str, 
                      account_type: AccountType = AccountType.UNKNOWN, 
                      owner: Optional[str] = None, 
                      balance_token: int = 0, 
                      balance_lamport: int = 0) -> AccountVersion:
        """Create a new account and its initial version"""
        if address in self.accounts:
            # Account already exists, return None
            return None
        
        account = Account(
            address=address,
            mint_address=mint_address,
            type=account_type
        )
        
        self.accounts[address] = account
        
        initial_version = AccountVersion(
            version=0,
            account=account,
            transaction_signature=transaction_signature,
            owner=owner,
            balance_token=balance_token,
            balance_lamport=balance_lamport
        )
        
        self.account_versions[address] = [initial_version]
        return initial_version
    
    def new_account_version(self, address: str) -> Optional[AccountVersion]:
        """Create a new version of an existing account"""
        if (account_version := self.account_versions.get(address)[-1]):
            new_account_version = copy.deepcopy(account_version)
            new_account_version.version += 1
            # Make sure the new version has the same account object
            new_account_version.account = account_version.account
            self.account_versions.get(address).append(new_account_version)
            return new_account_version
        else:
            return None
    
    def update_owner_in_all_versions(self, address: str, owner: str) -> bool:
        """Update the owner in all versions of an account if not set"""
        versions = self.account_versions.get(address, [])
        if not versions:
            return False
        
        # If the owner of the first version is not set, update all versions
        if versions[0].owner is None:
            for version in versions:
                version.owner = owner
            return True
        
        # Otherwise, only update the latest version if it has a different owner
        if versions and versions[-1].owner != owner:
            versions[-1].owner = owner
            return True
            
        return False
        
    def add_authority(self, address: str, authority: str) -> bool:
        """Add an authority to an account"""
        if authority:
            account = self.get_account(address)
            if not account or authority in account.authorities:
                return False
            
            account.authorities.append(authority)
            return True
    
    def get_all_accounts(self) -> List[Account]:
        """Get all accounts in the repository"""
        return list(self.accounts.values())
    
    def get_all_vertices(self) -> List[AccountVertex]:
        """Get all account vertices in the repository"""
        vertices = []
        for address, versions in self.account_versions.items():
            for version in versions:
                vertices.append(version.get_vertex())
        return vertices

    def update_mint_address(self, address: str, mint_address: str) -> bool:
        """Update the mint address of an account."""
        account = self.get_account(address)
        if not account:
            return False
        
        account.mint_address = mint_address
        return True
    
    def get_all_addresses(self) -> List[str]:
        """Get all account addresses in the repository"""
        return list(self.accounts.keys())
    
    def get_pre_state_accounts(self) -> List[AccountVersion]:
        """Get all accounts in their initial state (version 0)"""
        pre_state = []
        for address, versions in self.account_versions.items():
            if versions:
                pre_state.append(versions[0])
        return pre_state

    def get_post_state_accounts(self) -> List[AccountVersion]:
        """Get all accounts in their final state (latest version)"""
        post_state = []
        for address, versions in self.account_versions.items():
            if versions:
                post_state.append(versions[-1])
        return post_state