from typing import Dict, List, Optional, Set, Tuple
from GrafolanaBack.domain.transaction.models.account import Account, AccountType, AccountVersion
from GrafolanaBack.domain.transaction.repositories.account_repository import AccountRepository
from GrafolanaBack.domain.transaction.config.constants import BURN, FEE, MINTTO
from GrafolanaBack.domain.transaction.models.graph import TransferProperties, TransferType, TransactionGraph
from GrafolanaBack.domain.transaction.models.transaction_context import TransactionContext

class GraphBuilderService:
    """
    Service for performing high-level operations on the graph and its associated accounts.
    
    This class is responsible for:
        Preparing and managing accounts and their versions to build the DAG while preventing cycles
    """
    
    def __init__(self, transactionContext: TransactionContext):
        self.transactionContext = transactionContext
    
    def prepare_source_account_version(
            self,
            source_address: str,
            amount_token: Optional[int] = None,
            amount_lamport: Optional[int] = None,
            balance_token: int = None,
            balance_lamport: int = None,
            mint_address: Optional[str] = None,
            owner: Optional[str] = None,
            authority: Optional[str] = None,
            account_type: Optional[AccountType] = None) -> AccountVersion:
        """
        Prepare a source account for a transfer operation.
        
        This method:
        1. Finds the appropriate account version to use as the source
        2. Creates a new version with updated balances if needed
        3. Updates account metadata like owner, type, etc.
        
        Returns:
            The account version to use as the source
        """
        # Try to find latest version in Graph
        account_version_source = None
        for account_version in reversed(self.transactionContext.account_repository.account_versions.get(source_address)):
            if self.transactionContext.graph.has_node(account_version.get_vertex()):
                account_version_source = account_version
                break
        
        # If none found then use most recent and add it to graph
        if account_version_source is None:
            account_version_source = self.transactionContext.account_repository.account_versions.get(source_address)[-1]
            self.transactionContext.graph.add_node(account_version_source.get_vertex())

        # If account version found is the latest, then add a new one for balance update
        if account_version_source == account_version_source == self.transactionContext.account_repository.account_versions.get(source_address)[-1]:
            account_version_souce_new_balance = self.transactionContext.account_repository.new_account_version(source_address)
        else:
            account_version_souce_new_balance = self.transactionContext.account_repository.account_versions.get(source_address)[-1]

        if mint_address:
            # update mint if not known yet
            account_version_source.account.mint_address = mint_address

        # Update balances
        if amount_token:
            account_version_souce_new_balance.apply_token_debit(amount_token)
        if amount_lamport:
            account_version_souce_new_balance.apply_lamport_debit(amount_lamport)
        if balance_token:
            account_version_souce_new_balance.balance_token = balance_token
        if balance_lamport:
            account_version_souce_new_balance.balance_lamport = balance_lamport
        
        if owner:
            # update owner in all source account's version if it wasn't known yet
            self.transactionContext.account_repository.update_owner_in_all_versions(source_address, owner)

        self.transactionContext.account_repository.add_authority(source_address, authority)

        if account_type:
            account_version_source.account.type = account_type

        return account_version_source
    
    def prepare_destination_account_version(
            self,
            account_version_source: AccountVersion,
            destination_address: str,
            amount_token: Optional[int] = None,
            amount_lamport: Optional[int] = None,
            mint_address: Optional[str] = None,
            owner: Optional[str] = None,
            account_type: Optional[AccountType] = None) -> AccountVersion:
        """
        Prepare a destination account for a transfer operation.
        
        This method:
        1. Finds or creates the destination account
        2. Updates its properties based on the source account and provided parameters
        3. Creates a new version if needed to avoid cycles in the graph
        
        Returns:
            The account version to use as the destination
        """
        # Get current destination version
        dest_version = self.transactionContext.account_repository.get_latest_version(destination_address)
        
        # If destination doesn't exist, create it
        if dest_version is None:
            dest_mint = mint_address or account_version_source.mint_address
            dest_version = self.transactionContext.account_repository.create_account(
                transaction_signature = self.transactionContext.transaction_signature,
                address=destination_address,
                mint_address=dest_mint,
                owner=owner,
                balance_token=0,
                balance_lamport=0
            )
        
        # Add to graph if not already there
        if not self.transactionContext.graph.has_node(dest_version.get_vertex()):
            self.transactionContext.graph.add_node(dest_version.get_vertex())
        
        # If there's a cycle, create a new version
        elif (self.transactionContext.graph.has_node(account_version_source.get_vertex()) and 
              self.transactionContext.graph.has_path(dest_version.get_vertex(), account_version_source.get_vertex())):
            dest_version = self.transactionContext.account_repository.new_account_version(destination_address)
            self.transactionContext.graph.add_node(dest_version.get_vertex())
        
        # Update properties
        if mint_address:
            dest_version.account.mint_address = mint_address
        
        if account_type:
            dest_version.account.type = account_type
        
        if owner:
            self.transactionContext.account_repository.update_owner_in_all_versions(destination_address, owner)
        
        # Update balances
        if amount_token:
            dest_version.apply_token_credit(amount_token)
        
        if amount_lamport:
            dest_version.apply_lamport_credit(amount_lamport)
        
        return dest_version
        
    def burn(self, account_address: str, mint_address: str, authority: str, amount_token: int, program_address: str, parent_swap_id: int):
        """
        Burn a token by transferring it to a burn account.
        
        This method:
        1. Prepares the burn account version
        2. Updates the source account version to reflect the burn
        3. Adds a transfer to the graph
        
        Args:
            mint_address: The address of the mint for the token being burned
            amount_token: The amount of tokens to burn
            source_account_version: The source account version from which tokens are being burned
            parent_swap_id: An optional ID for tracking the swap operation
        """


        source_account_version = self.prepare_source_account_version(
            source_address = account_address,
            mint_address = mint_address,
            owner = authority,
            amount_token = amount_token,
            account_type = AccountType.TOKEN_ACCOUNT
        )

        burn_virtual_account_version = self.prepareBurnVirtualAccountVersion(mint_address = mint_address, amount = amount_token)

        self.transactionContext.graph.add_edge(
            source = source_account_version.get_vertex(),
            target = burn_virtual_account_version.get_vertex(),
            transfer_properties = TransferProperties(
                transfer_type=TransferType.BURN,
                swap_parent_id = parent_swap_id,
                amount_source = amount_token,
                amount_destination = amount_token,
                program_address = program_address
            )
        )
    
    def prepareBurnVirtualAccountVersion(self, mint_address: str, amount: int)-> AccountVersion:
        burn_virtual_address = BURN+"_"+mint_address

        # Create a virtual burn account for the mint if not exist
        # And add it to the graph
        if (burn_account_version := self.transactionContext.account_repository.create_account(
            transaction_signature = self.transactionContext.transaction_signature,
            address = burn_virtual_address,
            balance_token = amount, 
            balance_lamport = 0,
            mint_address = mint_address,
            account_type = AccountType.BURN_ACCOUNT)) is not None:
            self.transactionContext.graph.add_node(burn_account_version.get_vertex())
        else:
           burn_account_version = self.transactionContext.account_repository.get_latest_version(burn_virtual_address)

        # Update balance:
        burn_account_version.apply_token_credit(amount)

        return burn_account_version
            
    def mintTo(self, account_address: str, amount_token: int, mint_address: str, program_address: str, parent_swap_id: str):
        mintto_virtual_account_version = self.prepareMintToVirtualAccountVersion(mint_address = mint_address, amount = amount_token)

        # Get destination version account
        account_version_destination = self.prepare_destination_account_version(
            account_version_source = mintto_virtual_account_version, 
            destination_address = account_address,
            mint_address = mint_address,
            amount_token = amount_token,
            account_type = AccountType.TOKEN_ACCOUNT
        )
        
        self.transactionContext.graph.add_edge(
            source = mintto_virtual_account_version.get_vertex(),
            target = account_version_destination.get_vertex(),
            transfer_properties = TransferProperties(
                transfer_type=TransferType.MINTTO,
                swap_parent_id = parent_swap_id,
                amount_source = amount_token,
                amount_destination = amount_token,
                program_address = program_address
            )
        )

    def prepareMintToVirtualAccountVersion(self, mint_address: str, amount: int)-> AccountVersion:
        mintto_virtual_address = MINTTO + "_" + mint_address 

        # Create a virtual mintto account for the mint if not exist
        # And add it to the graph
        if (mintto_account_version := self.transactionContext.account_repository.create_account(
            transaction_signature = self.transactionContext.transaction_signature,
            address = mintto_virtual_address, 
            balance_token = amount, 
            balance_lamport = 0,
            mint_address = mint_address,
            account_type = AccountType.MINTTO_ACCOUNT)) is not None:
            self.transactionContext.graph.add_node(mintto_account_version.get_vertex())
        else:
           mintto_account_version = self.transactionContext.account_repository.get_latest_version(mintto_virtual_address)

        # Update balance:
        mintto_account_version.apply_token_credit(amount)

        return mintto_account_version
    
    def computePriorityFee(self, micro_lamport: int, transactionContext: TransactionContext):
        '''
        Total Priority Fee (in Lamports) = (microLamportsPerCu * meta.computeUnitsConsumed) / 1,000,000
        '''
        if micro_lamport==0:
            transactionContext.priority_fee = 0
        else:
            transactionContext.priority_fee = micro_lamport * transactionContext.compute_units_consumed / 1000000

    def add_fee_transfers(self, transactionContext: TransactionContext):
        """
        Add fee transfers to the graph.
        """
        # Add fee transfer from fee payer to fee account
        fee_payer_account_version = self.prepare_source_account_version(
            source_address = transactionContext.fee_payer,
            amount_lamport = transactionContext.fee
        )

        fee_account = self.prepare_destination_account_version(
            account_version_source = fee_payer_account_version, 
            destination_address = FEE,
            amount_lamport = transactionContext.fee,
            account_type = AccountType.FEE_ACCOUNT)
        
        # Add fee transfer from fee payer to fee account
        self.transactionContext.graph.add_edge(
            source = fee_payer_account_version.get_vertex(),
            target = fee_account.get_vertex(),
            transfer_properties = TransferProperties(
                transfer_type = TransferType.FEE,
                program_address = "VALIDATOR",
                amount_source = transactionContext.fee,
                amount_destination = transactionContext.fee,
            )
        )

        # Add priority fee transfer from fee payer to fee account
        # Only if priority fee is > 0
        if transactionContext.priority_fee > 0:
            fee_payer_account_version = self.prepare_source_account_version(
                source_address = transactionContext.fee_payer,
                amount_lamport = transactionContext.priority_fee)
            
            fee_account = self.prepare_destination_account_version(
                account_version_source = fee_payer_account_version, 
                destination_address = FEE, 
                amount_lamport=transactionContext.priority_fee,
                account_type = AccountType.FEE_ACCOUNT
            )
            
            self.transactionContext.graph.add_edge(
                source = fee_payer_account_version.get_vertex(),
                target = fee_account.get_vertex(),
                transfer_properties = TransferProperties(
                    transfer_type = TransferType.PRIORITY_FEE,
                    program_address = "VALIDATOR",
                    amount_source = transactionContext.priority_fee,
                    amount_destination = transactionContext.priority_fee,
                )
            )