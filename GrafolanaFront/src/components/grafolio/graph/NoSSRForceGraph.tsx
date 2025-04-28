import ForceGraph2D, { ForceGraphProps, NodeObject, LinkObject, ForceGraphMethods } from 'react-force-graph-2d';
import { GraphData, GraphNode, GraphLink, ForceGraphNode, ForceGraphLink } from '@/types/graph';
import { ForwardedRef, forwardRef } from 'react';

/**
 * TypedForceGraphProps defines custom prop types for our NoSSRForceGraph component.
 * 
 * How this works:
 * 1. We start with the standard ForceGraphProps from the react-force-graph-2d library
 * 2. We use Omit<> to remove the props that need custom typing for our application
 * 3. We then add back those same props with our domain-specific types
 * 
 * This ensures that when TransactionGraph passes props to NoSSRForceGraph:
 * - The props maintain type safety with our domain models (ForceGraphNode, ForceGraphLink)
 * - TypeScript correctly validates that node and link handlers receive the right types
 * - We preserve all the other standard props from the ForceGraph2D component
 */
type TypedForceGraphProps = Omit<
  ForceGraphProps,
  | 'nodeCanvasObject'
  | 'nodeLabel'
  | 'linkWidth'
  | 'linkColor'
  | 'linkCurvature'
  | 'onNodeHover'
  | 'onLinkHover'
  | 'linkLabel'
  | 'linkLineDash'
  | 'linkDirectionalArrowLength'
  | 'linkDirectionalArrowColor'
  | 'linkCanvasObject'
  | 'onNodeRightClick'
  | 'ref'
  | 'onNodeDragEnd'
  | 'onNodeClick'
  | 'onLinkClick'
> & {
  nodeCanvasObject: (node: ForceGraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => void;
  nodeLabel: (node: ForceGraphNode) => string;
  linkWidth: (link: ForceGraphLink) => number;
  linkColor: (link: ForceGraphLink) => string;
  linkCurvature: (link: ForceGraphLink) => number;
  linkLabel: (link: ForceGraphLink) => string;
  linkLineDash: (link: ForceGraphLink) => number[];
  linkDirectionalArrowLength: (link: ForceGraphLink) => number;
  linkDirectionalArrowColor: (link: ForceGraphLink) => string;
  linkCanvasObject: (node: ForceGraphLink, ctx: CanvasRenderingContext2D, globalScale: number) => void;
  onNodeHover?: (node: ForceGraphNode | null, previousNode: ForceGraphNode | null) => void;
  onLinkHover?: (link: ForceGraphLink | null, previousLink: ForceGraphLink | null) => void;
  onNodeRightClick?: (node: ForceGraphNode, event: MouseEvent) => void;
  onNodeDragEnd?: (node: ForceGraphNode) => void;
  onNodeClick?: (node: ForceGraphNode | null) => void;
  onLinkClick?: (link: ForceGraphLink | null) => void;
  ref?: ForwardedRef<ForceGraphMethods>;
};

/**
 * NoSSRForceGraph is a wrapper for ForceGraph2D that provides:
 * 1. Type safety for our domain-specific graph data
 * 2. Client-side only rendering (via dynamic import in TransactionGraph)
 * 
 * Props flow:
 * TransactionGraph → NoSSRForceGraph → ForceGraph2D
 * 
 * The props passed from TransactionGraph include:
 * - graphData: The nodes and links data structure
 * - nodeCanvasObject: Function to render each node (from strategy)
 * - nodeLabel: Function to generate tooltips (from strategy)
 * - link styling functions: width, color, curvature, etc. (from strategy)
 * - Event handlers: onNodeHover, onLinkHover, etc. (from strategy)
 * 
 * The component passes all props through to ForceGraph2D with a type cast
 * to satisfy TypeScript, since our domain types are compatible but not
 * identical to what ForceGraph2D expects.
 */
export default function NoSSRForceGraph(props: TypedForceGraphProps) {
  return <ForceGraph2D {...(props as ForceGraphProps)} />;
}
