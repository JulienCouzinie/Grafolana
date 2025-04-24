import React, { createContext, useContext, useState } from 'react';
import { GraphData } from '@/types/graph';

// Define the context type
interface GraphDataContextType {
  processedData: GraphData;
  setProcessedData: React.Dispatch<React.SetStateAction<GraphData>>;
  originalData: GraphData;
  setOriginalData: React.Dispatch<React.SetStateAction<GraphData>>;
}

// Create the context
const GraphDataContext = createContext<GraphDataContextType | undefined>(undefined);

// Provider component
export const GraphDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [processedData, setProcessedData] = useState<GraphData>({
    nodes: [],
    links: [],
    transactions: {},
  });

  const [originalData, setOriginalData] = useState<GraphData>({
    nodes: [],
    links: [],
    transactions: {},
  });

  return (
    <GraphDataContext.Provider value={{ processedData, setProcessedData, originalData, setOriginalData }}>
      {children}
    </GraphDataContext.Provider>
  );
};

// Hook to use the context
export const useGraphData = (): GraphDataContextType => {
  const context = useContext(GraphDataContext);
  if (!context) {
    throw new Error('useGraphData must be used within a GraphDataProvider');
  }
  return context;
};