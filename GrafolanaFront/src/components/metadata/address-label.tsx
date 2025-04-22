import { useMetadata } from './metadata-provider';
import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { AddressType, Label } from '@/types/metadata';
import { createPortal } from 'react-dom';
import { useLabelEditDialog } from './label-edit-dialog-provider';
import { shortenAddress } from '@/utils/addressUtils';

interface AddressLabelProps {
  address: string;
  type?: AddressType;
  className?: string;
  shortened?: boolean;
  show_controls?: boolean;
}

interface TooltipPosition {
  top: number;
  left: number;
  transformOrigin?: string;
  transformOffset?: { x: number; y: number };
  arrowLeftOffset?: number; // Add property to track arrow offset
}

export function AddressLabel({ 
  address, 
  type = AddressType.UNKNOWN, 
  className,
  shortened = false, // Default to false
  show_controls = true // Default to showing controls
}: AddressLabelProps) {
  const { getLabelComputed } = useMetadata();
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
  
  // Use our new label edit dialog context
  const { openLabelEditor } = useLabelEditDialog();

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

      {/* Copy button - only show if show_controls is true */}
      {show_controls && (
        <button
          onClick={handleCopy}
          className="p-1 hover:text-blue-500 relative"
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
            className={`w-3.5 h-3.5 absolute inset-1 transition-opacity duration-200 ${showCheckmark ? 'opacity-100' : 'opacity-0'}`} 
            viewBox="0 0 20 20" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="currentColor" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          > 
            <path id="Shape" d="M5.341,12.247a1,1,0,0,0,1.317,1.505l4-3.5a1,1,0,0,0,.028-1.48l-9-8.5A1,1,0,0,0,.313,1.727l8.2,7.745Z" transform="translate(19 6.5) rotate(90)"/>
          </svg>
        </button>
      )}

      {/* Modify button - only show if show_controls is true */}
      {show_controls && (
        <button
          onClick={() => openLabelEditor({
            address,
            initialLabel: labelInput,
            initialDescription: descriptionInput,
            type,
            onSaveSuccess: handleSaveSuccess
          })}
          className="p-1 hover:text-blue-500"
          title="Edit label"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
          </svg>
        </button>
      )}
    </div>
  );
}