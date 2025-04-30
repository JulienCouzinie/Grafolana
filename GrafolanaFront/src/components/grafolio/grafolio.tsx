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
  const [address, setAddress] = useState<string>("CiW6tXBaqtStvuPfV2aYgMe6FjnzGSQcXwfiHEEG4iiX");
  
  // Get the graphData and data fetching methods from TransactionsProvider
  // Added fetchedTransactions and fetchedWallets to check if address is already fetched
  const { 
    graphData, 
    fetchedTransactions, 
    fetchedWallets, 
    getTransactionGraphData, 
    getWalletGraphData, 
    addTransactionGraphData, 
    addWalletGraphData 
  } = useTransactions();

  // Function to handle address input change
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setAddress(e.target.value);
  };

  // Function to handle fetching graph data based on address length
  const handleGetGraphData = (): void => {
    if (!address.trim()) return;
    
    // Determine the type of address based on its length
    // Solana addresses are typically 44 characters, transaction signatures are 88 characters
    if (address.length == 88) {
      // It's likely a transaction signature
      getTransactionGraphData(address);
    } else if (address.length == 44) {
      // It's likely a wallet address
      getWalletGraphData(address);
    }
  };

  // Function to handle adding data to existing graph
  const handleAddToGraph = (): void => {
    if (!address.trim()) return;
    
    // Handle both transaction signatures and wallet addresses
    if (address.length >= 87) {
      // It's likely a transaction signature
      addTransactionGraphData(address);
    } else {
      // It's likely a wallet address
      addWalletGraphData(address);
    }
  };

  // Function to check if the current address is already fetched
  const isAddressFetched = (): boolean => {
    if (!address.trim()) return false;
    
    // Check the appropriate list based on address length
    if (address.length >= 87) {
      // It's likely a transaction signature
      return fetchedTransactions.has(address);
    } else {
      // It's likely a wallet address
      return fetchedWallets.has(address);
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

  // Check if the graph has data to determine whether to show the "Add to Graph" button
  const hasGraphData: boolean = Object.keys(graphData.transactions).length > 0;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Single input field with conditional "Add to Graph" button */}
      <div className="p-4 bg-gray-900">
        <input 
          type="text" 
          id="address_input" 
          placeholder="Enter Transaction Signature or Wallet Address" 
          style={{ width: '1000px', margin: '2px' }} 
          value={address}
          onChange={handleAddressChange}
        />
        <button 
          onClick={handleGetGraphData}
          className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-1 rounded mr-2"
        >
          GET GRAPH
        </button>
        {/* Only show ADD TO GRAPH if:
            1. We have graph data already AND
            2. The current address is not already fetched */}
        {hasGraphData && !isAddressFetched() && (
          <button 
            onClick={handleAddToGraph}
            className="bg-green-700 hover:bg-green-600 text-white px-4 py-1 rounded"
          >
            ADD TO GRAPH
          </button>
        )}
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