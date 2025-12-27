'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { withAuth } from '@/components/auth/with-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Shield, AlertCircle, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Capability {
  id: string;
  name: string;
  description: string;
  category?: string;
  assignments?: {
    role: {
      id: string;
      name: string;
      displayName: string;
      level: number;
    };
  }[];
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  level: number;
}

function CapabilitiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);

  // New capability form
  const [newCapability, setNewCapability] = useState({
    name: '',
    description: '',
    category: 'system'
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
      
      // Load capabilities
      const capRes = await fetch('/api/admin/capabilities?includeAssignments=true');
      if (!capRes.ok) throw new Error('Failed to load capabilities');
      const capData = await capRes.json();
      setCapabilities(capData.capabilities || []);

      // Load roles
      const rolesRes = await fetch('/api/roles');
      if (!rolesRes.ok) throw new Error('Failed to load roles');
      const rolesData = await rolesRes.json();
      setRoles(rolesData || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const createCapability = async () => {
    try {
      const res = await fetch('/api/admin/capabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCapability)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create capability');
      }

      setShowCreateDialog(false);
      setNewCapability({ name: '', description: '', category: 'system' });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create capability');
    }
  };

  const deleteCapability = async (id: string) => {
    if (!confirm('Are you sure you want to delete this capability?')) return;

    try {
      const res = await fetch(`/api/admin/capabilities?id=${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete capability');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete capability');
    }
  };

  const openAssignDialog = (role: Role) => {
    setSelectedRole(role);
    
    // Get current capabilities for this role
    const currentCapabilities = capabilities
      .filter(cap => cap.assignments?.some(a => a.role.id === role.id))
      .map(cap => cap.id);
    
    setSelectedCapabilities(currentCapabilities);
    setShowAssignDialog(true);
  };

  const assignCapabilities = async () => {
    if (!selectedRole) return;

    try {
      const res = await fetch('/api/admin/capabilities/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId: selectedRole.id,
          capabilityIds: selectedCapabilities
        })
      });

      if (!res.ok) throw new Error('Failed to assign capabilities');

      setShowAssignDialog(false);
      setSelectedRole(null);
      setSelectedCapabilities([]);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign capabilities');
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'system': return 'bg-purple-100 text-purple-800';
      case 'document': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
            <Shield className="w-8 h-8" />
            Role Capabilities Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage system capabilities and assign them to roles
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Capability
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Capabilities by Category */}
      {['system', 'document', 'user'].map(category => {
        const categoryCaps = capabilities.filter(c => c.category === category);
        if (categoryCaps.length === 0) return null;

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="capitalize">{category} Capabilities</CardTitle>
              <CardDescription>
                {category === 'system' && 'System-wide administrative capabilities'}
                {category === 'document' && 'Document management and access capabilities'}
                {category === 'user' && 'User and role management capabilities'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {categoryCaps.map(cap => (
                  <Card key={cap.id} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {cap.name}
                            <Badge className={getCategoryColor(cap.category)}>
                              {cap.category}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {cap.description}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCapability(cap.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">
                        <span className="font-medium">Assigned to: </span>
                        {cap.assignments && cap.assignments.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {cap.assignments.map(a => (
                              <Badge key={a.role.id} variant="secondary">
                                {a.role.displayName} (L{a.role.level})
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No roles</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Roles Assignment Section */}
      <Card>
        <CardHeader>
          <CardTitle>Role Capability Assignments</CardTitle>
          <CardDescription>
            Assign capabilities to each role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {roles.map(role => {
              const roleCaps = capabilities.filter(cap =>
                cap.assignments?.some(a => a.role.id === role.id)
              );

              return (
                <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{role.displayName}</span>
                      <Badge variant="outline">Level {role.level}</Badge>
                      <Badge variant="secondary">{roleCaps.length} capabilities</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {roleCaps.map(cap => (
                        <Badge key={cap.id} className={getCategoryColor(cap.category)}>
                          {cap.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => openAssignDialog(role)}>
                    Edit Capabilities
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Create Capability Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Capability</DialogTitle>
            <DialogDescription>
              Add a new capability to the system. Name must be uppercase with underscores.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="EXAMPLE_CAPABILITY"
                value={newCapability.name}
                onChange={e => setNewCapability({ ...newCapability, name: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="What this capability allows"
                value={newCapability.description}
                onChange={e => setNewCapability({ ...newCapability, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={newCapability.category} onValueChange={v => setNewCapability({ ...newCapability, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={createCapability}>Create Capability</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Capabilities Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Assign Capabilities to {selectedRole?.displayName}
            </DialogTitle>
            <DialogDescription>
              Select which capabilities this role should have
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {['system', 'document', 'user'].map(category => {
              const categoryCaps = capabilities.filter(c => c.category === category);
              if (categoryCaps.length === 0) return null;

              return (
                <div key={category} className="space-y-2">
                  <h4 className="font-semibold capitalize">{category} Capabilities</h4>
                  {categoryCaps.map(cap => (
                    <div key={cap.id} className="flex items-start space-x-2 p-2 border rounded">
                      <Checkbox
                        id={cap.id}
                        checked={selectedCapabilities.includes(cap.id)}
                        onCheckedChange={(checked: boolean) => {
                          if (checked) {
                            setSelectedCapabilities([...selectedCapabilities, cap.id]);
                          } else {
                            setSelectedCapabilities(selectedCapabilities.filter(id => id !== cap.id));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <Label htmlFor={cap.id} className="font-medium cursor-pointer">
                          {cap.name}
                        </Label>
                        <p className="text-sm text-muted-foreground">{cap.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
            <Button onClick={assignCapabilities}>Save Assignments</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Protect page with ROLE_MANAGE capability
export default withAuth(CapabilitiesPage, {
  requiredCapabilities: ['ROLE_MANAGE']
});
