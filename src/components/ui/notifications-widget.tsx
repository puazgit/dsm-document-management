"use client"

import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Bell, Check, X, FileText, UserPlus, AlertCircle, CheckCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { Skeleton } from "./skeleton"
import Link from "next/link"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  documentId?: string
  userId?: string
}

export function NotificationsWidget() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  async function fetchNotifications() {
    try {
      setIsLoading(true)
      const response = await fetch('/api/notifications?limit=10')
      if (!response.ok) throw new Error('Failed to fetch notifications')
      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      })
      if (response.ok) {
        await fetchNotifications()
      }
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      })
      if (response.ok) {
        await fetchNotifications()
      }
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'document':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'user':
        return <UserPlus className="h-4 w-4 text-green-600 dark:text-green-400" />
      case 'approval':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
      case 'alert':
        return <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      default:
        return <Bell className="h-4 w-4 text-gray-600 dark:text-gray-400" />
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </div>
          </CardTitle>
          <CardDescription>Recent updates and alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </CardTitle>
        <CardDescription>Recent updates and alerts</CardDescription>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  notification.isRead
                    ? 'bg-background'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                }`}
              >
                <div className={`p-2 rounded-full ${notification.isRead ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'}`}>
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {notification.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                    
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  
                  {notification.documentId && (
                    <Link
                      href={`/documents/${notification.documentId}`}
                      className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                    >
                      View document →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {notifications.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Link
              href="/notifications"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all notifications →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
