'use client'

import { createContext, useCallback, useContext, ReactNode, useState } from 'react';
import { AccountVertex, GraphData, ForceGraphNode, ForceGraphLink, TransactionData } from '@/types/graph';

// Define the context type that exposes both the graph data and getter methods
export interface TransactionsContextType {
    graphData: GraphData;
    fetchedTransactions: Set<string>; // Expose the list of fetched transaction signatures
    fetchedWallets: Set<string>;      // Expose the list of fetched wallet addresses
    getTransactionGraphData: (tx_signature: string) => Promise<void>;
    getWalletGraphData: (wallet_signature: string) => Promise<void>;
    addWalletGraphData: (tx_signature: string) => Promise<void>;
    addTransactionGraphData: (tx_signature: string) => Promise<void>;
  }

// Create the context
const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

// Custom hook to use the transactions context
export function useTransactions() {
  const context = useContext(TransactionsContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionsProvider');
  }
  return context;
}

interface TransactionsProviderProps {
  children: ReactNode;
}

export function TransactionsProvider({ children }: TransactionsProviderProps) {
  // Add state for graph data
  const [graphData, setGraphData] = useState<GraphData>({ 
    nodes: [], 
    links: [], 
    transactions: {} 
  });

  // Add state to track fetched transaction signatures and wallet addresses
  const [fetchedTransactions, setFetchedTransactions] = useState<Set<string>>(new Set());
  const [fetchedWallets, setFetchedWallets] = useState<Set<string>>(new Set());

  const mapAccountVertexToClass = useCallback((data: GraphData): GraphData => {
    data.nodes = data.nodes.map((node) => {
      node.account_vertex = new AccountVertex(node.account_vertex.address, node.account_vertex.version, node.account_vertex.transaction_signature);
      return node;
    });
    
    data.links = data.links.map((link) => {
      link.source_account_vertex = new AccountVertex(link.source_account_vertex.address, link.source_account_vertex.version, link.source_account_vertex.transaction_signature);
      link.target_account_vertex = new AccountVertex(link.target_account_vertex.address, link.target_account_vertex.version, link.target_account_vertex.transaction_signature);
      return link;
    });

    // Map program_account_vertex of each swaps of each transactiondata to AccountVertex class
    Object.keys(data.transactions).forEach((key) => {
      const transaction = data.transactions[key];
      transaction.swaps.forEach((swap) => {
        swap.program_account_vertex = new AccountVertex(swap.program_account_vertex.address, swap.program_account_vertex.version, swap.program_account_vertex.transaction_signature);
      });
    });

    return data;
  }, []);

  const getTransactionGraphData = async (tx_signature: string): Promise<void> => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL+'/get_transaction_graph_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tx_signature }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      let data: GraphData = await response.json();
      data = mapAccountVertexToClass(data);
      setGraphData(data);

      // Reset tracking and add this transaction
      setFetchedTransactions(new Set([tx_signature]));
      setFetchedWallets(new Set());
    } catch (error) {
      console.error('Failed to fetch graph data:', error);
      // Set empty graph data on error
      setGraphData({ nodes: [], links: [], transactions: {} });
      // Clear tracking on error
      setFetchedTransactions(new Set());
      setFetchedWallets(new Set());
    }
  };

  const getWalletGraphData = async (wallet_signature: string): Promise<void> => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL+'/get_wallet_graph_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wallet_signature }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      let data: GraphData = await response.json();
      data = mapAccountVertexToClass(data);
      setGraphData(data);

      // Reset tracking and add this wallet
      setFetchedWallets(new Set([wallet_signature]));
      setFetchedTransactions(new Set());
    } catch (error) {
      console.error('Failed to fetch graph data:', error);
      // Set empty graph data on error
      setGraphData({ nodes: [], links: [], transactions: {} });
      // Clear tracking on error
      setFetchedTransactions(new Set());
      setFetchedWallets(new Set());
    }
  };

  const addWalletGraphData = async (wallet_signature: string): Promise<void> => {
    // Skip if already fetched
    if (fetchedWallets.has(wallet_signature)) {
      console.log(`Wallet ${wallet_signature} already fetched, skipping`);
      return;
    }

    try {
      const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL+'/get_wallet_graph_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wallet_signature }),
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      let newData: GraphData = await response.json();
      newData = mapAccountVertexToClass(newData);
      
      // Merge the new data with existing graph data
      setGraphData(prevData => {
        // Create sets of existing node and link IDs for quick lookup
        const existingNodeIds = new Set(prevData.nodes.map(node => node.account_vertex.id));
        const existingLinkIds = new Set(prevData.links.map(link => link.key + "-" + link.transaction_signature));
        
        // Filter out nodes that already exist in the graph
        const newNodes = newData.nodes.filter(node => !existingNodeIds.has(node.account_vertex.id));
        
        // Filter out links that already exist in the graph
        const newLinks = newData.links.filter(link => !existingLinkIds.has(link.key + "-" + link.transaction_signature));
        
        // Merge transactions, avoiding duplicates
        const mergedTransactions: Record<string, TransactionData> = { 
          ...prevData.transactions 
        };
        
        // Add only transactions that don't already exist
        Object.entries(newData.transactions).forEach(([key, transaction]) => {
          if (!mergedTransactions[key]) {
            mergedTransactions[key] = transaction;
          }
        });
        
        // Return the merged data
        return {
          nodes: [...prevData.nodes, ...newNodes],
          links: [...prevData.links, ...newLinks],
          transactions: mergedTransactions
        };
      });

      // Add this wallet to the fetched list
      setFetchedWallets(prev => {
        const updated = new Set(prev);
        updated.add(wallet_signature);
        return updated;
      });
    } catch (error) {
      console.error('Failed to fetch additional graph data:', error);
      // Don't change the existing graph data on error
    }
  };
  
  const addTransactionGraphData = async (tx_signature: string): Promise<void> => {
    // Skip if already fetched
    if (fetchedTransactions.has(tx_signature)) {
      console.log(`Transaction ${tx_signature} already fetched, skipping`);
      return;
    }

    try {
      const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL+'/get_transaction_graph_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tx_signature }),
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      let newData: GraphData = await response.json();
      newData = mapAccountVertexToClass(newData);
      
      // Merge the new data with existing graph data
      setGraphData(prevData => {
        // Create sets of existing node and link IDs for quick lookup
        const existingNodeIds = new Set(prevData.nodes.map(node => node.account_vertex.id));
        const existingLinkIds = new Set(prevData.links.map(link => link.key + "-" + link.transaction_signature));
        
        // Filter out nodes that already exist in the graph
        const newNodes = newData.nodes.filter(node => !existingNodeIds.has(node.account_vertex.id));
        
        // Filter out links that already exist in the graph
        const newLinks = newData.links.filter(link => !existingLinkIds.has(link.key + "-" + link.transaction_signature));
        
        // Merge transactions, avoiding duplicates
        const mergedTransactions: Record<string, TransactionData> = { 
          ...prevData.transactions 
        };
        
        // Add only transactions that don't already exist
        Object.entries(newData.transactions).forEach(([key, transaction]) => {
          if (!mergedTransactions[key]) {
            mergedTransactions[key] = transaction;
          }
        });
        
        // Return the merged data
        return {
          nodes: [...prevData.nodes, ...newNodes],
          links: [...prevData.links, ...newLinks],
          transactions: mergedTransactions
        };
      });

      // Add this transaction to the fetched list
      setFetchedTransactions(prev => {
        const updated = new Set(prev);
        updated.add(tx_signature);
        return updated;
      });
    } catch (error) {
      console.error('Failed to fetch additional graph data:', error);
      // Don't change the existing graph data on error
    }
  };

  // Create the context value with both the graph data and getter methods
  const value = {
    graphData,
    fetchedTransactions,
    fetchedWallets,
    getTransactionGraphData,
    getWalletGraphData,
    addWalletGraphData,
    addTransactionGraphData,
  };

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
}