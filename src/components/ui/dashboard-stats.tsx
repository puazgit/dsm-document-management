"use client"

import { FileText, Users, Upload, Eye } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  icon: React.ElementType
  trend?: "up" | "down" | "neutral"
}

function StatCard({ title, value, change, icon: Icon, trend = "neutral" }: StatCardProps) {
  const trendColors = {
    up: "text-green-600",
    down: "text-red-600", 
    neutral: "text-gray-600"
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
          <p className={`text-xs ${trendColors[trend]} mt-1`}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardStats() {
  // Mock data - will be replaced with real API calls later
  const stats = [
    {
      title: "Total Documents",
      value: "1,284",
      change: "+12% from last month",
      icon: FileText,
      trend: "up" as const,
    },
    {
      title: "Active Users",
      value: "45",
      change: "+3% from last month", 
      icon: Users,
      trend: "up" as const,
    },
    {
      title: "Documents Uploaded",
      value: "23",
      change: "This month",
      icon: Upload,
      trend: "neutral" as const,
    },
    {
      title: "Total Views", 
      value: "8,547",
      change: "+18% from last month",
      icon: Eye,
      trend: "up" as const,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  )
}