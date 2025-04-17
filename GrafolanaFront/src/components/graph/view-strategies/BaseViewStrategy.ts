import { GraphData, GraphNode, GraphLink, ProcessedGraphData, ForceGraphLink, ForceGraphNode } from '@/types/graph';
import { ViewStrategy } from './ViewStrategy';
import { useCallback, useRef, useState } from 'react';
import { useMetadata } from '../../metadata/metadata-provider';
import { useUSDValue } from '../../../hooks/useUSDValue';
import { MintDTO } from '@/types/metadata';
import { LinkObject } from 'react-force-graph-2d';

// Shared color palette
export const SOLANA_COLORS = {
    purple: '#9945FF',
    green: '#14F195',
    blue: '#19D3F3',
    darkGray: '#2A2A2A',
};

export abstract class BaseViewStrategy implements ViewStrategy {
    // Common data and state references that all strategies need
    protected processedData: React.RefObject <GraphData>;
    protected hoveredGroup: number | null;
    protected setHoveredGroup: React.Dispatch<React.SetStateAction<number | null>>;
    
    // Services
    protected getMintInfo: ReturnType<typeof useMetadata>['getMintInfo'];
    protected getMintImage: ReturnType<typeof useMetadata>['getMintImage'];
    protected getProgramInfo: ReturnType<typeof useMetadata>['getProgramInfo'];
    protected getLabelComputed: ReturnType<typeof useMetadata>['getLabelComputed'];
    protected calculateUSDValue: ReturnType<typeof useUSDValue>['calculateUSDValue'];

    constructor(
        metadataServices: Pick<ReturnType<typeof useMetadata>, 'getMintInfo' | 'getMintImage' | 'getProgramInfo' | 'getLabelComputed'>,
        usdServices: Pick<ReturnType<typeof useUSDValue>, 'calculateUSDValue'>,
        processedDataRef: React.RefObject<GraphData>,
        hoveredGroup: number | null,
        setHoveredGroup: React.Dispatch<React.SetStateAction<number | null>>
    ) {
        this.getMintInfo = metadataServices.getMintInfo;
        this.getMintImage = metadataServices.getMintImage;
        this.getProgramInfo = metadataServices.getProgramInfo;
        this.getLabelComputed = metadataServices.getLabelComputed;
        this.calculateUSDValue = usdServices.calculateUSDValue;
        this.processedData = processedDataRef;
        this.hoveredGroup = hoveredGroup;
        this.setHoveredGroup = setHoveredGroup;
    }

    // Shared helper functions
    protected getGroupColor(group: number | undefined): string {
        const colors = [SOLANA_COLORS.purple, SOLANA_COLORS.green, SOLANA_COLORS.blue];
        return group !== undefined ? colors[group % colors.length] : SOLANA_COLORS.darkGray;
    }

    // Common hover handlers that both strategies need
    handleNodeHover(node: ForceGraphNode | null): void {
        if (node) {
        const linkedGroup = this.processedData.current.links.find(
            (link) => (
                (typeof link.source === 'string' ? link.source : (link.source as ForceGraphNode).id) === node.id ||
                (typeof link.target === 'string' ? link.target : (link.target as ForceGraphNode).id) === node.id
            )
        )?.group;
            this.setHoveredGroup(linkedGroup ?? null);
        } else {
            this.setHoveredGroup(null);
        }
    }

    handleLinkHover(link: GraphLink | null): void {
        this.setHoveredGroup(link ? link.group ?? null : null);
    }

  

    // Common link style implementation
    getLinkStyle(link: ForceGraphLink) {
        return {
            width: link.group === this.hoveredGroup ? 4 : 2,
            color: this.getGroupColor(link.group),
            curvature: link.curvature || 0,
            lineDash: link.type === 'SWAP' ? [1, 1] : [],
            arrowLength: 8,
            arrowColor: SOLANA_COLORS.purple
        };
    }

    nodeCanvasObject(node: ForceGraphNode, ctx: CanvasRenderingContext2D, globalScale: number): void {
        const mintInfo = this.getMintInfo(node?.mint_address);
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;

        const isInHoveredGroup = this.hoveredGroup !== null && this.processedData.current.links.some(
            (link) => link.group === this.hoveredGroup && (
                (typeof link.source === 'string' ? link.source : (link.source as ForceGraphNode).id) === node.id ||
                (typeof link.target === 'string' ? link.target : (link.target as ForceGraphNode).id) === node.id
            )
        );
        const nodeSize = isInHoveredGroup ? 12 : 8;

        // Draw circle background
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, nodeSize, 0, 2 * Math.PI, false);
        ctx.fillStyle = SOLANA_COLORS.green;
        ctx.fill();

