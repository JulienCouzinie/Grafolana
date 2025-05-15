// Helper to shorten addresses
export function shortenAddress(address: string): string {
    if (address.length < 13) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export function isTransactionSignature(address: string): boolean {
    if (!address) return false;
    return address.length === 88 || address.length === 87;
}

export function isWalletAddress(address: string): boolean {
    if (!address) return false;
    return address.length === 44 || address.length === 43;
}

export function isBlockAddress(address: string): boolean {
    if (!address) return false;
    return /^\d+$/.test(address);
}