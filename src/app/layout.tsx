import type { Metadata } from 'next'
import { fontVariables } from '../lib/fonts'
import { Providers } from '../components/providers'
import { GlobalErrorBoundary } from '../components/error-boundary'
import { LoadingOptimizer } from '../components/loading-optimizer'
import './globals.css'

export const metadata: Metadata = {
  title: 'DSMT - Dokumen Sistem Manajemen Terpadu',
  description: 'Enterprise Document Management System with Role-Based Access Control',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontVariables} font-sans antialiased`} suppressHydrationWarning>
        <LoadingOptimizer />
        <GlobalErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </GlobalErrorBoundary>
        <script dangerouslySetInnerHTML={{
          __html: `
            // Enhanced error filtering and performance optimization
            if (typeof window !== 'undefined') {
              // Filter extension and development errors
              const originalError = console.error;
              console.error = function(...args) {
                const msg = args[0] ? args[0].toString() : '';
                if (!msg.includes('shadowRoot') && 
                    !msg.includes('contentScript') && 
                    !msg.includes('extension://') &&
                    !msg.includes('Invalid or unexpected token') &&
                    !msg.includes('React DevTools')) {
                  originalError.apply(console, args);
                }
              };
              
              // Reduce layout shift
              document.documentElement.style.visibility = 'visible';
            }
          `
        }} />
      </body>
    </html>
  )
}