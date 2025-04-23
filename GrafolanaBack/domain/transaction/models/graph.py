from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Set, Tuple, Any, Generic, TypeVar
import networkx as nx
from networkx import MultiDiGraph
from networkx import Graph

from GrafolanaBack.domain.transaction.models.account import AccountVertex
from GrafolanaBack.domain.transaction.models.swap import Swap
from GrafolanaBack.domain.logging.logging import logger

T = TypeVar('T')

class TransferType(str, Enum):
    """Types of edges that can exist in the transaction graph"""
    TRANSFER = "TRANSFER"
    CREATE_ACCOUNT = "CREATEACCOUNT"
    CLOSE_ACCOUNT = "CLOSEACCOUNT"
    BURN = "BURN"
    MINTTO= "MINTTO"
    NATIVE_SOL = "NATIVE_SOL"
    SWAP = "SWAP"
    SWAP_INCOMING = "SWAP_INCOMING"
    SWAP_OUTGOING = "SWAP_OUTGOING"
    FEE = "FEE"
    AUTHORIZE = "AUTHORIZE"
    PRIORITY_FEE = "PRIORITYFEE"
    SPLIT = "SPLIT"
    TRANSFERCHECKED = "TRANSFERCHECKED"
    WITHDRAW = "WITHDRAW"
    NEW_TRANSACTION = "NEW_TRANSACTION"
   

