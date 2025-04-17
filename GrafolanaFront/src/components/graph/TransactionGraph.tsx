'use client'

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { GraphData, } from '../../types/graph';
import { MetadataPreloader } from './MetadataPreloader';
import { useFlowViewStrategy } from './view-strategies/FlowViewStrategy';
import { useAccountViewStrategy } from './view-strategies/AccountViewStrategy';

const NoSSRForceGraph = dynamic(() => import('./NoSSRForceGraph'), {
  ssr: false,
});

// Solana logo-inspired color palette
const SOLANA_COLORS = {
  purple: '#9945FF',
  green: '#14F195',
  blue: '#19D3F3',
  darkGray: '#2A2A2A',
};

interface TransactionGraphProps {
  graphData: GraphData;
}

export function TransactionGraph({ graphData }: TransactionGraphProps) {
  const [viewMode, setViewMode] = useState<'flow' | 'account'>('flow');
  const [processedData, setProcessedData] = useState<GraphData>({ 
    nodes: [], 
    links: [], 
    transactions: {},
  });


  // Use flow view strategy hook
  const flowStrategy = useFlowViewStrategy();
  const accountStrategy = useAccountViewStrategy();
  
  // Select current strategy based on view mode
  const strategy = useMemo(() => {
    return viewMode === 'flow' ? flowStrategy : accountStrategy;
  }, [viewMode]);

  // Process data using current strategy
  useEffect(() => {
    if (strategy) {
      const processed = strategy.processData(graphData);
      setProcessedData(processed);
    }
  }, [graphData, viewMode]);

  // Render nothing if no strategy is selected
  if (!strategy) return null;

  return (
    <div>
      <MetadataPreloader graphData={graphData} />
      <div className="view-toggle">
        <label>
          <input
            type="checkbox"
            checked={viewMode === 'account'}
            onChange={(e) => setViewMode(e.target.checked ? 'account' : 'flow')}
          />
          Account-Centric View
        </label>
      </div>
      <NoSSRForceGraph
        graphData={processedData}
        width={1800}
        height={600}
        backgroundColor="#000000"
        nodeRelSize={8}
        // Node rendering
        nodeCanvasObject={(node, ctx, scale) => strategy.nodeCanvasObject(node, ctx, scale)}
        nodeLabel={(node) => strategy.nodeTooltip(node)}
        // Link styling
        linkWidth={(link) => strategy.getLinkStyle(link).width}
        linkColor={(link) => strategy.getLinkStyle(link).color}
        linkCurvature={(link) => strategy.getLinkStyle(link).curvature || 0}
        linkLineDash={(link) => strategy.getLinkStyle(link).lineDash || []}
        linkDirectionalArrowLength={(link) => strategy.getLinkStyle(link).arrowLength || 8}
        linkDirectionalArrowColor={(link) => strategy.getLinkStyle(link).arrowColor || SOLANA_COLORS.purple}
        linkDirectionalArrowRelPos={1}
        linkLabel={(link) => strategy.linkTooltip(link)}
        linkCanvasObject={(link, ctx, scale) => strategy.linkCanvasObject(link, ctx, scale)}
        linkCanvasObjectMode={() => 'after'}
        // Interactions
        enableNodeDrag={true}
        enableZoomInteraction={true}
        onNodeHover={(node => strategy.handleNodeHover(node))}
        onLinkHover={(link => strategy.handleLinkHover(link))}
      />
    </div>
  );
}
