import Link from 'next/link'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

export default function HomePage() {
  return (
    <div className="container p-8 mx-auto">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">DSMT - Dokumen Sistem Manajemen Terpadu</h1>
        <p className="mb-8 text-xl text-muted-foreground">
          Enterprise Document Management with Role-Based Access Control
        </p>
        
        <div className="flex justify-center gap-4">
          <Button asChild>
            <Link href="/auth/login">Login to DSM</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-12 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Document Management</CardTitle>
            <CardDescription>
              Complete document lifecycle management with version control
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Upload & organize documents</li>
              <li>• Version history tracking</li>
              <li>• Advanced search & filtering</li>
              <li>• Document approval workflows</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role-Based Access</CardTitle>
            <CardDescription>
              9-level hierarchical permission system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Super Admin to Guest levels</li>
              <li>• Department-based groups</li>
              <li>• Granular permissions</li>
              <li>• Audit trail logging</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Real-time Collaboration</CardTitle>
            <CardDescription>
              Live comments and notification system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Live commenting system</li>
              <li>• Real-time notifications</li>
              <li>• WebSocket integration</li>
              <li>• Activity monitoring</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <h2 className="mb-4 text-2xl font-bold">Development Status</h2>
        <div className="grid max-w-4xl grid-cols-1 gap-4 mx-auto md:grid-cols-2">
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800">✅ Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-green-700">
                <li>• Database schema & seeding</li>
                <li>• Docker infrastructure</li>
                <li>• Core utilities (Auth, Validation)</li>
                <li>• Base UI Components</li>
                <li>• TypeScript type definitions</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800">🚧 Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-blue-700">
                <li>• Authentication system</li>
                <li>• API routes development</li>
                <li>• Dashboard & navigation</li>
                <li>• Document upload system</li>
                <li>• Real-time features</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}