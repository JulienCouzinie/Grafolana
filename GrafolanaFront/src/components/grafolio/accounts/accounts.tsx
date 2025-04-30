'use client'

import React, { useState, useMemo, useEffect } from 'react';
import { useMetadata } from '@/components/metadata/metadata-provider';
import { AddressLabel } from '@/components/metadata/address-label';
import { AddressType } from '@/types/metadata';
import { AccountTransaction, AccountType, GraphData } from '@/types/graph';
import { shortenAddress } from '@/utils/addressUtils';
import Image from 'next/image';

interface AccountsProps {
    apiGraphData: GraphData;
}

interface ExtendedAccountTransaction extends AccountTransaction {
  balance?: number;
  displayName?: string;
}

export function Accounts({ apiGraphData }: AccountsProps) {
  const { getGraphic } = useMetadata();
  const [accounts, setAccounts] = useState<ExtendedAccountTransaction[]>([]);
  const [sortField, setSortField] = useState<string>('address');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');

  // Extract and process accounts from transactions
  useEffect(() => {
    if (!apiGraphData || !apiGraphData.transactions) return;

    const accountsMap = new Map<string, ExtendedAccountTransaction>();
    
    // Process all transactions to extract unique accounts
    Object.values(apiGraphData.transactions).forEach(transaction => {
      if (!transaction.accounts) return;
      
      transaction.accounts.forEach(account => {
        // Only add if it's not already in the map
        if (!accountsMap.has(account.address)) {
          accountsMap.set(account.address, {
            ...account,
            balance: 0, // Initialize balance, could be updated later if needed
            displayName: shortenAddress(account.address)
          });
        }
      });
    });
    
    setAccounts(Array.from(accountsMap.values()));
  }, [apiGraphData]);

  // Filter and sort accounts
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

  // Mapping AccountType enum to readable strings
  const getTypeLabel = (type: AccountType): string => {
    return type.replace("_ACCOUNT", "").replace(/_/g, " ");
  };

  return (
    <div className="accounts-container p-4">
      {/* Filters and Search */}
      <div className="filters mb-4 flex items-center gap-4">
        <div className="search flex-1">
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
            <option value={AccountType.WALLET_ACCOUNT}>Wallet</option>
            <option value={AccountType.BURN_ACCOUNT}>Burn</option>
            <option value={AccountType.MINTTO_ACCOUNT}>Mint To</option>
            <option value={AccountType.FEE_ACCOUNT}>Fee</option>
            <option value={AccountType.STAKE_ACCOUNT}>Stake</option>
          </select>
        </div>
      </div>
      
      {/* Accounts Table */}
      <div className="accounts-table">
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
            {filteredAndSortedAccounts.map((account) => {
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
      
      {/* Pagination could be added here if needed */}
    </div>
  );
}