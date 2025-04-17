


import copy
from typing import Any, Dict, List, Optional

from requests import Session
from GrafolanaBack.domain.transaction.models.account import AccountVersion
from GrafolanaBack.domain.transaction.models.graph import TransactionGraph, TransferProperties, TransferType
from GrafolanaBack.domain.transaction.models.transaction_context import TransactionContext
from GrafolanaBack.domain.rpc.rpc_connection_utils import client
from GrafolanaBack.domain.rpc.rpc_web_api import get_block


class Graphspace:
    """
    Class representing a graphspace which is a collection of transaction contexts 
    with their respective graphs merged into a single graph and accounts linked together.
    
    """
    transaction_contexts: Dict[str, TransactionContext]
    graph: TransactionGraph

    def __init__(self, transaction_contexts: Dict[str, TransactionContext]):
        self.transaction_contexts = transaction_contexts
        self.graph = TransactionGraph()
        self._build_graph()

    def _get_transaction_signatures_from_slot(self, slot: int) -> Optional[List[str]]:
        block = get_block(slot)
        if block and "signatures" in block['result']:
           return block['result']['signatures']
        return None

    def _build_graph(self) -> None:
        """
        Build the transaction graph from the transaction contexts.
        
        This method iterates through all transaction contexts and adds their graphs to the main graph.
        """
        # First, we need to order the transactions contexts chronologically
        # Some transactions may share the same slot, 
        # so we order them by fetching their block and looking for the order of the signatures in the block

        # So first let's get all the slots number of the transactions that share the same slot
        slots: Dict[int, List[str]] = {}
        for context in self.transaction_contexts.values():
            slots.setdefault(context.slot, []).append(context.transaction_signature)
        
        # Order the transaction signatures by their slot number first and signature order in their block if they are in the block
        ordered_transaction_contexts: List[TransactionContext] = []
        # First, sort by slot to create the primary order
        for slot in sorted(slots.keys()):
            signatures_in_slot = slots[slot]
            # If only one signature in this slot, no need to check block order
            if len(signatures_in_slot) == 1:
                ordered_transaction_contexts.append(self.transaction_contexts.get(signatures_in_slot[0]))
            else:
                # For slots with multiple signatures, order them based on block order
                block_signatures = self._get_transaction_signatures_from_slot(slot)
                if block_signatures:
                    # order signatures_in_slot by their position in block_signatures
                    signatures_in_slot.sort(key=lambda sig: block_signatures.index(sig) if sig in block_signatures else float('inf'))

                ordered_transaction_contexts.extend([self.transaction_contexts.get(signature) for signature in signatures_in_slot])

        # Merge all transaction graphs into a single graph
        for context in ordered_transaction_contexts:
            graph = context.graph
            self.graph.add_graph(graph)


        # Link the transaction graphs by connecting last versions of accounts to the first versions of the next transactions
        # self._link_transaction_graphs(ordered_transaction_contexts)

    def _link_transaction_graphs(self, ordered_transaction_contexts: list[TransactionContext]) -> None:
        """
        Link the transaction graph by connecting last versions of accounts 
        to the first versions of the next transactions.
        Nodes that are left unconnected are kept for connecting to the next transactions

        Arguments:
            ordered_transaction_contexts: List of ordered transaction contexts
        """
        for i in range(len(ordered_transaction_contexts) - 1):
            current_context = ordered_transaction_contexts[i]
            next_context = ordered_transaction_contexts[i + 1]
            next_nodes = next_context.account_repository.get_pre_state_accounts()

            current_node: AccountVersion
            unconnected_nodes: List[AccountVersion] = []
            # Link the last versions of accounts of the current transaction to the first versions of accounts of the next transaction
            for current_node in current_context.account_repository.get_post_state_accounts():
                unconnected_nodes.append(current_node)
                nodes_to_link = copy.copy(unconnected_nodes)
                unconnected_nodes.clear()
                for node in nodes_to_link:
                    # Check if next_nodes has a node with same address as the current node
                    connected = False
                    for next_node in next_nodes:
                        if node.address == next_node.address:
                            connected = True
                            # Link the nodes in the graph
                            self.graph.add_edge(
                                source = node.get_vertex(), 
                                target = next_node.get_vertex(),
                                    transfer_properties = TransferProperties(
                                        transfer_type = TransferType.NEW_TRANSACTION,
                                        program_address = None,
                                        amount_source = 0,
                                        amount_destination = 0,
                                    ),
                                )
                            break
                    if not connected:
                        # If no matching node was found, add to unconnected nodes
                        unconnected_nodes.append(node)
                    



    def get_graph_data(self) -> Dict[str, Any]:
        """
        Get the graph data for visualization.
        
        Returns:
            A dictionary containing the graph data.
        """
        return self.graph.get_graph_data()
        
    

        



    
    
