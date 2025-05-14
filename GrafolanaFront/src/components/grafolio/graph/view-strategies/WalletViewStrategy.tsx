import React from 'react';
import { GraphData, GraphLink, ForceGraphLink, ForceGraphNode, AccountType, AccountVertex, GraphNode, TransferType} from '@/types/graph';
import { ViewStrategy } from './ViewStrategy';
import { useMetadata } from '@/components/metadata/metadata-provider';
import { useUSDValue } from '@/hooks/useUSDValue';
import { useRef } from 'react';

import { BaseViewStrategy } from './BaseViewStrategy';
import { AddressLabel } from '@/components/metadata/address-label';
import { AddressType } from '@/types/metadata';
import { NodeImage } from '@/components/metadata/node-image';
import { calculateTokenAmount } from '@/utils/tokenUtils';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTransactions } from '@/components/transactions/transactions-provider';


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
    
    if (node.type==AccountType.SOL_ACCOUNT || node.type==AccountType.STAKE_ACCOUNT || node.type==AccountType.PROGRAM_ACCOUNT) {
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
    let seen = new Map<string, ForceGraphNode>();
    let composite_seen_per_address = new Map<string, string[]>();
    
    nodes.forEach((node) => {
      let address = this.getWalletAddress(node);
      if (!seen.has(address)) {
        let type = node.type
        if (node.type==AccountType.TOKEN_ACCOUNT) {
          type = AccountType.SOL_ACCOUNT;
        } 

        let mint = "SOL";
        if (node.type==AccountType.TOKEN_MINT_ACCOUNT) {
          mint = node.mint_address;
        }

        let balance = 0;
        if (node.type==AccountType.FEE_ACCOUNT) {
          balance = node.balance_lamport;
        }

        // Create new node
        let aggregatedNode: ForceGraphNode = {
          id: address,
          type: type,
          account_vertex: new AccountVertex(
            address, 
            0, 
            ''
          ),
          mint_address: mint,
          is_pool: false,
          owner: null,
          authorities: [],
          balance_token: 0, 
          balance_lamport:balance, 
          composite: null,
          isOnCurve: true,
        };
        composite_seen_per_address.set(address, []);
        
        // If the node is not a SOL/Fee/Stake/Program/Mint/MINTTO_ACCOUNT/BURN_ACCOUNT, add it to the composite array
        if (node.type !== AccountType.SOL_ACCOUNT 
          && node.type !== AccountType.FEE_ACCOUNT 
          && node.type !== AccountType.STAKE_ACCOUNT 
          && node.type !== AccountType.PROGRAM_ACCOUNT 
          && node.type !== AccountType.TOKEN_MINT_ACCOUNT
          && node.type !== AccountType.MINTTO_ACCOUNT
          && node.type !== AccountType.BURN_ACCOUNT) {
          aggregatedNode.composite = [node];
          composite_seen_per_address.get(address)!.push(node.account_vertex.address);
        }

        // Update node type
        if (seen.get(address)?.type===AccountType.SOL_ACCOUNT && (node.type === AccountType.STAKE_ACCOUNT || node.type === AccountType.PROGRAM_ACCOUNT) ) {
          seen.get(address)!.type = node.type;
        }

        seen.set(address, aggregatedNode);
      } else {
        if (node.type!==AccountType.FEE_ACCOUNT) {
          if (node.type !== AccountType.SOL_ACCOUNT && node.type !== AccountType.PROGRAM_ACCOUNT) {
            // Check if the node is already in the composite array
            // If not, add it to the composite array of the existing node
            if (!composite_seen_per_address.get(address)!.includes(node.account_vertex.address)) {
              composite_seen_per_address.get(address)!.push(node.account_vertex.address);
            
              const existingNode = seen.get(address)!;
              if (!existingNode.composite) {
                existingNode.composite = [];
              }
              // Add the node to the composite array of the existing node
              existingNode.composite.push(node);
            }
          }
        } else {
          // Aggregate the balance of the fee account
          const existingNode = seen.get(address)!;
          existingNode.balance_lamport += node.balance_lamport;
        }
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
        const key = `${source_address}-${target_address}`;

        const linkId = key;

        // Create new WALLET_TO_WALLET link
        let aggregatedlink: ForceGraphLink = {
          id: linkId,
          key: 0,
          transaction_signature: '',
          program_address: '',
          source: source_address,
          target: target_address,
          source_account_vertex: new AccountVertex(source_address,0, ''),
          target_account_vertex: new AccountVertex(target_address,0, ''),
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

  initializeGraphData(data: GraphData, setGraphData: React.Dispatch<React.SetStateAction<GraphData>>): void {
    this.setReprocessCallback((dataToProcess: GraphData) => this.processGraphData(dataToProcess, setGraphData));

    this.setupGraphData(data);
  }

  processGraphData(data: GraphData, setGraphData: React.Dispatch<React.SetStateAction<GraphData>>): void {
    let nodes = this.aggregateAccounts(data.nodes);
    let links = this.aggregateLinks(data);
    links = this.assignLinkCurvature(links);

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
    const nodeImage = this.metadataServices.getGraphicByNode(node).image;
    const mintInfo = node.mint_address ? this.metadataServices.getMintInfo(node.mint_address) : null;

    let totalFees = '';
    if  (node.type === AccountType.FEE_ACCOUNT) {
      const feeAmount = calculateTokenAmount(node.balance_lamport, mintInfo).toFixed(5);
      const img = this.metadataServices.getMintImage(mintInfo?.image);

      totalFees = `<b>Total fees:</b> ${feeAmount} SOL<img src="${img?.src}" style="width: 16px; height: 16px; display: inline-block;" />`;
    }

    // Create authorities list HTML if authorities exist
    const authoritiesHtml = node.authorities && node.authorities.length > 0
      ? `
        <b>Authorities:</b><br/>
        <ul style="margin: 0; padding-left: 20px;">
          ${node.authorities.map(auth => `<li>${this.metadataServices.getLabelComputed(auth).label}"</li>`).join('')}
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
            const compMintInfo = compMintAddress ? this.metadataServices.getMintInfo(compMintAddress) : null;
            const compMintImage = this.metadataServices.getMintImage(compMintInfo!.image);
            
            return `<li>
              ${compMintImage ? `<img src="${compMintImage.src}" crossorigin="anonymous" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 5px; display: inline-block;">` : ''}
              ${compMintInfo?.symbol ? `${compMintInfo.symbol}: ` : ''}
              ${this.metadataServices.getLabelComputed(comp.account_vertex.address).label}
            </li>`;
          }).join('')}
        </ul>
      `
      : '';

    return `
      <div style="background: #1A1A1A; padding: 8px; border-radius: 4px; color: #FFFFFF;">
        <b>Type:</b> ${node.type}<br/>
        <img src="${nodeImage?.src}" crossorigin="anonymous" style="max-width: 50px; max-height: 50px;"><br/>
        <b>Account:</b> ${this.metadataServices.getLabelComputed(node.account_vertex.address).label}<br/>
        ${totalFees}
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
          const imageUrl = this.metadataServices.getProgramInfo(compLink.program_address)?.icon;
          const compositeProgramImage = this.metadataServices.getProgramImage(imageUrl!);
          const imageHTML = compositeProgramImage ? `<img src="${compositeProgramImage.src}" crossorigin="anonymous" style="width: 16px; height: 16px; display: inline-block;">` : '';

          const compositeTransferDetailsHTML = this.getTransferDetailsHTML(compLink);
            return `<li>${imageHTML} ${compositeTransferDetailsHTML}</li>`;
        }).join('')}
        </ul>`
    : '';

    return `
    <div style="display: inline-block; background: #1A1A1A; padding: 14px; border-radius: 4px; color: #FFFFFF; min-width: fit-content">
        <b>Type:</b> ${link.type}<br/>
        ${imageUrl ? `<img src="${imageUrl}" crossorigin="anonymous" style="max-width: 50px; max-height: 50px;"><br/>` : ''}
        <b>From:</b> ${this.metadataServices.getLabelComputed(link.source_account_vertex.address).label}<br/>
        <b>To:</b> ${this.metadataServices.getLabelComputed(link.target_account_vertex.address).label}<br/>
        ${compositesHtml}
    </div>
    `;
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
        
        const TotalFees = () => {
          if  (node.type === AccountType.FEE_ACCOUNT) {
            const feeAmount = calculateTokenAmount(node.balance_lamport, mintInfo).toFixed(5);
            const img = this.metadataServices.getMintImage(mintInfo?.image);

            return (<><b>Total fees:</b> {feeAmount} SOL{img && <img src={img.src} style={{width: "16px", height: "16px", display: "inline-block"}} />}</>);
          }
        }

        // Component to display transactions where this account is involved
        const AccountTransactions = () => {
          const [showTransactions, setShowTransactions] = React.useState<boolean>(false);
          
          // Find transactions involving this account
          const transactions = Object.entries(this.originalData.current.transactions)
            .filter(([_, txData]) => txData.accounts.some(account => account.address === node.account_vertex.address))
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
                        data={this.originalData.current} 
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        };

        // Component to display composite accounts with toggle functionality
        const CompositeAccounts = () => {
          const [showComposites, setShowComposites] = React.useState<boolean>(false);
          
          // Only render if there are composite accounts
          if (!node.composite || node.composite.length === 0) return null;
          
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
                  {showComposites ? 'Hide composite accounts' : 'Show composite accounts'}
                </span>
              </div>
              
              {showComposites && (
                <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                  {node.composite.map((comp, compIndex) => {
                    // Get mint info and image for composite account
                    const compMintAddress = comp.mint_address;
                    const compMintInfo = compMintAddress ? this.metadataServices.getMintInfo(compMintAddress) : null;

                    
                    return (
                      <li key={compIndex} style={{ margin: '4px 0' }}>
                        <NodeImage node={comp} maxWidth={16} maxHeight={16} 
                        style={{ 
                          width: 16, 
                          height: 16, 
                          verticalAlign: 'middle', 
                          marginRight: 5, 
                          display: 'inline-block' 
                        }} 
                        />

                        {compMintInfo?.symbol && `${compMintInfo.symbol}: `}
                        <AddressLabel 
                          address={comp.account_vertex.address!} 
                          shortened={true} 
                          data={this.originalData.current} 
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        };

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
              <NodeImage node={node} maxWidth={50} maxHeight={50} />
              <b>Wallet:</b> <AddressLabel address={node.account_vertex.address!} shortened={true} data={this.originalData.current} /><br/>
              <TotalFees />
              {/* Display composite accounts info if available */}
              <CompositeAccounts />
              {/* Display transactions this account is appearing */}
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
   * Returns content for the Link Info accordion section with Wallet view specific information
   * Extends the base implementation with wallet-specific details
   */
  getLinksInfoContent(): React.ReactNode {
      if(this.selectedLinks.current && this.selectedLinks.current.size > 0) {
          // Get selected links from the current data
          const selectedLinks = Array.from(this.selectedLinks.current).map(linkId => {
              return this.processedData.current.links.find(link => link.id === linkId);
          }).filter(link => link !== undefined) as ForceGraphLink[];

          // Create React components for selected links
          const selectedLinksComponents = selectedLinks.map((link, index) => {
              const imageUrl = link.type !== TransferType.WALLET_TO_WALLET 
                  ? this.metadataServices.getProgramInfo(link.program_address)?.icon 
                  : '/logo/wallettowallet.png';

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
                                              <span dangerouslySetInnerHTML={{ __html: compositeTransferDetailsHTML }} /> - <b>Transaction:</b> <AddressLabel address={compLink.transaction_signature} shortened={true} data={this.originalData.current} /><br/>
                                          </li>
                                      );
                                  })}
                              </ul>
                          )}
                      </div>
                  );
              };

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
                          {link.type !== TransferType.WALLET_TO_WALLET && (
                              <><b>Program:</b> <AddressLabel address={link.program_address} type={AddressType.PROGRAM} shortened={true} data={this.originalData.current} /><br/></>
                          )}
                          <b>From:</b> <AddressLabel address={link.source_account_vertex.address} shortened={true} data={this.originalData.current} /><br/>
                          <b>To:</b> <AddressLabel address={link.target_account_vertex.address} shortened={true} data={this.originalData.current} /><br/>
                          
                          {/* Only show transfer details for non-WALLET_TO_WALLET links */}
                          {link.type !== TransferType.WALLET_TO_WALLET && (
                              <div dangerouslySetInnerHTML={{ __html: this.getTransferDetailsHTML(link) }} />
                          )}
                          
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

export function useWalletViewStrategy(): ViewStrategy {
  const metadataServices = useMetadata();
  const usdServices = useUSDValue();
  const transactionProvider = useTransactions()

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

  const { publicKey } = useWallet();

  // Create and return strategy instance
  return new WalletViewStrategy(
    metadataServices,
    usdServices,
    transactionProvider,
    processedDataRef,
    originalDataRef,
    selectedNodes,
    selectedLinks,
    publicKey
  );
}