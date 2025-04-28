'use client'

import React, { useState, useEffect } from 'react';
import { TransactionGraph } from './graph/TransactionGraph';
import { GraphData } from '@/types/graph';

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
            Transactions
          </button>
          <button 
            onClick={() => handleTabChange('accounts')} 
            className={`px-4 py-2 rounded-md transition-colors ${isActive('accounts') ? 'bg-purple-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
          >
            Accounts
          </button>
          <button 
            onClick={() => handleTabChange('transfers')} 
            className={`px-4 py-2 rounded-md transition-colors ${isActive('transfers') ? 'bg-purple-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
          >
            Transfers
          </button>
        </div>
      </div>
      
      {/* Content area - all tabs are rendered but hidden with CSS */}
      <div className="flex-grow overflow-hidden w-full h-full">
        {/* Graph Tab */}
        <div className={`w-full h-full ${getTabDisplayClass('graph')}`}>
          <TransactionGraph 
            apiGraphData={apiGraphData}
          />
        </div>
        
        {/* Transactions Tab */}
        <div className={getTabDisplayClass('transactions')}>
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Transactions</h2>
            {Object.keys(apiGraphData.transactions).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(apiGraphData.transactions).map(([signature, txData]) => (
                  <div key={signature} className="bg-gray-800 p-4 rounded-md">
                    <h3 className="text-lg font-semibold">{signature.substring(0, 12)}...{signature.substring(signature.length - 12)}</h3>
                    <div className="mt-2">Accounts: {txData.accounts.length}</div>
                    <div>Swaps: {txData.swaps.length}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400">No transaction data available</div>
            )}
          </div>
        </div>
        
        {/* Accounts Tab */}
        <div className={getTabDisplayClass('accounts')}>
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Accounts</h2>
            {apiGraphData.nodes.length > 0 ? (
              <div className="space-y-2">
                {apiGraphData.nodes.map((node, index) => (
                  <div key={index} className="bg-gray-800 p-3 rounded-md">
                    <div className="font-mono text-sm">
                      {node.account_vertex.address.substring(0, 12)}...{node.account_vertex.address.substring(node.account_vertex.address.length - 12)}
                    </div>
                    <div className="text-sm text-gray-400">Type: {node.type || 'Unknown'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400">No account data available</div>
            )}
          </div>
        </div>
        
        {/* Transfers Tab */}
        <div className={getTabDisplayClass('transfers')}>
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Transfers</h2>
            {apiGraphData.links.length > 0 ? (
              <div className="space-y-2">
                {apiGraphData.links.map((link, index) => (
                  <div key={index} className="bg-gray-800 p-3 rounded-md">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="truncate">
                        {link.source_account_vertex.address.substring(0, 6)}...
                      </div>
                      <div className="text-center">→</div>
                      <div className="truncate">
                        {link.target_account_vertex.address.substring(0, 6)}...
                      </div>
                    </div>
                    <div className="mt-1 text-sm">
                      {link.amount_source && `Amount: ${link.amount_source}`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400">No transfer data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}