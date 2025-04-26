import { SolanaProvider } from '@/components/solana/solana-provider'
import { UiLayout } from '@/components/ui/ui-layout'
import { ReactQueryProvider } from './react-query-provider'
import '@solana/wallet-adapter-react-ui/styles.css'
import './globals.css'
import { MetadataProvider } from '@/components/metadata/metadata-provider'
import { LabelEditDialogProvider } from '@/components/metadata/label-edit-dialog-provider'
import { StaticGraphicsProvider } from '@/components/metadata/static-graphic-provider'

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
