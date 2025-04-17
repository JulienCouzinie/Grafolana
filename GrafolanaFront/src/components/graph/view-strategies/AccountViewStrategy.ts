import { GraphData, GraphLink, ForceGraphLink, ForceGraphNode } from '@/types/graph';
import { ViewStrategy } from './ViewStrategy';
import { useMetadata } from '../../metadata/metadata-provider';
import { useUSDValue } from '../../../hooks/useUSDValue';
import { useRef, useState } from 'react';
import cloneDeep from 'lodash/cloneDeep';

import { BaseViewStrategy, SOLANA_COLORS } from './BaseViewStrategy';

class AccountViewStrategy extends BaseViewStrategy {
  
  // Assign curvature to links based on their duplication
  // and directionality (source to target or target to source)
  private assignLinkCurvature(links: ForceGraphLink[]): GraphLink[] {
    // Local interface for managing curvature calculation
    interface CurvatureInfo {
      link: GraphLink;
      isReverse: boolean;
    }
    
    const linkMap = new Map<string, CurvatureInfo[]>();
  
    // Group links by their connection (regardless of direction)
    links.forEach((link) => {
      const sourceId = link.source;
      const targetId = link.target;
      
      // Use canonical key (always smaller id first) to group related links
      const [firstId, secondId] = [sourceId, targetId].sort();
      const key = `${firstId}-${secondId}`;
      
      if (!linkMap.has(key)) {
        linkMap.set(key, []);
      }
      
      // Store the link with information about its direction
      linkMap.get(key)!.push({
        link,
        isReverse: firstId !== sourceId // Track if this is a reverse direction
      });
    });
  
    // Apply curvature based on number of links
    linkMap.forEach((duplicates) => {
      const count = duplicates.length;
      
      if (count === 1) {
        // Single link - keep straight
        duplicates[0].link.curvature = 0;
      } else if (count % 2 === 1) {
        // Odd number of links
        duplicates.forEach(({ link, isReverse }, index) => {
          if (index === 0) {
            // First link straight
            link.curvature = 0;
          } else {
            // Others alternate curve direction
            const curveIndex = Math.floor((index + 1) / 2);
            const baseDirection = index % 2 === 0 ? 1 : -1;
            // Flip direction for reverse links
            const direction = isReverse ? -baseDirection : baseDirection;
            link.curvature = 0.15 * curveIndex * direction;
          }
        });
      } else {
        // Even number of links - all curved, alternating direction
        duplicates.forEach(({ link, isReverse }, index) => {
          const curveIndex = Math.floor(index / 2) + 1;
          const baseDirection = index % 2 === 0 ? 1 : -1;
          // Flip direction for reverse links
          const direction = isReverse ? -baseDirection : baseDirection;
          link.curvature = 0.15 * curveIndex * direction;
        });
      }
    });
  
    return links;
  }

  // Aggregate accounts by address and version
  // Set the id of the node to the address of the account
  private aggregateAccounts(nodes: ForceGraphNode[]): ForceGraphNode[] {
    const seen = new Set<string>();
    const deduplicatedNodes: ForceGraphNode[] = [];

    nodes.forEach((node) => {
      if (!seen.has(node.account_vertex.address)) {
        seen.add(node.account_vertex.address);
        deduplicatedNodes.push(node);
        node.id = node.account_vertex.address;
      }
    });

    return deduplicatedNodes;

  }

  // Aggregate links that have same target and source accounts
  // Aggregate the amounts of the links
  // Keep original links in composite array
  private aggregateLinks (links: GraphLink[]): GraphLink[]  {
    const seen = new Set<string>();
    const deduplicatedLinks: GraphLink[] = [];

    links.forEach((link) => {
      const key = `${link.source_account_vertex.address}-${link.target_account_vertex.address}`;
      // Check if the link has already been seen
      if (!seen.has(key)) {
        // If not, add it to the deduplicated list
        // and mark it as seen
        seen.add(key);
        link.source = link.source_account_vertex.address;
        link.target = link.target_account_vertex.address; 
        deduplicatedLinks.push(link);
      } else {
        // If already seen, find the existing link
        // and aggregate the amounts
        const existingLink = deduplicatedLinks.find(
          (l) => l.source_account_vertex.address === link.source_account_vertex.address && l.target_account_vertex.address === link.target_account_vertex.address
        );
        // If found, aggregate the amounts
        if (existingLink) {
          // Clone the existing link to keep the original
          // in the composite array
          if (!existingLink.composite) {
            existingLink.composite = [];
            existingLink.composite.push(cloneDeep(existingLink));
          }
          // Add the new link to the composite array
          // and aggregate the amounts
          existingLink.composite.push(link);
          existingLink.amount_source += link.amount_source;
          existingLink.amount_destination += link.amount_destination;
        }
      }
    });

    return deduplicatedLinks;
  }

  processData (data: GraphData): GraphData{
    const clonedData = cloneDeep(data);
    let links = clonedData.links;
    links = this.aggregateLinks(links);
    links = this.assignLinkCurvature(links);

    const processed = {
      nodes: this.aggregateAccounts(clonedData.nodes),
      links: this.aggregateLinks(links),
      transactions: clonedData.transactions,
    };
    this.processedData.current = processed;
    return processed;
  }

  nodeTooltip (node: ForceGraphNode): string {
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
  }
}

export function useAccountViewStrategy(): ViewStrategy {
  const metadataServices = useMetadata();
  const usdServices = useUSDValue();
  const processedDataRef = useRef<GraphData>({
    nodes: [],
    links: [],
    transactions: {},
  });
  const [hoveredGroup, setHoveredGroup] = useState<number | null>(null);

  // Create and return strategy instance
  return new AccountViewStrategy(
    metadataServices,
    usdServices,
    processedDataRef,
    hoveredGroup,
    setHoveredGroup
  );
}