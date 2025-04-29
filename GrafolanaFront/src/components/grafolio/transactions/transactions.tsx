'use client'

import React, { JSX } from 'react';
import { GraphData } from '@/types/graph';
import { AddressLabel } from '@/components/metadata/address-label';
import { useMetadata } from '@/components/metadata/metadata-provider';
import { useStaticGraphics } from '@/components/metadata/static-graphic-provider';
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

    // Render transaction content based on data availability
    const renderTransactionContent = () => {
        if (Object.keys(apiGraphData.transactions).length === 0) {
            return <div className="text-gray-400">No transaction data available</div>;
        }

        return (
            <div className="space-y-4">
                {Object.entries(apiGraphData.transactions).map(([signature, txData]) => {
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
            {renderTransactionContent()}
        </div>
    );
}