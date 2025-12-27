'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Import PDF components dynamically to avoid SSR issues
const Document = dynamic(
  () => import('react-pdf').then(mod => ({ default: mod.Document })),
  { ssr: false, loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded"></div> }
);

const Page = dynamic(
  () => import('react-pdf').then(mod => ({ default: mod.Page })),
  { ssr: false }
);
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Shield, Eye, Download, Printer, Copy, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePDFJS } from '@/hooks/use-pdfjs';

interface AdvancedPDFViewerProps {
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
  canZoom: boolean;
  canRotate: boolean;
  maxZoom: number;
  showWatermark: boolean;
}

export function AdvancedPDFViewer({
  fileUrl,
  fileName,
  userRole = 'viewer',
  canDownload,
  canPrint,
  canCopy,
  document,
  watermark,
  onSecurityViolation
}: AdvancedPDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [pageInput, setPageInput] = useState('1');
  const [securityViolations, setSecurityViolations] = useState<number>(0);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { isReady: isPDFJSReady } = usePDFJS();
  const pageRef = useRef<HTMLDivElement>(null);
  const lastInteractionTime = useRef<number>(Date.now());

  // Enhanced role permissions
  const rolePermissions: Record<string, RolePermissions> = {
    'admin': { 
      canDownload: true, canPrint: true, canCopy: true, canZoom: true, 
      canRotate: true, maxZoom: 3.0, showWatermark: false 
    },
    'administrator': { 
      canDownload: true, canPrint: true, canCopy: true, canZoom: true, 
      canRotate: true, maxZoom: 3.0, showWatermark: false 
    },
    'manager': { 
      canDownload: true, canPrint: true, canCopy: false, canZoom: true, 
      canRotate: true, maxZoom: 2.5, showWatermark: false 
    },
    'editor': { 
      canDownload: true, canPrint: false, canCopy: false, canZoom: true, 
      canRotate: false, maxZoom: 2.0, showWatermark: true 
    },
    'reviewer': { 
      canDownload: false, canPrint: false, canCopy: false, canZoom: true, 
      canRotate: false, maxZoom: 1.8, showWatermark: true 
    },
    'viewer': { 
      canDownload: false, canPrint: false, canCopy: false, canZoom: true, 
      canRotate: false, maxZoom: 1.5, showWatermark: true 
    },
    'guest': { 
      canDownload: false, canPrint: false, canCopy: false, canZoom: false, 
      canRotate: false, maxZoom: 1.2, showWatermark: true 
    }
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

  // Developer tools detection
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;
    
    const detectDevTools = () => {
      const threshold = 160;
      const devtools = {
        open: false,
        orientation: null as string | null
      };
      
      if (window.outerHeight - window.innerHeight > threshold) {
        devtools.open = true;
        devtools.orientation = 'horizontal';
      }
      
      if (window.outerWidth - window.innerWidth > threshold) {
        devtools.open = true;
        devtools.orientation = 'vertical';
      }
      
      if (devtools.open && !isDevToolsOpen) {
        setIsDevToolsOpen(true);
        handleSecurityViolation('DEV_TOOLS_OPENED', devtools);
      } else if (!devtools.open && isDevToolsOpen) {
        setIsDevToolsOpen(false);
      }
    };

    const interval = setInterval(detectDevTools, 1000);
    return () => clearInterval(interval);
  }, [isDevToolsOpen, handleSecurityViolation]);

  // Comprehensive keyboard shortcuts blocking
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const forbidden = [
        // Print shortcuts
        (e.ctrlKey || e.metaKey) && e.key === 'p',
        // Save shortcuts
        (e.ctrlKey || e.metaKey) && e.key === 's',
        // Copy shortcuts (if not allowed)
        !currentPermissions.canCopy && (e.ctrlKey || e.metaKey) && e.key === 'c',
        // Select all (if copy not allowed)
        !currentPermissions.canCopy && (e.ctrlKey || e.metaKey) && e.key === 'a',
        // Developer tools
        e.key === 'F12',
        (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I',
        (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C',
        (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J',
        (e.ctrlKey || e.metaKey) && e.key === 'u',
        // View source
        (e.ctrlKey || e.metaKey) && e.key === 'U',
        // Zoom shortcuts (if not allowed)
        !currentPermissions.canZoom && (e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)
      ];

      if (forbidden.some(Boolean)) {
        e.preventDefault();
        e.stopPropagation();
        handleSecurityViolation('FORBIDDEN_SHORTCUT', { key: e.key, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey });
        return false;
      }
      return true;
    };

    if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('keydown', handleKeyDown, { capture: true });
    }
    
    return () => {
      if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.removeEventListener) {
        document.removeEventListener('keydown', handleKeyDown, { capture: true });
      }
    };
  }, [currentPermissions.canCopy, currentPermissions.canZoom, handleSecurityViolation]);  // Right-click and drag prevention
  useEffect(() => {
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
    
    return () => {
      // Cleanup function for when containerRef is null
    };
  }, [currentPermissions.canCopy, handleSecurityViolation]);

  // Interaction tracking
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const updateInteractionTime = () => {
      lastInteractionTime.current = Date.now();
    };

    if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('mousemove', updateInteractionTime);
      document.addEventListener('keypress', updateInteractionTime);
      document.addEventListener('click', updateInteractionTime);
    }

    return () => {
      if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.removeEventListener) {
        document.removeEventListener('mousemove', updateInteractionTime);
        document.removeEventListener('keypress', updateInteractionTime);
        document.removeEventListener('click', updateInteractionTime);
      }
    };
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError('');
  };

  const onDocumentLoadError = (error: Error) => {
    setError(`Failed to load PDF: ${error.message}`);
    setIsLoading(false);
  };

  const handlePageChange = (newPageNumber: number) => {
    if (newPageNumber >= 1 && newPageNumber <= numPages) {
      setPageNumber(newPageNumber);
      setPageInput(newPageNumber.toString());
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput, 10);
    if (page >= 1 && page <= numPages) {
      setPageNumber(page);
    } else {
      setPageInput(pageNumber.toString());
    }
  };

  const handleZoomIn = () => {
    if (currentPermissions.canZoom) {
      setScale(prev => Math.min(currentPermissions.maxZoom || 3.0, prev + 0.2));
    } else {
      handleSecurityViolation('ZOOM_ATTEMPT', { action: 'zoom_in' });
    }
  };

  const handleZoomOut = () => {
    if (currentPermissions.canZoom) {
      setScale(prev => Math.max(0.5, prev - 0.2));
    } else {
      handleSecurityViolation('ZOOM_ATTEMPT', { action: 'zoom_out' });
    }
  };

  const handleRotate = () => {
    if (currentPermissions.canRotate) {
      setRotation(prev => (prev + 90) % 360);
    } else {
      handleSecurityViolation('ROTATE_ATTEMPT', {});
    }
  };

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
      'admin': 'bg-purple-100 text-purple-800 border-purple-300',
      'administrator': 'bg-purple-100 text-purple-800 border-purple-300',
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
      className="w-full max-w-6xl mx-auto border-2 shadow-lg"
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
                <p className="text-sm text-gray-500">Secure PDF Viewer</p>
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
        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            {/* Page Navigation */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pageNumber - 1)}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
              <Input
                type="number"
                value={pageInput}
                onChange={handlePageInputChange}
                className="w-16 h-8 text-center text-sm"
                min="1"
                max={numPages}
              />
              <span className="text-sm text-gray-500">/ {numPages}</span>
            </form>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pageNumber + 1)}
              disabled={pageNumber >= numPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* Zoom Controls */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={!currentPermissions.canZoom || scale <= 0.5}
              title={!currentPermissions.canZoom ? 'Zoom restricted for your role' : 'Zoom Out'}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            
            <span className="text-sm text-gray-600 min-w-[50px] text-center">
              {Math.round(scale * 100)}%
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={!currentPermissions.canZoom || scale >= (currentPermissions.maxZoom || 3.0)}
              title={!currentPermissions.canZoom ? 'Zoom restricted for your role' : 'Zoom In'}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>

            {/* Rotate Control */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotate}
              disabled={!currentPermissions.canRotate}
              title={!currentPermissions.canRotate ? 'Rotation restricted for your role' : 'Rotate'}
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Action Buttons */}
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

        {/* Security Alerts */}
        {isDevToolsOpen && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                Security Alert: Developer tools detected. This activity is being monitored.
              </span>
            </div>
          </div>
        )}

        {securityViolations > 0 && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">
                {securityViolations} security violation(s) detected. Continued attempts may result in access restriction.
              </span>
            </div>
          </div>
        )}

        {/* PDF Viewer */}
        <div 
          ref={pageRef}
          className="relative bg-white border rounded-lg shadow-inner"
          style={{ 
            minHeight: '600px',
            position: 'relative'
          }}
        >
          {(!isPDFJSReady || isLoading) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">
                  {!isPDFJSReady ? 'Loading PDF engine...' : 'Loading secure PDF viewer...'}
                </span>
              </div>
            </div>
          )}

          {error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-4">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                <p className="text-red-600 font-medium">{error}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Please contact support if this issue persists.
                </p>
              </div>
            </div>
          ) : isPDFJSReady ? (
            <div className="flex justify-center p-4">
              <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={null}
              >
                <div className="relative">
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    rotate={rotation}
                    renderTextLayer={currentPermissions.canCopy}
                    renderAnnotationLayer={false}
                    className="shadow-lg"
                  />
                  
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
                          transparent 20px
                        )`,
                        zIndex: 1
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div 
                          className="text-6xl font-bold text-gray-200 select-none pointer-events-none transform rotate-45"
                          style={{ 
                            opacity: 0.1,
                            textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
                          }}
                        >
                          {watermark || `${userRole.toUpperCase()} ACCESS`}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Document>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-500">Initializing PDF engine...</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
          <div className="flex items-center gap-4">
            <span>Page {pageNumber} of {numPages}</span>
            <span>Scale: {Math.round(scale * 100)}%</span>
            {rotation > 0 && <span>Rotated: {rotation}°</span>}
          </div>
          
          <div className="flex items-center gap-2">
            <Eye className="w-3 h-3" />
            <span>Secure viewing mode active</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AdvancedPDFViewer;