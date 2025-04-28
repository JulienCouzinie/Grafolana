import { useState, useEffect, RefObject, useCallback } from 'react';
import { ForceGraphLink, ForceGraphNode } from '../../../types/graph';
import { ForceGraphMethods } from 'react-force-graph-2d';
import { ViewStrategy } from '../view-strategies/ViewStrategy';
import { useLabelEditDialog } from '@/components/metadata/label-edit-dialog-provider';
import { AddressType } from '@/types/metadata';
import { useMetadata } from '@/components/metadata/metadata-provider';

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
  nodeSelectionUpdate: number;
  linkSelectionUpdate: number;
  handleNodeClick: (node: ForceGraphNode | null) => void;
  handleLinkClick: (link: ForceGraphLink | null) => void;

  handleNodeDragEnd: (node: ForceGraphNode) => void;
  
  // Context menu
  contextMenu: ContextMenuState;
  handleNodeRightClick: (node: ForceGraphNode | null, event: MouseEvent) => void;
  handleContextMenuAction: (action: string) => void;
  handleBackGroundClick: (event: MouseEvent) => void;
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
  fgRef: RefObject<ForceGraphMethods<{}, {}> | null>
): UseGraphInteractionsReturn {
  // ---------- NODE SELECTION ----------
  const [nodeSelectionUpdate, setNodeSelectionUpdate] = useState<number>(0);
  const [linkSelectionUpdate, setLinkSelectionUpdate] = useState<number>(0);
  const [isCtrlKeyPressed, setIsCtrlKeyPressed] = useState<boolean>(false);

  // ---------- NODE POSITION FIXING ----------
  const [isAltKeyPressed, setIsAltKeyPressed] = useState<boolean>(false);
  const [isShiftKeyPressed, setIsShiftKeyPressed] = useState<boolean>(false);

  // ---------- CONTEXT MENU ----------
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    node: null,
    isOpen: false,
  });

  const { openLabelEditor } = useLabelEditDialog();
  const { getLabelComputed } = useMetadata();

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

      if (event.shiftKey) {
        setIsShiftKeyPressed(true);
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
      // Check if ctrl key is released
      if (!event.shiftKey) {
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
    // Get node ID for tracking in the selection set
    const nodeId = node!.id!.toString();
    
    // If CTRL is pressed, toggle the clicked node in the selection
    if (isCtrlKeyPressed) {
        // Toggle the node: remove if already selected, add if not
        if (strategy?.selectedNodes.current.has(nodeId)) {
          strategy?.selectedNodes.current.delete(nodeId);
        } else {
          strategy?.selectedNodes.current.add(nodeId);
        }
        
    } else {
      // No CTRL pressed: replace selection with just this node
      // If the node is already the only selected one, deselect it
      if (strategy?.selectedNodes.current.size === 1 && strategy?.selectedNodes.current.has(nodeId)) {
        strategy!.selectedNodes.current = new Set();
      } else {
        strategy!.selectedNodes.current = new Set([nodeId]);
      }
    }

    setNodeSelectionUpdate(prev => prev + 1); // Trigger re-render
  };

  // Handler for background click to clear selection
  const handleBackGroundClick = (event: MouseEvent) => {
    if (strategy!.selectedNodes.current.size > 0) {
      strategy!.selectedNodes.current = new Set(); // Clear selection
      setNodeSelectionUpdate(prev => prev + 1); // Trigger re-render
    }
    if (strategy!.selectedLinks.current.size > 0) {
      strategy!.selectedLinks.current = new Set(); // Clear selection
      setLinkSelectionUpdate(prev => prev + 1); // Trigger re-render
    }
  }
  


  // ---------- NODE POSITION FIXING HANDLERS ----------
  
  // Handler for node drag end - fixes position when ALT is pressed
  const handleNodeDragEnd = (node: ForceGraphNode) => {
    if (isAltKeyPressed && node) {
      // Fix node position by setting fx and fy to the current position
      node.fx = node.x;
      node.fy = node.y;
      
      // Provide user feedback (optional)
      // console.log(`Node ${node.id} position fixed at x:${node.x}, y:${node.y}`);
      
      // Force a refresh of the graph to reflect changes
      if (fgRef?.current) {
        fgRef.current.d3ReheatSimulation();
      }
    }
  };

  // ---------- LINK SELECTION HANDLERS ----------

  // Handler for link click to manage selection
  const handleLinkClick = (link: ForceGraphLink | null) => {
    // Get link ID for tracking in the selection set
    const linkId = link!.id!.toString();
    
    // If CTRL is pressed, toggle the clicked link in the selection
    if (isCtrlKeyPressed) {
        // Toggle the link: remove if already selected, add if not
        if (strategy?.selectedLinks.current.has(linkId)) {
          strategy?.selectedLinks.current.delete(linkId);
        } else {
          strategy?.selectedLinks.current.add(linkId);
        }
        
    } else {
      // No CTRL pressed: replace selection with just this link
      // If the link is already the only selected one, deselect it
      if (strategy?.selectedLinks.current.size === 1 && strategy?.selectedLinks.current.has(linkId)) {
        strategy!.selectedLinks.current = new Set();
      } else {
        strategy!.selectedLinks.current = new Set([linkId]);
      }
    }

    setLinkSelectionUpdate(prev => prev + 1); // Trigger re-render
  }

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
  const handleContextMenuAction = useCallback((action: string) => {
    if (contextMenu.node) {
      if (action === "rename_account") {
        // Determine address type based on node type
        let addressType = AddressType.UNKNOWN;
        
        // Get current label and description from metadata service
        const currentLabel = getLabelComputed(contextMenu.node.account_vertex.address, addressType);
        
        // Open the label editor dialog
        openLabelEditor({
          address: contextMenu.node.account_vertex.address,
          initialLabel: currentLabel.label || "",
          initialDescription: currentLabel.description || "",
          type: addressType,
          onSaveSuccess: (label: string, description: string) => {
            // The metadata provider will automatically update all components 
            // that use this address's label information
          }
        });
      } else {
        // For all other actions, use the strategy's handler
        strategy!.handleNodeContextMenu(contextMenu.node, action);
      }
      // Clear context menu after action
      setContextMenu({ isOpen: false, x: 0, y: 0, node: null });
    }
  }, [contextMenu, strategy, openLabelEditor, getLabelComputed]);
  
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


  return {
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
  };
}