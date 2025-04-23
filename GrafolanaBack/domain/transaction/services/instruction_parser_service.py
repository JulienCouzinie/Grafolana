from typing import Dict, List, Optional, Set, Tuple, Any

from GrafolanaBack.domain.transaction.models.swap import Swap
from GrafolanaBack.domain.transaction.models.transaction_context import TransactionContext
from GrafolanaBack.domain.transaction.parsers.instruction_parsers import (
    InstructionParser, SystemTransferParser, TokenTransferParser, 
    TokenTransferCheckedParser, CreateAccountParser, CloseAccountParser,
    BurnParser, MintToParser, StakeInitializeParser, StakeWithdrawParser,
    StakeSplitParser, StakeAuthorizeParser, AssociatedTokenAccountCreateParser,
    ComputeBudgetSetComputeUnitPriceParser, SyncNativeParser, SystemAssignParser
)
from GrafolanaBack.domain.transaction.services.swap_parser_service import SwapParserService
from GrafolanaBack.domain.transaction.utils.instruction_utils import Parsed_Instruction

class InstructionParserService:
    """
    Service for parsing different types of Solana instructions.
    
    This service uses the Strategy pattern to dispatch parsing to specialized
    parsers based on the instruction type.
    """
    transfer_parsers: List[InstructionParser]
    
    def __init__(self):
        self.transfer_parsers = [
            SystemTransferParser(),
            TokenTransferParser(),
            TokenTransferCheckedParser(),
            CreateAccountParser(),
            CloseAccountParser(),
            BurnParser(),
            MintToParser(),
            StakeInitializeParser(),
            StakeWithdrawParser(),
            StakeSplitParser(),
            StakeAuthorizeParser(),
            AssociatedTokenAccountCreateParser(),
            ComputeBudgetSetComputeUnitPriceParser(),
            SyncNativeParser(),
            SystemAssignParser()
        ]
    
    def parse_transfer(self, instruction: Parsed_Instruction, context: TransactionContext, parent_swap_id: int = None, parent_router_swap_id: int = None) -> bool:
        """
        Parse an instruction as a transfer, if possible.
        
        Args:
            instruction: The instruction to parse
            context: The transaction context
            graphBuilderService: Service for building the graph
            parent_swap_id: The ID of the parent swap, if applicable
            
        Returns:
            True if the instruction was parsed as a transfer, False otherwise
        """
        for parser in self.transfer_parsers:
            if parser.can_parse(instruction):
                return parser.parse(instruction, context, parent_swap_id, parent_router_swap_id)
        return False
    
    def parse_swap(self, instruction: Parsed_Instruction, context: TransactionContext, parent_router_swap_id: int = None) -> Optional[Swap]:
        return SwapParserService.parse_swap(instruction, context, parent_router_swap_id)