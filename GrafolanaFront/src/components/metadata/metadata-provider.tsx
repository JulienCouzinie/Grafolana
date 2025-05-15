'use client'

import { MintDTO, Label, Program, SimpleLabel, AddressWithType, AddressType, Spam, SpamType } from "@/types/metadata";
import { createContext, useContext, useCallback, useState, ReactNode, useEffect, useRef } from "react";
import { useWallet } from '@solana/wallet-adapter-react';
import { fetchMissingMintInfos, fetchMissingLabels, fetchMissingProgramInfos, fetchSpamAddresses } from "./fetchers";
import { useImmediateMapState } from "@/hooks/useImmediateState";
import { getCanvas } from "@/utils/imageUtils";
import { shortenAddress } from "@/utils/addressUtils";
import { AccountType, ForceGraphNode } from "@/types/graph";
import { StaticGraphicsProvider, useStaticGraphics, StaticGraphic } from "./static-graphic-provider";
import { useToast } from '@/components/ui/toast-provider';

interface MetadataContextType {
  FetchMintInfosAndCache: (mintAddresses: string[]) => Promise<void>;
  FetchProgramInfosAndCache: (programAddresses: string[]) => Promise<void>;
  FetchLabelsInfosAndCache: (addresses: AddressWithType[], userId?: string) => Promise<void>;

  getMintInfo: (mintAddress: string) => MintDTO | null;
  getProgramInfo: (programAddress: string) => Program | null;
  getLabel: (address: string, userId?: string) => Label | null;

  getMintImage: (imageUrl: string | undefined) => HTMLImageElement | null;
  getImageCanvas: (imageUrl: string | undefined, type?: AccountType) => HTMLCanvasElement | null;
  getProgramImage: (imageUrl: string) => HTMLImageElement;
  
  updateLabel: (address: string, label: string, description?: string, userId?: string, type?: AddressType) => Promise<Label>;
  deleteLabel: (address: string, userId?: string) => Promise<boolean>;
  getLabelComputed: (address: string, type?: AddressType, shortened_address?: boolean) => SimpleLabel;
  
  getGraphic: (address: string, mint_address: string, type: AccountType) => StaticGraphic;
  getGraphicByNode: (node: ForceGraphNode) => StaticGraphic;

  isSpam: (address: string) => boolean;
  getSpam: (address: string) => Spam | null;
  canUnMarkSpam: (address: string) => boolean;
  addToSpam: (address: string) => Promise<Spam>;
  deleteFromSpam: (spamId: number) => Promise<boolean>;
  spamAddresses: Spam[];
}

const MetadataContext = createContext<MetadataContextType | undefined>(undefined);

