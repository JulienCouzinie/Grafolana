import {  ForceGraphLink, ForceGraphNode, GraphData, GraphLink, GraphNode, ProcessedGraphData } from '@/types/graph';
import { LinkObject } from 'react-force-graph-2d';

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

  linkCanvasObject: (link: ForceGraphLink, ctx: CanvasRenderingContext2D, globalScale: number) => void;

  handleNodeHover: (node: ForceGraphNode | null) => void;
  handleLinkHover: (link: GraphLink | null) => void;

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
    onNodeHover?:GraphNode;
    onLinkHover?:GraphNode;
  };
}