"use client"

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "./theme-provider"
import { Toaster } from "../components/ui/toaster"

export function Providers({ 
  children,
  session 
}: {
  children: React.ReactNode
  session?: any
}) {
  return (
    <ThemeProvider 
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="dsmt-theme"
    >
      <SessionProvider session={session}>
        {children}
        <Toaster />
      </SessionProvider>
    </ThemeProvider>
  )
}