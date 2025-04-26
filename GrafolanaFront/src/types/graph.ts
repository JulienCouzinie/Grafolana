import { LinkObject, NodeObject } from 'react-force-graph-2d';

export interface NodePosition {
    x: number;
    y: number;
    fx?: number;
    fy?: number;
}

export class AccountVertex {
    id: string = '';
    address: string = '';
    version: number = 0;
    transaction_signature: string = '';
    constructor(address: string, version: number, transaction_signature: string = '') {
        this.transaction_signature = transaction_signature;
        this.address = address;
        this.version = version;
        this.id = address + "_v" + version + "_t" + transaction_signature;
    }
}

/**
 * Enum representing all possible account types in the system
 */
export enum AccountType {
    WALLET_ACCOUNT = "WALLET_ACCOUNT", // Type added for the wallet view
    BURN_ACCOUNT = "BURN_ACCOUNT",
    MINTTO_ACCOUNT = "MINTTO_ACCOUNT",
    STAKE_ACCOUNT = "STAKE_ACCOUNT", 
    TOKEN_ACCOUNT = "TOKEN_ACCOUNT",
    SOL_ACCOUNT = "SOL_ACCOUNT",
    FEE_ACCOUNT = "FEE_ACCOUNT",
    PROGRAM_ACCOUNT = "PROGRAM_ACCOUNT",
    UNKNOWN = "UNKNOWN"
}

/**
 * Enum representing all possible edges types in the system
 */
export enum TransferType {
    WALLET_TO_WALLET = "WALLET_TO_WALLET", // Type added for the wallet view
    TRANSFER = "TRANSFER",
    CREATE_ACCOUNT = "CREATEACCOUNT",
    CLOSE_ACCOUNT = "CLOSEACCOUNT",
    BURN = "BURN",
    MINTTO= "MINTTO",
    NATIVE_SOL = "NATIVE_SOL",
    SWAP = "SWAP",
    SWAP_INCOMING = "SWAP_INCOMING",
    SWAP_OUTGOING = "SWAP_OUTGOING",
    SWAP_ROUTER_INCOMING = "SWAP_ROUTER_INCOMING",
    SWAP_ROUTER_OUTGOING = "SWAP_ROUTER_OUTGOING",
    FEE = "FEE",
    AUTHORIZE = "AUTHORIZE",
    PRIORITY_FEE = "PRIORITYFEE",
    SPLIT = "SPLIT",
    TRANSFERCHECKED = "TRANSFERCHECKED",
    WITHDRAW = "WITHDRAW",
    NEW_TRANSACTION = "NEW_TRANSACTION"
}

// Base interface for graph node data
export interface GraphNode {
    account_vertex: AccountVertex;
    mint_address: string;
    owner: string | null;
    authorities: string[]
    balance_token: number;
    balance_lamport: number;
    type: AccountType;
    is_pool: boolean;
    composite: GraphNode[] | null; // Composite nodes (when multiple nodes are aggregated into one)
}

// Interface for a graph link
export interface GraphLink {
    id: string;               // Unique identifier for the link
    key: number;
    transaction_signature: string; // Transaction signature for the link
    program_address: string     // Program that executed the transfer
    source: ForceGraphNode |string;             // Source node ID
    target: ForceGraphNode |string;             // Target node ID
    source_account_vertex: AccountVertex; // Source account vertex
    target_account_vertex: AccountVertex; // Target account vertex
    amount_source: number;      // Amount transferred from source
    amount_destination: number; // Amount received at destination
    type: TransferType;               // Transfer type (e.g., "BURN", "MINTTO", "SWAP")
    group?: number;             // Group ID for swaps (optional)
    curvature?: number;         // Curvature for multilinks
    swap_id?: number;           // Swap id if transfer is of type == "SWAP"
    swap_parent_id?: number;     // All links that are part of the same swap
    parent_router_swap_id?: number; // All links that are part of the same router swap
    composite: GraphLink[] | null;     // Composite links (when multiple links are aggregated into one)
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
    accounts: string[];
    fees: Fees;
    signers: string[];
    swaps: Swap[];
    mint_usd_price_ratio: Record<string,PriceReference>
}

// Clean up duplicate interface
export interface GraphData {
    nodes: ForceGraphNode[];
    links: ForceGraphLink[];
    transactions: Record<string, TransactionData>;
}

export interface Swap {
    id: number;
    router: boolean;
    program_address: string;
    program_name: string;
    instruction_name : string;
    pool_addresses: string[];
    program_account_vertex: AccountVertex;
    fee: number;
}

// Define the types for Force Graph nodes and links
export type ForceGraphNode = NodeObject & GraphNode;
export type ForceGraphLink = LinkObject & GraphLink;