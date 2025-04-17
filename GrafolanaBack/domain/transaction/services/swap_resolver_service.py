import logging
import networkx as nx
from typing import Dict, List, Optional, Set, Tuple, Any

from GrafolanaBack.domain.transaction.models.account import AccountVertex
from GrafolanaBack.domain.transaction.models.graph import TransactionGraph, TransferType, TransferProperties
from GrafolanaBack.domain.transaction.models.swap import Swap, TransferAccountAddresses
from GrafolanaBack.domain.transaction.models.transaction_context import TransactionContext
from GrafolanaBack.domain.transaction.repositories.account_repository import AccountRepository

log = logging.getLogger(__name__)

class SwapResolverService:
    """
    Service for resolving swap paths in transaction graphs.
    
    This service analyzes the graph to determine how tokens flow through
    a swap operation, including amount in, amount out, and fees.
    """

    def __init__(self, accountRepository: AccountRepository):
        self.accountRepository = accountRepository
    
    def resolve_swap_paths(self, transaction_context: TransactionContext) -> None:
        """
        Resolve paths for a swap operation in the graph.
        
        This adds a direct edge between pool accounts to represent the swap.
        
        Args:
            graph: The transaction graph
            swap: The swap operation to resolve
        """
        """Resolve swap paths in the transaction graph."""
        # For each swap, find paths between accounts
        swap: Swap
        for swap in transaction_context.swaps:
            # Skip swaps that are router
            if swap.router:
                continue
                
            # Use the swap resolver service to resolve the swap paths
            self.resolve_swap(transaction_context, swap)


    def resolve_swap(self, transaction_context: TransactionContext, swap: Swap) -> None:
        """
        Resolve a swap operation in the transaction graph.
        """

        subgraph = transaction_context.graph.create_subgraph_for_swap(swap)
        
        # Get all vertices with the relevant addresses
        user_source_vertices = [v for v in subgraph.nodes() if v.address == swap.get_user_source()]
        user_dest_vertices = [v for v in subgraph.nodes() if v.address == swap.get_user_destination()]
        
        # Find the best source and destination vertices
        # Usually the earliest version for source (before swap happens) and 
        # latest version for destination (after swap completes)
        user_source_vertex = min(user_source_vertices, key=lambda v: v.version) if user_source_vertices else None
        user_dest_vertex = max(user_dest_vertices, key=lambda v: v.version) if user_dest_vertices else None
        if (user_source_vertex is None) or (user_dest_vertex is None):
            log.error(f"user vertices not found for swap {swap}, source: {user_source_vertex}, destination: {user_dest_vertex}, tx: {transaction_context.transaction_signature}")
            return

        swap_pools : List[AccountVertex]= []
        # If pools are stored as source/destination
        if isinstance(swap.pool_addresses, TransferAccountAddresses):
            swap_pools.extend([v for v in subgraph.nodes() if v.address == swap.pool_addresses.destination])
            swap_pools.extend([v for v in subgraph.nodes() if v.address == swap.pool_addresses.source])
        # If pools are stored as a list of pools
        else:
            swap_pools = [v for v in subgraph.nodes() if v.address in swap.pool_addresses]
        # Search through list of pool's addresses for paths:
        #  - from user_source 
        #  - to user_destination
        pool_dest_vertices = []
        pool_source_vertices = []
        
        # Might not be perfect..
        for pool in swap_pools:
            # Set is_pool to True for all pools in the mapping
            self.accountRepository.accounts.get(pool.address).is_pool = True
            if nx.has_path(subgraph,user_source_vertex, pool):
                pool_dest_vertices.append(pool)
            if nx.has_path(subgraph,pool, user_dest_vertex):
                pool_source_vertices.append(pool)

        pool_dest_vertex: AccountVertex = max(pool_dest_vertices, key=lambda v: v.version) if pool_dest_vertices else None
        pool_source_vertex: AccountVertex = min(pool_source_vertices, key=lambda v: v.version) if pool_source_vertices else None
        if (pool_dest_vertex is None) or (pool_source_vertex is None):
            log.error(f"pool vertices not found for swap {swap}, source: {user_source_vertex.address}, destination: {user_dest_vertex.address}, tx: {transaction_context.transaction_signature}")
            return

        log.debug("finding paths for:  user_source_vertex:", user_source_vertex, "pool_dest_vertex", pool_dest_vertex)
        # Find path from user_source to pool_destination
        try:
            path_a = nx.shortest_path(subgraph, user_source_vertex, pool_dest_vertex)
            if len(path_a) < 2:
                log.error(f"path user -> pool too short for swap {swap}, source: {user_source_vertex.address}, destination: {pool_dest_vertex.address}, tx: {transaction_context.transaction_signature}")
                return
            _ , _ , data = transaction_context.graph.get_last_transfer(path_a, subgraph)
            amount_in = sum(edge_data["amount_destination"] for edge_data in data.values())
            
            # Create a new transfer key for the swap
            # We take the key of the transfer before the swap, and add 1 to it
            swap_transfer_key = int(list(data.keys())[0]) + 1

        except nx.NetworkXNoPath:
            # Handle case where path doesn't exist
            log.error(f"path doesn't exist for swap {swap}, source: {user_source_vertex.address}, destination: {pool_dest_vertex.address}, tx: {transaction_context.transaction_signature}")
            return

        log.debug("finding paths for:  pool_source_vertex:", pool_source_vertex, "user_dest_vertex", user_dest_vertex)
        # Find path from pool_source to user_destination
        try:
            path_b = nx.shortest_path(subgraph, pool_source_vertex, user_dest_vertex)
            if len(path_b) < 2:
                log.error(f"path pool -> user too short for swap {swap}, source: {pool_source_vertex.address}, destination: {user_dest_vertex.address}, tx: {transaction_context.transaction_signature}")
                return
            _ , _ , data = transaction_context.graph.get_first_transfer(path_b, subgraph)
            real_swap_amount_out = sum(edge_data["amount_source"] for edge_data in data.values())

            # Calculate amount_out by summing the amount_source of all edges with swap.user_addresses.destination as destination 
            # minus the sum of all edges with swap.user_addresses.destination as source
            # don't count edges where swap.user_addresses.destination is both source and destination
            amount_out = 0
            source: AccountVertex
            destination: AccountVertex
            for source, destination, data in subgraph.edges(data=True):
                if source.address==swap.user_addresses.destination and destination.address != swap.user_addresses.destination:
                    amount_out -= data["amount_source"]
                if destination.address==swap.user_addresses.destination and source.address != swap.user_addresses.destination:
                    amount_out += data["amount_source"]
                

        except nx.NetworkXNoPath:
            # Handle case where path doesn't exist
            log.error(f"path doesn't exist for swap {swap}, source: {pool_source_vertex.address}, destination: {user_dest_vertex.address}, tx: {transaction_context.transaction_signature}")
            return
        
        swap.fee = real_swap_amount_out - amount_out

        transaction_context.graph.add_edge(
                    source = pool_dest_vertex, 
                    target = pool_source_vertex,
                    transfer_properties = TransferProperties(
                        transfer_type = TransferType.SWAP,
                        program_address = swap.program_address,
                        amount_source = amount_in,
                        amount_destination = amount_out,
                        swap_id = swap.id,
                    ),
                    key = swap_transfer_key)
        
        log.info(f"Resolved swap {swap.id} with amount_in={amount_in}, amount_out={amount_out}, fee={swap.fee}, tx: {transaction_context.transaction_signature}")
    
    def _calculate_amount_in_from_balance_changes(self, graph: TransactionGraph, swap: Swap) -> int:
        """
        Calculate amount sent to a swap by analyzing balance changes in accounts.
        
        This is used as a fallback when path finding fails.
        
        Args:
            graph: The transaction graph
            swap: The swap to analyze
            
        Returns:
            The amount sent to the swap (amount_in)
        """
        # Find all vertices with the user's source address
        user_source_vertices = graph.get_nodes_by_address(swap.get_user_source())
        if len(user_source_vertices) < 2:
            return 0
            
        # Sort by version and take first and last
        user_source_vertices.sort(key=lambda v: v.version)
        first_vertex = user_source_vertices[0]
        last_vertex = user_source_vertices[-1]
        
        # Calculate balance difference
        amount_in = 0
        
        # Find all outgoing transfer edges from source account to non-source accounts
        for u, v, k, data in graph.graph.edges(data=True, keys=True):
            if u.address == swap.get_user_source() and v.address != swap.get_user_source():
                if data.get("swap_parent_id") == swap.id:
                    amount_in += data["amount_source"]
        
        return amount_in
    
    def _calculate_amount_out_from_balance_changes(self, graph: TransactionGraph, swap: Swap) -> int:
        """
        Calculate amount received from a swap by analyzing balance changes in accounts.
        
        This is used as a fallback when path finding fails.
        
        Args:
            graph: The transaction graph
            swap: The swap to analyze
            
        Returns:
            The amount received from the swap (amount_out)
        """
        # Find all vertices with the user's destination address
        user_dest_vertices = graph.get_nodes_by_address(swap.get_user_destination())
        if len(user_dest_vertices) < 2:
            return 0
            
        # Sort by version and take first and last
        user_dest_vertices.sort(key=lambda v: v.version)
        first_vertex = user_dest_vertices[0]
        last_vertex = user_dest_vertices[-1]
        
        # Calculate amount out by summing incoming transfers to destination account
        amount_out = 0
        
        # Find all incoming transfer edges to destination account from non-destination accounts
        for u, v, k, data in graph.graph.edges(data=True, keys=True):
            if v.address == swap.get_user_destination() and u.address != swap.get_user_destination():
                if data.get("swap_parent_id") == swap.id:
                    amount_out += data["amount_destination"]
        
        return amount_out
    
    def analyze_swap_flow(self, graph: TransactionGraph, swap: Swap) -> Dict[str, Any]:
        """
        Analyze the flow of tokens in a swap operation.
        
        Args:
            graph: The transaction graph
            swap: The swap to analyze
            
        Returns:
            Dictionary containing swap flow analysis
        """
        # Get subgraph for this swap
        swap_edges = [(u, v, k) for u, v, k, data in graph.graph.edges(data=True, keys=True) 
                     if data.get('swap_parent_id') == swap.id or data.get('swap_id') == swap.id]
        
        if not swap_edges:
            return {
                "swap_id": swap.id,
                "error": "No transfers found for this swap"
            }
        
        subgraph = graph.graph.edge_subgraph(swap_edges)
        
        # Get the SWAP edge if it exists
        swap_edge = None
        for u, v, k, data in graph.graph.edges(data=True, keys=True):
            if data.get('swap_id') == swap.id and data.get('transfer_type') == TransferType.SWAP:
                swap_edge = (u, v, k, data)
                break
        
        # Extract swap details
        if swap_edge:
            u, v, k, data = swap_edge
            return {
                "swap_id": swap.id,
                "amount_in": data.get("amount_source", 0),
                "amount_out": data.get("amount_destination", 0),
                "fee": swap.fee,
                "program_address": data.get("program_address", ""),
                "source_pool": u.address,
                "destination_pool": v.address,
                "user_source": swap.get_user_source(),
                "user_destination": swap.get_user_destination(),
                "router": swap.is_router_swap()
            }
        
        # If no SWAP edge, calculate from regular transfers
        total_in = 0
        total_out = 0
        
        # Calculate total amount sent by user to pools
        for u, v, k, data in subgraph.edges(data=True, keys=True):
            if u.address == swap.get_user_source() and v.address != swap.get_user_source():
                total_in += data.get("amount_source", 0)
                
            if v.address == swap.get_user_destination() and u.address != swap.get_user_destination():
                total_out += data.get("amount_destination", 0)
        
        return {
            "swap_id": swap.id,
            "amount_in": total_in,
            "amount_out": total_out,
            "fee": swap.fee,
            "program_address": swap.program_address,
            "user_source": swap.get_user_source(),
            "user_destination": swap.get_user_destination(),
            "router": swap.is_router_swap(),
            "note": "Calculated from transfers (no SWAP edge found)"
        }