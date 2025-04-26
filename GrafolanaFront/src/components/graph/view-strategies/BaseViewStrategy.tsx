import React, { Ref } from 'react';
import { GraphData, GraphNode, GraphLink, ForceGraphLink, ForceGraphNode, AccountVertex, AccountType, TransferType, NodePosition } from '@/types/graph';
import { ContextMenuItem, ViewStrategy } from './ViewStrategy';
import { useCallback, useRef, useState } from 'react';
import { useMetadata } from '../../metadata/metadata-provider';
import { useUSDValue } from '../../../hooks/useUSDValue';
import { MintDTO } from '@/types/metadata';
import { cloneDeep, min } from 'lodash';

// Shared color palette
export const SOLANA_COLORS = {
    purple: '#9945FF',
    green: '#14F195',
    blue: '#19D3F3',
    darkGray: '#2A2A2A',
};
export const COLORS = {
    mango: '#F29661',
    lightgray: "#C0C0C0",
    red: "#db2432",
    blue: "#382cd3",
    yellow: "#F5CB14",
    darkgreen: '#006400',
}

export abstract class BaseViewStrategy implements ViewStrategy {
    // Common data and state references that all strategies need
    protected processedData: React.RefObject<GraphData>;
    protected originalData: React.RefObject<GraphData>;
        
    // Services - provide direct access to the service objects
    protected metadataServices: ReturnType<typeof useMetadata>;
    protected usdServices: ReturnType<typeof useUSDValue>;

    selectedNodes: React.RefObject<Set<string>>;
    hoveredNode: ForceGraphNode | null;
    hoveredLink: ForceGraphLink | null;

    // Filters
    mapSwapProgramsCollapsed: React.RefObject<Map<number, boolean>>;
    hideFees: React.RefObject<boolean>;
    minSolAmount: React.RefObject<number>;
    maxSolAmount: React.RefObject<number|null>;
    minTokenAmount: React.RefObject<number>;
    maxTokenAmount: React.RefObject<number|null>;
    minValuetUSD: React.RefObject<number>;
    maxValueUSD: React.RefObject<number|null>;

    private processGraphDataCallBack: React.RefObject<((data:GraphData) => void) | null>;

    savedNodePositions: Map<string, {position: NodePosition}> | null = null;

    constructor(
        metadataServices: ReturnType<typeof useMetadata>,
        usdServices: ReturnType<typeof useUSDValue>,
        processedDataRef: React.RefObject<GraphData>,
        originalDataRef: React.RefObject<GraphData>,
        selectedNodesRef: React.RefObject<Set<string>>
    ) {
        this.metadataServices = metadataServices;
        this.usdServices = usdServices;
        this.processedData = processedDataRef;
        this.originalData = originalDataRef;
        
        // Initialize hover states
        this.hoveredNode = null;
        this.hoveredLink = null;
        this.selectedNodes = selectedNodesRef;
        this.mapSwapProgramsCollapsed = useRef(new Map<number, boolean>());

        this.processGraphDataCallBack = useRef(null);
        this.hideFees = useRef(false);

        this.minSolAmount = useRef(0);
        this.maxSolAmount = useRef(null);
        this.minTokenAmount = useRef(0);
        this.maxTokenAmount = useRef(null);
        this.minValuetUSD = useRef(0);
        this.maxValueUSD = useRef(null);

    }

    /**
     * Set the callback function that will be called when data needs to be reprocessed
     * @param callback Function to trigger reprocessing
     */
    setReprocessCallback(callback: (dataToProcess: GraphData) => void): void {
        // Store callback in the ref instead of directly as a property
        this.processGraphDataCallBack.current = callback;
    }
    
    /**
     * Trigger reprocessing by calling the registered callback
     */
    forceReProcess(data: GraphData): void {
        // Access callback through the ref
        if (this.processGraphDataCallBack.current) {
            this.processGraphDataCallBack.current(data);
        }
    }

    private saveCurrentNodePositions(): void {
        if (!this.savedNodePositions) {
            this.savedNodePositions = new Map<string, {position: NodePosition}>();
        }

        this.processedData.current.nodes.forEach((node) => {
            if (node.id !== undefined) {
                const position: NodePosition = { x: node.x!, y: node.y!, fx: node.fx!, fy: node.fy! };
                this.savedNodePositions!.set(node.id.toString(), {position});
            }
        });
    }

    private restoreNodePositions(): void {
        this.processedData.current.nodes.forEach((node) => {
            if (node.id !== undefined && this.savedNodePositions?.has(node.id.toString())) {
                const position = this.savedNodePositions.get(node.id.toString())?.position;
                if (position) {
                    node.x = position.x;
                    node.y = position.y;
                    node.fx = position.fx;
                    node.fy = position.fy;
                }
            }
        });
    }

