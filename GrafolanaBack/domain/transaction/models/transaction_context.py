from typing import Dict, List, Optional, Set, Any, Tuple

from GrafolanaBack.domain.transaction.models.graph import TransactionGraph
from GrafolanaBack.domain.transaction.models.swap import Swap, TransferAccountAddresses
from GrafolanaBack.domain.transaction.repositories.account_repository import AccountRepository
from GrafolanaBack.domain.logging.logging import logger
from GrafolanaBack.domain.transaction.utils.instruction_utils import Parsed_Instruction

class TransactionContext:
    """
    Context object that holds the state of a transaction being parsed.
    
    This class maintains all the data needed during transaction parsing,
    including the graph representation, account repository, and transaction metadata.
    """
    slot: int
    transaction_signature: str
    graph:TransactionGraph
    account_repository: AccountRepository
    signer_wallets: Set[str]
    blocktime: int
    fee: int
    fee_payer: str
    compute_units_consumed: int
    priority_fee: int
    swaps: List[Swap]
    next_swap_id: int
    swap_id_counter: int
    instructions: List[Parsed_Instruction]
    isomorphic_group: int = None
    err: str = None
    
    def __init__(
        self,
        slot: int,
        transaction_signature: str,
        graph: TransactionGraph,
        account_repository: AccountRepository,
        signer_wallets: Set[str],
        blocktime: int,
        fee: int,
        fee_payer: str,
        compute_units_consumed: int,
        instructions: List[Parsed_Instruction],
        err: str = None,
    ):
        self.slot = slot
        self.transaction_signature = transaction_signature
        self.graph = graph
        self.account_repository = account_repository
        self.signer_wallets = signer_wallets
        self.blocktime = blocktime
        self.fee = fee
        self.fee_payer = fee_payer
        self.compute_units_consumed = compute_units_consumed
        self.priority_fee = 0
        self.swaps = []
        self.next_swap_id = 1
        self.swap_id_counter = 0
        self.err = err
        self.instructions = instructions
        
    def compute_priority_fee(self, micro_lamport: int) -> None:
        """
        Calculate the priority fee based on compute units consumed.
        
        This matches the legacy implementation's formula while handling edge cases.
        
        Args:
            micro_lamport: The micro-lamport amount for priority fee
        """
        if micro_lamport == 0 or self.compute_units_consumed == 0:
            self.priority_fee = 0
        else:
            # Calculate priority fee: micro_lamport * compute_units_consumed / 1,000,000
            # This matches the Solana computation for priority fees
            self.priority_fee = (micro_lamport * self.compute_units_consumed) // 1_000_000
            
            # Handle potential overflow by capping at a reasonable maximum
            # (if for some reason the computation produces an unreasonably large number)
            MAX_REASONABLE_PRIORITY_FEE = 1_000_000_000  # 1 SOL in lamports
            if self.priority_fee > MAX_REASONABLE_PRIORITY_FEE:
                logger.warning(f"Computed priority fee exceeds reasonable maximum: {self.priority_fee}. Capping at {MAX_REASONABLE_PRIORITY_FEE}.")
                self.priority_fee = MAX_REASONABLE_PRIORITY_FEE
            
    def add_swap(self, router:bool,
                       program_address: str,
                       program_name: str,
                       instruction_name : str,
                       user_addresses: TransferAccountAddresses,
                       pool_addresses: TransferAccountAddresses | Tuple[str,...],
                       parent_router_swap_id: int)-> Swap:
        """Add a swap to the context."""
        # Create a new swap
        self.swap_id_counter += 1

        swap = Swap(id = self.swap_id_counter,
                    router = router, 
                    program_address = program_address,
                    program_name = program_name,
                    instruction_name = instruction_name,
                    user_addresses = user_addresses,
                    pool_addresses = pool_addresses,
                    parent_router_swap_id = parent_router_swap_id)
        
        self.swaps.append(swap)
        
        return swap

    def get_swap(self, id:int)-> Optional[Swap]:
        return self.swaps[id - 1]