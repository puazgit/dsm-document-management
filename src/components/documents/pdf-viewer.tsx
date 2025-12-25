'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { useSession } from 'next-auth/react';
import logger from '@/lib/logger';

// Constants
const PDF_VIEWER_HEIGHT = '1200px';
const WATERMARK_OPACITY = 0.1;
const WATERMARK_ROTATION = 45;
const DEFAULT_PERMISSIONS = {
  canDownload: false,
  canPrint: false,
  canCopy: false,
  showWatermark: true
};

// TypeScript Interfaces
interface DocumentType {
  id: string;
  name: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Document {
  id: string;
  title: string;
  fileName: string;
  fileSize?: number | bigint;
  status?: string;
  description?: string;
  tags?: string[];
  createdAt: Date | string;
  createdById: string;
  createdBy?: User;
  documentType?: DocumentType;
}

interface PDFPermissions {
  canDownload: boolean;
  canPrint: boolean;
  canCopy: boolean;
  showWatermark: boolean;
}

interface SecurePDFViewerProps {
  fileUrl: string;
  fileName: string;
  userRole: string;
  canDownload?: boolean;
  document?: Document;
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [roleDisplayName, setRoleDisplayName] = useState<string>('');

  // Fetch role display name from database
  const fetchRoleDisplayName = useCallback(async (role: string): Promise<string> => {
    try {
      const response = await fetch(`/api/roles/display-name/${encodeURIComponent(role)}`);
      if (response.ok) {
        const data = await response.json();
        return data.displayName;
      }
    } catch (error) {
      logger.error('Error fetching role display name', 'PDFViewer', error, { role });
    }
    // Fallback: capitalize role name
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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

  // State for dynamic permissions from database
  const [currentPermissions, setCurrentPermissions] = useState<PDFPermissions>(DEFAULT_PERMISSIONS);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const { data: session } = useSession();

  // Fetch role display name when component mounts
  useEffect(() => {
    fetchRoleDisplayName(userRole).then(setRoleDisplayName);
  }, [userRole, fetchRoleDisplayName]);

  // Load user permissions from database
  useEffect(() => {
    const loadPermissions = async () => {
      if (!session?.user) {
        // No session, try to fetch from database based on role
        try {
          const fallbackPermissions = await getFallbackPermissions(userRole);
          setCurrentPermissions(fallbackPermissions);
        } catch (error) {
          logger.error('Error loading fallback permissions', 'PDFViewer', error);
          setCurrentPermissions(DEFAULT_PERMISSIONS);
        }
        setPermissionsLoaded(true);
        return;
      }

      try {
        // Debug: Log session data in PDF viewer
        logger.debug('Session Analysis', 'PDFViewer', {
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

        logger.debug('Permission Decision', 'PDFViewer', {
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
        logger.error('Error loading permissions', 'PDFViewer', error);
        // Fallback to database permissions for backwards compatibility
        logger.debug('Using Fallback Permissions', 'PDFViewer', { userRole });
        try {
          const fallbackPermissions = await getFallbackPermissions(userRole);
          logger.debug('Fallback Permission Decision', 'PDFViewer', {
            ...fallbackPermissions,
            userRole,
            fallbackUsed: true
          });
          setCurrentPermissions(fallbackPermissions);
        } catch (fallbackError) {
          logger.error('Error loading fallback permissions', 'PDFViewer', fallbackError);
          // Last resort: use safe defaults
          setCurrentPermissions(DEFAULT_PERMISSIONS);
        }
      } finally {
        setPermissionsLoaded(true);
      }
    };

    loadPermissions();
  }, [session, userRole]);

  /**
   * Fetches PDF permissions from the API based on user role
   * @param role - The user role to fetch permissions for
   * @returns Promise resolving to PDFPermissions object
   * @throws Will use hardcoded fallback if API call fails
   */
  const getFallbackPermissions = useCallback(async (role: string): Promise<PDFPermissions> => {
    try {
      logger.debug('Fetching fallback permissions from API', 'PDFViewer', { role });
      
      // Fetch from API
      const response = await fetch(`/api/roles/${encodeURIComponent(role)}/permissions-summary`);
      
      if (!response.ok) {
        logger.warn('Failed to fetch role permissions from API, using default permissions', 'PDFViewer', { 
          role, 
          status: response.status 
        });
        return DEFAULT_PERMISSIONS;
      }
      
      const permissions = await response.json();
      logger.debug('Fetched permissions from database', 'PDFViewer', { role, permissions });
      
      return permissions;
    } catch (error) {
      logger.error('Error fetching role permissions from API', 'PDFViewer', error, { role });
      return DEFAULT_PERMISSIONS;
    }
  }, []);

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

  // Handle download functionality
  const handleDownload = async () => {
    // Ensure we're running in the browser with document available
    if (typeof window === 'undefined') {
      logger.error('Download failed: Not running in browser environment', 'PDFViewer');
      return;
    }

    // Get safe reference to browser document object (avoid prop naming conflict)
    const browserDocument = typeof window !== 'undefined' && typeof window.document !== 'undefined' ? window.document : null;
    if (!browserDocument) {
      logger.error('Download failed: Browser document not available', 'PDFViewer');
      return;
    }

    if (!currentPermissions.canDownload) {
      logger.warn('Download not permitted for role', 'PDFViewer', { userRole });
      return;
    }

    if (isDownloading) return; // Prevent multiple downloads

    setIsDownloading(true);
    try {
      logger.debug('Starting download', 'PDFViewer', { fileName });
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
      
      logger.info('Download completed successfully', 'PDFViewer', { fileName: safeFileName });
    } catch (error) {
      logger.error('Download failed', 'PDFViewer', error, { fileName });
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
      <div className="p-3">
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
            <div 
              className="relative bg-white border rounded pdf-secure-viewer" 
              style={{ minHeight: PDF_VIEWER_HEIGHT }}
              role="region"
              aria-label="PDF Document Viewer"
            >
              {isLoading && (
                <div 
                  className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100 rounded"
                  role="status"
                  aria-live="polite"
                  aria-label="Loading PDF document"
                >
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
                  aria-hidden="true"
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
                      className="text-6xl font-bold text-gray-400 transform pointer-events-none select-none"
                      style={{ 
                        opacity: WATERMARK_OPACITY,
                        transform: `rotate(${WATERMARK_ROTATION}deg)`,
                        textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                        letterSpacing: '0.2em'
                      }}
                    >
                      {roleDisplayName.toUpperCase()}
                    </div>
                  </div>
                </div>
              )}
              
              <div 
                className="relative pdf-viewer-container"
                style={{ 
                  width: "100%", 
                  height: PDF_VIEWER_HEIGHT, 
                  overflowY: "auto",
                  overflowX: "hidden"
                }}
                role="document"
                aria-label="PDF content container"
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
                    aria-label={isDownloading ? 'Downloading PDF document' : 'Download PDF document'}
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
                Role: <span className="font-medium">{roleDisplayName || userRole}</span>
              </div>
            </div>

            {/* Subtle Access Notice - only shown when download permission is restricted */}
            {!currentPermissions.canDownload && (
              <div 
                className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600 border-l-2 border-gray-400 rounded-r bg-gray-50"
                role="status"
                aria-live="polite"
                aria-label="Access restriction notice"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0 text-gray-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>View-only access. Need download permission? Contact your administrator.</span>
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