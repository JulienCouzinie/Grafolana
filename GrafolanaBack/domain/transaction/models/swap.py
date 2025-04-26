from dataclasses import dataclass, field
from typing import Dict, List, NamedTuple, Optional, Set, Tuple, Any, Union

from GrafolanaBack.domain.transaction.models.account import AccountVertex

class TransferAccountAddresses(NamedTuple):
    source: str
    destination: str

@dataclass
class Swap:
    """
    Model representing a token swap operation in a transaction.
    
    A swap involves exchanging one token for another through a liquidity pool or router.
    """
    id: int
    router: bool
    program_address: str
    program_name: str
    instruction_name: str
    user_addresses: TransferAccountAddresses
    pool_addresses: Union[TransferAccountAddresses, Tuple[str, ...], None]
    parent_router_swap_id: Optional[int] = None
    program_account_vertex: Optional[AccountVertex] = None
    fee: int = 0
        
    def is_child_swap(self) -> bool:
        """Check if this is a child swap (part of a router swap)."""
        return self.parent_router_swap_id is not None
    
    def get_pool_addresses_list(self) -> List[str]:
        """Get a list of all pool addresses involved in this swap."""
        if self.pool_addresses is None:
            return []
            
        if isinstance(self.pool_addresses, TransferAccountAddresses):
            return [self.pool_addresses.source, self.pool_addresses.destination]
        else:
            return list(self.pool_addresses)
    
    def get_user_source(self) -> str:
        """Get the user's source account address."""
        return self.user_addresses.source
    
    def get_user_destination(self) -> str:
        """Get the user's destination account address."""
        return self.user_addresses.destination
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the swap to a dictionary representation."""
        result = {
            "id": self.id,
            "router": self.router,
            "program_address": self.program_address,
            "program_name": self.program_name,
            "instruction_name": self.instruction_name,
            "fee": self.fee
        }
        
        # Handle user addresses
        if self.user_addresses:
            result["user_addresses"] = {
                "source": self.user_addresses.source,
                "destination": self.user_addresses.destination
            }
        
        # Handle pool addresses based on their type
        if self.pool_addresses:
            if isinstance(self.pool_addresses, TransferAccountAddresses):
                result["pool_addresses"] = {
                    "source": self.pool_addresses.source,
                    "destination": self.pool_addresses.destination
                }
            else:
                result["pool_addresses"] = list(self.pool_addresses)
        
        if self.parent_router_swap_id is not None:
            result["parent_router_swap_id"] = self.parent_router_swap_id
        
        return result