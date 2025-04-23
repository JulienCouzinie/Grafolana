import React, { Ref } from 'react';
import { GraphData, GraphNode, GraphLink, ForceGraphLink, ForceGraphNode, AccountVertex, AccountType, TransferType } from '@/types/graph';
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

    isCollapseSwapRouters: React.RefObject<boolean>;
    isCollapseSwapPrograms: React.RefObject<boolean>;

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
        this.isCollapseSwapRouters = useRef(true);
        this.isCollapseSwapPrograms = useRef(true);
    }

    private CollapseExpandSwapPrograms(data: GraphData, swapIdList: Set<number>): GraphData {
        if (this.isCollapseSwapPrograms.current) {
            
            // Remove the links that are part of the swaps
            data.links = data.links.filter((link) => {
                if (link.type === TransferType.SWAP_INCOMING || link.type === TransferType.SWAP_OUTGOING) {
                    return true;
                }
                if (swapIdList.has(link.swap_parent_id!)) {
                    return false;
                }
                return true;
            });

            // Build the list of nodes that are source and target in data.links
            const activeVertices = new Set<string>();
                        
            // Add all node account vertices that appear in any remaining link
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
        else {

        }
        
        return data;
    }

    private CollapseExpandSwapProgram(data: GraphData, swap_id: number): GraphData {
        return this.CollapseExpandSwapPrograms(data, new Set<number>([swap_id]));
    }

    private CollapseExpandAllSwapPrograms(data: GraphData): GraphData {
        // Get all swaps from data.transactions
        const swapIdList = new Set<number>();
        Object.values(data.transactions).forEach((transaction) => {
            transaction.swaps.forEach((swap) => {
                swapIdList.add(swap.id);
            });
        });
        // Collapse all swaps
        return this.CollapseExpandSwapPrograms(data, swapIdList);

    }

    processData(data: GraphData): GraphData{
        this.originalData.current = data;
        const clonedData = cloneDeep(data);

        data = this.CollapseExpandAllSwapPrograms(clonedData);

        return clonedData;
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

        // Draw circle background with dark gray fill
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, nodeSize, 0, 2 * Math.PI, false);
        ctx.fillStyle = SOLANA_COLORS.darkGray;
        ctx.fill();

        // Draw colored rim
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, nodeSize, 0, 2 * Math.PI, false);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = isSelected ? SOLANA_COLORS.purple : SOLANA_COLORS.green;
        ctx.stroke();

        if (mintInfo) {
            //console.log("mintInfo", mintInfo.mint_address);
            let mintCanvas;
            if (node.type == AccountType.WALLET_ACCOUNT){
                mintCanvas = this.metadataServices.walletAccountCanvasState;
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

    /**
     * Returns content for the Filters accordion section
     * Override in concrete strategies for strategy-specific filtering options
     */
    getFiltersContent(strategyContent:React.ReactNode=null): React.ReactNode {
        const CheckboxFilters = () => {
              // Use React state to track checkbox values
              const [routerChecked, setRouterChecked] = React.useState<boolean>(this.isCollapseSwapRouters.current);
              const [programChecked, setProgramChecked] = React.useState<boolean>(this.isCollapseSwapPrograms.current);
              
              // Update class properties and state together
              const handleRouterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                const isChecked = e.target.checked;
                this.isCollapseSwapRouters.current = isChecked;
                setRouterChecked(isChecked);
                
                // If router is checked, program must also be checked
                if (isChecked) {
                  this.isCollapseSwapPrograms.current = true;
                  setProgramChecked(true);
                }
              };
              
              const handleProgramChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                const isChecked = e.target.checked;
                this.isCollapseSwapPrograms.current = isChecked;
                setProgramChecked(isChecked);
              };
              
              return (
                <div className="filter-options">
                  <div className="filter-option">
                    <label className="filter-checkbox">
                      <input 
                        type="checkbox" 
                        onChange={handleRouterChange}
                        checked={routerChecked}
                      />
                      <span className="filter-label">Collapse Swap Routers</span>
                    </label>
                  </div>
                  <div className="filter-option">
                    <label className="filter-checkbox">
                      <input 
                        type="checkbox"
                        onChange={handleProgramChange}
                        checked={programChecked}
                        disabled={routerChecked}
                      />
                      <span className="filter-label">Collapse Swap Programs</span>
                    </label>
                  </div>
                </div>
              );
            };
        
        return (
            <div className="strategy-panel-content">
                <CheckboxFilters />
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
    abstract nodeTooltip(node: GraphNode): string;
    abstract linkCanvasObject(link: ForceGraphLink, ctx: CanvasRenderingContext2D, globalScale: number): void;
    abstract linkTooltip(link: GraphLink): string;
}