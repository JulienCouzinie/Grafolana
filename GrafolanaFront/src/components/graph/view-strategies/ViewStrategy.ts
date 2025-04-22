import { ForceGraphLink, ForceGraphNode, GraphData, GraphLink, GraphNode } from '@/types/graph';
import { LinkObject } from 'react-force-graph-2d';
import { Ref, RefObject } from 'react';

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
  handleNodeHover(node: ForceGraphNode | null): boolean;

  /**
   * Handle link hover events
   */
  handleLinkHover(link: ForceGraphLink | null): boolean;

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

  hoveredNode: ForceGraphNode | null;
  hoveredLink: ForceGraphLink | null;

  /**
   * Reference to the currently selected nodes set
   * Uses React.Ref to allow mutations to the current value
   */
  selectedNodes: RefObject<Set<string>>;

  /**
   * Returns the content to be displayed in the Filters accordion section
   * @returns React node with filter controls specific to this strategy
   */
  getFiltersContent(): React.ReactNode;

  /**
   * Returns the content to be displayed in the Grouping accordion section
   * @returns React node with grouping controls specific to this strategy
   */
  getGroupingContent(): React.ReactNode;

  /**
   * Returns the content to be displayed in the Contextual Info accordion section
   * @returns React node with contextual information specific to this strategy
   */
  getContextualInfoContent(): React.ReactNode;
}