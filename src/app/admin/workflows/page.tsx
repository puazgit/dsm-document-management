'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, GitBranch, AlertCircle, RefreshCw, ArrowRight, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

const DOCUMENT_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'PENDING_APPROVAL',
  'APPROVED',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED',
  'EXPIRED'
];

export default function WorkflowsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedTransition, setSelectedTransition] = useState<WorkflowTransition | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    fromStatus: 'DRAFT',
    toStatus: 'PENDING_REVIEW',
    minLevel: 50,
    requiredPermission: 'documents.update',
    description: '',
    allowedByLabel: 'Editor, Manager, Administrator',
    isActive: true,
    sortOrder: 0
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      loadTransitions();
    }
  }, [status, router]);

  const loadTransitions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/workflows');
      if (!res.ok) throw new Error('Failed to load workflow transitions');
      const data = await res.json();
      setTransitions(data.transitions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
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
      loadTransitions();
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
      loadTransitions();
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
      loadTransitions();
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
      requiredPermission: transition.requiredPermission || 'documents.update',
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
      toStatus: 'PENDING_REVIEW',
      minLevel: 50,
      requiredPermission: 'documents.update',
      description: '',
      allowedByLabel: 'Editor, Manager, Administrator',
      isActive: true,
      sortOrder: 0
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'PENDING_REVIEW': return 'bg-yellow-100 text-yellow-800';
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
    if (level >= 100) return <Badge className="bg-purple-500">Admin Only (100)</Badge>;
    if (level >= 70) return <Badge className="bg-blue-500">Manager+ (70)</Badge>;
    if (level >= 50) return <Badge className="bg-green-500">Editor+ (50)</Badge>;
    return <Badge className="bg-gray-500">Level {level}</Badge>;
  };

  // Group transitions by from status
  const groupedTransitions = DOCUMENT_STATUSES.reduce((acc, status) => {
    acc[status] = transitions.filter(t => t.fromStatus === status);
    return acc;
  }, {} as Record<string, WorkflowTransition[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GitBranch className="w-8 h-8" />
            Workflow Transitions Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage document status workflow transitions and access rules
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Transition
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Workflow Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Overview</CardTitle>
          <CardDescription>
            Total transitions: {transitions.length} ({transitions.filter(t => t.isActive).length} active)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {DOCUMENT_STATUSES.map(status => {
              const statusTransitions = groupedTransitions[status] || [];
              if (statusTransitions.length === 0) return null;

              return (
                <div key={status} className="border-l-4 border-primary pl-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={getStatusColor(status)}>
                      {status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {statusTransitions.length} transition{statusTransitions.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {statusTransitions.map(transition => (
                      <Card key={transition.id} className={transition.isActive ? '' : 'opacity-50'}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge className={getStatusColor(transition.fromStatus)}>
                                  {transition.fromStatus}
                                </Badge>
                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                <Badge className={getStatusColor(transition.toStatus)}>
                                  {transition.toStatus}
                                </Badge>
                                {transition.isActive && <CheckCircle className="w-4 h-4 text-green-500" />}
                              </div>

                              <p className="text-sm">{transition.description}</p>

                              <div className="flex flex-wrap gap-2">
                                {getLevelBadge(transition.minLevel)}
                                {transition.requiredPermission && (
                                  <Badge variant="outline">
                                    {transition.requiredPermission}
                                  </Badge>
                                )}
                                {transition.allowedByLabel && (
                                  <Badge variant="secondary">
                                    {transition.allowedByLabel}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2">
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
                                <Trash2 className="w-4 h-4 text-red-500" />
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

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setShowEditDialog(false);
          setSelectedTransition(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {showEditDialog ? 'Edit Workflow Transition' : 'Create New Workflow Transition'}
            </DialogTitle>
            <DialogDescription>
              Define the transition rule and access requirements
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
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="toStatus">To Status</Label>
                <Select value={formData.toStatus} onValueChange={v => setFormData({ ...formData, toStatus: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_STATUSES.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="What this transition does"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
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
                <p className="text-xs text-muted-foreground mt-1">
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
              </div>
            </div>

            <div>
              <Label htmlFor="permission">Required Permission</Label>
              <Select value={formData.requiredPermission} onValueChange={v => setFormData({ ...formData, requiredPermission: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="documents.read">documents.read</SelectItem>
                  <SelectItem value="documents.create">documents.create</SelectItem>
                  <SelectItem value="documents.update">documents.update</SelectItem>
                  <SelectItem value="documents.approve">documents.approve</SelectItem>
                  <SelectItem value="documents.delete">documents.delete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="allowedBy">Allowed By Label</Label>
              <Input
                id="allowedBy"
                placeholder="Editor, Manager, Administrator"
                value={formData.allowedByLabel}
                onChange={e => setFormData({ ...formData, allowedByLabel: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Display label for UI (comma-separated)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={checked => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
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
