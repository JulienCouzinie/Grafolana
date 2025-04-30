'use client'

import React, { JSX, useState, useMemo, useEffect } from 'react';
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
    const [filterSignature, setFilterSignature] = useState<string>('');
    const [filterSigner, setFilterSigner] = useState<string>('');
    const [filterMinTransfers, setFilterMinTransfers] = useState<string>('');

    // Create array of transactions from the object
    const transactionEntries = useMemo(() => {
        return Object.entries(apiGraphData.transactions);
    }, [apiGraphData.transactions]);

    // Apply filters to transactions
    const filteredTransactions = useMemo(() => {
        return transactionEntries.filter(([signature, txData]) => {
            // Signature filter
            if (filterSignature && !signature.toLowerCase().includes(filterSignature.toLowerCase())) {
                return false;
            }
            
            // Signer filter
            if (filterSigner && !txData.signers.some(signer => 
                signer.toLowerCase().includes(filterSigner.toLowerCase()))
            ) {
                return false;
            }
            
            // Minimum transfers filter
            if (filterMinTransfers) {
                const linkCount = apiGraphData.links.filter(link => 
                    link.transaction_signature === signature
                ).length;
                
                if (linkCount < parseInt(filterMinTransfers, 10)) {
                    return false;
                }
            }
            
            return true;
        });
    }, [transactionEntries, filterSignature, filterSigner, filterMinTransfers, apiGraphData.links]);
    
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
    }, [filterSignature, filterSigner, filterMinTransfers]);
    
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
        setFilterSignature('');
        setFilterSigner('');
        setFilterMinTransfers('');
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-gray-400 mb-1">Transaction Signature</label>
                        <input
                            type="text"
                            placeholder="Search by signature..."
                            className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                            value={filterSignature}
                            onChange={(e) => setFilterSignature(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-1">Signer Address</label>
                        <input
                            type="text"
                            placeholder="Search by signer..."
                            className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                            value={filterSigner}
                            onChange={(e) => setFilterSigner(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-1">Min. Transfers</label>
                        <input
                            type="number"
                            placeholder="Minimum transfers..."
                            className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                            value={filterMinTransfers}
                            onChange={(e) => setFilterMinTransfers(e.target.value)}
                            min="0"
                        />
                    </div>
                </div>
                <div className="mt-3 flex justify-end gap-3">
                    <button 
                        onClick={clearFilters}
                        className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
                    >
                        Clear Filters
                    </button>
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