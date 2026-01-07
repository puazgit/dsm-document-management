"use client"

import { useState, useEffect } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { LoadingButton } from "../../../components/ui/loading"
import { useToast } from "../../../hooks/use-toast"
import { Moon, Sun } from "lucide-react"

// Simple inline Label component
const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label 
    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className || ''}`}
    {...props} 
  />
)

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isDark, setIsDark] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  useEffect(() => {
    // Check for saved theme preference (sync with main app)
    const savedTheme = localStorage.getItem('dsmt-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = savedTheme === 'dark' || (savedTheme === 'system' && prefersDark) || (!savedTheme && prefersDark)
    
    setIsDark(shouldBeDark)
    if (shouldBeDark) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    
    if (newIsDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('dsmt-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('dsmt-theme', 'light')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    console.log('[LOGIN] Starting unified login for:', identifier)

    try {
      // Auto-detect login type
      const isEmail = identifier.includes('@')
      // NIP bisa numeric (050361982) atau alphanumeric (PWT2992500)
      const isPotentialNIP = /^[A-Z0-9]+$/.test(identifier) && identifier.length >= 8
      
      // Strategy 1: If email, must be internal login
      if (isEmail) {
        console.log('[LOGIN] Attempting internal login (email)')
        const result = await signIn("credentials", {
          emailOrUsername: identifier,
          password,
          loginType: 'internal',
          redirect: false,
        })

        if (!result?.error) {
          console.log('[LOGIN] Internal login successful')
          toast({
            title: "Login Successful",
            description: "Welcome back!",
          })
          
          await new Promise(resolve => setTimeout(resolve, 100))
          router.push(callbackUrl)
          router.refresh()
          setIsLoading(false)
          return
        }
      }
      
      // Strategy 2: If potential NIP, try SIKAWAN first, then internal username
      if (isPotentialNIP) {
        console.log('[LOGIN] Attempting SIKAWAN login with NIP:', identifier)
        const result = await signIn("sikawan", {
          nip: identifier,
          password,
          redirect: false,
        })

        if (!result?.error) {
          console.log('[LOGIN] SIKAWAN login successful')
          
          // Check if user needs to change password
          const session = await getSession()
          if (session?.user?.mustChangePassword) {
            toast({
              title: "Password Change Required",
              description: "Please change your password before continuing",
            })
            router.push('/profile?changePassword=true')
          } else {
            toast({
              title: "Login Successful",
              description: "Welcome to DSMT!",
            })
            router.push(callbackUrl)
          }
          
          router.refresh()
          setIsLoading(false)
          return
        }
        
        // SIKAWAN failed, try internal username as fallback
        console.log('[LOGIN] SIKAWAN failed, trying internal username')
        const internalResult = await signIn("credentials", {
          emailOrUsername: identifier,
          password,
          loginType: 'internal',
          redirect: false,
        })

        if (!internalResult?.error) {
          console.log('[LOGIN] Internal username login successful')
          toast({
            title: "Login Successful",
            description: "Welcome back!",
          })
          
          await new Promise(resolve => setTimeout(resolve, 100))
          router.push(callbackUrl)
          router.refresh()
          setIsLoading(false)
          return
        }
      }
      
      // Strategy 3: Non-email, non-NIP username (fallback)
      if (!isEmail && !isPotentialNIP) {
        console.log('[LOGIN] Attempting internal login (username)')
        const result = await signIn("credentials", {
          emailOrUsername: identifier,
          password,
          loginType: 'internal',
          redirect: false,
        })

        if (!result?.error) {
          console.log('[LOGIN] Internal login successful')
          toast({
            title: "Login Successful",
            description: "Welcome back!",
          })
          
          await new Promise(resolve => setTimeout(resolve, 100))
          router.push(callbackUrl)
          router.refresh()
          setIsLoading(false)
          return
        }
      }
      
      // All strategies failed
      console.log('[LOGIN] All login attempts failed')
      toast({
        title: "Login Failed",
        description: "Invalid credentials. Please check your email/username/NIP and password.",
        variant: "destructive",
      })
    } catch (error) {
      console.error('[LOGIN] Login error:', error)
      toast({
        title: "Login Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen px-4 py-12 overflow-hidden sm:px-6 lg:px-8">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-blue-950 dark:to-gray-900" />
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute rounded-full -top-40 -right-40 w-80 h-80 bg-blue-400/20 dark:bg-blue-600/10 blur-3xl animate-pulse" />
        <div className="absolute delay-700 rounded-full -bottom-40 -left-40 w-80 h-80 bg-indigo-400/20 dark:bg-indigo-600/10 blur-3xl animate-pulse" />
        <div className="absolute delay-1000 transform -translate-x-1/2 -translate-y-1/2 rounded-full top-1/2 left-1/2 w-96 h-96 bg-purple-400/10 dark:bg-purple-600/5 blur-3xl animate-pulse" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Theme Toggle Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="fixed rounded-full shadow-lg top-4 right-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
        >
          {isDark ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </Button>

        <div className="space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
              Sign in to DSMT
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Dokumen Sistem Manajemen Terpadu
            </p>
          </div>

          <Card className="shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Enter your email, username, or NIK to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="identifier">Email / Username / NIK</Label>
                <Input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your email, username, or NIK"
                  disabled={isLoading}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  You can use your email, username, or NIK
                </p>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
              </div>

              <LoadingButton
                type="submit"
                loading={isLoading}
                className="w-full shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                Sign In
              </LoadingButton>
            </form>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}
