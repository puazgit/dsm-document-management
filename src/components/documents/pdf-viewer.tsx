'use client';

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useSession } from 'next-auth/react';

interface SecurePDFViewerProps {
  fileUrl: string;
  fileName: string;
  userRole: string;
  canDownload?: boolean;
  document?: any;
}

function SecurePDFViewer({ 
  fileUrl, 
  fileName, 
  userRole = 'viewer', 
  canDownload = false, 
  document 
}: SecurePDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const pdfContainerRef = React.useRef<HTMLDivElement>(null);

  // Memoized helper function to get display name for role
  const getRoleDisplayName = useCallback((role: string): string => {
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
  }, []);

  // Sanitize filename to prevent XSS
  const sanitizeFileName = (filename: string): string => {
    // Remove any HTML tags and special characters that could be dangerous
    return filename.replace(/<[^>]*>/g, '').replace(/[<>"'`]/g, '');
  };

  // Use sanitized filename
  const safeFileName = sanitizeFileName(fileName);

  // Simple and effective right-click disable function
  const disableRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Enhanced right-click prevention - Component level only
  const preventAllContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  // State for dynamic permissions from database
  const [currentPermissions, setCurrentPermissions] = useState({
    canDownload: false,
    canPrint: false,
    canCopy: false,
    showWatermark: true
  });
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const { data: session } = useSession();

  // Load user permissions from database
  useEffect(() => {
    const loadPermissions = async () => {
      if (!session?.user) {
        // No session, try to fetch from database based on role
        try {
          const fallbackPermissions = await getFallbackPermissions(userRole);
          setCurrentPermissions(fallbackPermissions);
        } catch (error) {
          console.error('Error loading fallback permissions:', error);
          setCurrentPermissions({
            canDownload: false,
            canPrint: false,
            canCopy: false,
            showWatermark: true
          });
        }
        setPermissionsLoaded(true);
        return;
      }

      try {
        // Debug: Log session data in PDF viewer
        console.log('🔍 PDF Viewer - Session Analysis:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          email: session?.user?.email,
          role: session?.user?.role,
          hasPermissions: !!session?.user?.permissions,
          permissionCount: session?.user?.permissions?.length || 0,
          permissions: session?.user?.permissions,
          hasPdfDownload: session?.user?.permissions?.includes('pdf.download'),
          hasDocDownload: session?.user?.permissions?.includes('documents.download')
        });
        
        // Fetch user permissions from session or API
        const userPermissions = session.user.permissions || [];
        
        // Check specific PDF permissions (using correct format from database)
        const canDownload = userPermissions.includes('pdf.download') || 
                          userPermissions.includes('documents.download');
        const canPrint = userPermissions.includes('pdf.print');
        const canCopy = userPermissions.includes('pdf.copy');
        // pdf.watermark controls whether watermark is shown (false = no watermark, true/missing = show watermark)
        const showWatermark = !userPermissions.includes('pdf.watermark');

        console.log('🎯 PDF Viewer - Permission Decision:', {
          canDownload,
          canPrint,
          canCopy,
          showWatermark,
          userPermissions,
          fallbackUsed: false
        });
        
        setCurrentPermissions({
          canDownload,
          canPrint, 
          canCopy,
          showWatermark
        });
      } catch (error) {
        console.error('Error loading permissions:', error);
        // Fallback to database permissions for backwards compatibility
        console.log('⚠️ PDF Viewer - Using Fallback Permissions for role:', userRole);
        try {
          const fallbackPermissions = await getFallbackPermissions(userRole);
          console.log('🎯 PDF Viewer - Fallback Permission Decision:', {
            ...fallbackPermissions,
            userRole,
            fallbackUsed: true
          });
          setCurrentPermissions(fallbackPermissions);
        } catch (fallbackError) {
          console.error('Error loading fallback permissions:', fallbackError);
          // Last resort: use safe defaults
          setCurrentPermissions({
            canDownload: false,
            canPrint: false,
            canCopy: false,
            showWatermark: true
          });
        }
      } finally {
        setPermissionsLoaded(true);
      }
    };

    loadPermissions();
  }, [session, userRole]);

  // Fetch permissions from database based on role
  const getFallbackPermissions = async (role: string): Promise<{
    canDownload: boolean;
    canPrint: boolean;
    canCopy: boolean;
    showWatermark: boolean;
  }> => {
    try {
      console.log('🔄 Fetching fallback permissions from database for role:', role);
      
      // Fetch from API
      const response = await fetch(`/api/roles/${encodeURIComponent(role)}/permissions-summary`);
      
      if (!response.ok) {
        console.warn('⚠️ Failed to fetch role permissions from API, using hardcoded fallback');
        return getHardcodedFallbackPermissions(role);
      }
      
      const permissions = await response.json();
      console.log('✅ Fetched permissions from database:', permissions);
      
      return permissions;
    } catch (error) {
      console.error('❌ Error fetching role permissions:', error);
      return getHardcodedFallbackPermissions(role);
    }
  };

  // Hardcoded fallback as last resort (synced with database as of Dec 2024)
  // This should ONLY be used if both session and API calls fail
  const getHardcodedFallbackPermissions = (role: string) => {
    const rolePermissions = {
      // Core roles (synced with database)
      'administrator': { canDownload: true, canPrint: true, canCopy: true, showWatermark: false },
      'admin': { canDownload: true, canPrint: true, canCopy: true, showWatermark: false },
      'manager': { canDownload: true, canPrint: true, canCopy: true, showWatermark: true }, // No pdf.watermark in DB
      'editor': { canDownload: true, canPrint: false, canCopy: false, showWatermark: true }, // No pdf.watermark in DB
      'viewer': { canDownload: true, canPrint: true, canCopy: true, showWatermark: false }, // Has pdf.watermark in DB
      'reviewer': { canDownload: false, canPrint: false, canCopy: false, showWatermark: true },
      'ppd': { canDownload: true, canPrint: true, canCopy: true, showWatermark: false },
      'kadiv': { canDownload: true, canPrint: true, canCopy: false, showWatermark: true },
      'guest': { canDownload: false, canPrint: false, canCopy: false, showWatermark: true },
      // Organizational roles mapping (synced with database)
      'org_administrator': { canDownload: true, canPrint: true, canCopy: true, showWatermark: false },
      'org_dirut': { canDownload: true, canPrint: true, canCopy: true, showWatermark: false },
      'org_dewas': { canDownload: true, canPrint: true, canCopy: true, showWatermark: false },
      'org_ppd': { canDownload: true, canPrint: true, canCopy: true, showWatermark: false },
      'org_komite_audit': { canDownload: true, canPrint: true, canCopy: false, showWatermark: false },
      'org_gm': { canDownload: true, canPrint: true, canCopy: false, showWatermark: false },
      'org_kadiv': { canDownload: true, canPrint: true, canCopy: false, showWatermark: true },
      'org_manager': { canDownload: true, canPrint: true, canCopy: true, showWatermark: true },
      'org_finance': { canDownload: true, canPrint: true, canCopy: true, showWatermark: false },
      'org_hrd': { canDownload: true, canPrint: true, canCopy: true, showWatermark: false },
      'org_supervisor': { canDownload: true, canPrint: true, canCopy: true, showWatermark: false },
      'org_sekretaris': { canDownload: true, canPrint: true, canCopy: true, showWatermark: false },
      'org_staff': { canDownload: true, canPrint: true, canCopy: true, showWatermark: false },
      'org_guest': { canDownload: false, canPrint: false, canCopy: false, showWatermark: true }
    };
    
    console.warn('⚠️ Using hardcoded fallback permissions for role:', role, '- This should rarely happen!');
    
    return rolePermissions[role.toLowerCase() as keyof typeof rolePermissions] || {
      canDownload: false,
      canPrint: false,
      canCopy: false,
      showWatermark: true
    };
  };

  // Security: Disable keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Disable F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.key === 'U') ||
        (e.ctrlKey && e.key === 'S')) {
      e.preventDefault();
    }
  };

  // Security: Disable drag and drop
  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Security: Disable text selection if copy not allowed
  const handleSelectStart = (e: React.SyntheticEvent) => {
    if (!currentPermissions.canCopy) {
      e.preventDefault();
    }
  };

  // Utility function to check if file is PDF
  const isPDFFile = (filename: string) => {
    return filename.toLowerCase().endsWith('.pdf');
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    const colors = {
      'administrator': 'bg-purple-100 text-purple-800 border-purple-300',
      'admin': 'bg-purple-100 text-purple-800 border-purple-300',
      'manager': 'bg-blue-100 text-blue-800 border-blue-300',
      'editor': 'bg-green-100 text-green-800 border-green-300',
      'reviewer': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'viewer': 'bg-gray-100 text-gray-800 border-gray-300',
      'guest': 'bg-red-100 text-red-800 border-red-300',
      // Organizational roles
      'org_administrator': 'bg-purple-100 text-purple-800 border-purple-300',
      'org_dirut': 'bg-purple-100 text-purple-800 border-purple-300',
      'org_dewas': 'bg-purple-100 text-purple-800 border-purple-300',
      'org_ppd': 'bg-purple-100 text-purple-800 border-purple-300',
      'org_komite_audit': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'org_gm': 'bg-blue-100 text-blue-800 border-blue-300',
      'org_kadiv': 'bg-cyan-100 text-cyan-800 border-cyan-300',
      'org_manager': 'bg-blue-100 text-blue-800 border-blue-300',
      'org_finance': 'bg-emerald-100 text-emerald-800 border-emerald-300',
      'org_hrd': 'bg-teal-100 text-teal-800 border-teal-300',
      'org_supervisor': 'bg-green-100 text-green-800 border-green-300',
      'org_sekretaris': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'org_staff': 'bg-gray-100 text-gray-800 border-gray-300',
      'org_guest': 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[role.toLowerCase() as keyof typeof colors] || colors['guest'];
  };

  // Handle page navigation
  const handlePageUp = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePageDown = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Handle download functionality
  const handleDownload = async () => {
    // Ensure we're running in the browser with document available
    if (typeof window === 'undefined') {
      console.error('❌ Download failed: Not running in browser environment');
      alert('Download failed: Please try again');
      return;
    }

    // Get safe reference to browser document object (avoid prop naming conflict)
    const browserDocument = typeof window !== 'undefined' && typeof window.document !== 'undefined' ? window.document : null;
    if (!browserDocument) {
      console.error('❌ Download failed: Browser document not available');
      alert('Download failed: Please try again');
      return;
    }

    if (!currentPermissions.canDownload) {
      alert('Download not permitted for your role.');
      return;
    }

    if (isDownloading) return; // Prevent multiple downloads

    setIsDownloading(true);
    try {
      console.log('🔄 Starting download for:', fileName);
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = browserDocument.createElement('a');
      a.href = url;
      a.download = safeFileName;
      browserDocument.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      browserDocument.body.removeChild(a);
      
      // Show success feedback
      console.log('✅ Download completed successfully');
    } catch (error) {
      console.error('❌ Download failed:', error);
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // Determine if user can download based on role and prop
  const canUserDownload = canDownload && currentPermissions.canDownload;

  if (!isPDFFile(fileName)) {
    return (
      <div className="w-full bg-white border rounded-lg shadow">
        <div className="p-6">
          <div className="p-4 text-center border rounded-lg text-amber-600 bg-amber-50 border-amber-200">
            <p className="font-medium">Preview not available</p>
            <p className="mt-2 text-sm">This viewer only supports PDF files.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full bg-white border rounded-lg shadow pdf-viewer-restricted"
      onContextMenu={disableRightClick}
      onKeyDown={handleKeyDown}
      onDragStart={handleDragStart}
      tabIndex={0}
      style={{ width: "100%" }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" />
            </svg>
            {safeFileName}
          </h3>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-md border ${getRoleBadgeColor(userRole)}`}>
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </span>
          </div>
        </div>
        
        {/* Access Control Info */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          <span className={`flex items-center gap-1 ${currentPermissions.canDownload ? "text-green-600" : "text-red-600"}`}>
            {currentPermissions.canDownload ? "✓" : "✗"} Download
          </span>
          <span className={`flex items-center gap-1 ${currentPermissions.canPrint ? "text-green-600" : "text-red-600"}`}>
            {currentPermissions.canPrint ? "✓" : "✗"} Print
          </span>
          <span className={`flex items-center gap-1 ${currentPermissions.canCopy ? "text-green-600" : "text-red-600"}`}>
            {currentPermissions.canCopy ? "✓" : "✗"} Copy
          </span>
          <span className={`flex items-center gap-1 ${!currentPermissions.showWatermark ? "text-green-600" : "text-orange-600"}`}>
            {!currentPermissions.showWatermark ? "✓" : "⚠"} {currentPermissions.showWatermark ? "Watermarked" : "No Watermark"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error ? (
          <div className="p-4 text-center text-red-600 border border-red-200 rounded-lg bg-red-50">
            <p className="font-medium">{error}</p>
            <p className="mt-2 text-sm">Please try opening the PDF in a new tab or contact support.</p>
            <div className="mt-3">
              <button
                onClick={() => window.open(fileUrl.replace('/download', '/view'), '_blank')}
                className="inline-flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                Open PDF in New Tab
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* PDF Viewer with Enhanced Security */}
            <div className="relative bg-white border rounded pdf-secure-viewer" style={{ minHeight: '600px' }}>
              {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 border-b-2 border-blue-600 rounded-full animate-spin"></div>
                    <span className="text-gray-600">Loading PDF preview...</span>
                  </div>
                </div>
              )}
              
              {/* Watermark overlay based on pdf.watermark permission */}
              {currentPermissions.showWatermark && (
                <div 
                  className="absolute inset-0 z-20 pointer-events-none"
                  style={{
                    background: `repeating-linear-gradient(
                      45deg,
                      rgba(0,0,0,0.015) 0px,
                      rgba(0,0,0,0.015) 1px,
                      transparent 1px,
                      transparent 25px
                    )`
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className="text-6xl font-bold text-gray-400 transform rotate-45 pointer-events-none select-none"
                      style={{ 
                        opacity: 0.1,
                        textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                        letterSpacing: '0.2em'
                      }}
                    >
                      {getRoleDisplayName(userRole).toUpperCase()}
                    </div>
                  </div>
                </div>
              )}
              
              <div 
                ref={pdfContainerRef}
                className="relative pdf-viewer-container"
                style={{ 
                  width: "100%", 
                  height: "600px", 
                  overflowY: "auto",
                  overflowX: "hidden"
                }}
              >
                <iframe
                  src={`${fileUrl.replace('/download', '/view')}#toolbar=0&navpanes=0&scrollbar=1`}
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                  onLoad={() => setIsLoading(false)}
                  onError={() => setError('Failed to load PDF')}
                  title={safeFileName}
                />
              </div>
            </div>

            {/* Download and Actions */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center gap-4">
                {canUserDownload ? (
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDownloading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                        Downloading...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download PDF
                      </>
                    )}
                  </button>
                ) : null}
              </div>

              <div className="text-sm text-gray-500">
                Role: <span className="font-medium">{getRoleDisplayName(userRole)}</span>
              </div>
            </div>

            {/* Security Notice */}
            {!currentPermissions.canDownload && (
              <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11.5C15.4,11.5 16,12.1 16,12.7V16.7C16,17.4 15.4,18 14.8,18H9.2C8.6,18 8,17.4 8,16.8V12.8C8,12.2 8.6,11.6 9.2,11.6V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.5,8.7 10.5,10V11.5H13.5V10C13.5,8.7 12.8,8.2 12,8.2Z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">Document Access Restricted</p>
                    <p className="mt-1 text-xs text-blue-700">
                      Your current role ({userRole}) allows viewing only. Contact an administrator for download access.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Memoized component for performance
const MemoizedSecurePDFViewer = memo(SecurePDFViewer);

// Export memoized versions
export { MemoizedSecurePDFViewer as SecurePDFViewer };
export const PDFViewer = MemoizedSecurePDFViewer;
export default MemoizedSecurePDFViewer;