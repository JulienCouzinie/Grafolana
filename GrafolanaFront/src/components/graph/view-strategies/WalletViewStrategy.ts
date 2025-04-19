import { GraphData, GraphLink, ForceGraphLink, ForceGraphNode, AccountType, AccountVertex, GraphNode, TransferType} from '@/types/graph';
import { ViewStrategy } from './ViewStrategy';
import { useMetadata } from '../../metadata/metadata-provider';
import { useUSDValue } from '../../../hooks/useUSDValue';
import { useRef, useState } from 'react';
import cloneDeep from 'lodash/cloneDeep';

import { BaseViewStrategy, SOLANA_COLORS } from './BaseViewStrategy';


class WalletViewStrategy extends BaseViewStrategy {
  
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

  private getWalletAddress(node: ForceGraphNode): string {
    let address;
    
    if (node.type==AccountType.SOL_ACCOUNT) {
      address = node.account_vertex.address;
    } else {
      address = node.owner || node.account_vertex.address;
    }
    return address;
  }

  // Aggregate accounts by wallet 
  // SOL accounts are aggregated by their address
  // Token accounts are aggregated by their wallet owner
  // if the owner is not present, the address is used
  private aggregateAccounts(nodes: ForceGraphNode[]): ForceGraphNode[] {
    const seen = new Map<string, ForceGraphNode>();
    
    nodes.forEach((node) => {
      let address = this.getWalletAddress(node);
      if (!seen.has(address)) {
        // Create new node of type WALLET_ACCOUNT
        let aggregatedNode: ForceGraphNode = {
          id: address,
          type: AccountType.WALLET_ACCOUNT,
          account_vertex: new AccountVertex(
            address, 
            0, 
            ''
          ),
          mint_address: "SOL",
          is_pool: false,
          owner: null,
          authorities: [],
          balance_token: 0, 
          balance_lamport:0, 
          composite: null
        };
        
        // If the node is not a SOL account, add it to the composite array
        if (node.type !== AccountType.SOL_ACCOUNT) {
          aggregatedNode.composite = [node];
        }

        seen.set(address, aggregatedNode);
      } else {
        if (node.type !== AccountType.SOL_ACCOUNT) {
          const existingNode = seen.get(address)!;
          if (!existingNode.composite) {
            existingNode.composite = [];
          }
          // Add the node to the composite array of the existing node
          existingNode.composite.push(node);}
      }
    });

    // Convert map values to array
    const deduplicatedNodes = Array.from(seen.values());

    return deduplicatedNodes;
  }


  // Aggregate links that have same target and source accounts
  // Aggregate the amounts of the links
  // Keep original links in composite array
  private aggregateLinks (clonedData: GraphData): GraphLink[]  {
    const links = clonedData.links;
    const nodes = clonedData.nodes;
    const seen = new Map<string,GraphLink>();


    links.forEach((link) => {
      let source_node = this.getForceGraphNodebyAccountVertex(nodes, link.source_account_vertex);
      let target_node = this.getForceGraphNodebyAccountVertex(nodes, link.target_account_vertex);
      
      let source_address = this.getWalletAddress(source_node!);
      let target_address = this.getWalletAddress(target_node!);
      const key = `${source_address}-${target_address}`;
      // Check if the link has already been seen
      if (!seen.has(key)) {

        // Create new WALLET_TO_WALLET link
        let aggregatedlink: ForceGraphLink = {
          key: 0,
          transaction_signature: '',
          program_address: '',
          source: source_address,
          target: target_address,
          source_account_vertex: link.source_account_vertex,
          target_account_vertex: link.target_account_vertex,
          amount_source: 0,
          amount_destination: 0,
          type: TransferType.WALLET_TO_WALLET,
          composite: [],
        };

        aggregatedlink.composite = [link];

        seen.set(key, aggregatedlink);
      } else {
        
        seen.get(key)!.composite!.push(link);
      }
    });

    // Convert map values to array
    const deduplicatedLinks = Array.from(seen.values());

    return deduplicatedLinks;
  }

