// Helper to shorten addresses
export function shortenAddress(address: string): string {
    if (address.length < 13) return address;
        return `${address.slice(0, 6)}...${address.slice(-6)}`;
    }