'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getCanvas } from "@/utils/imageUtils";

export type StaticGraphic = {
  image: HTMLImageElement | null;
  canvas: HTMLCanvasElement | null;
};

export type StaticGraphicsContextType = {
  defaultMint: StaticGraphic;
  wallet: StaticGraphic;
  fee: StaticGraphic;
  burn: StaticGraphic;
  mintTo: StaticGraphic;
  defaultProgram: StaticGraphic;
  spam: StaticGraphic;
  warning: StaticGraphic;
};

const StaticGraphicsContext = createContext<StaticGraphicsContextType | undefined>(undefined);

const useStaticGraphicLoader = (src: string): StaticGraphic | null => {
  const [graphic, setGraphic] = useState<StaticGraphic | null>(null);

  useEffect(() => {
    const img = new Image();

    img.onload = () => {
      const imgCanvas = getCanvas(img);
      setGraphic({ image: img, canvas: imgCanvas });
    };

    img.onerror = () => {
      console.error(`Failed to load image: ${src}`);
      setGraphic(null);
    };

    img.src = src;
  }, [src]);

  return graphic;
};

export function StaticGraphicsProvider({ children }: { children: ReactNode }) {
  const defaultMint = useStaticGraphicLoader('/logo/default.png');
  const wallet = useStaticGraphicLoader('/logo/wallet.png');
  const fee = useStaticGraphicLoader('/fee.png');
  const burn = useStaticGraphicLoader('/burn.png');
  const mintTo = useStaticGraphicLoader('/mintto.png');
  const defaultProgram = useStaticGraphicLoader('/program/default.png');
  const spam = useStaticGraphicLoader('/logo/spam.png');
  const warning = useStaticGraphicLoader('/warning.png');

  // Only provide context when ALL graphics are loaded
  const allGraphicsLoaded = defaultMint && wallet && fee && burn && mintTo && defaultProgram && spam && warning;

  if (!allGraphicsLoaded) {
    // You can return a loading state or null here
    return null; // or return <div>Loading graphics...</div>
  }

  const staticGraphics: StaticGraphicsContextType = {
    defaultMint,
    wallet,
    fee,
    burn,
    mintTo,
    defaultProgram,
    spam,
    warning
  };

  return (
    <StaticGraphicsContext.Provider value={staticGraphics}>
      {children}
    </StaticGraphicsContext.Provider>
  );
}

export function useStaticGraphics(): StaticGraphicsContextType {
  const context = useContext(StaticGraphicsContext);
  if (context === undefined) {
    throw new Error('useStaticGraphics must be used within a StaticGraphicsProvider');
  }
  return context;
}