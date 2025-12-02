import Link from 'next/link'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

export default function HomePage() {
  return (
    <div className="container mx-auto p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">DSM - Document Management System</h1>
        <p className="text-xl text-muted-foreground mb-8">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
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
        <h2 className="text-2xl font-bold mb-4">Development Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800">✅ Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Database schema & seeding</li>
                <li>• Docker infrastructure</li>
                <li>• Core utilities (Auth, Validation)</li>
                <li>• Base UI Components</li>
                <li>• TypeScript type definitions</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800">🚧 Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-blue-700 space-y-1">
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