    private pruneIsolatedNodes(data: GraphData): void {
        // Build the list of nodes that are source and target in data.links
        const activeVertices = new Set<string>();
                    
        // Get All account vertices that appear in any remaining link
        data.links.forEach((link) => {
            if (link.source_account_vertex) {
                // Use the built-in id getter from AccountVertex
                activeVertices.add(link.source_account_vertex.id);
            }
            if (link.target_account_vertex) {
                // Use the built-in id getter from AccountVertex
                activeVertices.add(link.target_account_vertex.id);
            }
        });

        // Filter nodes to keep only those that are used in links
        data.nodes = data.nodes.filter((node) => {
            // Compare using the same id format
            return activeVertices.has(node.account_vertex.id);
        });
    }

    private ApplyCollapseExpandSwapPrograms(data: GraphData): void {

        // Filter out the links that are not relevant based on the collapse state of swap programs
        data.links = data.links.filter((link) => {
            // For now keep the router link, they will be dealt with later
            if (link.type === TransferType.SWAP_ROUTER_INCOMING || link.type === TransferType.SWAP_ROUTER_OUTGOING) {
                return true;
            }

            if (link.type === TransferType.SWAP_INCOMING || link.type === TransferType.SWAP_OUTGOING) {
                return this.mapSwapProgramsCollapsed.current.get(link.swap_parent_id!) === true ;
            }
            
            if (link.swap_parent_id !== undefined) {
                return this.mapSwapProgramsCollapsed.current.get(link.swap_parent_id!) === false;
            }
            return true;
        });
        
        // Filter out the links that are not relevant based on the collapse state of swap routers
        data.links = data.links.filter((link) => {
            
            if (link.type === TransferType.SWAP_ROUTER_INCOMING || link.type === TransferType.SWAP_ROUTER_OUTGOING) {
                return this.mapSwapProgramsCollapsed.current.get(link.parent_router_swap_id!) === true;
            }
           
            if (link.parent_router_swap_id !== undefined) {
                return this.mapSwapProgramsCollapsed.current.get(link.parent_router_swap_id!) === false;
            }
           
            return true;
        });

        this.pruneIsolatedNodes(data); // Remove isolated nodes after filtering links

    }

    private ApplyHideFees(data: GraphData): void {
        // Filter out the links that have FEE as source or target address
        data.links = data.links.filter((link) => {
            if (link.source_account_vertex.address === "FEE" || link.target_account_vertex.address === "FEE") {
                return !this.hideFees.current;
            }
            return true;
        });

        // Filter out the nodes that have FEE as address
        data.nodes = data.nodes.filter((node) => {
            if (node.account_vertex.address === "FEE") {
                return !this.hideFees.current;
            }
            return true;
        });

        this.pruneIsolatedNodes(data); // Remove isolated nodes after filtering links
    }

    /**
     * Set the map of swap programs to collapse or expand all swap based on their type,
     * @param router - true to collapse/expand all swap routers, false to collapse/expand all swap programs
     * @param collapse - true to collapse, false to expand them
     */
    protected SetCollapseAllSwap(router: boolean, collapse: boolean) {
        // Set the collapse state for all swap programs in the data
        Object.values(this.originalData.current.transactions).forEach((transaction) => {
            transaction.swaps.forEach((swap) => { 
                if (swap.router == router) {
                    this.mapSwapProgramsCollapsed.current.set(swap.id, collapse);
                } 
            });
        });
    }

    /**
     * Set the map of swap programs to collapse or expand all swap 
     * @param collapse - true to collapse all swap, false to expand them
     */
    protected SetCollapseAllSwaps(collapse: boolean) {
        // Set the collapse state for all swap programs in the data
        Object.values(this.originalData.current.transactions).forEach((transaction) => {
            transaction.swaps.forEach((swap) => {
                if (swap.router) {
                    this.mapSwapProgramsCollapsed.current.set(swap.id, collapse);
                } else {    
                    this.mapSwapProgramsCollapsed.current.set(swap.id, collapse);
                }
            });
        });
    }

    protected CollapseAllSwap(router: boolean, collapse: boolean): void {
        this.SetCollapseAllSwap(router,collapse);
        this.applyFilters();
    }

    /**
     * Hide/Show fees transfers & node in graph
     * @param hide - true to hide fees, false to show them
     */
    protected HideFees(hide: boolean): void {
        this.hideFees.current = hide;
        this.applyFilters();
    }

    protected setMinSolAmount(amount: number): void {
        this.minSolAmount.current = amount;
    }

    protected setMaxSolAmount(amount: number|null): void {
        this.maxSolAmount.current = amount;
    }

    protected setMinTokenAmount(amount: number): void {
        this.minTokenAmount.current = amount;
    }

    protected setMaxTokenAmount(amount: number|null): void {
        this.maxTokenAmount.current = amount;
    }

