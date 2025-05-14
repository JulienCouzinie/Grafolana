import React from 'react';
import { GraphData, GraphLink, ForceGraphLink, ForceGraphNode, TransferType, AccountType } from '@/types/graph';
import { ViewStrategy } from './ViewStrategy';
import { useMetadata } from '@/components/metadata/metadata-provider';
import { useUSDValue } from '@/hooks/useUSDValue';
import { useRef} from 'react';

import { BaseViewStrategy } from './BaseViewStrategy';
import { AddressType } from '@/types/metadata';
import { AddressLabel } from '@/components/metadata/address-label';
import { NodeImage } from '@/components/metadata/node-image';
import { calculateTokenAmount } from '@/utils/tokenUtils';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTransactions } from '@/components/transactions/transactions-provider';


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
    // Assign unique IDs to each link based on the source and target node IDs
    // If there are multiple links between the same nodes, add the number of links to the ID
    const seen = new Map<string, number>();
  
    links = links.map((link) => {
      const sourceNodeID = link.source_account_vertex.id;
      const targetNodeID = link.target_account_vertex.id;
      link.source = sourceNodeID;
      link.target = targetNodeID;

      const key = `${sourceNodeID}-${targetNodeID}`;
      if (!seen.has(key)) {
        seen.set(key, 0);
      } else {
        seen.set(key, seen.get(key)! + 1);
      }
      
      const linkID = `${sourceNodeID}-${targetNodeID}-${seen.get(key)}`;
      link.id = linkID;
      return link;
    });

    return links;
  }

  /**
   * Aligns the positions of nodes that share the same transaction signature in a grid-like structure.
   * So each transaction will have its node rendered in the same position.
   * This is useful for visualizing graph with multiple transactions
   * The grid has a size x by x with x equals rootsquare the total number of nodes
   * 
   * The transaction are ordered by their block time before being assigned to the grid
   * @param nodes A
   * @returns 
   */
  private alignNodesPositionsByTransaction(nodes: ForceGraphNode[]): ForceGraphNode[] {
    const transactionMap = new Map<string, ForceGraphNode[]>();
    nodes.forEach((node) => {
      const transactionSignature = node.account_vertex.transaction_signature;
      if (!transactionMap.has(transactionSignature)) {
        transactionMap.set(transactionSignature, []);
      }
      transactionMap.get(transactionSignature)!.push(node);
    });

    const gridSize = Math.ceil(Math.sqrt(transactionMap.size));
    let xOffset = 0;
    let yOffset = 0;

    // Order the transaction map by transaction block time
    const orderedTransactionMap = Array.from(transactionMap.entries()).sort((a, b) => {
      const aBlockTime = this.processedData.current.transactions[a[0]].timestamp;
      const bBlockTime = this.processedData.current.transactions[b[0]].timestamp;
      return aBlockTime - bBlockTime;
    });

    // Iterate over the ordered transaction map and assign positions
    orderedTransactionMap.forEach(([transactionSignature, nodes]) => {
      // Calculate the position for each node in the grid
      // Each node of the same transaction will be rendered in the same position
      const x = xOffset * 2000;
      const y = yOffset * 2000;
      nodes.forEach((node) => {
        node.x = x;
        node.y = y;
      });
      xOffset++;
      if (xOffset >= gridSize) {
        xOffset = 0;
        yOffset++;
      }
    });

    return nodes;
  }

  positionNodes(): void {
    this.processedData.current.nodes = this.alignNodesPositionsByTransaction(this.processedData.current.nodes);
  }

  initializeGraphData(data: GraphData, setGraphData: React.Dispatch<React.SetStateAction<GraphData>>): void {
    this.setReprocessCallback((dataToProcess: GraphData) => this.processGraphData(dataToProcess, setGraphData));

    this.setupGraphData(data);
  }

  processGraphData(data: GraphData, setGraphData: React.Dispatch<React.SetStateAction<GraphData>>): void {
    let links = data.links;
    links = this.assignLinksID(links);
    links = this.assignLinkCurvature(links);

    let nodes = this.assignNodesID(data.nodes);
    
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

  nodeTooltip(node: ForceGraphNode): string {
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

    let ownerInfo = '';
    if (node.type !== AccountType.WALLET_ACCOUNT 
      && node.type !== AccountType.PROGRAM_ACCOUNT
      && node.type !== AccountType.FEE_ACCOUNT
      && node.type !== AccountType.BURN_ACCOUNT
      && node.type !== AccountType.MINTTO_ACCOUNT) {
      ownerInfo = `<b>Owner:</b> ${node.owner ? this.metadataServices.getLabelComputed(node.owner).label : 'Unknown'}<br/>`;
    }

    let totalFees = '';
    if  (node.type === AccountType.FEE_ACCOUNT) {
      const feeAmount = calculateTokenAmount(node.balance_lamport, mintInfo).toFixed(7);
      const img = this.metadataServices.getMintImage(mintInfo?.image);
      const feeUSD = this.usdServices.calculateUSDValue(
          node.balance_lamport, 
          node.mint_address, 
          this.processedData.current.transactions[node.account_vertex.transaction_signature].mint_usd_price_ratio
      )?.toFixed(7);

      totalFees = `<b>Total fees:</b> ${feeAmount} SOL<img src="${img?.src}" style="width: 16px; height: 16px; display: inline-block;" /> ($${feeUSD})<br/>`;
    }
    return `
      <div style="background: #1A1A1A; padding: 8px; border-radius: 4px; color: #FFFFFF;">
        <b>Type:</b> ${node.type}<br/>
        ${nodeImage ? `<img src="${nodeImage.src}" crossorigin="anonymous" style="max-width: 50px; max-height: 50px;"><br/>` : ''}
        <b>Account:</b> ${this.metadataServices.getLabelComputed(node.account_vertex.address).label}<br/>
        <b>Version:</b> ${node.account_vertex.version}<br/>
        ${mintAddress ? `
          <b>Mint:</b> ${mintAddress}<br/>
          ${mintInfo?.name ? `<b>Token:</b> ${mintInfo.name}<br/>` : ''}
          ${mintInfo?.symbol ? `<b>Symbol:</b> ${mintInfo.symbol}<br/>` : ''}
          
        ` : '<b>Token:</b> SOL<br/>'}
        ${ownerInfo}
        ${totalFees}
        ${authoritiesHtml}
        <b>Transaction:</b> ${this.metadataServices.getLabelComputed(node.account_vertex.transaction_signature).label}<br/>
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
        const curveOffset = -curvature * 17; // Adjust this value to control the offset

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
    const imageUrl = this.metadataServices.getProgramInfo(link.program_address)?.icon;

    const transferDetailsHTML = this.getTransferDetailsHTML(link);

    return `
    <div style="display: inline-block; background: #1A1A1A; padding: 14px; border-radius: 4px; color: #FFFFFF; min-width: fit-content">
        <b>Type:</b> ${link.type}<br/>
        ${imageUrl ? `<img src="${imageUrl}" crossorigin="anonymous" style="max-width: 50px; max-height: 50px;"><br/>` : ''}
        <b>Program:</b> ${this.metadataServices.getLabelComputed(link.program_address, AddressType.PROGRAM, true).label}<br/>
        <b>From:</b> ${this.metadataServices.getLabelComputed(link.source_account_vertex.address).label}<br/>
        <b>To:</b> ${this.metadataServices.getLabelComputed(link.target_account_vertex.address).label}<br/>
        ${transferDetailsHTML}<br/>
        <b>Transaction:</b> ${this.metadataServices.getLabelComputed(link.transaction_signature).label}<br/>
    </div>
    `;
  }

  /**
   * Returns the content for the Filters accordion section
   * This is a placeholder and can be customized as needed
   */
  getFiltersContent(): React.ReactNode {
    // Create a component with internal state that reflects our class properties
    const Filters = () => {

      return (
        <div className="filter-options">
          <div className="filter-option">

          </div>
        </div>
      );
    };

    // Flow-specific content using React components with internal state
    const flowContent = (
      <div className="info-section">
        <Filters />
      </div>
    );
    
    // Pass the flow content to the base implementation
    const baseContent = super.getFiltersContent(flowContent);
    return baseContent;
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

        const OwnerInfo = () => {
          // Only render owner info for specific account types
          if (node.type === AccountType.WALLET_ACCOUNT 
            || node.type === AccountType.PROGRAM_ACCOUNT
            || node.type === AccountType.FEE_ACCOUNT
            || node.type === AccountType.BURN_ACCOUNT
            || node.type === AccountType.MINTTO_ACCOUNT) {
            return null;
          }
          
          return (
            <>
              <b>Owner:</b> {node.owner ? 
                <AddressLabel address={node.owner} shortened={true} data={this.originalData.current} /> 
                : 'Unknown'}<br/>
            </>
          );
        };

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
                        type={AddressType.TRANSACTION}
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
        
        // Create authorities list as a React component
        const authoritiesComponent = node.authorities && node.authorities.length > 0 ? (
          <React.Fragment>
            <b>Authorities:</b><br/>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {node.authorities.map((auth, i) => (
                <li key={i}><AddressLabel address={auth} shortened={true} data={this.originalData.current} /></li>
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
              <NodeImage node={node} maxWidth={50} maxHeight={50} />
              <b>Account:</b> <AddressLabel address={node.account_vertex.address!} shortened={true} data={this.originalData.current} /><br/>
              <b>Version:</b> {node.account_vertex.version}<br/>
              <b>Transaction:</b> <AddressLabel address={node.account_vertex.transaction_signature} type={AddressType.TRANSACTION} shortened={true} data={this.originalData.current} /><br/>
              {mintAddress ? (
                <React.Fragment>
                  <b>Mint:</b> <AddressLabel address={mintAddress} type={AddressType.TOKEN} shortened={true} data={this.originalData.current} /><br/>
                </React.Fragment>
              ) : <React.Fragment><b>Token:</b> SOL<br/></React.Fragment>}
              <OwnerInfo />
              <TotalFees />
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
      return baseContent
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
                          <b>Program:</b> <AddressLabel address={link.program_address} type={AddressType.PROGRAM} shortened={true}data={this.originalData.current}  /><br/>
                          <b>From:</b> <AddressLabel address={link.source_account_vertex.address} shortened={true} data={this.originalData.current} /><br/>
                          <b>To:</b> <AddressLabel address={link.target_account_vertex.address} shortened={true} data={this.originalData.current} /><br/>
                          <b>Transaction:</b> <AddressLabel address={link.transaction_signature} type={AddressType.TRANSACTION} shortened={true} data={this.originalData.current} /><br/>
                          <div dangerouslySetInnerHTML={{ __html: this.getTransferDetailsHTML(link) }} />
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

export function useFlowViewStrategy(): ViewStrategy {
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
  return new FlowViewStrategy(
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