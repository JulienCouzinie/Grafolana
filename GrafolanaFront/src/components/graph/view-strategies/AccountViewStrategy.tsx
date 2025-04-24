import React, { Ref } from 'react';
import { GraphData, GraphLink, ForceGraphLink, ForceGraphNode, AccountType, TransactionData } from '@/types/graph';
import { ContextMenuItem, ViewStrategy } from './ViewStrategy';
import { useMetadata } from '../../metadata/metadata-provider';
import { useUSDValue } from '../../../hooks/useUSDValue';
import { useRef, useState } from 'react';
import cloneDeep from 'lodash/cloneDeep';

import { BaseViewStrategy, SOLANA_COLORS } from './BaseViewStrategy';
import { AddressType } from '@/types/metadata';

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
        node.id = node.account_vertex.address;
        deduplicatedNodes.push(node);
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

  initializeGraphData(data: GraphData, setGraphData: React.Dispatch<React.SetStateAction<GraphData>>): void {
    this.setReprocessCallback((dataToProcess: GraphData) => this.processGraphData(dataToProcess, setGraphData));

    this.setupGraphData(data);
  }
  
  processGraphData(data: GraphData, setGraphData: React.Dispatch<React.SetStateAction<GraphData>>): void {
    let links = data.links;
    links = this.aggregateLinks(links);
    links = this.assignLinkCurvature(links);

    let nodes = this.aggregateAccounts(data.nodes);
    let transactions = data.transactions;

    this.processedData.current.nodes = nodes;
    this.processedData.current.links = links;
    this.processedData.current.transactions = transactions;

    setGraphData(prevData => ({
      nodes: [...nodes],
      links: [...links],
      transactions: {...transactions}
    }));
  }

  nodeTooltip (node: ForceGraphNode): string {
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
        ${mintAddress ? `
          <b>Mint:</b> ${mintAddress}<br/>
          ${mintInfo?.name ? `<b>Token:</b> ${mintInfo.name}<br/>` : ''}
          ${mintInfo?.symbol ? `<b>Symbol:</b> ${mintInfo.symbol}<br/>` : ''}
          ${mintImage ? `<img src="${mintImage.src}" crossorigin="anonymous" style="max-width: 50px; max-height: 50px;"><br/>` : ''}
        ` : '<b>Token:</b> SOL<br/>'}
        <b>Owner:</b> ${node.owner? this.metadataServices.getLabelComputed(node.owner).label : 'Unknown'}<br/>
        ${authoritiesHtml}
        <b>Token Balance:</b> ${node.balance_token}<br/>
        <b>Lamport Balance:</b> ${node.balance_lamport}
      </div>
    `;
  }

  linkCanvasObject(link: ForceGraphLink, ctx: CanvasRenderingContext2D, globalScale: number): void{
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
        <b>Program:</b> ${this.metadataServices.getLabelComputed(link.program_address, AddressType.PROGRAM).label}<br/>
        <b>From:</b> ${this.metadataServices.getLabelComputed(link.source_account_vertex.address).label}<br/>
        <b>To:</b> ${this.metadataServices.getLabelComputed(link.target_account_vertex.address).label}<br/>
        ${amountLine}
        ${compositesHtml}
    </div>
    `;
  }

  // Override to provide account-specific context menu items
  getNodeContextMenuItems(node: ForceGraphNode): ContextMenuItem[] {
    const baseItems = super.getNodeContextMenuItems(node);
    
    // Add account-specific items
    return [
        ...baseItems,
        {
            label: "View Transactions",
            action: "view_transactions"
        },
        {
            label: "Explore Related Accounts",
            action: "explore_related"
        }
    ];
  }
  
  // Override to handle account-specific context menu actions
  handleNodeContextMenu(node: ForceGraphNode, action: string): void {
    switch(action) {
        case "view_transactions":
            // Handle viewing transactions for this account
            console.log("View transactions for account:", node.account_vertex.address);
            break;
        case "explore_related":
            // Handle exploring related accounts
            console.log("Explore related accounts for:", node.account_vertex.address);
            break;
        default:
            // Fall back to base implementation for common actions
            super.handleNodeContextMenu(node, action);
    }
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
  const originalDataRef = useRef<GraphData>({
    nodes: [],
    links: [],
    transactions: {},
  });

  const selectedNodes = useRef<Set<string>>(new Set<string>());

  // Create and return strategy instance
  return new AccountViewStrategy(
    metadataServices,
    usdServices,
    processedDataRef,
    originalDataRef,
    selectedNodes
  );
}

function setGraphData(arg0: (prevData: any) => { nodes: ForceGraphNode[]; links: ForceGraphLink[]; transactions: { [x: string]: TransactionData; }; }) {
  throw new Error('Function not implemented.');
}
