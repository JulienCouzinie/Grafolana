import { useState, useEffect } from 'react';
import { useMetadata } from './metadata-provider';
import { useWallet } from '@solana/wallet-adapter-react';
import { AddressType } from '@/types/metadata';
import { useToast } from '@/components/ui/toast-provider';

interface LabelEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  initialLabel: string;
  initialDescription: string;
  type: AddressType;
  onSaveSuccess: (label: string, description: string) => void;
}

export function LabelEditDialog({
  isOpen,
  onClose,
  address,
  initialLabel,
  initialDescription,
  type,
  onSaveSuccess
}: LabelEditDialogProps) {
  const { updateLabel, deleteLabel } = useMetadata();
  const { publicKey } = useWallet();
  const [labelInput, setLabelInput] = useState(initialLabel);
  const [descriptionInput, setDescriptionInput] = useState(initialDescription);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const { showToast } = useToast();

  // Update state when props change
  useEffect(() => {
    if (initialLabel == address) {
      setLabelInput("");
    } else {
      setLabelInput(initialLabel);
    }
    setDescriptionInput(initialDescription);
  }, [initialLabel, initialDescription]);

  const handleSaveLabel = async (): Promise<void> => {
    if (!publicKey) {
      showToast('Please connect your wallet to create labels', 'info');
      return;
    }

    try {
      await updateLabel(
        address,
        labelInput,
        descriptionInput,
        publicKey.toBase58(),
        type
      );
      // Call onSaveSuccess with updated values
      onSaveSuccess(labelInput, descriptionInput);
      onClose();
    } catch (error) {
      console.error('Error saving label:', error);
      alert('Failed to save label');
    }
  };
  
  const handleDeleteClick = () => {
    setShowDeleteConfirmation(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!publicKey) {
      alert('Please connect your wallet to delete labels');
      return;
    }

    try {
      const success = await deleteLabel(address, publicKey.toBase58());
      if (success) {
        // Call onSaveSuccess with empty values to indicate deletion
        onSaveSuccess("", "");
        setShowDeleteConfirmation(false);
        onClose();
      } else {
        alert('Failed to delete label');
      }
    } catch (error) {
      console.error('Error deleting label:', error);
      alert('Failed to delete label');
    }
  };
  
  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
      {showDeleteConfirmation ? (
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
          <h3 className="text-lg font-semibold mb-4 text-white">Confirm Delete</h3>
          <p className="text-gray-300 mb-4">Are you sure you want to delete this label?</p>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancelDelete}
              className="px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
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

            <div className="flex justify-between">
              <button
                onClick={handleDeleteClick}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-500"
              >
                Delete
              </button>
              
              <div className="space-x-3">
                <button
                  onClick={onClose}
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