'use client'

import {WalletError} from '@solana/wallet-adapter-base'
import {ConnectionProvider, WalletProvider,} from '@solana/wallet-adapter-react'
import {WalletModalProvider} from '@solana/wallet-adapter-react-ui'
import dynamic from 'next/dynamic'
import {ReactNode, useCallback, useEffect, useMemo} from 'react'


require('@solana/wallet-adapter-react-ui/styles.css')

export const WalletButton = dynamic(async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton, {
  ssr: false,
})

declare interface WalletWindow extends Window {
  solana?: {
    on(event: string, handler: (args: any) => void): void;
    removeListener(event: string, handler: (args: any) => void): void;
  }
}

export function SolanaProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const handleWalletChange = () => {
      window.location.reload();
    };

    // Use proper type assertion
    const solanaWindow = window as WalletWindow;
    const wallet = solanaWindow.solana;
    
    if (wallet) {
      wallet.on('accountChanged', handleWalletChange);
      return () => {
        wallet.removeListener('accountChanged', handleWalletChange);
      };
    }
  }, []);

  const onError = useCallback((error: WalletError) => {
    console.error(error)
  }, [])

  return (
    <WalletProvider wallets={[]} onError={onError} autoConnect={true}>
      <WalletModalProvider>{children}</WalletModalProvider>
    </WalletProvider>
  )
}

