'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import * as d3 from 'd3-force';
import { GraphData, } from '@/types/graph';
import { useFlowViewStrategy } from './view-strategies/FlowViewStrategy';
import { useAccountViewStrategy } from './view-strategies/AccountViewStrategy';
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { useWalletViewStrategy } from './view-strategies/WalletViewStrategy';
import { Accordion, AccordionItem } from '@/components/ui/accordion';
import { useGraphInteractions } from './hooks/useGraphInteractions';
import { ForceGraphMethods } from 'react-force-graph-2d';
import { useMetadata } from '@/components/metadata/metadata-provider';
import { useTransactions } from '@/components/transactions/transactions-provider';

/**
 * IMPORTANT: NoSSRForceGraph Component Usage Guidelines
 * 
 * When adding new props to this component, follow these steps:
 * 
 * 1. Add the prop to TypedForceGraphProps in NoSSRForceGraph.tsx:
 *    - First add the prop name to the Omit<> list if it exists in ForceGraphProps 
 *    - Then add it back with our domain-specific types (ForceGraphNode, ForceGraphLink)
 * 
 * 2. Props currently being typed and properly passed:
 *    - nodeCanvasObject: For custom rendering of nodes
 *    - nodeLabel: For tooltips when hovering over nodes
 *    - linkWidth, linkColor, linkCurvature: For link styling
 *    - onNodeHover, onLinkHover: For hover event handling
 *    - onNodeRightClick: For context menu
 *    - All other standard ForceGraph props are passed through automatically
 * 
 * 3. When using refs:
 *    - Remember that ref is handled specially through forwardRef
 *    - The ref gives access to methods like d3Force(), d3ReheatSimulation()
 *    - Example: fgRef.current.d3Force('collide', d3.forceCollide()...)
 * 
 * 4. When adding event handlers:
 *    - Make sure to update both the Omit<> list and the added types
 *    - Use consistent nullability patterns (e.g., node: ForceGraphNode | null)
 */
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
  apiGraphData: GraphData;
}

// Create an interface to store graph data by view mode
interface GraphDataCache {
  [key: string]: GraphData | null;
}

