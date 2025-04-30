'use client'

import React, { useState } from 'react';
import { TransactionGraph } from './graph/TransactionGraph';
import { AccountType, GraphData, TransferType } from '@/types/graph';
import Transactions from './transactions/transactions';
import { Accounts } from './accounts/accounts';
import { Transfers } from './transfers/transfers';
import { MetadataPreloader } from './graph/MetadataPreloader';
import { useTransactions } from '@/components/transactions/transactions-provider';

export default function Grafolio() {
  const [activeTab, setActiveTab] = useState<string>('graph');
  const [previousTab, setPreviousTab] = useState<string>('graph');
  
  // Get the graphData and data fetching methods from TransactionsProvider
  const { graphData, getTransactionGraphData, getWalletGraphData } = useTransactions();

  // Function to handle fetching transaction graph data
  const handleGetTransactionGraphData = () => {
    const txSignature = (document.getElementById('tx_signature') as HTMLInputElement)?.value;
    if (txSignature) {
      getTransactionGraphData(txSignature);
    }
  };

  // Function to handle fetching wallet graph data
  const handleGetWalletGraphData = () => {
    const walletAddress = (document.getElementById('wallet_signature') as HTMLInputElement)?.value;
    if (walletAddress) {
      getWalletGraphData(walletAddress);
    }
  };

  // Function to determine which tab is active
  const isActive = (tab: string): string => activeTab === tab ? 'active' : '';

  // Function to get display class based on tab visibility
  const getTabDisplayClass = (tab: string): string => {
    return activeTab === tab ? 'block' : 'hidden';
  };
  
  // Function to handle tab changes with tracking
  const handleTabChange = (tab: string): void => {
    setPreviousTab(activeTab);
    setActiveTab(tab);
  };

  const EXCLUDED_ACCOUNT_TYPES = [
    AccountType.BURN_ACCOUNT,
    AccountType.MINTTO_ACCOUNT,
    AccountType.FEE_ACCOUNT
  ];

  // Count unique accounts across all transactions (excluding specified types)
  const uniqueAccountsSet: Set<string> = new Set();

  // Iterate through all transactions
  Object.values(graphData.transactions).forEach(txData => {
    // Filter out excluded account types and add to set
    txData.accounts
      .filter(account => !EXCLUDED_ACCOUNT_TYPES.includes(account.type))
      .forEach(account => uniqueAccountsSet.add(account.address));
  });

  // Get the final count of unique accounts
  const accountNumber: number = uniqueAccountsSet.size;

  const EXCLUDED_TRANSFER_TYPES = [
    TransferType.SWAP,
    TransferType.SWAP_INCOMING,
    TransferType.SWAP_OUTGOING,
    TransferType.SWAP_ROUTER_INCOMING,
    TransferType.SWAP_ROUTER_OUTGOING
  ];

  const transfersCount = graphData.links.filter(
    link => !EXCLUDED_TRANSFER_TYPES.includes(link.type)
  ).length;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Add the input controls that were previously in DashboardFeature */}
      <div className="p-4 bg-gray-900">
        <input 
          type="text" 
          id="tx_signature" 
          placeholder="Enter Transaction Signature" 
          style={{ width: '1000px', margin: '2px' }} 
          defaultValue={"3vzGCmAaLkCBMm2Yk6jNyyWeApcd7YBevTRwWKEUeRZG2KeVYw3NE3pmMBbzY7CMqEZf9MgPJG8qXbHzdqC5A8iu"}
        />
        <button 
          onClick={handleGetTransactionGraphData}
          className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-1 rounded"
        >
          GET TRANSACTION GRAPH
        </button>
        <br />
        <input 
          type="text" 
          id="wallet_signature" 
          placeholder="Enter Wallet Address" 
          defaultValue={"CiW6tXBaqtStvuPfV2aYgMe6FjnzGSQcXwfiHEEG4iiX"} 
          style={{ width: '1000px', margin: '2px' }} 
        />
        <button 
          onClick={handleGetWalletGraphData}
          className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-1 rounded"
        >
          GET WALLET GRAPH
        </button>
      </div>

      <MetadataPreloader graphData={graphData} />
      {/* Tabs */}
      <div className="bg-gray-800 p-2">
        <div className="flex space-x-1">
          <button 
            onClick={() => handleTabChange('graph')} 
            className={`px-4 py-2 rounded-md transition-colors ${isActive('graph') ? 'bg-purple-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
          >
            Graph
          </button>
          <button 
            onClick={() => handleTabChange('transactions')} 
            className={`px-4 py-2 rounded-md transition-colors ${isActive('transactions') ? 'bg-purple-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
          >
            Transactions ({Object.keys(graphData.transactions).length})
          </button>
          <button 
            onClick={() => handleTabChange('accounts')} 
            className={`px-4 py-2 rounded-md transition-colors ${isActive('accounts') ? 'bg-purple-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
          >
            Accounts ({accountNumber})
          </button>
          <button 
            onClick={() => handleTabChange('transfers')} 
            className={`px-4 py-2 rounded-md transition-colors ${isActive('transfers') ? 'bg-purple-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
          >
            Transfers ({transfersCount})
          </button>
        </div>
      </div>
      
      {/* Content area - all tabs are rendered but hidden with CSS */}
      <div className="flex-grow overflow-auto w-full h-full">
        {/* Graph Tab */}
        <div className={`w-full h-full ${getTabDisplayClass('graph')}`}>
          <TransactionGraph 
            apiGraphData={graphData}
          />
        </div>
        
        {/* Transactions Tab */}
        <div className={getTabDisplayClass('transactions')}>
          <Transactions apiGraphData={graphData} />
        </div>
        
        {/* Accounts Tab */}
        <div className={getTabDisplayClass('accounts')}>
          <Accounts apiGraphData={graphData} />
        </div>
        
        {/* Transfers Tab */}
        <div className={getTabDisplayClass('transfers')}>
          <Transfers apiGraphData={graphData} />
        </div>
      </div>
    </div>
  );
}