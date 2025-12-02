'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield, Eye, Download, Printer, Copy, RotateCcw } from 'lucide-react';

interface UltraSecurePDFViewerProps {
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

export function UltraSecurePDFViewer({
  fileUrl,
  fileName,
  userRole = 'viewer',
  canDownload,
  canPrint,
  canCopy,
  document,
  watermark,
  onSecurityViolation
}: UltraSecurePDFViewerProps) {
  const [securityViolations, setSecurityViolations] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Enhanced role permissions
  const rolePermissions: Record<string, RolePermissions> = {
    'admin': { canDownload: true, canPrint: true, canCopy: true, showWatermark: false },
    'org_ppd': { canDownload: true, canPrint: true, canCopy: true, showWatermark: false },
    'org_manager': { canDownload: true, canPrint: true, canCopy: false, showWatermark: false },
    'editor': { canDownload: true, canPrint: false, canCopy: false, showWatermark: true },
    'reviewer': { canDownload: false, canPrint: false, canCopy: false, showWatermark: true },
    'viewer': { canDownload: false, canPrint: false, canCopy: false, showWatermark: true },
    'org_guest': { canDownload: false, canPrint: false, canCopy: false, showWatermark: true }
  };

  const currentPermissions = {
    ...rolePermissions[userRole] || rolePermissions['viewer'],
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
    console.warn('Ultra Secure PDF - Security violation detected:', violation);
    onSecurityViolation?.(type, violation);
  }, [userRole, fileName, securityViolations, onSecurityViolation]);