@dataclass
class TransferProperties:
    """Properties of a transfer in the transaction graph"""
    transfer_type: TransferType
    program_address: str
    amount_source: int
    amount_destination: int
    swap_id: Optional[int] = None
    swap_parent_id: Optional[int] = None
    parent_router_swap_id: Optional[int] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> TransferProperties:
        """Create EdgeProperties from a dictionary (e.g., from NetworkX)"""
        return cls(
            transfer_type=TransferType.from_string(data.get("transfer_type", TransferType.TRANSFER)),
            program_address=data.get("program_address", ""),
            amount_source=data.get("amount_source", 0),
            amount_destination=data.get("amount_destination", 0),
            swap_id=data.get("swap_id"),
            swap_parent_id=data.get("swap_parent_id"),
            parent_router_swap_id=data.get("parent_router_swap_id"),
            key=data.get("key")
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for NetworkX edge data"""
        result = {
            "transfer_type": self.transfer_type,
            "program_address": self.program_address,
            "amount_source": self.amount_source,
            "amount_destination": self.amount_destination
        }
        
        if self.swap_id is not None:
            result["swap_id"] = self.swap_id
        
        if self.swap_parent_id is not None:
            result["swap_parent_id"] = self.swap_parent_id

        if self.parent_router_swap_id is not None:
            result["parent_router_swap_id"] = self.parent_router_swap_id
            
        return result

class TransactionGraph:
    """
    A graph representation of a Solana transaction.
    
    This class wraps NetworkX's MultiDiGraph to provide a domain-specific
    interface for working with transaction graphs.
    """
    graph: nx.MultiDiGraph
    
    def __init__(self):
        """Initialize an empty transaction graph"""
        self.graph = nx.MultiDiGraph(directed=True)
        self._next_key = 10  # Starting key value for edges
    
    def add_node(self, vertex: AccountVertex) -> None:
        """
        Add an account vertex to the graph if it doesn't already exist.
        
        Args:
            vertex: The account vertex to add
        """
        if not self.graph.has_node(vertex):
            self.graph.add_node(vertex)
    
    def has_node(self, vertex: AccountVertex) -> bool:
        """
        Check if an account vertex exists in the graph.
        
        Args:
            vertex: The account vertex to check
        
        Returns:
            True if the vertex exists, False otherwise
        """
        return self.graph.has_node(vertex)
    
    def has_path(self, source: AccountVertex, target: AccountVertex) -> bool:
        """
        Check if there is a path from source to target in the graph.
        
        Args:
            source: The source account vertex
            target: The target account vertex
        
        Returns:
            True if a path exists, False otherwise
        """
        return nx.has_path(self.graph, source, target)
    
    def add_edge(self, 
                source: AccountVertex, 
                target: AccountVertex, 
                transfer_properties: TransferProperties,
                key:int = None) -> int:
        """
        Add an edge between two account vertices.
        
        Args:
            source: The source account vertex
            target: The target account vertex
            edge_properties: Properties of the edge
        
        Returns:
            The key of the new edge
        """       
        # Generate a key if not provided
        if key is None:
            key = self._next_key
            self._next_key += 10
        
        # Add the edge
        self.graph.add_edge(
            source, 
            target, 
            key=key,
            **transfer_properties.to_dict()
        )
        
        return key
    
    def get_edge_data(self, source: AccountVertex, target: AccountVertex) -> Dict[int, Dict[str, Any]]:
        """
        Get data for all edges between source and target.
        
        Args:
            source: The source account vertex
            target: The target account vertex
        
        Returns:
            Dictionary mapping edge keys to edge data
        """
        return self.graph.get_edge_data(source, target) or {}
    
    def get_edges(self, **filters) -> List[Tuple[AccountVertex, AccountVertex, int, Dict[str, Any]]]:
        """
        Get edges from the graph, optionally filtered by properties.
        
        Args:
            **filters: Edge data properties to filter by
        
        Returns:
            List of (source, target, key, data) tuples
        """
        if not filters:
            return list(self.graph.edges(data=True, keys=True))
        
        return [
            (u, v, k, data) for u, v, k, data in self.graph.edges(data=True, keys=True)
            if all(data.get(key) == value for key, value in filters.items())
        ]
    
    def get_subgraph_by_swap_id(self, swap_id: int) -> nx.MultiDiGraph:
        """
        Creates a subgraph containing only edges associated with the given swap ID.
        
        Args:
            swap_id: The swap ID to filter by
        
        Returns:
            NetworkX MultiDiGraph containing only the relevant edges
        """
        swap_edges = [
            (u, v, k) for u, v, k, data in self.graph.edges(data=True, keys=True) 
            if data.get('swap_parent_id') == swap_id
        ]
        
        return self.graph.edge_subgraph(swap_edges)
    
    def get_shortest_path(self, source: AccountVertex, target: AccountVertex) -> List[AccountVertex]:
        """
        Find the shortest path between two vertices.
        
        Args:
            source: The source account vertex
            target: The target account vertex
        
        Returns:
            List of account vertices forming the path
        
        Raises:
            nx.NetworkXNoPath if no path exists
        """
        return nx.shortest_path(self.graph, source, target)
    
    def get_nodes_by_address(self, address: str) -> List[AccountVertex]:
        """
        Get all nodes with the given address.
        
        Args:
            address: The account address to filter by
        
        Returns:
            List of AccountVertex objects with the given address
        """
        return [v for v in self.graph.nodes() if v.address == address]
    
    def isolate_nodes(self) -> List[AccountVertex]:
        """
        Find and return isolated nodes in the graph.
        
        Returns:
            List of isolated account vertices
        """
        return list(nx.isolates(self.graph))
    
    def remove_nodes(self, nodes: List[AccountVertex]) -> None:
        """
        Remove nodes from the graph.
        
        Args:
            nodes: List of account vertices to remove
        """
        self.graph.remove_nodes_from(nodes)
    
    # def to_dict(self) -> Dict[str, Any]:
    #     """
    #     Convert the graph to a dictionary representation.
        
    #     Returns:
    #         Dictionary representation of the graph
    #     """
    #     result = {
    #         "nodes": [],
    #         "links": []
    #     }
        
    #     # Process nodes
    #     node_ids = set()
    #     for vertex in self.graph.nodes():
    #         node_id = f"{vertex.address}_v{vertex.version}"
    #         if node_id not in node_ids:
    #             node_ids.add(node_id)
    #             result["nodes"].append({
    #                 "account_vertex": {
    #                     "address": vertex.address,
    #                     "version": vertex.version
    #                 }
    #             })
        
    #     # Process edges - sort by key for consistent ordering
    #     sorted_edges = sorted(self.graph.edges(data=True, keys=True), key=lambda x: x[2])
        
    #     for index, (source, target, key, data) in enumerate(sorted_edges, start=1):
    #         edge_data = {
    #             "key": index,
    #             "program_address": data["program_address"],
    #             "source_account_vertex": {
    #                 "address": source.address,
    #                 "version": source.version
    #             },
    #             "target_account_vertex": {
    #                 "address": target.address,
    #                 "version": target.version
    #             },
    #             "amount_source": data["amount_source"],
    #             "amount_destination": data["amount_destination"],
    #             "type": data["transfer_type"]
    #         }
            
    #         if "swap_id" in data:
    #             edge_data["swap_id"] = data["swap_id"]
    #             edge_data["group"] = data["swap_id"]
                
    #         if "swap_parent_id" in data:
    #             edge_data["swap_parent_id"] = data["swap_parent_id"]
    #             if "swap_id" not in data:  # Only set group if not already set
    #                 edge_data["group"] = data["swap_parent_id"]
            
    #         result["links"].append(edge_data)
        
    #     return result
    
    def create_subgraph_for_swap(self, swap: Swap)-> MultiDiGraph:
        """
        Creates a subgraph containing only edges associated with the given swap.
        
        Args:
            G: NetworkX DiGraph
            swap: The swap object to filter by
        
        Returns:
            NetworkX DiGraph containing only the relevant edges
        """
        # Get all edges with this swap
        swap_edges = [(u, v, k) for u, v, k, data in self.graph.edges(data=True, keys=True) 
                    if data.get('swap_parent_id') == swap.id]
        
        if not swap_edges:
            logger.warning(f"No edges found for swap {swap.id}")
            return
        
        # Create a new subgraph with just these edges
        return MultiDiGraph.edge_subgraph(self.graph, swap_edges)
        #return self.graph.edge_subgraph(swap_edges)
    
    @staticmethod
    def get_last_transfer(path: Dict, graph: MultiDiGraph)-> Tuple[AccountVertex,AccountVertex,Dict]:
        return (path[-2], path[-1], graph.get_edge_data(path[-2], path[-1]))
    
    @staticmethod
    def get_first_transfer(path: Dict, graph: MultiDiGraph)-> Tuple[AccountVertex,AccountVertex,Dict]:
        return (path[0], path[1], graph.get_edge_data(path[0], path[1]))
    
    def add_graph(self, graph: TransactionGraph) -> None:
        """
        Add another transaction graph to this graph.
        
        Args:
            graph: The transaction graph to add
        """
        nx.union(self.graph, graph.graph, self.graph)

class GraphWorkspace:
    """
    A workspace containing multiple transaction graphs for forensic analysis.
    
    This class manages a collection of transaction graphs and provides methods
    for analysis across them.
    """
    
    def __init__(self, name: str, owner_wallet: str):
        """
        Initialize a new graph workspace.
        
        Args:
            name: The name of the workspace
            owner_wallet: The wallet address of the workspace owner
        """
        self.id: str = ""  # Will be set when saved
        self.name: str = name
        self.owner_wallet: str = owner_wallet
        self.transaction_signatures: List[str] = []
        self.transaction_graphs: Dict[str, TransactionGraph] = {}
        self.combined_graph: Optional[TransactionGraph] = None
        self.visualization_settings: Dict[str, Any] = {}
        self.analysis_results: Dict[str, Any] = {}
    
    def add_transaction(self, signature: str, graph: Optional[TransactionGraph] = None) -> None:
        """
        Add a transaction to the workspace.
        
        Args:
            signature: The transaction signature
            graph: Optional pre-built transaction graph
        """
        if signature not in self.transaction_signatures:
            self.transaction_signatures.append(signature)
            
        if graph:
            self.transaction_graphs[signature] = graph
    
    def remove_transaction(self, signature: str) -> None:
        """
        Remove a transaction from the workspace.
        
        Args:
            signature: The transaction signature to remove
        """
        if signature in self.transaction_signatures:
            self.transaction_signatures.remove(signature)
            
        if signature in self.transaction_graphs:
            del self.transaction_graphs[signature]
    
    def build_combined_graph(self) -> TransactionGraph:
        """
        Combine all transaction graphs into a single graph.
        
        Returns:
            The combined transaction graph
        """
        # This is a placeholder that would need to be implemented
        # It would need to handle merging multiple transaction graphs,
        # potentially mapping account versions across transactions
        self.combined_graph = TransactionGraph()
        # Implementation details would go here
        return self.combined_graph
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the workspace to a dictionary representation.
        
        Returns:
            Dictionary representation of the workspace
        """
        return {
            "id": self.id,
            "name": self.name,
            "owner_wallet": self.owner_wallet,
            "transaction_signatures": self.transaction_signatures,
            "visualization_settings": self.visualization_settings,
            "analysis_results": self.analysis_results
        }