  processData (data: GraphData): GraphData{
    this.originalData = data;
    const clonedData = cloneDeep(data);
    let nodes = this.aggregateAccounts(clonedData.nodes);

    let links = this.aggregateLinks(clonedData);
    links = this.assignLinkCurvature(links);

    const processed = {
      nodes: nodes,
      links: links,
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

    // Create composite list HTML if composite exists
    const compositeHtml = node.composite && node.composite.length > 0
      ? `
        <b>Composite:</b><br/>
        <ul style="margin: 0; padding-left: 20px;">
          ${node.composite.map(comp => {
            // Get mint info and image for composite account
            const compMintAddress = comp.mint_address;
            const compMintInfo = compMintAddress ? this.getMintInfo(compMintAddress) : null;
            const compMintImage = compMintInfo?.image ? this.getMintImage(compMintInfo.image) : null;
            
            return `<li>
              ${compMintImage ? `<img src="${compMintImage.src}" crossorigin="anonymous" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 5px; display: inline-block;">` : ''}
              ${compMintInfo?.symbol ? `${compMintInfo.symbol}: ` : ''}
              ${comp.account_vertex.address}
            </li>`;
          }).join('')}
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
        ${compositeHtml}

      </div>
    `;
  }

  linkCanvasObject(link: ForceGraphLink, ctx: CanvasRenderingContext2D, globalScale: number): void{
  }

  linkTooltip(link: ForceGraphLink): string {
    const sourceNode = this.processedData.current.nodes.find(n => n.account_vertex.address === link.source_account_vertex.address);
    const destinationNode = this.processedData.current.nodes.find(n => n.account_vertex.address === link.target_account_vertex.address);
    const imageUrl = '/logo/wallettowallet.png';

    

    // Format composite links if they exist
    const compositesHtml = link.composite 
    ? `<br/><b>Composites:</b><ul style="margin: 4px 0; padding-left: 20px;">
        ${link.composite.map(compLink => {
            // Get source and destination nodes for composite link
            const compLinkSourceNode = this.originalData!.nodes.find(n => n.account_vertex.address === compLink.source_account_vertex.address);
            const compLinkDestinationNode = this.originalData!.nodes.find(n => n.account_vertex.address === compLink.target_account_vertex.address);


            const compSource = this.getAmountDetails(
            compLink, 
            this.getMintInfo(compLinkSourceNode!.mint_address!));
            const compDest = this.getAmountDetails(
            compLink,
            this.getMintInfo(compLinkDestinationNode!.mint_address!),
            true
            );

            // Calculate USD values for the composite link specifically
            const compSourceUSD = compLinkSourceNode ? this.calculateUSDValue(
                compLink.amount_source, 
                compLinkSourceNode.mint_address, 
                this.processedData.current.transactions[compLink.transaction_signature].mint_usd_price_ratio
            ) : 'N/A';
            const compDestUSD = compLinkDestinationNode ? this.calculateUSDValue(
                compLink.amount_destination, 
                compLinkDestinationNode.mint_address, 
                this.processedData.current.transactions[compLink.transaction_signature].mint_usd_price_ratio
            ) : 'N/A';

            console.log("compLink.type", compLink.type);
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
        <b>Program:</b> ${this.getLabelComputed(link.program_address, 'program', true).label}<br/>
        <b>From:</b> ${link.source_account_vertex.address}<br/>
        <b>To:</b> ${link.target_account_vertex.address}<br/>
        ${compositesHtml}
    </div>
    `;
  }
}

export function useWalletViewStrategy(): ViewStrategy {
  const metadataServices = useMetadata();
  const usdServices = useUSDValue();
  const processedDataRef = useRef<GraphData>({
    nodes: [],
    links: [],
    transactions: {},
  });
  const [hoveredGroup, setHoveredGroup] = useState<number | null>(null);

  // Create and return strategy instance
  return new WalletViewStrategy(
    metadataServices,
    usdServices,
    processedDataRef,
    hoveredGroup,
    setHoveredGroup
  );
}