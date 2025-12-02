'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

export default function TestPage() {
  const { data: session, status } = useSession()
  const [testResults, setTestResults] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Auto-run tests when page loads
    const runTests = async () => {
      console.log('Running automated tests...')
      
      // Test 1: Auth credentials
      try {
        const authResponse = await fetch('/api/test-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@dsm.com', password: 'admin123' })
        })
        const authData = await authResponse.json()
        setTestResults(prev => ({ ...prev, authTest: { status: authResponse.status, data: authData } }))
      } catch (error) {
        setTestResults(prev => ({ ...prev, authTest: { error: error?.toString() } }))
      }

      // Test 2: Session API
      try {
        const sessionResponse = await fetch('/api/test-session')
        const sessionData = await sessionResponse.json()
        setTestResults(prev => ({ ...prev, sessionTest: sessionData }))
      } catch (error) {
        setTestResults(prev => ({ ...prev, sessionTest: { error: error?.toString() } }))
      }

      // Test 3: Users API (will likely fail without session)
      try {
        const usersResponse = await fetch('/api/users?page=1&limit=5')
        const usersData = await usersResponse.json()
        setTestResults(prev => ({ ...prev, usersAPI: { status: usersResponse.status, data: usersData } }))
      } catch (error) {
        setTestResults(prev => ({ ...prev, usersAPI: { error: error?.toString() } }))
      }
    }

    runTests()
  }, [])

  const testAuth = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@dsm.com',
          password: 'admin123'
        })
      })
      const data = await response.json()
      setTestResults((prev: Record<string, any>) => ({ ...prev, authTest: { status: response.status, data } }))
    } catch (error) {
      setTestResults((prev: Record<string, any>) => ({ ...prev, authTest: { error: error?.toString() } }))
    }
    setLoading(false)
  }

  const testSession = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-session')
      const data = await response.json()
      setTestResults((prev: Record<string, any>) => ({ ...prev, sessionTest: data }))
    } catch (error) {
      setTestResults((prev: Record<string, any>) => ({ ...prev, sessionTest: { error: error?.toString() } }))
    }
    setLoading(false)
  }

  const testUsersAPI = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/users?page=1&limit=5')
      const data = await response.json()
      setTestResults((prev: Record<string, any>) => ({ ...prev, usersAPI: { status: response.status, data } }))
    } catch (error) {
      setTestResults((prev: Record<string, any>) => ({ ...prev, usersAPI: { error: error?.toString() } }))
    }
    setLoading(false)
  }

  if (status === 'loading') {
    return <div className="p-8">Loading session...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Session & API Test</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Current Session Status</h2>
        <p><strong>Status:</strong> {status}</p>
        <p><strong>Authenticated:</strong> {session ? 'Yes' : 'No'}</p>
        {session && (
          <div className="mt-2">
            <p><strong>User Email:</strong> {session.user?.email}</p>
            <p><strong>User Name:</strong> {session.user?.name}</p>
            <p><strong>User Role:</strong> {(session.user as any)?.role}</p>
            <p><strong>Group ID:</strong> {(session.user as any)?.groupId}</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <button
          onClick={testAuth}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Test Auth Credentials
        </button>

        <button
          onClick={testSession}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Test Session API
        </button>

        <button
          onClick={testUsersAPI}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Test Users API
        </button>

        {Object.keys(testResults).length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">Test Results</h2>
            <pre className="bg-black text-green-400 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}