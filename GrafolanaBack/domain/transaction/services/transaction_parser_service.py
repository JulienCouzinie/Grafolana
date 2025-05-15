import copy
import json
import time
from typing import Dict, List, Optional, Set, Tuple, Any, cast

from solders.signature import Signature
from solders.pubkey import Pubkey
from solders.transaction_status import  EncodedConfirmedTransactionWithStatusMeta, EncodedTransactionWithStatusMeta

from GrafolanaBack.domain.transaction.models.account import AccountType
from GrafolanaBack.domain.transaction.models.graph import TransactionGraph
from GrafolanaBack.domain.transaction.factories.account_factory import AccountFactory
from GrafolanaBack.domain.transaction.services.instruction_parser_service import InstructionParserService
from GrafolanaBack.domain.performance.timing_utils import timing_decorator
from GrafolanaBack.domain.transaction.models.transaction_context import TransactionContext
from GrafolanaBack.domain.transaction.models.graphspace import Graphspace
from GrafolanaBack.domain.transaction.repositories.account_repository import AccountRepository
from GrafolanaBack.domain.transaction.services.graph_builder_service import GraphBuilderService
from GrafolanaBack.domain.transaction.services.graph_service import GraphService
from GrafolanaBack.domain.transaction.services.swap_resolver_service import SwapResolverService
from GrafolanaBack.domain.transaction.services.transaction_service import TransactionService
from GrafolanaBack.domain.transaction.utils.instruction_utils import Parsed_Instruction, get_instruction_call_stack
from GrafolanaBack.domain.caching.cache_utils import cache
from GrafolanaBack.domain.rpc.rpc_connection_utils import client
from GrafolanaBack.domain.rpc.rpc_web_api import get_block_transactions
from GrafolanaBack.domain.logging.logging import logger

