"use client"

import { useEffect, useState } from "react"
import { Trophy, TrendingUp, Award, Star } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { Skeleton } from "./skeleton"
import { Avatar, AvatarFallback } from "./avatar"

interface UserPerformance {
  id: string
  name: string
  email: string
  documentsCreated: number
  totalViews: number
  totalDownloads: number
  score: number
}

export function UserPerformanceWidget() {
  const [topUsers, setTopUsers] = useState<UserPerformance[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchUserPerformance() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/users/performance?limit=5')
        if (!response.ok) throw new Error('Failed to fetch user performance')
        const data = await response.json()
        setTopUsers(data.topUsers || [])
      } catch (err) {
        console.error('Error fetching user performance:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserPerformance()
    const interval = setInterval(fetchUserPerformance, 120000) // Refresh every 2 minutes
    return () => clearInterval(interval)
  }, [])

  const getMedalIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 1:
        return <Award className="h-5 w-5 text-gray-400" />
      case 2:
        return <Star className="h-5 w-5 text-orange-600" />
      default:
        return <TrendingUp className="h-5 w-5 text-blue-500" />
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top Contributors
          </CardTitle>
          <CardDescription>Most active users this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-3 w-[100px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (topUsers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top Contributors
          </CardTitle>
          <CardDescription>Most active users this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No performance data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Top Contributors
        </CardTitle>
        <CardDescription>Most active users this month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topUsers.map((user, index) => (
            <div
              key={user.id}
              className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                index === 1 ? 'bg-gray-50 border border-gray-200' :
                index === 2 ? 'bg-orange-50 border border-orange-200' :
                'hover:bg-accent/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {getMedalIcon(index)}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-blue-500 text-white">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{user.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                  <span>{user.documentsCreated} docs</span>
                  <span>•</span>
                  <span>{user.totalViews} views</span>
                  <span>•</span>
                  <span>{user.totalDownloads} downloads</span>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">
                  {user.score}
                </div>
                <div className="text-xs text-muted-foreground">points</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
