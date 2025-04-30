import { SolanaProvider } from '@/components/solana/solana-provider'
import { UiLayout } from '@/components/ui/ui-layout'
import { ReactQueryProvider } from './react-query-provider'
import '@solana/wallet-adapter-react-ui/styles.css'
import './globals.css'
import { MetadataProvider } from '@/components/metadata/metadata-provider'
import { LabelEditDialogProvider } from '@/components/metadata/label-edit-dialog-provider'
import { StaticGraphicsProvider } from '@/components/metadata/static-graphic-provider'
import type { Metadata } from 'next'

// Define metadata including the favicon
export const metadata: Metadata = {
  title: 'Grafolana',
  description: 'Blockchain transaction analysis tool',
  icons: {
    icon: [
      { url: '/grafolanalogosmall.png', type: 'image/png' }
    ],
    apple: [
      { url: '/grafolanalogosmall.png' }
    ],
    // Explicitly set other icon types to empty to prevent defaults
    shortcut: [],
    other: []
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ReactQueryProvider>
          <SolanaProvider>
            <StaticGraphicsProvider>
              <MetadataProvider>
                <LabelEditDialogProvider>
                  <UiLayout>{children}</UiLayout>
                </LabelEditDialogProvider>
              </MetadataProvider>
            </StaticGraphicsProvider>
          </SolanaProvider>
        </ReactQueryProvider>
      </body>
    </html>
  )
}
