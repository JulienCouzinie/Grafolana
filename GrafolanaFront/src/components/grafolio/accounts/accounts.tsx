'use client'

import React, { useState, useMemo, useEffect } from 'react';
import { useMetadata } from '@/components/metadata/metadata-provider';
import { AddressLabel } from '@/components/metadata/address-label';
import { AddressType } from '@/types/metadata';
import { AccountTransaction, AccountType, GraphData } from '@/types/graph';
import { shortenAddress } from '@/utils/addressUtils';

interface AccountsProps {
    apiGraphData: GraphData;
}

interface ExtendedAccountTransaction extends AccountTransaction {
  balance?: number;
  displayName?: string;
}

const EXCLUDED_ACCOUNT_TYPES = [
  AccountType.BURN_ACCOUNT,
  AccountType.MINTTO_ACCOUNT,
  AccountType.FEE_ACCOUNT
];

export function Accounts({ apiGraphData }: AccountsProps) {
  const { getGraphic } = useMetadata();
  const [accounts, setAccounts] = useState<ExtendedAccountTransaction[]>([]);
  const [sortField, setSortField] = useState<string>('address');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Extract and process accounts from transactions
  useEffect(() => {
    if (!apiGraphData || !apiGraphData.transactions) return;

    const accountsMap = new Map<string, ExtendedAccountTransaction>();
    
    // Process all transactions to extract unique accounts
    Object.values(apiGraphData.transactions).forEach(transaction => {
      if (!transaction.accounts) return;

      const filteredAccount = transaction.accounts.filter(
        account => !EXCLUDED_ACCOUNT_TYPES.includes(account.type)
      );
      
      filteredAccount.forEach(account => {
        // Only add if it's not already in the map
        if (!accountsMap.has(account.address)) {
          accountsMap.set(account.address, {
            ...account,
            displayName: shortenAddress(account.address)
          });
        // Get most specific type for the account
        // Some accounts will have different types in different transactions
        // This is because the type is inferred heuristically in backend
        // We keep anything different from SOL_ACCOUNT
        } else if (accountsMap.get(account.address)?.type === AccountType.SOL_ACCOUNT && accountsMap.get(account.address)?.type !== account.type) {
          accountsMap.get(account.address)!.type = account.type;
        }
      });
    });
    
    setAccounts(Array.from(accountsMap.values()));
    setCurrentPage(1); // Reset to first page when data changes
  }, [apiGraphData]);

  // Filter and sort entire accounts dataset
  const filteredAndSortedAccounts = useMemo(() => {
    // First apply filters
    let result = [...accounts];
    
    // Text filter
    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      result = result.filter(account => 
        account.address.toLowerCase().includes(lowerFilter) ||
        (account.displayName && account.displayName.toLowerCase().includes(lowerFilter))
      );
    }
    
    // Type filter
    if (filterType !== 'all') {
      result = result.filter(account => account.type === filterType);
    }
    
    // Then sort
    result.sort((a, b) => {
      if (sortField === 'address') {
        return sortDirection === 'asc' 
          ? a.address.localeCompare(b.address)
          : b.address.localeCompare(a.address);
      }
      
      if (sortField === 'type') {
        return sortDirection === 'asc'
          ? a.type.localeCompare(b.type)
          : b.type.localeCompare(a.type);
      }

      return 0;
    });
    
    return result;
  }, [accounts, filterText, filterType, sortField, sortDirection]);
  
  // Get only accounts for current page
  const paginatedAccounts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedAccounts.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedAccounts, currentPage, pageSize]);
  
  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedAccounts.length / pageSize));

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterText, filterType, sortField, sortDirection]);

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
  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  // Handle page size change
  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(event.target.value));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Mapping AccountType enum to readable strings
  const getTypeLabel = (type: AccountType): string => {
    return type.replace("_ACCOUNT", "").replace(/_/g, " ");
  };

  return (
    <div className="accounts-container p-4">
      {/* Filters and Search */}
      <div className="filters mb-4 flex flex-wrap items-center gap-4">
        <div className="search flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search accounts..."
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
            <option value={AccountType.SOL_ACCOUNT}>SOL</option>
            <option value={AccountType.TOKEN_ACCOUNT}>Token</option>
            <option value={AccountType.TOKEN_MINT_ACCOUNT}>Mint</option>
            <option value={AccountType.PROGRAM_ACCOUNT}>Program</option>
            <option value={AccountType.STAKE_ACCOUNT}>Stake</option>
          </select>
        </div>
        
        {/* Page size selector */}
        <div className="page-size-selector flex items-center gap-2">
          <span className="text-gray-400">Items per page:</span>
          <select
            className="p-2 bg-gray-800 text-white rounded border border-gray-700"
            value={pageSize}
            onChange={handlePageSizeChange}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>
        </div>
      </div>
      
      {/* Summary and Pagination Info */}
      <div className="flex flex-wrap justify-between items-center mb-4">
        <div className="text-sm text-gray-400">
          Showing {Math.min(filteredAndSortedAccounts.length, 1 + (currentPage - 1) * pageSize)}-{Math.min(filteredAndSortedAccounts.length, currentPage * pageSize)} of {filteredAndSortedAccounts.length} accounts
        </div>
      </div>
      
      {/* Accounts Table */}
      <div className="accounts-table overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-900 text-left">
              <th className="py-2 px-4">Icon</th>
              <th 
                className="py-2 px-4 cursor-pointer"
                onClick={() => handleSortChange('address')}
              >
                Address {sortField === 'address' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="py-2 px-4 cursor-pointer"
                onClick={() => handleSortChange('type')}
              >
                Type {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="py-2 px-4">On Curve</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAccounts.map((account) => {
              // Get account graphic
              const accountGraphic = getGraphic(account.address, account.mint_address, account.type);
              
              return (
                <tr 
                  key={account.address}
                  className="border-t border-gray-800 hover:bg-gray-800"
                >
                  <td className="py-2 px-4">
                    {accountGraphic?.image && (
                      <img
                        src={accountGraphic.image.src} 
                        alt={getTypeLabel(account.type)} 
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                  </td>
                  <td className="py-2 px-4">
                    <AddressLabel 
                      address={account.address} 
                      type={
                        account.type === AccountType.PROGRAM_ACCOUNT 
                          ? AddressType.PROGRAM 
                          : account.type === AccountType.TOKEN_MINT_ACCOUNT 
                            ? AddressType.TOKEN 
                            : AddressType.UNKNOWN
                      } 
                      data={apiGraphData}
                    />
                  </td>
                  <td className="py-2 px-4 flex items-center gap-2">
                    <span>{getTypeLabel(account.type)}</span>
                  </td>
                  <td className="py-2 px-4">
                    {account.isOnCurve ? (
                      <span className="text-green-500">Yes</span>
                    ) : (
                      <span className="text-gray-500">No</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {/* Display message if no accounts match filters */}
        {filteredAndSortedAccounts.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            {accounts.length === 0 
              ? 'No accounts available' 
              : 'No accounts match your filters'}
          </div>
        )}
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination mt-4 flex items-center justify-center gap-2">
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