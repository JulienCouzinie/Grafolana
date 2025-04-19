from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Set, Tuple, Any

from GrafolanaBack.domain.transaction.models.account import AccountType
from GrafolanaBack.domain.transaction.models.graph import TransferProperties, TransferType
from GrafolanaBack.domain.transaction.factories.account_factory import AccountFactory
from GrafolanaBack.domain.transaction.config.constants import COMPUTE_BUDGET_PROGRAM, SOL, STAKE_PROGRAM, WRAPPED_SOL_ADDRESS
from GrafolanaBack.domain.transaction.models.transaction_context import TransactionContext
from GrafolanaBack.domain.transaction.services.graph_builder_service import GraphBuilderService
from GrafolanaBack.domain.transaction.utils.instruction_utils import Parsed_Instruction, decode_discriminator, decode_instruction_data
from GrafolanaBack.domain.logging.logging import logger

class InstructionParser(ABC):
    """Base class for instruction parsers using the Strategy pattern."""
    
    @abstractmethod
    def can_parse(self, instruction: Parsed_Instruction) -> bool:
        """Check if this parser can parse the given instruction."""
        pass
    
    @abstractmethod
    def parse(self, instruction: Parsed_Instruction, context: TransactionContext, graphBuilderService: GraphBuilderService, swap_parent_id: int = None) -> Any:
        """Parse the instruction and update the transaction context."""
        pass


class SystemTransferParser(InstructionParser):
    """Parser for System Program transfer instructions."""
    
    def can_parse(self, instruction: Parsed_Instruction) -> bool:
        return (instruction.program_name == "system" and 
                instruction.parsed is not None and 
                instruction.parsed.get("type") == "transfer")
    
    def parse(self, instruction: Parsed_Instruction, context: TransactionContext, graphBuilderService: GraphBuilderService, swap_parent_id: int = None) -> None:
        lamports = instruction.parsed["info"]["lamports"]
        source_address = instruction.parsed["info"]["source"]
        destination_address = instruction.parsed["info"]["destination"]
        
        owner = None
        authority = None
        if source_address in context.signer_wallets:
            owner = source_address
        elif instruction.parent_instruction:
            authority = instruction.parent_instruction.program_address

        # Get source version account
        account_version_source = graphBuilderService.prepare_source_account_version(
            source_address = source_address,
            amount_lamport = lamports,
            authority = authority
        )

        # Get destination version account
        account_version_destination = graphBuilderService.prepare_destination_account_version(
            account_version_source = account_version_source, 
            destination_address = destination_address,
            amount_lamport = lamports
        )

        # Add edge to graph
        context.graph.add_edge(
            source = account_version_source.get_vertex(),
            target = account_version_destination.get_vertex(),
            transfer_properties = TransferProperties(
                transfer_type=TransferType.TRANSFER,
                program_address = instruction.program_address,
                amount_source = lamports,
                amount_destination = lamports,
                swap_parent_id = swap_parent_id
            )
        )
        
        return True


class TokenTransferParser(InstructionParser):
    """Parser for Token Program transfer instructions."""
    
    def can_parse(self, instruction: Parsed_Instruction) -> bool:
        return (instruction.program_name == "spl-token" and 
                instruction.parsed is not None and 
                instruction.parsed.get("type") == "transfer")
    
    def parse(self, instruction: Parsed_Instruction, context: TransactionContext, graphBuilderService: GraphBuilderService, swap_parent_id: int = None) -> None:
        amount = int(instruction.parsed["info"]["amount"])
        source_address = str(instruction.parsed["info"]["source"])
        destination_address = str(instruction.parsed["info"]["destination"])
        authority = str(instruction.parsed["info"]["authority"])
        
        # Get source version account
        account_version_source = graphBuilderService.prepare_source_account_version(
            source_address = source_address, 
            owner = authority, 
            amount_token = amount,
            account_type = AccountType.TOKEN_ACCOUNT
        )

        # Get destination version account
        account_version_destination = graphBuilderService.prepare_destination_account_version(
            account_version_source, 
            destination_address, 
            amount_token = amount,
            account_type = AccountType.TOKEN_ACCOUNT
        )

        
        # Add edge to graph
        context.graph.add_edge(
            source = account_version_source.get_vertex(),
            target = account_version_destination.get_vertex(),
            transfer_properties = TransferProperties(
                transfer_type=TransferType.TRANSFER,
                program_address = instruction.program_address,
                amount_source = amount,
                amount_destination = amount,
                swap_parent_id = swap_parent_id
            )
        )
        
        return True


