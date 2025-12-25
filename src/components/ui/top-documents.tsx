"use client"

import { useEffect, useState } from "react"
import { Eye, Download, TrendingUp, FileText } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { Skeleton } from "./skeleton"
import Link from "next/link"

interface TopDocument {
  id: string
  title: string
  viewCount?: number
  downloadCount?: number
  documentType?: {
    name: string
    icon?: string
    color?: string
  }
  createdBy: {
    firstName: string
    lastName: string
  }
}

interface TopDocumentsProps {
  type: "views" | "downloads"
}

export function TopDocuments({ type }: TopDocumentsProps) {
  const [documents, setDocuments] = useState<TopDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/documents/stats')
        if (!response.ok) throw new Error('Failed to fetch stats')
        const data = await response.json()
        
        if (type === 'downloads') {
          setDocuments(data.topDownloadedDocuments || [])
        } else {
          // For views, we need to sort recentDocuments by viewCount
          const sortedByViews = [...(data.recentDocuments || [])]
            .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
            .slice(0, 5)
          setDocuments(sortedByViews)
        }
      } catch (err) {
        console.error('Error fetching top documents:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [type])

  const icon = type === 'downloads' ? Download : Eye
  const Icon = icon
  const title = type === 'downloads' ? 'Most Downloaded' : 'Most Viewed'
  const description = type === 'downloads' 
    ? 'Top documents by download count' 
    : 'Top documents by view count'
  const countKey = type === 'downloads' ? 'downloadCount' : 'viewCount'

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded" />
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
            <Icon className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No documents found
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {documents.map((doc, index) => {
            const count = type === 'downloads' ? doc.downloadCount : doc.viewCount
            return (
              <div
                key={doc.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-accent/5 ${
                  index === 0 ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    index === 0 ? 'bg-blue-600 text-white' :
                    index === 1 ? 'bg-blue-500 text-white' :
                    index === 2 ? 'bg-blue-400 text-white' :
                    'bg-gray-200 text-gray-600'
                  } font-bold text-sm`}>
                    {index + 1}
                  </div>
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/documents/${doc.id}`}
                    className="font-medium text-sm hover:text-blue-600 truncate block"
                  >
                    {doc.title}
                  </Link>
                  <div className="text-xs text-muted-foreground mt-1">
                    {doc.createdBy.firstName} {doc.createdBy.lastName}
                    {doc.documentType && (
                      <>
                        {' • '}
                        <span>{doc.documentType.name}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-right">
                  <div className="flex flex-col items-end">
                    <div className="text-lg font-bold text-blue-600">
                      {(count || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Icon className="h-3 w-3" />
                      {type === 'downloads' ? 'downloads' : 'views'}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 pt-4 border-t">
          <Link
            href="/documents"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all documents →
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
