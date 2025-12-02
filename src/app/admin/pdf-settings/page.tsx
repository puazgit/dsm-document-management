'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Copy, 
  Eye, 
  Shield,
  Users,
  Settings,
  RefreshCw
} from 'lucide-react';
import { DashboardLayout } from '../../../components/ui/dashboard-layout';
import { withAuth } from '../../../components/auth/with-auth';

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  level: number;
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

function PDFPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const pdfActions = [
    { 
      key: 'view', 
      label: 'View PDF', 
      icon: Eye, 
      description: 'Can view PDF documents in browser',
      color: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    { 
      key: 'download', 
      label: 'Download PDF', 
      icon: Download, 
      description: 'Can download PDF files to device',
      color: 'bg-green-100 text-green-800 border-green-200'
    },
    { 
      key: 'print', 
      label: 'Print PDF', 
      icon: Printer, 
      description: 'Can print PDF documents',
      color: 'bg-purple-100 text-purple-800 border-purple-200'
    },
    { 
      key: 'copy', 
      label: 'Copy Content', 
      icon: Copy, 
      description: 'Can copy text from PDF documents',
      color: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    { 
      key: 'watermark', 
      label: 'Watermark Control', 
      icon: Shield, 
      description: 'Can control PDF watermark settings',
      color: 'bg-red-100 text-red-800 border-red-200'
    }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Mock data for now - in real app, fetch from APIs
      const mockRoles = [
        { id: '1', name: 'admin', displayName: 'Administrator', description: 'Full access', level: 1 },
        { id: '2', name: 'manager', displayName: 'Manager', description: 'Management access', level: 2 },
        { id: '3', name: 'editor', displayName: 'Editor', description: 'Editor access', level: 3 },
        { id: '4', name: 'reviewer', displayName: 'Reviewer', description: 'Review access', level: 4 },
        { id: '5', name: 'viewer', displayName: 'Viewer', description: 'View only access', level: 5 },
        { id: '6', name: 'guest', displayName: 'Guest', description: 'Guest access', level: 6 },
      ];

      const mockPermissions: RolePermissions[] = mockRoles.map(role => ({
        roleId: role.id,
        roleName: role.name,
        roleDisplayName: role.displayName,
        permissions: pdfActions.map((action, index) => ({
          id: `${role.id}-${action.key}`,
          name: `pdf.${action.key}`,
          displayName: action.label,
          action: action.key,
          isGranted: getDefaultPermission(role.name, action.key)
        }))
      }));

      setRoles(mockRoles);
      setRolePermissions(mockPermissions);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      alert('Failed to load PDF permissions data');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPermission = (roleName: string, action: string): boolean => {
    const defaults = {
      'admin': ['view', 'download', 'print', 'copy', 'watermark'],
      'manager': ['view', 'download', 'print'],
      'editor': ['view', 'download'],
      'reviewer': ['view'],
      'viewer': ['view'],
      'guest': ['view']
    };

    return (defaults[roleName as keyof typeof defaults] || []).includes(action);
  };

  const togglePermission = async (roleId: string, permissionId: string) => {
    try {
      // Update local state
      setRolePermissions(prev => 
        prev.map(rp => 
          rp.roleId === roleId 
            ? {
                ...rp,
                permissions: rp.permissions.map(p => 
                  p.id === permissionId 
                    ? { ...p, isGranted: !p.isGranted }
                    : p
                )
              }
            : rp
        )
      );

      // In real app, make API call here
      console.log('Permission toggled:', { roleId, permissionId });
      
    } catch (error) {
      console.error('Failed to update permission:', error);
      alert('Failed to update permission');
    }
  };

  const applyTemplate = (roleId: string, template: string) => {
    const templates: { [key: string]: string[] } = {
      'admin': ['view', 'download', 'print', 'copy', 'watermark'],
      'manager': ['view', 'download', 'print'],
      'editor': ['view', 'download'],
      'viewer': ['view'],
      'none': []
    };

    const enabledActions = templates[template] || [];
    
    setRolePermissions(prev => 
      prev.map(rp => 
        rp.roleId === roleId 
          ? {
              ...rp,
              permissions: rp.permissions.map(p => ({
                ...p,
                isGranted: enabledActions.includes(p.action)
              }))
            }
          : rp
      )
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading PDF permissions...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
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
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5" />
            <h2 className="text-xl font-semibold">PDF Permission Actions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pdfActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <div key={action.key} className={`flex items-start gap-3 p-3 border rounded-lg ${action.color}`}>
                  <IconComponent className="h-4 w-4 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{action.label}</h4>
                    <p className="text-xs opacity-75 mt-1">{action.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Roles Permissions Matrix */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Role-based PDF Permissions</h2>
            </div>
          </div>
          <div className="p-6">
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
                    <th className="text-center py-3 px-4">Quick Templates</th>
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
                            <span className={`
                              px-2 py-1 text-xs font-medium rounded-md border
                              ${role.name === 'admin' ? 'bg-red-50 text-red-700 border-red-200' : ''}
                              ${role.name === 'manager' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
                              ${role.name === 'editor' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                              ${role.name === 'reviewer' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                              ${role.name === 'viewer' ? 'bg-gray-50 text-gray-700 border-gray-200' : ''}
                              ${role.name === 'guest' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : ''}
                            `}>
                              {rolePerms.roleDisplayName}
                            </span>
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
                                <label className="inline-flex relative items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={permission.isGranted}
                                    onChange={() => togglePermission(rolePerms.roleId, permission.id)}
                                    className="sr-only peer"
                                    disabled={saving}
                                  />
                                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>
                              ) : (
                                <span className="text-gray-300">N/A</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1">
                            {['admin', 'manager', 'editor', 'viewer', 'none'].map((template) => (
                              <button
                                key={template}
                                className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                                onClick={() => applyTemplate(rolePerms.roleId, template)}
                                disabled={saving}
                              >
                                {template}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Current Settings Summary */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Current PDF Access Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rolePermissions.map((rolePerms) => {
              const role = roles.find(r => r.id === rolePerms.roleId);
              if (!role) return null;

              const grantedPermissions = rolePerms.permissions.filter(p => p.isGranted);
              
              return (
                <div key={rolePerms.roleId} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 text-xs font-medium border rounded">
                      {rolePerms.roleDisplayName}
                    </span>
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
        </div>

        {/* Integration Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Integration with PDF Viewer</h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p><strong>Role Detection:</strong> PDF viewer automatically detects user role from session</p>
            <p><strong>Permission Enforcement:</strong> Backend APIs validate permissions before allowing actions</p>
            <p><strong>UI Updates:</strong> Interface shows/hides controls based on permissions</p>
            <p><strong>Audit Trail:</strong> All PDF access attempts are logged for security</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(PDFPermissionsPage, { 
  requiredRoles: ['administrator', 'admin', 'org_administrator'],
  redirectTo: '/unauthorized' 
});