class TokenTransferCheckedParser(InstructionParser):
    """Parser for Token Program transferChecked instructions."""
    
    def can_parse(self, instruction: Parsed_Instruction) -> bool:
        return (instruction.program_name == "spl-token" and 
                instruction.parsed is not None and 
                instruction.parsed.get("type") == "transferChecked")
    
    def parse(self, instruction: Parsed_Instruction, context: TransactionContext, graphBuilderService: GraphBuilderService, swap_parent_id: int = None) -> None:
        amount = int(instruction.parsed["info"]["tokenAmount"]["amount"])
        source_address = str(instruction.parsed["info"]["source"])
        destination_address = str(instruction.parsed["info"]["destination"])
        # if instruction.parsed["info"] has attribute authority
        if "authority" in instruction.parsed["info"]:
            authority = str(instruction.parsed["info"]["authority"])
        elif "multisigAuthority" in instruction.parsed["info"]:
            authority = str(instruction.parsed["info"]["multisigAuthority"][0])
            # TODO Get all multisig signers and add them as authorities, but we can only add one for now so fuck it
        else:
            authority = None

        mint_address = str(instruction.parsed["info"]["mint"])
        
        # Get source version account
        account_version_source = graphBuilderService.prepare_source_account_version(
            source_address = source_address,
            mint_address = mint_address,
            owner = authority,
            amount_token = amount,
            account_type = AccountType.TOKEN_ACCOUNT
        )

        # Get destination version account
        account_version_destination = graphBuilderService.prepare_destination_account_version(
            account_version_source = account_version_source, 
            destination_address = destination_address,
            mint_address = mint_address,
            amount_token = amount,
            account_type = AccountType.TOKEN_ACCOUNT
        )
        
        # Add edge to graph
        context.graph.add_edge(
            source = account_version_source.get_vertex(),
            target = account_version_destination.get_vertex(),
            transfer_properties = TransferProperties(
                transfer_type=TransferType.TRANSFERCHECKED,
                program_address=instruction.program_address,
                amount_source=amount,
                amount_destination=amount,
                swap_parent_id=swap_parent_id
            )
        )
        
        return True


class CreateAccountParser(InstructionParser):
    """Parser for System Program createAccount instructions."""
    
    def can_parse(self, instruction: Parsed_Instruction) -> bool:
        return (instruction.program_name == "system" and 
                instruction.parsed is not None and 
                (instruction.parsed.get("type") == "createAccount" or
                 instruction.parsed.get("type") == "createAccountWithSeed"))
    
    def parse(self, instruction: Parsed_Instruction, context: TransactionContext, graphBuilderService: GraphBuilderService, swap_parent_id: int = None) -> None:
        lamports = int(instruction.parsed["info"]["lamports"])
        source_address = str(instruction.parsed["info"]["source"])
        new_account_address = str(instruction.parsed["info"]["newAccount"])
        program_owner = str(instruction.parsed["info"]["owner"])
        account_type = None

        if program_owner ==  STAKE_PROGRAM:
            account_type = AccountType.STAKE_ACCOUNT

        # Get source version account
        account_version_source = graphBuilderService.prepare_source_account_version(
            source_address = source_address,
            amount_lamport = lamports
        )

        # Get destination version account
        account_version_destination = graphBuilderService.prepare_destination_account_version(
            account_version_source = account_version_source, 
            destination_address = new_account_address,
            amount_lamport = lamports,
            account_type = account_type
        )
        
        # Add edge to graph
        context.graph.add_edge(
            source = account_version_source.get_vertex(),
            target = account_version_destination.get_vertex(),
            transfer_properties = TransferProperties(
                transfer_type=TransferType.CREATE_ACCOUNT,
                program_address=instruction.program_address,
                amount_source=lamports,
                amount_destination=lamports,
                swap_parent_id=swap_parent_id
            )
        )
        
        return True


