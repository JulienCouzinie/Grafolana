import ForceGraph2D, { ForceGraphProps, NodeObject, LinkObject } from 'react-force-graph-2d';
import { GraphData, GraphNode, GraphLink, ForceGraphNode, ForceGraphLink } from '../../types/graph';



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
};

export default function NoSSRForceGraph(props: TypedForceGraphProps) {
  return <ForceGraph2D {...(props as ForceGraphProps)} />;
}

