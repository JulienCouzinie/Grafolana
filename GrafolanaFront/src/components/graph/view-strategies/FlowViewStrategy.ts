import { GraphData, GraphLink, ForceGraphLink, ForceGraphNode } from '@/types/graph';
import { ViewStrategy } from './ViewStrategy';
import { useMetadata } from '../../metadata/metadata-provider';
import { useUSDValue } from '../../../hooks/useUSDValue';
import { useCallback, useEffect, useRef, useState } from 'react';
import cloneDeep from 'lodash/cloneDeep';

import { BaseViewStrategy, SOLANA_COLORS } from './BaseViewStrategy';


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
    this.originalData.current = data;
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
    const mintInfo = mintAddress ? this.metadataServices.getMintInfo(mintAddress) : null;
    const mintImage = mintInfo?.image ? this.metadataServices.getMintImage(mintInfo.image) : null;

    // Create authorities list HTML if authorities exist
    const authoritiesHtml = node.authorities && node.authorities.length > 0
      ? `
        <b>Authorities:</b><br/>
        <ul style="margin: 0; padding-left: 20px;">
          ${node.authorities.map(auth => `<li>${this.metadataServices.getLabelComputed(auth).label}</li>`).join('')}
        </ul>
      `
      : '';

    return `
      <div style="background: #1A1A1A; padding: 8px; border-radius: 4px; color: #FFFFFF;">
        <b>Account:</b> ${this.metadataServices.getLabelComputed(node.account_vertex.address).label}<br/>
        <b>Version:</b> ${node.account_vertex.version}<br/>
        ${mintAddress ? `
          <b>Mint:</b> ${mintAddress}<br/>
          ${mintInfo?.name ? `<b>Token:</b> ${mintInfo.name}<br/>` : ''}
          ${mintInfo?.symbol ? `<b>Symbol:</b> ${mintInfo.symbol}<br/>` : ''}
          ${mintImage ? `<img src="${mintImage.src}" crossorigin="anonymous" style="max-width: 50px; max-height: 50px;"><br/>` : ''}
        ` : '<b>Token:</b> SOL<br/>'}
        <b>Owner:</b> ${node.owner ? this.metadataServices.getLabelComputed(node.owner).label : 'Unknown'}<br/>
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

  linkTooltip(link: ForceGraphLink): string {
    const sourceNode = this.processedData.current.nodes.find(n => n.account_vertex.address === link.source_account_vertex.address);
    const destinationNode = this.processedData.current.nodes.find(n => n.account_vertex.address === link.target_account_vertex.address);
    const imageUrl = this.metadataServices.getProgramInfo(link.program_address)?.icon;

    // Calculate USD values and get mint info
    const sourceUSD = sourceNode ? this.usdServices.calculateUSDValue(
        link.amount_source, 
        sourceNode.mint_address, 
        this.processedData.current.transactions[link.transaction_signature].mint_usd_price_ratio
    ) : 'N/A';
    const destinationUSD = destinationNode ? this.usdServices.calculateUSDValue(
        link.amount_destination, 
        destinationNode.mint_address, 
        this.processedData.current.transactions[link.transaction_signature].mint_usd_price_ratio
    ) : 'N/A';

    const mintSource = this.metadataServices.getMintInfo(sourceNode?.mint_address!);
    const mintDestination = this.metadataServices.getMintInfo(destinationNode?.mint_address!);

    // Get formatted amounts for source and destination
    const source = this.getAmountDetails(link, mintSource);
    const destination = this.getAmountDetails(link, mintDestination, true);

    // Format the amount line based on link type
    const amountLine = link.type === 'SWAP' 
    ? (() => {
        // Find the swap details
        const swapDetails = this.processedData.current.transactions[link.transaction_signature].swaps.find(s => s.id === link.swap_id);
        let feeAmount = null;
        let feeUSD = 'N/A';
        
        if (swapDetails?.fee) {
            // Format fee using destination mint decimals
            const formattedFee = this.calculateTokenAmount(swapDetails.fee, mintDestination);
            feeAmount = formattedFee + " " + mintDestination?.symbol;
            feeUSD = destinationNode ? this.usdServices.calculateUSDValue(
                swapDetails.fee,
                destinationNode.mint_address,
                this.processedData.current.transactions[link.transaction_signature].mint_usd_price_ratio
            ) : 'N/A';
        }

        return this.formatSwapAmount(
            source.amountString, source.imageHTML, sourceUSD,
            destination.amountString, destination.imageHTML, destinationUSD,
            feeAmount, feeUSD
        );
    })()
    : this.formatNormalAmount(source.amountString, source.imageHTML, sourceUSD);

    // Format composite links if they exist
    const compositesHtml = link.composite 
    ? `<br/><b>Composites:</b><ul style="margin: 4px 0; padding-left: 20px;">
        ${link.composite.map(compLink => {
            const compSource = this.getAmountDetails(
            compLink, 
            this.metadataServices.getMintInfo(sourceNode?.mint_address!));
            const compDest = this.getAmountDetails(
            compLink,
            this.metadataServices.getMintInfo(destinationNode?.mint_address!),
            true
            );

            // Calculate USD values for the composite link specifically
            const compSourceUSD = sourceNode ? this.usdServices.calculateUSDValue(
                compLink.amount_source, 
                sourceNode.mint_address, 
                this.processedData.current.transactions[compLink.transaction_signature].mint_usd_price_ratio
            ) : 'N/A';
            const compDestUSD = destinationNode ? this.usdServices.calculateUSDValue(
                compLink.amount_destination, 
                destinationNode.mint_address, 
                this.processedData.current.transactions[compLink.transaction_signature].mint_usd_price_ratio
            ) : 'N/A';

            return `<li>${
            compLink.type === 'SWAP'
                ? this.formatSwapAmount(
                    compSource.amountString, compSource.imageHTML, compSourceUSD,
                    compDest.amountString, compDest.imageHTML, compDestUSD
                )
                : this.formatNormalAmount(compSource.amountString, compSource.imageHTML, compSourceUSD)
            }</li>`;
        }).join('')}
        </ul>`
    : '';

    return `
    <div style="display: inline-block; background: #1A1A1A; padding: 14px; border-radius: 4px; color: #FFFFFF; min-width: fit-content">
        <b>Type:</b> ${link.type}<br/>
        ${imageUrl ? `<img src="${imageUrl}" crossorigin="anonymous" style="max-width: 50px; max-height: 50px;"><br/>` : ''}
        <b>Program:</b> ${this.metadataServices.getLabelComputed(link.program_address, 'program', true).label}<br/>
        <b>From:</b> ${this.metadataServices.getLabelComputed(link.source_account_vertex.address).label}<br/>
        <b>To:</b> ${this.metadataServices.getLabelComputed(link.target_account_vertex.address).label}<br/>
        ${amountLine}
        ${compositesHtml}
    </div>
    `;
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
  const originalDataRef = useRef<GraphData>({
    nodes: [],
    links: [],
    transactions: {},
  });

  // Create and return strategy instance
  return new FlowViewStrategy(
    metadataServices,
    usdServices,
    processedDataRef,
    originalDataRef
  );
}