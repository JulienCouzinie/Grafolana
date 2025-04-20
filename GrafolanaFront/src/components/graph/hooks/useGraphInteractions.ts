import { useState, useEffect, RefObject } from 'react';
import { ForceGraphNode } from '../../../types/graph';
import { ForceGraphMethods } from 'react-force-graph-2d';
import { ViewStrategy } from '../view-strategies/ViewStrategy';

// Type for the context menu state
type ContextMenuState = {
  x: number;
  y: number;
  node: ForceGraphNode | null;
  isOpen: boolean;
};

// Type for the return value of the hook
type UseGraphInteractionsReturn = {
  // Node selection
  selectedNodes: Set<string>;
  isCtrlKeyPressed: boolean;
  handleNodeClick: (node: ForceGraphNode | null) => void;
  clearSelection: () => void;
  
  // Node position fixing
  isAltKeyPressed: boolean;
  handleNodeDragEnd: (node: ForceGraphNode) => void;
  
  // Context menu
  contextMenu: ContextMenuState;
  handleNodeRightClick: (node: ForceGraphNode | null, event: MouseEvent) => void;
  handleContextMenuAction: (action: string) => void;
};

/**
 * Custom hook that consolidates all graph interaction logic:
 * - Node selection with CTRL for multi-select
 * - Node position fixing with ALT key during drag
 * - Right-click context menu for nodes
 * 
 * @param strategy The current graph visualization strategy
 * @param fgRef Reference to the ForceGraph component
 * @returns Object containing all interaction state and handlers
 */
export function useGraphInteractions(
  strategy: ViewStrategy | null,
  fgRef: RefObject<ForceGraphMethods>
): UseGraphInteractionsReturn {
  // ---------- NODE SELECTION ----------
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [isCtrlKeyPressed, setIsCtrlKeyPressed] = useState<boolean>(false);

  // ---------- NODE POSITION FIXING ----------
  const [isAltKeyPressed, setIsAltKeyPressed] = useState<boolean>(false);

  // ---------- CONTEXT MENU ----------
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    node: null,
    isOpen: false,
  });

  // Shared effect to track keyboard state (ALT and CTRL keys)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Alt') {
        setIsAltKeyPressed(true);
      }
      // Track ctrl key (use ctrlKey or metaKey for Mac compatibility)
      if (event.ctrlKey || event.metaKey) {
        setIsCtrlKeyPressed(true);
      }
    };
    
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Alt') {
        setIsAltKeyPressed(false);
      }
      // Check if ctrl key is released
      if (!event.ctrlKey && !event.metaKey) {
        setIsCtrlKeyPressed(false);
      }
    };
    
    // Add event listeners for key tracking
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', () => {
      // Reset key states when window loses focus
      setIsAltKeyPressed(false);
      setIsCtrlKeyPressed(false);
    });
    
    // Cleanup event listeners when component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', () => {
        setIsAltKeyPressed(false);
        setIsCtrlKeyPressed(false);
      });
    };
  }, []);

  // ---------- NODE SELECTION HANDLERS ----------
  
  // Handler for node click to manage selection
  const handleNodeClick = (node: ForceGraphNode | null) => {
    if (!node) return;
    
    // Get node ID for tracking in the selection set
    const nodeId = node.id!.toString();
    
    // If CTRL is pressed, toggle the clicked node in the selection
    if (isCtrlKeyPressed) {
      setSelectedNodes(currentSelected => {
        // Create a new Set to avoid mutation
        const updatedSelection = new Set(currentSelected);
        
        // Toggle the node: remove if already selected, add if not
        if (updatedSelection.has(nodeId)) {
          updatedSelection.delete(nodeId);
        } else {
          updatedSelection.add(nodeId);
        }
        
        return updatedSelection;
      });
    } else {
      // No CTRL pressed: replace selection with just this node
      // If the node is already the only selected one, deselect it
      if (selectedNodes.size === 1 && selectedNodes.has(nodeId)) {
        setSelectedNodes(new Set());
      } else {
        setSelectedNodes(new Set([nodeId]));
      }
    }
  };
  
  // Method to clear node selection
  const clearSelection = () => {
    setSelectedNodes(new Set());
  };

  // ---------- NODE POSITION FIXING HANDLERS ----------
  
  // Handler for node drag end - fixes position when ALT is pressed
  const handleNodeDragEnd = (node: ForceGraphNode) => {
    if (isAltKeyPressed && node) {
      // Fix node position by setting fx and fy to the current position
      node.fx = node.x;
      node.fy = node.y;
      
      // Provide user feedback (optional)
      console.log(`Node ${node.id} position fixed at x:${node.x}, y:${node.y}`);
      
      // Force a refresh of the graph to reflect changes
      if (fgRef.current) {
        fgRef.current.d3ReheatSimulation();
      }
    }
  };

  // ---------- CONTEXT MENU HANDLERS ----------
  
  // Handler for right-click on node
  const handleNodeRightClick = (node: ForceGraphNode | null, event: MouseEvent) => {
    // Prevent the default context menu
    event.preventDefault();
    
    if (node) {
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        node,
        isOpen: true,
      });
    } else {
      // Close the context menu when clicking elsewhere
      setContextMenu(prev => ({ ...prev, isOpen: false }));
    }
  };
  
  // Handler for context menu item click
  const handleContextMenuAction = (action: string) => {
    if (strategy && contextMenu.node) {
      strategy.handleNodeContextMenu(contextMenu.node, action);
    }
    
    // Close the context menu after action
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  };
  
  // Effect to close context menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setContextMenu(prev => ({ ...prev, isOpen: false }));
    };
    
    if (contextMenu.isOpen) {
      document.addEventListener('click', handleOutsideClick);
    }
    
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [contextMenu.isOpen]);

  // Effect to update strategy with selected nodes
  useEffect(() => {
    if (strategy) {
      strategy.selectedNodes = selectedNodes;
    }
  }, [strategy, selectedNodes]);

  return {
    // Node selection
    selectedNodes,
    isCtrlKeyPressed,
    handleNodeClick,
    clearSelection,
    
    // Node position fixing
    isAltKeyPressed,
    handleNodeDragEnd,
    
    // Context menu
    contextMenu,
    handleNodeRightClick,
    handleContextMenuAction,
  };
}