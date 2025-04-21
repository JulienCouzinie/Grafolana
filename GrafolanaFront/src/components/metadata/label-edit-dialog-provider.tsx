'use client'
import { createContext, useContext, useState, ReactNode } from 'react';
import { LabelEditDialog } from './label-edit-dialog';
import { AddressType } from '@/types/metadata';

interface LabelEditDialogContextType {
  openLabelEditor: (props: {
    address: string;
    initialLabel: string;
    initialDescription: string;
    type: AddressType;
    onSaveSuccess?: (label: string, description: string) => void;
  }) => void;
  closeLabelEditor: () => void;
}

const LabelEditDialogContext = createContext<LabelEditDialogContextType | undefined>(undefined);

export function useLabelEditDialog() {
  const context = useContext(LabelEditDialogContext);
  if (!context) {
    throw new Error('useLabelEditDialog must be used within a LabelEditDialogProvider');
  }
  return context;
}

export function LabelEditDialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogProps, setDialogProps] = useState<{
    address: string;
    initialLabel: string;
    initialDescription: string;
    type: AddressType;
    onSaveSuccess?: (label: string, description: string) => void;
  } | null>(null);

  const openLabelEditor = (props: {
    address: string;
    initialLabel: string;
    initialDescription: string;
    type: AddressType;
    onSaveSuccess?: (label: string, description: string) => void;
  }) => {
    setDialogProps(props);
    setIsOpen(true);
  };

  const closeLabelEditor = () => {
    setIsOpen(false);
  };

  const handleSaveSuccess = (label: string, description: string) => {
    if (dialogProps?.onSaveSuccess) {
      dialogProps.onSaveSuccess(label, description);
    }
    closeLabelEditor();
  };

  return (
    <LabelEditDialogContext.Provider value={{ openLabelEditor, closeLabelEditor }}>
      {children}
      {dialogProps && (
        <LabelEditDialog
          isOpen={isOpen}
          onClose={closeLabelEditor}
          address={dialogProps.address}
          initialLabel={dialogProps.initialLabel}
          initialDescription={dialogProps.initialDescription}
          type={dialogProps.type}
          onSaveSuccess={handleSaveSuccess}
        />
      )}
    </LabelEditDialogContext.Provider>
  );
}