class CloseAccountParser(InstructionParser):
    """Parser for Token Program closeAccount instructions."""
    
    def can_parse(self, instruction: Parsed_Instruction) -> bool:
        return (instruction.program_name == "spl-token" and 
                instruction.parsed is not None and 
                instruction.parsed.get("type") == "closeAccount")
    
    def parse(self, instruction: Parsed_Instruction, context: TransactionContext, graphBuilderService: GraphBuilderService, swap_parent_id: int = None) -> None:
        account_address = str(instruction.parsed["info"]["account"])
        destination_address = str(instruction.parsed["info"]["destination"])
        if "owner" in instruction.parsed["info"]:
            owner = str(instruction.parsed["info"]["owner"])
        elif "multisigOwner" in instruction.parsed["info"]:
            owner = str(instruction.parsed["info"]["multisigOwner"][0])

        # Get source version account
        account_version_source = graphBuilderService.prepare_source_account_version(
            source_address=account_address,
            owner = owner,
            balance_token = 0,
            balance_lamport = 0,
            account_type = AccountType.TOKEN_ACCOUNT
        )

        amount_lamport = account_version_source.balance_token + 203928

        # Get destination version account
        account_version_destination = graphBuilderService.prepare_destination_account_version(
            account_version_source = account_version_source, 
            destination_address = destination_address,
            amount_lamport = amount_lamport
        )

        # Add edge to graph
        context.graph.add_edge(
            source = account_version_source.get_vertex(),
            target = account_version_destination.get_vertex(),
            transfer_properties = TransferProperties(
                transfer_type = TransferType.CLOSE_ACCOUNT,
                program_address = instruction.program_address,
                amount_source = amount_lamport,
                amount_destination = amount_lamport,
                swap_parent_id = swap_parent_id
            )
        )
        
        return True

class BurnParser(InstructionParser):
    """Parser for Token Program burn instructions."""
    
    def can_parse(self, instruction: Parsed_Instruction) -> bool:
        return (instruction.program_name == "spl-token" and 
                instruction.parsed is not None and 
                instruction.parsed.get("type") == "burn")
    
    def parse(self, instruction: Parsed_Instruction, context: TransactionContext, graphBuilderService: GraphBuilderService, swap_parent_id: int = None) -> None:
        amount = int(instruction.parsed["info"]["amount"])
        account_address = str(instruction.parsed["info"]["account"])
        authority = str(instruction.parsed["info"]["authority"])
        mint_address = str(instruction.parsed["info"]["mint"])
        
        graphBuilderService.burn(
            account_address=account_address,
            amount_token = amount,
            mint_address = mint_address,
            authority = authority,
            parent_swap_id = swap_parent_id,
            program_address = instruction.program_address,
        )
        
        return True

class MintToParser(InstructionParser):
    """Parser for Token Program mintTo instructions."""
    
    def can_parse(self, instruction: Parsed_Instruction) -> bool:
        return (instruction.program_name == "spl-token" and 
                instruction.parsed is not None and 
                instruction.parsed.get("type") == "mintTo")
    
    def parse(self, instruction: Parsed_Instruction, context: TransactionContext, graphBuilderService: GraphBuilderService, swap_parent_id: int = None) -> None:
        amount = int(instruction.parsed["info"]["amount"])
        account_address = str(instruction.parsed["info"]["account"])
        mint_authority = str(instruction.parsed["info"]["mintAuthority"])
        mint_address = str(instruction.parsed["info"]["mint"])
        
        graphBuilderService.mintTo(
            account_address = account_address,
            amount_token = amount,
            mint_address = mint_address,
            parent_swap_id = swap_parent_id,
            program_address = instruction.program_address,
        )
        
        return True

class SyncNativeParser(InstructionParser):
    """Parser for Token Program syncNative instructions (converts lamports to wrapped SOL)."""
    
    def can_parse(self, instruction: Parsed_Instruction) -> bool:
        return (instruction.program_name == "spl-token" and 
                instruction.parsed is not None and 
                instruction.parsed.get("type") == "syncNative")
    
    def parse(self, instruction: Parsed_Instruction, context: TransactionContext, graphBuilderService: GraphBuilderService, swap_parent_id: int = None) -> None:
        account_address = str(instruction.parsed["info"]["account"])

        mint_address = WRAPPED_SOL_ADDRESS
        account_version = context.account_repository.account_versions.get(account_address)[-1]
        account_version.account.mint_address = mint_address
        account_version.account.type = AccountType.TOKEN_ACCOUNT

        # Convert the lamports balance to WSOL, deducting rent exempt lamports cost
        account_version.balance_token += account_version.balance_lamport - 203928
        
        return True

