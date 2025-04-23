import math

from typing import Dict, List, Optional, Set, Tuple, Any, Union

from GrafolanaBack.domain.transaction.models.swap import Swap, TransferAccountAddresses
from GrafolanaBack.domain.transaction.models.graph import TransferProperties, TransferType
from GrafolanaBack.domain.transaction.config.constants import BURN, MINTTO
from GrafolanaBack.domain.transaction.config.dex_programs.swap_programs import SWAP_PROGRAMS
from GrafolanaBack.domain.transaction.models.transaction_context import TransactionContext
from GrafolanaBack.domain.transaction.services.graph_builder_service import GraphBuilderService
from GrafolanaBack.domain.transaction.utils.instruction_utils import Parsed_Instruction, decode_discriminator, decode_instruction_data, get_discriminator


class SwapParserService():
        
    @staticmethod
    def parse_swap(instruction: Parsed_Instruction, transaction_context: TransactionContext, parent_router_swap_id: int = None) -> Optional[Swap]:
        """Parse a swap instruction to extract trade details."""
        # If instruction has accounts, then proceeds
        if (instruction.accounts):
            if SWAP_PROGRAMS.is_recognized(instruction.program_address):

                # Get accounts from the instructrion accounts
                input_accounts =  instruction.accounts

                dex_config = SWAP_PROGRAMS.get_program(instruction.program_address)
                for param in dex_config.instruction_parse_param:

                    # Check if instruction name is present in the param and get discriminator
                    if param.instruction_name is not None:
                        discriminator = get_discriminator(param.instruction_name)
                    # If not, get discriminator from the param
                    elif param.discriminator is not None:
                        discriminator = param.discriminator
                    # If neither is present, set discriminator to Empty List
                    else:
                        discriminator = []

                    # Check if the account length is present in the param and if it matches the input accounts length
                    # If not, return None
                    if param.accounts_length is not None and len(input_accounts) != param.accounts_length:
                        continue
                    
                    instruction_bytes = decode_instruction_data(instruction.data)

                    if param.terminator is not None and instruction_bytes.hex()[-1]!=param.terminator:
                        continue

                    if param.byte_value is not None:
                        byte,value = param.byte_value
                        if instruction_bytes.hex()[byte] != value:
                            continue

                    instruction_discriminator = decode_discriminator(instruction_bytes, math.ceil(len(discriminator)/2))
                    # Check if the discriminator is present in the instruction data
                    # If not, return None
                    # If it is, return the trade data
                    if instruction_discriminator == discriminator or discriminator is None:
                        user_source_token_account = input_accounts[param.user_source_token_account_index]
                        user_destination_token_account = input_accounts[param.user_destination_token_account_index]

                        swap = None
                        # If router there is no pool
                        if dex_config.router:
                            swap = transaction_context.add_swap(router = dex_config.router, 
                                                            program_address = instruction.program_address,
                                                            program_name = dex_config.label,
                                                            instruction_name = param.getInstructionName(),
                                                            user_addresses = TransferAccountAddresses(user_source_token_account, user_destination_token_account),
                                                            pool_addresses = None,
                                                            parent_router_swap_id = parent_router_swap_id
                                )
                        else:
                            # If there is a list of pools :
                            if (param.pools):
                                pool_addresses =  tuple([input_accounts[pool] for pool in param.pools])

                                swap = transaction_context.add_swap(router = dex_config.router, 
                                                                program_address = instruction.program_address,
                                                                program_name = dex_config.label,
                                                                instruction_name = param.getInstructionName(),
                                                                user_addresses = TransferAccountAddresses(user_source_token_account, user_destination_token_account),
                                                                pool_addresses = pool_addresses,
                                                                parent_router_swap_id=parent_router_swap_id
                                ) 

                            # If there is a classic source/destination for pools :
                            else:
                                if (param.pool_source_token_account_index == BURN or param.pool_source_token_account_index == MINTTO):
                                    outgoing_mint_address = transaction_context.account_repository.accounts.get(user_destination_token_account).mint_address
                                    pool_source_token_account = param.pool_source_token_account_index + "_" + outgoing_mint_address
                                else:
                                    pool_source_token_account = input_accounts[param.pool_source_token_account_index]

                                if (param.pool_destination_token_account_index == BURN or param.pool_destination_token_account_index == MINTTO):
                                    incoming_mint_address = transaction_context.account_repository.accounts.get(user_source_token_account).mint_address
                                    pool_destination_token_account = param.pool_destination_token_account_index + "_" + incoming_mint_address
                                else:
                                    pool_destination_token_account = input_accounts[param.pool_destination_token_account_index]
                                
                                swap = transaction_context.add_swap(router = dex_config.router, 
                                                                program_address = instruction.program_address,
                                                                program_name = dex_config.label,
                                                                instruction_name = param.getInstructionName(),
                                                                user_addresses = TransferAccountAddresses(user_source_token_account, user_destination_token_account),
                                                                pool_addresses = TransferAccountAddresses(pool_source_token_account, pool_destination_token_account),
                                                                parent_router_swap_id=parent_router_swap_id
                                )

                            # If there is a SOL transfer to be infered
                            if param.native_sol_transfer_inference:
                                transfer = param.native_sol_transfer_inference.infer(instruction, swap)
                                
                                # Prepare source account
                                source_account_version = GraphBuilderService.prepare_source_account_version(
                                    transaction_context = transaction_context,
                                    source_address = transfer.accounts.source, 
                                    amount_token = transfer.amount
                                )
                                # Prepare destination account
                                destination_accout_version = GraphBuilderService.prepare_destination_account_version(
                                    transaction_context = transaction_context,
                                    account_version_source = source_account_version, 
                                    destination_address=transfer.accounts.destination,
                                    amount_token = transfer.amount
                                )

                                # Add transfer to graph
                                transaction_context.graph.add_edge(
                                    source = source_account_version.get_vertex(),
                                    target = destination_accout_version.get_vertex(),
                                    transfer_properties = TransferProperties(
                                        transfer_type = TransferType.NATIVE_SOL,
                                        program_address = instruction.program_address,
                                        amount_source = transfer.amount,
                                        amount_destination = transfer.amount,
                                        swap_parent_id = swap.id,
                                        parent_router_swap_id = parent_router_swap_id,
                                    )
                                )
                        
                        return swap
                    
        return None


