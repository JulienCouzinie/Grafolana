'use client'

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { GraphData, } from '../../types/graph';
import { MetadataPreloader } from './MetadataPreloader';
import { useFlowViewStrategy } from './view-strategies/FlowViewStrategy';
import { useAccountViewStrategy } from './view-strategies/AccountViewStrategy';
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';

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

// View types supported by the graph
type ViewMode = 'flow' | 'account' | 'wallet' | 'program';

interface TransactionGraphProps {
  graphData: GraphData;
}

export function TransactionGraph({ graphData }: TransactionGraphProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('flow');
  const [processedData, setProcessedData] = useState<GraphData>({ 
    nodes: [], 
    links: [], 
    transactions: {},
  });
  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false);
  
  // Create a ref for the panel to access its imperative handle
  const panelRef = useRef<ImperativePanelHandle>(null);

  // Use flow view strategy hook
  const flowStrategy = useFlowViewStrategy();
  const accountStrategy = useAccountViewStrategy();
  
  // Select current strategy based on view mode
  const strategy = useMemo(() => {
    return viewMode === 'flow' ? flowStrategy : accountStrategy;
    // Note: In the future, add other strategies here based on viewMode
    // e.g., viewMode === 'wallet' ? walletStrategy : viewMode === 'program' ? programStrategy : ...
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

  // Toggle panel visibility using the imperative handle
  const togglePanel = () => {
    if (panelRef.current) {
      if (isPanelCollapsed) {
        // If panel is collapsed, expand it
        panelRef.current.expand();
      } else {
        // If panel is expanded, collapse it
        panelRef.current.collapse();
      }
      // State will be updated via onCollapse/onExpand callbacks
    }
  };

  // Handle panel collapse event from the Panel component
  const handlePanelCollapse = () => {
    setIsPanelCollapsed(true);
  };

  // Handle panel expand event from the Panel component
  const handlePanelExpand = () => {
    setIsPanelCollapsed(false);
  };

  return (
    <div className="w-full h-full">
      <MetadataPreloader graphData={graphData} />
      <PanelGroup direction="horizontal" className="h-full">
        {/* Controls Panel */}
        <Panel 
          ref={panelRef}
          id="controls-panel" 
          order={1}
          minSizePercentage={15}
          defaultSizePercentage={20}
          collapsible={true}
          collapsedSizePixels={32} // Width of just the toggle button
          onCollapse={handlePanelCollapse}
          onExpand={handlePanelExpand}
        >
          <div className={`controls-panel ${isPanelCollapsed ? 'collapsed' : ''}`}>
            {/* Toggle Panel Button */}
            <button 
              onClick={togglePanel} 
              className="panel-toggle-button"
              aria-label={isPanelCollapsed ? "Show panel" : "Hide panel"}
              title={isPanelCollapsed ? "Show panel" : "Hide panel"}
            >
              {/* Unicode characters for simple icons */}
              {isPanelCollapsed ? "→" : "←"}
            </button>
            
            {/* Container for content that gets hidden when collapsed */}
            <div className={`panel-content ${isPanelCollapsed ? 'hidden' : ''}`}>
              {/* Additional controls can be added here */}
            </div>
          </div>
        </Panel>
        
        {/* Resize handle */}
        <PanelResizeHandle 
          className="resize-handle"
          style={{
            width: '4px',
            background: SOLANA_COLORS.darkGray,
            cursor: 'col-resize',
          }}
        />
        
        {/* Graph Panel */}
        <Panel 
          id="graph-panel" 
          order={2}
          defaultSizePercentage={80}
        >
          <div className="w-full h-full flex flex-col">
            {/* View Selection Control Bar */}
            <div className="view-control-bar">
              <div className="view-buttons">
                <button 
                  className={`view-button ${viewMode === 'flow' ? 'active' : ''}`} 
                  onClick={() => setViewMode('flow')}
                  title="Transfers View - Focus on data flow between accounts"
                >
                  Transfers
                </button>
                <button 
                  className={`view-button ${viewMode === 'account' ? 'active' : ''}`} 
                  onClick={() => setViewMode('account')}
                  title="Accounts View - Focus on account relationships"
                >
                  Accounts
                </button>
                <button 
                  className={`view-button ${viewMode === 'wallet' ? 'active' : ''}`} 
                  onClick={() => setViewMode('wallet')}
                  title="Wallets View - Focus on wallet relationships"
                  disabled={true} // Disabled until implemented
                >
                  Wallets
                </button>
                <button 
                  className={`view-button ${viewMode === 'program' ? 'active' : ''}`} 
                  onClick={() => setViewMode('program')}
                  title="Programs View - Focus on program interactions"
                  disabled={true} // Disabled until implemented
                >
                  Programs
                </button>
              </div>
            </div>

            {/* Force Graph Visualization */}
            <div className="graph-container">
              <NoSSRForceGraph
                graphData={processedData}
                width={window ? window.innerWidth * 0.8 : 800} // Responsive width
                height={window ? window.innerHeight - 150 : 600} // Adjusted height to account for control bar
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
          </div>
        </Panel>
      </PanelGroup>

      <style jsx>{`
        .controls-panel {
          position: relative;
          padding: 12px;
          height: 100%;
          overflow-y: auto;
          background-color: #1a1a1a;
          color: white;
          transition: width 0.3s ease;
        }
        
        .controls-panel.collapsed {
          padding: 12px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start; /* Align items at the top */
        }
        
        .panel-toggle-button {
          position: ${isPanelCollapsed ? 'relative' : 'absolute'};
          top: ${isPanelCollapsed ? '0' : '10px'};
          right: ${isPanelCollapsed ? 'auto' : '10px'};
          background-color: ${SOLANA_COLORS.purple};
          color: white;
          border: none;
          border-radius: 4px;
          width: 24px;
          height: 24px;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
        }
        
        .panel-toggle-button:hover {
          background-color: ${SOLANA_COLORS.blue};
        }
        
        .panel-content.hidden {
          display: none;
        }
        
        /* View Control Bar Styles */
        .view-control-bar {
          padding: 8px;
          display: flex;
          justify-content: center;
          background-color: #1a1a1a;
          border-bottom: 1px solid #333;
        }
        
        .view-buttons {
          display: flex;
          justify-content: center;
          gap: 8px;
        }
        
        .view-button {
          background-color: #2c2c2c;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .view-button:hover:not([disabled]) {
          background-color: #444;
        }
        
        .view-button.active {
          background-color: ${SOLANA_COLORS.purple};
          color: white;
        }
        
        .view-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Make the graph container take the remaining space */
        .graph-container {
          flex: 1;
          overflow: hidden;
          position: relative;
        }
      `}</style>
    </div>
  );
}
