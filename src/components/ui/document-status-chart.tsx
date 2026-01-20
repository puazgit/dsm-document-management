"use client"

import { useEffect, useState, useRef } from "react"
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { Skeleton } from "./skeleton"

interface StatusData {
  name: string
  y: number
  color: string
}

const STATUS_COLORS = {
  DRAFT: "#60a5fa",           // Blue
  IN_REVIEW: "#fb923c",       // Orange  
  PENDING_APPROVAL: "#f59e0b", // Amber
  APPROVED: "#10b981",        // Green
  PUBLISHED: "#3b82f6",       // Blue
  REJECTED: "#ef4444",        // Red
  ARCHIVED: "#6b7280",        // Gray
  EXPIRED: "#8b5cf6",         // Purple
}

export function DocumentStatusChart() {
  const [data, setData] = useState<StatusData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [chartReady, setChartReady] = useState(false)
  const chartRef = useRef<HighchartsReact.RefObject>(null)

  // Initialize 3D module on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('highcharts/highcharts-3d').then((module) => {
        // Call the module as a function directly
        if (typeof module === 'function') {
          module(Highcharts)
        } else if (module.default && typeof module.default === 'function') {
          module.default(Highcharts)
        }
        setChartReady(true)
      }).catch((err) => {
        console.error('Failed to load Highcharts 3D module:', err)
        setChartReady(true) // Still show chart, just without 3D
      })
    }
  }, [])

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/documents/stats')
        if (!response.ok) throw new Error('Failed to fetch stats')
        const stats = await response.json()
        
        const statusData: StatusData[] = [
          { name: 'Draft', y: stats.overview.draftDocuments, color: STATUS_COLORS.DRAFT },
          { name: 'In Review', y: stats.overview.inReviewDocuments || 0, color: STATUS_COLORS.IN_REVIEW },
          { name: 'Pending', y: stats.overview.pendingDocuments, color: STATUS_COLORS.PENDING_APPROVAL },
          { name: 'Approved', y: stats.overview.approvedDocuments, color: STATUS_COLORS.APPROVED },
          { name: 'Published', y: stats.overview.publishedDocuments || 0, color: STATUS_COLORS.PUBLISHED },
          { name: 'Rejected', y: stats.overview.rejectedDocuments || 0, color: STATUS_COLORS.REJECTED },
          { name: 'Archived', y: stats.overview.archivedDocuments, color: STATUS_COLORS.ARCHIVED },
          { name: 'Expired', y: stats.overview.expiredDocuments || 0, color: STATUS_COLORS.EXPIRED },
        ].filter(item => item.y > 0)

        const totalDocs = statusData.reduce((sum, item) => sum + item.y, 0)
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

  if (isLoading || !chartReady) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document Status</CardTitle>
          <CardDescription>Distribution of documents by status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <Skeleton className="h-[350px] w-full" />
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
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            No documents found
          </div>
        </CardContent>
      </Card>
    )
  }

  // Highcharts 3D Pie configuration
  const options: Highcharts.Options = {
    chart: {
      type: 'pie',
      backgroundColor: 'transparent',
      height: 400,
      options3d: {
        enabled: true,
        alpha: 45,
        beta: 0
      }
    },
    title: {
      text: undefined
    },
    tooltip: {
      pointFormat: '<b>{point.y}</b> documents ({point.percentage:.1f}%)',
      style: {
        fontSize: '12px'
      }
    },
    accessibility: {
      point: {
        valueSuffix: ' documents'
      }
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        depth: 35,
        dataLabels: {
          enabled: true,
          format: '<b>{point.name}</b><br>{point.y}',
          style: {
            fontSize: '11px',
            textOutline: '1px contrast',
            color: '#ffffff'
          },
          distance: -30
        },
        showInLegend: true
      }
    },
    legend: {
      align: 'center',
      verticalAlign: 'bottom',
      layout: 'horizontal',
      itemStyle: {
        fontSize: '12px',
        fontWeight: '400'
      }
    },
    series: [{
      type: 'pie',
      name: 'Documents',
      data: data
    }],
    credits: {
      enabled: false
    }
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
        <HighchartsReact
          highcharts={Highcharts}
          options={options}
          ref={chartRef}
        />
      </CardContent>
    </Card>
  )
}
