export interface Creator {
  address: string;
  verified: boolean;
  share: number;
}

export interface MintDTO {
  mint_address: string;
  is_nft: boolean;
  name: string;
  symbol: string;
  decimals: number;
  supply: number;
  is_initialized: boolean;
  update_authority: string;
  primary_sale_happened: boolean;
  is_mutable: boolean;
  uri: string;
  seller_fee_basis_points: number;
  
  description: string;
  image?: string;
  animation_url?: string;
  external_url?: string;

  freeze_authority?: string;
  mint_authority?: string;

  links: Record<string, string>;
  creators: Creator[];
  attributes: Record<string, any>[];
  properties: Record<string, any>;
  extensions: Record<string, any>;
}

export interface Label {
  id: number;
  address: string;
  label: string;
  description?: string;
  priority: 'DEFAULT' | 'ADMIN' | 'OWNER' | 'USER';
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SimpleLabel {
  address: string;
  label: string;
  description?: string;
}

export interface Program {
  program_address: string,
  label:  string,
  icon?: string,
  website?: string,
  description?: string,
}

export enum AddressType {
  PROGRAM = "program",
  TOKEN = "token",
  TRANSACTION = "transaction",
  UNKNOWN = "unknown",
}

export interface AddressWithType {
  address: string;
  type: AddressType;
}

// Add new Spam interface
export interface Spam {
  id: number;
  address: string;
  creator: 'DEFAULT' | 'ADMIN' | 'OWNER' | 'USER';
  user_id?: string;
  created_at: string;
  updated_at: string;
}