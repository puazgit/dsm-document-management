'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SecurePDFViewerProps {
  fileUrl: string;
  fileName: string;
  userRole: string;
  canDownload?: boolean;
  document?: any;
}

export function SecurePDFViewer({ 
  fileUrl, 
  fileName, 
  userRole = 'viewer', 
  canDownload = false, 
  document 
}: SecurePDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

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

  // Simple and effective right-click disable function
  const disableRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Define roles and their permissions - Updated to match database permissions
  const rolePermissions = {
    'administrator': { canDownload: true, canPrint: true, canCopy: true },
    'admin': { canDownload: true, canPrint: true, canCopy: true },
    'manager': { canDownload: true, canPrint: true, canCopy: true },
    'editor': { canDownload: true, canPrint: true, canCopy: true },
    'reviewer': { canDownload: false, canPrint: false, canCopy: false },
    'viewer': { canDownload: true, canPrint: true, canCopy: true },
    'guest': { canDownload: true, canPrint: true, canCopy: true },
    // Organizational roles mapping - Updated to match database
    'org_administrator': { canDownload: true, canPrint: true, canCopy: true },
    'org_dirut': { canDownload: true, canPrint: true, canCopy: true },
    'org_dewas': { canDownload: true, canPrint: true, canCopy: true },
    'org_ppd': { canDownload: true, canPrint: true, canCopy: true },
    'org_komite_audit': { canDownload: true, canPrint: true, canCopy: true },
    'org_gm': { canDownload: true, canPrint: true, canCopy: true },
    'org_kadiv': { canDownload: true, canPrint: true, canCopy: true },
    'org_manager': { canDownload: true, canPrint: true, canCopy: true },
    'org_finance': { canDownload: true, canPrint: true, canCopy: true },
    'org_hrd': { canDownload: true, canPrint: true, canCopy: true },
    'org_supervisor': { canDownload: true, canPrint: true, canCopy: true },
    'org_sekretaris': { canDownload: true, canPrint: true, canCopy: true },
    'org_staff': { canDownload: true, canPrint: true, canCopy: true },
    'org_guest': { canDownload: true, canPrint: true, canCopy: true }
  };

  const currentPermissions = rolePermissions[userRole.toLowerCase() as keyof typeof rolePermissions] 
    || rolePermissions['viewer'];

  // Override with explicit canDownload prop if provided
  const canUserDownload = canDownload || currentPermissions.canDownload;

  // Check if it's a PDF file
  const isPDFFile = (filename: string) => {
    return filename.toLowerCase().endsWith('.pdf');
  };

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      'administrator': 'bg-red-100 text-red-800',
      'admin': 'bg-red-100 text-red-800',
      'manager': 'bg-purple-100 text-purple-800',
      'editor': 'bg-blue-100 text-blue-800',
      'reviewer': 'bg-green-100 text-green-800',
      'viewer': 'bg-gray-100 text-gray-800',
      'guest': 'bg-yellow-100 text-yellow-800',
      'org_administrator': 'bg-red-100 text-red-800',
      'org_dirut': 'bg-indigo-100 text-indigo-800',
      'org_dewas': 'bg-purple-100 text-purple-800',
      'org_ppd': 'bg-blue-100 text-blue-800',
      'org_komite_audit': 'bg-emerald-100 text-emerald-800',
      'org_gm': 'bg-orange-100 text-orange-800',
      'org_kadiv': 'bg-teal-100 text-teal-800',
      'org_manager': 'bg-purple-100 text-purple-800',
      'org_finance': 'bg-green-100 text-green-800',
      'org_hrd': 'bg-cyan-100 text-cyan-800',
      'org_supervisor': 'bg-lime-100 text-lime-800',
      'org_sekretaris': 'bg-pink-100 text-pink-800',
      'org_staff': 'bg-slate-100 text-slate-800',
      'org_guest': 'bg-yellow-100 text-yellow-800'
    };
    return colors[role.toLowerCase() as keyof typeof colors] || colors['viewer'];
  };

  // Enhanced right-click context menu blocking for PDF area only
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.warn('🚫 PDF right-click blocked - Document protected');
    
    // Visual feedback on the PDF container
    const target = e.currentTarget as HTMLElement;
    const container = target.closest('.pdf-viewer-container') as HTMLElement;
    if (container) {
      container.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.5)';
      setTimeout(() => {
        container.style.boxShadow = '';
      }, 300);
    }
    
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

  // Enhanced mouse event blocking
  const handleMouseDown = (e: React.MouseEvent) => {
    // Block right-click (button 2) and middle-click (button 1)
    if (e.button === 2 || e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      console.warn('🚫 Right/middle click blocked');
      return false;
    }
    return true;
  };

  // Block copy operations
  const handleCopy = (e: React.ClipboardEvent) => {
    e.preventDefault();
    console.warn('🚫 Copy operation blocked');
    return false;
  };

  // Disable certain keyboard shortcuts for security
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Disable Ctrl+S (Save), Ctrl+P (Print), Ctrl+A (Select All)
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        return false;
      }
      if (!currentPermissions.canPrint && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        return false;
      }
      if (!currentPermissions.canCopy && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        return false;
      }
    }
    return true;
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

  if (!isPDFFile(fileName)) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="p-4 text-center rounded-lg text-amber-600 bg-amber-50">
            <p className="font-medium">Preview not available</p>
            <p className="mt-2 text-sm">This viewer only supports PDF files.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="w-full"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" />
            </svg>
            {fileName}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={getRoleBadgeColor(userRole)}>
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </Badge>
          </div>
        </div>
        
        {/* Access Control Info */}
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
          <div className="p-4 text-center text-red-600 rounded-lg bg-red-50">
            <p className="font-medium">{error}</p>
            <p className="mt-2 text-sm">Please try opening the PDF in a new tab or contact support.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* PDF Viewer */}
            <div 
              className="relative bg-white border rounded" 
              style={{ minHeight: '600px' }}
              onContextMenu={disableRightClick}
            >
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 border-b-2 border-blue-600 rounded-full animate-spin"></div>
                    <span className="text-gray-600">Loading PDF preview...</span>
                  </div>
                </div>
              )}
              {/* Watermark for restricted users */}
              {!currentPermissions.canDownload && (
                <div className="pdf-watermark">
                  SECURE VIEW
                </div>
              )}
              
              <div 
                className="pdf-viewer-container"
                onContextMenu={disableRightClick}
                style={{ width: "100%", height: "600px" }}
              >
                <object
                  data={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&zoom=page-width`}
                  type="application/pdf"
                  width="100%"
                  height="600px"
                  className={`rounded ${!currentPermissions.canCopy ? 'pdf-viewer-restricted' : ''}`}
                  onLoad={() => setIsLoading(false)}
                  style={{
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: '#f9fafb',
                    pointerEvents: 'auto'
                  }}
                >
                  {/* PDF Viewer with Right-Click Protection */}
                  <div className="relative pdf-viewer-container">
                    {/* Transparent overlay to block right-click specifically on PDF */}
                    <div 
                      className="absolute inset-0 z-10 bg-transparent"
                      onContextMenu={handleContextMenu}
                      onMouseDown={handleMouseDown}
                      onDragStart={handleDragStart}
                      style={{
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        pointerEvents: 'auto',
                        cursor: 'default'
                      }}
                      title="PDF content is protected"
                    />
                    {/* PDF iframe */}
                    <iframe
                      src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&zoom=page-width`}
                      width="100%"
                      height="600px"
                      className={`rounded ${!currentPermissions.canCopy ? 'pdf-viewer-restricted' : ''}`}
                      onLoad={() => setIsLoading(false)}
                      onError={() => {
                        setError('Failed to load PDF preview');
                        setIsLoading(false);
                      }}
                      title={`PDF Preview: ${fileName}`}
                      style={{
                        border: 'none',
                      borderRadius: '8px',
                      backgroundColor: '#f9fafb',
                      pointerEvents: currentPermissions.canCopy ? 'auto' : 'auto'
                    }}
                  />
                  </div>
                </object>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(fileUrl, '_blank')}
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
                Role: <span className="font-medium">{getRoleDisplayName(userRole)}</span>
              </div>
            </div>

            {/* Security Notice */}
            {!currentPermissions.canDownload && (
              <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11.5C15.4,11.5 16,12.1 16,12.7V16.7C16,17.4 15.4,18 14.8,18H9.2C8.6,18 8,17.4 8,16.8V12.8C8,12.2 8.6,11.6 9.2,11.6V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.5,8.7 10.5,10V11.5H13.5V10C13.5,8.7 12.8,8.2 12,8.2Z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">Document Access Restricted</p>
                    <p className="mt-1 text-xs text-blue-700">
                      Your current role (<span className="font-medium">{getRoleDisplayName(userRole)}</span>) allows viewing only. Contact an administrator for download access.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}