'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Shield, AlertTriangle, Eye, Download, Printer, Copy, User, Settings } from 'lucide-react';
import AdvancedPDFViewer from '@/components/documents/advanced-pdf-viewer';
import SimplePDFViewer from '@/components/documents/simple-pdf-viewer';
import SecurePDFViewerV2 from '@/components/documents/secure-pdf-viewer-v2';
import { SecurePDFViewer } from '@/components/documents/pdf-viewer';
import { PDFDebugViewer } from '@/components/documents/pdf-debug-viewer';
import useSecurityMeasures from '@/hooks/use-security-measures';

// Sample PDF URLs (using local files for better performance)
const sampleDocuments = [
  {
    id: '1',
    name: 'Sample Document (Local)',
    url: '/sample.pdf',
    type: 'Sample',
    confidential: false
  },
  {
    id: '2', 
    name: 'Company Policy Document',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    type: 'Policy',
    confidential: false
  },
  {
    id: '3',
    name: 'Technical Specification',
    url: 'https://www.learningcontainer.com/wp-content/uploads/2019/09/sample-pdf-file.pdf',
    type: 'Technical',
    confidential: false
  }
];

const roles = [
  { 
    value: 'administrator', 
    label: 'Administrator',
    description: 'Full access - can download, print, copy',
    color: 'bg-purple-100 text-purple-800 border-purple-300'
  },
  { 
    value: 'manager', 
    label: 'Manager',
    description: 'Can download and print, but cannot copy',
    color: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  { 
    value: 'editor', 
    label: 'Editor',
    description: 'Can download only, no print or copy',
    color: 'bg-green-100 text-green-800 border-green-300'
  },
  { 
    value: 'reviewer', 
    label: 'Reviewer',
    description: 'View only - no download, print, or copy',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  },
  { 
    value: 'viewer', 
    label: 'Viewer',
    description: 'Basic view only access',
    color: 'bg-gray-100 text-gray-800 border-gray-300'
  },
  { 
    value: 'guest', 
    label: 'Guest',
    description: 'Restricted view - limited zoom and controls',
    color: 'bg-red-100 text-red-800 border-red-300'
  },
  { 
    value: 'org_kadiv', 
    label: 'Kepala Divisi (Organizational)',
    description: 'Can download and print - organizational role',
    color: 'bg-purple-100 text-purple-800 border-purple-300'
  }
];

export default function PDFSecurityDemoPage() {
  const [selectedRole, setSelectedRole] = useState('viewer');
  const [selectedDocument, setSelectedDocument] = useState(() => sampleDocuments[0]);
  const [viewerType, setViewerType] = useState<'advanced' | 'simple' | 'secure' | 'v2' | 'fallback' | 'debug' | 'ultra' | 'fast'>('fast');
  const [securityViolations, setSecurityViolations] = useState<any[]>([]);
  const [securityEnabled, setSecurityEnabled] = useState(true);

  // Security measures hook
  useSecurityMeasures({
    onSecurityViolation: (type: string, details: any) => {
      setSecurityViolations(prev => [...prev, { type, details, timestamp: new Date() }]);
    },
    blockRightClick: securityEnabled,
    blockKeyboardShortcuts: securityEnabled,
    blockTextSelection: selectedRole === 'guest' || selectedRole === 'viewer',
    detectDevTools: securityEnabled
  });

  const currentRole = roles.find(role => role.value === selectedRole);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            PDF Security & Role-Based Access Control Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Experience advanced PDF viewing with comprehensive security measures and role-based permissions.
            This demo showcases client-side PDF viewers with download restrictions and security monitoring.
          </p>
        </div>

        {/* Controls Panel */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Demo Controls
            </CardTitle>
            <CardDescription>
              Configure the viewer settings to test different security levels and user roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">User Role</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex items-center gap-2">
                          <Badge className={role.color + ' text-xs'}>
                            {role.label}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentRole && (
                  <p className="text-xs text-gray-500">{currentRole.description}</p>
                )}
              </div>

              {/* Document Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Sample Document</label>
                <Select 
                  value={selectedDocument?.id} 
                  onValueChange={(value) => {
                    const doc = sampleDocuments.find(d => d.id === value);
                    if (doc) setSelectedDocument(doc);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select document" />
                  </SelectTrigger>
                  <SelectContent>
                    {sampleDocuments.map(doc => (
                      <SelectItem key={doc.id} value={doc.id}>
                        <div className="flex items-center gap-2">
                          <span>{doc.name}</span>
                          {doc.confidential && (
                            <Badge variant="destructive" className="text-xs">
                              Confidential
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Viewer Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Viewer Type</label>
                <Select value={viewerType} onValueChange={(value: 'advanced' | 'simple' | 'secure' | 'v2' | 'fallback' | 'debug' | 'ultra' | 'fast') => setViewerType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select viewer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fast">⚡ Fast Viewer (Quick Loading)</SelectItem>
                    <SelectItem value="ultra">🛡️ Ultra Secure (Maximum Protection)</SelectItem>
                    <SelectItem value="v2">Secure Viewer v2 (Recommended)</SelectItem>
                    <SelectItem value="debug">Debug Information</SelectItem>
                    <SelectItem value="fallback">Fallback Viewer (Troubleshooting)</SelectItem>
                    <SelectItem value="simple">Simple Secure Viewer</SelectItem>
                    <SelectItem value="advanced">Advanced PDF.js Viewer</SelectItem>
                    <SelectItem value="secure">Legacy iframe Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 pt-4 border-t">
              <Button
                variant={securityEnabled ? "destructive" : "outline"}
                size="sm"
                onClick={() => setSecurityEnabled(!securityEnabled)}
              >
                <Shield className="w-4 h-4 mr-1" />
                Security: {securityEnabled ? 'ON' : 'OFF'}
              </Button>
              
              {securityViolations.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSecurityViolations([])}
                >
                  Clear Violations ({securityViolations.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main PDF Viewer */}
          <div className="xl:col-span-3">
            <Tabs defaultValue="viewer" className="space-y-4">
              <TabsList>
                <TabsTrigger value="viewer">PDF Viewer</TabsTrigger>
                <TabsTrigger value="security">Security Features</TabsTrigger>
                <TabsTrigger value="comparison">Feature Comparison</TabsTrigger>
              </TabsList>

              <TabsContent value="viewer" className="space-y-4">
                {viewerType === 'fast' ? (
                  <SecurePDFViewer
                    fileUrl={selectedDocument?.url || ''}
                    fileName={selectedDocument?.name || 'Document'}
                    userRole={selectedRole}
                    canDownload={true}
                  />
                ) : viewerType === 'ultra' ? (
                  <SecurePDFViewerV2
                    fileUrl={selectedDocument?.url || ''}
                    fileName={selectedDocument?.name || 'Document'}
                    userRole={selectedRole}
                    document={selectedDocument}
                    watermark={selectedDocument?.confidential ? 'CONFIDENTIAL' : undefined}
                    onSecurityViolation={(type, details) => {
                      setSecurityViolations(prev => [...prev, { type, details, timestamp: new Date() }]);
                    }}
                  />
                ) : viewerType === 'v2' ? (
                  <SecurePDFViewerV2
                    fileUrl={selectedDocument?.url || ''}
                    fileName={selectedDocument?.name || 'Document'}
                    userRole={selectedRole}
                    document={selectedDocument}
                    watermark={selectedDocument?.confidential ? 'CONFIDENTIAL' : undefined}
                    onSecurityViolation={(type, details) => {
                      setSecurityViolations(prev => [...prev, { type, details, timestamp: new Date() }]);
                    }}
                  />
                ) : viewerType === 'advanced' ? (
                  <AdvancedPDFViewer
                    fileUrl={selectedDocument?.url || ''}
                    fileName={selectedDocument?.name || 'Document'}
                    userRole={selectedRole}
                    document={selectedDocument}
                    watermark={selectedDocument?.confidential ? 'CONFIDENTIAL' : undefined}
                    onSecurityViolation={(type, details) => {
                      setSecurityViolations(prev => [...prev, { type, details, timestamp: new Date() }]);
                    }}
                  />
                ) : viewerType === 'simple' ? (
                  <SimplePDFViewer
                    fileUrl={selectedDocument?.url || ''}
                    fileName={selectedDocument?.name || 'Document'}
                    userRole={selectedRole}
                    document={selectedDocument}
                    watermark={selectedDocument?.confidential ? 'CONFIDENTIAL' : undefined}
                    onSecurityViolation={(type, details) => {
                      setSecurityViolations(prev => [...prev, { type, details, timestamp: new Date() }]);
                    }}
                  />
                ) : viewerType === 'fallback' ? (
                  <SimplePDFViewer
                    fileUrl={selectedDocument?.url || ''}
                    fileName={selectedDocument?.name || 'Document'}
                    userRole={selectedRole}
                  />
                ) : viewerType === 'debug' ? (
                  <PDFDebugViewer
                    fileUrl={selectedDocument?.url || ''}
                    fileName={selectedDocument?.name || 'Document'}
                  />
                ) : (
                  <SecurePDFViewer
                    fileUrl={selectedDocument?.url || ''}
                    fileName={selectedDocument?.name || 'Document'}
                    userRole={selectedRole}
                    canDownload={true}
                    document={selectedDocument}
                  />
                )}
              </TabsContent>

              <TabsContent value="security" className="space-y-4">
                <div className="grid gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Active Security Measures</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`p-3 rounded-lg ${securityEnabled ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          <div className="flex items-center gap-2">
                            <Shield className={`w-4 h-4 ${securityEnabled ? 'text-green-600' : 'text-red-600'}`} />
                            <span className={`text-sm font-medium ${securityEnabled ? 'text-green-800' : 'text-red-800'}`}>
                              Right-click Protection: {securityEnabled ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                        
                        <div className={`p-3 rounded-lg ${securityEnabled ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          <div className="flex items-center gap-2">
                            <Shield className={`w-4 h-4 ${securityEnabled ? 'text-green-600' : 'text-red-600'}`} />
                            <span className={`text-sm font-medium ${securityEnabled ? 'text-green-800' : 'text-red-800'}`}>
                              Keyboard Shortcuts Blocked: {securityEnabled ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                        </div>

                        <div className={`p-3 rounded-lg ${securityEnabled ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          <div className="flex items-center gap-2">
                            <Eye className={`w-4 h-4 ${securityEnabled ? 'text-green-600' : 'text-red-600'}`} />
                            <span className={`text-sm font-medium ${securityEnabled ? 'text-green-800' : 'text-red-800'}`}>
                              DevTools Detection: {securityEnabled ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                        </div>

                        <div className={`p-3 rounded-lg ${selectedRole === 'guest' || selectedRole === 'viewer' ? 'bg-yellow-50 border border-yellow-200' : 'bg-blue-50 border border-blue-200'}`}>
                          <div className="flex items-center gap-2">
                            <Copy className={`w-4 h-4 ${selectedRole === 'guest' || selectedRole === 'viewer' ? 'text-yellow-600' : 'text-blue-600'}`} />
                            <span className={`text-sm font-medium ${selectedRole === 'guest' || selectedRole === 'viewer' ? 'text-yellow-800' : 'text-blue-800'}`}>
                              Text Selection: {selectedRole === 'guest' || selectedRole === 'viewer' ? 'Blocked' : 'Allowed'}
                            </span>
                          </div>
                        </div>

                        <div className={`p-3 rounded-lg ${['administrator', 'admin', 'manager', 'editor', 'org_administrator', 'org_dirut', 'org_dewas', 'org_ppd', 'org_komite_audit', 'org_gm', 'org_kadiv', 'org_manager', 'org_finance', 'org_hrd', 'org_supervisor'].includes(selectedRole) ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          <div className="flex items-center gap-2">
                            <svg className={`w-4 h-4 ${['administrator', 'admin', 'manager', 'editor', 'org_administrator', 'org_dirut', 'org_dewas', 'org_ppd', 'org_komite_audit', 'org_gm', 'org_kadiv', 'org_manager', 'org_finance', 'org_hrd', 'org_supervisor'].includes(selectedRole) ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className={`text-sm font-medium ${['administrator', 'admin', 'manager', 'editor', 'org_administrator', 'org_dirut', 'org_dewas', 'org_ppd', 'org_komite_audit', 'org_gm', 'org_kadiv', 'org_manager', 'org_finance', 'org_hrd', 'org_supervisor'].includes(selectedRole) ? 'text-green-800' : 'text-red-800'}`}>
                              Download Access: {['administrator', 'admin', 'manager', 'editor', 'org_administrator', 'org_dirut', 'org_dewas', 'org_ppd', 'org_komite_audit', 'org_gm', 'org_kadiv', 'org_manager', 'org_finance', 'org_hrd', 'org_supervisor'].includes(selectedRole) ? 'Enabled' : 'Restricted'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Try right-clicking, pressing Ctrl+S, F12, or Ctrl+C to test security measures.
                          Security violations will be logged and displayed in the sidebar.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Blocked Keyboard Shortcuts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        <div className="p-2 bg-red-50 rounded text-red-800">F12 - DevTools</div>
                        <div className="p-2 bg-red-50 rounded text-red-800">Ctrl+S - Save</div>
                        <div className="p-2 bg-red-50 rounded text-red-800">Ctrl+P - Print</div>
                        <div className="p-2 bg-red-50 rounded text-red-800">Ctrl+C - Copy</div>
                        <div className="p-2 bg-red-50 rounded text-red-800">Ctrl+A - Select All</div>
                        <div className="p-2 bg-red-50 rounded text-red-800">Ctrl+U - View Source</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="comparison" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Role-Based Feature Comparison</CardTitle>
                    <CardDescription>
                      Compare access levels and features available for different user roles
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Role</th>
                            <th className="text-center p-2"><Download className="w-4 h-4 mx-auto" /></th>
                            <th className="text-center p-2"><Printer className="w-4 h-4 mx-auto" /></th>
                            <th className="text-center p-2"><Copy className="w-4 h-4 mx-auto" /></th>
                            <th className="text-center p-2">Zoom</th>
                            <th className="text-center p-2">Rotate</th>
                            <th className="text-center p-2">Watermark</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roles.map(role => (
                            <tr key={role.value} className={`border-b ${selectedRole === role.value ? 'bg-blue-50' : ''}`}>
                              <td className="p-2">
                                <Badge className={role.color}>
                                  {role.label}
                                </Badge>
                              </td>
                              <td className="text-center p-2">
                                {['administrator', 'admin', 'manager', 'editor'].includes(role.value) ? '✅' : '❌'}
                              </td>
                              <td className="text-center p-2">
                                {['administrator', 'admin', 'manager'].includes(role.value) ? '✅' : '❌'}
                              </td>
                              <td className="text-center p-2">
                                {['administrator', 'admin'].includes(role.value) ? '✅' : '❌'}
                              </td>
                              <td className="text-center p-2">
                                {role.value !== 'guest' ? '✅' : '❌'}
                              </td>
                              <td className="text-center p-2">
                                {['administrator', 'admin', 'manager'].includes(role.value) ? '✅' : '❌'}
                              </td>
                              <td className="text-center p-2">
                                {['editor', 'reviewer', 'viewer', 'guest'].includes(role.value) ? '✅' : '❌'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Current Role Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Current Role
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentRole && (
                  <>
                    <Badge className={currentRole.color + ' text-sm'}>
                      {currentRole.label}
                    </Badge>
                    <p className="text-sm text-gray-600">{currentRole.description}</p>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span>Download:</span>
                        <span className={['administrator', 'admin', 'manager', 'editor'].includes(selectedRole) ? 'text-green-600' : 'text-red-600'}>
                          {['administrator', 'admin', 'manager', 'editor'].includes(selectedRole) ? 'Allowed' : 'Blocked'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Print:</span>
                        <span className={['administrator', 'admin', 'manager'].includes(selectedRole) ? 'text-green-600' : 'text-red-600'}>
                          {['administrator', 'admin', 'manager'].includes(selectedRole) ? 'Allowed' : 'Blocked'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Copy:</span>
                        <span className={['administrator', 'admin'].includes(selectedRole) ? 'text-green-600' : 'text-red-600'}>
                          {['administrator', 'admin'].includes(selectedRole) ? 'Allowed' : 'Blocked'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Security Violations Log */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Security Log
                  {securityViolations.length > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {securityViolations.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {securityViolations.length === 0 ? (
                  <p className="text-sm text-gray-500">No security violations detected</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {securityViolations.slice(-10).reverse().map((violation, index) => (
                      <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                        <div className="font-medium text-red-800">
                          {violation.type.replace(/_/g, ' ')}
                        </div>
                        <div className="text-red-600">
                          {violation.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Test Instructions</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p><strong>Try these actions:</strong></p>
                <ul className="space-y-1 text-gray-600">
                  <li>• Right-click on the PDF</li>
                  <li>• Press F12 to open DevTools</li>
                  <li>• Use Ctrl+S to try saving</li>
                  <li>• Try Ctrl+C to copy text</li>
                  <li>• Attempt to drag content</li>
                  <li>• Switch roles to see different permissions</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}