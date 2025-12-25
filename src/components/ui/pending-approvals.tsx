"use client"

import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Clock, CheckCircle, XCircle, Eye } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { Skeleton } from "./skeleton"
import { Badge } from "./badge"
import Link from "next/link"

interface PendingDocument {
  id: string
  title: string
  status: string
  createdBy: {
    firstName: string
    lastName: string
  }
  createdAt: string
  documentType?: {
    name: string
  }
}

export function PendingApprovals() {
  const [documents, setDocuments] = useState<PendingDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingDocuments()
    const interval = setInterval(fetchPendingDocuments, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchPendingDocuments() {
    try {
      setIsLoading(true)
      const response = await fetch('/api/documents?status=PENDING_REVIEW,PENDING_APPROVAL&limit=5')
      if (!response.ok) throw new Error('Failed to fetch pending documents')
      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (err) {
      console.error('Error fetching pending documents:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (docId: string) => {
    try {
      setActionLoading(docId)
      const response = await fetch(`/api/documents/${docId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      })
      
      if (response.ok) {
        await fetchPendingDocuments()
      }
    } catch (err) {
      console.error('Error approving document:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending Review</Badge>
      case 'PENDING_APPROVAL':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Pending Approval</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Approvals
          </CardTitle>
          <CardDescription>Documents awaiting your review</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-16 w-16 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[150px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Approvals
          </CardTitle>
          <CardDescription>Documents awaiting your review</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <p className="text-muted-foreground">All caught up! No pending approvals.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending Approvals
          <Badge variant="secondary" className="ml-auto">{documents.length}</Badge>
        </CardTitle>
        <CardDescription>Documents awaiting your review</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {documents.map((doc) => (
            <div 
              key={doc.id} 
              className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link href={`/documents/${doc.id}`} className="font-medium hover:text-blue-600 truncate">
                    {doc.title}
                  </Link>
                  {getStatusBadge(doc.status)}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">
                    {doc.createdBy.firstName} {doc.createdBy.lastName}
                  </span>
                  {' • '}
                  <span>{formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}</span>
                  {doc.documentType && (
                    <>
                      {' • '}
                      <span className="text-xs">{doc.documentType.name}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/documents/${doc.id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </Link>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => handleApprove(doc.id)}
                  disabled={actionLoading === doc.id}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {actionLoading === doc.id ? 'Approving...' : 'Approve'}
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {documents.length >= 5 && (
          <div className="mt-4 pt-4 border-t">
            <Link href="/documents?status=pending" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all pending documents →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
