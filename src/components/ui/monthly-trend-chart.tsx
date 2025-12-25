"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { Skeleton } from "./skeleton"
import { format } from "date-fns"

interface MonthlyData {
  month: string
  count: number
}

export function MonthlyTrendChart() {
  const [data, setData] = useState<MonthlyData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/documents/stats')
        if (!response.ok) throw new Error('Failed to fetch stats')
        const stats = await response.json()
        
        // Format monthly stats for chart
        const monthlyData = (stats.monthlyStats || [])
          .map((item: any) => ({
            month: format(new Date(item.month), 'MMM yyyy'),
            count: item.count,
          }))
          .reverse() // Show oldest to newest

        setData(monthlyData)
      } catch (err) {
        console.error('Error fetching monthly data:', err)
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
          <CardTitle>Document Trends</CardTitle>
          <CardDescription>Monthly document creation over time</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document Trends</CardTitle>
          <CardDescription>Monthly document creation over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Trends</CardTitle>
        <CardDescription>Monthly document creation over the last 12 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="month" 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Documents Created"
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
