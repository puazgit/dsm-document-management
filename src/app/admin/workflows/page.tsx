'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { withAuth } from '@/components/auth/with-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, GitBranch, AlertCircle, RefreshCw, ArrowRight, CheckCircle, AlertTriangle, Eye, Table, BarChart3 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WorkflowTransition {
  id: string;
  fromStatus: string;
  toStatus: string;
  minLevel: number;
  requiredPermission?: string | null;
  description: string;
  allowedByLabel?: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface Capability {
  name: string;
  description: string;
  category: string;
}

const DOCUMENT_STATUSES = [
  'DRAFT',
  'IN_REVIEW',
  'PENDING_APPROVAL',
  'APPROVED',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED',
  'EXPIRED'
];

const STATUS_DESCRIPTIONS: Record<string, string> = {
  'DRAFT': 'Document is being created/edited',
  'IN_REVIEW': 'Document is under review',
  'PENDING_APPROVAL': 'Awaiting approval from authorized personnel',
  'APPROVED': 'Document has been approved',
  'PUBLISHED': 'Document is published and accessible',
  'REJECTED': 'Document has been rejected',
  'ARCHIVED': 'Document has been archived',
  'EXPIRED': 'Document has expired'
};

function WorkflowsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedTransition, setSelectedTransition] = useState<WorkflowTransition | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    fromStatus: 'DRAFT',
    toStatus: 'IN_REVIEW',
    minLevel: 50,
    requiredPermission: 'DOCUMENT_EDIT',
    description: '',
    allowedByLabel: 'Editor, Manager, Administrator',
    isActive: true,
    sortOrder: 0
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      loadData();
    }
  }, [status, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load transitions
      const transRes = await fetch('/api/admin/workflows', {
        credentials: 'include'
      });
      if (!transRes.ok) {
        const errorData = await transRes.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to load workflow transitions');
      }
      const transData = await transRes.json();
      setTransitions(transData.transitions || []);

      // Load capabilities
      const capRes = await fetch('/api/admin/rbac/capabilities', {
        credentials: 'include'
      });
      if (!capRes.ok) {
        const errorData = await capRes.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to load capabilities');
      }
      const capData = await capRes.json();
      
      console.log('Loaded capabilities:', capData.capabilities?.length || 0);
      
      // Filter to document-related capabilities
      const documentCapabilities = capData.capabilities.filter(
        (cap: Capability) => cap.category === 'document' || cap.name === 'ADMIN_ACCESS'
      );
      
      console.log('Document capabilities:', documentCapabilities.length);
      setCapabilities(documentCapabilities);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load data';
      console.error('Load data error:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const createTransition = async () => {
    try {
      const res = await fetch('/api/admin/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create transition');
      }

      setShowCreateDialog(false);
      resetForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transition');
    }
  };

  const updateTransition = async () => {
    if (!selectedTransition) return;

    try {
      const res = await fetch('/api/admin/workflows', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedTransition.id, ...formData })
      });

      if (!res.ok) throw new Error('Failed to update transition');

      setShowEditDialog(false);
      setSelectedTransition(null);
      resetForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update transition');
    }
  };

  const deleteTransition = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow transition?')) return;

    try {
      const res = await fetch(`/api/admin/workflows?id=${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete transition');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transition');
    }
  };

  const openEditDialog = (transition: WorkflowTransition) => {
    setSelectedTransition(transition);
    setFormData({
      fromStatus: transition.fromStatus,
      toStatus: transition.toStatus,
      minLevel: transition.minLevel,
      requiredPermission: transition.requiredPermission || 'DOCUMENT_EDIT',
      description: transition.description,
      allowedByLabel: transition.allowedByLabel || '',
      isActive: transition.isActive,
      sortOrder: transition.sortOrder
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      fromStatus: 'DRAFT',
      toStatus: 'IN_REVIEW',
      minLevel: 50,
      requiredPermission: 'DOCUMENT_EDIT',
      description: '',
      allowedByLabel: 'Editor, Manager, Administrator',
      isActive: true,
      sortOrder: 0
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'IN_REVIEW': return 'bg-yellow-100 text-yellow-800';
      case 'PENDING_APPROVAL': return 'bg-orange-100 text-orange-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'PUBLISHED': return 'bg-blue-100 text-blue-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'ARCHIVED': return 'bg-purple-100 text-purple-800';
      case 'EXPIRED': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelBadge = (level: number) => {
    if (level >= 100) return <Badge className="bg-purple-500 dark:bg-purple-600 hover:bg-purple-600 dark:hover:bg-purple-700 text-white">Admin Only (100)</Badge>;
    if (level >= 70) return <Badge className="bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white">Manager+ (70)</Badge>;
    if (level >= 50) return <Badge className="bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 text-white">Editor+ (50)</Badge>;
    return <Badge variant="secondary">Level {level}</Badge>;
  };

  const getCapabilityBadge = (capName: string) => {
    const capability = capabilities.find(c => c.name === capName);
    if (!capability) return <Badge variant="destructive">{capName} (Not Found)</Badge>;
    
    const isAdmin = capName === 'ADMIN_ACCESS';
    const isManage = capName.includes('MANAGE');
    const isDelete = capName.includes('DELETE');
    const isApprove = capName.includes('APPROVE');
    const isPublish = capName.includes('PUBLISH');
    
    if (isAdmin) return <Badge className="bg-purple-500 dark:bg-purple-600 hover:bg-purple-600 dark:hover:bg-purple-700 text-white">{capName}</Badge>;
    if (isManage) return <Badge className="bg-indigo-500 dark:bg-indigo-600 hover:bg-indigo-600 dark:hover:bg-indigo-700 text-white">{capName}</Badge>;
    if (isDelete) return <Badge variant="destructive">{capName}</Badge>;
    if (isApprove) return <Badge className="bg-orange-500 dark:bg-orange-600 hover:bg-orange-600 dark:hover:bg-orange-700 text-white">{capName}</Badge>;
    if (isPublish) return <Badge className="bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white">{capName}</Badge>;
    
    return <Badge variant="secondary">{capName}</Badge>;
  };

  // Group transitions by from status
  const groupedTransitions = DOCUMENT_STATUSES.reduce((acc, status) => {
    acc[status] = transitions.filter(t => t.fromStatus === status);
    return acc;
  }, {} as Record<string, WorkflowTransition[]>);

  // Get workflow statistics
  const stats = {
    total: transitions.length,
    active: transitions.filter(t => t.isActive).length,
    inactive: transitions.filter(t => !t.isActive).length,
    byStatus: DOCUMENT_STATUSES.reduce((acc, status) => {
      acc[status] = transitions.filter(t => t.fromStatus === status).length;
      return acc;
    }, {} as Record<string, number>)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container p-6 mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <GitBranch className="w-8 h-8" />
            Workflow Transitions Management
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage document status workflow transitions using capability-based access control
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Transition
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* System Info Alert */}
      <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
        <AlertTriangle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          <strong>Capability-Based System:</strong> This workflow system now uses capabilities from the RBAC system. 
          Capabilities like <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded text-xs">DOCUMENT_EDIT</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded text-xs">DOCUMENT_APPROVE</code>, etc. are managed in{' '}
          <a href="/admin/rbac/assignments" className="font-medium underline hover:text-blue-700 dark:hover:text-blue-300">Role Capabilities</a>.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="visual" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="visual" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Visual Workflow
          </TabsTrigger>
          <TabsTrigger value="table" className="flex items-center gap-2">
            <Table className="w-4 h-4" />
            Table View
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visual" className="space-y-6">
          {/* Workflow Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Transitions</CardTitle>
              <CardDescription>
                {stats.total} total transitions ({stats.active} active, {stats.inactive} inactive)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {DOCUMENT_STATUSES.map(status => {
                  const statusTransitions = groupedTransitions[status] || [];
                  if (statusTransitions.length === 0) return null;

                  return (
                    <div key={status} className="pl-4 border-l-4 border-primary">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge className={getStatusColor(status)}>
                          {status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {STATUS_DESCRIPTIONS[status]}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {statusTransitions.length} transition{statusTransitions.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {statusTransitions.map(transition => (
                          <Card key={transition.id} className={transition.isActive ? '' : 'opacity-50 bg-muted'}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge className={getStatusColor(transition.fromStatus)}>
                                      {transition.fromStatus}
                                    </Badge>
                                    <ArrowRight className="flex-shrink-0 w-4 h-4 text-muted-foreground" />
                                    <Badge className={getStatusColor(transition.toStatus)}>
                                      {transition.toStatus}
                                    </Badge>
                                    {transition.isActive ? (
                                      <CheckCircle className="flex-shrink-0 w-4 h-4 text-green-600 dark:text-green-500" />
                                    ) : (
                                      <AlertCircle className="flex-shrink-0 w-4 h-4 text-orange-600 dark:text-orange-500" />
                                    )}
                                  </div>

                                  <p className="text-sm">{transition.description || 'No description'}</p>

                                  <div className="flex flex-wrap gap-2">
                                    {getLevelBadge(transition.minLevel)}
                                    {transition.requiredPermission && getCapabilityBadge(transition.requiredPermission)}
                                    {transition.allowedByLabel && (
                                      <Badge variant="secondary">
                                        {transition.allowedByLabel}
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-shrink-0 gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditDialog(transition)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteTransition(transition.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>All Transitions</CardTitle>
              <CardDescription>Comprehensive list of all workflow transitions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="p-2 text-left">From</th>
                      <th className="p-2 text-left">To</th>
                      <th className="p-2 text-left">Capability</th>
                      <th className="p-2 text-left">Min Level</th>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transitions.map(t => (
                      <tr key={t.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <Badge className={getStatusColor(t.fromStatus)} variant="outline">
                            {t.fromStatus}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge className={getStatusColor(t.toStatus)} variant="outline">
                            {t.toStatus}
                          </Badge>
                        </td>
                        <td className="p-2">
                          {t.requiredPermission ? (
                            getCapabilityBadge(t.requiredPermission)
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </td>
                        <td className="p-2">{t.minLevel}</td>
                        <td className="max-w-xs p-2 truncate">{t.description || '-'}</td>
                        <td className="p-2">
                          {t.isActive ? (
                            <Badge variant="default" className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(t)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteTransition(t.id)}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Transitions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-500">{stats.active}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Inactive</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-500">{stats.inactive}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Capabilities Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">
                  {new Set(transitions.map(t => t.requiredPermission).filter(Boolean)).size}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Transitions by Status</CardTitle>
              <CardDescription>Number of outgoing transitions from each status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                {DOCUMENT_STATUSES.map(status => (
                  <div key={status} className="flex items-center justify-between p-3 border rounded-lg">
                    <Badge className={getStatusColor(status)}>{status}</Badge>
                    <span className="font-bold">{stats.byStatus[status] || 0}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setShowEditDialog(false);
          setSelectedTransition(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showEditDialog ? 'Edit Workflow Transition' : 'Create New Workflow Transition'}
            </DialogTitle>
            <DialogDescription>
              Define the transition rule and capability requirements
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fromStatus">From Status</Label>
                <Select value={formData.fromStatus} onValueChange={v => setFormData({ ...formData, fromStatus: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_STATUSES.map(status => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          <span>{status}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {STATUS_DESCRIPTIONS[formData.fromStatus]}
                </p>
              </div>
              <div>
                <Label htmlFor="toStatus">To Status</Label>
                <Select value={formData.toStatus} onValueChange={v => setFormData({ ...formData, toStatus: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_STATUSES.map(status => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          <span>{status}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {STATUS_DESCRIPTIONS[formData.toStatus]}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="What this transition does (e.g., Submit document for review)"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="capability">Required Capability</Label>
              <Select 
                value={formData.requiredPermission} 
                onValueChange={v => setFormData({ ...formData, requiredPermission: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={capabilities.length === 0 ? "Loading capabilities..." : "Select a capability"} />
                </SelectTrigger>
                <SelectContent>
                  {capabilities.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No capabilities loaded. Please refresh the page.
                    </div>
                  ) : (
                    capabilities.map(cap => (
                      <SelectItem key={cap.name} value={cap.name}>
                        <div className="flex flex-col">
                          <span className="font-medium">{cap.name}</span>
                          <span className="text-xs text-muted-foreground">{cap.description}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                User must have this capability to perform this transition
                {capabilities.length > 0 && ` (${capabilities.length} available)`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minLevel">Minimum Role Level</Label>
                <Input
                  id="minLevel"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.minLevel}
                  onChange={e => setFormData({ ...formData, minLevel: parseInt(e.target.value) })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  50=Editor, 70=Manager, 100=Admin
                </p>
              </div>
              <div>
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Display order (lower = first)
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="allowedBy">Allowed By Label (Optional)</Label>
              <Input
                id="allowedBy"
                placeholder="Editor, Manager, Administrator"
                value={formData.allowedByLabel}
                onChange={e => setFormData({ ...formData, allowedByLabel: e.target.value })}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Display label for UI (comma-separated role names)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={checked => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active (transition is enabled)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              setShowEditDialog(false);
            }}>
              Cancel
            </Button>
            <Button onClick={showEditDialog ? updateTransition : createTransition}>
              {showEditDialog ? 'Update' : 'Create'} Transition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Protect page with WORKFLOW_MANAGE capability
export default withAuth(WorkflowsPage, {
  requiredCapabilities: ['WORKFLOW_MANAGE']
});
