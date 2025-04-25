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

    private ApplyHideFees(data: GraphData): GraphData {
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

        return data;
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

    protected applyFilters() {
        // Start with the original data
        let data = cloneDeep(this.originalData.current); 

        // Collapse or expand swap programs based on the current state
        this.ApplyCollapseExpandSwapPrograms(data);

        // Hide fees if the option is enabled
        this.ApplyHideFees(data);


        this.saveCurrentNodePositions()
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
            if (node.type == AccountType.WALLET_ACCOUNT){
                mintCanvas = this.metadataServices.walletAccountCanvasState;
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
                <div className="filter-options" style={{ marginTop: '16px' }}>
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
                <div className="filter-options">
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
        return (
            <div className="strategy-panel-content">
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