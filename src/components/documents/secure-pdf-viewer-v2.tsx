'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield, Eye, Download, Printer, Copy } from 'lucide-react';

interface SecurePDFViewerProps {
  fileUrl: string;
  fileName: string;
  userRole?: string;
  canDownload?: boolean;
  canPrint?: boolean;
  canCopy?: boolean;
  document?: any;
  watermark?: string;
  onSecurityViolation?: (type: string, details: any) => void;
}

interface RolePermissions {
  canDownload: boolean;
  canPrint: boolean;
  canCopy: boolean;
  showWatermark: boolean;
}

export function SecurePDFViewerV2({
  fileUrl,
  fileName,
  userRole = 'viewer',
  canDownload,
  canPrint,
  canCopy,
  document,
  watermark,
  onSecurityViolation
}: SecurePDFViewerProps) {
  const [securityViolations, setSecurityViolations] = useState<number>(0);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout>();

  // Enhanced role permissions
  const rolePermissions: Record<string, RolePermissions> = {
    'admin': { canDownload: true, canPrint: true, canCopy: true, showWatermark: false },
    'org_ppd': { canDownload: true, canPrint: true, canCopy: true, showWatermark: false },
    'org_manager': { canDownload: true, canPrint: true, canCopy: false, showWatermark: false },
    'org_kadiv': { canDownload: true, canPrint: false, canCopy: false, showWatermark: false },
    'viewer': { canDownload: false, canPrint: false, canCopy: false, showWatermark: true },
    'editor': { canDownload: false, canPrint: true, canCopy: false, showWatermark: false },
    'org_guest': { canDownload: false, canPrint: false, canCopy: false, showWatermark: true }
  };

  const currentPermissions = {
    ...rolePermissions[userRole] || rolePermissions['viewer'],
    // Allow prop overrides
    ...(canDownload !== undefined && { canDownload }),
    ...(canPrint !== undefined && { canPrint }),
    ...(canCopy !== undefined && { canCopy })
  };

  // Security violation handler
  const handleSecurityViolation = useCallback((type: string, details: any = {}) => {
    const violation = {
      type,
      timestamp: new Date().toISOString(),
      userRole,
      fileName,
      details,
      violations: securityViolations + 1
    };
    
    setSecurityViolations(prev => prev + 1);
    console.warn('Security violation detected:', violation);
    onSecurityViolation?.(type, violation);
  }, [userRole, fileName, securityViolations, onSecurityViolation]);

  // Right-click prevention
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;
    
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      handleSecurityViolation('RIGHT_CLICK_ATTEMPT', { target: (e.target as Element)?.tagName });
      return false;
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      handleSecurityViolation('DRAG_ATTEMPT', { target: (e.target as Element)?.tagName });
      return false;
    };

    const handleSelectStart = (e: Event) => {
      if (!currentPermissions.canCopy) {
        e.preventDefault();
        handleSecurityViolation('TEXT_SELECTION_BLOCKED', { target: (e.target as Element)?.tagName });
        return false;
      }
      return true;
    };

    if (containerRef.current) {
      const container = containerRef.current;
      container.addEventListener('contextmenu', handleContextMenu);
      container.addEventListener('dragstart', handleDragStart);
      container.addEventListener('selectstart', handleSelectStart);

      return () => {
        container.removeEventListener('contextmenu', handleContextMenu);
        container.removeEventListener('dragstart', handleDragStart);
        container.removeEventListener('selectstart', handleSelectStart);
      };
    }

    return () => {};
  }, [currentPermissions.canCopy, handleSecurityViolation]);

  // Keyboard shortcuts blocking
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const forbidden = [
        (e.ctrlKey || e.metaKey) && e.key === 'p', // Print
        (e.ctrlKey || e.metaKey) && e.key === 's', // Save
        !currentPermissions.canCopy && (e.ctrlKey || e.metaKey) && e.key === 'c', // Copy
        !currentPermissions.canCopy && (e.ctrlKey || e.metaKey) && e.key === 'a', // Select All
        e.key === 'F12', // DevTools
        (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I', // DevTools
        (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C', // Console
        (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J', // Console
        (e.ctrlKey || e.metaKey) && e.key === 'U', // View Source
      ];

      if (forbidden.some(Boolean)) {
        e.preventDefault();
        e.stopPropagation();
        handleSecurityViolation('KEYBOARD_SHORTCUT_BLOCKED', { 
          key: e.key, 
          ctrlKey: e.ctrlKey, 
          metaKey: e.metaKey, 
          shiftKey: e.shiftKey 
        });
        return false;
      }
      return true;
    };

    // Only add event listeners on client-side
    if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('keydown', handleKeyDown, { capture: true });
    }
    
    return () => {
      if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.removeEventListener) {
        document.removeEventListener('keydown', handleKeyDown, { capture: true });
      }
    };
  }, [currentPermissions.canCopy, handleSecurityViolation]);

  // PDF loading timeout
  useEffect(() => {
    // Set a timeout for PDF loading
    if (isLoading) {
      loadTimeoutRef.current = setTimeout(() => {
        if (isLoading) {
          setLoadTimeout(true);
          setError('PDF loading timed out after 5 seconds. This may be due to a large file size or network issues. Try selecting "🛡️ Ultra Secure" viewer or "Fallback Viewer" instead.');
          setIsLoading(false);
        }
      }, 5000); // 5 second timeout
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [isLoading]);

  // Developer tools detection
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;
    
    const detectDevTools = () => {
      const threshold = 160;
      const heightDiff = window.outerHeight - window.innerHeight;
      const widthDiff = window.outerWidth - window.innerWidth;
      
      if (heightDiff > threshold || widthDiff > threshold) {
        if (!isDevToolsOpen) {
          setIsDevToolsOpen(true);
          handleSecurityViolation('DEV_TOOLS_DETECTED', { heightDiff, widthDiff });
        }
      } else if (isDevToolsOpen) {
        setIsDevToolsOpen(false);
      }
    };

    const interval = setInterval(detectDevTools, 1000);
    return () => clearInterval(interval);
  }, [isDevToolsOpen, handleSecurityViolation]);

  const handleDownload = () => {
    if (currentPermissions.canDownload) {
      window.open(fileUrl, '_blank');
    } else {
      handleSecurityViolation('DOWNLOAD_ATTEMPT', {});
    }
  };

  const handlePrint = () => {
    if (currentPermissions.canPrint) {
      window.print();
    } else {
      handleSecurityViolation('PRINT_ATTEMPT', {});
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      'administrator': 'bg-purple-100 text-purple-800 border-purple-300',
      'admin': 'bg-purple-100 text-purple-800 border-purple-300',
      'manager': 'bg-blue-100 text-blue-800 border-blue-300',
      'editor': 'bg-green-100 text-green-800 border-green-300',
      'reviewer': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'viewer': 'bg-gray-100 text-gray-800 border-gray-300',
      'guest': 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[role as keyof typeof colors] || colors.viewer;
  };

  return (
    <Card 
      ref={containerRef}
      className="w-full max-w-6xl mx-auto border-2 shadow-lg secure-content"
      style={{
        userSelect: currentPermissions.canCopy ? 'auto' : 'none',
        WebkitUserSelect: currentPermissions.canCopy ? 'auto' : 'none',
        MozUserSelect: currentPermissions.canCopy ? 'auto' : 'none'
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 truncate max-w-md">{fileName}</h3>
                <p className="text-sm text-gray-500">Secure PDF Viewer v2</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={getRoleBadgeColor(userRole)}>
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </Badge>
            
            {currentPermissions.showWatermark && (
              <Badge variant="outline" className="border-orange-300 text-orange-600">
                <Shield className="w-3 h-3 mr-1" />
                Protected
              </Badge>
            )}
            
            {securityViolations > 0 && (
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {securityViolations} Violations
              </Badge>
            )}
          </div>
        </div>

        {/* Permissions Display */}
        <div className="flex items-center gap-4 pt-2 text-xs">
          <div className={`flex items-center gap-1 ${currentPermissions.canDownload ? 'text-green-600' : 'text-red-600'}`}>
            <Download className="w-3 h-3" />
            <span>Download: {currentPermissions.canDownload ? 'Allowed' : 'Restricted'}</span>
          </div>
          <div className={`flex items-center gap-1 ${currentPermissions.canPrint ? 'text-green-600' : 'text-red-600'}`}>
            <Printer className="w-3 h-3" />
            <span>Print: {currentPermissions.canPrint ? 'Allowed' : 'Restricted'}</span>
          </div>
          <div className={`flex items-center gap-1 ${currentPermissions.canCopy ? 'text-green-600' : 'text-red-600'}`}>
            <Copy className="w-3 h-3" />
            <span>Copy: {currentPermissions.canCopy ? 'Allowed' : 'Restricted'}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Security Alerts */}
        {isDevToolsOpen && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Security Alert: Developer tools detected. This activity is being monitored.
            </AlertDescription>
          </Alert>
        )}

        {securityViolations > 0 && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              {securityViolations} security violation(s) detected. Continued attempts may result in access restriction.
            </AlertDescription>
          </Alert>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Secure iframe-based PDF viewer with enhanced security measures
            </span>
          </div>

          <div className="flex items-center gap-2">
            {currentPermissions.canPrint && (
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1" />
                Print
              </Button>
            )}
            
            {currentPermissions.canDownload && (
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            )}
          </div>
        </div>

        {/* PDF Viewer */}
        <div 
          className="relative bg-white border rounded-lg shadow-inner secure-pdf-container" 
          style={{ 
            minHeight: '600px',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            userSelect: 'none'
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            handleSecurityViolation('CONTAINER_CONTEXT_MENU_BLOCKED', {});
            return false;
          }}
        >
          {/* Loading State */}
          {isLoading && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <div className="text-center">
                  <p className="text-gray-600 font-medium">Loading secure PDF...</p>
                  <p className="text-sm text-gray-500 mt-1">This may take a few moments</p>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg z-10">
              <div className="text-center max-w-md p-6">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">PDF Loading Error</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button 
                  onClick={() => {
                    setError(null);
                    setIsLoading(true);
                    setLoadTimeout(false);
                    // Force iframe reload by changing src
                    if (iframeRef.current) {
                      const currentSrc = iframeRef.current.src;
                      iframeRef.current.src = '';
                      setTimeout(() => {
                        if (iframeRef.current) {
                          iframeRef.current.src = currentSrc;
                        }
                      }, 100);
                    }
                  }}
                  variant="outline"
                >
                  Retry Loading
                </Button>
              </div>
            </div>
          )}

          <div className="relative">
            <iframe
              ref={iframeRef}
              src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&view=Fit&pagemode=none&search=""&bookmarks=0&thumbnails=0&disableexternallinks=1&zoom=85`}
              width="100%"
              height="600px"
              sandbox="allow-same-origin allow-scripts"
              style={{
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#f9fafb',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                pointerEvents: 'auto'
              }}
              className={`pdf-viewer-restricted ${!currentPermissions.canCopy ? 'no-select' : ''}`}
              title={`PDF: ${fileName}`}
            onLoad={() => {
              console.log('PDF loaded successfully:', fileUrl);
              setIsLoading(false);
              setError(null);
              setLoadTimeout(false);
            }}
            onError={(e) => {
              console.error('PDF loading error:', e, 'URL:', fileUrl);
              setIsLoading(false);
              setError(`Failed to load PDF from: ${fileUrl}. The file may be corrupted, not accessible, or blocked by browser security policies.`);
            }}
              onContextMenu={(e) => {
                e.preventDefault();
                handleSecurityViolation('PDF_CONTEXT_MENU', {});
                return false;
              }}
            />
            
            {/* Transparent overlay to block iframe context menu */}
            <div 
              className="absolute inset-0 pointer-events-auto"
              style={{
                background: 'transparent',
                zIndex: 1
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSecurityViolation('OVERLAY_CONTEXT_MENU_BLOCKED', {
                  target: 'PDF_OVERLAY',
                  position: { x: e.clientX, y: e.clientY }
                });
                return false;
              }}
              onMouseDown={(e) => {
                // Block right mouse button
                if (e.button === 2) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSecurityViolation('RIGHT_CLICK_BLOCKED', {
                    button: e.button,
                    target: 'PDF_OVERLAY'
                  });
                }
              }}
              onDragStart={(e) => {
                e.preventDefault();
                handleSecurityViolation('DRAG_BLOCKED', {
                  target: 'PDF_OVERLAY'
                });
              }}
            />
          </div>

          {/* Watermark overlay */}
          {currentPermissions.showWatermark && (
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `repeating-linear-gradient(
                  45deg,
                  rgba(0,0,0,0.015) 0px,
                  rgba(0,0,0,0.015) 1px,
                  transparent 1px,
                  transparent 25px
                )`,
                zIndex: 1
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div 
                  className="text-6xl font-bold text-gray-300 select-none pointer-events-none transform rotate-45"
                  style={{ 
                    opacity: 0.08,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                    letterSpacing: '0.2em'
                  }}
                >
                  {watermark || `${userRole.toUpperCase()} ACCESS`}
                </div>
              </div>
            </div>
          )}

          {/* Security overlay for non-copy roles */}
          {!currentPermissions.canCopy && (
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: 0 }}
              onContextMenu={(e) => {
                e.preventDefault();
                handleSecurityViolation('SECURITY_OVERLAY_INTERACTION', {});
                return false;
              }}
            />
          )}
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
          <div className="flex items-center gap-4">
            <span>Role: {userRole}</span>
            <span>Violations: {securityViolations}</span>
            <span>Version: v2.0</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Eye className="w-3 h-3" />
            <span>Enhanced security active</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SecurePDFViewerV2;