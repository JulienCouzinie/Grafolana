import { useEffect } from 'react';
import { useMetadata } from '@/components/metadata/metadata-provider';
import { useWallet } from '@solana/wallet-adapter-react';
import { GraphData } from '@/types/graph';
import { AddressType, AddressWithType } from '@/types/metadata';

interface MetadataPreloaderProps {
  graphData: GraphData;
}

export function MetadataPreloader({ graphData }: MetadataPreloaderProps) {
  const { publicKey } = useWallet();
  const { FetchMintInfosAndCache, FetchProgramInfosAndCache, FetchLabelsInfosAndCache } = useMetadata();

  // Preload Mint Metadata
  useEffect(() => {
    const fetchMintMetadata = async () => {
      const mintAddresses = graphData.nodes
        .map(node => node.mint_address)
        .filter((addr): addr is string => addr !== undefined);

      try {
        await FetchMintInfosAndCache(mintAddresses);
      } catch (error) {
        console.error('Failed to fetch mint metadata:', error);
      }
    };

    fetchMintMetadata();
  }, [graphData]);

  // Preload Program Metadata
  useEffect(() => {
    const fetchProgramMetadata = async () => {
      const programAddresses = Array.from(new Set(
        graphData.links.map(link => link.program_address)
      ));

      try {
        await FetchProgramInfosAndCache(programAddresses);
      } catch (error) {
        console.error('Failed to fetch program metadata:', error);
      }
    };

    if (graphData.links.length > 0) {
      fetchProgramMetadata();
    }
  }, [graphData]);

  // Preload Labels
  useEffect(() => {
    const fetchLabels = async () => {
      const addressesWithTypes: AddressWithType[] = [];
      
      // Extract unique signers from all transactions
      Object.values(graphData.transactions).forEach(txData => 
        txData.signers.forEach(signer => 
          addressesWithTypes.push({ address: signer, type: AddressType.UNKNOWN}))
      );
      
      graphData.nodes.forEach(node => {
        addressesWithTypes.push({ address: node.account_vertex.address, type: AddressType.UNKNOWN });
        if (node.owner) addressesWithTypes.push({ address: node.owner, type: AddressType.UNKNOWN });
        if (node.mint_address) addressesWithTypes.push({ address: node.mint_address, type: AddressType.TOKEN });
        node.authorities?.forEach(auth => 
          addressesWithTypes.push({ address: auth, type: AddressType.UNKNOWN }));
      });
      
      graphData.links.forEach(link => 
        addressesWithTypes.push({ address: link.program_address, type: AddressType.PROGRAM }));

      await FetchLabelsInfosAndCache(addressesWithTypes, publicKey?.toBase58());
    };

    if (graphData.nodes.length > 0) {
      fetchLabels();
    }
  }, [graphData, publicKey]);

  return null; // This component doesn't render anything
}