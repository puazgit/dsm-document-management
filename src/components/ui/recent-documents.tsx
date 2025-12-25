"use client"

import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { FileText, Download, Eye, MoreHorizontal } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table"
import { Button } from "./button"
import { Skeleton } from "./skeleton"
import Link from "next/link"

interface Document {
  id: string
  title: string
  documentType?: {
    name: string
    icon?: string
    color?: string
  }
  fileSize?: number
  createdBy: {
    firstName: string
    lastName: string
  }
  createdAt: string
  viewCount: number
}

export function RecentDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchDocuments() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/documents/stats')
        if (!response.ok) throw new Error('Failed to fetch documents')
        const data = await response.json()
        setDocuments(data.recentDocuments || [])
      } catch (err) {
        console.error('Error fetching documents:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDocuments()
  }, [])

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A'
    const mb = bytes / (1024 * 1024)
    if (mb < 1) return `${Math.round(bytes / 1024)} KB`
    return `${mb.toFixed(1)} MB`
  }

  const getFileIcon = (type?: string) => {
    return <FileText className="h-4 w-4 text-blue-600" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Documents</CardTitle>
        <CardDescription>
          Latest uploaded documents in the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-3 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No documents found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Views</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {getFileIcon(doc.documentType?.name)}
                      <div>
                        <Link href={`/documents/${doc.id}`}>
                          <div className="font-medium text-foreground hover:text-blue-600">
                            {doc.title}
                          </div>
                        </Link>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
                      {doc.documentType?.name || 'Unknown'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatFileSize(doc.fileSize)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {doc.createdBy.firstName} {doc.createdBy.lastName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Eye className="h-3 w-3" />
                      <span>{doc.viewCount || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Link href={`/documents/${doc.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}