class SystemAssignParser(InstructionParser):
    """Parser for System Program assign instructions."""
    
    def can_parse(self, instruction: Parsed_Instruction) -> bool:
        return (instruction.program_name == "system" and 
                instruction.parsed is not None and 
                instruction.parsed.get("type") == "assign")
    
    def parse(self, instruction: Parsed_Instruction, context: TransactionContext, graphBuilderService: GraphBuilderService, swap_parent_id: int = None) -> None:
        account_address = str(instruction.parsed["info"]["account"])
        program_owner = str(instruction.parsed["info"]["owner"])
        if program_owner == STAKE_PROGRAM:
            context.account_repository.accounts.get(account_address).type = AccountType.STAKE_ACCOUNT
            
        # No transfers involved in assign
        return True

class StakeInitializeParser(InstructionParser):
    """Parser for Stake Program initialize instructions."""
    
    def can_parse(self, instruction: Parsed_Instruction) -> bool:
        return (instruction.program_name == "stake" and 
                instruction.parsed is not None and 
                instruction.parsed.get("type") == "initialize")
    
    def parse(self, instruction: Parsed_Instruction, context: TransactionContext, graphBuilderService: GraphBuilderService, swap_parent_id: int = None) -> None:
        stakeAccount_address = str(instruction.parsed["info"]["stakeAccount"])
        withdrawer_address = str(instruction.parsed["info"]["authorized"]["withdrawer"])

        context.account_repository.accounts.get(stakeAccount_address).type = AccountType.STAKE_ACCOUNT
        context.account_repository.update_owner_in_all_versions(address = stakeAccount_address,
                                                                        owner = withdrawer_address)
            
        # No transfers involved in stake initialization
        return True

class StakeWithdrawParser(InstructionParser):
    """Parser for Stake Program withdraw instructions."""
    
    def can_parse(self, instruction: Parsed_Instruction) -> bool:
        return (instruction.program_name == "stake" and 
                instruction.parsed is not None and 
                instruction.parsed.get("type") == "withdraw")
    
    def parse(self, instruction: Parsed_Instruction, context: TransactionContext, graphBuilderService: GraphBuilderService, swap_parent_id: int = None) -> None:
        stakeAccount_address = str(instruction.parsed["info"]["stakeAccount"])
        destination_address = str(instruction.parsed["info"]["destination"])
        lamports = instruction.parsed["info"]["lamports"]
        withdrawAuthority_address = str(instruction.parsed["info"]["withdrawAuthority"])

        # Get source version account
        account_version_source = graphBuilderService.prepare_source_account_version(
            source_address = stakeAccount_address,
            amount_lamport = lamports,
            owner=withdrawAuthority_address,
            account_type = AccountType.STAKE_ACCOUNT
        )

        # Get destination version account
        account_version_destination = graphBuilderService.prepare_destination_account_version(
            account_version_source = account_version_source, 
            destination_address = destination_address,
            amount_lamport = lamports
        )
        
        # Add edge to graph
        context.graph.add_edge(
            source = account_version_source.get_vertex(),
            target = account_version_destination.get_vertex(),
            transfer_properties = TransferProperties(
                transfer_type=TransferType.WITHDRAW,
                program_address=instruction.program_address,
                amount_source=lamports,
                amount_destination=lamports,
                swap_parent_id=swap_parent_id
            )
        )
        
        return True


class StakeSplitParser(InstructionParser):
    """Parser for Stake Program split instructions."""
    
    def can_parse(self, instruction: Parsed_Instruction) -> bool:
        return (instruction.program_name == "stake" and 
                instruction.parsed is not None and 
                instruction.parsed.get("type") == "split")
    
    def parse(self, instruction: Parsed_Instruction, context: TransactionContext, graphBuilderService: GraphBuilderService, swap_parent_id: int = None) -> None:
        stakeAccount_address = str(instruction.parsed["info"]["stakeAccount"])
        newSplitAccount_address = str(instruction.parsed["info"]["newSplitAccount"])
        authority = str(instruction.parsed["info"]["stakeAuthority"])
        lamports = int(instruction.parsed["info"]["lamports"])

        mint_address = SOL

        # Get source version account
        account_version_source = graphBuilderService.prepare_source_account_version(source_address = stakeAccount_address, 
                                                                                    amount_lamport = lamports,
                                                                                    mint_address = mint_address,
                                                                                    owner = authority,
                                                                                    account_type = AccountType.STAKE_ACCOUNT)

        # Get destination version account
        account_version_destination = graphBuilderService.prepare_destination_account_version(account_version_source = account_version_source, 
                                                                                            destination_address = newSplitAccount_address, 
                                                                                            owner = authority,
                                                                                            amount_lamport = lamports,
                                                                                            mint_address = mint_address,
                                                                                            account_type = AccountType.STAKE_ACCOUNT)
        
        # Add edge to graph
        context.graph.add_edge(
            source = account_version_source.get_vertex(),
            target = account_version_destination.get_vertex(),
            transfer_properties = TransferProperties(
                transfer_type=TransferType.SPLIT,
                program_address=instruction.program_address,
                amount_source=lamports,
                amount_destination=lamports,
                swap_parent_id=swap_parent_id
            )
        )
        
        return True


