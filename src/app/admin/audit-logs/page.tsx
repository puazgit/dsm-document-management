'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Search, Filter, RefreshCw, Eye } from 'lucide-react'
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
    name: string | null
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
  DEACTIVATE: 'bg-red-100 text-red-800'
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    hasNext: false,
    hasPrev: false
  })
  const [loading, setLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  
  // Filter states
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    actorId: '',
    resourceId: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20
  })

  // Date picker states
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()

  const fetchAuditLogs = async (newFilters = filters) => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value && value !== '') {
          queryParams.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/audit-logs?${queryParams}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs')
      }

      const data: AuditLogsResponse = await response.json()
      setLogs(data.logs)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      toast.error('Gagal memuat log audit')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs()
  }, [])

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Log Audit</h1>
        <Button onClick={() => fetchAuditLogs()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

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
                  <SelectItem value="">Semua</SelectItem>
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
                  <SelectItem value="">Semua</SelectItem>
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
          <CardTitle>Log Audit ({pagination.total} total)</CardTitle>
        </CardHeader>
        <CardContent>
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
              <div className="overflow-x-auto">
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
                              <div className="font-medium">{log.actor.name || log.actor.email}</div>
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
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
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
                      <div><strong>Nama:</strong> {selectedLog.actor.name || '-'}</div>
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
    </div>
  )
}