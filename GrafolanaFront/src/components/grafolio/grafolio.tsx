'use client'

import React, { useState } from 'react';
import { TransactionGraph } from './graph/TransactionGraph';
import { GraphData } from '@/types/graph';
import Transactions from './transactions/transactions';
import { Accounts } from './accounts/accounts';
import { Transfers } from './transfers/transfers';

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

  // Aggregate account counts from transactions
  const accountNumber: number = Object.values(apiGraphData.transactions).reduce((total, txData) => 
  total + txData.accounts.length, 0);

  return (
    <div className="flex flex-col h-full w-full">
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
            Transfers ({Object.keys(apiGraphData.links).length})
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