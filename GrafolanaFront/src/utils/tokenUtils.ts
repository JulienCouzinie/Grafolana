import { MintDTO } from "@/types/metadata";

export function calculateTokenAmount(amount: number, mintInfo: MintDTO | null): number {
    return amount / Math.pow(10, mintInfo?.decimals || 0);
}