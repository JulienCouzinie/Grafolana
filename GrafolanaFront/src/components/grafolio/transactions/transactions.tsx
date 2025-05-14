'use client'

import React, { JSX, useState, useMemo, useEffect, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { GraphData } from '@/types/graph';
import { AddressLabel } from '@/components/metadata/address-label';
import { useMetadata } from '@/components/metadata/metadata-provider';
import { calculateTokenAmount } from '@/utils/tokenUtils';
import { useUSDValue } from '@/hooks/useUSDValue';
import { AddressType } from '@/types/metadata';

interface TransactionsProps {
  apiGraphData: GraphData;
}

export default function Transactions({ apiGraphData }: TransactionsProps) {
    const metadataServices = useMetadata();
    const usdServices = useUSDValue();

    const SOLMintInfo = metadataServices.getMintInfo("SOL");
    const SOLImage = SOLMintInfo ? <img src={SOLMintInfo.image} alt="Destination Mint" className="inline w-4 h-4" /> : null;
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    
    // Filter state
    const [filterSignatureOrSigner, setFilterSignatureOrSigner] = useState<string>('');
    const [filterMinTransfers, setFilterMinTransfers] = useState<string>('');
    const [filterMaxTransfers, setFilterMaxTransfers] = useState<string>('');
    const [filterMinSwaps, setFilterMinSwaps] = useState<string>('');
    const [filterMaxSwaps, setFilterMaxSwaps] = useState<string>('');
    const [filterMinDateTime, setFilterMinDateTime] = useState<Date | null>(null);
    const [filterMaxDateTime, setFilterMaxDateTime] = useState<Date | null>(null);
    const [hideSpam, setHideSpam] = useState<boolean>(false);
    const [hideFailedTransactions, setHideFailedTransactions] = useState<boolean>(false);

    // Check if the transaction is spam by checking if one of its signers is a known spam address
    const isTransactionSpamCheck = useCallback((signature: string): boolean => { 
        const txData = apiGraphData.transactions[signature];
        if (!txData || !txData.signers || txData.signers.length === 0) {
            return false;
        }
        // Check if any signer is in the spam list
        return txData.signers.some(signer => metadataServices.isSpam(signer));
    }, [apiGraphData, metadataServices.isSpam]);

    // Create array of transactions from the object
    const transactionEntries = useMemo(() => {
        return Object.entries(apiGraphData.transactions);
    }, [apiGraphData.transactions]);

    // Count spam transactions
    const spamTransactionsCount = useMemo(() => {
        return transactionEntries.filter(([signature]) => 
            isTransactionSpamCheck(signature)
        ).length;
    }, [transactionEntries, isTransactionSpamCheck]);

    // Count failed transactions
    const failedTransactionsCount = useMemo(() => {
        return transactionEntries.filter(([, txData]) => 
            txData.err !== null && txData.err !== undefined
        ).length;
    }, [transactionEntries]);

    // Apply filters to transactions
    const filteredTransactions = useMemo(() => {
        return transactionEntries.filter(([signature, txData]) => {
            // Hide spam transactions if toggle is active
            if (hideSpam && isTransactionSpamCheck(signature)) {
                return false;
            }

            // Hide failed transactions if toggle is active
            if (hideFailedTransactions && txData.err) {
                return false;
            }
            
            // Signature or Signer filter
            if (filterSignatureOrSigner) {
                const lowerCaseFilter = filterSignatureOrSigner.toLowerCase();
                const matchesSignature = signature.toLowerCase().includes(lowerCaseFilter);
                const matchesSigner = txData.signers.some(signer => 
                    signer.toLowerCase().includes(lowerCaseFilter)
                );
                const matchesAccount = txData.accounts.some(account =>
                    account.address.toLowerCase().includes(lowerCaseFilter)
                );
                
                if (!matchesSignature && !matchesSigner && !matchesAccount) {
                    return false;
                }
            }
            
            // Transfers filter
            const linkCount = apiGraphData.links.filter(link => 
                link.transaction_signature === signature
            ).length;
            
            // Minimum transfers filter
            if (filterMinTransfers && linkCount < parseInt(filterMinTransfers, 10)) {
                return false;
            }
            
            // Maximum transfers filter
            if (filterMaxTransfers && linkCount > parseInt(filterMaxTransfers, 10)) {
                return false;
            }
            
            // Minimum swaps filter
            if (filterMinSwaps && txData.swaps.length < parseInt(filterMinSwaps, 10)) {
                return false;
            }
            
            // Maximum swaps filter
            if (filterMaxSwaps && txData.swaps.length > parseInt(filterMaxSwaps, 10)) {
                return false;
            }
            
            // Minimum datetime filter
            if (filterMinDateTime && txData.timestamp < filterMinDateTime.getTime()) {
                return false;
            }
            
            // Maximum datetime filter
            if (filterMaxDateTime && txData.timestamp > filterMaxDateTime.getTime()) {
                return false;
            }
            
            return true;
        });
    }, [
        transactionEntries, 
        filterSignatureOrSigner, 
        filterMinTransfers, 
        filterMaxTransfers, 
        filterMinSwaps, 
        filterMaxSwaps, 
        filterMinDateTime,
        filterMaxDateTime,
        apiGraphData.links,
        hideSpam,
        isTransactionSpamCheck,
        hideFailedTransactions
    ]);
    
    // Calculate paginated transactions
    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return filteredTransactions.slice(startIndex, startIndex + pageSize);
    }, [filteredTransactions, currentPage, pageSize]);
    
    // Calculate total pages
    const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
    
    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterSignatureOrSigner, filterMinTransfers, filterMaxTransfers, filterMinSwaps, filterMaxSwaps, filterMinDateTime, filterMaxDateTime, hideSpam, hideFailedTransactions]);

    // Handle page navigation
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
        setFilterSignatureOrSigner('');
        setFilterMinTransfers('');
        setFilterMaxTransfers('');
        setFilterMinSwaps('');
        setFilterMaxSwaps('');
        setFilterMinDateTime(null);
        setFilterMaxDateTime(null);
        setHideSpam(false);
        setHideFailedTransactions(false);
    };

    // Render transaction content based on data availability
    const renderTransactionContent = () => {
        if (Object.keys(apiGraphData.transactions).length === 0) {
            return <div className="text-gray-400">No transaction data available</div>;
        }

        if (filteredTransactions.length === 0) {
            return (
                <div className="text-gray-400">
                    No transactions match your filters
                    <button 
                        onClick={clearFilters}
                        className="ml-3 bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm"
                    >
                        Clear Filters
                    </button>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {paginatedTransactions.map(([signature, txData]) => {
                    // Format fee using destination mint decimals
                    const formattedFee = calculateTokenAmount(txData.fees.fee, SOLMintInfo);
                    const feeAmount = formattedFee + " " + SOLMintInfo?.symbol;
                    const feeUSD = usdServices.calculateUSDValue(
                        txData.fees.fee,
                        "SOL",
                        txData.mint_usd_price_ratio
                    );
                    
                    // Format Priority fee using destination mint decimals
                    const formattedPriorityFee = calculateTokenAmount(txData.fees.priority_fee, SOLMintInfo);
                    const priorityFeeAmount = formattedPriorityFee + " " + SOLMintInfo?.symbol;
                    const priorityFeeUSD = usdServices.calculateUSDValue(
                        txData.fees.priority_fee,
                        "SOL",
                        txData.mint_usd_price_ratio
                    );

                    // Count the number of link for this transaction
                    const linkCount = apiGraphData.links.filter(link => link.transaction_signature === signature).length;

                    // Render priority fees div if needed
                    const renderPriorityFees = (): JSX.Element | null => {
                        if (txData.fees.priority_fee !== 0) {
                            return (
                                <div className="grid grid-cols-[minmax(100px,300px)_1fr] gap-2">
                                    <div className="font-bold">Priority Fees:</div>
                                    <div>{priorityFeeAmount} {SOLImage} (${priorityFeeUSD?.toFixed(6)})</div>
                                </div>
                            );
                        }
                        return null;
                    };

                    return (
                    <div key={signature} className="bg-gray-800 p-4 rounded-md">
                        <div className="grid grid-cols-[minmax(100px,300px)_1fr] gap-2">
                            <div className="font-bold">Signature:</div>
                            <div>
                                <AddressLabel type={AddressType.TRANSACTION} address={signature} data={apiGraphData} />
                            </div>

                            <div className="font-bold">Result:</div>
                            <div className={txData.err ? "text-red-500" : "text-green-500"}>
                                {txData.err ? "Fail" : "Success"}
                                {/**txData.err && (
                                    <span className="block text-white">
                                        {txData.err}
                                    </span>
                                )*/}
                            </div>
                            
                            <div className="font-bold">Transfers:</div>
                            <div>{linkCount}</div>
                            
                            <div className="font-bold">Accounts:</div>
                            <div>{txData.accounts.length}</div>
                            
                            <div className="font-bold">Swaps:</div>
                            <div>{txData.swaps.length}</div>
                            
                            <div className="font-bold">Signers:</div>
                            <div>
                                {txData.signers.map((signer, index) => (
                                    <span key={index}>
                                        <AddressLabel address={signer} data={apiGraphData} />
                                        {index < txData.signers.length - 1 ? ', ' : ''}
                                    </span>
                                ))}
                            </div>
                            
                            <div className="font-bold">Blocktime:</div>
                            <div>{txData.timestamp/1000}</div>
                            
                            <div className="font-bold">Date:</div>
                            <div>{new Date(txData.timestamp).toLocaleString()}</div>
                            
                            <div className="font-bold">Fees:</div>
                            <div>{feeAmount} {SOLImage} (${feeUSD?.toFixed(6)})</div>
                        </div>
                        
                        {renderPriorityFees()}
                    </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="p-4">
            {/* Filters Section */}
            <div className="mb-6 bg-gray-800 p-4 rounded-md">
                <div className="text-lg font-semibold mb-3">Filters</div>
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-gray-400 mb-1">Transaction Signature or Account Address</label>
                        <input
                            type="text"
                            placeholder="Search by transaction signature or account address"
                            className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                            value={filterSignatureOrSigner}
                            onChange={(e) => setFilterSignatureOrSigner(e.target.value)}
                        />
                    </div>
                    {/* Add datetime filters */}
                    <div className="w-64">
                        <label className="block text-gray-400 mb-1">Min. Date & Time</label>
                        <DatePicker
                            selected={filterMinDateTime}
                            onChange={(date) => setFilterMinDateTime(date)}
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            dateFormat="yyyy-MM-dd HH:mm"
                            timeCaption="Time"
                            placeholderText="Select min datetime"
                            className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                            calendarClassName="bg-gray-800 text-white"
                        />
                    </div>
                    <div className="w-64">
                        <label className="block text-gray-400 mb-1">Max. Date & Time</label>
                        <DatePicker
                            selected={filterMaxDateTime}
                            onChange={(date) => setFilterMaxDateTime(date)}
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            dateFormat="yyyy-MM-dd HH:mm"
                            timeCaption="Time"
                            placeholderText="Select max datetime"
                            className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                            calendarClassName="bg-gray-800 text-white"
                        />
                    </div>
                    <div className="w-24">
                        <label className="block text-gray-400 mb-1">Min. Transfers</label>
                        <input
                            type="number"
                            placeholder="Min"
                            className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                            value={filterMinTransfers}
                            onChange={(e) => setFilterMinTransfers(e.target.value)}
                            min="0"
                        />
                    </div>
                    <div className="w-24">
                        <label className="block text-gray-400 mb-1">Max. Transfers</label>
                        <input
                            type="number"
                            placeholder="Max"
                            className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                            value={filterMaxTransfers}
                            onChange={(e) => setFilterMaxTransfers(e.target.value)}
                            min="0"
                        />
                    </div>
                    <div className="w-24">
                        <label className="block text-gray-400 mb-1">Min. Swaps</label>
                        <input
                            type="number"
                            placeholder="Min"
                            className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                            value={filterMinSwaps}
                            onChange={(e) => setFilterMinSwaps(e.target.value)}
                            min="0"
                        />
                    </div>
                    <div className="w-24">
                        <label className="block text-gray-400 mb-1">Max. Swaps</label>
                        <input
                            type="number"
                            placeholder="Max"
                            className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                            value={filterMaxSwaps}
                            onChange={(e) => setFilterMaxSwaps(e.target.value)}
                            min="0"
                        />
                    </div>
                    <div className="ml-auto">
                        <button 
                            onClick={clearFilters}
                            className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
                {/* Container for the filter toggles */}
                <div className="flex flex-row mt-4">
                    {/* Add spam filter toggle */}
                    <div className="flex items-center">
                        <input
                            id="hideSpamToggle"
                            type="checkbox"
                            className="mr-2 h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                            checked={hideSpam}
                            onChange={(e) => setHideSpam(e.target.checked)}
                        />
                        <label htmlFor="hideSpamToggle" className="text-gray-400">
                            Hide spam transactions ({spamTransactionsCount})
                        </label>
                    </div>
                    {/* Add failed transactions filter toggle */}
                    <div className="flex items-center ml-6">
                        <input
                            id="hideFailedToggle"
                            type="checkbox"
                            className="mr-2 h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                            checked={hideFailedTransactions}
                            onChange={(e) => setHideFailedTransactions(e.target.checked)}
                        />
                        <label htmlFor="hideFailedToggle" className="text-gray-400">
                            Hide failed transactions ({failedTransactionsCount})
                        </label>
                    </div>
                </div>
            </div>

            {/* Summary and Pagination Info */}
            <div className="flex flex-wrap justify-between items-center mb-4">
                <div className="text-sm text-gray-400">
                    Showing {filteredTransactions.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-
                    {Math.min(currentPage * pageSize, filteredTransactions.length)} of {filteredTransactions.length} transactions
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-gray-400">Items per page:</span>
                    <select
                        className="p-2 bg-gray-800 text-white rounded border border-gray-700"
                        value={pageSize}
                        onChange={handlePageSizeChange}
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                </div>
            </div>
            
            {/* Transactions Content */}
            {renderTransactionContent()}
            
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