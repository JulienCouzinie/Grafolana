import { useCallback } from 'react';
import { useMetadata } from '../components/metadata/metadata-provider';

export function useUSDValue() {
  const { getMintInfo } = useMetadata();

  const calculateUSDValue = useCallback((amount: number, mintAddress: string, priceRatios: Record<string, any>): string => {
    const priceRatio = priceRatios[mintAddress];
    if (!priceRatio) return 'N/A';

    const mintInfo = getMintInfo(mintAddress);
    const refMintInfo = getMintInfo(priceRatio.reference_mint);
    if (!mintInfo || !refMintInfo) return 'N/A';

    const decimals = mintInfo.decimals + (refMintInfo.decimals - mintInfo.decimals);
    const realAmount = amount / Math.pow(10, decimals);
    const usdValue = realAmount * priceRatio.price;
    
    return `$${usdValue.toFixed(5)}`;
  }, [getMintInfo]);

  return { calculateUSDValue };
}