class StakeAuthorizeParser(InstructionParser):
    """Parser for Stake Program authorize instructions."""
    
    def can_parse(self, instruction: Parsed_Instruction) -> bool:
        return (instruction.program_name == "stake" and 
                instruction.parsed is not None and 
                instruction.parsed.get("type") == "authorize" and
                instruction.parsed["info"]["authorityType"] == "Withdrawer")
    
    def parse(self, instruction: Parsed_Instruction, context: TransactionContext, graphBuilderService: GraphBuilderService, swap_parent_id: int = None) -> None:
        stakeAccount_address = str(instruction.parsed["info"]["stakeAccount"])
        newAuthority = str(instruction.parsed["info"]["newAuthority"])

        # Get source version account
        account_version_source = graphBuilderService.prepare_source_account_version(source_address = stakeAccount_address,
                                                                                    account_type= AccountType.STAKE_ACCOUNT)

        # Get destination version account
        account_version_destination = graphBuilderService.prepare_destination_account_version(account_version_source = account_version_source, 
                                                                                                       destination_address = stakeAccount_address, 
                                                                                                       owner = newAuthority)

        # Add Transfer Edge
        context.graph.add_edge(
            source = account_version_source.get_vertex(), 
            target = account_version_destination.get_vertex(), 
            transfer_properties = TransferProperties(
                transfer_type = TransferType.AUTHORIZE,
                program_address = instruction.program_address,
                amount_source = account_version_source.balance_lamport, 
                amount_destination = account_version_source.balance_lamport, 
                swap_parent_id = swap_parent_id, 
            )
        )
        return True

class AssociatedTokenAccountCreateParser(InstructionParser):
    """Parser for Associated Token Account Program create instructions."""
    
    def can_parse(self, instruction: Parsed_Instruction) -> bool:
        return (instruction.program_name == "spl-associated-token-account" and 
                instruction.parsed is not None and 
                instruction.parsed.get("type") in ["create", "createIdempotent"])
    
    def parse(self, instruction: Parsed_Instruction, context: TransactionContext, graphBuilderService: GraphBuilderService, swap_parent_id: int = None) -> None:
        source_address = str(instruction.parsed["info"]["source"])
        new_account_address = str(instruction.parsed["info"]["account"])
        mint_address = str(instruction.parsed["info"]["mint"])
        wallet = str(instruction.parsed["info"]["wallet"])
        
        # update mint if not known yet
        new_account = context.account_repository.accounts.get(new_account_address)
        new_account.mint_address = mint_address
        new_account.type = AccountType.TOKEN_ACCOUNT

        # update owner in all source account's version if it wasn't known yet
        account_version_destination = context.account_repository.account_versions.get(new_account_address)
        context.account_repository.update_owner_in_all_versions(new_account_address, wallet)
        
        # No transfers involved in account creation (SOL transfer happens in a separate system instruction)
        return True


class ComputeBudgetSetComputeUnitPriceParser(InstructionParser):
    """Parser for Compute Budget Program instructions."""
    
    def can_parse(self, instruction: Parsed_Instruction) -> bool:
        if instruction.program_address == COMPUTE_BUDGET_PROGRAM:
            instruction_bytes = decode_instruction_data(instruction.data)
            instruction_discriminator = decode_discriminator(instruction_bytes,1)
            # 
            return instruction_discriminator == "03"
        return False
    
    def parse(self, instruction: Parsed_Instruction, context: TransactionContext, graphBuilderService: GraphBuilderService, swap_parent_id: int = None) -> None:
        instruction_bytes = decode_instruction_data(instruction.data)
        micro_lamport = int.from_bytes(instruction_bytes[1:9], "little")
        context.compute_priority_fee(micro_lamport = micro_lamport)
                
        # No edges to add for compute budget instructions
        return True