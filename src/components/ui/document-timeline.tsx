"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Calendar, FileText, CheckCircle, XCircle, Clock, Archive } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { Skeleton } from "./skeleton"
import Link from "next/link"

interface TimelineEvent {
  id: string
  documentId: string
  documentTitle: string
  action: string
  user: string
  timestamp: string
  status?: string
}

export function DocumentTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchTimeline() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/activities/recent?limit=15')
        if (!response.ok) throw new Error('Failed to fetch timeline')
        const data = await response.json()
        
        // Map activities to timeline events
        const timelineEvents = data.map((activity: any) => ({
          id: activity.id,
          documentId: activity.documentId,
          documentTitle: activity.target || 'Unknown document',
          action: activity.type,
          user: activity.user,
          timestamp: activity.timestamp,
        }))
        
        setEvents(timelineEvents)
      } catch (err) {
        console.error('Error fetching timeline:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTimeline()
    const interval = setInterval(fetchTimeline, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'archived':
        return <Archive className="h-4 w-4 text-gray-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
        return 'border-blue-500 bg-blue-50'
      case 'approved':
        return 'border-green-500 bg-green-50'
      case 'rejected':
        return 'border-red-500 bg-red-50'
      case 'archived':
        return 'border-gray-500 bg-gray-50'
      default:
        return 'border-gray-300 bg-gray-50'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Document Timeline
          </CardTitle>
          <CardDescription>Recent document activities in chronological order</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-4">
                <Skeleton className="h-8 w-8 rounded-full" />
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

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Document Timeline
          </CardTitle>
          <CardDescription>Recent document activities in chronological order</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No recent activities
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Document Timeline
        </CardTitle>
        <CardDescription>Recent document activities in chronological order</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />
          
          <div className="space-y-4">
            {events.map((event, index) => (
              <div key={event.id} className="relative flex items-start gap-4">
                {/* Timeline dot */}
                <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${getActionColor(event.action)}`}>
                  {getActionIcon(event.action)}
                </div>
                
                {/* Event content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        <span className="text-muted-foreground">{event.user}</span>
                        {' '}
                        <span className="text-foreground">{event.action}</span>
                      </div>
                      {event.documentId ? (
                        <Link
                          href={`/documents/${event.documentId}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {event.documentTitle}
                        </Link>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {event.documentTitle}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(event.timestamp), 'MMM dd, HH:mm')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
