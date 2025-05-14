'use client'
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
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
  const { getProgramInfo, getMintInfo, getMintImage, isSpam } = useMetadata();
  const { calculateUSDValue } = useUSDValue();
  const [transfers, setTransfers] = useState<ForceGraphLink[]>([]);
  const [sortField, setSortField] = useState<string>('type');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');
  const [filterMinDateTime, setFilterMinDateTime] = useState<Date | null>(null);
  const [filterMaxDateTime, setFilterMaxDateTime] = useState<Date | null>(null);
  const [hideSwapRelated, setHideSwapRelated] = useState<boolean>(false);
  const [hideSpam, setHideSpam] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Extract and process transfers from apiGraphData
  useEffect(() => {
    if (!apiGraphData || !apiGraphData.links) return;

    // Filter out swap-related transfers
    const filteredTransfers = apiGraphData.links.filter(
      link => !EXCLUDED_TRANSFER_TYPES.includes(link.type)
    );
    
    setTransfers(filteredTransfers);
    setCurrentPage(1); // Reset to first page when data changes
  }, [apiGraphData]);

  // Helper function to check if a transaction is spam
  const isTransactionSpam = useCallback((signature: string): boolean => {
    const txData = apiGraphData.transactions[signature];
    if (!txData || !txData.signers || txData.signers.length === 0) {
      return false;
    }
    // Check if any signer is in the spam list
    return txData.signers.some(signer => isSpam(signer));
  }, [apiGraphData.transactions, isSpam]);

  // Add a useMemo to count swap-related transfers
  const swapRelatedTransfersCount = useMemo(() => {
    return transfers.filter(transfer => 
      transfer.swap_parent_id !== undefined || 
      transfer.parent_router_swap_id !== undefined
    ).length;
  }, [transfers]);

  // Count transfers associated with spam transactions
  const spamTransfersCount = useMemo(() => {
    return transfers.filter(transfer => 
      isTransactionSpam(transfer.transaction_signature)
    ).length;
  }, [transfers, isTransactionSpam]);

  // Helper function to get the correct node based on transfer type
  const getRelevantNode = (transfer: ForceGraphLink) => {
    if (transfer.type === TransferType.MINTTO || transfer.type === TransferType.CLOSE_ACCOUNT) {
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
  
  // Helper function to get transaction date
  const getTransferDate = (transfer: ForceGraphLink): string => {
    const transaction = apiGraphData.transactions[transfer.transaction_signature];
    if (!transaction || !transaction.timestamp) return "N/A";
    
    return new Date(transaction.timestamp).toLocaleString();
  };

  // Filter and sort transfers
  const filteredAndSortedTransfers = useMemo(() => {
    // First apply filters
    let result = [...transfers];
    
    // Text filter - extended to include mint addresses
    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      result = result.filter(transfer => {
        // Get the mint address for this transfer
        const mintAddress = getMintAddress(transfer);
        
        // Check if any field matches the filter text
        return transfer.source_account_vertex.address.toLowerCase().includes(lowerFilter) ||
          transfer.target_account_vertex.address.toLowerCase().includes(lowerFilter) ||
          transfer.program_address.toLowerCase().includes(lowerFilter) ||
          transfer.transaction_signature.toLowerCase().includes(lowerFilter) ||
          // Add check for mint address
          (mintAddress && mintAddress.toLowerCase().includes(lowerFilter));
      });
    }
    
    // Type filter
    if (filterType !== 'all') {
      result = result.filter(transfer => transfer.type === filterType);
    }

    // From address filter
    if (filterFrom) {
      result = result.filter(transfer => 
        transfer.source_account_vertex.address.toLowerCase().includes(filterFrom.toLowerCase())
      );
    }

    // To address filter
    if (filterTo) {
      result = result.filter(transfer => 
        transfer.target_account_vertex.address.toLowerCase().includes(filterTo.toLowerCase())
      );
    }

    // Minimum datetime filter
    if (filterMinDateTime) {
      result = result.filter(transfer => {
        const transaction = apiGraphData.transactions[transfer.transaction_signature];
        return transaction && transaction.timestamp >= filterMinDateTime.getTime();
      });
    }
    
    // Maximum datetime filter
    if (filterMaxDateTime) {
      result = result.filter(transfer => {
        const transaction = apiGraphData.transactions[transfer.transaction_signature];
        return transaction && transaction.timestamp <= filterMaxDateTime.getTime();
      });
    }

    // Hide swap related transfers filter
    if (hideSwapRelated) {
      result = result.filter(transfer => 
        transfer.swap_parent_id === undefined && 
        transfer.parent_router_swap_id === undefined
      );
    }

    // Hide spam-related transfers filter
    if (hideSpam) {
      result = result.filter(transfer => 
        !isTransactionSpam(transfer.transaction_signature)
      );
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
      
      // Add sorting for date
      if (sortField === 'date') {
        const aTransaction = apiGraphData.transactions[a.transaction_signature];
        const bTransaction = apiGraphData.transactions[b.transaction_signature];
        
        const aTimestamp = aTransaction?.timestamp || 0;
        const bTimestamp = bTransaction?.timestamp || 0;
        
        return sortDirection === 'asc' ? aTimestamp - bTimestamp : bTimestamp - aTimestamp;
      }

      return 0;
    });
    
    return result;
  }, [
    transfers, 
    filterText, 
    filterType, 
    filterFrom, 
    filterTo, 
    filterMinDateTime,
    filterMaxDateTime,
    hideSwapRelated,
    hideSpam,
    sortField, 
    sortDirection, 
    calculateUSDValue, 
    apiGraphData.transactions
  ]);

  // Get only transfers for current page
  const paginatedTransfers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedTransfers.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedTransfers, currentPage, pageSize]);
  
  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedTransfers.length / pageSize));
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterText, filterType, filterFrom, filterTo, filterMinDateTime, filterMaxDateTime, hideSwapRelated, hideSpam, sortField, sortDirection]);

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
  
  // Pagination controls
  const goToPage = (page: number): void => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  // Handle page size change
  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    setPageSize(Number(event.target.value));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Clear all filters
  const clearFilters = (): void => {
    setFilterText('');
    setFilterType('all');
    setFilterFrom('');
    setFilterTo('');
    setFilterMinDateTime(null);
    setFilterMaxDateTime(null);
    setHideSwapRelated(false);
    setHideSpam(false);
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

    const sourceNode = getRelevantNode(transfer)
    
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
    let node = getRelevantNode(transfer);
    
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
            placeholder="Search by account, program, mint address or transaction signature"
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

        <div className="from-filter flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Filter by source address"
            className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
          />
        </div>

        <div className="to-filter flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Filter by destination address"
            className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
          />
        </div>
        
        {/* Add datetime filters */}
        <div className="w-36">
          <DatePicker
            selected={filterMinDateTime}
            onChange={(date) => setFilterMinDateTime(date)}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            dateFormat="yyyy-MM-dd HH:mm"
            timeCaption="Time"
            placeholderText="Min Date & Time"
            className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700"
            calendarClassName="bg-gray-800 text-white"
          />
        </div>
        
        <div className="w-36">
          <DatePicker
            selected={filterMaxDateTime}
            onChange={(date) => setFilterMaxDateTime(date)}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            dateFormat="yyyy-MM-dd HH:mm"
            timeCaption="Time"
            placeholderText="Max Date & Time"
            className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700"
            calendarClassName="bg-gray-800 text-white"
          />
        </div>
        
        <div>
          <button 
            onClick={clearFilters}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded border border-gray-600"
          >
            Clear Filters
          </button>
        </div>
        
        {/* Page size selector */}
        <div className="page-size-selector flex items-center gap-2">
          <span className="text-gray-400">Items per page:</span>
          <select
            className="p-2 bg-gray-800 text-white rounded border border-gray-700"
            value={pageSize}
            onChange={handlePageSizeChange}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Container for the filter toggles - Added as a separate row */}
      <div className="flex flex-row mb-4">
        <div className="flex items-center">
          <input
            id="hideSpamToggle"
            type="checkbox"
            checked={hideSpam}
            onChange={(e) => setHideSpam(e.target.checked)}
            className="mr-2 h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="hideSpamToggle" className="text-gray-300">
            Hide spam transfers ({spamTransfersCount})
          </label>
        </div>

        <div className="flex items-center ml-6">
          <input
            id="hideSwapRelated"
            type="checkbox"
            checked={hideSwapRelated}
            onChange={(e) => setHideSwapRelated(e.target.checked)}
            className="mr-2 h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="hideSwapRelated" className="text-gray-300">
            Hide swap related transfers ({swapRelatedTransfersCount})
          </label>
        </div>
      </div>
      
      {/* Summary and Pagination Info */}
      <div className="flex flex-wrap justify-between items-center mb-4">
        <div className="text-sm text-gray-400">
          Showing {filteredAndSortedTransfers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}- 
          {Math.min(currentPage * pageSize, filteredAndSortedTransfers.length)} of {filteredAndSortedTransfers.length} transfers
        </div>
      </div>
      
      {/* Transfers Table */}
      <div className="transfers-table overflow-x-auto">
        <table className="w-full border-collapse text-sm">
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
              <th 
                className="py-2 px-4 cursor-pointer"
                onClick={() => handleSortChange('date')}
              >
                Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransfers.map((transfer) => {
              // Get program icon
              const programInfo = getProgramInfo(transfer.program_address);
              // Get mint address
              const mintAddress = getMintAddress(transfer);
              
              return (
                <tr 
                  key={`${transfer.transaction_signature + "-" + transfer.key}`}
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
                  <td className="py-2 px-4">
                    {getTransferDate(transfer)}
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
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            className="p-2 bg-gray-800 text-white rounded border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="First page"
          >
            &laquo;
          </button>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 bg-gray-800 text-white rounded border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            &lsaquo;
          </button>
          
          <span className="px-4 py-2">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 bg-gray-800 text-white rounded border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            &rsaquo;
          </button>
          <button
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            className="p-2 bg-gray-800 text-white rounded border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Last page"
          >
            &raquo;
          </button>
        </div>
      )}
    </div>
  );
}