    protected setMinValueUSD(amount: number): void {
        this.minValuetUSD.current = amount;
    }

    protected setMaxValueUSD(amount: number|null): void {
        this.maxValueUSD.current = amount;
    }

    private filterTransfer(data: GraphData, link: ForceGraphLink, nodeType: string): boolean {
        // Try to determine mint address from either the source node or directly from link
        let mintAddress: string | undefined;
        let node: ForceGraphNode | undefined;
        let amount: number | undefined;
        if (nodeType === "source") {
            node = data.nodes.find(n => n.account_vertex.address === link.source_account_vertex.address);
            amount = cloneDeep(link.amount_source);
        } else {
            node = data.nodes.find(n => n.account_vertex.address === link.target_account_vertex.address);
            amount = cloneDeep(link.amount_destination);
        }
        mintAddress = node!.mint_address;

        // If we couldn't get a mint address, keep the link (don't filter)
        if (!mintAddress) return true;
        
        // Get mint info
        const mintInfo = this.metadataServices.getMintInfo(mintAddress);
        
        // Determine if this is SOL
        const isSOL = mintAddress === "So11111111111111111111111111111111111111112" || (mintAddress === "SOL");
                    
        
        // Calculate actual token amount based on decimals
        const amountReal = this.calculateTokenAmount(amount, mintInfo);
        
        // Try to get USD value if available
        let usdValue: number | null = null;
        const transactionData = this.originalData.current.transactions[link.transaction_signature];
        if (transactionData && transactionData.mint_usd_price_ratio && mintAddress) {
            const usdValue = this.usdServices.calculateUSDValue(
                amount,
                mintAddress,
                transactionData.mint_usd_price_ratio
            );
        }

        // Apply filters in priority order:
        // 1. USD value filter if available
        // 2. SOL amount filter if it's SOL
        // 3. Token amount filter for other tokens
        
        if (usdValue !== null && !isNaN(usdValue)) {
            // Filter by USD value
            const minUSD = this.minValuetUSD.current;
            const maxUSD = this.maxValueUSD.current;
            
            if (minUSD > 0 && usdValue < minUSD) return false;
            if (maxUSD !== null && usdValue > maxUSD) return false;
        } 
        if (isSOL) {
            
            // Filter by SOL amount
            const minAmount = this.minSolAmount.current;
            const maxAmount = this.maxSolAmount.current;
            
            if (minAmount > 0 && amountReal < minAmount) return false;
            if (maxAmount !== null && amountReal > maxAmount) return false;
        }
        else {
            // Filter by token amount for non-SOL tokens
            const minAmount = this.minTokenAmount.current;
            const maxAmount = this.maxTokenAmount.current;
            
            if (minAmount > 0 && amountReal < minAmount) return false;
            if (maxAmount !== null && amountReal > maxAmount) return false;
        }

        return true; // Link passes all filters
    }

    protected applyTransferFilters(data: GraphData): void {
       
        // Filter out the links by min/max amount depending on the type of mint of the source
        // If mint is SOL, use minSolAmount and maxSolAmount
        // If mint is not SOL, use minTokenAmount and maxTokenAmount
        // If USD value is available (calculateUSDValue), use minValueUSD and maxValueUSD
        data.links = data.links.filter((link) => {
            // Skip filtering for swap-related links for now
            if (link.type === TransferType.SWAP) {
                return this.filterTransfer(data, link, "source") && this.filterTransfer(data, link, "destination");
            }

            if (link.type === TransferType.SWAP_OUTGOING || link.type === TransferType.SWAP_ROUTER_OUTGOING) {
                return this.filterTransfer(data, link, "destination");
            }
            return this.filterTransfer(data, link, "source");
            
        });
        
        this.pruneIsolatedNodes(data); // Remove isolated nodes after filtering links
    }


    protected applyFilters() {
        this.saveCurrentNodePositions()
        // Start with the original data
        let data = cloneDeep(this.originalData.current); 

        // Collapse or expand swap programs based on the current state
        this.ApplyCollapseExpandSwapPrograms(data);

        // Hide fees if the option is enabled
        this.ApplyHideFees(data);

        this.applyTransferFilters(data);

        
        this.forceReProcess(data); // Trigger reprocessing with the updated data
        this.restoreNodePositions(); // Restore node positions after reprocessing
    }

    setupGraphData(data: GraphData) {
        this.originalData.current = cloneDeep(data);
        this.SetCollapseAllSwaps(true); // Collapse all swap programs by default

        this.applyFilters();
    }

    protected getForceGraphNodebyAccountVertex(nodes: ForceGraphNode[], accountVertex: AccountVertex): ForceGraphNode | undefined {
        return nodes.find((node) => node.account_vertex.address === accountVertex.address && node.account_vertex.version === accountVertex.version);
    }

