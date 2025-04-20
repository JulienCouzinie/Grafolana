import {  ForceGraphLink, ForceGraphNode, GraphData, GraphLink, GraphNode, ProcessedGraphData } from '@/types/graph';
import { LinkObject } from 'react-force-graph-2d';

export interface ContextMenuItem {
  label: string;
  action: string;
}

export interface ViewStrategy {
  /**
   * Transform input data into the view-specific format
   */
  processData: (data: GraphData) => GraphData;

  /**
   * Define how nodes should be rendered
   */
  nodeCanvasObject: (node: ForceGraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => void;

  /**
   * Generate node tooltip HTML
   */
  nodeTooltip: (node: ForceGraphNode) => string;

  /**
   * Generate link tooltip HTML
   */
  linkTooltip: (link: ForceGraphLink) => string;

  /**
   * Custom rendering for links
   */
  linkCanvasObject: (link: ForceGraphLink, ctx: CanvasRenderingContext2D, globalScale: number) => void;

  /**
   * Handle node hover events
   */
  handleNodeHover: (node: ForceGraphNode | null) => void;
  
  /**
   * Handle link hover events
   */
  handleLinkHover: (link: GraphLink | null) => void;

  /**
   * Get context menu items for a node
   */
  getNodeContextMenuItems: (node: ForceGraphNode) => ContextMenuItem[];
  
  /**
   * Handle context menu actions
   */
  handleNodeContextMenu: (node: ForceGraphNode, action: string) => void;

  /**
   * Style-related props for links
   */
  getLinkStyle: (link: ForceGraphLink) => {
    width: number;
    color: string;
    curvature?: number;
    lineDash?: number[];
    arrowLength?: number;
    arrowColor?: string;
    onNodeHover?: GraphNode;
    onLinkHover?: GraphNode;
  };
}