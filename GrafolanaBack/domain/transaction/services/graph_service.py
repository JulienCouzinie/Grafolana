from typing import Dict, List, Optional, Set, Tuple, Any
import networkx as nx
from networkx import Graph
from solders.pubkey import Pubkey

from GrafolanaBack.domain.prices.sol_price_service import SOLPriceService
from GrafolanaBack.domain.prices.sol_price_utils import round_timestamp_to_minute
from GrafolanaBack.domain.transaction.models.account import AccountType, AccountVertex, AccountVersion
from GrafolanaBack.domain.transaction.models.graph import TransactionGraph, TransferProperties, TransferType
from GrafolanaBack.domain.transaction.config.constants import REFERENCE_COINS, SOL, WRAPPED_SOL_ADDRESS
from GrafolanaBack.domain.transaction.models.graphspace import Graphspace
from GrafolanaBack.domain.transaction.models.swap import TransferAccountAddresses
from GrafolanaBack.domain.transaction.models.transaction_context import TransactionContext
from GrafolanaBack.domain.transaction.utils.utils import get_sol_price, get_token_price
from GrafolanaBack.domain.logging.logging import logger

class GraphService:
    @staticmethod
    def analyse_isomorphic_transactions(graphspace: Graphspace) -> None:
        """
        Analyze isomorphic transactions in the graphspace and update the graph accordingly.
        Compare all transactions together and check if they are isomorphic using the networkx library.
        When 2 graphs are isomophic we define an isomorphic group for them and assign it to their respective transaction context.
        Once a transaction context is assigned to a group, it won't be compared to other transactions
        
        Args:
            graphspace: The graphspace containing transaction contexts
        """

        # Convert all transaction graphs to cyclic graphs into a new dict
        cyclic_graphs: Dict[str, Graph] = {}
        for sig, context in graphspace.transaction_contexts.items():
            cyclic_graphs[sig] = GraphService.convert_dag_to_cyclicgraph(context.graph.graph)
        
        # Create a mapping of isomorphic groups
        # This will be a dict of {group_id: [transaction_signatures]}
        isomorphic_groups: Dict[int, List[str]] = {}
        group_id = 0
        
        # Iterate through all transaction graphs and check for isomorphism
        for sig_a, graph_a in cyclic_graphs.items():
            # Skip if already assigned to a group
            if any(sig_a in group for group in isomorphic_groups.values()):
                continue
            
            # Initialize a new group for this transaction
            group_id += 1
            isomorphic_groups[group_id] = [sig_a]

            # Compare with all other graphs
            for sig_b, graph_b in cyclic_graphs.items():
                if sig_a == sig_b or any(sig_b in group for group in isomorphic_groups.values()):
                    continue

                # Check if the graphs are isomorphic
                if nx.is_isomorphic(graph_a, graph_b):
                    # logger.info(f"Transaction {sig_a} and {sig_b} are isomorphic.")
                    isomorphic_groups[group_id].append(sig_b)
                    graphspace.transaction_contexts[sig_a].isomorphic_group = group_id
                    graphspace.transaction_contexts[sig_b].isomorphic_group = group_id




        logger.info(f"Isomorphic groups found: {len(isomorphic_groups)}")

        # for i, (sig_a, graph_a) in enumerate(transaction_graphs.items()):
        #     if sig_a in isomorphic_groups:
        #         continue
        #     for j, (sig_b, graph_b) in enumerate(transaction_graphs.items()):
        #         if sig_a == sig_b or sig_b in isomorphic_groups:
        #             continue
        #         # Check if the graphs are isomorphic
        #         if nx.could_be_isomorphic(graph_a.graph, graph_b.graph):
        #             logger.info(f"Transaction {sig_a} and {sig_b} are isomorphic.")
        #             # If they are isomorphic, assign them to the same group
        #             isomorphic_group_id = len(isomorphic_groups) + 1
        #             isomorphic_groups[sig_a] = isomorphic_group_id
        #             isomorphic_groups[sig_b] = isomorphic_group_id
        #             transaction_contexts[sig_a].isomorphic_group = isomorphic_group_id
        #             transaction_contexts[sig_b].isomorphic_group = isomorphic_group_id


    def convert_dag_to_cyclicgraph(dag: nx.MultiDiGraph) -> Graph:
        """
        Convert a directed acyclic graph (DAG) by aggregating all links 
        that have same source adress and same target address into a single link.

        Returns a dict of cyclic graphs, one for each transaction signature.
        Args:
            transaction_context: The transaction context containing the graph to be converted
        """
        seenLinks: Dict[str, str] = {}
        
        cyclic_graph = Graph()
        source: AccountVertex
        target: AccountVertex
        # Iterate through all edges in the original graph
        for source, target, data in dag.edges(data=True):
            key = f"{source.address}_{target.address}"
            # Check if the edge has already been seen
            if not key in seenLinks:
                # If not, add it to the cyclic graph
                cyclic_graph.add_edge(source.address, target.address, **data)
                seenLinks[key] = key

        return cyclic_graph

    @staticmethod
    def _derive_usd_price_ratio(context: TransactionContext, sol_price: float) -> Dict[str, Any]:
        """
        Derive USD prices ratio for all tokens based on swaps and reference prices.
        It's only considered a ratio as it doesn't take into account the number of decimals for each mint
        
        Args:
            swaps: List of swap objects with mint_source, mint_destination, amount_source, amount_destination
            reference_prices: Dict of {mint: usd_price} for reference tokens
        
        Returns:
            Dict mapping mint addresses to their derived USD prices
        """

        mint_price_map = {}

        swap_edges = [(u, v, data) for u, v, data in context.graph.graph.edges(data=True) if data["transfer_type"] == TransferType.SWAP]

        sol_usd_price = sol_price
        reference_prices = {mint: get_token_price(mint, sol_usd_price) for mint in REFERENCE_COINS}
        # Initialize the mint price map with reference prices
        for mint,price in reference_prices.items():
            mint_price_map[mint] = {
                'price': price,
                'reference_mint': mint
            }
        
        source: AccountVertex
        destination: AccountVertex
        data: dict
        # Continue until we can't derive any more prices
        made_progress = True
        iterations = 0
        max_iterations = len(swap_edges) * 2  # Safety limit to prevent infinite loops
        while made_progress and iterations < max_iterations:
            made_progress = False
            iterations += 1
            for source,destination,data in swap_edges:
                mint_source = context.account_repository.accounts.get(source.address).mint_address
                mint_destination = context.account_repository.accounts.get(destination.address).mint_address
                amount_source = data["amount_source"]
                amount_destination = data["amount_destination"]

                # Skip invalid swaps
                if amount_source <= 0 or amount_destination <= 0:
                    continue
                    
                # Derive prices accounting for decimal differences
                if mint_source in mint_price_map and mint_destination not in mint_price_map:
                    # Track the original reference used for this derivation
                    reference_token = mint_price_map[mint_source]['reference_mint']

                    total_value = mint_price_map[mint_source]['price'] * amount_source
                    price_b = total_value / amount_destination
                    mint_price_map[mint_destination] = {
                        'price': price_b,
                        'reference_mint': reference_token
                    }
                    made_progress = True
                    
                elif mint_destination in mint_price_map and mint_source not in mint_price_map:
                    # Track the original reference used for this derivation
                    reference_token = mint_price_map[mint_destination]['reference_mint']

                    total_value = mint_price_map[mint_destination]['price'] * amount_destination
                    price_a = total_value / amount_source
                    mint_price_map[mint_source] =  {
                        'price': price_a,
                        'reference_mint': reference_token
                    }
                    
                    made_progress = True

        # Return what we have with a warning if we hit the limit
        if iterations > max_iterations:
            logger.warning(f"Price derivation hit iteration limit for transaction. Partial derivation returned. Transaction signature: {context.transaction_signature}")

        return mint_price_map
    
    @staticmethod
    def _get_swaps_data(context: TransactionContext) -> List[Dict[str, Any]]:
        """
        Convert swap data from the graph to a format suitable for frontend visualization.
        
        Args:
            context: The transaction context
        
        Returns:
            List of dictionaries containing swap data
        """
        swaps_data = []
        for swap in context.swaps:
            swap_pools = []
            # If pools are stored as source/destination
            if not swap.router:
                if isinstance(swap.pool_addresses, TransferAccountAddresses):
                    swap_pools.extend([swap.pool_addresses.source, swap.pool_addresses.destination])
                else:
                    swap_pools.extend(swap.pool_addresses)
                
            swap_data = {
                "id": swap.id,
                "program_address": swap.program_address,
                "router": swap.router,
                "instruction_name" : swap.instruction_name,
                "user_addresses": swap.user_addresses,
                "program_account_vertex": swap.program_account_vertex.to_dict(),
                "fee": swap.fee,
            }
            if not swap.router:
                swap_data.update({"pool_addresses": swap_pools})
           
            swaps_data.append(swap_data)

        return swaps_data
    
    @staticmethod
    def _get_edges_data(context: TransactionContext) -> List[Dict[str, Any]]:
        """
        Convert edges from the graph to a format suitable for frontend visualization.
        
        Args:
            context: The transaction context

        returns:
            List of dictionaries containing edge data
        """
        source: AccountVertex
        dest: AccountVertex
        key: str
        data: dict
        # First get all edges and sort them by key
        sorted_edges = sorted(context.graph.graph.edges(data=True, keys=True), key=lambda x: x[2])  # x[2] is the key

        edges_data = []

        # get list of swaps id
        swap_ids = [swap.id for swap in context.swaps]

        # Then process them with an index counter
        for index, (source, dest, key, data) in enumerate(sorted_edges, start=1):

            edge_data = {
                "key": key,
                "program_address": data["program_address"],
                "source_account_vertex": source.to_dict(),
                "target_account_vertex": dest.to_dict(),
                "amount_source": data["amount_source"],
                "amount_destination": data["amount_destination"],
                "type": data["transfer_type"],
                "transaction_signature": context.transaction_signature,
            }

            if data["transfer_type"] == TransferType.SWAP:
                edge_data["swap_id"] = data["swap_id"]

            # Handle swap-specific data
            if "swap_parent_id" in data and data["swap_parent_id"]:
                if data["swap_parent_id"] in swap_ids:
                    edge_data["swap_parent_id"] = data["swap_parent_id"]
            
            if "parent_router_swap_id" in data and data["parent_router_swap_id"]:
                if data["parent_router_swap_id"] in swap_ids:
                    edge_data["parent_router_swap_id"] = data["parent_router_swap_id"]
                


            edges_data.append(edge_data)

        return edges_data
    
    @staticmethod
    def _get_nodes_data(context: TransactionContext) -> Dict[str, Any]:
        """
        Convert nodes from the graph to a format suitable for frontend visualization.
        
        Args:
            context: The transaction context
            
        returns:
            List of dictionaries containing node data"""
        nodes_data = []
        # Process nodes from account_version_mapping
        for address, versions in context.account_repository.account_versions.items():
            for version in versions:
                account_vertex = AccountVertex(address, version.version, context.transaction_signature)
                if context.graph.has_node(account_vertex):
                    account_vertex_data = dict()
                    account_vertex_data["address"] = address
                    account_vertex_data["version"] = version.version
                    account_vertex_data["transaction_signature"] = account_vertex.transaction_signature

                    isOnCurve = False
                    if (version.type not in [AccountType.BURN_ACCOUNT, AccountType.FEE_ACCOUNT, AccountType.MINTTO_ACCOUNT, AccountType.UNKNOWN]):
                        isOnCurve = Pubkey.from_string(address).is_on_curve()
                        
                    node_data = {
                        "account_vertex": account_vertex_data,
                        "mint_address": version.account.mint_address,
                        "owner": version.owner,
                        "authorities": version.account.authorities,
                        "balance_token": version.balance_token,
                        "balance_lamport": version.balance_lamport,
                        "type": version.account.type,
                        "is_pool": version.account.is_pool,
                        "isOnCurve": isOnCurve,
                    }
                    nodes_data.append(node_data)
        return nodes_data
    
    @staticmethod
    def set_graph_data(context: TransactionContext, graph_data: dict[str, Any]):
        """
        Convert a transaction context to a format suitable for frontend visualization.
        
        Args:
            context: The transaction context
        
        Returns:
            Dictionary containing all transaction data for frontend visualization
        """
        graph_data["transactions"][context.transaction_signature] = {
                "fees": {"fee": context.fee, "priority_fee": context.priority_fee},
                "signers": list(context.signer_wallets),
                "swaps": GraphService._get_swaps_data(context),
                "accounts" : context.account_repository.get_all_accountTransactions(),
                "mint_usd_price_ratio": {},
                "isomorphic_group": context.isomorphic_group,
                "timestamp": context.blocktime*1000,
            }

        # Process nodes from account_version_mapping & graph
        nodes = GraphService._get_nodes_data(context)
        graph_data["nodes"].extend(nodes)
        # Process edges from the graph
        links = GraphService._get_edges_data(context)
        graph_data["links"].extend(links)
        
    @staticmethod
    def _get_empty_graph_data() -> Dict[str, Any]:
        """
        Get an empty graph data structure for frontend visualization.
        
        Returns:
            Dictionary containing empty graph data
        """
        return {
            "transactions": {},
            "nodes": [],
            "links": [],
        }

    @staticmethod
    def get_graph_data(context: TransactionContext) -> Dict[str, Any]:
        """
        Convert a transaction context to a graph for front end.
        
        Args:
            context: The transaction context
            
        Returns:
            Dictionary containing all graph data for frontend visualization
        """

        graph_data = GraphService._get_empty_graph_data()

        GraphService.set_graph_data(context, graph_data)

        sol_price_service = SOLPriceService()
        sol_usd_price = sol_price_service.get_sol_price(context.blocktime*1000)
        graph_data["transactions"][context.transaction_signature] ["mint_usd_price_ratio"] = GraphService._derive_usd_price_ratio(context, sol_usd_price)
        
        return graph_data

    @staticmethod
    def get_graph_data_from_graphspace(graphspace: Graphspace) -> Dict[str, Any]:
        """
        Convert a graphspace to a graph for front end, with optimized parallel processing
        of price ratio calculations.
        
        Args:
            graphspace: The graphspace containing transaction contexts
            
        Returns:
            Dictionary containing all graph data for frontend visualization
        """

        graph_data = GraphService._get_empty_graph_data()

        all_timestamps = [context.blocktime*1000 for context in graphspace.transaction_contexts.values()]

        sol_price_service = SOLPriceService()
        sol_usd_price = sol_price_service.get_sol_prices_batch(all_timestamps)
        
        # Now build the graph data sequentially using the pre-computed price ratios
        for context in graphspace.transaction_contexts.values():
            GraphService.set_graph_data(context, graph_data)
            graph_data["transactions"][context.transaction_signature]["mint_usd_price_ratio"] = GraphService._derive_usd_price_ratio(context, sol_usd_price[context.blocktime*1000])
     
        return graph_data