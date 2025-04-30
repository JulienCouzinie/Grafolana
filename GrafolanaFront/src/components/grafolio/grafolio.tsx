'use client'

import React, { useState } from 'react';
import { TransactionGraph } from './graph/TransactionGraph';
import { AccountType, GraphData, TransferType } from '@/types/graph';
import Transactions from './transactions/transactions';
import { Accounts } from './accounts/accounts';
import { Transfers } from './transfers/transfers';
import { MetadataPreloader } from './graph/MetadataPreloader';

interface GrafolioProps {
  apiGraphData: GraphData;
}

export default function Grafolio({ apiGraphData }: GrafolioProps) {
  const [activeTab, setActiveTab] = useState<string>('graph');
  const [previousTab, setPreviousTab] = useState<string>('graph');

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
  Object.values(apiGraphData.transactions).forEach(txData => {
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

  const transfersCount = apiGraphData.links.filter(
    link => !EXCLUDED_TRANSFER_TYPES.includes(link.type)
  ).length;


  return (
    <div className="flex flex-col h-full w-full">
      <MetadataPreloader graphData={apiGraphData} />
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
            Transactions ({Object.keys(apiGraphData.transactions).length})
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
            apiGraphData={apiGraphData}
          />
        </div>
        
        {/* Transactions Tab */}
        <div className={getTabDisplayClass('transactions')}>
          <Transactions apiGraphData={apiGraphData} />
        </div>
        
        {/* Accounts Tab */}
        <div className={getTabDisplayClass('accounts')}>
          <Accounts apiGraphData={apiGraphData} />
        </div>
        
        {/* Transfers Tab */}
        <div className={getTabDisplayClass('transfers')}>
          <Transfers apiGraphData={apiGraphData} />
        </div>
      </div>
    </div>
  );
}