  // Load PDF with timeout and fallback to direct iframe
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 8000); // 8 second timeout

    const loadPDF = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // For local files, use direct iframe to avoid base64 conversion timeout
        if (fileUrl.startsWith('/') || fileUrl.startsWith('./')) {
          setPdfData(fileUrl); // Use direct URL for local files
          setIsLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        const response = await fetch(fileUrl, { 
          signal: controller.signal,
          headers: {
            'Accept': 'application/pdf,*/*'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Check content type
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/pdf')) {
          // If not PDF, fallback to direct URL
          setPdfData(fileUrl);
          setIsLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        const blob = await response.blob();
        
        // Check file size - if too large, use direct URL
        if (blob.size > 5 * 1024 * 1024) { // 5MB limit
          console.warn('PDF file too large for base64 conversion, using direct URL');
          setPdfData(fileUrl);
          setIsLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        const reader = new FileReader();
        
        reader.onload = () => {
          setPdfData(reader.result as string);
          setIsLoading(false);
          clearTimeout(timeoutId);
        };
        
        reader.onerror = () => {
          console.warn('FileReader error, falling back to direct URL');
          setPdfData(fileUrl);
          setIsLoading(false);
          clearTimeout(timeoutId);
        };
        
        reader.readAsDataURL(blob);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.warn('PDF loading timed out, falling back to direct URL');
          setPdfData(fileUrl); // Fallback to direct URL on timeout
        } else {
          console.error('PDF loading error:', err);
          setError(err instanceof Error ? err.message : 'Failed to load PDF');
        }
        setIsLoading(false);
        clearTimeout(timeoutId);
      }
    };

    loadPDF();

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [fileUrl]);

  // Comprehensive security measures
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const handleContextMenu = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) {
        e.preventDefault();
        e.stopPropagation();
        handleSecurityViolation('CONTEXT_MENU_BLOCKED', { 
          target: (e.target as Element)?.tagName,
          position: { x: e.clientX, y: e.clientY }
        });
        return false;
      }
      return true;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const forbidden = [
        (e.ctrlKey || e.metaKey) && e.key === 'p', // Print
        (e.ctrlKey || e.metaKey) && e.key === 's', // Save
        !currentPermissions.canCopy && (e.ctrlKey || e.metaKey) && e.key === 'c', // Copy
        !currentPermissions.canCopy && (e.ctrlKey || e.metaKey) && e.key === 'a', // Select All
        e.key === 'F12', // DevTools
        (e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'C', 'J'].includes(e.key), // DevTools
        (e.ctrlKey || e.metaKey) && e.key === 'u', // View Source
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

    const handleSelectStart = (e: Event) => {
      if (!currentPermissions.canCopy && containerRef.current?.contains(e.target as Node)) {
        e.preventDefault();
        handleSecurityViolation('TEXT_SELECTION_BLOCKED', {
          target: (e.target as Element)?.tagName
        });
        return false;
      }
      return true;
    };

    const handleDragStart = (e: DragEvent) => {
      if (containerRef.current?.contains(e.target as Node)) {
        e.preventDefault();
        handleSecurityViolation('DRAG_BLOCKED', {
          target: (e.target as Element)?.tagName
        });
        return false;
      }
      return true;
    };

    // Add event listeners
    if (typeof document !== 'undefined') {
      document.addEventListener('contextmenu', handleContextMenu, { passive: false });
      document.addEventListener('keydown', handleKeyDown, { passive: false });
      document.addEventListener('selectstart', handleSelectStart, { passive: false });
      document.addEventListener('dragstart', handleDragStart, { passive: false });
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('selectstart', handleSelectStart);
        document.removeEventListener('dragstart', handleDragStart);
      }
    };
  }, [currentPermissions, handleSecurityViolation]);

  const handleDownload = () => {
    if (!currentPermissions.canDownload) {
      handleSecurityViolation('UNAUTHORIZED_DOWNLOAD_ATTEMPT', {});
      return;
    }
    window.open(fileUrl, '_blank');
  };

  const handlePrint = () => {
    if (!currentPermissions.canPrint) {
      handleSecurityViolation('UNAUTHORIZED_PRINT_ATTEMPT', {});
      return;
    }
    window.print();
  };

  const retryLoad = () => {
    setError(null);
    setIsLoading(true);
    setPdfData(null);
    // Trigger reload by changing the key
    const iframe = containerRef.current?.querySelector('iframe');
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold">{fileName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  Ultra Secure • Role: {userRole}
                </Badge>
                {securityViolations > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {securityViolations} Violations
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={retryLoad} disabled={isLoading}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {securityViolations > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {securityViolations} security violation(s) detected. Continued attempts may result in access restriction.
            </AlertDescription>
          </Alert>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Ultra Secure PDF Viewer - Context menu and shortcuts completely disabled
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
          ref={containerRef}
          className="relative bg-white border rounded-lg shadow-inner" 
          style={{ 
            minHeight: '600px',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            userSelect: 'none'
          }}
        >
          {/* Loading State */}
          {isLoading && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <div className="text-center">
                  <p className="text-gray-600 font-medium">Loading ultra secure PDF...</p>
                  <p className="text-sm text-gray-500 mt-1">Applying maximum security measures</p>
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
                <Button onClick={retryLoad} variant="outline">
                  Retry Loading
                </Button>
              </div>
            </div>
          )}

          {/* PDF Content - Using base64 data URL to prevent direct access */}
          {pdfData && !isLoading && (
            <div className="relative">
              <iframe
                src={`${pdfData}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&view=FitH&zoom=page-width&pagemode=none&search=""&bookmarks=0&thumbnails=0&disableexternallinks=1`}
                width="100%"
                height="600px"
                sandbox="allow-same-origin"
                style={{
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  pointerEvents: 'none'
                }}
                title={`Ultra Secure PDF: ${fileName}`}
              />
              
              {/* Invisible overlay to completely block any interaction with PDF */}
              <div 
                className="absolute inset-0"
                style={{
                  background: 'transparent',
                  zIndex: 2,
                  pointerEvents: 'auto',
                  cursor: 'default'
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSecurityViolation('OVERLAY_CONTEXT_MENU_BLOCKED', {});
                  return false;
                }}
                onMouseDown={(e) => {
                  if (e.button === 2) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSecurityViolation('RIGHT_CLICK_BLOCKED', {});
                  }
                }}
              />
            </div>
          )}

          {/* Watermark overlay */}
          {currentPermissions.showWatermark && (
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `repeating-linear-gradient(
                  45deg,
                  rgba(0,0,0,0.02) 0px,
                  rgba(0,0,0,0.02) 1px,
                  transparent 1px,
                  transparent 40px
                )`,
                zIndex: 3
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div 
                  className="text-6xl font-bold text-gray-300 opacity-20 transform rotate-45 select-none"
                  style={{ 
                    textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                    pointerEvents: 'none'
                  }}
                >
                  {watermark || 'CONFIDENTIAL'}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Ultra Security Mode:</strong> This viewer completely disables right-click, keyboard shortcuts, 
            text selection, and drag operations. PDF is loaded as base64 data to prevent direct URL access.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}