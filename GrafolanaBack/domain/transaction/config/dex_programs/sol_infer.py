from dataclasses import dataclass
import struct
from typing import List, NamedTuple

import base58

from GrafolanaBack.domain.transaction.models.graph import TransferType
from GrafolanaBack.domain.transaction.models.swap import Swap, TransferAccountAddresses
from GrafolanaBack.domain.transaction.utils.instruction_utils import Parsed_Instruction, decode_discriminator, decode_instruction_data

class InferedTransfer(NamedTuple):
    type: TransferType
    accounts: TransferAccountAddresses
    amount: int
    
@dataclass
class NativeSolTransferInference:
    def infer(self,swap_instruction: Parsed_Instruction, swap: Swap) -> InferedTransfer:
        raise NotImplementedError()

@dataclass
class InnerInstructionSolTransferInference(NativeSolTransferInference):
    program_address: str
    discriminator: List[int]
    format_str: str
    """
    Infer SOL transfer from swap's inner instruction
    Use the program address and discriminator to find the instruction.
    Infer the amount of SOL transferred from the instruction data with a format string to unpack the data.
    """
    def infer(self, swap_instruction: Parsed_Instruction, swap: Swap) -> InferedTransfer:
        # Parse swap's inner_instructions
        for instruction in swap_instruction.inner_instructions:
            # Search for program_id
            if instruction.program_address==self.program_address:
                # Prepare discriminator to match for
                discriminator_str = self.discriminator
                instruction_bytes = decode_instruction_data(instruction.data)
                # Get discriminator from instruction
                instruction_discriminator = decode_discriminator(instruction_bytes, int(len(discriminator_str)/2))

                if instruction_discriminator == discriminator_str:
                    data_bytes = base58.b58decode(instruction.data)
                    _, sol_amount = struct.unpack(self.format_str, data_bytes[:struct.calcsize(self.format_str)])

                    return InferedTransfer(TransferType.NATIVE_SOL,
                                    TransferAccountAddresses(swap.pool_addresses.source,swap.user_addresses.destination), 
                                    sol_amount)
                

@dataclass
class SwapInstructionSolTransferInference(NativeSolTransferInference):
    format_str: str
    """
    Infer SOL transfer from swap instruction
    Infer the amount of SOL transferred from the instruction data with a format string to unpack the data.
    """
    def infer(self, swap_instruction: Parsed_Instruction, swap: Swap) -> InferedTransfer:
        data_bytes = base58.b58decode(swap_instruction.data)
        _, sol_amount = struct.unpack(self.format_str, data_bytes[:struct.calcsize(self.format_str)])

        return InferedTransfer(TransferType.NATIVE_SOL,
                        TransferAccountAddresses(swap.pool_addresses.source,swap.user_addresses.destination), 
                        sol_amount)