class TransactionParserService:
    """
    Service responsible for parsing Solana transactions into a structured graph representation.
    
    This service orchestrates the parsing process, delegating to specialized parsers
    for different instruction types and building the transaction graph.
    """
    
    def __init__(self):
        #self.account_repository = AccountRepository()
        self.instruction_parser_service = InstructionParserService()
        #self.swap_resolver_service = SwapResolverService(self.account_repository)
        self.graph_service = GraphService()  
        self.transaction_service = TransactionService()
    
    # @timing_decorator
    def parse_transaction(self, transaction_signature: str, transaction: EncodedTransactionWithStatusMeta, block_time: int, slot: int) -> TransactionContext:
        """
        Parse a transaction by its signature, building a graph representation of the transaction.
        
        Args:
            encoded_transaction: The encoded transaction to parse
            
        Returns:
            A TransactionContext object containing the graph and all related transaction data
        """

        # Create an empty graph and repositories
        graph = TransactionGraph()

        # Extract basic transaction info
        # blocktime = encoded_transaction.block_time
        # transaction = encoded_transaction.transaction
        
        # Extract account addresses and signers
        accounts = transaction.transaction.message.account_keys
        signer_wallets = {str(account.pubkey) for account in accounts if hasattr(account, 'signer') and account.signer}
        account_addresses = [str(parsed_account.pubkey) for parsed_account in accounts]
        fee_payer = str(accounts[0].pubkey)
        
        # Extract balance info
        pre_token_balances = transaction.meta.pre_token_balances
        post_token_balances = transaction.meta.post_token_balances
        pre_balances = transaction.meta.pre_balances
        post_balances = transaction.meta.post_balances

        account_repository = AccountRepository()
        
        # Initialize accounts from balance info
        AccountFactory.build_accounts_from_transaction(
            account_repository,
            pre_token_balances,
            post_token_balances,
            pre_balances,
            account_addresses,
            signer_wallets,
            transaction_signature
        )

        err = transaction.meta.err.to_json() if transaction.meta.err else None

        # Parse instructions
        instructions = get_instruction_call_stack(transaction)
        
        # Parse transaction context
        transaction_context = TransactionContext(
            slot=slot,
            transaction_signature=transaction_signature,
            graph=graph,
            account_repository=account_repository,
            signer_wallets=signer_wallets,
            blocktime=block_time,
            fee=transaction.meta.fee,
            fee_payer=fee_payer,
            compute_units_consumed=transaction.meta.compute_units_consumed,
            err=err,
            instructions=instructions,
        )

        if err:
            logger.info(f"Transaction {transaction_signature} has an error: {err}")
            return transaction_context
        
        # Process instructions to build the graph
        self._process_instructions(instructions, transaction_context)
        
        GraphBuilderService.add_fee_transfers(transaction_context)

        swap_resolver_service = SwapResolverService(account_repository)

        swap_resolver_service.resolve_swap_paths(transaction_context)
        
        return transaction_context
    
    
    # @cache.memoize(name="transaction_parser_service.get_transaction_graph_data")
    def get_transaction_graph_data(self, transaction_signature: str) -> Dict[str, Any]:
        """
        Get a JSON representation of a transaction graph that can be used by the frontend.
        
        Args:
            transaction_signature: The transaction signature
            user_wallet: The wallet address of the user viewing the transaction
        
        Returns:
            Dictionary containing the graph data ready for frontend visualization
        """

        # Fetch the transaction
        encoded_transaction = self.transaction_service.get_transaction(Signature.from_string(transaction_signature))
        if not encoded_transaction:
            logger.error(f"Transaction {transaction_signature} not found")
            return None
        
        graph_data = self.parse_and_get_graph_data(transaction_signature, encoded_transaction, {})
        
        return graph_data
    
    def parse_and_get_graph_data(self, transaction_signature: str, encoded_transaction: EncodedConfirmedTransactionWithStatusMeta, error: Optional[Exception], w=None) -> Dict[str, Any]:
        # Parse the transaction and get the context
        context = self.parse_transaction(transaction_signature, encoded_transaction.transaction, encoded_transaction.block_time, encoded_transaction.slot)
        if not context:
            logger.error(f"Failed to parse transaction: {transaction_signature}")
            return {"nodes": [], "links": [], "swaps": [], "fees": {"fee": 0, "priority_fee": 0}}
        
        # Use GraphService to generate the frontend-friendly format
        graph_data = self.graph_service.get_graph_data(context)

        return graph_data
    
    def parse_transaction_call_back(self, transaction_signature: str, encoded_transaction: EncodedConfirmedTransactionWithStatusMeta) -> TransactionContext:
        # Parse the transaction and get the context
        context = self.parse_transaction(transaction_signature, encoded_transaction.transaction, encoded_transaction.block_time, encoded_transaction.slot)
        return context
    
    def get_multiple_transactions_graph_data(self, transaction_signatures: List[str]) -> Dict[str, Any]:
        """
        Get graph data for multiple transactions.
        
        Args:
            transaction_signatures: List of transaction signatures
        
        Returns:
            Dictionary containing the graph data for all transactions
        """
        # now = int(time.monotonic() * 1000)
        all_transaction_contex = self.transaction_service.get_transactions(transaction_signatures,self.parse_transaction_call_back)
        # timeittook = int(time.monotonic() * 1000) - now
        # logger.info(f"Time taken to get_transactions & parse them: {timeittook} ms")

        # Strip all_transaction_contex of transaction_context that are None
        all_transaction_contex = {sig: context for sig, context in all_transaction_contex.items() if context is not None}
        if not all_transaction_contex:
            return {"nodes": [], "links": [], "swaps": [], "fees": {"fee": 0, "priority_fee": 0}}

        

        # now = int(time.monotonic() * 1000)
        graphspace = Graphspace(all_transaction_contex)
        # timeittook = int(time.monotonic() * 1000) - now
        # logger.info(f"Time taken to Graphspace: {timeittook} ms")

        self.graph_service.analyse_isomorphic_transactions(graphspace)
        
        # now = int(time.monotonic() * 1000)
        graphdata = self.graph_service.get_graph_data_from_graphspace(graphspace)
        # timeittook = int(time.monotonic() * 1000) - now
        # logger.info(f"Time taken to get_graph_data_from_graphspace: {timeittook} ms")
        
        return graphdata
    
    def get_account_graph_data(self, account_address: str) -> Dict[str, Any]:
        """
        Get graph data for an account address.
        
        Args:
            account_address: The account address
        
        Returns:
            Dictionary containing the graph data for the account
        """
        # now = int(time.monotonic() * 1000)
        # Fetch the transaction signatures for the address
        transaction_signatures = self.get_account_signatures(account_address)
        # timeittook = int(time.monotonic() * 1000) - now
        # logger.info(f"Time taken to get_wallet_signatures: {timeittook} ms")
        
        # Get graph data for each transaction
        all_graph_data = self.get_multiple_transactions_graph_data(transaction_signatures)

        return all_graph_data

    
    def get_account_signatures(self, account_address: str, start_time: int = None, end_time: int = None) -> List[str]:
        """Scan a wallet for trade transactions within a time range."""
        account_pubkey = Pubkey.from_string(account_address)

        all_signatures = []
        try:
            all_signatures = client.get_signatures_for_address(account_pubkey, limit=1000).value
        except Exception as e:
            print(f"Error fetching signatures for {account_address}: {e}")
            return all_signatures
        
        if start_time is None or end_time is None:
            return [signature.signature for signature in all_signatures]

        signatures = []
        for sig in all_signatures:
            tx_time = sig.block_time
            if not tx_time or tx_time < start_time or tx_time > end_time:
                continue
            signatures.append(sig.signature)

        return signatures

    def get_block_graph(self, slot_number: int) -> Dict[str, Any]:
        block = get_block_transactions(slot=slot_number)
        
        if not block:
            logger.error(f"Block {slot_number} not found")
            return None
        
        if block.get("error"):
            logger.error(f"Error fetching block {slot_number}: {block['error']}")
            return {"Error": block["error"]["message"]}
        
        all_transaction_contex = {}
        transaction_json: Dict
        for transaction_json in block["result"]["transactions"]:
            transaction = EncodedTransactionWithStatusMeta.from_json(json.dumps(transaction_json))
            transaction_signature = transaction.transaction.signatures[0]
            context = self.parse_transaction(str(transaction_signature), transaction, block["result"]["blockTime"], slot_number)
            all_transaction_contex.update({transaction_signature: context})

        # Strip all_transaction_contex of transaction_context that are None
        all_transaction_contex = {sig: context for sig, context in all_transaction_contex.items() if context is not None}
        if not all_transaction_contex:
            return {"nodes": [], "links": [], "swaps": [], "fees": {"fee": 0, "priority_fee": 0}}

       # now = int(time.monotonic() * 1000)
        graphspace = Graphspace(all_transaction_contex)
        # timeittook = int(time.monotonic() * 1000) - now
        # logger.info(f"Time taken to Graphspace: {timeittook} ms")

        self.graph_service.analyse_isomorphic_transactions(graphspace)
        
        # now = int(time.monotonic() * 1000)
        graphdata = self.graph_service.get_graph_data_from_graphspace(graphspace)
        # timeittook = int(time.monotonic() * 1000) - now
        # logger.info(f"Time taken to get_graph_data_from_graphspace: {timeittook} ms")
        
        return graphdata

    def _process_instructions(self, instructions: List[Parsed_Instruction], context: TransactionContext, _parent_swap_id: int = None, _parent_router_swap_id: int = None) -> None:
        """Process a list of instructions and its inner instructions recursively."""

        for instruction in instructions:
            context.account_repository.get_account(instruction.program_address).type = AccountType.PROGRAM_ACCOUNT

            # Prevent parent_swap_id and parent_router_swap_id from being passed to sibling instructions
            parent_swap_id = _parent_swap_id
            parent_router_swap_id = _parent_router_swap_id
            # Try to parse as a transfer
            transfer_parsed = self.instruction_parser_service.parse_transfer(instruction, context, parent_swap_id, parent_router_swap_id)
            
            if not transfer_parsed:
                # Try to parse as a swap
                swap = self.instruction_parser_service.parse_swap(instruction, context, parent_router_swap_id)
                if swap:
                    inner_parent_swap_id = swap.id 
                    if swap.router:
                        parent_router_swap_id = swap.id
                else:
                    inner_parent_swap_id = parent_swap_id
            else:
                inner_parent_swap_id = parent_swap_id
            
            # Process inner instructions recursively
            if instruction.inner_instructions:
                self._process_instructions(instruction.inner_instructions, context, inner_parent_swap_id, parent_router_swap_id)

    def getJSONTransaction(self, tx_sig: str):
        tx = self.transaction_service.get_transaction(Signature.from_string(tx_sig))

        return tx.to_json()