export function TransactionGraph({ apiGraphData }: TransactionGraphProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('flow');
  const [graphData, setGraphData] = useState<GraphData>({ 
    nodes: [], 
    links: [], 
    transactions: {},
  });

  // Cache for storing graph data by view mode
  const graphDataCache = useRef<GraphDataCache>({
    flow: null,
    account: null,
    wallet: null,
    program: null,
  });

  const {spamAddresses} = useMetadata();

  const [redraw, setRedraw] = useState<number>(0);

  // Add a reference to the graph component at the beginning of your component
  const fgRef = useRef<ForceGraphMethods<{}, {}>>(null);

  // Create a ref for the panel to access its imperative handle
  const panelRef = useRef<ImperativePanelHandle>(null);

  // Use flow view strategy hook
  const flowStrategy = useFlowViewStrategy();
  const accountStrategy = useAccountViewStrategy();
  const walletStrategy = useWalletViewStrategy();

  // Add state to store accordion content
  const [infoContent, setInfoContent] = useState<React.ReactNode | null>(null);
  const [generalContent, setGeneralContent] = useState<React.ReactNode | null>(null);
  const [filtersContent, setFiltersContent] = useState<React.ReactNode | null>(null);
  const [transactionClusterContent, setTransactionClusterContent] = useState<React.ReactNode | null>(null);
  const [NodesContent, setNodesContent] = useState<React.ReactNode | null>(null);
  const [LinksContent, setLinksContent] = useState<React.ReactNode | null>(null);
  // Select current strategy based on view mode
  const strategy = useMemo(() => {
    return viewMode === 'flow' ? flowStrategy : viewMode === 'wallet' ? walletStrategy : viewMode === 'account' ? accountStrategy: null;
  }, [viewMode]);

  // Use consolidated graph interactions hook
  const {
    // Node selection
    nodeSelectionUpdate,
    linkSelectionUpdate,

    handleNodeClick,
    handleLinkClick,
    
    // Node position fixing
    handleNodeDragEnd,
    
    // Context menu
    contextMenu,
    handleNodeRightClick,
    handleContextMenuAction,
    handleBackGroundClick,
  } = useGraphInteractions(strategy, fgRef);

  useEffect(() => {
    if (strategy){
      strategy.applyFilters();
    }
  }, [spamAddresses]); // Re-run when spam addresses change

  // Add an effect to cache the processed data for the current view mode
  useEffect(() => {
    if (strategy) {
      graphDataCache.current[viewMode] = graphData;
    }
  }, [graphData]); // Re-run when data changes

  // Add an effect to reposition the graph
  // so that it fits the new data
  useEffect(() => {
    if (strategy) {
      strategy.positionNodes();
      if (graphData.nodes.length != 0) {
        setTimeout(() => {
          fgRef.current?.zoomToFit(400);
          fgRef.current?.zoomToFit(400);
        }, 1000);
      }
    }
  }, [graphData]); // Re-run when data changes

  // Add an effect to properly initialize and configure the force simulation
  useEffect(() => {
    if (!fgRef.current) return;

    // Configure collision force - properly access the d3Force API
    fgRef.current.d3Force('collide', d3.forceCollide());
    
  }, [graphData]); // Re-run when data changes

  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false);

  // Process data using current strategy
  useEffect(() => {
    if (strategy) {
      // Check if we have cached data for the current view mode
      if (graphDataCache.current[viewMode]) {
        // Use cached data
        setGraphData(graphDataCache.current[viewMode]!);

      // Don't reheat simulation if data is cached
      } else {
        // Process and cache the data
        if (apiGraphData.nodes.length !== 0) {
          strategy.initializeGraphData(apiGraphData, setGraphData);
        }
      }
    }
  }, [viewMode]);

  // Process data using current strategy
  useEffect(() => {
    if (strategy) {
      if (apiGraphData.nodes.length !== 0) {
        strategy.initializeGraphData(apiGraphData, setGraphData);
      }
      // Invalidate cache for all view modes
      graphDataCache.current['flow'] = null;
      graphDataCache.current['account'] = null;
      graphDataCache.current['wallet'] = null;
      graphDataCache.current['program'] = null;
    }
  }, [apiGraphData]);

  // Use an effect to update accordion content whenever strategy changes or selectedNodes changes
  useEffect(() => {
    if (strategy) {
      // Update all accordion content from strategy
      setInfoContent(strategy.getInfoContent());
      setGeneralContent(strategy.getGeneralContent());
      setFiltersContent(strategy.getFiltersContent());
      setTransactionClusterContent(strategy.getTransactionClusterContent());
      setNodesContent(strategy.getNodesInfoContent());
      setLinksContent(strategy.getLinksInfoContent());
    }
  }, [viewMode]);

  // Add effect to update Info content when new entities are fetched
  useEffect(() => {
    if (strategy) {
      setInfoContent(strategy.getInfoContent())
    }
  }, [useTransactions().fetchedBlocks, useTransactions().fetchedWallets, useTransactions().fetchedTransactions]); 

  // Add effect to update Nodes info when selection changes
  useEffect(() => {
    if (strategy) {
      // Only update nodes content since it's the one showing selection info
      setNodesContent(strategy.getNodesInfoContent());
    }
  }, [nodeSelectionUpdate]);

  // Add effect to update Links info when selection changes
  useEffect(() => {
    if (strategy) {
      // Only update links content since it's the one showing selection info
      setLinksContent(strategy.getLinksInfoContent());
    }
  }, [linkSelectionUpdate]);

  // Add an effect to update the transaction cluster content when data changes
  useEffect(() => {
    if (strategy) {
      setTransactionClusterContent(strategy.getTransactionClusterContent());
    }
  }, [graphData]); // Re-run when redraw state changes


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

  const forceRedraw = useCallback(() => {
    setRedraw(prev => prev + 1);
  }, []);

  // Update the ref to target the top-level container instead of just the graph area
  const containerRef = useRef<HTMLDivElement>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [graphDimensions, setGraphDimensions] = useState({ width: 800, height: 600 });
  
  // Create resize observer to update graph dimensions when container size changes
  useEffect(() => {
    if (!graphContainerRef.current) return;
    
    const updateDimensions = () => {
      if (graphContainerRef.current) {
        const { offsetWidth, offsetHeight } = graphContainerRef.current;
        setGraphDimensions({
          width: offsetWidth,
          height: offsetHeight
        });
      }
    };
    
    // Initial update
    updateDimensions();
    
    // Create resize observer
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    
    resizeObserver.observe(graphContainerRef.current);
    
    // Also update when panel collapse state changes
    if (isPanelCollapsed !== undefined) {
      updateDimensions();
    }
    
    return () => {
      if (graphContainerRef.current) {
        resizeObserver.unobserve(graphContainerRef.current);
      }
    };
  }, [isPanelCollapsed]); // Re-run when panel collapse state changes

  // Add state to track fullscreen status
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  // Function to toggle fullscreen mode - updated to use the top-level container
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      // Enter fullscreen
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      // Exit fullscreen
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.error(`Error attempting to exit fullscreen: ${err.message}`);
      });
    }
  }, []);
  
  // Listen for fullscreen changes from other sources (like Esc key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    // Apply the ref to the top-level container
    <div className="w-full h-full" ref={containerRef}>    
      {/* Context Menu */}
      {contextMenu.isOpen && contextMenu.node && (
        <div 
          className="context-menu"
          style={{
            position: 'fixed',
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            zIndex: 1000,
          }}
        >
          {strategy.getNodeContextMenuItems(contextMenu.node).map((item) => (
            <button 
              key={item.action}
              className="context-menu-item"
              onClick={() => handleContextMenuAction(item.action)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      <PanelGroup direction="horizontal" className="h-full">
        {/* Controls Panel */}
        <Panel 
          ref={panelRef}
          id="controls-panel" 
          order={1}
          minSizePercentage={15}
          defaultSizePercentage={20}
          collapsible={true}
          collapsedSizePercentage={1} // Fix because collapsedSizePixel fucks the whole layout when host component is hidden
          onCollapse={handlePanelCollapse}
          onExpand={handlePanelExpand}
          className='min-w-[32px]'//// Fix because collapsedSizePixel
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
              <h2 className="panel-title">Graph Controls</h2>
              <Accordion className="custom-accordion">
                <AccordionItem title="Informations" defaultOpen={false}>
                  <div className="accordion-content">
                    {infoContent || <p>No informations available for this view</p>}
                  </div>
                </AccordionItem>
                <AccordionItem title="General" defaultOpen={false}>
                  <div className="accordion-content">
                    {generalContent || <p>No general options available for this view</p>}
                  </div>
                </AccordionItem>
                <AccordionItem title="Filters" defaultOpen={false}>
                  <div className="accordion-content">
                    {filtersContent || <p>No filters available for this view</p>}
                  </div>
                </AccordionItem>
                <AccordionItem title={`Transactions Clusters (${strategy.transactionsClusterGroups.current?.length || 0})`} defaultOpen={false}>
                  <div className="accordion-content">
                    {transactionClusterContent || <p>No Transactions Clusters options available for this view</p>}
                  </div>
                </AccordionItem>
                <AccordionItem title={`Selected Nodes (${strategy.selectedNodes.current?.size || 0})`} defaultOpen={false}>
                  <div className="accordion-content">
                    {NodesContent || <p>No nodes information available for this view</p>}
                  </div>
                </AccordionItem>
                <AccordionItem title={`Selected Links (${strategy.selectedLinks.current?.size || 0})`} defaultOpen={false}>
                  <div className="accordion-content">
                    {LinksContent || <p>No links information available for this view</p>}
                  </div>
                </AccordionItem>
              </Accordion>
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
            <div className="graph-container" ref={graphContainerRef}>
              <NoSSRForceGraph
                ref={fgRef}
                graphData={graphData}
                width={graphDimensions.width}
                height={graphDimensions.height}
                backgroundColor="#000000"
                nodeRelSize={8}
                // Node rendering
                nodeCanvasObject={(node, ctx, scale) => strategy.nodeCanvasObject(node, ctx, scale)}
                nodeLabel={(node) => strategy.nodeTooltip(node)}
                // Add click handler for node selection
                onNodeClick={handleNodeClick}
                onLinkClick={handleLinkClick}
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
                autoPauseRedraw={true}
                enableZoomInteraction={true}
                onNodeHover={(node) => {
                  const hover = strategy.handleNodeHover(node)
                  if (hover){
                    forceRedraw();
                  }
                }}
                onLinkHover={(link) => {
                  const hover = strategy.handleLinkHover(link)
                  if (hover){
                    forceRedraw();
                  }
                }}
                // Right-click handling
                onNodeRightClick={handleNodeRightClick}
                // Add drag end handler
                onNodeDragEnd={handleNodeDragEnd}     
                onBackgroundClick={handleBackGroundClick}           
              />
              
              {/* Fullscreen Toggle Button */}
              <button 
                onClick={toggleFullscreen}
                className="fullscreen-toggle-button"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? "⛶" : "⛶"}
              </button>
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
          background-color: ${SOLANA_COLORS.darkGray};
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
          background-color: ${SOLANA_COLORS.purple};
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
        
        /* Fullscreen Toggle Button */
        .fullscreen-toggle-button {
          position: absolute;
          bottom: 12px;
          right: 12px;
          background-color: ${SOLANA_COLORS.darkGray};
          color: white;
          border: none;
          border-radius: 4px;
          width: 32px;
          height: 32px;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          opacity: 0.7;
          transition: opacity 0.2s ease, background-color 0.2s ease;
        }
        
        .fullscreen-toggle-button:hover {
          opacity: 1;
          background-color: ${SOLANA_COLORS.purple};
          font-size: 20px;
          transition: font-size 0.1s ease;
        }
        
        /* Context Menu Styles */
        .context-menu {
          background-color: #1a1a1a;
          border: 1px solid #333;
          border-radius: 4px;
          padding: 4px 0;
          min-width: 150px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        }
        
        .context-menu-item {
          display: block;
          width: 100%;
          padding: 8px 16px;
          text-align: left;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 14px;
        }
        
        .context-menu-item:hover {
          background-color: ${SOLANA_COLORS.darkGray};
        }
        
        .context-menu-item:active {
          background-color: ${SOLANA_COLORS.purple};
        }

        /* Panel title styles */
        .panel-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 10px;
          color: white;
        }
        
        /* Custom accordion styles */
        :global(.custom-accordion) {
          border: none;
          background-color: transparent;
        }
        
        :global(.custom-accordion > div) {
          border-top: 1px solid #333; /* Dark gray line only at top */
          margin: 0 -12px; /* Extend to full width of panel */
          padding: 0 12px; /* Add padding back inside */
        }
        
        :global(.custom-accordion button) {
          padding-left: 0; /* Remove left padding from buttons */
          padding-right: 0; /* Remove right padding from buttons */
        }
        
        :global(.custom-accordion .p-6) {
          padding: 12px 0; /* Custom padding for content area */
        }
      `}</style>
    </div>
  );
}
