'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CustomPDFViewerProps {
  fileUrl: string;
  fileName: string;
  userRole?: string;
  canDownload?: boolean;
  document?: any;
}

export function CustomPDFViewer({ 
  fileUrl, 
  fileName, 
  userRole = 'viewer', 
  canDownload = false, 
  document 
}: CustomPDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);

  // Helper function to get display name for role
  const getRoleDisplayName = (role: string): string => {
    const roleMap: Record<string, string> = {
      'admin': 'Administrator',
      'administrator': 'Administrator',
      'editor': 'Editor',
      'viewer': 'Viewer',
      'manager': 'Manager',
      'reviewer': 'Reviewer',
      'guest': 'Guest',
      'org_administrator': 'Organization Administrator',
      'org_dirut': 'Direktur Utama',
      'org_dewas': 'Dewan Pengawas',
      'org_ppd': 'PPD',
      'org_komite_audit': 'Komite Audit',
      'org_gm': 'General Manager',
      'org_kadiv': 'Kepala Divisi',
      'org_manager': 'Manager',
      'org_finance': 'Finance',
      'org_hrd': 'HRD',
      'org_supervisor': 'Supervisor',
      'org_sekretaris': 'Sekretaris',
      'org_staff': 'Staff',
      'org_guest': 'Guest'
    };
    return roleMap[role.toLowerCase()] || role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Define roles and their permissions
  const rolePermissions = {
    'administrator': { canDownload: true, canPrint: true, canCopy: true },
    'admin': { canDownload: true, canPrint: true, canCopy: true },
    'manager': { canDownload: true, canPrint: true, canCopy: false },
    'editor': { canDownload: true, canPrint: false, canCopy: false },
    'reviewer': { canDownload: false, canPrint: false, canCopy: false },
    'viewer': { canDownload: false, canPrint: false, canCopy: false },
    'guest': { canDownload: false, canPrint: false, canCopy: false }
  };

  const currentPermissions = rolePermissions[userRole.toLowerCase() as keyof typeof rolePermissions] 
    || rolePermissions['viewer'];

  const canUserDownload = canDownload || currentPermissions.canDownload;

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      'administrator': 'bg-red-100 text-red-800 border-red-200',
      'admin': 'bg-red-100 text-red-800 border-red-200',
      'manager': 'bg-purple-100 text-purple-800 border-purple-200',
      'editor': 'bg-blue-100 text-blue-800 border-blue-200',
      'reviewer': 'bg-green-100 text-green-800 border-green-200',
      'viewer': 'bg-gray-100 text-gray-800 border-gray-200',
      'guest': 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return colors[role.toLowerCase() as keyof typeof colors] || colors['viewer'];
  };

  const handleDownload = async () => {
    // Ensure we're running in the browser with document available
    if (typeof window === 'undefined') {
      console.error('❌ Download failed: Not running in browser environment');
      alert('Download failed: Please try again');
      return;
    }

    // Get safe reference to document object
    const currentDocument = typeof document !== 'undefined' ? document : null;
    if (!currentDocument) {
      console.error('❌ Download failed: Document not available');
      alert('Download failed: Please try again');
      return;
    }

    if (!canUserDownload) {
      alert('You do not have permission to download this document.');
      return;
    }

    try {
      console.log('🔄 Starting download for:', fileName);
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = currentDocument.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      currentDocument.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      currentDocument.body.removeChild(a);
      console.log('✅ Download completed successfully');
    } catch (error) {
      console.error('❌ Download failed:', error);
      alert('Failed to download the document.');
    }
  };

  // Check if it's a PDF file
  const isPDFFile = (filename: string) => {
    return filename.toLowerCase().endsWith('.pdf');
  };

  if (!isPDFFile(fileName)) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-amber-600 bg-amber-50 p-4 rounded-lg border border-amber-200">
            <p className="font-medium">Preview not available</p>
            <p className="text-sm mt-2">This viewer only supports PDF files.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Disable right-click context menu for security
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  // Disable drag start for security
  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
    return false;
  };

  // Disable select start for security
  const handleSelectStart = (e: React.SyntheticEvent) => {
    e.preventDefault();
    return false;
  };

  // Disable certain keyboard shortcuts for security
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Disable Ctrl+S (Save), Ctrl+P (Print), Ctrl+A (Select All)
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        return;
      }
      if (!currentPermissions.canPrint && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        return;
      }
      if (!currentPermissions.canCopy && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        return;
      }
    }
  };

  return (
    <Card 
      className="w-full"
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" />
            </svg>
            {fileName}
          </h3>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-md border ${getRoleBadgeColor(userRole)}`}>
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span className={currentPermissions.canDownload ? "text-green-600" : "text-red-600"}>
              Download: {currentPermissions.canDownload ? "✓ Allowed" : "✗ Restricted"}
            </span>
            <span className={currentPermissions.canPrint ? "text-green-600" : "text-red-600"}>
              Print: {currentPermissions.canPrint ? "✓ Allowed" : "✗ Restricted"}
            </span>
            <span className={currentPermissions.canCopy ? "text-green-600" : "text-red-600"}>
              Copy: {currentPermissions.canCopy ? "✓ Allowed" : "✗ Restricted"}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="p-4 text-center text-red-600 bg-red-50 rounded-lg">
            <p className="font-medium">{error}</p>
            <p className="text-sm mt-2">Please try opening the PDF in a new tab or contact support.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* PDF Controls */}
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                  disabled={scale <= 0.5}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </Button>
                <span className="text-sm text-gray-600">{Math.round(scale * 100)}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScale(Math.min(3.0, scale + 0.1))}
                  disabled={scale >= 3.0}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </Button>
              </div>
              
              {totalPages > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Button>
                  <span className="text-sm text-gray-600">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              )}
            </div>

            {/* PDF Viewer - Using PDF.js with custom controls */}
            <div className="relative bg-white rounded border" style={{ minHeight: '600px' }}>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="text-gray-600">Loading PDF preview...</span>
                  </div>
                </div>
              )}
              
              {/* Custom PDF viewer without browser controls */}
              <div className="pdf-viewer-container">
                <object
                  data={`${fileUrl.replace('/download', '/view')}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&scrollbar=0`}
                  type="application/pdf"
                  width="100%"
                  height="600px"
                  style={{
                    border: 'none',
                    borderRadius: '8px'
                  }}
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setError('Failed to load PDF preview');
                    setIsLoading(false);
                  }}
                >
                  {/* Fallback iframe if object fails */}
                  <iframe
                    src={`${fileUrl.replace('/download', '/view')}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0`}
                    width="100%"
                    height="600px"
                    style={{
                      border: 'none',
                      borderRadius: '8px'
                    }}
                    onLoad={() => setIsLoading(false)}
                    title={`PDF Preview: ${fileName}`}
                  />
                </object>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(fileUrl.replace('/download', '/view'), '_blank')}
                  className="flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in New Tab
                </Button>
                
                {canUserDownload ? (
                  <Button
                    onClick={handleDownload}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </Button>
                ) : (
                  <Button
                    disabled
                    variant="outline"
                    className="flex items-center gap-2 opacity-50 cursor-not-allowed"
                    title="Download not allowed for your role"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636" />
                    </svg>
                    Download Restricted
                  </Button>
                )}
              </div>

              <div className="text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11.5C15.4,11.5 16,12.1 16,12.7V16.7C16,17.4 15.4,18 14.8,18H9.2C8.6,18 8,17.4 8,16.8V12.8C8,12.2 8.6,11.6 9.2,11.6V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.5,8.7 10.5,9.5V11.5H13.5V9.5C13.5,8.7 12.8,8.2 12,8.2Z" />
                  </svg>
                  Secure View Mode
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}