    // Track the hovered node directly
    handleNodeHover(node: ForceGraphNode | null): boolean {
        let hasChanged = false;
        if (node!=this.hoveredNode)
            this.hoveredNode = node;
            hasChanged = true;
        return hasChanged;
    }

    // Update link hover tracking to track the link directly
    handleLinkHover(link: ForceGraphLink | null): boolean {
        let hasChanged = false;
        if (link!=this.hoveredLink)
            this.hoveredLink = link;
            hasChanged = true;
        return hasChanged;
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

    // Update nodeCanvasObject to use the ref for selectedNodes
    nodeCanvasObject(node: ForceGraphNode, ctx: CanvasRenderingContext2D, globalScale: number): void {
        const mintInfo = this.metadataServices.getMintInfo(node?.mint_address);
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;

        // Determine if this is the hovered node
        const isHovered = this.hoveredNode && this.hoveredNode.id === node.id;
        
        // Determine if this node is selected - use the ref
        const isSelected = this.selectedNodes.current?.has(node.id!.toString()) || false;
        
        // Set nodeSize based on hover state (larger when hovered)
        const nodeSize = isHovered ? 14 : 8;

        let nodeColor;
        if (node.type == AccountType.SOL_ACCOUNT) {
            nodeColor = SOLANA_COLORS.green;
        } else if (node.type == AccountType.PROGRAM_ACCOUNT) {
            nodeColor = COLORS.blue;
        } else if (node.type == AccountType.WALLET_ACCOUNT) {
            nodeColor = COLORS.lightgray;
        } else if (node.type == AccountType.FEE_ACCOUNT) {
            nodeColor = COLORS.yellow;
        } else if (node.type == AccountType.BURN_ACCOUNT) {
            nodeColor = COLORS.red;
        } else if (node.type == AccountType.MINTTO_ACCOUNT) {
            nodeColor = COLORS.darkgreen;
        } else if (node.type == AccountType.STAKE_ACCOUNT) {
            nodeColor = SOLANA_COLORS.green;
        } else {
            nodeColor = COLORS.mango;
        }

        // Draw circle background with dark gray fill
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, nodeSize, 0, 2 * Math.PI, false);
        ctx.fillStyle = SOLANA_COLORS.darkGray;
        ctx.fill();

        // Draw colored rim
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, nodeSize, 0, 2 * Math.PI, false);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = isSelected ? SOLANA_COLORS.purple : nodeColor;
        ctx.stroke();

        if (mintInfo) {
            //console.log("mintInfo", mintInfo.mint_address);
            let mintCanvas;
            if (node.type == AccountType.BURN_ACCOUNT) {
                mintCanvas = this.metadataServices.burnCanvas;
            } else if (node.type == AccountType.MINTTO_ACCOUNT) {
                mintCanvas = this.metadataServices.mintToCanvas;
            } else if (node.type == AccountType.WALLET_ACCOUNT){
                mintCanvas = this.metadataServices.walletCanvas;
            } else if (node.type == AccountType.FEE_ACCOUNT){
                mintCanvas = this.metadataServices.feeCanvas;
            } else if (node.type == AccountType.PROGRAM_ACCOUNT){
                const progreamImageUrl = this.metadataServices.getProgramInfo(node.account_vertex.address)?.icon;
                mintCanvas = this.metadataServices.getImageCanvas(progreamImageUrl, AccountType.PROGRAM_ACCOUNT);
            } else {
                // Draw mint logo
                const imageUrl = mintInfo?.image;
                mintCanvas = this.metadataServices.getImageCanvas(imageUrl);
            }
            ctx.save();
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, nodeSize - 1, 0, 2 * Math.PI, false);
            ctx.clip();
            
