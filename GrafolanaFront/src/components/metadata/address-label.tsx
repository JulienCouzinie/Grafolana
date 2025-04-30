import { useMetadata } from './metadata-provider';
import { useStaticGraphics } from './static-graphic-provider';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { AddressType, Label } from '@/types/metadata';
import { createPortal } from 'react-dom';
import { useLabelEditDialog } from './label-edit-dialog-provider';
import { shortenAddress } from '@/utils/addressUtils';
import { GraphData } from '@/types/graph';

interface AddressLabelProps {
  address: string;
  type?: AddressType;
  className?: string;
  shortened?: boolean;
  show_controls?: boolean;
  data: GraphData; 
}

interface TooltipPosition {
  top: number;
  left: number;
  transformOrigin?: string;
  transformOffset?: { x: number; y: number };
  arrowLeftOffset?: number; // Add property to track arrow offset
}

// Add context menu position interface
interface ContextMenuPosition {
  x: number;
  y: number;
  isOpen: boolean;
}

// Add interface for context menu items
interface ContextMenuItem {
  label: string;
  action: string;
}

export function AddressLabel({ 
  address, 
  type = AddressType.UNKNOWN, 
  className,
  shortened = false, // Default to false
  show_controls = true, // Default to showing controls
  data 
}: AddressLabelProps) {
  const { getLabelComputed, isSpam, addToSpam, canUnMarkSpam, deleteFromSpam, getSpam} = useMetadata();
  const { publicKey } = useWallet();
  const [displayLabel, setDisplayLabel] = useState(shortened ? shortenAddress(address) : address);
  const [labelInput, setLabelInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [displayDescription, setDisplayDescription] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const labelRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({ top: 0, left: 0 });
  const [isTransactionSpan, setisTransactionSpan] = useState(false); // Track if the label is a transaction span
  const spamImg = useStaticGraphics().spam.image;
  // Use our new label edit dialog context
  const { openLabelEditor } = useLabelEditDialog();
  
  // Add state for context menu positioning and visibility
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition>({
    x: 0,
    y: 0,
    isOpen: false
  });

  // Check if the transaction is spam by checking if one of its signers is a known spam address
  const isTransactionSpam =  useCallback((signature: string): boolean => { 
    const txData = data.transactions[signature];
    if (!txData || !txData.signers || txData.signers.length === 0) {
        return false;
    }
    // Check if any signer is in the spam list
    return txData.signers.some(signer => isSpam(signer));
  }, [data, isSpam]);

  useEffect(() => {
    setisTransactionSpan(isTransactionSpam(address));
  }, [data, isSpam]);

  useEffect(() => {
    function fetchLabel() {
      const label = getLabelComputed(address, type, shortened)
      let labelInput;
      setDisplayLabel(label.label);
      if (label.label === address || label.label === shortenAddress(address)) {
        labelInput = "";
      } else {
        labelInput = label.label;
      }
      setLabelInput(labelInput);
      setDescriptionInput(label.description || '');
      setDisplayDescription(label.description || '');
    }

    fetchLabel();
  }, [address, getLabelComputed, type, shortened]);

  useEffect(() => {
    const userId = publicKey?.toBase58();
    
    // Define update callback
    const handleLabelUpdate = (label: Label) => {
      setDisplayLabel(label.label);
      setLabelInput(label.label);
      setDescriptionInput(label.description || '');
      setDisplayDescription(label.description || '');
    };
  }, [address, publicKey]);

  // Calculate tooltip position with boundary detection
  useEffect(() => {
    if (showTooltip && labelRef.current) {
      const rect = labelRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Default position (centered above the label)
      let position: TooltipPosition = {
        top: rect.top - 10, // Position above the element with a small gap
        left: rect.left + (rect.width / 2),
      };

      if (tooltipRef.current) {
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        
        // Check if tooltip would go off-screen and adjust position accordingly
        
        // Handle horizontal overflow
        if (position.left - (tooltipRect.width / 2) < 10) {
          // Too close to left edge
          const originalLeft = position.left;
          position.left = tooltipRect.width / 2 + 10; // Keep tooltip within viewport with padding
          
          // Calculate how much we shifted the tooltip right
          const shift = position.left - originalLeft;
          // The arrow should be offset to the left by the same amount
          position.arrowLeftOffset = -shift;
          
        } else if (position.left + (tooltipRect.width / 2) > viewportWidth - 10) {
          // Too close to right edge
          const originalLeft = position.left;
          position.left = viewportWidth - (tooltipRect.width / 2) - 10;
          
          // Calculate how much we shifted the tooltip left
          const shift = originalLeft - position.left;
          // The arrow should be offset to the right by the same amount
          position.arrowLeftOffset = shift;
        }
        
        // Handle vertical overflow (if tooltip would go above the viewport)
        if (position.top - tooltipRect.height < 10) {
          // Position below the element instead of above
          position = {
            top: rect.bottom + 10,
            left: position.left,
            transformOrigin: "top center",
            transformOffset: { x: -50, y: 0 }, // Adjust transform to position the arrow correctly
            arrowLeftOffset: position.arrowLeftOffset // Preserve the horizontal arrow offset
          };
        }
        
        setTooltipPosition(position);
      }
      
      // Initial position estimate
      setTooltipPosition(position);
    }
  }, [showTooltip]);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(address);
      setShowCheckmark(true);
      setTimeout(() => setShowCheckmark(false), 1200); // Reset after 1.2s
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  // Handle successful save from the dialog
  const handleSaveSuccess = (label: string, description: string): void => {
    setDisplayLabel(label);
    setDisplayDescription(description);
    // Update the inputs for consistency with the original implementation
    setLabelInput(label);
    setDescriptionInput(description);
  };

  // Add function to handle menu button click
  const handleMenuClick = (e: React.MouseEvent): void => {
    e.stopPropagation(); // Prevent event bubbling
    
    // Get the click position for the menu
    const menuPosition = {
      x: e.clientX,
      y: e.clientY,
      isOpen: !contextMenu.isOpen // Toggle menu
    };
    
    setContextMenu(menuPosition);
  };
  
  // Add function to close the context menu
  const closeContextMenu = (): void => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  };
  
  // Add effect to close menu when clicking outside
  useEffect(() => {
    if (contextMenu.isOpen) {
      const handleOutsideClick = () => {
        closeContextMenu();
      };
      
      window.addEventListener('click', handleOutsideClick);
      
      return () => {
        window.removeEventListener('click', handleOutsideClick);
      };
    }
  }, [contextMenu.isOpen]);

  // Function to dynamically generate menu items based on current address and state
  const getContextMenuItems = (): ContextMenuItem[] => {
    console.log("address type", type);
    const menuItems: ContextMenuItem[] = [
      {
        label: "Copy Address",
        action: "copy"
      },
      {
        label: "Edit Label",
        action: "edit"
      }      
    ];

    // Check if address is already marked as spam
    const isItSpam = isSpam(address);
          
    if (type !== AddressType.TRANSACTION) {
      if (isItSpam) {
          // Only allow unmarking spam if user has permission
          if (canUnMarkSpam(address)) {
              menuItems.push({
                  label: "Unmark as Spam",
                  action: "unmarkSpam"
              });
          }
      } else {
          // Allow marking as spam for non-spam addresses
          menuItems.push({
              label: "Mark as Spam",
              action: "markSpam"
          });
      }
    }

    // Add transaction-specific options
    if (data.transactions[address]) {
      menuItems.push({
        label: "View Transaction Details",
        action: "viewTransaction"
      });
    } else {
      menuItems.push({
        label: "View in Explorer",
        action: "viewExplorer"
      });
    }

    return menuItems;
  };

  // Handle context menu actions
  const handleContextMenuAction = (action: string): void => {
    closeContextMenu();
    
    // Handle different menu actions
    switch(action) {
      case 'copy':
        handleCopy();
        break;
      case 'edit':
        openLabelEditor({
          address,
          initialLabel: labelInput,
          initialDescription: descriptionInput,
          type,
          onSaveSuccess: handleSaveSuccess
        });
        break;
      case 'viewExplorer':
        window.open(`https://solscan.io/account/${address}`, '_blank');
        break;
      case 'markSpam':
        // Add to spam list logic
        if (publicKey) {
          addToSpam(address);
        } else {
          // Show message to user that they need to connect their wallet first
          alert("Please connect your wallet to mark addresses as spam.");
          // Alternatively, you could use a more elegant notification system if available in your app
          // For example: showNotification("Please connect your wallet to mark addresses as spam.", "warning");
        }
        break;
      case 'unmarkSpam':
        // Remove from spam list logic
        if (publicKey) {
          const spam = getSpam(address);
          if (spam) {
            deleteFromSpam(spam.id);
          }
        }
        break;
      case 'viewTransaction':
        // Add transaction viewing logic
        window.open(`https://solscan.io/tx/${address}`, '_blank');
        break;
      default:
        break;
    }
  };

  // Determine transform style based on tooltip position
  const getTooltipTransform = (): string => {
    if (tooltipPosition.transformOffset) {
      return `translate(${tooltipPosition.transformOffset.x}%, ${tooltipPosition.transformOffset.y}%)`;
    }
    return 'translate(-50%, -100%)'; // Default transform
  };

  // Determine arrow position and style
  const getArrowPosition = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      left: tooltipPosition.arrowLeftOffset ? `calc(50% + ${tooltipPosition.arrowLeftOffset}px)` : '50%',
      transform: 'translateX(-50%)',
      width: '10px', // Width of arrow
      height: '10px', // Height of arrow
      backgroundColor: '#1F2937', // Same background color as tooltip (bg-gray-800)
      borderStyle: 'solid',
      borderWidth: '0 1px 1px 0', // Only show right and bottom borders for a clean arrow
      borderColor: '#374151', // Same as tooltip border (border-gray-700)
    };
    
    if (tooltipPosition.transformOrigin === "top center") {
      // When tooltip is below the element - arrow points up
      return {
        ...baseStyles,
        top: '-5px', // Position above the tooltip
        bottom: 'auto',
        transform: 'translateX(-50%) rotate(-135deg)', // Rotate to point upward
      };
    }
    
    // Default - tooltip above element - arrow points down
    return {
      ...baseStyles,
      bottom: '-5px', // Position below the tooltip
      top: 'auto',
      transform: 'translateX(-50%) rotate(45deg)', // Rotate to point downward
    };
  };

  return (
    <div className="relative inline-flex items-center gap-2 word-break-all">
      <span 
        style={{ cursor: 'pointer', color: '#14F195' }}
        ref={labelRef}
        className={className}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {(isTransactionSpan || isSpam(address)) && <img src={spamImg?.src} alt="Spam" className="w-6 h-6 inline" title='SPAM'/>}
        {displayLabel}
      </span>
      
      {/* Use createPortal to render the tooltip at the document root level */}
      {showTooltip && typeof document !== 'undefined' && createPortal(
        <div 
          ref={tooltipRef}
          className="address-tooltip-portal"
          style={{
            position: 'fixed',
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: getTooltipTransform(),
            transformOrigin: tooltipPosition.transformOrigin || 'bottom center',
            zIndex: 99999, // Higher than anything else
            pointerEvents: 'none', // Let mouse events pass through
            maxWidth: '600px',
          }}
        >
          <div className="bg-gray-800 text-white text-sm rounded-lg shadow-lg p-3 border border-gray-700">
            {/* Container div that sets the width based on the address */}
            <div className="inline-block">
              {/* Address determines the container width */}
              <div className="font-mono text-xs text-gray-300 whitespace-nowrap">
                {address}
              </div>
              
              {/* Description wraps within the address width */}
              {displayDescription && (
                <div className="text-gray-300 text-xs border-t border-gray-700 pt-1 mt-1 break-words">
                  {displayDescription}
                </div>
              )}
            </div>
            
            {/* Arrow - using CSS triangles instead of a rotated box */}
            <div 
              className="absolute"
              style={getArrowPosition()}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Group all control buttons in a flex container with reduced spacing */}
      {show_controls && (
        <div className="inline-flex items-center -mx-1">
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="p-0.5 hover:text-blue-500 relative"
            title="Copy address"
          >
            {/* Copy icon */}
            <svg 
              className={`w-3.5 h-3.5 transition-opacity duration-200 ${showCheckmark ? 'opacity-0' : 'opacity-100'}`} 
              aria-hidden="true" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M16 1h-3.278A1.992 1.992 0 0 0 11 0H7a1.993 1.993 0 0 0-1.722 1H2a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Zm-3 14H5a1 1 0 0 1 0-2h8a1 1 0 0 1 0 2Zm0-4H5a1 1 0 0 1 0-2h8a1 1 0 1 1 0 2Zm0-5H5a1 1 0 0 1 0-2h2V2h4v2h2a1 1 0 1 1 0 2Z"/>
            </svg>
            {/* Checkmark icon */}
            <svg 
              className={`w-3.5 h-3.5 absolute inset-0 transition-opacity duration-200 ${showCheckmark ? 'opacity-100' : 'opacity-0'}`} 
              viewBox="0 0 20 20" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="currentColor" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            > 
              <path id="Shape" d="M5.341,12.247a1,1,0,0,0,1.317,1.505l4-3.5a1,1,0,0,0,.028-1.48l-9-8.5A1,1,0,0,0,.313,1.727l8.2,7.745Z" transform="translate(19 6.5) rotate(90)"/>
            </svg>
          </button>

          {/* Modify button 
          <button
            onClick={() => openLabelEditor({
              address,
              initialLabel: labelInput,
              initialDescription: descriptionInput,
              type,
              onSaveSuccess: handleSaveSuccess
            })}
            className="p-0.5 hover:text-blue-500"
            title="Edit label"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
            </svg>
          </button>
          */}
          
          {/* 3-dots menu button */}
          <button
            onClick={handleMenuClick}
            className="p-0.5 hover:text-blue-500"
            title="More options"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Context Menu Portal with dynamically generated items */}
      {contextMenu.isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="context-menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '4px',
            padding: '4px 0',
            minWidth: '150px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
            zIndex: 99999,
          }}
        >
          {/* Dynamically render menu items */}
          {getContextMenuItems().map((item) => (
            <button 
              key={item.action}
              className="context-menu-item"
              onClick={() => handleContextMenuAction(item.action)}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 16px',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}

      <style jsx>{`
        /* Context Menu Styles */
        .context-menu {
          background-color: #1a1a1a;
          border: 1px solid #333;
          border-radius: 4px;
          padding: 4px 0;
          min-width: 150px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        }
        
        .context-menu-item {
          display: block;
          width: 100%;
          padding: 8px 16px;
          text-align: left;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 14px;
        }
        
        .context-menu-item:hover {
          background-color: #2A2A2A;
        }
        
        .context-menu-item:active {
          background-color: #9945FF;
        }
      `}</style>
    </div>
  );
}