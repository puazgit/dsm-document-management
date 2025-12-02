import type { Metadata } from 'next'
import { fontVariables } from '../lib/fonts'
import { Providers } from '../components/providers'
import { GlobalErrorBoundary } from '../components/error-boundary'
import './globals.css'

export const metadata: Metadata = {
  title: 'DSM - Document Management System',
  description: 'Enterprise Document Management System with Role-Based Access Control',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontVariables} font-sans antialiased`} suppressHydrationWarning>
        <GlobalErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </GlobalErrorBoundary>
        <script dangerouslySetInnerHTML={{
          __html: `
            // Filter extension errors
            if (typeof window !== 'undefined') {
              const originalError = console.error;
              console.error = (...args) => {
                const msg = args[0]?.toString() || '';
                if (!msg.includes('shadowRoot') && !msg.includes('contentScript') && !msg.includes('extension://')) {
                  originalError.apply(console, args);
                }
              };
            }
          `
        }} />
      </body>
    </html>
  )
}