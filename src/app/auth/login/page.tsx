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
  const [emailOrUsername, setEmailOrUsername] = useState("")
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

    console.log('[LOGIN] Starting login, callbackUrl:', callbackUrl)

    try {
      const result = await signIn("credentials", {
        emailOrUsername,
        password,
        redirect: false,
      })

      if (result?.error) {
        console.log('[LOGIN] Login failed:', result.error)
        toast({
          title: "Login Failed",
          description: "Invalid email/username or password",
          variant: "destructive",
        })
      } else {
        console.log('[LOGIN] Login successful, redirecting to:', callbackUrl)
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        })
        
        // Wait a moment for session to be established
        await new Promise(resolve => setTimeout(resolve, 100))
        
        router.push(callbackUrl)
        router.refresh() // Force refresh to update session
      }
    } catch (error) {
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
    <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-gray-50 dark:bg-gray-900 sm:px-6 lg:px-8">
      {/* Theme Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className="fixed top-4 right-4 rounded-full"
      >
        {isDark ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </Button>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Sign in to DSMT
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Dokumen Sistem Manajemen Terpadu
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="emailOrUsername">Email or Username</Label>
                <Input
                  id="emailOrUsername"
                  name="emailOrUsername"
                  type="text"
                  autoComplete="username"
                  required
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="Enter your email or username"
                />
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
                />
              </div>

              <LoadingButton
                type="submit"
                loading={isLoading}
                className="w-full"
              >
                Sign In
              </LoadingButton>
            </form>

            <div className="mt-6">
              <div className="text-sm text-center text-gray-600 dark:text-gray-400">
                <p>Demo Credentials (use email or username):</p>
                <div className="p-3 mt-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                  <p className="font-mono text-xs dark:text-gray-300">
                    <strong>Admin:</strong> admin@dsm.com or username / admin123<br />
                    <strong>PPD:</strong> ppd@dsm.com or username / ppd123<br />
                    <strong>Manager:</strong> manager@dsm.com or username / manager123<br />
                    <strong>Member:</strong> member@dsm.com or username / member123
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
