import React from 'react';
import { ForceGraphNode } from '@/types/graph';
import { useMetadata } from '@/components/metadata/metadata-provider';

interface NodeImageProps {
  node: ForceGraphNode;
  maxWidth?: number;
  maxHeight?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Component to display a node's image with automatic updates when metadata changes
 * (e.g., when a node is marked as spam)
 */
export const NodeImage: React.FC<NodeImageProps> = ({
  node,
  maxWidth = 50,
  maxHeight = 50,
  className,
  style,
}) => {
  const { getGraphicByNode } = useMetadata();

  // Get the image based on current state
  const graphic = getGraphicByNode(node);
  
  if (!graphic.image) return null;
  
  return (
    <img 
      src={graphic.image.src} 
      crossOrigin="anonymous" 
      style={{ maxWidth, maxHeight, ...style}}
      className={className}
      alt={node.type}
    />
  );
};