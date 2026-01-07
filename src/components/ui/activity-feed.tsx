"use client"

import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { 
  FileText, 
  Upload, 
  User, 
  Settings, 
  Eye,
  MessageCircle,
  UserPlus,
  CheckCircle,
  XCircle,
  Archive,
  Download as DownloadIcon
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { Skeleton } from "./skeleton"
import Link from "next/link"

interface ActivityItem {
  id: string
  type: string
  user: string
  userId?: string
  description: string
  timestamp: string
  target?: string
  documentId?: string
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchActivities() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/activities/recent?limit=10')
        if (!response.ok) throw new Error('Failed to fetch activities')
        const data = await response.json()
        setActivities(data)
      } catch (err) {
        console.error('Error fetching activities:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchActivities()
    // Refresh activities every 30 seconds
    const interval = setInterval(fetchActivities, 30000)
    return () => clearInterval(interval)
  }, [])

  const getActivityIcon = (type: string) => {
    const iconProps = { className: "h-4 w-4" }
    
    switch (type.toLowerCase()) {
      case "created":
      case "upload":
        return <Upload {...iconProps} className="h-4 w-4 text-blue-600" />
      case "viewed":
      case "view":
        return <Eye {...iconProps} className="h-4 w-4 text-green-600" />
      case "commented":
      case "comment":
        return <MessageCircle {...iconProps} className="h-4 w-4 text-purple-600 dark:text-purple-400" />
      case "approved":
        return <CheckCircle {...iconProps} className="h-4 w-4 text-green-600 dark:text-green-400" />
      case "rejected":
        return <XCircle {...iconProps} className="h-4 w-4 text-red-600 dark:text-red-400" />
      case "downloaded":
        return <DownloadIcon {...iconProps} className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      case "archived":
        return <Archive {...iconProps} className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      case "user_added":
        return <UserPlus {...iconProps} className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      case 'settings_changed':
      case 'updated':
        return <Settings {...iconProps} className="h-4 w-4 text-muted-foreground" />
      default:
        return <FileText {...iconProps} className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "created":
      case "upload":
        return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
      case "viewed":
      case "view":
        return "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
      case "comment":
        return "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20"
      case "approved":
        return "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
      case "rejected":
        return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
      case "downloaded":
        return "border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20"
      case "archived":
        return "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
      case "user_added":
        return "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20"
      case "settings_changed":
      case "updated":
        return "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
      default:
        return "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Latest system activity and user actions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[150px]" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recent activity
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full border ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground">
                      <span className="font-medium">{activity.user}</span>{" "}
                      {activity.documentId ? (
                        <Link 
                          href={`/documents/${activity.documentId}`}
                          className="hover:underline text-blue-600 dark:text-blue-400"
                        >
                          {activity.description}
                        </Link>
                      ) : (
                        <span>{activity.description}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Link 
                href="/documents" 
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                View all activity
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}