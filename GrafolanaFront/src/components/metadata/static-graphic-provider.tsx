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
};

const StaticGraphicsContext = createContext<StaticGraphicsContextType | undefined>(undefined);

// The useStaticGraphic hook stays the same - it's a valid custom hook
export const useStaticGraphic = (src: string): StaticGraphic => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = src;

    img.onload = () => {
      const imgCanvas = getCanvas(img);
      setImage(img);
      setCanvas(imgCanvas);
    };

    img.onerror = () => {
      console.error(`Failed to load image: ${src}`);
      setImage(null);
      setCanvas(null);
    };

    return () => {
      setImage(null);
      setCanvas(null);
    };
  }, [src]);

  return { image, canvas };
};

// Create a provider component that uses the hooks properly
export function StaticGraphicsProvider({ children }: { children: ReactNode }) {
  // Use the hooks inside this component
  const defaultMint = useStaticGraphic('/logo/default.png');
  const wallet = useStaticGraphic('/logo/wallet.png');
  const fee = useStaticGraphic('/fee.png');
  const burn = useStaticGraphic('/burn.png');
  const mintTo = useStaticGraphic('/mintto.png');
  const defaultProgram = useStaticGraphic('/program/default.png');
  const spam = useStaticGraphic('/logo/spam.png');

  const staticGraphics: StaticGraphicsContextType = {
    defaultMint,
    wallet,
    fee,
    burn,
    mintTo,
    defaultProgram,
    spam
  };

  return (
    <StaticGraphicsContext.Provider value={staticGraphics}>
      {children}
    </StaticGraphicsContext.Provider>
  );
}

// Custom hook to use the static graphics
export function useStaticGraphics(): StaticGraphicsContextType {
  const context = useContext(StaticGraphicsContext);
  if (context === undefined) {
    throw new Error('useStaticGraphics must be used within a StaticGraphicsProvider');
  }
  return context;
}