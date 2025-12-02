'use client'

import { useState, useEffect } from 'react'
import { withAuth } from '@/components/auth/with-auth'
import { DashboardLayout } from '@/components/ui/dashboard-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  FileText,
  Download,
  Eye,
  Calendar,
  PieChart,
  Activity,
  Globe,
  Shield
} from 'lucide-react'

interface AnalyticsData {
  overview: {
    totalUsers: number
    activeUsers: number
    totalDocuments: number
    totalDownloads: number
    totalViews: number
    storageUsed: number
  }
  userActivity: {
    date: string
    activeUsers: number
    newUsers: number
    loginCount: number
  }[]
  documentStats: {
    type: string
    count: number
    downloads: number
    views: number
  }[]
  topDocuments: {
    id: string
    title: string
    type: string
    downloads: number
    views: number
    createdAt: string
  }[]
  userStats: {
    id: string
    name: string
    email: string
    role: string
    documentsCreated: number
    lastLogin: string
  }[]
  systemMetrics: {
    cpuUsage: number
    memoryUsage: number
    diskUsage: number
    activeConnections: number
  }
}

function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/analytics?period=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      } else {
        throw new Error('Failed to fetch analytics')
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      // Set mock data for demonstration
      setAnalytics({
        overview: {
          totalUsers: 125,
          activeUsers: 89,
          totalDocuments: 1847,
          totalDownloads: 3254,
          totalViews: 12847,
          storageUsed: 2.4
        },
        userActivity: [
          { date: '2024-10-15', activeUsers: 45, newUsers: 3, loginCount: 67 },
          { date: '2024-10-16', activeUsers: 52, newUsers: 5, loginCount: 78 },
          { date: '2024-10-17', activeUsers: 48, newUsers: 2, loginCount: 71 },
          { date: '2024-10-18', activeUsers: 61, newUsers: 7, loginCount: 89 },
          { date: '2024-10-19', activeUsers: 55, newUsers: 4, loginCount: 82 },
          { date: '2024-10-20', activeUsers: 67, newUsers: 6, loginCount: 95 },
          { date: '2024-10-21', activeUsers: 59, newUsers: 3, loginCount: 86 }
        ],
        documentStats: [
          { type: 'Panduan Sistem Manajemen', count: 245, downloads: 892, views: 2341 },
          { type: 'Prosedur', count: 178, downloads: 654, views: 1876 },
          { type: 'Instruksi Kerja', count: 156, downloads: 432, views: 1234 },
          { type: 'Form', count: 134, downloads: 378, views: 987 },
          { type: 'Laporan', count: 98, downloads: 234, views: 654 }
        ],
        topDocuments: [
          {
            id: '1',
            title: 'Panduan Onboarding Karyawan Baru',
            type: 'Panduan',
            downloads: 234,
            views: 567,
            createdAt: '2024-09-15'
          },
          {
            id: '2',
            title: 'SOP Persetujuan Dokumen',
            type: 'Prosedur',
            downloads: 189,
            views: 445,
            createdAt: '2024-09-20'
          },
          {
            id: '3',
            title: 'Form Pengajuan Cuti',
            type: 'Form',
            downloads: 167,
            views: 389,
            createdAt: '2024-09-10'
          }
        ],
        userStats: [
          {
            id: '1',
            name: 'John Doe',
            email: 'john@dsm.com',
            role: 'Administrator',
            documentsCreated: 45,
            lastLogin: '2024-10-21 09:30:00'
          },
          {
            id: '2',
            name: 'Jane Smith',
            email: 'jane@dsm.com',
            role: 'Manager',
            documentsCreated: 32,
            lastLogin: '2024-10-21 08:15:00'
          }
        ],
        systemMetrics: {
          cpuUsage: 45,
          memoryUsage: 67,
          diskUsage: 34,
          activeConnections: 89
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p>Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics & Reports</h1>
            <p className="text-muted-foreground">
              System analytics and performance metrics
            </p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Users</p>
                      <p className="text-2xl font-bold">{analytics?.overview.totalUsers}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Users</p>
                      <p className="text-2xl font-bold">{analytics?.overview.activeUsers}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Documents</p>
                      <p className="text-2xl font-bold">{analytics?.overview.totalDocuments}</p>
                    </div>
                    <FileText className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Downloads</p>
                      <p className="text-2xl font-bold">{analytics?.overview.totalDownloads}</p>
                    </div>
                    <Download className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Views</p>
                      <p className="text-2xl font-bold">{analytics?.overview.totalViews}</p>
                    </div>
                    <Eye className="h-8 w-8 text-cyan-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Storage</p>
                      <p className="text-2xl font-bold">{analytics?.overview.storageUsed} GB</p>
                    </div>
                    <Globe className="h-8 w-8 text-indigo-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Documents */}
            <Card>
              <CardHeader>
                <CardTitle>Top Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Downloads</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics?.topDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{doc.type}</Badge>
                        </TableCell>
                        <TableCell>{doc.downloads}</TableCell>
                        <TableCell>{doc.views}</TableCell>
                        <TableCell>{formatDate(doc.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Activity Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>User Activity Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics?.userActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{formatDate(activity.date)}</span>
                        <div className="flex gap-4 text-sm">
                          <span>Active: {activity.activeUsers}</span>
                          <span>New: {activity.newUsers}</span>
                          <span>Logins: {activity.loginCount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Users */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Contributors</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Documents</TableHead>
                        <TableHead>Last Login</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics?.userStats.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                          <TableCell>{user.documentsCreated}</TableCell>
                          <TableCell className="text-sm">{formatDate(user.lastLogin)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Document Statistics by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Type</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Downloads</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Avg. Downloads</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics?.documentStats.map((stat, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{stat.type}</TableCell>
                        <TableCell>{stat.count}</TableCell>
                        <TableCell>{stat.downloads}</TableCell>
                        <TableCell>{stat.views}</TableCell>
                        <TableCell>{Math.round(stat.downloads / stat.count)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">CPU Usage</p>
                      <p className="text-2xl font-bold">{analytics?.systemMetrics.cpuUsage}%</p>
                    </div>
                    <Activity className="h-8 w-8 text-red-500" />
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ width: `${analytics?.systemMetrics.cpuUsage}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Memory Usage</p>
                      <p className="text-2xl font-bold">{analytics?.systemMetrics.memoryUsage}%</p>
                    </div>
                    <PieChart className="h-8 w-8 text-yellow-500" />
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ width: `${analytics?.systemMetrics.memoryUsage}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Disk Usage</p>
                      <p className="text-2xl font-bold">{analytics?.systemMetrics.diskUsage}%</p>
                    </div>
                    <Globe className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${analytics?.systemMetrics.diskUsage}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Connections</p>
                      <p className="text-2xl font-bold">{analytics?.systemMetrics.activeConnections}</p>
                    </div>
                    <Shield className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

export default withAuth(AnalyticsPage, { requiredRoles: ['administrator'] })