'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { withAuth } from '@/components/auth/with-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarIcon, Search, Filter, RefreshCw, Eye, BarChart3, Shield } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import { toast } from 'sonner'

interface AuditLog {
  id: string
  action: string
  resource: string
  resourceId: string | null
  metadata: any
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  actor?: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  }
}

interface DocumentActivity {
  id: string
  action: string
  documentId: string
  userId: string
  metadata: any
  createdAt: string
  document?: {
    id: string
    title: string
    fileName: string
    fileType: string
  }
  user?: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  }
}

interface AuditLogsResponse {
  logs: AuditLog[]
  pagination: {
    total: number
    totalPages: number
    currentPage: number
    hasNext: boolean
    hasPrev: boolean
  }
}

const AUDIT_ACTIONS = [
  'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
  'PASSWORD_CHANGE', 'PASSWORD_RESET', 'ROLE_ASSIGN', 'ROLE_REMOVE',
  'PERMISSION_GRANT', 'PERMISSION_REVOKE', 'ACTIVATE', 'DEACTIVATE'
]

const DOCUMENT_ACTIONS = [
  'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'DOWNLOAD', 'APPROVE', 
  'REJECT', 'PUBLISH', 'COMMENT'
]

const AUDIT_RESOURCES = [
  'USER', 'ROLE', 'PERMISSION', 'DOCUMENT', 'PROJECT', 'SYSTEM'
]

const ACTION_COLORS = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  LOGIN: 'bg-purple-100 text-purple-800',
  LOGOUT: 'bg-gray-100 text-gray-800',
  LOGIN_FAILED: 'bg-orange-100 text-orange-800',
  PASSWORD_CHANGE: 'bg-yellow-100 text-yellow-800',
  PASSWORD_RESET: 'bg-yellow-100 text-yellow-800',
  ROLE_ASSIGN: 'bg-indigo-100 text-indigo-800',
  ROLE_REMOVE: 'bg-pink-100 text-pink-800',
  PERMISSION_GRANT: 'bg-emerald-100 text-emerald-800',
  PERMISSION_REVOKE: 'bg-rose-100 text-rose-800',
  ACTIVATE: 'bg-green-100 text-green-800',
  DEACTIVATE: 'bg-red-100 text-red-800',
  VIEW: 'bg-cyan-100 text-cyan-800',
  DOWNLOAD: 'bg-teal-100 text-teal-800',
  APPROVE: 'bg-lime-100 text-lime-800',
  REJECT: 'bg-amber-100 text-amber-800',
  PUBLISH: 'bg-violet-100 text-violet-800',
  COMMENT: 'bg-slate-100 text-slate-800'
}

