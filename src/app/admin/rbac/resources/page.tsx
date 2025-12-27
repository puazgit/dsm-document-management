'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { withAuth } from '@/components/auth/with-auth'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Pencil, Trash2, Shield, Network, Route, Code, ChevronLeft, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

interface Resource {
  id: string
  type: string
  path: string
  name: string
  description: string | null
  parentId: string | null
  requiredCapability: string | null
  icon: string | null
  sortOrder: number
  isActive: boolean
  metadata: any
  parent?: {
    id: string
    name: string
  }
}

function ResourcesManagementPage() {
  const { toast } = useToast()
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [formData, setFormData] = useState({
    id: '',
    type: 'navigation',
    path: '',
    name: '',
    description: '',
    parentId: '',
    requiredCapability: '',
    icon: '',
    sortOrder: 0,
    isActive: true,
    metadata: '',
  })

  useEffect(() => {
    fetchResources()
    setCurrentPage(1) // Reset to first page when changing tabs
  }, [selectedType])

  const fetchResources = async () => {
    try {
      setLoading(true)
      const url = selectedType !== 'all' 
        ? `/api/admin/resources?type=${selectedType}`
        : '/api/admin/resources'
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (response.ok) {
        setResources(data.resources)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch resources',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch resources',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = (type: string) => {
    setEditingResource(null)
    setFormData({
      id: '',
      type,
      path: '',
      name: '',
      description: '',
      parentId: '',
      requiredCapability: '',
      icon: '',
      sortOrder: 0,
      isActive: true,
      metadata: '',
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource)
    setFormData({
      id: resource.id,
      type: resource.type,
      path: resource.path,
      name: resource.name,
      description: resource.description || '',
      parentId: resource.parentId || '',
      requiredCapability: resource.requiredCapability || '',
      icon: resource.icon || '',
      sortOrder: resource.sortOrder,
      isActive: resource.isActive,
      metadata: resource.metadata ? JSON.stringify(resource.metadata, null, 2) : '',
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const url = editingResource
        ? `/api/admin/resources/${editingResource.id}`
        : '/api/admin/resources'
      
      const method = editingResource ? 'PUT' : 'POST'
      
      // Parse metadata if present
      let metadata = null
      if (formData.metadata) {
        try {
          metadata = JSON.parse(formData.metadata)
        } catch (e) {
          toast({
            title: 'Error',
            description: 'Invalid JSON in metadata field',
            variant: 'destructive',
          })
          return
        }
      }
      
      const payload = {
        ...formData,
        parentId: formData.parentId || null,
        requiredCapability: formData.requiredCapability || null,
        icon: formData.icon || null,
        metadata,
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: editingResource
            ? 'Resource updated successfully'
            : 'Resource created successfully',
        })
        setIsDialogOpen(false)
        fetchResources()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to save resource',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save resource',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return
    
    try {
      const response = await fetch(`/api/admin/resources/${id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Resource deleted successfully',
        })
        fetchResources()
      } else {
        const data = await response.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete resource',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete resource',
        variant: 'destructive',
      })
    }
  }

  const handleCreateNew = () => {
    setEditingResource(null)
    setFormData({
      id: '',
      type: selectedType !== 'all' ? selectedType : 'navigation',
      path: '',
      name: '',
      description: '',
      parentId: '',
      requiredCapability: '',
      icon: '',
      sortOrder: 0,
      isActive: true,
      metadata: '',
    })
    setIsDialogOpen(true)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'navigation':
        return <Network className="w-4 h-4" />
      case 'route':
        return <Route className="w-4 h-4" />
      case 'api':
        return <Code className="w-4 h-4" />
      default:
        return <Shield className="w-4 h-4" />
    }
  }

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      navigation: 'bg-blue-100 text-blue-800',
      route: 'bg-green-100 text-green-800',
      api: 'bg-purple-100 text-purple-800',
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  // Filter resources based on selected type
  const filteredResources = selectedType === 'all' 
    ? resources 
    : resources.filter(r => r.type === selectedType)

  // Pagination logic
  const totalPages = Math.ceil(filteredResources.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedResources = filteredResources.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const PaginationControls = () => {
    if (totalPages <= 1) return null

    return (
      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredResources.length)} of {filteredResources.length} resources
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, current page, and pages around current
              const showPage = 
                page === 1 || 
                page === totalPages || 
                (page >= currentPage - 1 && page <= currentPage + 1)
              
              if (!showPage) {
                // Show ellipsis
                if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-2 text-muted-foreground">...</span>
                }
                return null
              }

              return (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => goToPage(page)}
                  className="w-10"
                >
                  {page}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resources Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage navigation items, routes, and API endpoints with role-based access control
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Resource
        </Button>
      </div>

      <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as typeof selectedType)}>
        <TabsList>
          <TabsTrigger value="all">All Resources</TabsTrigger>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
          <TabsTrigger value="route">Routes</TabsTrigger>
          <TabsTrigger value="api">API Endpoints</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedType}>
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedType === 'all' && 'All Resources'}
                {selectedType === 'navigation' && 'Navigation Items'}
                {selectedType === 'route' && 'Route Resources'}
                {selectedType === 'api' && 'API Endpoints'}
              </CardTitle>
              <CardDescription>
                {selectedType === 'all' && 'Manage all system resources'}
                {selectedType === 'navigation' && 'Sidebar menu items and navigation structure'}
                {selectedType === 'route' && 'Page routes and protected endpoints'}
                {selectedType === 'api' && 'Backend API endpoints and services'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead>Required Capability</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedResources.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No resources found
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedResources.map((resource) => (
                          <TableRow key={resource.id}>
                            <TableCell>
                              <Badge variant="outline">{resource.type}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{resource.name}</TableCell>
                            <TableCell className="font-mono text-sm">{resource.path}</TableCell>
                            <TableCell>
                              {resource.requiredCapability ? (
                                <Badge>{resource.requiredCapability}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">None</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(resource)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(resource.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  
                  <PaginationControls />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingResource ? 'Edit Resource' : 'Create New Resource'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Type</label>
              <select
                className="w-full mt-1 border rounded-md p-2"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                <option value="navigation">Navigation</option>
                <option value="route">Route</option>
                <option value="api">API Endpoint</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                type="text"
                className="w-full mt-1 border rounded-md p-2"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Resource name"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Path</label>
              <input
                type="text"
                className="w-full mt-1 border rounded-md p-2"
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                placeholder="/path/to/resource"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <input
                type="text"
                className="w-full mt-1 border rounded-md p-2"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Resource description (optional)"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Required Capability</label>
              <input
                type="text"
                className="w-full mt-1 border rounded-md p-2"
                value={formData.requiredCapability || ''}
                onChange={(e) => setFormData({ ...formData, requiredCapability: e.target.value })}
                placeholder="CAPABILITY_NAME (optional)"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Icon Name</label>
              <input
                type="text"
                className="w-full mt-1 border rounded-md p-2"
                value={formData.icon || ''}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="Lucide icon name (optional)"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Sort Order</label>
              <input
                type="number"
                className="w-full mt-1 border rounded-md p-2"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingResource ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Protect page with ROLE_MANAGE capability
export default withAuth(ResourcesManagementPage, {
  requiredCapabilities: ['ROLE_MANAGE']
});
