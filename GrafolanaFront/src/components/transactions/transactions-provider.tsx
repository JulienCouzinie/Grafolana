'use client'

import { createContext, useCallback, useContext, ReactNode } from 'react';
import { AccountVertex, GraphData } from '@/types/graph';

// Define the context type with callback-based getters instead of Promise-returning getters
interface TransactionsContextType {
  getTransactionGraphData: (tx_signature: string, onDataReceived: (data: GraphData) => void) => void;
  getWalletGraphData: (wallet_signature: string, onDataReceived: (data: GraphData) => void) => void;
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
  // Extract the mapper function from dashboard-feature
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

  // Modified getTransactionGraphData to resolve the promise internally and use a callback
  const getTransactionGraphData = (tx_signature: string, onDataReceived: (data: GraphData) => void): void => {
    (async () => {
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
        onDataReceived(data);
      } catch (error) {
        console.error('Failed to fetch graph data:', error);
        // Return empty graph data on error
        onDataReceived({ nodes: [], links: [], transactions: {} });
      }
    })();
  };

  // Modified getWalletGraphData to resolve the promise internally and use a callback
  const getWalletGraphData = (wallet_signature: string, onDataReceived: (data: GraphData) => void): void => {
    (async () => {
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
        onDataReceived(data);
      } catch (error) {
        console.error('Failed to fetch graph data:', error);
        // Return empty graph data on error
        onDataReceived({ nodes: [], links: [], transactions: {} });
      }
    })();
  };

  // Create the context value with the callback-style getter methods
  const value = {
    getTransactionGraphData,
    getWalletGraphData,
  };

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
}