import { GraphData, GraphNode, GraphLink, ProcessedGraphData, ForceGraphLink, ForceGraphNode, AccountVertex, AccountType } from '@/types/graph';
import { ContextMenuItem, ViewStrategy } from './ViewStrategy';
import { useCallback, useRef, useState } from 'react';
import { useMetadata } from '../../metadata/metadata-provider';
import { useUSDValue } from '../../../hooks/useUSDValue';
import { MintDTO } from '@/types/metadata';

// Shared color palette
export const SOLANA_COLORS = {
    purple: '#9945FF',
    green: '#14F195',
    blue: '#19D3F3',
    darkGray: '#2A2A2A',
};

export abstract class BaseViewStrategy implements ViewStrategy {
    // Common data and state references that all strategies need
    protected processedData: React.RefObject<GraphData>;
    protected originalData: React.RefObject<GraphData>;
        
    // Services - provide direct access to the service objects
    protected metadataServices: ReturnType<typeof useMetadata>;
    protected usdServices: ReturnType<typeof useUSDValue>;

    constructor(
        metadataServices: ReturnType<typeof useMetadata>,
        usdServices: ReturnType<typeof useUSDValue>,
        processedDataRef: React.RefObject<GraphData>,
        originalDataRef: React.RefObject<GraphData>
    ) {
        this.metadataServices = metadataServices;
        this.usdServices = usdServices;
        this.processedData = processedDataRef;
        this.originalData = originalDataRef;
        
        // Initialize hover states
        this.hoveredNode = null;
        this.hoveredLink = null;
    }
    hoveredNode: ForceGraphNode | null;
    hoveredLink: ForceGraphLink | null;

    protected getForceGraphNodebyAccountVertex(nodes: ForceGraphNode[], accountVertex: AccountVertex): ForceGraphNode | undefined {
        return nodes.find((node) => node.account_vertex.address === accountVertex.address && node.account_vertex.version === accountVertex.version);
    }

    // Track the hovered node directly
    handleNodeHover(node: ForceGraphNode | null): void {
        this.hoveredNode = node;
    }

    // Update link hover tracking to track the link directly
    handleLinkHover(link: ForceGraphLink | null): void {
        this.hoveredLink = link;
        // We keep this for backward compatibility, but it's not used for hover styling
        // this.setHoveredGroup(link ? link.group ?? null : null);
    }

    // Common link style implementation - updated to use direct hoveredLink
    getLinkStyle(link: ForceGraphLink) {
        const isHovered = this.hoveredLink && this.hoveredLink === link;
        return {
            width: isHovered ? 4 : 2, // Make link wider when hovered
            color: isHovered ? SOLANA_COLORS.blue : SOLANA_COLORS.darkGray,
            curvature: link.curvature || 0,
            lineDash: link.type === 'SWAP' ? [1, 1] : [],
            arrowLength: 8,
            arrowColor: SOLANA_COLORS.purple
        };
    }

    // Node rendering with hover effect - already implemented correctly
    nodeCanvasObject(node: ForceGraphNode, ctx: CanvasRenderingContext2D, globalScale: number): void {
        const mintInfo = this.metadataServices.getMintInfo(node?.mint_address);
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;

        // Determine if this is the hovered node
        const isHovered = this.hoveredNode && this.hoveredNode.id === node.id;
        
        // Set nodeSize based on hover state (larger when hovered)
        const nodeSize = isHovered ? 14 : 8;

        // Draw circle background
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, nodeSize, 0, 2 * Math.PI, false);
        ctx.fillStyle = SOLANA_COLORS.green;
        ctx.fill();

        if (mintInfo) {
            let img;
            if (node.type == AccountType.WALLET_ACCOUNT){
                img = new Image();
                img.src = '/logo/walletblack.png';
            } else {
                // Draw mint logo
                const imageUrl = mintInfo?.image;
                img = this.metadataServices.getMintImage(imageUrl);
            }
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

    protected formatSwapAmount = (
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
    
    protected formatNormalAmount = (
        amount: string,
        image: string,
        usd: string
    ): string => {
        return `Amount: ${amount}${image} (${usd})<br/>`;
    };

    protected calculateTokenAmount(amount: number, mintInfo: MintDTO | null): number {
        return amount / Math.pow(10, mintInfo?.decimals || 0);
    }
    
    protected getAmountDetails = (
        link: ForceGraphLink,
        mintInfo: MintDTO | null,
        isDestination: boolean = false
    ): { amountString: string, imageHTML: string } => {
        const amount = this.calculateTokenAmount(
            isDestination ? link.amount_destination : link.amount_source,
            mintInfo
        );
        const amountString = amount + " " + mintInfo?.symbol;
        const image = mintInfo?.image ? this.metadataServices.getMintImage(mintInfo?.image) : null;
        const imageHTML = image ? `<img src="${image.src}" crossorigin="anonymous" style="width: 16px; height: 16px; display: inline-block;">` : '';
        
        return { amountString, imageHTML };
    };
    
    // Default implementation for context menu items
    getNodeContextMenuItems(node: ForceGraphNode): ContextMenuItem[] {
        // Default context menu items available for all strategies
        return [
            {
                label: "Copy Address",
                action: "copy_address"
            },
            {
                label: "Show Details",
                action: "show_details"
            }
        ];
    }
    
    // Default implementation for context menu handler
    handleNodeContextMenu(node: ForceGraphNode, action: string): void {
        switch(action) {
            case "copy_address":
                // Copy the account address to clipboard
                navigator.clipboard.writeText(node.account_vertex.address);
                break;
            case "show_details":
                // Show detailed view can be implemented by specific strategies
                console.log("Show details for:", node);
                break;
            default:
                console.log(`Unhandled action: ${action} for node:`, node);
        }
    }
    
    // Abstract methods that must be implemented by derived classes
    abstract processData(data: GraphData): GraphData;
    abstract nodeTooltip(node: GraphNode): string;
    abstract linkCanvasObject(link: ForceGraphLink, ctx: CanvasRenderingContext2D, globalScale: number): void;
    abstract linkTooltip(link: GraphLink): string;
}