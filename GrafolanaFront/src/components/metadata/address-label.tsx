import { useMetadata } from './metadata-provider';
import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTooltipPosition } from '@/hooks/useTooltipPosition';
import { Label } from '@/types/metadata';
import { createPortal } from 'react-dom';

export type AddressType = 'program' | 'token' | 'unknown';

interface AddressLabelProps {
  address: string;
  type?: AddressType;
  className?: string;
  shortened?: boolean;
  show_controls?: boolean;
}

export function AddressLabel({ 
  address, 
  type = 'unknown', 
  className,
  shortened = false, // Default to false
  show_controls = true // Default to showing controls
}: AddressLabelProps) {
  const { getLabelComputed, updateLabel} = useMetadata();
  const { publicKey } = useWallet();
  const [displayLabel, setDisplayLabel] = useState(shortened ? shortenAddress(address) : address);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [displayDescription, setDisplayDescription] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    function fetchLabel() {
      const label = getLabelComputed(address, type, shortened)
      setDisplayLabel(label.label);
      setLabelInput(label.label);
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

  // Update tooltip position when it's shown
  useEffect(() => {
    if (showTooltip && labelRef.current) {
      const rect = labelRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 10, // Position above the element with a small gap
        left: rect.left + (rect.width / 2)
      });
    }
  }, [showTooltip]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setShowCheckmark(true);
      setTimeout(() => setShowCheckmark(false), 1200); // Reset after 1.2s
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const handleSaveLabel = async () => {
    if (!publicKey) {
      alert('Please connect your wallet to create labels');
      return;
    }

    try {
      await updateLabel(
        address,
        labelInput,
        descriptionInput,
        publicKey.toBase58()
      );
      setDisplayLabel(labelInput);
      setDisplayDescription(descriptionInput);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving label:', error);
      alert('Failed to save label');
    }
  };

  return (
    <div className="relative inline-flex items-center gap-2">
      <span 
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
          className="address-tooltip-portal"
          style={{
            position: 'fixed',
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 99999, // Higher than anything else
            pointerEvents: 'none', // Let mouse events pass through
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
            
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[-6px] w-3 h-3 bg-gray-800 rotate-45 border-r border-b border-gray-700" />
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
          onClick={() => setIsDialogOpen(true)}
          className="p-1 hover:text-blue-500"
          title="Edit label"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
          </svg>
        </button>
      )}

      {/* Label edit dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-white">Edit Label</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Label</label>
                <input
                  type="text"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
                  placeholder="Enter label"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">Description</label>
                <textarea
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
                  rows={3}
                  placeholder="Enter description"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsDialogOpen(false)}
                  className="px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLabel}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to shorten addresses
function shortenAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}