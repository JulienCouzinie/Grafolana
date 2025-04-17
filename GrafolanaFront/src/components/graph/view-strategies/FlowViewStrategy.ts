import { GraphData, GraphLink, ForceGraphLink, ForceGraphNode } from '@/types/graph';
import { ViewStrategy } from './ViewStrategy';
import { useMetadata } from '../../metadata/metadata-provider';
import { useUSDValue } from '../../../hooks/useUSDValue';
import { useCallback, useEffect, useRef, useState } from 'react';
import cloneDeep from 'lodash/cloneDeep';

import { BaseViewStrategy, SOLANA_COLORS } from './BaseViewStrategy';
import { LinkObject } from 'react-force-graph-2d';

class FlowViewStrategy extends BaseViewStrategy {

  private assignLinkCurvature(links: GraphLink[]): GraphLink[] {
    const linkMap = new Map<string, GraphLink[]>();

    links.forEach((link) => {
      const key = `${link.source_account_vertex.id}-${link.target_account_vertex.id}`;
      if (!linkMap.has(key)) {
        linkMap.set(key, []);
      }
      linkMap.get(key)!.push(link);
    });

    linkMap.forEach((duplicates) => {
      const count = duplicates.length;
      if (count === 1) {
        duplicates[0].curvature = 0;
      } else if (count % 2 === 1) {
        duplicates.forEach((link, index) => {
          if (index === 0) {
            link.curvature = 0;
          } else {
            const curveIndex = Math.floor(index / 2) + 1;
            link.curvature = 0.15 * curveIndex * (index % 2 === 0 ? -1 : 1);
          }
        });
      } else {
        duplicates.forEach((link, index) => {
          const curveIndex = Math.floor(index / 2) + 1;
          link.curvature = 0.15 * curveIndex * (index % 2 === 0 ? -2 : 2);
        });
      }
    });

    return links;
  }

  private assignNodesID(nodes: ForceGraphNode[]): ForceGraphNode[] {
    nodes = nodes.map((node) => {
      node.id = node.account_vertex.id;
      return node;
    });
    return nodes;
  }

  private assignLinksID(links: GraphLink[]): GraphLink[] {
    links = links.map((link) => {
      const sourceNodeID = link.source_account_vertex.id;
      const targetNodeID = link.target_account_vertex.id;
      link.source = sourceNodeID;
      link.target = targetNodeID;
      return link;
    });
    return links;
  }

  processData(data: GraphData): GraphData {
    const clonedData = cloneDeep(data);

    let links = clonedData.links;
    links = this.assignLinksID(links);
    links = this.assignLinkCurvature(links);

    const processed = {
      nodes: this.assignNodesID(clonedData.nodes),
      links: links,
      transactions: clonedData.transactions,
    };

    this.processedData.current = processed;
    return processed;
  }

  nodeTooltip(node: ForceGraphNode): string {
    const mintAddress = node.mint_address;
    const mintInfo = mintAddress ? this.getMintInfo(mintAddress) : null;
    const mintImage = mintInfo?.image ? this.getMintImage(mintInfo.image) : null;

    // Create authorities list HTML if authorities exist
    const authoritiesHtml = node.authorities && node.authorities.length > 0
      ? `
        <b>Authorities:</b><br/>
        <ul style="margin: 0; padding-left: 20px;">
          ${node.authorities.map(auth => `<li>${auth}</li>`).join('')}
        </ul>
      `
      : '';

    return `
      <div style="background: #1A1A1A; padding: 8px; border-radius: 4px; color: #FFFFFF;">
        <b>Account:</b> ${node.account_vertex.address}<br/>
        <b>Version:</b> ${node.account_vertex.version}<br/>
        ${mintAddress ? `
          <b>Mint:</b> ${mintAddress}<br/>
          ${mintInfo?.name ? `<b>Token:</b> ${mintInfo.name}<br/>` : ''}
          ${mintInfo?.symbol ? `<b>Symbol:</b> ${mintInfo.symbol}<br/>` : ''}
          ${mintImage ? `<img src="${mintImage.src}" crossorigin="anonymous" style="max-width: 50px; max-height: 50px;"><br/>` : ''}
        ` : '<b>Token:</b> SOL<br/>'}
        <b>Owner:</b> ${node.owner || 'Unknown'}<br/>
        ${authoritiesHtml}
        <b>Token Balance:</b> ${node.balance_token}<br/>
        <b>Lamport Balance:</b> ${node.balance_lamport}
      </div>
    `;
  }

  linkCanvasObject(link: ForceGraphLink, ctx: CanvasRenderingContext2D, globalScale: number): void{
    const start = link.source;
    const end = link.target;
    
    // Only proceed if we have position data
    if (typeof start === 'object' && start !== null && typeof start.x === 'number' && typeof start.y === 'number' && 
      typeof end === 'object' && end !== null && typeof end.x === 'number' && typeof end.y === 'number') {
      
        // Calculate middle point of the link
        const middleX = start.x + (end.x - start.x) / 2;
        const middleY = start.y + (end.y - start.y) / 2;

        // Adjust label position based on curvature
        const curvature = link.curvature || 0;
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const curveOffset = curvature * 17; // Adjust this value to control the offset

        const labelX = middleX + curveOffset * Math.cos(angle + Math.PI / 2);
        const labelY = middleY + curveOffset * Math.sin(angle + Math.PI / 2);

        // Set text properties
        ctx.font = `${12 / globalScale}px Sans-Serif`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';


        // Draw the text
        const label = String(link.key);
        ctx.fillText(label, labelX, labelY);
    }
  }

}

export function useFlowViewStrategy(): ViewStrategy {
  const metadataServices = useMetadata();
  const usdServices = useUSDValue();
  const processedDataRef = useRef<GraphData>({
    nodes: [],
    links: [],
    transactions: {},
  });
  const [hoveredGroup, setHoveredGroup] = useState<number | null>(null);

  // Create and return strategy instance
  return new FlowViewStrategy(
    metadataServices,
    usdServices,
    processedDataRef,
    hoveredGroup,
    setHoveredGroup
  );
}