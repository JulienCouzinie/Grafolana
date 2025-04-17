



import {SolanaProvider} from '@/components/solana/solana-provider'
import {UiLayout} from '@/components/ui/ui-layout'
import {ReactQueryProvider} from './react-query-provider'
import '@solana/wallet-adapter-react-ui/styles.css'
import './globals.css'
import { MetadataProvider } from '@/components/metadata/metadata-provider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ReactQueryProvider>
          <SolanaProvider>
            <MetadataProvider>
              <UiLayout>{children}</UiLayout>
            </MetadataProvider>
          </SolanaProvider>
        </ReactQueryProvider>
      </body>
    </html>
  )
}