function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [documentActivities, setDocumentActivities] = useState<DocumentActivity[]>([])
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    hasNext: false,
    hasPrev: false
  })
  const [docPagination, setDocPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    hasNext: false,
    hasPrev: false
  })
  const [loading, setLoading] = useState(false)
  const [docLoading, setDocLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<DocumentActivity | null>(null)
  
  // Filter states
  const [filters, setFilters] = useState({
    action: 'all',
    resource: 'all',
    actorId: '',
    resourceId: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20
  })
  
  const [docFilters, setDocFilters] = useState({
    action: 'all',
    documentId: '',
    userId: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20
  })

  // Date picker states
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()

  const fetchAuditLogs = useCallback(async (newFilters = filters) => {
    console.log('fetchAuditLogs called with filters:', newFilters)
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value && value !== '' && value !== 'all') {
          queryParams.append(key, value.toString())
        }
      })

      const url = `/api/audit-logs?${queryParams}`
      console.log('Fetching from URL:', url)
      const response = await fetch(url)
      
      console.log('Response status:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response error:', errorText)
        throw new Error('Failed to fetch audit logs')
      }

      const data: AuditLogsResponse = await response.json()
      console.log('Audit logs response:', data)
      console.log('Logs array:', data.logs)
      console.log('Logs count:', data.logs?.length)
      console.log('Pagination:', data.pagination)
      setLogs(data.logs)
      setPagination(data.pagination)
      console.log('State updated successfully')
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      toast.error('Gagal memuat log audit')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    console.log('Component mounted, calling fetchAuditLogs')
    fetchAuditLogs()
  }, [fetchAuditLogs])
  
  useEffect(() => {
    console.log('Logs state changed:', logs.length, 'logs')
  }, [logs])
  
  useEffect(() => {
    console.log('Loading state changed:', loading)
  }, [loading])
  
  const fetchDocumentActivities = useCallback(async (newFilters = docFilters) => {
    console.log('fetchDocumentActivities called with filters:', newFilters)
    setDocLoading(true)
    try {
      const queryParams = new URLSearchParams()
      
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value && value !== '' && value !== 'all') {
          queryParams.append(key, value.toString())
        }
      })

      const url = `/api/document-activities?${queryParams}`
      console.log('Fetching document activities from URL:', url)
      const response = await fetch(url)
      
      console.log('Document activities response status:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Document activities error:', errorText)
        throw new Error('Failed to fetch document activities')
      }

      const data = await response.json()
      console.log('Document activities response:', data)
      console.log('Activities array:', data.activities)
      console.log('Activities count:', data.activities?.length)
      console.log('Pagination:', data.pagination)
      setDocumentActivities(data.activities)
      setDocPagination(data.pagination)
      console.log('Document activities state updated successfully')
    } catch (error) {
      console.error('Error fetching document activities:', error)
      toast.error('Gagal memuat aktivitas dokumen')
    } finally {
      setDocLoading(false)
    }
  }, [docFilters])

  useEffect(() => {
    console.log('Component mounted, calling fetchDocumentActivities')
    fetchDocumentActivities()
  }, [fetchDocumentActivities])
  
  useEffect(() => {
    console.log('Document activities state changed:', documentActivities.length, 'activities')
  }, [documentActivities])
  
  useEffect(() => {
    console.log('Doc loading state changed:', docLoading)
  }, [docLoading])

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value, page: 1 }
    setFilters(newFilters)
  }

  const handleDateChange = (type: 'start' | 'end', date: Date | undefined) => {
    if (type === 'start') {
      setStartDate(date)
      const newFilters = {
        ...filters,
        startDate: date ? date.toISOString() : '',
        page: 1
      }
      setFilters(newFilters)
    } else {
      setEndDate(date)
      const newFilters = {
        ...filters,
        endDate: date ? date.toISOString() : '',
        page: 1
      }
      setFilters(newFilters)
    }
  }

  const applyFilters = () => {
    fetchAuditLogs(filters)
  }

  const clearFilters = () => {
    const clearedFilters = {
      action: '',
      resource: '',
      actorId: '',
      resourceId: '',
      startDate: '',
      endDate: '',
      page: 1,
      limit: 20
    }
    setFilters(clearedFilters)
    setStartDate(undefined)
    setEndDate(undefined)
    fetchAuditLogs(clearedFilters)
  }

  const handlePageChange = (newPage: number) => {
    const newFilters = { ...filters, page: newPage }
    setFilters(newFilters)
    fetchAuditLogs(newFilters)
  }

  const formatMetadata = (metadata: any) => {
    if (!metadata || typeof metadata !== 'object') return 'N/A'
    
    return Object.entries(metadata)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ')
  }

  const getActionColor = (action: string) => {
    return ACTION_COLORS[action as keyof typeof ACTION_COLORS] || 'bg-gray-100 text-gray-800'
  }

  return (
      <div className="container mx-auto space-y-4 sm:space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">Audit System</h1>
          <Button onClick={() => fetchAuditLogs()} disabled={loading} size="sm" className="w-full sm:w-auto">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

      <Tabs defaultValue="logs" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="logs" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Audit Logs</span>
            <span className="sm:hidden">Logs</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
            <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Document Activities</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Analytics</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4 sm:space-y-6">

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Log Audit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Action Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Aksi</label>
              <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih aksi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {AUDIT_ACTIONS.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Resource Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Resource</label>
              <Select value={filters.resource} onValueChange={(value) => handleFilterChange('resource', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih resource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {AUDIT_RESOURCES.map((resource) => (
                    <SelectItem key={resource} value={resource}>
                      {resource}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actor ID Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">ID Aktor</label>
              <Input
                placeholder="Masukkan ID aktor"
                value={filters.actorId}
                onChange={(e) => handleFilterChange('actorId', e.target.value)}
              />
            </div>

            {/* Resource ID Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">ID Resource</label>
              <Input
                placeholder="Masukkan ID resource"
                value={filters.resourceId}
                onChange={(e) => handleFilterChange('resourceId', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Mulai</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP', { locale: id }) : 'Pilih tanggal'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => handleDateChange('start', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal Akhir</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP', { locale: id }) : 'Pilih tanggal'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => handleDateChange('end', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={applyFilters} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Terapkan Filter
            </Button>
            <Button variant="outline" onClick={clearFilters} disabled={loading}>
              Bersihkan Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Log Audit ({pagination.total} total)</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Tidak ada log audit ditemukan
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-3 space-y-2 bg-card hover:bg-muted/50 transition-colors">
                    {/* Time and Action */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(log.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: id })}
                      </div>
                      <Badge className={`${getActionColor(log.action)} text-xs flex-shrink-0`}>
                        {log.action}
                      </Badge>
                    </div>

                    {/* Actor */}
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Aktor</div>
                      {log.actor ? (
                        <div>
                          <div className="font-medium text-sm">{`${log.actor.firstName || ''} ${log.actor.lastName || ''}`.trim() || log.actor.email}</div>
                          <div className="text-xs text-muted-foreground font-mono truncate">{log.actor.id}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">System</span>
                      )}
                    </div>

                    {/* Resource Info */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Resource</div>
                        <div className="text-sm">{log.resource}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Resource ID</div>
                        <div className="text-xs font-mono truncate">{log.resourceId || '-'}</div>
                      </div>
                    </div>

                    {/* IP and Detail */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-xs font-mono text-muted-foreground truncate flex-1">
                        IP: {log.ipAddress || '-'}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedLog(log)}
                        className="h-8 px-2 sm:px-3 flex-shrink-0"
                      >
                        <Eye className="h-3 w-3 sm:mr-1" />
                        <span className="hidden sm:inline">Detail</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Waktu</th>
                      <th className="text-left p-2">Aktor</th>
                      <th className="text-left p-2">Aksi</th>
                      <th className="text-left p-2">Resource</th>
                      <th className="text-left p-2">Resource ID</th>
                      <th className="text-left p-2">IP Address</th>
                      <th className="text-left p-2">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 text-sm">
                          {format(parseISO(log.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: id })}
                        </td>
                        <td className="p-2 text-sm">
                          {log.actor ? (
                            <div>
                              <div className="font-medium">{`${log.actor.firstName || ''} ${log.actor.lastName || ''}`.trim() || log.actor.email}</div>
                              <div className="text-xs text-gray-500">{log.actor.id}</div>
                            </div>
                          ) : (
                            <span className="text-gray-500">System</span>
                          )}
                        </td>
                        <td className="p-2">
                          <Badge className={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                        </td>
                        <td className="p-2 text-sm">{log.resource}</td>
                        <td className="p-2 text-sm font-mono">
                          {log.resourceId || '-'}
                        </td>
                        <td className="p-2 text-sm font-mono">
                          {log.ipAddress || '-'}
                        </td>
                        <td className="p-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t">
                  <div className="text-xs sm:text-sm text-gray-500">
                    Halaman {pagination.currentPage} dari {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.hasPrev}
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.hasNext}
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Detail Log Audit</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLog(null)}
                >
                  ✕
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">ID Log</label>
                    <div className="font-mono text-sm">{selectedLog.id}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Waktu</label>
                    <div className="text-sm">
                      {format(parseISO(selectedLog.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: id })}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Aksi</label>
                    <Badge className={getActionColor(selectedLog.action)}>
                      {selectedLog.action}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Resource</label>
                    <div className="text-sm">{selectedLog.resource}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Resource ID</label>
                    <div className="font-mono text-sm">{selectedLog.resourceId || '-'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">IP Address</label>
                    <div className="font-mono text-sm">{selectedLog.ipAddress || '-'}</div>
                  </div>
                </div>

                {selectedLog.actor && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Aktor</label>
                    <div className="bg-gray-50 p-3 rounded-md text-sm">
                      <div><strong>ID:</strong> {selectedLog.actor.id}</div>
                      <div><strong>Email:</strong> {selectedLog.actor.email}</div>
                      <div><strong>Nama:</strong> {`${selectedLog.actor.firstName || ''} ${selectedLog.actor.lastName || ''}`.trim() || '-'}</div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500">User Agent</label>
                  <div className="bg-gray-50 p-3 rounded-md text-sm break-all">
                    {selectedLog.userAgent || '-'}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Metadata</label>
                  <div className="bg-gray-50 p-3 rounded-md text-sm">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4 sm:space-y-6">
          {/* Filter Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
                Filter Aktivitas Dokumen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-3 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">Aksi</label>
                  <Select
                    value={docFilters.action}
                    onValueChange={(value) => {
                      const newFilters = { ...docFilters, action: value, page: 1 }
                      setDocFilters(newFilters)
                      fetchDocumentActivities(newFilters)
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Pilih aksi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Aksi</SelectItem>
                      {DOCUMENT_ACTIONS.map((action) => (
                        <SelectItem key={action} value={action}>
                          {action}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">ID Dokumen</label>
                  <Input
                    placeholder="Masukkan ID dokumen"
                    value={docFilters.documentId}
                    onChange={(e) => {
                      const newFilters = { ...docFilters, documentId: e.target.value, page: 1 }
                      setDocFilters(newFilters)
                    }}
                    className="h-9 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">User ID</label>
                  <Input
                    placeholder="Masukkan user ID"
                    value={docFilters.userId}
                    onChange={(e) => {
                      const newFilters = { ...docFilters, userId: e.target.value, page: 1 }
                      setDocFilters(newFilters)
                    }}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2 sm:pt-4">
                <Button 
                  onClick={() => fetchDocumentActivities()}
                  disabled={docLoading}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Cari
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    const resetFilters = {
                      action: 'all',
                      documentId: '',
                      userId: '',
                      startDate: '',
                      endDate: '',
                      page: 1,
                      limit: 20
                    }
                    setDocFilters(resetFilters)
                    fetchDocumentActivities(resetFilters)
                  }}
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Hasil Pencarian</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {docLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-500 mt-2">Memuat data...</p>
                </div>
              ) : documentActivities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada aktivitas ditemukan
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block lg:hidden space-y-3">
                    {documentActivities.map((activity) => (
                      <div key={activity.id} className="border rounded-lg p-3 space-y-3 bg-card hover:bg-muted/50 transition-colors">
                        {/* Time and Action */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs text-muted-foreground">
                              {format(parseISO(activity.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: id })}
                            </div>
                          </div>
                          <Badge className={`${ACTION_COLORS[activity.action as keyof typeof ACTION_COLORS]} text-xs flex-shrink-0`}>
                            {activity.action}
                          </Badge>
                        </div>

                        {/* Document */}
                        <div className="space-y-1 pt-2 border-t">
                          <div className="text-xs text-muted-foreground">Dokumen</div>
                          {activity.document ? (
                            <div>
                              <div className="font-medium text-sm">{activity.document.title}</div>
                              <div className="text-xs text-muted-foreground truncate">{activity.document.fileName}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>

                        {/* User */}
                        <div className="space-y-1 pt-2 border-t">
                          <div className="text-xs text-muted-foreground">User</div>
                          {activity.user ? (
                            <div>
                              <div className="text-sm">{`${activity.user.firstName || ''} ${activity.user.lastName || ''}`.trim() || '-'}</div>
                              <div className="text-xs text-muted-foreground truncate">{activity.user.email}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>

                        {/* Detail Button */}
                        <div className="flex justify-end pt-2 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedActivity(activity)}
                            className="h-8"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Detail
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b">
                        <tr className="text-left text-sm text-gray-500">
                          <th className="pb-3 font-medium">Waktu</th>
                          <th className="pb-3 font-medium">Aksi</th>
                          <th className="pb-3 font-medium">Dokumen</th>
                          <th className="pb-3 font-medium">User</th>
                          <th className="pb-3 font-medium">Detail</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {documentActivities.map((activity) => (
                          <tr key={activity.id} className="text-sm hover:bg-gray-50">
                            <td className="py-3">
                              <div className="text-gray-900">
                                {format(parseISO(activity.createdAt), 'dd/MM/yyyy', { locale: id })}
                              </div>
                              <div className="text-xs text-gray-500">
                                {format(parseISO(activity.createdAt), 'HH:mm:ss', { locale: id })}
                              </div>
                            </td>
                            <td className="py-3">
                              <Badge className={ACTION_COLORS[activity.action as keyof typeof ACTION_COLORS]}>
                                {activity.action}
                              </Badge>
                            </td>
                            <td className="py-3">
                              {activity.document ? (
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {activity.document.title}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {activity.document.fileName}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3">
                              {activity.user ? (
                                <div>
                                  <div className="text-gray-900">{`${activity.user.firstName || ''} ${activity.user.lastName || ''}`.trim() || '-'}</div>
                                  <div className="text-xs text-gray-500">{activity.user.email}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedActivity(activity)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {docPagination.totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t">
                      <div className="text-xs sm:text-sm text-gray-500">
                        Halaman {docPagination.currentPage} dari {docPagination.totalPages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!docPagination.hasPrev}
                          onClick={() => {
                            const newFilters = { ...docFilters, page: docPagination.currentPage - 1 }
                            setDocFilters(newFilters)
                            fetchDocumentActivities(newFilters)
                          }}
                        >
                          Sebelumnya
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!docPagination.hasNext}
                          onClick={() => {
                            const newFilters = { ...docFilters, page: docPagination.currentPage + 1 }
                            setDocFilters(newFilters)
                            fetchDocumentActivities(newFilters)
                          }}
                        >
                          Selanjutnya
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Detail Modal */}
          {selectedActivity && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Detail Aktivitas</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedActivity(null)}
                    >
                      ✕
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">ID Aktivitas</label>
                        <div className="font-mono text-sm">{selectedActivity.id}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Waktu</label>
                        <div className="text-sm">
                          {format(parseISO(selectedActivity.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: id })}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Aksi</label>
                        <Badge className={ACTION_COLORS[selectedActivity.action as keyof typeof ACTION_COLORS]}>
                          {selectedActivity.action}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Dokumen ID</label>
                        <div className="font-mono text-sm">{selectedActivity.documentId}</div>
                      </div>
                    </div>

                    {selectedActivity.document && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Dokumen</label>
                        <div className="bg-gray-50 p-3 rounded-md text-sm">
                          <div><strong>Judul:</strong> {selectedActivity.document.title}</div>
                          <div><strong>File:</strong> {selectedActivity.document.fileName}</div>
                          <div><strong>Type:</strong> {selectedActivity.document.fileType}</div>
                        </div>
                      </div>
                    )}

                    {selectedActivity.user && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">User</label>
                        <div className="bg-gray-50 p-3 rounded-md text-sm">
                          <div><strong>ID:</strong> {selectedActivity.user.id}</div>
                          <div><strong>Email:</strong> {selectedActivity.user.email}</div>
                          <div><strong>Nama:</strong> {`${selectedActivity.user.firstName || ''} ${selectedActivity.user.lastName || ''}`.trim() || '-'}</div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium text-gray-500">Metadata</label>
                      <div className="bg-gray-50 p-3 rounded-md text-sm">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(selectedActivity.metadata, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">Total Aktivitas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{logs.length}</div>
                <p className="text-xs text-gray-500 mt-1">Dalam periode ini</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">Pengguna Aktif</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(logs.map(log => log.actor?.id).filter(Boolean)).size}
                </div>
                <p className="text-xs text-gray-500 mt-1">Pengguna unik</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">Resource Teratas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {logs.reduce((acc, log) => {
                    acc[log.resource] = (acc[log.resource] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>) && Object.entries(logs.reduce((acc, log) => {
                    acc[log.resource] = (acc[log.resource] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'}
                </div>
                <p className="text-xs text-gray-500 mt-1">Paling sering diakses</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Aktivitas per Aksi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(
                  logs.reduce((acc, log) => {
                    acc[log.action] = (acc[log.action] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).sort((a, b) => b[1] - a[1]).map(([action, count]) => (
                  <div key={action} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge className={getActionColor(action)}>{action}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(count / logs.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aktivitas per Resource</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(
                  logs.reduce((acc, log) => {
                    acc[log.resource] = (acc[log.resource] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).sort((a, b) => b[1] - a[1]).map(([resource, count]) => (
                  <div key={resource} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm font-medium">{resource}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(count / logs.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Protect with AUDIT_VIEW capability (changed from role-based)
export default withAuth(AuditLogsPage, {
  requiredCapabilities: ['AUDIT_VIEW'],
  redirectTo: '/unauthorized'
})