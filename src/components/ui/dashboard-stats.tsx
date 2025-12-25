"use client"

import { useEffect, useState } from "react"
import { FileText, Users, Upload, Eye, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Skeleton } from "./skeleton"

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  icon: React.ElementType
  trend?: "up" | "down" | "neutral"
  isLoading?: boolean
}

function StatCard({ title, value, change, icon: Icon, trend = "neutral", isLoading = false }: StatCardProps) {
  const trendColors = {
    up: "text-green-600",
    down: "text-red-600", 
    neutral: "text-gray-600"
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-[120px] mb-2" />
          <Skeleton className="h-3 w-[140px]" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {change && (
          <p className={`text-xs ${trendColors[trend]} mt-1 flex items-center gap-1`}>
            {trend === "up" && <TrendingUp className="h-3 w-3" />}
            {trend === "down" && <TrendingDown className="h-3 w-3" />}
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardStats() {
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/documents/stats')
        if (!response.ok) throw new Error('Failed to fetch stats')
        const data = await response.json()
        setStats(data)
      } catch (err) {
        console.error('Error fetching stats:', err)
        setError('Failed to load statistics')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statsData = stats?.overview ? [
    {
      title: "Total Documents",
      value: stats.overview.totalDocuments.toLocaleString(),
      change: stats.overview.recentChangePercentage > 0 
        ? `+${stats.overview.recentChangePercentage}% from last month`
        : `${stats.overview.recentChangePercentage}% from last month`,
      icon: FileText,
      trend: stats.overview.recentChangePercentage > 0 ? "up" as const : stats.overview.recentChangePercentage < 0 ? "down" as const : "neutral" as const,
    },
    {
      title: "My Documents",
      value: stats.overview.myDocuments.toLocaleString(),
      change: `${stats.overview.pendingDocuments} pending review`, 
      icon: Users,
      trend: "neutral" as const,
    },
    {
      title: "Total Views",
      value: (stats.overview.totalViews || 0).toLocaleString(),
      change: `${stats.overview.totalDownloads || 0} downloads`,
      icon: Eye,
      trend: "neutral" as const,
    },
    {
      title: "Approved Docs", 
      value: stats.overview.approvedDocuments.toLocaleString(),
      change: `${stats.overview.draftDocuments} drafts`,
      icon: Upload,
      trend: "neutral" as const,
    },
  ] : []

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {isLoading ? (
        // Show 4 skeleton cards
        Array.from({ length: 4 }).map((_, i) => (
          <StatCard 
            key={i} 
            title="" 
            value="" 
            icon={FileText} 
            isLoading={true} 
          />
        ))
      ) : (
        statsData.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))
      )}
    </div>
  )
}