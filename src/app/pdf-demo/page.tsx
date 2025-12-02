'use client';

import { useState } from 'react';
import { SecurePDFViewer } from '../../components/documents/pdf-viewer';

export default function PDFRoleDemoPage() {
  const [selectedRole, setSelectedRole] = useState('viewer');
  const [demoFile] = useState('/sample.pdf'); // We have this file from earlier

  // Simple and effective right-click disable function (following user's example)
  const disableRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const roles = [
    { value: 'admin', label: 'Administrator', description: 'Full access - can download, print, and copy' },
    { value: 'manager', label: 'Manager', description: 'Can download and print, but not copy' },
    { value: 'editor', label: 'Editor', description: 'Can download only, no print or copy' },
    { value: 'reviewer', label: 'Reviewer', description: 'View only, no download/print/copy' },
    { value: 'viewer', label: 'Viewer', description: 'View only, no download/print/copy' },
    { value: 'guest', label: 'Guest', description: 'View only, no download/print/copy' },
  ];

  return (
    <div 
      className="min-h-screen bg-gray-50 py-8" 
      onContextMenu={disableRightClick}
      style={{ width: "100%", minHeight: "100vh" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">PDF Role-Based Access Demo</h1>
          <p className="mt-2 text-gray-600">
            Test how different user roles interact with PDF documents. Select a role to see the access restrictions in action.
          </p>
        </div>

        {/* Role Selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Select User Role</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <div key={role.value}>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={selectedRole === role.value}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="flex-1">
                    <span className="block text-sm font-medium text-gray-900">
                      {role.label}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {role.description}
                    </span>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Role Permissions Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Current Role: {selectedRole.toUpperCase()}</h3>
          <div className="text-sm text-blue-700">
            <p><strong>Viewing:</strong> All authenticated users can view PDF documents</p>
            <p><strong>Downloading:</strong> Only Admin, Manager, and Editor roles</p>
            <p><strong>Printing:</strong> Only Admin and Manager roles</p>
            <p><strong>Text Copying:</strong> Only Admin role</p>
          </div>
        </div>

        {/* PDF Viewer Demo */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Document Preview with Role: {selectedRole}</h2>
          
          <SecurePDFViewer
            fileUrl="/sample.pdf"
            fileName="sample.pdf"
            userRole={selectedRole}
            document={{ id: 'demo', title: 'Sample PDF Document' }}
          />
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-12 bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium">Role Permissions Matrix</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    View PDF
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Download PDF
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Print PDF
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Copy Text
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[
                  { role: 'Admin', view: true, download: true, print: true, copy: true },
                  { role: 'Manager', view: true, download: true, print: true, copy: false },
                  { role: 'Editor', view: true, download: true, print: false, copy: false },
                  { role: 'Reviewer', view: true, download: false, print: false, copy: false },
                  { role: 'Viewer', view: true, download: false, print: false, copy: false },
                  { role: 'Guest', view: true, download: false, print: false, copy: false },
                ].map((row, index) => (
                  <tr key={row.role} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {row.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        row.view ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {row.view ? '✓ Allowed' : '✗ Denied'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        row.download ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {row.download ? '✓ Allowed' : '✗ Denied'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        row.print ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {row.print ? '✓ Allowed' : '✗ Denied'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        row.copy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {row.copy ? '✓ Allowed' : '✗ Denied'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Implementation Notes */}
        <div className="mt-12 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-yellow-800 mb-3">Implementation Features</h3>
          <div className="text-sm text-yellow-700 space-y-2">
            <p><strong>Backend Protection:</strong> Download endpoint checks user role before allowing file download</p>
            <p><strong>Separate View Endpoint:</strong> /api/documents/[id]/view for safe PDF viewing without download tracking</p>
            <p><strong>UI/UX Feedback:</strong> Clear visual indicators showing allowed/denied actions</p>
            <p><strong>Role-based Styling:</strong> Download buttons disabled for restricted roles</p>
            <p><strong>Security Notice:</strong> Informational messages for users with restricted access</p>
            <p><strong>Audit Trail:</strong> All view and download actions are logged with user information</p>
          </div>
        </div>
      </div>
    </div>
  );
}