        if (mintInfo) {
        // Draw mint logo
        const imageUrl = mintInfo?.image;
        const img = this.getMintImage(imageUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, nodeSize - 1, 0, 2 * Math.PI, false);
        ctx.clip();
        
        const imgSize = (nodeSize) * 2;
        if (img){
            ctx.drawImage(
                img, 
                node.x! - nodeSize + 1, 
                node.y! - nodeSize + 1, 
                imgSize - 2, 
                imgSize - 2
            );
        }
        ctx.restore();
        }

        // Draw special icons based on node type
        if (node.type == "BURN_ACCOUNT") {
            this.drawNodeIcon(ctx, node, nodeSize, '/burn.png');
        } else if (node.type == "MINTTO_ACCOUNT") {
            this.drawNodeIcon(ctx, node, nodeSize, '/mintto.png');
        } else if (node.type == "STAKE_ACCOUNT") {
            this.drawNodeIcon(ctx, node, nodeSize, '/stake.png');
        } else if (node.is_pool) {
            this.drawNodeIcon(ctx, node, nodeSize, '/pool.png');
        }

        // Draw key icon for signers
        if (this.processedData.current.transactions[node.account_vertex.transaction_signature]?.signers.includes(node.owner??"")) {
            this.drawSignerIcon(ctx, node, nodeSize);
        }
    }

    private drawNodeIcon(ctx: CanvasRenderingContext2D, node: ForceGraphNode, nodeSize: number, iconPath: string): void {
        const icon = new Image();
        icon.src = iconPath;
        const iconSize = nodeSize;
        ctx.drawImage(
            icon,
            node.x!,
            node.y!,
            iconSize,
            iconSize
        );
    }

    private drawSignerIcon(ctx: CanvasRenderingContext2D, node: ForceGraphNode, nodeSize: number): void {
        const keyImg = new Image();
        keyImg.src = '/key-1.png';
        const keySize = nodeSize;
        ctx.drawImage(keyImg,
        node.x! + nodeSize/2,
        node.y! - nodeSize,
        keySize,
        keySize
        );
    }

    private formatSwapAmount = (
        sourceAmount: string,
        sourceImage: string,
        sourceUSD: string,
        destAmount: string,
        destImage: string,
        destUSD: string,
        feeAmount: string | null = null,
        feeUSD: string | null = null
    ): string => {
        const baseLine = `Swapped ${sourceAmount}${sourceImage} (${sourceUSD}) for ${destAmount}${destImage} (${destUSD})`;
        const feeLine = feeAmount ? `<br/>Explicit Swap fee: ${feeAmount}${destImage} (${feeUSD})` : '';
        return baseLine + feeLine + '<br/>';
    };
    
    private formatNormalAmount = (
        amount: string,
        image: string,
        usd: string
    ): string => {
        return `Amount: ${amount}${image} (${usd})<br/>`;
    };

    private calculateTokenAmount(amount: number, mintInfo: MintDTO | null): number {
        return amount / Math.pow(10, mintInfo?.decimals || 0);
    }
    
    
    private getAmountDetails = (
        link: ForceGraphLink,
        mintInfo: MintDTO | null,
        isDestination: boolean = false // Add proper parameter for amount selection
    ): { amountString: string, imageHTML: string } => {
        const amount = this.calculateTokenAmount(
            isDestination ? link.amount_destination : link.amount_source,
            mintInfo
        );
        const amountString = amount + " " + mintInfo?.symbol;
        const image = mintInfo?.image ? this.getMintImage(mintInfo?.image) : null;
        const imageHTML = image ? `<img src="${image.src}" crossorigin="anonymous" style="width: 16px; height: 16px; display: inline-block;">` : '';
        
        return { amountString, imageHTML };
    };
    
    linkTooltip(link: ForceGraphLink): string {
        const sourceNode = this.processedData.current.nodes.find(n => n.account_vertex.address === link.source_account_vertex.address);
        const destinationNode = this.processedData.current.nodes.find(n => n.account_vertex.address === link.target_account_vertex.address);
        const imageUrl = this.getProgramInfo(link.program_address)?.icon;

        // Calculate USD values and get mint info
        const sourceUSD = sourceNode ? this.calculateUSDValue(
            link.amount_source, 
            sourceNode.mint_address, 
            this.processedData.current.transactions[link.transaction_signature].mint_usd_price_ratio
        ) : 'N/A';
        const destinationUSD = destinationNode ? this.calculateUSDValue(
            link.amount_destination, 
            destinationNode.mint_address, 
            this.processedData.current.transactions[link.transaction_signature].mint_usd_price_ratio
        ) : 'N/A';

        const mintSource = this.getMintInfo(sourceNode?.mint_address!);
        const mintDestination = this.getMintInfo(destinationNode?.mint_address!);

        // Get formatted amounts for source and destination
        const source = this.getAmountDetails(link, mintSource);
        const destination = this.getAmountDetails(link, mintDestination, true);

        // Format the amount line based on link type
        const amountLine = link.type === 'SWAP' 
        ? (() => {
            // Find the swap details
            const swapDetails = this.processedData.current.transactions[link.transaction_signature].swaps.find(s => s.id === link.swap_id);
            let feeAmount = null;
            let feeUSD = 'N/A';
            
            if (swapDetails?.fee) {
                // Format fee using destination mint decimals
                const formattedFee = this.calculateTokenAmount(swapDetails.fee, mintDestination);
                feeAmount = formattedFee + " " + mintDestination?.symbol;
                feeUSD = destinationNode ? this.calculateUSDValue(
                    swapDetails.fee,
                    destinationNode.mint_address,
                    this.processedData.current.transactions[link.transaction_signature].mint_usd_price_ratio
                ) : 'N/A';
            }
    
            return this.formatSwapAmount(
                source.amountString, source.imageHTML, sourceUSD,
                destination.amountString, destination.imageHTML, destinationUSD,
                feeAmount, feeUSD
            );
        })()
        : this.formatNormalAmount(source.amountString, source.imageHTML, sourceUSD);

        // Format composite links if they exist
        const compositesHtml = link.composite 
        ? `<br/><b>Composites:</b><ul style="margin: 4px 0; padding-left: 20px;">
            ${link.composite.map(compLink => {
                const compSource = this.getAmountDetails(
                compLink, 
                this.getMintInfo(sourceNode?.mint_address!));
                const compDest = this.getAmountDetails(
                compLink,
                this.getMintInfo(destinationNode?.mint_address!),
                true
                );

                // Calculate USD values for the composite link specifically
                const compSourceUSD = sourceNode ? this.calculateUSDValue(
                    compLink.amount_source, 
                    sourceNode.mint_address, 
                    this.processedData.current.transactions[compLink.transaction_signature].mint_usd_price_ratio
                ) : 'N/A';
                const compDestUSD = destinationNode ? this.calculateUSDValue(
                    compLink.amount_destination, 
                    destinationNode.mint_address, 
                    this.processedData.current.transactions[compLink.transaction_signature].mint_usd_price_ratio
                ) : 'N/A';

                return `<li>${
                compLink.type === 'SWAP'
                    ? this.formatSwapAmount(
                        compSource.amountString, compSource.imageHTML, compSourceUSD,
                        compDest.amountString, compDest.imageHTML, compDestUSD
                    )
                    : this.formatNormalAmount(compSource.amountString, compSource.imageHTML, compSourceUSD)
                }</li>`;
            }).join('')}
            </ul>`
        : '';

        return `
        <div style="display: inline-block; background: #1A1A1A; padding: 14px; border-radius: 4px; color: #FFFFFF; min-width: fit-content">
            <b>Type:</b> ${link.type}<br/>
            ${imageUrl ? `<img src="${imageUrl}" crossorigin="anonymous" style="max-width: 50px; max-height: 50px;"><br/>` : ''}
            <b>Program:</b> ${this.getLabelComputed(link.program_address, 'program', true).label}<br/>
            <b>From:</b> ${link.source_account_vertex.address}<br/>
            <b>To:</b> ${link.target_account_vertex.address}<br/>
            ${amountLine}
            ${compositesHtml}
        </div>
        `;
    }

    // Abstract methods that must be implemented by derived classes
    abstract processData(data: GraphData): GraphData;
    abstract nodeTooltip(node: GraphNode): string;
    abstract linkCanvasObject(link: ForceGraphLink, ctx: CanvasRenderingContext2D, globalScale: number): void;
}