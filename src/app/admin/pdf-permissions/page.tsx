'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Download, 
  Printer, 
  Copy, 
  Eye, 
  Shield,
  Users,
  Settings,
  Save,
  RefreshCw
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  level: number;
  userCount?: number;
}

interface PDFPermission {
  id: string;
  name: string;
  displayName: string;
  action: string;
  isGranted: boolean;
}

interface RolePermissions {
  roleId: string;
  roleName: string;
  roleDisplayName: string;
  permissions: PDFPermission[];
}

export default function PDFPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const pdfActions = [
    { 
      key: 'view', 
      label: 'View PDF', 
      icon: Eye, 
      description: 'Can view PDF documents in browser',
      color: 'bg-blue-100 text-blue-800'
    },
    { 
      key: 'download', 
      label: 'Download PDF', 
      icon: Download, 
      description: 'Can download PDF files to device',
      color: 'bg-green-100 text-green-800'
    },
    { 
      key: 'print', 
      label: 'Print PDF', 
      icon: Printer, 
      description: 'Can print PDF documents',
      color: 'bg-purple-100 text-purple-800'
    },
    { 
      key: 'copy', 
      label: 'Copy Content', 
      icon: Copy, 
      description: 'Can copy text from PDF documents',
      color: 'bg-orange-100 text-orange-800'
    },
    { 
      key: 'watermark', 
      label: 'Watermark Control', 
      icon: Shield, 
      description: 'Can control PDF watermark settings',
      color: 'bg-red-100 text-red-800'
    }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch roles
      const rolesResponse = await fetch('/api/roles');
      const rolesData = await rolesResponse.json();
      setRoles(rolesData);

      // Fetch PDF permissions for each role
      const permissionsData: RolePermissions[] = [];
      
      for (const role of rolesData) {
        const permResponse = await fetch(`/api/roles/${role.id}/permissions?module=pdf`);
        const permissions = await permResponse.json();
        
        permissionsData.push({
          roleId: role.id,
          roleName: role.name,
          roleDisplayName: role.displayName,
          permissions: permissions.map((p: any) => ({
            id: p.permission.id,
            name: p.permission.name,
            displayName: p.permission.displayName,
            action: p.permission.action,
            isGranted: p.isGranted
          }))
        });
      }
      
      setRolePermissions(permissionsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load PDF permissions data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (roleId: string, permissionId: string, currentGranted: boolean) => {
    try {
      const response = await fetch(`/api/roles/${roleId}/permissions/${permissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isGranted: !currentGranted })
      });

      if (!response.ok) throw new Error('Failed to update permission');

      // Update local state
      setRolePermissions(prev => 
        prev.map(rp => 
          rp.roleId === roleId 
            ? {
                ...rp,
                permissions: rp.permissions.map(p => 
                  p.id === permissionId 
                    ? { ...p, isGranted: !currentGranted }
                    : p
                )
              }
            : rp
        )
      );

      toast({
        title: 'Success',
        description: 'PDF permission updated successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update permission',
        variant: 'destructive'
      });
    }
  };

  const applyRoleTemplate = async (roleId: string, template: string) => {
    const templates: Record<string, string[]> = {
      'admin': ['view', 'download', 'print', 'copy', 'watermark'],
      'manager': ['view', 'download', 'print'],
      'editor': ['view', 'download'],
      'viewer': ['view'],
      'none': []
    };

    const enabledActions: string[] = templates[template] || [];
    
    try {
      setSaving(true);
      
      const rolePerms = rolePermissions.find(rp => rp.roleId === roleId);
      if (!rolePerms) return;

      for (const permission of rolePerms.permissions) {
        const shouldGrant = enabledActions.includes(permission.action);
        if (permission.isGranted !== shouldGrant) {
          await togglePermission(roleId, permission.id, permission.isGranted);
        }
      }

      toast({
        title: 'Template Applied',
        description: `${template.toUpperCase()} template applied successfully`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to apply template',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading PDF permissions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-8 w-8 text-red-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">PDF Permissions Management</h1>
              <p className="text-gray-600">Configure PDF access control for different user roles</p>
            </div>
          </div>
        </div>

        {/* Permission Actions Legend */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              PDF Permission Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pdfActions.map((action) => {
                const IconComponent = action.icon;
                return (
                  <div key={action.key} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className={`p-2 rounded-md ${action.color}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{action.label}</h4>
                      <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Roles Permissions Matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Role-based PDF Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Role</th>
                    {pdfActions.map((action) => {
                      const IconComponent = action.icon;
                      return (
                        <th key={action.key} className="text-center py-3 px-4">
                          <div className="flex flex-col items-center gap-1">
                            <IconComponent className="h-4 w-4" />
                            <span className="text-xs">{action.label}</span>
                          </div>
                        </th>
                      );
                    })}
                    <th className="text-center py-3 px-4">Templates</th>
                  </tr>
                </thead>
                <tbody>
                  {rolePermissions.map((rolePerms) => {
                    const role = roles.find(r => r.id === rolePerms.roleId);
                    if (!role) return null;

                    return (
                      <tr key={rolePerms.roleId} className="border-b hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={`
                              ${role.name === 'admin' ? 'bg-red-50 text-red-700 border-red-200' : ''}
                              ${role.name === 'manager' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
                              ${role.name === 'editor' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                              ${role.name === 'viewer' ? 'bg-gray-50 text-gray-700 border-gray-200' : ''}
                            `}>
                              {rolePerms.roleDisplayName}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              Level {role.level}
                            </span>
                          </div>
                        </td>
                        {pdfActions.map((action) => {
                          const permission = rolePerms.permissions.find(p => p.action === action.key);
                          
                          return (
                            <td key={action.key} className="py-4 px-4 text-center">
                              {permission ? (
                                <Switch
                                  checked={permission.isGranted}
                                  onCheckedChange={() => 
                                    togglePermission(rolePerms.roleId, permission.id, permission.isGranted)
                                  }
                                  disabled={saving}
                                />
                              ) : (
                                <span className="text-gray-300">N/A</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1">
                            {['admin', 'manager', 'editor', 'viewer', 'none'].map((template) => (
                              <Button
                                key={template}
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => applyRoleTemplate(rolePerms.roleId, template)}
                                disabled={saving}
                              >
                                {template}
                              </Button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Current Settings Summary */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Current PDF Access Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {rolePermissions.map((rolePerms) => {
                const role = roles.find(r => r.id === rolePerms.roleId);
                if (!role) return null;

                const grantedPermissions = rolePerms.permissions.filter(p => p.isGranted);
                
                return (
                  <div key={rolePerms.roleId} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{rolePerms.roleDisplayName}</Badge>
                    </div>
                    <div className="space-y-1">
                      {grantedPermissions.length > 0 ? (
                        grantedPermissions.map((perm) => (
                          <div key={perm.id} className="flex items-center gap-1 text-sm text-green-600">
                            <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                            {perm.displayName}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-500">No PDF permissions</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}