            const imgSize = (nodeSize) * 2;
            if (mintCanvas){
                ctx.drawImage(
                    mintCanvas, 
                    node.x! - nodeSize + 1, 
                    node.y! - nodeSize + 1, 
                    imgSize - 2, 
                    imgSize - 2
                );
            }
            ctx.restore();
        }

        // Draw special icons based on node type
        if (node.type == AccountType.STAKE_ACCOUNT) {
            this.drawNodeIcon(ctx, node, nodeSize, '/stake.png');
        } else if (node.is_pool && node.type !== AccountType.MINTTO_ACCOUNT && node.type !== AccountType.BURN_ACCOUNT) {
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

    protected getFormattedUSDValueString = (amount: number | null): string => {
        return amount !== null ? `$${amount.toFixed(5)}` : 'N/A';
    }

    protected formatSwapAmount = (
        sourceAmount: string,
        sourceImage: string,
        sourceUSD: number | null,
        destAmount: string,
        destImage: string,
        destUSD: number | null,
        feeAmount: string | null = null,
        feeUSD: number | null = null
    ): string => {
        const sourceUSDString = this.getFormattedUSDValueString(sourceUSD);
        const destUSDString = this.getFormattedUSDValueString(destUSD);
        const feeUSDString = this.getFormattedUSDValueString(feeUSD);
        const baseLine = `Swapped ${sourceAmount}${sourceImage} (${sourceUSDString}) for ${destAmount}${destImage} (${destUSDString})`;
        const feeLine = feeAmount ? `<br/>Explicit Swap fee: ${feeAmount}${destImage} (${feeUSDString})` : '';
        return baseLine + feeLine + '<br/>';
    };
    
    protected formatNormalAmount = (
        link: ForceGraphLink,
        amount: string,
        image: string,
        usd: number | null
    ): string => {
        const usdString = usd !== null ? `$${usd.toFixed(5)}` : 'N/A';
        return `${link.type}: Amount: ${amount}${image} (${usdString})<br/>`;
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


    protected getTransferDetailsHTML(link: ForceGraphLink): string {
        let mintSource;
        let sourceNode: ForceGraphNode | undefined;
        let destinationNode: ForceGraphNode | undefined;

        // Check if source and target are objects (ForceGraphNode instances) rather than IDs
        if (typeof link.source === 'object' && link.source !== null && 
            typeof link.target === 'object' && link.target !== null) {
            sourceNode = link.source as ForceGraphNode;
            destinationNode = link.target as ForceGraphNode;
        } else {
            console.log("Link source or target is not a ForceGraphNode instance. Attempting to find nodes by address.");
            // Find nodes by address if they're not direct references
            sourceNode = this.originalData.current.nodes.find(n => n.account_vertex.address === link.source_account_vertex.address);
            destinationNode = this.originalData.current.nodes.find(n => n.account_vertex.address === link.target_account_vertex.address);
        }

        if (!sourceNode || !destinationNode) {
            console.error("Source or destination node not found in the graph data.");
            return "Error: Node not found";
        }
        
        if (link.type === TransferType.SWAP_OUTGOING || link.type === TransferType.SWAP_ROUTER_OUTGOING) {
            mintSource = this.metadataServices.getMintInfo(destinationNode.mint_address!);
        } else {
            mintSource = this.metadataServices.getMintInfo(sourceNode.mint_address!);
        } 
        const mintDestination = this.metadataServices.getMintInfo(destinationNode.mint_address!);
    
        // Calculate USD values and get mint info
        const sourceUSD = this.usdServices.calculateUSDValue(
            link.amount_source, 
            mintSource!.mint_address, 
            this.processedData.current.transactions[link.transaction_signature].mint_usd_price_ratio
        );
    
        const destinationUSD = this.usdServices.calculateUSDValue(
            link.amount_destination, 
            mintDestination!.mint_address, 
            this.processedData.current.transactions[link.transaction_signature].mint_usd_price_ratio
        );
    
        // Get formatted amounts for source and destination
        const sourceAmountDetails = this.getAmountDetails(link, mintSource);
        const destinationAmountDetails = this.getAmountDetails(link, mintDestination, true);
    
        // Format the amount line based on link type
        const TransferDetailsHTML = link.type === TransferType.SWAP 
        ? (() => {
            // Find the swap details
            const swapDetails = this.processedData.current.transactions[link.transaction_signature].swaps.find(s => s.id === link.swap_id);
            let feeAmount = null;
            let feeUSD = null;
            
            if (swapDetails?.fee) {
                // Format fee using destination mint decimals
                const formattedFee = this.calculateTokenAmount(swapDetails.fee, mintDestination);
                feeAmount = formattedFee + " " + mintDestination?.symbol;
                feeUSD = this.usdServices.calculateUSDValue(
                    swapDetails.fee,
                    destinationNode.mint_address,
                    this.processedData.current.transactions[link.transaction_signature].mint_usd_price_ratio
                );
            }
    
            return this.formatSwapAmount(
                sourceAmountDetails.amountString, 
                sourceAmountDetails.imageHTML, 
                sourceUSD,
                destinationAmountDetails.amountString, 
                destinationAmountDetails.imageHTML, 
                destinationUSD,
                feeAmount, 
                feeUSD
            );
        })()
        : this.formatNormalAmount(link, sourceAmountDetails.amountString, sourceAmountDetails.imageHTML, sourceUSD);
        return TransferDetailsHTML;
    }

    
    // Default implementation for context menu items
    getNodeContextMenuItems(node: ForceGraphNode): ContextMenuItem[] {
        // Check if the node is currently fixed (has fx and fy properties)
        const isFixed = node.fx !== undefined && node.fy !== undefined;

        // Default context menu items available for all strategies
        return [
            {
                label: "Copy Address",
                action: "copy_address"
            },
            {
                label: "Rename Account", 
                action: "rename_account"
            },
            {
                label: "Show Details",
                action: "show_details"
            },
            {
                label: isFixed ? "Unfix Position" : "Fix Position",
                action: "toggle_fix_position"
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
            case "rename_account":
                // The strategy class itself doesn't have access to hooks directly
                // We'll need to implement this in a component that uses the strategy
                // See the implementation in useGraphInteractions below
                break;
            case "show_details":
                // Show detailed view can be implemented by specific strategies
                console.log("Show details for:", node);
                break;
            case "toggle_fix_position":
                // Toggle fixing the node position
                if (node.fx !== undefined && node.fy !== undefined) {
                    // Node is currently fixed, so unfix it
                    node.fx = undefined;
                    node.fy = undefined;
                } else {
                    // Node is not fixed, so fix it at its current position
                    node.fx = node.x;
                    node.fy = node.y;
                }
                // Ensure the graph updates to reflect the change
                if (this.processedData.current) {
                    // Create a new reference to trigger React state updates
                    const updatedNodes = [...this.processedData.current.nodes];
                    this.processedData.current.nodes = updatedNodes;
                }
                break;
            default:
                console.log(`Unhandled action: ${action} for node:`, node);
        }
    }

    getGeneralContent(strategyContent:React.ReactNode=null): React.ReactNode {
        // FeesOptions component to handle showing/hiding fees
        const FeesOptions = () => {
            // Track the state of the checkbox based on the current hideFees value
            const [hideFeesChecked, setHideFeesChecked] = React.useState<boolean>(this.hideFees.current);
                    
            // Handle checkbox change
            const handleHideFeesChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
                const isChecked = event.target.checked;
                setHideFeesChecked(isChecked);
                this.HideFees(isChecked);
            };
                    
            return (
                <div className="general-options" style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={hideFeesChecked}
                                onChange={handleHideFeesChange}
                                style={{ marginRight: '8px' }}
                            />
                            <span>Hide fees</span>
                        </label>
                    </div>
                </div>
            );
        }

        // SwapOptions component to handle collapse/expand actions for swap routers and programs
        const SwapOptions = () => {
            // Track hover states for all buttons
            const [routerCollapseHovered, setRouterCollapseHovered] = React.useState<boolean>(false);
            const [routerExpandHovered, setRouterExpandHovered] = React.useState<boolean>(false);
            const [programCollapseHovered, setProgramCollapseHovered] = React.useState<boolean>(false);
            const [programExpandHovered, setProgramExpandHovered] = React.useState<boolean>(false);
            
            // Handlers for router buttons
            const handleRouterCollapse = (): void => {
                this.CollapseAllSwap(true, true); // true for router, true for collapse
            };
            
            const handleRouterExpand = (): void => {
                this.CollapseAllSwap(true, false); // true for router, false for expand
            };
            
            // Handlers for program buttons
            const handleProgramCollapse = (): void => {
                this.CollapseAllSwap(false, true); // false for program, true for collapse
            };
            
            const handleProgramExpand = (): void => {
                this.CollapseAllSwap(false, false); // false for program, false for expand
            };
            
            // Common button style
            const buttonStyle = {
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: '#2A2A2A',
                marginLeft: '8px',
                transition: 'background-color 0.2s'
            };
            
            return (
                <div className="general-options">
                    {/* Swap Routers row */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ flex: 1 }}>Swap Routers</span>
                        <div 
                            style={buttonStyle}
                            onClick={handleRouterCollapse}
                            onMouseEnter={() => setRouterCollapseHovered(true)}
                            onMouseLeave={() => setRouterCollapseHovered(false)}
                        >
                            <img 
                                src="/collapse.svg" 
                                alt="Collapse" 
                                style={{ 
                                    width: '16px', 
                                    height: '16px', 
                                    marginRight: '4px',
                                    filter: routerCollapseHovered ? "invert(29%) sepia(94%) saturate(1351%) hue-rotate(254deg) brightness(101%) contrast(111%)" : "brightness(0) invert(1)"
                                }} 
                            />
                            <span>Collapse All</span>
                        </div>
                        <div 
                            style={buttonStyle}
                            onClick={handleRouterExpand}
                            onMouseEnter={() => setRouterExpandHovered(true)}
                            onMouseLeave={() => setRouterExpandHovered(false)}
                        >
                            <img 
                                src="/expand.svg" 
                                alt="Expand" 
                                style={{ 
                                    width: '16px', 
                                    height: '16px', 
                                    marginRight: '4px',
                                    filter: routerExpandHovered ? "invert(29%) sepia(94%) saturate(1351%) hue-rotate(254deg) brightness(101%) contrast(111%)" : "brightness(0) invert(1)"
                                }} 
                            />
                            <span>Expand All</span>
                        </div>
                    </div>
                    
                    {/* Swap Programs row */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ flex: 1 }}>Swap Programs</span>
                        <div 
                            style={buttonStyle}
                            onClick={handleProgramCollapse}
                            onMouseEnter={() => setProgramCollapseHovered(true)}
                            onMouseLeave={() => setProgramCollapseHovered(false)}
                        >
                            <img 
                                src="/collapse.svg" 
                                alt="Collapse" 
                                style={{ 
                                    width: '16px', 
                                    height: '16px', 
                                    marginRight: '4px',
                                    filter: programCollapseHovered ? "invert(29%) sepia(94%) saturate(1351%) hue-rotate(254deg) brightness(101%) contrast(111%)" : "brightness(0) invert(1)"
                                }} 
                            />
                            <span>Collapse All</span>
                        </div>
                        <div 
                            style={buttonStyle}
                            onClick={handleProgramExpand}
                            onMouseEnter={() => setProgramExpandHovered(true)}
                            onMouseLeave={() => setProgramExpandHovered(false)}
                        >
                            <img 
                                src="/expand.svg" 
                                alt="Expand" 
                                style={{ 
                                    width: '16px', 
                                    height: '16px', 
                                    marginRight: '4px',
                                    filter: programExpandHovered ? "invert(29%) sepia(94%) saturate(1351%) hue-rotate(254deg) brightness(101%) contrast(111%)" : "brightness(0) invert(1)"
                                }} 
                            />
                            <span>Expand All</span>
                        </div>
                    </div>
                </div>
            );
        };
        
        return (
            <div className="strategy-panel-content">
                <SwapOptions />
                <FeesOptions />
                {(strategyContent) ? strategyContent : ""}
            </div>
        );
    }

    /**
     * Returns content for the Filters accordion section
     * Override in concrete strategies for strategy-specific filtering options
     */
    getFiltersContent(strategyContent:React.ReactNode=null): React.ReactNode {
        // TransferFilters component to handle transfer filtering options
        const TransferFilters = () => {
            // State for input values
            const [minSolAmount, setMinSolAmount] = React.useState<string>(this.minSolAmount.current.toString());
            const [maxSolAmount, setMaxSolAmount] = React.useState<string>(this.maxSolAmount.current?.toString() || '');
            const [minTokenAmount, setMinTokenAmount] = React.useState<string>(this.minTokenAmount.current.toString());
            const [maxTokenAmount, setMaxTokenAmount] = React.useState<string>(this.maxTokenAmount.current?.toString() || '');
            const [minValueUSD, setMinValueUSD] = React.useState<string>(this.minValuetUSD.current.toString());
            const [maxValueUSD, setMaxValueUSD] = React.useState<string>(this.maxValueUSD.current?.toString() || '');
            
            // Validation helpers
            const isValidNumber = (val: string): boolean => {
                if (val === '') return true;
                const num = parseFloat(val);
                return !isNaN(num) && isFinite(num);
            };

            const parseNumberOrNull = (val: string): number | null => {
                return val === '' ? null : parseFloat(val);
            };

            // Handle apply filters
            const handleApplyFilters = (): void => {
                // Only update if all values are valid
                if (isValidNumber(minSolAmount) && 
                    isValidNumber(maxSolAmount) &&
                    isValidNumber(minTokenAmount) &&
                    isValidNumber(maxTokenAmount) &&
                    isValidNumber(minValueUSD) &&
                    isValidNumber(maxValueUSD)) {
                    
                    // Update filter values using class setters
                    this.setMinSolAmount(parseFloat(minSolAmount) || 0);
                    this.setMaxSolAmount(parseNumberOrNull(maxSolAmount));
                    this.setMinTokenAmount(parseFloat(minTokenAmount) || 0);
                    this.setMaxTokenAmount(parseNumberOrNull(maxTokenAmount));
                    this.setMinValueUSD(parseFloat(minValueUSD) || 0);
                    this.setMaxValueUSD(parseNumberOrNull(maxValueUSD));
                    
                    // Apply the filters
                    this.applyFilters();
                }
            };

            // Common styles
            const containerStyle = {
                marginBottom: '16px'
            };

            const fieldStyle = {
                marginBottom: '8px'
            };

            const labelStyle = {
                display: 'block',
                marginBottom: '4px',
                fontSize: '14px'
            };

            const inputStyle = {
                width: '100%',
                padding: '6px',
                backgroundColor: '#2A2A2A',
                color: 'white',
                border: '1px solid #444',
                borderRadius: '4px'
            };

            const errorStyle = {
                color: 'red',
                fontSize: '12px',
                marginTop: '2px'
            };

            const buttonStyle = {
                padding: '8px 16px',
                backgroundColor: '#9945FF',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '8px'
            };

            return (
                <div style={containerStyle}>
                    <h3 style={{ marginBottom: '12px' }}>Transfer Filters</h3>
                    
                    {/* SOL Amounts */}
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Minimum SOL Amount</label>
                        <input
                            type="text"
                            value={minSolAmount}
                            onChange={(e) => setMinSolAmount(e.target.value)}
                            style={{
                                ...inputStyle,
                                borderColor: isValidNumber(minSolAmount) ? '#444' : 'red'
                            }}
                        />
                        {!isValidNumber(minSolAmount) && (
                            <div style={errorStyle}>Please enter a valid number</div>
                        )}
                    </div>
                    
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Maximum SOL Amount (empty for no limit)</label>
                        <input
                            type="text"
                            value={maxSolAmount}
                            onChange={(e) => setMaxSolAmount(e.target.value)}
                            style={{
                                ...inputStyle,
                                borderColor: isValidNumber(maxSolAmount) ? '#444' : 'red'
                            }}
                        />
                        {!isValidNumber(maxSolAmount) && (
                            <div style={errorStyle}>Please enter a valid number</div>
                        )}
                    </div>
                    
                    {/* Token Amounts */}
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Minimum Token Amount</label>
                        <input
                            type="text"
                            value={minTokenAmount}
                            onChange={(e) => setMinTokenAmount(e.target.value)}
                            style={{
                                ...inputStyle,
                                borderColor: isValidNumber(minTokenAmount) ? '#444' : 'red'
                            }}
                        />
                        {!isValidNumber(minTokenAmount) && (
                            <div style={errorStyle}>Please enter a valid number</div>
                        )}
                    </div>
                    
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Maximum Token Amount (empty for no limit)</label>
                        <input
                            type="text"
                            value={maxTokenAmount}
                            onChange={(e) => setMaxTokenAmount(e.target.value)}
                            style={{
                                ...inputStyle,
                                borderColor: isValidNumber(maxTokenAmount) ? '#444' : 'red'
                            }}
                        />
                        {!isValidNumber(maxTokenAmount) && (
                            <div style={errorStyle}>Please enter a valid number</div>
                        )}
                    </div>
                    
                    {/* USD Values */}
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Minimum USD Value</label>
                        <input
                            type="text"
                            value={minValueUSD}
                            onChange={(e) => setMinValueUSD(e.target.value)}
                            style={{
                                ...inputStyle,
                                borderColor: isValidNumber(minValueUSD) ? '#444' : 'red'
                            }}
                        />
                        {!isValidNumber(minValueUSD) && (
                            <div style={errorStyle}>Please enter a valid number</div>
                        )}
                    </div>
                    
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Maximum USD Value (empty for no limit)</label>
                        <input
                            type="text"
                            value={maxValueUSD}
                            onChange={(e) => setMaxValueUSD(e.target.value)}
                            style={{
                                ...inputStyle,
                                borderColor: isValidNumber(maxValueUSD) ? '#444' : 'red'
                            }}
                        />
                        {!isValidNumber(maxValueUSD) && (
                            <div style={errorStyle}>Please enter a valid number</div>
                        )}
                    </div>
                    
                    <button 
                        onClick={handleApplyFilters}
                        style={buttonStyle}
                        disabled={
                            !isValidNumber(minSolAmount) || 
                            !isValidNumber(maxSolAmount) || 
                            !isValidNumber(minTokenAmount) ||
                            !isValidNumber(maxTokenAmount) || 
                            !isValidNumber(minValueUSD) || 
                            !isValidNumber(maxValueUSD)
                        }
                    >
                        Apply Filters
                    </button>
                </div>
            );
        };

        return (
            <div className="strategy-panel-content">
                <TransferFilters />
                {(strategyContent) ? strategyContent : ""}
            </div>
        );
    }

    /**
     * Returns content for the Grouping accordion section
     * Override in concrete strategies for strategy-specific grouping options
     */
    getGroupingContent(strategyContent:React.ReactNode=null): React.ReactNode {
        return (
            <div className="strategy-panel-content">
                <p>Base grouping options</p>
                {/* No common grouping controls in base strategy */}
                {(strategyContent) ? strategyContent : ""}
            </div>
        );
    }

    /**
     * Returns content for the Nodes Info accordion section
     * Override in concrete strategies for strategy-specific Nodes information
     */
    getNodesInfoContent(strategyContent:React.ReactNode=null): React.ReactNode {
        return (
            <div className="strategy-panel-content">
                {/* Add common contextual information */}
                <div className="info-section">
                    <p>Selected nodes: {this.selectedNodes.current?.size || 0}</p>
                </div>
                {(strategyContent) ? strategyContent : ""}
            </div>
        );
    }
    
    // Abstract methods that must be implemented by derived classes
    abstract initializeGraphData(data: GraphData, setProcessedData: React.Dispatch<React.SetStateAction<GraphData>>): void;
    abstract nodeTooltip(node: GraphNode): string;
    abstract linkCanvasObject(link: ForceGraphLink, ctx: CanvasRenderingContext2D, globalScale: number): void;
    abstract linkTooltip(link: GraphLink): string;
}