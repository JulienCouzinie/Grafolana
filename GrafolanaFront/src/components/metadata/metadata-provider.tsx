'use client'

import { MintDTO, Label, Program, SimpleLabel, AddressWithType, AddressType } from "@/types/metadata";
import { createContext, useContext, useCallback, useState, useMemo, ReactNode, useEffect, useRef } from "react";
import { useWallet } from '@solana/wallet-adapter-react';
import { fetchMissingMintInfos, fetchMissingLabels, fetchMissingProgramInfos } from "./fetchers";
import { cp } from "fs";
import { useImmediateState } from "@/hooks/useImmediateState";
import { cropLogoToSquare, getCanvas } from "@/utils/imageUtils";
import { shortenAddress } from "@/utils/addressUtils";
import { AccountType } from "@/types/graph";
import { StaticGraphicsProvider, useStaticGraphics, StaticGraphicsContextType } from "./static-graphic-provider";

interface MetadataContextType {
  FetchMintInfosAndCache: (mintAddresses: string[]) => Promise<void>;
  FetchProgramInfosAndCache: (programAddresses: string[]) => Promise<void>;
  FetchLabelsInfosAndCache: (addresses: AddressWithType[], userId?: string, shortenAddress?: boolean) => Promise<void>;

  getMintInfo: (mintAddress: string) => MintDTO | null;
  getProgramInfo: (programAddress: string) => Program | null;
  getLabel: (address: string, userId?: string) => Label | null;

  getMintImage: (imageUrl: string | undefined) => HTMLImageElement | null;
  getImageCanvas: (imageUrl: string | undefined, type?: AccountType) => HTMLCanvasElement | null;
  getProgramImage: (imageUrl: string) => HTMLImageElement;
  
  updateLabel: (address: string, label: string, description?: string, userId?: string, type?: AddressType) => Promise<Label>;
  getLabelComputed: (address: string, type?: AddressType, shortened_address?: boolean) => SimpleLabel;
  
  // Add the staticGraphic property
  staticGraphic: StaticGraphicsContextType;
}

const MetadataContext = createContext<MetadataContextType | undefined>(undefined);

export function MetadataProvider({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  const staticGraphic = useStaticGraphics();

  // Caches
  const [
    mintsState, 
    mintsRef, 
    setMint,              // for single updates
    setMints,            // for multiple updates
    deleteFromMints, 
    clearMints
  ] = useImmediateState<string, MintDTO | null>(new Map());
  const [
    labelsState, 
    labelsRef, 
    setLabel,              // for single updates
    setLabels,            // for multiple updates
    deleteFromLabels, 
    clearLabels
  ] = useImmediateState<string, Label | null>(new Map());

  const [computedLabelsState, ComputedLabelsRef, setComputedLabel, setComputedLabels, deleteFromComputedLabels, clearComputedLabels] = useImmediateState(new Map<string, SimpleLabel>(new Map()));
  const [
    programsState, 
    programsRef, 
    setProgram,              // for single updates
    setPrograms,            // for multiple updates
    deleteFromPrograms, 
    clearPrograms
  ] = useImmediateState<string, Program | null>(new Map());
  
  const images = useRef(new Map<string, HTMLImageElement>());
  const canvas = useRef(new Map<string, HTMLCanvasElement>());

  // Loading states
  const imageLoadingStates = useRef(new Map<string, boolean>());
  const labelLoadingStates = useRef(new Map<string, boolean>());
  const labelComputedSLoadingStates = useRef(new Map<string, boolean>());
  const mintLoadingStates = useRef(new Map<string, boolean>());
  const programLoadingStates = useRef(new Map<string, boolean>());
  
  // Create a cache key that includes userId if present
  const getCacheKey = (address: string, uid?: string) => uid ? `${address}:${uid}` : address;

  const preloadImage = useCallback((imageUrl: string, mint: boolean=false) => {
    if (!images.current.has(imageUrl)) {
      imageLoadingStates.current.set(imageUrl, true);
      const img = new window.Image();
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
    const uniqueAddresses = [...new Set(mintAddresses)];
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
      const response = await fetch('http://localhost:5000/api/metadata/labels/user', {
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

  return (
    <StaticGraphicsProvider>
    <MetadataContext.Provider value={{
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
      // Add the staticGraphics object
      staticGraphic
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