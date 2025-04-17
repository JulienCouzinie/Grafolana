from __future__ import annotations
from typing import Dict, List, NamedTuple
import base58
from hashlib import sha256

from solders.transaction_status import EncodedTransactionWithStatusMeta,EncodedConfirmedTransactionWithStatusMeta,ParsedInstruction,ParsedInstruction,UiPartiallyDecodedInstruction

from GrafolanaBack.domain.performance.timing_utils import timing_decorator

class Parsed_Instruction(NamedTuple):
    stackHeight: int
    program_name: str
    program_address: str
    accounts: List[str]
    parsed: Dict[str, dict]  # Assuming Json means a JSON-like dict
    data: str
    inner_instructions: List[Parsed_Instruction] = None
    parent_instruction: Parsed_Instruction = None

def decode_instruction_data(instruction_data: str) -> bytes:
    """Decode base58-encoded instruction data."""
    return base58.b58decode(instruction_data)

def decode_discriminator(instruction_data_bytes: bytes, length: int) -> str:
    """Decode the discriminator from instruction data bytes."""
    return instruction_data_bytes[:length].hex()

def get_discriminator(instruction_name: str) -> str:
    """Get the discriminator for an instruction name using the Anchor convention."""
    return sha256(f"global:{instruction_name}".encode()).hexdigest()[:16]

@timing_decorator
def get_instruction_call_stack(transaction: EncodedTransactionWithStatusMeta) -> List[Parsed_Instruction]:
    """
    Construct the full instruction call stack for a Solana transaction using stack_height.

    Args:
        transaction: EncodedTransactionWithStatusMeta object from getTransaction API with jsonParsed encoding.

    Returns:
        A list of Parsed_Instruction NamedTuples, each representing a main instruction and its recursive inner instructions.
    """

    # Extract main instructions from the transaction message
    main_instructions = transaction.transaction.message.instructions

    # Extract inner instructions from metadata (if available)
    inner_instructions = transaction.meta.inner_instructions if transaction.meta else []

    # Build a mapping of inner instructions by their parent instruction index
    inner_map = {inner.index: inner.instructions for inner in inner_instructions}

    # Helper function to recursively build the call stack from a list of instructions
    def build_call_stack(instructions: List[UiPartiallyDecodedInstruction], start_idx: int, min_height: int, parent_instruction) -> List[Parsed_Instruction]:
        call_stack = []
        i = start_idx

        while i < len(instructions):
            instruction = instructions[i]
            # Get stack_height, defaulting to None if not present
            stack_height = instruction.stack_height if hasattr(instruction, "stack_height") and instruction.stack_height is not None else None
            
            # For inner instructions, we expect stack_height to be an integer >= 2
            if stack_height is None and min_height > 0:
                raise ValueError(f"Inner instruction at index {i} has no stack_height")
            if stack_height is not None and stack_height < min_height:
                break  # We've gone back up the stack, so stop this level

            # Convert stack_height: None (main) becomes 0, otherwise use the integer value
            effective_height = 0 if stack_height is None else stack_height

            # Find inner instructions with higher stack_height
            inner_list = []
            j = i + 1
            while j < len(instructions):
                next_height = instructions[j].stack_height if hasattr(instructions[j], "stack_height") else None
                if next_height is None or next_height <= effective_height:
                    break  # No more inner instructions at this level
                j += 1

            program_name = None
            parsed = None
            data = None
            if isinstance(instruction, ParsedInstruction):
                program_name = instruction.program
                parsed = instruction.parsed
            else:
                data=instruction.data

            accounts = None
            if hasattr(instruction, "accounts"):
                accounts = [str(account) for account in instruction.accounts]

            parsed_instruction = Parsed_Instruction(
                stackHeight = effective_height,
                program_name = program_name,
                program_address = str(instruction.program_id),
                accounts = accounts,
                parsed = parsed,
                data = data,
                parent_instruction = parent_instruction,
                inner_instructions = []
            )
            
            if j > i + 1:
                inner_list = build_call_stack(instructions, i + 1, effective_height + 1, parsed_instruction)

            parsed_instruction.inner_instructions.extend(inner_list)

            # Create the Parsed_Instruction tuple
            call_stack.append(parsed_instruction)
            i = j  # Move to the next instruction after processing inner ones

        return call_stack

    # Construct the call stack for each main instruction
    call_stack = []
    for idx, instruction in enumerate(main_instructions):

        program_name = None
        parsed = None
        data = None
        if isinstance(instruction, ParsedInstruction):
            program_name = instruction.program
            parsed = instruction.parsed
        else:
            data=instruction.data

        accounts = None
        if hasattr(instruction, "accounts"):
            accounts = [str(account) for account in instruction.accounts]

        # Build Parsed_Instruction for the main instruction
        main_instruction = Parsed_Instruction(
            stackHeight=0,  # Main instructions have stack_height = None, mapped to 0
            program_name=program_name,
            program_address=str(instruction.program_id),
            accounts=accounts,
            parsed=parsed,
            data=data,
            inner_instructions=[]
        )

        # Add inner instructions if they exist for this main instruction
        if idx in inner_map:
            inner_instructions_list = inner_map[idx]
            main_instruction.inner_instructions.extend(build_call_stack(inner_instructions_list, 0, 2, main_instruction))

        call_stack.append(main_instruction)

    return call_stack