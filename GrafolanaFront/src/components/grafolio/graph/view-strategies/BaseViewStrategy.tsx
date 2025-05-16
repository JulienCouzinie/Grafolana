import React from 'react';
import { GraphData, GraphNode, GraphLink, ForceGraphLink, ForceGraphNode, AccountVertex, AccountType, TransferType, NodePosition, Swap } from '@/types/graph';
import { ContextMenuItem, ViewStrategy } from './ViewStrategy';
import { useRef } from 'react';
import { useMetadata } from '@/components/metadata/metadata-provider';
import { useUSDValue } from '@/hooks/useUSDValue';
import { AddressType, MintDTO } from '@/types/metadata';
import { cloneDeep } from 'lodash';
import { calculateTokenAmount } from '@/utils/tokenUtils';
import { AddressLabel } from '@/components/metadata/address-label';
import { type PublicKey } from '@solana/web3.js';
import { useTransactions } from '@/components/transactions/transactions-provider';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

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
    protected transactionProvider: ReturnType<typeof useTransactions>;
   
    selectedNodes: React.RefObject<Set<string>>;
    selectedLinks: React.RefObject<Set<string>>;
    hoveredNode: ForceGraphNode | null;
    hoveredLink: ForceGraphLink | null;

    // Filters
    mapSwapProgramsCollapsed: React.RefObject<Map<number, boolean>>;
    hideFees: React.RefObject<boolean>;
    hideSwaps: React.RefObject<boolean>;
    hideCreateAccounts: React.RefObject<boolean>;
    hideCloseAccounts: React.RefObject<boolean>;
    hideSpam: React.RefObject<boolean>;

    transactionsClusterGroups: React.RefObject<number[]>;
    selectedTransactionClusterGroup: React.RefObject<number[]>;

    minSolAmount: React.RefObject<number>;
    maxSolAmount: React.RefObject<number|null>;
    minTokenAmount: React.RefObject<number>;
    maxTokenAmount: React.RefObject<number|null>;
    minValuetUSD: React.RefObject<number>;
    maxValueUSD: React.RefObject<number|null>;

    minDateTime: React.RefObject<Date|null>;
    maxDateTime: React.RefObject<Date|null>;

    accountAddressesFilter: React.RefObject<Set<string>>;

    publicKey: PublicKey | null = null; // Public key of the connected wallet

    private processGraphDataCallBack: React.RefObject<((data:GraphData) => void) | null>;

    savedNodePositions: Map<string, {position: NodePosition}> | null = null;

    constructor(
        metadataServices: ReturnType<typeof useMetadata>,
        usdServices: ReturnType<typeof useUSDValue>,
        transactionProvider: ReturnType<typeof useTransactions>,
        processedDataRef: React.RefObject<GraphData>,
        originalDataRef: React.RefObject<GraphData>,
        selectedNodesRef: React.RefObject<Set<string>>,
        selectedLinksRef: React.RefObject<Set<string>>,
        publicKey: PublicKey | null = null
    ) {
        this.metadataServices = metadataServices;
        this.usdServices = usdServices;
        this.transactionProvider = transactionProvider;

        this.processedData = processedDataRef;
        this.originalData = originalDataRef;
        
        // Initialize hover states
        this.hoveredNode = null;
        this.hoveredLink = null;
        this.selectedNodes = selectedNodesRef;
        this.selectedLinks = selectedLinksRef;

        this.mapSwapProgramsCollapsed = useRef(new Map<number, boolean>());

        this.processGraphDataCallBack = useRef(null);

        this.hideFees = useRef(false);
        this.hideSwaps = useRef(false);
        this.hideCreateAccounts = useRef(false);
        this.hideCloseAccounts = useRef(false);
        this.hideSpam = useRef(false);

        this.transactionsClusterGroups = useRef<number[]>([]);
        this.selectedTransactionClusterGroup = useRef<number[]>([]);

        this.minSolAmount = useRef(0);
        this.maxSolAmount = useRef(null);
        this.minTokenAmount = useRef(0);
        this.maxTokenAmount = useRef(null);
        this.minValuetUSD = useRef(0);
        this.maxValueUSD = useRef(null);

        this.minDateTime = useRef<Date|null>(null);
        this.maxDateTime = useRef<Date|null>(null);

        this.accountAddressesFilter = useRef<Set<string>>(new Set());

        this.publicKey = publicKey;
    }

    positionNodes(): void {
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

    /**
     * rebuild links keys order for each transaction
     * Rebuild the links keys by ordering them by key then redifining the keys starting from 1 in increments of 1
     * @param data 
     */
    private rebuildLinksKeys(data: GraphData): void {
        // Group links by transaction signature
        const linksByTransaction = new Map<string, GraphLink[]>();
        data.links.forEach((link) => {
            if (!linksByTransaction.has(link.transaction_signature)) {
                linksByTransaction.set(link.transaction_signature, []);
            }
            linksByTransaction.get(link.transaction_signature)?.push(link);
        });

        // Rebuild keys for each transaction group
        linksByTransaction.forEach((links) => {
            links.sort((a, b) => a.key - b.key); // Sort by key
            links.forEach((link, index) => {
                link.key = index + 1; // Reassign keys starting from 1
            });
        });
    }

    /**
     * Add an account address to the filter list
     * @param address - Account address to add
     */
    protected addAccountToFilter(address: string): void {
        if (!address.trim()) return;
        
        // Convert to lowercase for case-insensitive matching
        const normalizedAddress = address.trim();
        
        // Create a new Set to ensure reference changes for React
        const updatedAddresses = new Set(this.accountAddressesFilter.current);
        updatedAddresses.add(normalizedAddress);
        this.accountAddressesFilter.current = updatedAddresses;
    }

    /**
     * Remove an account address from the filter list
     * @param address - Account address to remove
     */
    protected removeAccountFromFilter(address: string): void {
        const updatedAddresses = new Set(this.accountAddressesFilter.current);
        updatedAddresses.delete(address);
        this.accountAddressesFilter.current = updatedAddresses;
    }

    /**
     * Apply filter to show only links that involve specified accounts
     * @param data - graph data to filter
     */
    protected ApplyAccountAddressesFilter(data: GraphData): void {
        // If no account addresses specified, don't filter anything
        if (this.accountAddressesFilter.current.size === 0) {
            return;
        }

        // Filter links based on whether source or target account is in our filter list
        data.links = data.links.filter((link) => {
            const sourceAddress = link.source_account_vertex.address;
            const targetAddress = link.target_account_vertex.address;
            
            return this.accountAddressesFilter.current.has(sourceAddress) || 
                this.accountAddressesFilter.current.has(targetAddress);
        });

        this.pruneIsolatedNodes(data); // Remove isolated nodes after filtering links
    }

    /**
     * Clear all account addresses from the filter
     */
    protected clearAccountsFilter(): void {
        this.accountAddressesFilter.current.clear();
    }

    protected setMinDateTime(date: Date|null): void {
        this.minDateTime.current = date;
    }

    protected setMaxDateTime(date: Date|null): void {
        this.maxDateTime.current = date;
    }

    /**
     * Apply filter to filter transactions by their timestamp
     * @param data - graph data to filter
     */
    protected ApplyDateFilters(data: GraphData): void {
        // If neither min nor max date is set, no filtering needed
        if (!this.minDateTime.current && !this.maxDateTime.current) {
            return;
        }

        // Filter out transactions that don't match the date range
        data.links = data.links.filter((link) => {
            const transaction = this.originalData.current.transactions[link.transaction_signature];
            if (!transaction || !transaction.timestamp) return true; // Keep if no timestamp data
            
            // Apply min date filter
            if (this.minDateTime.current && transaction.timestamp < this.minDateTime.current.getTime()) {
                return false;
            }
            
            // Apply max date filter
            if (this.maxDateTime.current && transaction.timestamp > this.maxDateTime.current.getTime()) {
                return false;
            }
            
            return true;
        });
        
        this.pruneIsolatedNodes(data); // Remove isolated nodes after filtering links
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

        // Rebuild the links keys after filtering
        this.rebuildLinksKeys(data);

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

    /**
     * Set the map of swap programs to collapse or expand a specific swap
     * @param swap - The swap to collapse/expand
     * @param collapse - true to collapse, false to expand it
     */
    protected SetExpandSwapProgram(node: ForceGraphNode): void {
        // Get the swap id from the swap list in the transaction data
        const swap = this.originalData.current.transactions[node.account_vertex.transaction_signature].swaps.find(swap => swap.program_account_vertex.id === node.account_vertex.id);
        
        if (!swap) {
            console.error("Swap not found for node:", node);
            return;
        }
        // Set the collapse state for a specific swap program in the data
        this.mapSwapProgramsCollapsed.current.set(swap.id, false);
    }

    protected CollapseAllSwap(router: boolean, collapse: boolean): void {
        this.SetCollapseAllSwap(router,collapse);
        this.applyFilters();
    }

    /**
     * Collapse/Expand a specific swap program
     * 
     * @param swap 
     * @param collapse 
     */
    protected ExpandSwapProgram(node: ForceGraphNode): void {
        this.SetExpandSwapProgram(node);
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
            node = data.nodes.find(n => n.account_vertex.id === link.source_account_vertex.id);
            amount = cloneDeep(link.amount_source);
        } else {
            node = data.nodes.find(n => n.account_vertex.id === link.target_account_vertex.id);
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
        const amountReal = calculateTokenAmount(amount, mintInfo);
        
        // Try to get USD value if available
        let usdValue: number | null = null;
        const transactionData = this.originalData.current.transactions[link.transaction_signature];
        if (transactionData && transactionData.mint_usd_price_ratio && mintAddress) {
           usdValue = this.usdServices.calculateUSDValue(
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

    /**
     * Apply filter to hide/show swaps transfers in the graph
     * filter all transfers that have a swap_parent_id or parent_router_swap_id 
     */
    protected ApplyHideSwaps(data: GraphData): void {
        // Filter out the links that have a swap_parent_id or parent_router_swap_id
        data.links = data.links.filter((link) => {
            if (link.swap_parent_id !== undefined || link.parent_router_swap_id !== undefined) {
                return !this.hideSwaps.current;
            }
            return true;
        });

        this.pruneIsolatedNodes(data); // Remove isolated nodes after filtering links
    }

    /**
     * Hide/Show swaps transfers in graph
     * * @param hide - true to hide swaps, false to show them
     */
    protected HideSwaps(hide: boolean): void {
        this.hideSwaps.current = hide;
        this.applyFilters();
    }

    /** 
     * Apply filter to hide/show create accounts transfers in the graph
     * filter all transfers that have a type of CREATE_ACCOUNT
     * * @param hide - true to hide create accounts, false to show them
    */
    protected HideCreateAccounts(hide: boolean): void {
        this.hideCreateAccounts.current = hide;
        this.applyFilters();
    }

    /**
     * Apply filter to hide create accounts transfers in the graph
     * * filter all transfers that have a type of CREATE_ACCOUNT
     * * @param data - graph data to filter
     */
    protected ApplyHideCreateAccounts(data: GraphData): void {
        // Filter out the links that have a type of CREATE_ACCOUNT
        data.links = data.links.filter((link) => {
            if (link.type === TransferType.CREATE_ACCOUNT) {
                return !this.hideCreateAccounts.current;
            }
            return true;
        });

        this.pruneIsolatedNodes(data); // Remove isolated nodes after filtering links
    }

    /**
     * Hide/Show close accounts transfers in graph
     * * @param hide - true to hide close accounts, false to show them
     */
    protected HideCloseAccounts(hide: boolean): void {
        this.hideCloseAccounts.current = hide;
        this.applyFilters();
    }

    /**
     * Apply filter to hide/show close accounts transfers in the graph
     * filter all transfers that have a type of CLOSE_ACCOUNT
     * * @param data - graph data to filter
     */
    protected ApplyHideCloseAccounts(data: GraphData): void {
        // Filter out the links that have a type of CLOSE_ACCOUNT
        data.links = data.links.filter((link) => {
            if (link.type === TransferType.CLOSE_ACCOUNT) {
                return !this.hideCloseAccounts.current;
            }
            return true;
        });

        this.pruneIsolatedNodes(data); // Remove isolated nodes after filtering links
    }

    /**
     * Hide/Show spam
     * Hide/Show transaction that have a signer that is not in the list of known spam addresses
     * * @param hide - true to hide spam, false to show them
     */
    protected HideSpam(hide: boolean): void {
        this.hideSpam.current = hide;
        this.applyFilters();
    }

    /**
     * Apply filter to hide/show spam transfers in the graph
     * filter all transfers that have a signer that is not in the list of known spam addresses
     * * @param data - graph data to filter
     */
    protected ApplyHideSpam(data: GraphData): void {
        // Filter out the links that have a signer that is not in the list of known spam addresses
        data.links = data.links.filter((link) => {
            const transactionData = this.originalData.current.transactions[link.transaction_signature];
            if (transactionData && transactionData.signers) {
                const isSpam = transactionData.signers.some((signer) => {
                    return this.metadataServices.isSpam(signer);
                });
                return !isSpam || !this.hideSpam.current;
            }
            return true;
        });

        this.pruneIsolatedNodes(data); // Remove isolated nodes after filtering links
    }

    /**
     * Apply filter to only show transactions that are in the selected transaction cluster groups
     */
    protected ApplyTransactionClusterGroup(data: GraphData): void {
        // If no transaction cluster groups are selected, show all transactions
        if (this.selectedTransactionClusterGroup.current.length === 0) {
            return;
        }
        // Filter out the transactions that are not in the selected transaction cluster groups
        data.links = data.links.filter((link) => {
            const transactionData = this.originalData.current.transactions[link.transaction_signature];
            if (transactionData.isomorphic_group == null) {
                return false;
            }
            if (transactionData && transactionData.isomorphic_group !== null) {
                return this.selectedTransactionClusterGroup.current.includes(transactionData.isomorphic_group);
            }
            return true;
        });

        this.pruneIsolatedNodes(data); // Remove isolated nodes after filtering links
    }

    public applyFilters() {
        this.saveCurrentNodePositions()
        // Start with the original data
        let data = cloneDeep(this.originalData.current); 

        // Apply TransactionClusterGroup filter
        this.ApplyTransactionClusterGroup(data);

        // Apply account addresses filter
        this.ApplyAccountAddressesFilter(data);

        // Apply date range filters
        this.ApplyDateFilters(data);

        // Apply HideSpam filter
        this.ApplyHideSpam(data);

        // Apply HideSwaps filter
        this.ApplyHideSwaps(data);

        // Collapse or expand swap programs based on the current state
        this.ApplyCollapseExpandSwapPrograms(data);

        // Hide fees if the option is enabled
        this.ApplyHideFees(data);

        this.ApplyHideCreateAccounts(data); // Hide create accounts if the option is enabled

        this.ApplyHideCloseAccounts(data); // Hide close accounts if the option is enabled

        this.applyTransferFilters(data);

        this.forceReProcess(data); // Trigger reprocessing by the view with the updated data

        this.restoreNodePositions(); // Restore node positions after reprocessing
    }

    /**
     * Retrieve and set the transactionsClusterGroups
     * Transaction clusters are transactions which graphs are isomorphic to each other
     * Retrieve the list of transactions clusters by looking at isomorphic_group from TransactionDTO
     * by looking at 
     * @param data 
     */
    protected getTransactionsClusterGroups(data: GraphData): number[] {
        const transactions = Object.values(data.transactions);
        const clusters = new Set<number>();
        
        transactions.forEach((transaction) => {
            if (transaction.isomorphic_group !== null) {
                clusters.add(transaction.isomorphic_group);
            }
        });
        
        this.transactionsClusterGroups.current = Array.from(clusters);
        return this.transactionsClusterGroups.current;
    }


    setupGraphData(data: GraphData) {
        this.originalData.current = cloneDeep(data);
        this.getTransactionsClusterGroups(data);
        this.SetCollapseAllSwaps(true); // Collapse all swap programs by default

        this.applyFilters();
    }

    protected getForceGraphNodebyAccountVertex(nodes: ForceGraphNode[], accountVertex: AccountVertex): ForceGraphNode | undefined {
        return nodes.find((node) => node.account_vertex.id === accountVertex.id);
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
        const linkId = link.id;
        const isSelected = this.selectedLinks.current?.has(linkId) || false; // Check if the link is selected


        if (isHovered) {
            // If the link is hovered, set the color to blue
            return {
                width: 4,
                color: SOLANA_COLORS.blue,
                curvature: link.curvature || 0,
                lineDash: [],
                arrowLength: 8,
                arrowColor: SOLANA_COLORS.purple
            };
        } else if (isSelected) {
            // If the link is selected, set the color to purple
            return {
                width: 4,
                color: SOLANA_COLORS.purple,
                curvature: link.curvature || 0,
                lineDash: [],
                arrowLength: 8,
                arrowColor: SOLANA_COLORS.purple
            };
        } 
        return {
            width: 2,
            color: SOLANA_COLORS.darkGray,
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
        if (node.type == AccountType.WALLET_ACCOUNT) {
            nodeColor = COLORS.lightgray;
        } else if (node.type == AccountType.PROGRAM_ACCOUNT) {
            nodeColor = COLORS.blue;
        } else if (node.type == AccountType.FEE_ACCOUNT) {
            nodeColor = COLORS.yellow;
        } else if (node.type == AccountType.BURN_ACCOUNT) {
            nodeColor = COLORS.red;
        } else if (node.type == AccountType.MINTTO_ACCOUNT) {
            nodeColor = COLORS.darkgreen;
        } else if (node.type == AccountType.STAKE_ACCOUNT) {
            nodeColor = COLORS.lightgray;
        } else if (node.type == AccountType.TOKEN_MINT_ACCOUNT) {
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
            let mintCanvas = this.metadataServices.getGraphicByNode(node).canvas
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
        if (this.processedData.current.transactions[node.account_vertex.transaction_signature]?.signers.includes(node.account_vertex.address??"")) {
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
        const feeLine = feeAmount ? `<br/>Implicit Swap fee: ${feeAmount}${destImage} (${feeUSDString})` : '';
        return baseLine + feeLine
    };
    
    protected formatNormalAmount = (
        link: ForceGraphLink,
        amount: string,
        image: string,
        usd: number | null
    ): string => {
        const usdString = usd !== null ? `$${usd.toFixed(5)}` : 'N/A';
        return `${link.type}: Amount: ${amount}${image} (${usdString})`;
    };

    protected getAmountDetails = (
        link: ForceGraphLink,
        mintInfo: MintDTO | null,
        isDestination: boolean = false
    ): { amountString: string, imageHTML: string } => {
        const amount = calculateTokenAmount(
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
            // Find nodes by id
            sourceNode = this.originalData.current.nodes.find(n => n.account_vertex.id === link.source_account_vertex.id);
            destinationNode = this.originalData.current.nodes.find(n => n.account_vertex.id === link.target_account_vertex.id);
        }

        if (!sourceNode || !destinationNode) {
            console.error("Source or destination node not found in the graph data.");
            return "Error: Node not found";
        }
        
        if (link.type === TransferType.SWAP_OUTGOING || link.type === TransferType.SWAP_ROUTER_OUTGOING || link.type === TransferType.CLOSE_ACCOUNT) {
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
                const formattedFee = calculateTokenAmount(swapDetails.fee, mintDestination);
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

        // Check if this address is already in fetchedWallets
        const addressAlreadyFetched = this.transactionProvider.fetchedWalletsRef.current.has(node.account_vertex.address);

        // Default context menu items available for all strategies
        const menuItems = [
            {
                label: "Copy Address",
                action: "copy_address"
            },
            {
                label: "Rename Account", 
                action: "rename_account"
            },
            {
                label: isFixed ? "Unfix Position" : "Fix Position",
                action: "toggle_fix_position"
            },
            {
                label: "View in Explorer",
                action: "view_in_explorer"
            }
        ];

        // Add address graph options - change the logic for showing options
        if (addressAlreadyFetched) {
            // If already fetched, only show the "Get Graph for Address" option
            menuItems.push({
                label: "Get Graph for Address",
                action: "get_address_graph"
            });
        } else {
            // If not fetched yet, show both options
            menuItems.push({
                label: "Get Graph for Address",
                action: "get_address_graph"
            });
            menuItems.push({
                label: "Expand Graph with Address",
                action: "expand_address_graph"
            });
        }
        
        // Add "Collapse Swap Program" option only for program accounts
        if (node.type === AccountType.PROGRAM_ACCOUNT) {
            menuItems.push({
                label: "Expand Swap Program",
                action: "expand_swap_program"
            });
        }
        
        // Add spam-related options only for accounts with addresses on the curve
        if (node.isOnCurve) {
            // Check if address is already marked as spam
            const isSpam = this.metadataServices.isSpam(node.account_vertex.address);
            
            if (isSpam) {
                // Only allow unmarking spam if user has permission
                if (this.metadataServices.canUnMarkSpam(node.account_vertex.address)) {
                    menuItems.push({
                        label: "Unmark as Spam",
                        action: "unmark_spam"
                    });
                }
            } else {
                // Allow marking as spam for non-spam addresses
                menuItems.push({
                    label: "Mark as Spam",
                    action: "mark_spam"
                });
            }
        }
        
        return menuItems;
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
            case "expand_swap_program":
                // Call the ExpandSwapProgram method to collapse the swap program
                if (node.type === AccountType.PROGRAM_ACCOUNT) {
                    this.ExpandSwapProgram(node);
                }
                break;
            case "view_in_explorer":
                // Open the account in Solscan
                window.open(`https://solscan.io/account/${node.account_vertex.address}`, '_blank');
                break;
            case "get_address_graph":
                // Get new graph data for this address
                this.transactionProvider.getAccountGraphData(node.account_vertex.address);
                break;
            case "expand_address_graph":
                // Add this address's transactions to existing graph
                this.transactionProvider.addAccountGraphData(node.account_vertex.address);
                break;
            case "mark_spam":
                    this.metadataServices.addToSpam(node.account_vertex.address).then((spam) => {
                        this.applyFilters()
                    });
                    
                break;
            case "unmark_spam":
                // Unmark this address from spam
                const spam = this.metadataServices.getSpam(node.account_vertex.address);
                this.metadataServices.deleteFromSpam(spam!.id).then((spam) => {
                    this.applyFilters()
                });
                
                break;
            default:
                console.log(`Unhandled action: ${action} for node:`, node);
        }
    }

    getInfoContent(strategyContent:React.ReactNode=null): React.ReactNode {

        const Informations = () => {
            const accountsAnalysedList = [...this.transactionProvider.fetchedWalletsRef.current.values()];
            const accountsAnalysed = accountsAnalysedList.map((account, index) => {
                return <React.Fragment key={index}>
                    <AddressLabel data={this.originalData.current}  address={account} shortened={true} /><br/>
                </React.Fragment>
            });

            const transactionsAnalysedList = [...this.transactionProvider.fetchedTransactionsRef.current.values()];
            const transactionsAnalysed = transactionsAnalysedList.map((transaction, index) => {
                return <React.Fragment key={index}>
                    <AddressLabel data={this.originalData.current}  address={transaction} shortened={true} /><br/>
                </React.Fragment>
            });

            const blocksAnalysedList = [...this.transactionProvider.fetchedBlocksRef.current.values()];
            const blocksAnalysed = blocksAnalysedList.map((block, index) => {
                return <React.Fragment key={index}>
                   {block}<br/>
                </React.Fragment>
            });

            const transactionsShown = new Set<string>();
            // Get the transactions shown by iterating over the links 
            this.processedData.current.links.forEach((link) => {
                transactionsShown.add(link.transaction_signature);
                if (link.composite && link.composite.length > 0) {
                    link.composite.forEach((composite) => {
                        transactionsShown.add(composite.transaction_signature);
                    });
                }
            });
            // Get the transactions show by iterating over the nodes
            this.processedData.current.nodes.forEach((node) => {
                transactionsShown.add(node.account_vertex.transaction_signature);
                if (node.composite && node.composite.length > 0) {
                    node.composite.forEach((composite) => {
                        transactionsShown.add(composite.account_vertex.transaction_signature);
                    });
                }
            });

            const transactionsOriginal = [...Object.values(this.originalData.current.transactions)];
            return (
                <div className="informations" style={{ marginTop: '16px' }}>
                    <h3>Entities analysed :</h3>
                    <div style={{ marginLeft: '8px' }}>
                        Accounts ({accountsAnalysedList.length}):<br/>
                        {accountsAnalysed}<br/>
                        Transactions ({transactionsAnalysedList.length}):<br/>
                        {transactionsAnalysed}<br/>
                        Blocks ({blocksAnalysedList.length}):<br/>
                        {blocksAnalysed}<br/>
                    </div>
                </div>
            );
        }
        /**
        <br/><br/>
        <h3>Entities shown:</h3>
        <div style={{ marginLeft: '8px' }}>
            Transactions: {[...transactionsShown].length}/{transactionsOriginal.length}<br/>
            Nodes: {this.processedData.current.nodes.length}/{this.originalData.current.nodes.length}<br/>
            Links: {this.processedData.current.links.length}/{this.originalData.current.links.length}<br/>
        </div> */

        return (
            <div className="strategy-panel-content">
                <Informations />
                {/* Render the strategy-specific content if provided */}
                {(strategyContent) ? strategyContent : ""}
            </div>
        );
    }


    getGeneralContent(strategyContent:React.ReactNode=null): React.ReactNode {
        // SPam options to handle showing/hiding spam
        const SpamOptions = () => {
            // Track the state of the checkbox based on the current hideSpam value
            const [hideSpamChecked, setHideSpamChecked] = React.useState<boolean>(this.hideSpam.current);
                    
            // Handle checkbox change
            const handleHideSpamChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
                const isChecked = event.target.checked;
                setHideSpamChecked(isChecked);
                this.HideSpam(isChecked);
            };
                    
            return (
                <div className="general-options" style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={hideSpamChecked}
                                onChange={handleHideSpamChange}
                                style={{ marginRight: '8px' }}
                            />
                            <span>Hide spam</span>
                        </label>
                    </div>
                </div>
            );
        }

        // CreateAccountsOptions component to handle showing/hiding create accounts
        const CreateAccountsOptions = () => {
            // Track the state of the checkbox based on the current hideCreateAccounts value
            const [hideCreateAccountsChecked, setHideCreateAccountsChecked] = React.useState<boolean>(this.hideCreateAccounts.current);
                    
            // Handle checkbox change
            const handleHideCreateAccountsChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
                const isChecked = event.target.checked;
                setHideCreateAccountsChecked(isChecked);
                this.HideCreateAccounts(isChecked);
            };
                    
            return (
                <div className="general-options" style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={hideCreateAccountsChecked}
                                onChange={handleHideCreateAccountsChange}
                                style={{ marginRight: '8px' }}
                            />
                            <span>Hide create accounts</span>
                        </label>
                    </div>
                </div>
            );
        }

        // CloseAccountsOptions component to handle showing/hiding close accounts
        const CloseAccountsOptions = () => {
            // Track the state of the checkbox based on the current hideCloseAccounts value
            const [hideCloseAccountsChecked, setHideCloseAccountsChecked] = React.useState<boolean>(this.hideCloseAccounts.current);
                    
            // Handle checkbox change
            const handleHideCloseAccountsChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
                const isChecked = event.target.checked;
                setHideCloseAccountsChecked(isChecked);
                this.HideCloseAccounts(isChecked);
            };
                    
            return (
                <div className="general-options" style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={hideCloseAccountsChecked}
                                onChange={handleHideCloseAccountsChange}
                                style={{ marginRight: '8px' }}
                            />
                            <span>Hide close accounts</span>
                        </label>
                    </div>
                </div>
            );
        }

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
            // Add state for hide swaps checkbox
            const [hideSwapsChecked, setHideSwapsChecked] = React.useState<boolean>(this.hideSwaps.current);
            
            // Track hover states for all buttons
            const [routerCollapseHovered, setRouterCollapseHovered] = React.useState<boolean>(false);
            const [routerExpandHovered, setRouterExpandHovered] = React.useState<boolean>(false);
            const [programCollapseHovered, setProgramCollapseHovered] = React.useState<boolean>(false);
            const [programExpandHovered, setProgramExpandHovered] = React.useState<boolean>(false);
            
            // Add handler for hide swaps checkbox
            const handleHideSwapsChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
                const isChecked = event.target.checked;
                setHideSwapsChecked(isChecked);
                this.HideSwaps(isChecked);
            };
            
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
                    {/* Hide All Swaps Operations checkbox */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={hideSwapsChecked}
                                onChange={handleHideSwapsChange}
                                style={{ marginRight: '8px' }}
                            />
                            <span>Hide All Swaps Operations</span>
                        </label>
                    </div>
                    
                    {/* Only show collapse/expand options if swaps are not hidden */}
                    {!hideSwapsChecked && (
                        <>
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
                        </>
                    )}
                </div>
            );
        };
        
        return (
            <div className="strategy-panel-content">
                <SpamOptions />
                <SwapOptions />
                <FeesOptions />
                <CreateAccountsOptions />
                <CloseAccountsOptions />
                {/* Render the strategy-specific content if provided */}
                {(strategyContent) ? strategyContent : ""}
            </div>
        );
    }

    /**
     * Returns content for the Filters accordion section
     * Override in concrete strategies for strategy-specific filtering options
     */
    getFiltersContent(strategyContent:React.ReactNode=null): React.ReactNode {
        // DateTimeFilters component to handle date/time filtering
        const DateTimeFilters = () => {
            // State for datetime inputs
            const [minDateTime, setMinDateTime] = React.useState<Date | null>(this.minDateTime.current);
            const [maxDateTime, setMaxDateTime] = React.useState<Date | null>(this.maxDateTime.current);

            // Handle apply filters
            const handleApplyDateFilters = (): void => {
                // Update filter values using class setters
                this.setMinDateTime(minDateTime);
                this.setMaxDateTime(maxDateTime);
                
                // Apply the filters
                this.applyFilters();
            };

            // Clear date filters
            const handleClearDateFilters = (): void => {
                setMinDateTime(null);
                setMaxDateTime(null);
                this.setMinDateTime(null);
                this.setMaxDateTime(null);
                this.applyFilters();
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

            const buttonStyle = {
                padding: '8px 16px',
                backgroundColor: '#9945FF',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '8px',
                marginRight: '8px'
            };

            const clearButtonStyle = {
                ...buttonStyle,
                backgroundColor: '#444'
            };

            return (
                <div style={containerStyle}>
                    <h3 style={{ marginBottom: '12px' }}>DateTime Filters</h3>
                    
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Minimum Date & Time</label>
                        <DatePicker
                            selected={minDateTime}
                            onChange={(date) => setMinDateTime(date)}
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            dateFormat="yyyy-MM-dd HH:mm"
                            timeCaption="Time"
                            placeholderText="Select min datetime"
                            className="bg-gray-700 text-white rounded border border-gray-600 p-2 w-full"
                        />
                    </div>
                    
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Maximum Date & Time</label>
                        <DatePicker
                            selected={maxDateTime}
                            onChange={(date) => setMaxDateTime(date)}
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            dateFormat="yyyy-MM-dd HH:mm"
                            timeCaption="Time"
                            placeholderText="Select max datetime"
                            className="bg-gray-700 text-white rounded border border-gray-600 p-2 w-full"
                        />
                    </div>
                    
                    <div>
                        <button 
                            onClick={handleApplyDateFilters}
                            style={buttonStyle}
                        >
                            Apply Date Filters
                        </button>
                        <button 
                            onClick={handleClearDateFilters}
                            style={clearButtonStyle}
                        >
                            Clear Date Filters
                        </button>
                    </div>
                </div>
            );
        };

        // AmountsFilters component
        const AmountsFilters = () => {
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
                    <h3 style={{ marginBottom: '12px' }}>Amounts Filters</h3>
                    
                    {/* SOL Amounts */}
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Minimum SOL Amount</label>
                        <input
                            type="text"
                            value={minSolAmount}
                            onChange={(e) => setMinSolAmount(e.target.value)}
                            style={{
                                
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

        // New AccountsFilter component
        const AccountsFilter = () => {
            // Local state for the input field
            const [newAccount, setNewAccount] = React.useState<string>('');
            // Local state to track all accounts in the filter (for rendering)
            const [accountsList, setAccountsList] = React.useState<string[]>(
                Array.from(this.accountAddressesFilter.current)
            );
            
            // Add an account to the filter
            const handleAddAccount = (): void => {
                if (!newAccount.trim()) return;
                
                this.addAccountToFilter(newAccount);
                setAccountsList(Array.from(this.accountAddressesFilter.current));
                setNewAccount(''); // Clear input
                this.applyFilters(); // Apply the updated filter
            };
            
            // Handle key press for input field (add on Enter)
            const handleKeyPress = (e: React.KeyboardEvent): void => {
                if (e.key === 'Enter') {
                    handleAddAccount();
                }
            };
            
            // Remove an account from the filter
            const handleRemoveAccount = (account: string): void => {
                this.removeAccountFromFilter(account);
                setAccountsList(Array.from(this.accountAddressesFilter.current));
                this.applyFilters(); // Apply the updated filter
            };
            
            // Clear all accounts from the filter
            const handleClearAccounts = (): void => {
                this.clearAccountsFilter();
                setAccountsList([]);
                this.applyFilters(); // Apply the updated filter
            };
            
            // Common styles
            const containerStyle = {
                marginBottom: '16px'
            };
            
            const buttonStyle = {
                padding: '8px 16px',
                backgroundColor: '#9945FF',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginLeft: '8px'
            };
            
            const clearButtonStyle = {
                ...buttonStyle,
                backgroundColor: '#444'
            };
            
            return (
                <div style={containerStyle}>
                    <h3 style={{ marginBottom: '12px' }}>Accounts Filter</h3>
                    
                    <div style={{ display: 'flex', marginBottom: '8px' }}>
                        <input
                            type="text"
                            value={newAccount}
                            onChange={(e) => setNewAccount(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Enter account address"
                            className="bg-gray-700 text-white rounded border border-gray-600 p-2 flex-grow"
                        />
                        <button
                            onClick={handleAddAccount}
                            style={buttonStyle}
                        >
                            Add
                        </button>
                        
                        {accountsList.length > 0 && (
                            <button
                                onClick={handleClearAccounts}
                                style={clearButtonStyle}
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                    
                    {accountsList.length > 0 && (
                        <div>
                            <div style={{ marginBottom: '8px' }}>
                                Filtering by these accounts ({accountsList.length}):
                            </div>
                            <div style={{
                                maxHeight: '200px',
                                overflowY: 'auto',
                                backgroundColor: '#2A2A2A',
                                border: '1px solid #444',
                                borderRadius: '4px',
                                padding: '8px'
                            }}>
                                {accountsList.map((account, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '4px 0',
                                        borderBottom: index < accountsList.length - 1 ? '1px solid #444' : 'none'
                                    }}>
                                        <div style={{ wordBreak: 'break-all', paddingRight: '8px' }}>
                                            <AddressLabel
                                                address={account}
                                                data={this.originalData.current}
                                                shortened={true}
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleRemoveAccount(account)}
                                            style={{
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                color: '#FF6B6B',
                                                cursor: 'pointer',
                                                fontSize: '16px',
                                                padding: '4px 8px'
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div className="strategy-panel-content">
                <DateTimeFilters />
                <div style={{
                    height: 1,
                    backgroundColor: '#444444',
                    margin: '12px 0',
                    width: '100%'
                }} />
                <AccountsFilter />
                <div style={{
                    height: 1,
                    backgroundColor: '#444444',
                    margin: '12px 0',
                    width: '100%'
                }} />
                <AmountsFilters />
                {(strategyContent) ? strategyContent : ""}
            </div>
        );
    }

    /**
     * Returns content for the Grouping accordion section
     * Override in concrete strategies for strategy-specific grouping options
     */
    getTransactionClusterContent(strategyContent:React.ReactNode=null): React.ReactNode {
        // Transaction Clusters options to handle grouping by transaction clusters
        const TransactionClustersOptions = () => {
            // Track the state of selected transaction clusters using local state
            const [selectedClusters, setSelectedClusters] = React.useState<Record<number, boolean>>(() => {
                // Initialize from the current selectedTransactionClusterGroup
                const initialState: Record<number, boolean> = {};
                
                // Set initial state based on what's currently in selectedTransactionClusterGroup
                this.transactionsClusterGroups.current.forEach(groupId => {
                    initialState[groupId] = this.selectedTransactionClusterGroup.current.includes(groupId);
                });
                
                return initialState;
            });

            // Track which cluster groups have their transactions expanded
            const [expandedClusters, setExpandedClusters] = React.useState<Record<number, boolean>>({});

            // Count transactions per cluster group
            const transactionsPerCluster: Record<number, number> = React.useMemo(() => {
                const counts: Record<number, number> = {};
                
                // Initialize counts for all groups to 0
                this.transactionsClusterGroups.current.forEach(groupId => {
                    counts[groupId] = 0;
                });
                
                // Count transactions in each group
                Object.values(this.originalData.current.transactions).forEach(transaction => {
                    if (transaction.isomorphic_group !== null && counts[transaction.isomorphic_group] !== undefined) {
                        counts[transaction.isomorphic_group]++;
                    }
                });
                
                return counts;
            }, []);

            // Get transactions for a specific cluster
            const getClusterTransactions = (clusterId: number): string[] => {
                return Object.entries(this.originalData.current.transactions)
                    .filter(([_, transaction]) => transaction.isomorphic_group === clusterId)
                    .map(([signature, _]) => signature);
            };

            // Sort cluster groups numerically
            const sortedClusterGroups = React.useMemo(() => {
                return [...this.transactionsClusterGroups.current].sort((a, b) => a - b);
            }, []);

            // Handle checkbox change
            const handleCheckboxChange = (clusterId: number, checked: boolean) => {
                // Update the local state
                setSelectedClusters(prev => ({
                    ...prev,
                    [clusterId]: checked
                }));
                
                // Update the selectedTransactionClusterGroup ref
                const newSelection = checked 
                    ? [...this.selectedTransactionClusterGroup.current, clusterId] 
                    : this.selectedTransactionClusterGroup.current.filter(id => id !== clusterId);
                
                this.selectedTransactionClusterGroup.current = newSelection;
                
                // Apply the filters to update the graph
                this.applyFilters();
            };

            // Toggle transaction list expansion for a cluster
            const toggleClusterExpansion = (clusterId: number): void => {
                setExpandedClusters(prev => ({
                    ...prev,
                    [clusterId]: !prev[clusterId]
                }));
            };

            // Toggle all checkboxes
            const handleToggleAll = (selectAll: boolean) => {
                const updatedState: Record<number, boolean> = {};
                
                // Update all checkboxes to the same state
                this.transactionsClusterGroups.current.forEach(groupId => {
                    updatedState[groupId] = selectAll;
                });
                
                setSelectedClusters(updatedState);
                
                // Update the selectedTransactionClusterGroup ref
                this.selectedTransactionClusterGroup.current = selectAll 
                    ? [...this.transactionsClusterGroups.current]
                    : [];
                
                // Apply filters to update the graph
                this.applyFilters();
            };

            // Calculate if all or some clusters are selected
            const allSelected = this.transactionsClusterGroups.current.length > 0 && 
                this.transactionsClusterGroups.current.every(id => selectedClusters[id]);
            
            const someSelected = this.transactionsClusterGroups.current.some(id => selectedClusters[id]) && !allSelected;

            // ClusterTransactions component to display transactions for a cluster (using same pattern as FlowViewStrategy)
            const ClusterTransactions = ({ clusterId }: { clusterId: number }) => {
                // Get transactions for this cluster
                const transactions = getClusterTransactions(clusterId);
                
                // Early return if no transactions
                if (transactions.length === 0) return null;
                
                return (
                    <div style={{ marginTop: '8px' }}>
                        <ul style={{ 
                            margin: '4px 0 8px 24px', 
                            paddingLeft: '20px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            backgroundColor: '#2A2A2A',
                            border: '1px solid #444',
                            borderRadius: '4px',
                            padding: '8px'
                        }}>
                            {transactions.map((signature, txIndex) => (
                                <li key={txIndex} style={{ margin: '4px 0', wordBreak: 'break-all' }}>
                                    <AddressLabel 
                                        address={signature}
                                        shortened={true} 
                                        data={this.originalData.current} 
                                    />
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            };

            // Styles
            const containerStyle = {
                marginBottom: '16px'
            };

            const headerStyle = {
                display: 'flex',
                alignItems: 'center',
                marginBottom: '12px'
            };

            const checkboxGroupStyle = {
                marginLeft: '8px',
                marginBottom: '8px'
            };

            const checkboxStyle = {
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center'
            };

            return (
                <div style={containerStyle}>
                    {this.transactionsClusterGroups.current.length > 0 ? (
                        <>
                            <div style={headerStyle}>
                                <h3 style={{ margin: 0, marginRight: '16px' }}>Transaction Clusters</h3>
                                <button 
                                    onClick={() => handleToggleAll(true)} 
                                    style={{ marginRight: '8px' }}
                                    disabled={allSelected}
                                >
                                    Select All
                                </button>
                                <button 
                                    onClick={() => handleToggleAll(false)}
                                    disabled={!someSelected && !allSelected}
                                >
                                    Clear All
                                </button>
                            </div>
                            
                            <div style={checkboxGroupStyle}>
                                {sortedClusterGroups.map((clusterId) => (
                                    <div key={clusterId}>
                                        <div style={checkboxStyle}>
                                            <input
                                                type="checkbox"
                                                checked={selectedClusters[clusterId] || false}
                                                onChange={(e) => handleCheckboxChange(clusterId, e.target.checked)}
                                                style={{ marginRight: '8px' }}
                                            />
                                            <span style={{ marginRight: '12px' }}>Cluster Group {clusterId}</span>
                                            
                                            {/* Show/Hide Transactions button moved inline */}
                                            <div 
                                                onClick={() => toggleClusterExpansion(clusterId)}
                                                style={{ 
                                                    cursor: 'pointer', 
                                                    color: '#7B61FF',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    userSelect: 'none'
                                                }}
                                            >
                                                <span style={{ marginRight: '4px' }}>
                                                    {expandedClusters[clusterId] ? '▾' : '▸'}
                                                </span>
                                                <span>
                                                    {expandedClusters[clusterId] ? 'Hide transactions' : 'Show transactions'}  ({transactionsPerCluster[clusterId]})
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Transaction list only appears when expanded */}
                                        {expandedClusters[clusterId] && (
                                            <ul style={{ 
                                                margin: '4px 0 8px 24px', 
                                                paddingLeft: '20px',
                                                maxHeight: '200px',
                                                overflowY: 'auto',
                                                backgroundColor: '#2A2A2A',
                                                border: '1px solid #444',
                                                borderRadius: '4px',
                                                padding: '8px'
                                            }}>
                                                {getClusterTransactions(clusterId).map((signature, txIndex) => (
                                                    <li key={txIndex} style={{ margin: '4px 0', wordBreak: 'break-all' }}>
                                                        <AddressLabel 
                                                            address={signature}
                                                            shortened={true} 
                                                            data={this.originalData.current} 
                                                        />
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p>No transaction clusters available</p>
                    )}
                </div>
            );
        }

        return (
            <div className="strategy-panel-content">
                <TransactionClustersOptions />
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
                    {/*<p>Selected nodes: {this.selectedNodes.current?.size || 0}</p>*/}
                </div>
                {(strategyContent) ? strategyContent : ""}
            </div>
        );
    }
    /**
     * Returns content for the Links Info accordion section
     * Override in concrete strategies for strategy-specific Nodes information
     */
    getLinksInfoContent(strategyContent:React.ReactNode=null): React.ReactNode {

        // Default content when no links are selected
        return (
            <div className="strategy-panel-content">
                <div className="info-section">
                    {/*<p>Selected links: {this.selectedLinks.current?.size || 0}</p>*/}
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