"use client"

import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { Skeleton } from "./skeleton"

interface StatusData {
  name: string
  value: number
  color: string
  [key: string]: string | number // Index signature for Recharts
}

const STATUS_COLORS = {
  DRAFT: "#94a3b8",
  PENDING_REVIEW: "#fbbf24",
  PENDING_APPROVAL: "#f97316",
  APPROVED: "#10b981",
  PUBLISHED: "#3b82f6",
  REJECTED: "#ef4444",
  ARCHIVED: "#6b7280",
}

export function DocumentStatusChart() {
  const [data, setData] = useState<StatusData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/documents/stats')
        if (!response.ok) throw new Error('Failed to fetch stats')
        const stats = await response.json()
        
        const statusData: StatusData[] = [
          { name: 'Draft', value: stats.overview.draftDocuments, color: STATUS_COLORS.DRAFT },
          { name: 'Pending', value: stats.overview.pendingDocuments, color: STATUS_COLORS.PENDING_APPROVAL },
          { name: 'Approved', value: stats.overview.approvedDocuments, color: STATUS_COLORS.APPROVED },
          { name: 'Archived', value: stats.overview.archivedDocuments, color: STATUS_COLORS.ARCHIVED },
        ].filter(item => item.value > 0)

        const totalDocs = statusData.reduce((sum, item) => sum + item.value, 0)
        setTotal(totalDocs)
        setData(statusData)
      } catch (err) {
        console.error('Error fetching status data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document Status</CardTitle>
          <CardDescription>Distribution of documents by status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <Skeleton className="h-[250px] w-[250px] rounded-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document Status</CardTitle>
          <CardDescription>Distribution of documents by status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No documents found
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Status</CardTitle>
        <CardDescription>
          Distribution of {total.toLocaleString()} documents by status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number | undefined) => [`${value || 0} documents`, 'Count']}
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