export function MetadataProvider({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  const staticGraphic = useStaticGraphics();
  const { showToast } = useToast();

  // Caches
  const [
    mintsState, 
    mintsRef, 
    setMint,              // for single updates
    setMints,            // for multiple updates
    deleteFromMints, 
    clearMints
  ] = useImmediateMapState<string, MintDTO | null>(new Map());
  const [
    labelsState, 
    labelsRef, 
    setLabel,              // for single updates
    setLabels,            // for multiple updates
    deleteFromLabels, 
    clearLabels
  ] = useImmediateMapState<string, Label | null>(new Map());

  const [computedLabelsState, ComputedLabelsRef, setComputedLabel, setComputedLabels, deleteFromComputedLabels, clearComputedLabels] = useImmediateMapState(new Map<string, SimpleLabel>(new Map()));
  const [
    programsState, 
    programsRef, 
    setProgram,              // for single updates
    setPrograms,            // for multiple updates
    deleteFromPrograms, 
    clearPrograms
  ] = useImmediateMapState<string, Program | null>(new Map());
  
  const images = useRef(new Map<string, HTMLImageElement>());
  const canvas = useRef(new Map<string, HTMLCanvasElement>());

  // Loading states
  const imageLoadingStates = useRef(new Map<string, boolean>());
  const labelLoadingStates = useRef(new Map<string, boolean>());
  const labelComputedSLoadingStates = useRef(new Map<string, boolean>());
  const mintLoadingStates = useRef(new Map<string, boolean>());
  const programLoadingStates = useRef(new Map<string, boolean>());

  // Add this state for managing spam addresses
  const [spamAddresses, setSpamAddresses] = useState<Spam[]>([]);
  const spamAddressesMap = useRef<Map<string, Spam>>(new Map());
  
  // Create a cache key that includes userId if present
  const getCacheKey = (address: string, uid?: string) => uid ? `${address}:${uid}` : address;

  const preloadImage = useCallback((imageUrl: string, mint: boolean=false) => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!images.current.has(imageUrl)) {
      imageLoadingStates.current.set(imageUrl, true);
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = async () => {
        try {
          const imgCanvas = getCanvas(img);
          // Keep cache of images and canvas
          canvas.current.set(imageUrl, imgCanvas);
          images.current.set(imageUrl, img);
        } catch (error) {
          // If cropping fails, use original image
          console.error('Error cropping image:', error);
          images.current.set(imageUrl, img);

          // Store canvas in cachea
        } finally {
          imageLoadingStates.current.delete(imageUrl);
        }
      };

      img.onerror = () => {
        imageLoadingStates.current.delete(imageUrl);
      };

      img.src = imageUrl;
    }
  }, [images,canvas]);

  const FetchMintInfosAndCache = useCallback(async (mintAddresses: string[]): Promise<void> => {
    // Remove duplicates from input array
    let uniqueAddresses = [...new Set(mintAddresses)];
    // Filter out null or undefined addresses
    uniqueAddresses = uniqueAddresses.filter((addr): addr is string => addr != null && addr.length > 0);

    if (uniqueAddresses.length === 0) return;

    const missingAddresses: string[] = [];

    // First check which mints we need to fetch
    uniqueAddresses.forEach(address => {
      if (!mintsRef.current.has(address) && !mintLoadingStates.current.has(address)) {
        missingAddresses.push(address);
        mintLoadingStates.current.set(address, true);
      }
    });

     // Fetch missing mints if any
     if (missingAddresses.length > 0) {
      try {
        const response = await fetchMissingMintInfos(missingAddresses);
        missingAddresses.forEach(address => {
          // Get mint info from response by matchin mint address
          const mint = response.find((m: MintDTO) => m.mint_address === address) || null;
          setMint(address, mint);
          if (mint) {
            // Invalidate the computed label cache for this address
            deleteFromComputedLabels(mint.mint_address);
            const imageUrl = mint.image;
            if (imageUrl) {
              preloadImage(imageUrl, true);
            }
          }
          mintLoadingStates.current.delete(address);
        });
      } catch (error) {
        console.error('Error fetching mints:', error);
        missingAddresses.forEach(address => {
          mintLoadingStates.current.delete(address);
        });
      }
    }
  }, []);

  const getMintInfo = useCallback((mintAddress: string): MintDTO | null => {
    if (mintsRef.current.has(mintAddress)) {
      return mintsRef.current.get(mintAddress)!;
    }

    FetchMintInfosAndCache([mintAddress]);

    return null;
  }, [mintsState]);

  const getMintImage = useCallback((imageUrl: string | undefined): HTMLImageElement | null => {
    if (typeof window === 'undefined') {
      return null;
    }    
    
    if (imageUrl=== undefined) {
      return staticGraphic.defaultMint.image;;
    }

    // If image is still loading, return null
    if (imageLoadingStates.current.get(imageUrl)) {
      return null;
    }

    // If image is in cache, return it
    if (images.current.has(imageUrl)) {
      return images.current.get(imageUrl)!;
    }

    // If no image URL was provided or image failed to load, return default
    return staticGraphic.defaultMint.image;
  }, [images, staticGraphic.defaultMint.image]);

  const getImageCanvas = useCallback((imageUrl: string | undefined, type: AccountType = AccountType.UNKNOWN): HTMLCanvasElement | null => {
    if (typeof window === 'undefined') {
      return null;
    }    

    if (imageUrl=== undefined) {
      if (type === AccountType.PROGRAM_ACCOUNT) {
        return staticGraphic.defaultProgram.canvas;
      } else {
        return staticGraphic.defaultMint.canvas;
      }
    }

    // If image is still loading, return null
    if (imageLoadingStates.current.get(imageUrl)) {
      return null;
    }

    // If image is in cache, return it
    if (canvas.current.has(imageUrl)) {
      return canvas.current.get(imageUrl)!;
    }

    // If no image URL was provided or image failed to load, return default
    return staticGraphic.defaultMint.canvas;
  }, [canvas, staticGraphic.defaultMint.canvas]);

  const getProgramImage = useCallback((imageUrl: string): HTMLImageElement => {
    if (typeof window === 'undefined') { // Type assertion for SSR
      return null as unknown as HTMLImageElement;
    }
    return images.current.get(imageUrl) || staticGraphic.defaultProgram.image || new window.Image();
  }, [images, staticGraphic.defaultProgram.image]);

  const FetchLabelsInfosAndCache = useCallback(async (
    addresses: AddressWithType[], 
    userId?: string
  ): Promise<void> => {
    const uniqueAddresses = [...new Set(addresses.map(a => a.address))];
    const addressTypeMap = new Map(addresses.map(a => [a.address, a.type]));
    const missingAddresses: string[] = [];
  
    // First check which labels we need to fetch
    uniqueAddresses.forEach(address => {
      const cacheKey = getCacheKey(address, userId);
      if (!labelsRef.current.has(cacheKey) && !labelLoadingStates.current.has(cacheKey)) {
        missingAddresses.push(address);
        labelLoadingStates.current.set(cacheKey, true);
      }
    });
  
    // Fetch missing labels if any
    if (missingAddresses.length > 0) {
      try {
        const response = await fetchMissingLabels(missingAddresses, userId);
        missingAddresses.forEach(address => {
          const cacheKey = getCacheKey(address, userId);
          const label = response[address] || null;
          setLabel(cacheKey, label);
          labelLoadingStates.current.delete(cacheKey);
        });
      } catch (error) {
        console.error('Error fetching labels:', error);
        missingAddresses.forEach(address => {
          const cacheKey = getCacheKey(address, userId);
          labelLoadingStates.current.delete(cacheKey);
        });
      }
    }

    uniqueAddresses.forEach(address => {
        computeLabel(address,addressTypeMap.get(address)!, userId);
    });

  }, []);

  const computeLabel = useCallback((address: string, type: AddressType, userId?: string) => {
    // Now compute labels for all addresses, regardless of whether they were just fetched

      const cacheKey = getCacheKey(address, userId);
      const label = labelsRef.current.get(cacheKey);

      let computedLabel: SimpleLabel;
      if (label) {
        computedLabel = label;
      } else if (type === AddressType.PROGRAM && programsRef.current.get(address)) {
        const program = programsRef.current.get(address)!;
        computedLabel = { 
          address, 
          label: program.label, 
          description: program.description 
        };
      } else if (type === AddressType.TOKEN && mintsRef.current.get(address)) {
        const mint = mintsRef.current.get(address)!;
        // Try to get the mint name from the mint object
        // If mint name is empty, use the mint symbol or address
        let mintName;
        if (mint.name == ""){
          if (mint.symbol == ""){
            mintName = address;
          } else {
            mintName = mint.symbol;
          }
        } else {
          mintName = mint.name;
        }

        computedLabel = { 
          address, 
          label: mintName, 
          description: mint.description 
        };
      } else {
        computedLabel = {
          address,
          label: address
        };
      }

      setComputedLabel(address, computedLabel);

  },[labelsState,programsState,mintsState,computedLabelsState]);

  const getLabel = useCallback((address: string, userId?: string): Label | null => {
    const cacheKey = getCacheKey(address, userId);
    if (labelsRef.current.has(cacheKey)) {
      return labelsRef.current.get(cacheKey)!;
    }
    FetchLabelsInfosAndCache([{address, type: AddressType.UNKNOWN}], userId);
    return null;
  }
  , [labelsState]);

  const FetchProgramInfosAndCache = useCallback(async (programAddresses: string[]): Promise<void> => {
    // Remove duplicates from input array
    const uniqueAddresses = [...new Set(programAddresses)];
    const missingAddresses: string[] = [];

    // First check which programs we need to fetch
    uniqueAddresses.forEach(address => {
      if (!programsRef.current.has(address) && !programLoadingStates.current.has(address)) {
        missingAddresses.push(address);
        programLoadingStates.current.set(address, true);
      }
    });

    // Fetch missing programs if any
    if (missingAddresses.length > 0) {
    try {
      const response = await fetchMissingProgramInfos(missingAddresses);
      missingAddresses.forEach(address => {
        // Get program info from response by matchin program address
        const program = response.find((p: Program) => p.program_address === address) || null;
        setProgram(address, program);
        if (program) {
          // Invalidate the computed label cache for this address
          deleteFromComputedLabels(program.program_address);

          const imageUrl = program.icon;
          if (imageUrl) {
            preloadImage(imageUrl);
          }
        }
        programLoadingStates.current.delete(address);
      });
    } catch (error) {
      console.error('Error fetching programs:', error);
      missingAddresses.forEach(address => {
        programLoadingStates.current.delete(address);
      });
    }
  }

  }, []);

  const getProgramInfo = useCallback((programAddress: string): Program | null => {
    if (programsRef.current.has(programAddress)) {
      return programsRef.current.get(programAddress)!;
    }
    FetchProgramInfosAndCache([programAddress]);
    return null;
  }
  , [programsState]);

  // Create or update a user label
  const updateLabel = useCallback(async (
    address: string,
    label: string,
    description?: string,
    userId?: string,
    type: AddressType = AddressType.UNKNOWN
  ): Promise<Label> => {
    if (!userId) {
      throw new Error("User ID is required to create or update labels");
    }

    try {
      const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL+'/metadata/labels/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, label, description, user_id: userId }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const updatedLabel = await response.json();
      const cacheKey = getCacheKey(address, userId);
      
      setLabel(cacheKey, updatedLabel);
      // Invalidate the computed label cache for this address
      deleteFromComputedLabels(address);
      computeLabel(address, type, userId);
    
      return updatedLabel;
    } catch (error) {
      console.error('Error updating label:', error);
      throw error;
    }
  }, []);

  const deleteLabel = useCallback(async (
    address: string,
    userId?: string
  ): Promise<boolean> => {
    if (!userId) {
      throw new Error("User ID is required to delete labels");
    }

    try {
      const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL+'/metadata/labels/user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, user_id: userId }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const cacheKey = getCacheKey(address, userId);
      // Remove label from cache
      deleteFromLabels(cacheKey);
      // Invalidate the computed label cache for this address
      deleteFromComputedLabels(address);
    
      return true;
    } catch (error) {
      console.error('Error deleting label:', error);
      return false;
    }
  }, []);

  const getLabelComputed = useCallback(
    (address: string, type: AddressType = AddressType.UNKNOWN, shortenedAddress: boolean = false): SimpleLabel => {
      const userId = publicKey?.toBase58();

      // Check if label is already in state
      const cachedLabel = ComputedLabelsRef.current.get(address);
      if (cachedLabel) {
        if (cachedLabel.label === address) {
          return { address: address, label: shortenedAddress ? shortenAddress(address) : address };
        }
        return cachedLabel;
      }

      const addressesWithTypes: AddressWithType[] = [{address,type}];
      // Trigger asynchronous fetching
      FetchLabelsInfosAndCache(addressesWithTypes,userId);

      // Return fallback while fetching
      return { address: address, label: shortenedAddress ? shortenAddress(address) : address };
    },
    [computedLabelsState, publicKey]
  );

  const getGraphic = useCallback((address: string, mint_address: string, type: AccountType): StaticGraphic => {
    let nodeGraphic: StaticGraphic;
    const mintAddress = mint_address;
    const mintInfo = mintAddress ? getMintInfo(mintAddress) : null;
    if (isSpam(address)) {
      nodeGraphic = staticGraphic.spam;
    } else if (type === AccountType.BURN_ACCOUNT) {
      nodeGraphic = staticGraphic.burn;
    } else if (type === AccountType.MINTTO_ACCOUNT) {
      nodeGraphic = staticGraphic.mintTo;
    } else if (type === AccountType.PROGRAM_ACCOUNT) {
      const programImgUrl = getProgramInfo(address)?.icon;
      const programImg = getProgramImage(programImgUrl!);
      const programCanvas = getImageCanvas(programImgUrl!, type);
      nodeGraphic = {image: programImg, canvas: programCanvas};
    } else if (type === AccountType.FEE_ACCOUNT) {
      nodeGraphic = staticGraphic.fee;
    } else if (type == AccountType.WALLET_ACCOUNT || type == AccountType.STAKE_ACCOUNT) {
      nodeGraphic = staticGraphic.wallet;
    } else {
      const img = getMintImage(mintInfo?.image);
      const canvas = getImageCanvas(mintInfo?.image, type)
      nodeGraphic = {image:img, canvas:canvas};
    }
    return nodeGraphic;
  }, [spamAddresses, getMintImage, getImageCanvas, getProgramImage, getMintInfo, staticGraphic]);

  const getGraphicByNode = useCallback((node: ForceGraphNode): StaticGraphic => {
    return getGraphic(node.account_vertex.address, node.mint_address, node.type);
  }, [getGraphic]);

  // Add a function to fetch spam addresses
  const fetchSpamAddressesAndCache = useCallback(async () => {
   
    const userId = publicKey?.toBase58();
    try {
      const spamList = await fetchSpamAddresses(userId);
      setSpamAddresses(spamList);
      
      // Update the map for fast lookups
      const newMap = new Map<string, Spam>();
      spamList.forEach(spam => {
        newMap.set(spam.address, spam);
      });
      spamAddressesMap.current = newMap;
    } catch (error) {
      console.error('Error fetching spam addresses:', error);
    }
  }, [publicKey]);

  // Fetch spam addresses when the provider loads or when publicKey changes
  useEffect(() => {
    fetchSpamAddressesAndCache();
  }, [fetchSpamAddressesAndCache, publicKey]);

  // Check if an address is spam
  const isSpam = useCallback((address: string): boolean => {
    return spamAddressesMap.current.has(address);
  }, [spamAddresses, spamAddressesMap]);

  // Get the spam object by address
  const getSpam = useCallback((address: string): Spam | null => {
    return spamAddressesMap.current.get(address) || null;
  }, [spamAddresses, spamAddressesMap]);

  const canUnMarkSpam = useCallback((address: string): boolean => {
    const spam = spamAddressesMap.current.get(address);
    if (spam) {
      return spam.user_id === publicKey?.toBase58() || spam.creator === SpamType.USER;
    }
    return false;

  }, [spamAddresses, spamAddressesMap, publicKey]);

  // Add an address to spam
  const addToSpam = useCallback(async (address: string): Promise<Spam> => {
    if (!publicKey) {
      showToast("Please connect your wallet to add addresses to your spam list", "info");
      return {} as Spam;
    }
    
    const userId = publicKey.toBase58();
    
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL+'/metadata/spam/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          user_id: userId
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const newSpam: Spam = await response.json();
      
      // Update the local state
      setSpamAddresses(prevSpams => [...prevSpams, newSpam]);
      spamAddressesMap.current.set(address, newSpam);
      
      return newSpam;
    } catch (error) {
      console.error('Error adding address to spam:', error);
      throw error;
    }
  }, [publicKey]);

  const deleteFromSpam = useCallback(async (spamId: number): Promise<boolean> => {
    if (!publicKey) {
      throw new Error("User must be connected to delete addresses from spam list");
    }
    
    const userId = publicKey.toBase58();
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/metadata/spam/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spam_id: spamId,
          user_id: userId
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      // Update the local state
      setSpamAddresses(prevSpams => {
        const updatedSpams = prevSpams.filter(spam => spam.id !== spamId);
        
        // Also update the map
        const spamToRemove = prevSpams.find(spam => spam.id === spamId);
        if (spamToRemove) {
          spamAddressesMap.current.delete(spamToRemove.address);
        }
        
        return updatedSpams;
      });
      
      return true;
    } catch (error) {
      console.error('Error removing address from spam:', error);
      return false;
    }
  }, [publicKey]);

  // Include the new functions in the context value
  return (
    <StaticGraphicsProvider>
    <MetadataContext.Provider value={{
      isSpam,
      getSpam,
      canUnMarkSpam,
      addToSpam,
      deleteFromSpam,

      FetchMintInfosAndCache,
      FetchProgramInfosAndCache,
      FetchLabelsInfosAndCache,

      getMintInfo,
      getMintImage,
      getImageCanvas,

      getProgramInfo,
      getProgramImage,
      
      getLabel,
      getLabelComputed,
      updateLabel,
      deleteLabel,

      getGraphic,
      getGraphicByNode,

      spamAddresses

    }}>
      {children}
    </MetadataContext.Provider>
    </StaticGraphicsProvider>
  );
}

// Custom hook to use the metadata context
export function useMetadata() {
  const context = useContext(MetadataContext);
  if (context === undefined) {
    throw new Error('useMetadata must be used within a MetadataProvider');
  }
  return context;
}