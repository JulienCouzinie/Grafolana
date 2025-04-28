import React, { Ref } from 'react';
import { GraphData, GraphLink, ForceGraphLink, ForceGraphNode, AccountType, TransactionData, TransferType } from '@/types/graph';
import { ContextMenuItem, ViewStrategy } from './ViewStrategy';
import { useMetadata } from '@/components/metadata/metadata-provider';
import { useUSDValue } from '@/hooks/useUSDValue';
import { useRef, useState } from 'react';
import cloneDeep from 'lodash/cloneDeep';

import { BaseViewStrategy, SOLANA_COLORS } from './BaseViewStrategy';
import { AddressType } from '@/types/metadata';
import { AddressLabel } from '@/components/metadata/address-label';

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
        link.id = key;

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
    const nodeImage = this.metadataServices.getGraphicByNode(node).image;

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
        <b>Type:</b> ${node.type}<br/>
        ${nodeImage ? `<img src="${nodeImage.src}" crossorigin="anonymous" style="max-width: 50px; max-height: 50px;"><br/>` : ''}
        <b>Account:</b> ${this.metadataServices.getLabelComputed(node.account_vertex.address).label}<br/>
        ${mintAddress ? `
          <b>Mint:</b> ${mintAddress}<br/>
          ${mintInfo?.name ? `<b>Token:</b> ${mintInfo.name}<br/>` : ''}
          ${mintInfo?.symbol ? `<b>Symbol:</b> ${mintInfo.symbol}<br/>` : ''}
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
    const imageUrl = this.metadataServices.getProgramInfo(link.program_address)?.icon;

    const transferDetailsHTML = this.getTransferDetailsHTML(link);

    // Format composite links if they exist
    const compositesHtml = link.composite 
    ? `<br/><b>Composites:</b><ul style="margin: 4px 0; padding-left: 20px;">
        ${link.composite.map(compLink => {
          const compositeTransferDetailsHTML = this.getTransferDetailsHTML(compLink);
            return `<li>${compositeTransferDetailsHTML}</li>`;
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
        ${transferDetailsHTML}
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

  /**
   * Returns content for the Nodes Info accordion section with Flow view specific information
   * Extends the base implementation with flow-specific details
   */
  getNodesInfoContent(): React.ReactNode {
    
    if(this.selectedNodes.current && this.selectedNodes.current.size > 0) {
      // fill info-section with selected nodes
      // in a format that is similar to the nodeTooltip
      const selectedNodes = Array.from(this.selectedNodes.current).map(nodeId => {
        return this.processedData.current.nodes.find(node => node.id === nodeId);
      });

      // Create React components for selected nodes instead of HTML strings
      const selectedNodesComponents = selectedNodes.map((node, index) => {
        // Check if node is null
        if (!node) return null;
        const mintAddress = node?.mint_address;
        const mintInfo = mintAddress ? this.metadataServices.getMintInfo(mintAddress) : null;
        const nodeImage = this.metadataServices.getGraphicByNode(node).image;

        // Component to display transactions where this account is involved
        const AccountTransactions = () => {
          const [showTransactions, setShowTransactions] = React.useState<boolean>(false);
          
          // Find transactions involving this account
          const transactions = Object.entries(this.originalData.current.transactions)
            .filter(([_, txData]) => txData.accounts.includes(node.account_vertex.address))
            .map(([signature, _]) => signature);
          
          // Only render if there are transactions
          if (transactions.length === 0) return null;
          
          return (
            <div style={{ marginTop: '8px' }}>
              <div 
                onClick={() => setShowTransactions(!showTransactions)}
                style={{ 
                  cursor: 'pointer', 
                  color: '#7B61FF',
                  display: 'flex',
                  alignItems: 'center',
                  userSelect: 'none'
                }}
              >
                <span style={{ marginRight: '4px' }}>
                  {showTransactions ? '▾' : '▸'}
                </span>
                <span>
                  {showTransactions ? 'Hide transactions' : 'Show transactions'}
                </span>
              </div>
              
              {showTransactions && (
                <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                  {transactions.map((signature, txIndex) => (
                    <li key={txIndex} style={{ margin: '4px 0' }}>
                      <AddressLabel 
                        address={signature} 
                        shortened={true} 
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        };
        
        // Create authorities list as a React component
        const authoritiesComponent = node.authorities && node.authorities.length > 0 ? (
          <React.Fragment>
            <b>Authorities:</b><br/>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {node.authorities.map((auth, i) => (
                <li key={i}><AddressLabel address={auth} shortened={true} /></li>
              ))}
            </ul>
          </React.Fragment>
        ) : null;

        // Create node info component with optional separator
        return (
          <React.Fragment key={index}>
            {/* Add separator before nodes (except the first one) */}
            {index > 0 && (
              <div style={{
                height: 1,
                backgroundColor: '#444444',
                margin: '12px 0',
                width: '100%'
              }} />
            )}
            <div style={{ 
              background: '#1A1A1A', 
              padding: 8, 
              borderRadius: 4, 
              color: '#FFFFFF'
            }}>
              <b>Type:</b> {node.type}<br/>
              {/* Display node image if available */}
              {nodeImage && <img src={nodeImage.src} crossOrigin="anonymous" style={{ maxWidth: 50, maxHeight: 50 }} />}
              <b>Account:</b> <AddressLabel address={node.account_vertex.address!} shortened={true} /><br/>
              {mintAddress ? (
                <React.Fragment>
                  <b>Mint:</b> <AddressLabel address={mintAddress} type={AddressType.TOKEN} shortened={true} /><br/>
                </React.Fragment>
              ) : <React.Fragment><b>Token:</b> SOL<br/></React.Fragment>}
              <b>Owner:</b> {node.owner ? (<AddressLabel address={node.owner} shortened={true} />) : 'Unknown'}<br/>
              {authoritiesComponent}
              <AccountTransactions />
            </div>
          </React.Fragment>
        );
      });
      
      // Flow-specific content using React components
      const flowContent = (
        <div className="info-section">
          {selectedNodesComponents}
        </div>
      );
      
      // Pass the flow content to the base implementation
      const baseContent = super.getNodesInfoContent(flowContent);
      return (
        <div className="strategy-panel-content">
          {baseContent}
        </div>
      );
    }
    
    // Return default content if no nodes are selected
    return super.getNodesInfoContent();
  }
  
  /**
   * Returns content for the Link Info accordion section with Flow view specific information
   * Extends the base implementation with flow-specific details
   */
  getLinksInfoContent(): React.ReactNode {
      if(this.selectedLinks.current && this.selectedLinks.current.size > 0) {
          // Get selected links from the current data
          const selectedLinks = Array.from(this.selectedLinks.current).map(linkId => {
            return this.processedData.current.links.find(link => link.id === linkId);
          }).filter(link => link !== undefined) as ForceGraphLink[];

          // Create React components for selected links
          const selectedLinksComponents = selectedLinks.map((link, index) => {
              const imageUrl = this.metadataServices.getProgramInfo(link.program_address)?.icon 

              // Format composite links if they exist
              const CompositesSection = () => {
                  const [showComposites, setShowComposites] = React.useState<boolean>(false);
                  
                  // Only render if there are composite links
                  if (!link.composite || link.composite.length === 0) return null;
                  
                  return (
                      <div style={{ marginTop: '8px' }}>
                          <div 
                              onClick={() => setShowComposites(!showComposites)}
                              style={{ 
                                  cursor: 'pointer', 
                                  color: '#7B61FF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  userSelect: 'none'
                              }}
                          >
                              <span style={{ marginRight: '4px' }}>
                                  {showComposites ? '▾' : '▸'}
                              </span>
                              <span>
                                  {showComposites ? 'Hide composites' : 'Show composites'}
                              </span>
                          </div>
                          
                          {showComposites && (
                              <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                                  {link.composite.map((compLink, compIndex) => {
                                      // Get the transfer details HTML for each composite link
                                      const compositeTransferDetailsHTML = this.getTransferDetailsHTML(compLink);
                                      
                                      return (
                                          <li key={compIndex} style={{ margin: '4px 0' }}>
                                              <span dangerouslySetInnerHTML={{ __html: compositeTransferDetailsHTML }} /> - <b>Transaction:</b> <AddressLabel address={compLink.transaction_signature} shortened={true} /><br/>
                                          </li>
                                      );
                                  })}
                              </ul>
                          )}
                      </div>
                  );
              };

              const showTransaction = (!link.composite || link.composite.length === 0)

              return (
                  <React.Fragment key={index}>
                      {/* Add separator before links (except the first one) */}
                      {index > 0 && (
                          <div style={{
                              height: 1,
                              backgroundColor: '#444444',
                              margin: '12px 0',
                              width: '100%'
                          }} />
                      )}
                      <div style={{ 
                          background: '#1A1A1A', 
                          padding: 8, 
                          borderRadius: 4, 
                          color: '#FFFFFF'
                      }}>
                          <b>Type:</b> {link.type}<br/>
                          {imageUrl && (
                              <img 
                                  src={imageUrl} 
                                  crossOrigin="anonymous" 
                                  style={{ maxWidth: 50, maxHeight: 50, marginTop: 4, marginBottom: 4 }} 
                              />
                          )}
                          <br/>

                          <b>Program:</b> <AddressLabel address={link.program_address} type={AddressType.PROGRAM} shortened={true} /><br/>
                          <b>From:</b> <AddressLabel address={link.source_account_vertex.address} shortened={true} /><br/>
                          <b>To:</b> <AddressLabel address={link.target_account_vertex.address} shortened={true} /><br/>
                          {showTransaction && (<><b>Transaction:</b> <AddressLabel address={link.transaction_signature} shortened={true} /></>)}
                          <div dangerouslySetInnerHTML={{ __html: this.getTransferDetailsHTML(link) }} />

                          {/* Show composite links if they exist */}
                          <CompositesSection />
                      </div>
                  </React.Fragment>
              );
          });

          // Create base content with selected links components
          const flowContent = (
              <div className="info-section">
                  {selectedLinksComponents}
              </div>
          );

          // Pass the flow content to the base implementation
          const baseContent = super.getLinksInfoContent(flowContent);
          return baseContent
      }
      return super.getLinksInfoContent();
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
  const selectedLinks = useRef<Set<string>>(new Set<string>());

  // Create and return strategy instance
  return new AccountViewStrategy(
    metadataServices,
    usdServices,
    processedDataRef,
    originalDataRef,
    selectedNodes,
    selectedLinks,
  );
}

function setGraphData(arg0: (prevData: any) => { nodes: ForceGraphNode[]; links: ForceGraphLink[]; transactions: { [x: string]: TransactionData; }; }) {
  throw new Error('Function not implemented.');
}
