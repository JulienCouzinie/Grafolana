import { LinkObject, NodeObject } from 'react-force-graph-2d';


export class AccountVertex {
    address: string = '';
    version: number = 0;
    transaction_signature: string = '';
    constructor(address: string, version: number, transaction_signature: string = '') {
        this.transaction_signature = transaction_signature;
        this.address = address;
        this.version = version;
    }
    get id(): string {
        //console.log("AccountVertex id called");
        return this.address + "_v" + this.version + "_t" + this.transaction_signature;
    }
}

// Base interface for graph node data
export interface GraphNode {
    account_vertex: AccountVertex;
    mint_address: string;
    owner: string | null;
    authorities: string[]
    balance_token: number;
    balance_lamport: number;
    type: string;
    is_pool: boolean;
}

// Interface for a graph link
export interface GraphLink {
    key: number;
    transaction_signature: string; // Transaction signature for the link
    program_address: string     // Program that executed the transfer
    source: ForceGraphNode |string;             // Source node ID
    target: ForceGraphNode |string;             // Target node ID
    source_account_vertex: AccountVertex; // Source account vertex
    target_account_vertex: AccountVertex; // Target account vertex
    amount_source: number;      // Amount transferred from source
    amount_destination: number; // Amount received at destination
    type: string;               // Transfer type (e.g., "BURN", "MINTTO", "SWAP")
    group?: number;             // Group ID for swaps (optional)
    curvature?: number;         // Curvature for multilinks
    swap_id?: number;           // Swap id if transfer is of type == "SWAP"
    composite: GraphLink[];     // Composite links (when multiple links are aggregated into one)
}

export interface PriceReference{
    price: number;
    reference_mint: string;
}

export interface Fees {
    fee: number; 
    priority_fee: number; 
}

export interface TransactionData {
    transaction_signature: string; 
    fees: Fees;
    signers: string[];
    swaps: Swap[];
    mint_usd_price_ratio: Record<string,PriceReference>
}

// Clean up duplicate interface
export interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
    transactions: Record<string, TransactionData>;
}

export interface ProcessedGraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

export interface Swap {
    id: number;
    router: boolean;
    program_address: string;
    program_name: string;
    instruction_name : string;
    pool_addresses: string[];
    fee: number;
}

// Define the types for Force Graph nodes and links
export type ForceGraphNode = NodeObject & GraphNode;
export type ForceGraphLink = LinkObject & GraphLink;