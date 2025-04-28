'use client'

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import JSONPretty from 'react-json-pretty';
import 'react-json-pretty/themes/monikai.css';
import { TransactionGraph } from '@/components/grafolio/graph/TransactionGraph';
import { AccountVertex, GraphData, GraphLink } from '../../types/graph';
import { AddressLabel } from '../metadata/address-label';
import Grafolio from '../grafolio/grafolio';


export default function DashboardFeature() {
  const { publicKey } = useWallet();

  const [transactionJSON, setTransactionJSON] = useState<Record<string, unknown>>({});
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [], transactions: {}, });


  const getTransactionFromWallet = async (walletkey: string, startTime: number, endTime: number) => {
    try {
      const response = await fetch('http://localhost:5000/api/get_orders_from_wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletkey, startTime, endTime }),
      });
      const data = await response.json();
      console.log(data.transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const getTransactionFromSignature = async (tx_signature: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/get_transaction_from_signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tx_signature }),
      });
      const data = await response.json();
      navigator.clipboard.writeText(JSON.stringify(data));
      setTransactionJSON(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

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

  const getTransactionGraphData = async (tx_signature: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/get_transaction_graph_data', {
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
    } catch (error) {
      console.error('Failed to fetch graph data:', error);
    }
  };

  const getWalletGraphData = async (wallet_signature: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/get_wallet_graph_data', {
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
    } catch (error) {
      console.error('Failed to fetch graph data:', error);
    }
  };

  if (publicKey) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4">
          <input type="text" id="tx_signature" placeholder="Enter Transaction Signature" style={{ width: '1000px', margin: '2px' }} defaultValue={"3vzGCmAaLkCBMm2Yk6jNyyWeApcd7YBevTRwWKEUeRZG2KeVYw3NE3pmMBbzY7CMqEZf9MgPJG8qXbHzdqC5A8iu"}/>
          <button onClick={() => getTransactionGraphData((document.getElementById('tx_signature') as HTMLInputElement)?.value)}>
            GET TRANSACTION GRAPH
          </button><br />
          <input type="text" id="wallet_signature" placeholder="Enter Wallet Address" defaultValue={"CiW6tXBaqtStvuPfV2aYgMe6FjnzGSQcXwfiHEEG4iiX"} style={{ width: '1000px', margin: '2px' }} />
          <button onClick={() => getWalletGraphData((document.getElementById('wallet_signature') as HTMLInputElement)?.value)}>
            GET WALLET GRAPH
          </button>
        </div>
        
        <div className="graph-container">
          <Grafolio apiGraphData={graphData} />
        </div>
      </div>
    );
  }
  return null;
}