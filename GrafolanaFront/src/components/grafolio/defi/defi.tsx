'use client'
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useMetadata } from '@/components/metadata/metadata-provider';
import { useUSDValue } from '@/hooks/useUSDValue';
import { 
  ForceGraphLink, 
  GraphData, 
  TransferType,
} from '@/types/graph';
import { calculateTokenAmount } from '@/utils/tokenUtils';
import { shortenAddress } from '@/utils/addressUtils';
import { AddressLabel } from '@/components/metadata/address-label';
import { AddressType } from '@/types/metadata';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface DefiProps {
  apiGraphData: GraphData;
}

interface SwapInfo {
  id: string; // Unique identifier for the swap
  isRouter: boolean; // Whether this is a router swap or normal swap
  swapId: string; // The swap_id or parent_router_swap_id
  signature: string; // Transaction signature
  timestamp: number; // Transaction timestamp
  program: string; // Program that executed the swap
  programName: string; // Name of the program
  incoming: ForceGraphLink; // The incoming transfer
  outgoing: ForceGraphLink; // The outgoing transfer
}

export function Defi({ apiGraphData }: DefiProps) {
  const { getProgramInfo, getMintInfo, getMintImage } = useMetadata();
  const { calculateUSDValue } = useUSDValue();
  const [swaps, setSwaps] = useState<SwapInfo[]>([]);
  const [sortField, setSortField] = useState<string>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterText, setFilterText] = useState<string>('');
  const [filterProgram, setFilterProgram] = useState<string>('');
  const [filterMinDateTime, setFilterMinDateTime] = useState<Date | null>(null);
  const [filterMaxDateTime, setFilterMaxDateTime] = useState<Date | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Extract and process swaps from apiGraphData
  useEffect(() => {
    if (!apiGraphData || !apiGraphData.links || apiGraphData.links.length === 0) return;

    const routerIncomingTransfers = new Map<string, ForceGraphLink>();
    const routerOutgoingTransfers = new Map<string, ForceGraphLink>();
    const normalIncomingTransfers = new Map<string, ForceGraphLink>();
    const normalOutgoingTransfers = new Map<string, ForceGraphLink>();
    
    // First, categorize all swap transfers
    apiGraphData.links.forEach(link => {
      // Router swaps
      if (link.type === TransferType.SWAP_ROUTER_INCOMING && link.parent_router_swap_id) {
        routerIncomingTransfers.set(link.target_account_vertex.id, link);
      } 
      else if (link.type === TransferType.SWAP_ROUTER_OUTGOING && link.parent_router_swap_id) {
        routerOutgoingTransfers.set(link.source_account_vertex.id, link);
      }
      // Normal swaps (only those not part of a router)
      else if (link.type === TransferType.SWAP_INCOMING && link.swap_parent_id && !link.parent_router_swap_id) {
        normalIncomingTransfers.set(link.target_account_vertex.id, link);
      }
      else if (link.type === TransferType.SWAP_OUTGOING && link.swap_parent_id && !link.parent_router_swap_id) {
        normalOutgoingTransfers.set(link.source_account_vertex.id, link);
      }
    });
    
    const swapInfos: SwapInfo[] = [];
    
    // Process router swaps
    routerIncomingTransfers.forEach((incomingTransfer, swapId) => {
      const outgoingTransfer = routerOutgoingTransfers.get(swapId);
      if (outgoingTransfer) {
        const txSignature = incomingTransfer.transaction_signature;
        const txData = apiGraphData.transactions[txSignature];
        
        swapInfos.push({
          id: `router_${swapId}_${txSignature}`,
          isRouter: true,
          swapId: swapId,
          signature: txSignature,
          timestamp: txData?.timestamp || 0,
          program: incomingTransfer.program_address,
          programName: getProgramInfo(incomingTransfer.program_address)?.label || shortenAddress(incomingTransfer.program_address),
          incoming: incomingTransfer,
          outgoing: outgoingTransfer
        });
      }
    });
    
    // Process normal swaps (not part of a router)
    normalIncomingTransfers.forEach((incomingTransfer, swapId) => {
      const outgoingTransfer = normalOutgoingTransfers.get(swapId);
      if (outgoingTransfer) {
        const txSignature = incomingTransfer.transaction_signature;
        const txData = apiGraphData.transactions[txSignature];
        
        swapInfos.push({
          id: `normal_${swapId}_${txSignature}`,
          isRouter: false,
          swapId: swapId,
          signature: txSignature,
          timestamp: txData?.timestamp || 0,
          program: incomingTransfer.program_address,
          programName: getProgramInfo(incomingTransfer.program_address)?.label || shortenAddress(incomingTransfer.program_address),
          incoming: incomingTransfer,
          outgoing: outgoingTransfer
        });
      }
    });
    
    setSwaps(swapInfos);
    setCurrentPage(1); // Reset to first page when data changes
  }, [apiGraphData, getProgramInfo]);

  // Helper function to get mint address from a transfer
  const getMintAddress = (transfer: ForceGraphLink): string | undefined => {
    let node;
    if (transfer.type === TransferType.SWAP_ROUTER_INCOMING 
    || (transfer.type === TransferType.SWAP_INCOMING)) {
      node = apiGraphData.nodes.find(node => node.account_vertex.id === transfer.source_account_vertex.id);
    } else if (transfer.type === TransferType.SWAP_ROUTER_OUTGOING
    || (transfer.type === TransferType.SWAP_OUTGOING)) {
      node = apiGraphData.nodes.find(node => node.account_vertex.id === transfer.target_account_vertex.id);
    }
    return node?.mint_address;
  };

  // Get USD value for a swap
  const getUSDValue = (swap: SwapInfo): number | null => {
    const txSignature = swap.signature;
    const txData = apiGraphData.transactions[txSignature];
    if (!txData || !txData.mint_usd_price_ratio) return null;
    
    // For incoming, we use amount_destination
    const mintAddress = getMintAddress(swap.incoming);
    if (!mintAddress) return null;
    
    const amount = swap.incoming.amount_destination;
    return calculateUSDValue(amount, mintAddress, txData.mint_usd_price_ratio);
  };

  // Add a helper function to get the first signer of a transaction
  const getFirstSigner = (signature: string): string | undefined => {
    const txData = apiGraphData.transactions[signature];
    if (!txData || !txData.signers || txData.signers.length === 0) {
      return undefined;
    }
    return txData.signers[0];
  };

  // Filter and sort swaps
  const filteredAndSortedSwaps = useMemo(() => {
    // First apply filters
    let result = [...swaps];
    
    // Text filter (searches in program name, token names, mint addresses, signer addresses, and transaction signatures)
    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      result = result.filter(swap => {
        // Get mint addresses
        const incomingMintAddress = getMintAddress(swap.incoming);
        const outgoingMintAddress = getMintAddress(swap.outgoing);
        
        // Get mint info
        const incomingMint = incomingMintAddress ? getMintInfo(incomingMintAddress) : undefined;
        const outgoingMint = outgoingMintAddress ? getMintInfo(outgoingMintAddress) : undefined;
        
        // Get signer
        const signer = getFirstSigner(swap.signature);
        
        // Check for matches in all relevant fields
        return swap.programName.toLowerCase().includes(lowerFilter) || 
               (incomingMint && incomingMint.name?.toLowerCase()?.includes(lowerFilter)) ||
               (outgoingMint && outgoingMint.name?.toLowerCase()?.includes(lowerFilter)) ||
               (incomingMint && incomingMint.symbol?.toLowerCase()?.includes(lowerFilter)) ||
               (outgoingMint && outgoingMint.symbol?.toLowerCase()?.includes(lowerFilter)) ||
               // Add mint address filtering
               (incomingMintAddress && incomingMintAddress.toLowerCase().includes(lowerFilter)) || 
               (outgoingMintAddress && outgoingMintAddress.toLowerCase().includes(lowerFilter)) ||
               // Add signer address filtering
               (signer && signer.toLowerCase().includes(lowerFilter)) ||
               // Add transaction signature filtering
               swap.signature.toLowerCase().includes(lowerFilter);
      });
    }
    
    // Program filter
    if (filterProgram) {
      result = result.filter(swap => swap.program === filterProgram);
    }
    
    // Date filter (min)
    if (filterMinDateTime) {
      const minTimestamp = filterMinDateTime.getTime();
      result = result.filter(swap => swap.timestamp >= minTimestamp);
    }
    
    // Date filter (max)
    if (filterMaxDateTime) {
      const maxTimestamp = filterMaxDateTime.getTime();
      result = result.filter(swap => swap.timestamp <= maxTimestamp);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'timestamp') {
        comparison = a.timestamp - b.timestamp;
      } else if (sortField === 'program') {
        comparison = a.programName.localeCompare(b.programName);
      } else if (sortField === 'type') {
        comparison = a.isRouter === b.isRouter ? 0 : a.isRouter ? 1 : -1;
      } else if (sortField === 'amount') {
        const aAmount = getAmount(a.outgoing);
        const bAmount = getAmount(b.outgoing);
        comparison = aAmount - bAmount;
      } else if (sortField === 'value') {
        const aValue = getUSDValue(a);
        const bValue = getUSDValue(b);
        comparison = (aValue || 0) - (bValue || 0);
      } else if (sortField === 'incomingMint') {
        const aMint = getMintAddress(a.incoming);
        const bMint = getMintAddress(b.incoming);
        const aMintInfo = aMint ? getMintInfo(aMint) : undefined;
        const bMintInfo = bMint ? getMintInfo(bMint) : undefined;
        comparison = (aMintInfo?.symbol || '').localeCompare(bMintInfo?.symbol || '');
      } else if (sortField === 'outgoingMint') {
        const aMint = getMintAddress(a.outgoing);
        const bMint = getMintAddress(b.outgoing);
        const aMintInfo = aMint ? getMintInfo(aMint) : undefined;
        const bMintInfo = bMint ? getMintInfo(bMint) : undefined;
        comparison = (aMintInfo?.symbol || '').localeCompare(bMintInfo?.symbol || '');
      } else if (sortField === 'transaction') {
        comparison = a.signature.localeCompare(b.signature);
      } else if (sortField === 'signer') {
        const aSigner = getFirstSigner(a.signature) || '';
        const bSigner = getFirstSigner(b.signature) || '';
        comparison = aSigner.localeCompare(bSigner);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [swaps, filterText, filterProgram, filterMinDateTime, filterMaxDateTime, sortField, sortDirection, getMintInfo, apiGraphData]);
  
  // Get only swaps for current page
  const paginatedSwaps = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedSwaps.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedSwaps, currentPage, pageSize]);
  
  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedSwaps.length / pageSize));

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterText, filterProgram, filterMinDateTime, filterMaxDateTime, sortField, sortDirection]);

  // Handle sort change
  const handleSortChange = (field: string) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and reset direction to asc
      setSortField(field);
      setSortDirection('desc'); // Default to descending for most intuitive ordering
    }
  };
  
  // Pagination controls
  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  // Handle page size change
  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(event.target.value));
    setCurrentPage(1); // Reset to first page when changing page size
  };

    // Helper function to get transaction date
  const getTransferDate = (swap: SwapInfo): string => {
    const date = new Date(swap.timestamp);
    
    // Calculate time difference in a more "human-readable" way
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);
    
    let relativeTime = "";
    if (diffDays > 30) {
      relativeTime = `about ${Math.floor(diffDays / 30)} months ago`;
    } else if (diffDays > 0) {
      relativeTime = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHr > 0) {
      relativeTime = `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
    } else if (diffMin > 0) {
      relativeTime = `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    } else {
      relativeTime = `${diffSec} second${diffSec !== 1 ? 's' : ''} ago`;
    }
    
    return date.toLocaleString();// + ` (${relativeTime})`;
  };

  // Format swap amount with appropriate decimals
  const getAmount = (transfer: ForceGraphLink): number => {
    const mintAddress = getMintAddress(transfer);
    if (!mintAddress) return 0;
    
    const mintInfo = getMintInfo(mintAddress);
    const amount = transfer.type.includes('INCOMING') ? transfer.amount_destination : transfer.amount_source;
    
    return calculateTokenAmount(amount, mintInfo);
  };

  // Format amount for display
  const formatAmount = (amount: number): string => {
    if (amount === 0) return '0';
    if (amount < 0.0001) return '<0.0001';
    return amount.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  // Format USD value for display
  const formatUSDValue = (value: number | null): string => {
    if (value === null) return 'N/A';
    if (value === 0) return '$0.00';
    if (value < 0.01) return '<$0.01';
    return '$' + value.toLocaleString(undefined, { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Get programs list for filter
  const programOptions = useMemo(() => {
    const programsSet = new Set<string>();
    swaps.forEach(swap => programsSet.add(swap.program));
    
    return Array.from(programsSet).map(program => {
      const programInfo = getProgramInfo(program);
      return {
        value: program,
        label: programInfo?.label || shortenAddress(program)
      };
    });
  }, [swaps, getProgramInfo]);

  // Clear all filters
  const clearFilters = (): void => {
    setFilterText('');
    setFilterProgram('');
    setFilterMinDateTime(null);
    setFilterMaxDateTime(null);
  };

  return (
    <div className="defi-container p-4">
      {/* Filters and Search */}
      <div className="filters mb-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by program, mint, account, transaction..."
            className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
        
        <div className="min-w-[200px]">
          <select 
            className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700"
            value={filterProgram}
            onChange={(e) => setFilterProgram(e.target.value)}
          >
            <option value="">All Programs</option>
            {programOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

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
        
        <button 
          onClick={clearFilters}
          className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded border border-gray-600"
        >
          Clear Filters
        </button>
      </div>

      {/* Summary and Pagination Info */}
      <div className="flex flex-wrap justify-between items-center mb-2 text-sm">
        <div className="text-gray-400">
          Showing {paginatedSwaps.length} of {filteredAndSortedSwaps.length} swaps
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Items per page:</span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="p-2 bg-gray-800 text-white rounded border border-gray-700"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Swaps Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-900 text-left">
              <th 
                className="p-3 text-left cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-700" 
                onClick={() => handleSortChange('type')}
              >
                Type {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="p-3 text-left">Sent</th>
              <th 
                className="p-3 text-left cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-700" 
                onClick={() => handleSortChange('incomingMint')}
              >
                Mint {sortField === 'incomingMint' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="p-3 text-left">Received</th>
              <th 
                className="p-3 text-left cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-700" 
                onClick={() => handleSortChange('outgoingMint')}
              >
                Mint {sortField === 'outgoingMint' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="p-3 text-right cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-700" 
                onClick={() => handleSortChange('value')}
              >
                Value {sortField === 'value' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {/* Move the "By" column here - between Value and Program */}
              <th 
                className="p-3 text-left cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-700" 
                onClick={() => handleSortChange('signer')}
              >
                By {sortField === 'signer' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="p-3 text-left cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-700" 
                onClick={() => handleSortChange('program')}
              >
                Program {sortField === 'program' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="p-3 text-left cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-700" onClick={() => handleSortChange('transaction')}>
                Transaction {sortField === 'transaction' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="p-3 text-left cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-700" 
                onClick={() => handleSortChange('timestamp')}
              >
                Date {sortField === 'timestamp' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedSwaps.map((swap) => {
              const incomingMintAddress = getMintAddress(swap.incoming);
              const outgoingMintAddress = getMintAddress(swap.outgoing);
              const incomingMintInfo = getMintInfo(incomingMintAddress || '');
              const outgoingMintInfo = getMintInfo(outgoingMintAddress || '');
              const incomingAmount = getAmount(swap.incoming);
              const outgoingAmount = getAmount(swap.outgoing);
              const usdValue = getUSDValue(swap);

              const imageIncoming = getMintImage(incomingMintInfo?.image);
              const imageOutgoing = getMintImage(outgoingMintInfo?.image);
              return (
                <tr 
                  key={swap.id} 
                  className="border-t border-gray-800 hover:bg-gray-800"
                >
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      swap.isRouter 
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200' 
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                    }`}>
                      {swap.isRouter ? 'Router' : 'Swap'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {imageIncoming && (
                        <img 
                          src={imageIncoming.src} 
                          className="w-5 h-5 rounded-full"
                        />
                      )}
                      <div>
                        <span>{formatAmount(incomingAmount)}</span>
                        <span className="ml-1 text-gray-500">{incomingMintInfo?.symbol || '???'}</span>
                      </div>
                    </div>
                  </td>
                  {/* Add the Sent Mint column */}
                  <td className="p-3">
                    {incomingMintAddress && (
                      <AddressLabel 
                        address={incomingMintAddress}
                        shortened={true}
                        data={apiGraphData}
                      />
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {imageOutgoing && (
                        <img 
                          src={imageOutgoing.src} 
                          className="w-5 h-5 rounded-full"
                        />
                      )}
                      <div>
                        <span>{formatAmount(outgoingAmount)}</span>
                        <span className="ml-1 text-gray-500">{outgoingMintInfo?.symbol || '???'}</span>
                      </div>
                    </div>
                  </td>
                  {/* Add the Received Mint column */}
                  <td className="p-3">
                    {outgoingMintAddress && (
                      <AddressLabel 
                        address={outgoingMintAddress}
                        shortened={true}
                        data={apiGraphData}
                      />
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {formatUSDValue(usdValue)}
                  </td>
                  <td className="p-3">
                    {getFirstSigner(swap.signature) && (
                      <AddressLabel 
                        address={getFirstSigner(swap.signature) || ''}
                        shortened={true}
                        data={apiGraphData}
                      />
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <img 
                        src={getProgramInfo(swap.program)?.icon} 
                        alt={swap.programName} 
                        className="w-5 h-5"
                      />
                      <AddressLabel 
                        address={swap.program}
                        type={AddressType.PROGRAM}
                        shortened={true}
                        data={apiGraphData}
                      />
                    </div>
                  </td>
                  <td className="p-3">
                    <AddressLabel 
                      address={swap.signature}
                      shortened={true}
                      data={apiGraphData}
                    />
                  </td>
                  <td className="p-3">
                    {getTransferDate(swap)}
                  </td>
                </tr>
              );
            })}
            
            {paginatedSwaps.length === 0 && (
              <tr>
                <td colSpan={10} className="p-4 text-center text-gray-500">
                  No swaps found matching the current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

export default Defi;