'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield, Eye, Download, Printer, Copy } from 'lucide-react';

interface SimplePDFViewerProps {
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

export function SimplePDFViewer({
  fileUrl,
  fileName,
  userRole = 'viewer',
  canDownload,
  canPrint,
  canCopy,
  document,
  watermark,
  onSecurityViolation
}: SimplePDFViewerProps) {
  const [securityViolations, setSecurityViolations] = useState<number>(0);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);

  // Enhanced role permissions
  const rolePermissions: Record<string, RolePermissions> = {
    'administrator': { canDownload: true, canPrint: true, canCopy: true, showWatermark: false },
    'admin': { canDownload: true, canPrint: true, canCopy: true, showWatermark: false },
    'manager': { canDownload: true, canPrint: true, canCopy: false, showWatermark: false },
    'editor': { canDownload: true, canPrint: false, canCopy: false, showWatermark: true },
    'reviewer': { canDownload: false, canPrint: false, canCopy: false, showWatermark: true },
    'viewer': { canDownload: false, canPrint: false, canCopy: false, showWatermark: true },
    'guest': { canDownload: false, canPrint: false, canCopy: false, showWatermark: true }
  };

  const currentPermissions = {
    ...rolePermissions[userRole] || rolePermissions['viewer'],
    // Allow prop overrides
    ...(canDownload !== undefined && { canDownload }),
    ...(canPrint !== undefined && { canPrint }),
    ...(canCopy !== undefined && { canCopy })
  };

  // Security violation handler
  const handleSecurityViolation = (type: string, details: any = {}) => {
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
  };

  // Right-click prevention
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      handleSecurityViolation('RIGHT_CLICK_ATTEMPT', { target: (e.target as Element)?.tagName });
      return false;
    };

    if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('contextmenu', handleContextMenu);
    }
    
    return () => {
      if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.removeEventListener) {
        document.removeEventListener('contextmenu', handleContextMenu);
      }
    };
  }, [handleSecurityViolation]);

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
      ];

      if (forbidden.some(Boolean)) {
        e.preventDefault();
        e.stopPropagation();
        handleSecurityViolation('KEYBOARD_SHORTCUT_BLOCKED', { key: e.key });
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
  }, [currentPermissions.canCopy, handleSecurityViolation]);

  // Developer tools detection
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;
    
    const detectDevTools = () => {
      const threshold = 160;
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!isDevToolsOpen) {
          setIsDevToolsOpen(true);
          handleSecurityViolation('DEV_TOOLS_DETECTED', { 
            heightDiff: window.outerHeight - window.innerHeight,
            widthDiff: window.outerWidth - window.innerWidth 
          });
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <p className="text-sm text-gray-600">
              Use iframe-based PDF viewer for better compatibility
            </p>
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
        <div className="relative bg-white border rounded-lg shadow-inner" style={{ minHeight: '600px' }}>
          <iframe
            src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&view=FitH&zoom=page-width&pagemode=none`}
            width="100%"
            height="600px"
            style={{
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#f9fafb',
              userSelect: currentPermissions.canCopy ? 'auto' : 'none',
              WebkitUserSelect: currentPermissions.canCopy ? 'auto' : 'none',
              pointerEvents: 'auto'
            }}
            title={`PDF: ${fileName}`}
            className={currentPermissions.canCopy ? '' : 'no-select'}
            onContextMenu={(e) => {
              e.preventDefault();
              handleSecurityViolation('IFRAME_RIGHT_CLICK', {});
              return false;
            }}
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

        {/* Footer Info */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
          <div className="flex items-center gap-4">
            <span>Role: {userRole}</span>
            <span>Violations: {securityViolations}</span>
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

export default SimplePDFViewer;