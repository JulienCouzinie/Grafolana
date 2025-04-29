'use client'

import React, { useState, useMemo, useEffect } from 'react';
import { useMetadata } from '@/components/metadata/metadata-provider';
import { AddressLabel } from '@/components/metadata/address-label';
import { AddressType } from '@/types/metadata';
import { ForceGraphLink, GraphData, TransferType } from '@/types/graph';
import { calculateTokenAmount } from '@/utils/tokenUtils'; // Import the token utility
import { useUSDValue } from '@/hooks/useUSDValue'; // Import the useUSDValue hook

interface TransfersProps {
  apiGraphData: GraphData;
}

// List of transfer types to exclude from display
const EXCLUDED_TRANSFER_TYPES = [
  TransferType.SWAP,
  TransferType.SWAP_INCOMING,
  TransferType.SWAP_OUTGOING,
  TransferType.SWAP_ROUTER_INCOMING,
  TransferType.SWAP_ROUTER_OUTGOING
];

export function Transfers({ apiGraphData }: TransfersProps) {
  const { getGraphic, getProgramInfo, getMintInfo, getMintImage } = useMetadata();
  const { calculateUSDValue } = useUSDValue(); // Get the calculateUSDValue function
  const [transfers, setTransfers] = useState<ForceGraphLink[]>([]);
  const [sortField, setSortField] = useState<string>('type');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');

  // Extract and process transfers from apiGraphData
  useEffect(() => {
    if (!apiGraphData || !apiGraphData.links) return;

    // Filter out swap-related transfers
    const filteredTransfers = apiGraphData.links.filter(
      link => !EXCLUDED_TRANSFER_TYPES.includes(link.type)
    );
    
    setTransfers(filteredTransfers);
  }, [apiGraphData]);

  // Filter and sort transfers
  const filteredAndSortedTransfers = useMemo(() => {
    // First apply filters
    let result = [...transfers];
    
    // Text filter
    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      result = result.filter(transfer => 
        transfer.source_account_vertex.address.toLowerCase().includes(lowerFilter) ||
        transfer.target_account_vertex.address.toLowerCase().includes(lowerFilter) ||
        transfer.program_address.toLowerCase().includes(lowerFilter) ||
        transfer.transaction_signature.toLowerCase().includes(lowerFilter) ||
        transfer.type.toLowerCase().includes(lowerFilter)
      );
    }
    
    // Type filter
    if (filterType !== 'all') {
      result = result.filter(transfer => transfer.type === filterType);
    }
    
    // Then sort
    result.sort((a, b) => {
      if (sortField === 'amount') {
        return sortDirection === 'asc' 
          ? (a.amount_source || 0) - (b.amount_source || 0)
          : (b.amount_source || 0) - (a.amount_source || 0);
      }
      
      if (sortField === 'type') {
        return sortDirection === 'asc'
          ? a.type.localeCompare(b.type)
          : b.type.localeCompare(a.type);
      }

      if (sortField === 'program') {
        return sortDirection === 'asc'
          ? a.program_address.localeCompare(b.program_address)
          : b.program_address.localeCompare(a.program_address);
      }
      
      // Add sorting for USD value
      if (sortField === 'usd') {
        // Get USD values for comparison
        const getUsdValue = (transfer: ForceGraphLink): number => {
          const node = getRelevantNode(transfer);
          if (!node?.mint_address) return 0;
          
          const transaction = apiGraphData.transactions[transfer.transaction_signature];
          if (!transaction || !transaction.mint_usd_price_ratio) return 0;
          
          const usdValue = calculateUSDValue(
            transfer.amount_source,
            node.mint_address,
            transaction.mint_usd_price_ratio
          );
          
          return usdValue || 0;
        };
        
        const aUsd = getUsdValue(a);
        const bUsd = getUsdValue(b);
        
        return sortDirection === 'asc' ? aUsd - bUsd : bUsd - aUsd;
      }

      return 0;
    });
    
    return result;
  }, [transfers, filterText, filterType, sortField, sortDirection, calculateUSDValue, apiGraphData.transactions]);

  // Handle sort change
  const handleSortChange = (field: string) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and reset direction to asc
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get unique transfer types for filter dropdown
  const transferTypes = useMemo(() => {
    const types = new Set<string>();
    transfers.forEach(transfer => types.add(transfer.type));
    return Array.from(types).sort();
  }, [transfers]);

  // Format transfer amount with appropriate decimals
  const formatAmount = (amount: number | undefined): string => {
    if (amount === undefined) return 'N/A';
    
    // For SOL display with up to 9 decimals, for other tokens with different precision
    if (amount < 0.000001) {
      return amount.toExponential(4);
    } else {
      return amount.toLocaleString(undefined, { 
        maximumFractionDigits: 9,
        minimumFractionDigits: 0
      });
    }
  };

  // Helper function to get the correct node based on transfer type
  const getRelevantNode = (transfer: ForceGraphLink) => {
    if (transfer.type === TransferType.MINTTO) {
      return apiGraphData.nodes.find(
        node => node.account_vertex.address === transfer.target_account_vertex.address
      );
    } else {
      return apiGraphData.nodes.find(
        node => node.account_vertex.address === transfer.source_account_vertex.address
      );
    }
  };

  // Helper function to get mint address for a transfer
  const getMintAddress = (transfer: ForceGraphLink): string | undefined => {
    const node = getRelevantNode(transfer);
    return node?.mint_address;
  };

  // Format USD value with appropriate decimals
  const formatUSDValue = (value: number | null): string => {
    if (value === null || isNaN(value)) return 'N/A';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 5
    }).format(value);
  };

  // Get transfer details HTML - modified to only show amount
  const getTransferDetails = (transfer: ForceGraphLink): React.ReactNode => {
    // Find the correct source node to get its actual type (AccountVertex doesn't have type property)
    const sourceNode = apiGraphData.nodes.find(
      node => node.account_vertex.address === transfer.source_account_vertex.address
    );
    
    // Get mint info for the token
    const mintInfo = getMintInfo(sourceNode?.mint_address!);
    
    // Calculate the actual token amount accounting for decimals
    const tokenAmount = calculateTokenAmount(transfer.amount_source, mintInfo);
    
    // Format the display with symbol if available
    const formattedAmount = formatAmount(tokenAmount);

    return (
      <div>
        {transfer.amount_source !== undefined ? (
          <div>{formattedAmount}</div>
        ) : (
          <div>N/A</div>
        )}
      </div>
    );
  };

  // Function to calculate and render USD value
  const getUSDValue = (transfer: ForceGraphLink): React.ReactNode => {
    const node = getRelevantNode(transfer);
    if (!node?.mint_address) return <div>N/A</div>;
    
    const transaction = apiGraphData.transactions[transfer.transaction_signature];
    if (!transaction || !transaction.mint_usd_price_ratio) return <div>N/A</div>;
    
    // Calculate USD value using the same approach as BaseViewStrategy
    const usdValue = calculateUSDValue(
      transfer.amount_source,
      node.mint_address,
      transaction.mint_usd_price_ratio
    );
    
    return (
      <div>
        {formatUSDValue(usdValue)}
      </div>
    );
  };

  // New function to display mint information
  const getMintHTML = (transfer: ForceGraphLink): React.ReactNode => {
    let node;
    if (transfer.type === TransferType.MINTTO) {
        node = apiGraphData.nodes.find(
        node => node.account_vertex.address === transfer.target_account_vertex.address
      );
      console.log("MINTTO", node?.mint_address);
    } else {
        node = apiGraphData.nodes.find(
        node => node.account_vertex.address === transfer.source_account_vertex.address
        );
    }
    
    // Get mint info for the token
    const mintInfo = getMintInfo(node?.mint_address!);
    
    // Get token image for display
    const image = getMintImage(mintInfo?.image);

    return (
      <div className="flex items-center gap-2">
        {image && (
          <img 
            src={image.src} 
            alt={mintInfo?.symbol || "Token"} 
            className="w-5 h-5 rounded-full" 
          />
        )}
        <span>{mintInfo?.symbol || "Unknown"}</span>
      </div>
    );
  };

  return (
    <div className="transfers-container p-4">
      {/* Filters and Search */}
      <div className="filters mb-4 flex flex-wrap items-center gap-4">
        <div className="search flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search transfers..."
            className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
        
        <div className="type-filter">
          <select
            className="p-2 bg-gray-800 text-white rounded border border-gray-700"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            {transferTypes.map(type => (
              <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Transfers Table */}
      <div className="transfers-table overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-900 text-left">
              <th className="py-2 px-4">Type</th>
              <th className="py-2 px-4">From</th>
              <th className="py-2 px-4">To</th>
              <th 
                className="py-2 px-4 cursor-pointer"
                onClick={() => handleSortChange('amount')}
              >
                Amount {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="py-2 px-4 cursor-pointer"
                onClick={() => handleSortChange('usd')}
              >
                USD Value {sortField === 'usd' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="py-2 px-4">Token</th>
              <th className="py-2 px-4">Mint Address</th>
              <th 
                className="py-2 px-4 cursor-pointer"
                onClick={() => handleSortChange('program')}
              >
                Program {sortField === 'program' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="py-2 px-4">Transaction</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedTransfers.map((transfer) => {
              // Get program icon
              const programInfo = getProgramInfo(transfer.program_address);
              // Get mint address
              const mintAddress = getMintAddress(transfer);
              
              return (
                <tr 
                  key={`${transfer.key}`}
                  className="border-t border-gray-800 hover:bg-gray-800"
                >
                  <td className="py-2 px-4">
                    <span className="py-1 px-2 bg-gray-700 rounded text-sm">
                      {transfer.type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-2 px-4">
                    <AddressLabel 
                      address={transfer.source_account_vertex.address} 
                      shortened={true}
                      data={apiGraphData}
                    />
                  </td>
                  <td className="py-2 px-4">
                    <AddressLabel 
                      address={transfer.target_account_vertex.address}
                      shortened={true}
                      data={apiGraphData}
                    />
                  </td>
                  <td className="py-2 px-4">
                    {getTransferDetails(transfer)}
                  </td>
                  <td className="py-2 px-4">
                    {getUSDValue(transfer)}
                  </td>
                  <td className="py-2 px-4">
                    {getMintHTML(transfer)}
                  </td>
                  <td className="py-2 px-4">
                    {mintAddress && (
                      <AddressLabel 
                        address={mintAddress}
                        type={AddressType.TOKEN}
                        shortened={true}
                        data={apiGraphData}
                      />
                    )}
                  </td>
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-2">
                      {programInfo?.icon && (
                        <img 
                          src={programInfo.icon} 
                          alt={programInfo.label} 
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <AddressLabel 
                        address={transfer.program_address}
                        type={AddressType.PROGRAM}
                        shortened={true}
                        data={apiGraphData}
                      />
                    </div>
                  </td>
                  <td className="py-2 px-4">
                    <AddressLabel 
                      address={transfer.transaction_signature}
                      type={AddressType.TRANSACTION}
                      shortened={true}
                      data={apiGraphData}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {/* Display message if no transfers match filters */}
        {filteredAndSortedTransfers.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            {transfers.length === 0 
              ? 'No transfers available' 
              : 'No transfers match your filters'}
          </div>
        )}
      </div>
    </div>
  );
}