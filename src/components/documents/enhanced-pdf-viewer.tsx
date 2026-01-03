'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '../ui/button';
import { Download, AlertCircle, Printer } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

interface EnhancedPDFViewerProps {
  fileUrl: string;
  fileName: string;
  userRole: string;
  canDownload?: boolean;
  document?: any;
}

export function EnhancedPDFViewer({ 
  fileUrl, 
  fileName, 
  userRole = 'admin', 
  canDownload = false, 
  document 
}: EnhancedPDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const { data: session } = useSession();

  // State for dynamic permissions from database
  const [currentPermissions, setCurrentPermissions] = useState({
    canDownload: false,
    canPrint: false,
    canCopy: false
  });
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // Fallback function for hardcoded permissions (backwards compatibility)
  const getFallbackPermissions = (role: string) => {
    const rolePermissions: Record<string, { canDownload: boolean; canPrint: boolean; canCopy: boolean }> = {
      'administrator': { canDownload: true, canPrint: true, canCopy: true },
      'admin': { canDownload: true, canPrint: true, canCopy: true },
      'manager': { canDownload: true, canPrint: true, canCopy: false },
      'editor': { canDownload: true, canPrint: false, canCopy: false },
      'reviewer': { canDownload: false, canPrint: false, canCopy: false },
      'viewer': { canDownload: false, canPrint: false, canCopy: false },
      'guest': { canDownload: false, canPrint: false, canCopy: false },
    };
    return rolePermissions[role.toLowerCase()] || { canDownload: false, canPrint: false, canCopy: false };
  };

  // Load user permissions from session (consistent with legacy viewer)
  useEffect(() => {
    const loadPermissions = async () => {
      console.log('🔍 [Enhanced] Loading permissions...', { 
        hasSession: !!session, 
        hasUser: !!session?.user,
        userRole 
      });

      try {
        // Fetch user capabilities from session (migrated from permissions)
        const userCapabilities = session?.user?.capabilities || [];
        
        // Always use capabilities from database if session exists
        // Only fallback to role-based if NO session at all
        if (session?.user) {
          const canDownload = userCapabilities.includes('PDF_DOWNLOAD') ||
                            userCapabilities.includes('DOCUMENT_DOWNLOAD');
          const canPrint = userCapabilities.includes('PDF_PRINT');
          const canCopy = userCapabilities.includes('PDF_COPY');

          console.log('✅ [Enhanced] Using Session Capabilities:', {
            userRole,
            userCapabilities,
            canDownload,
            canPrint,
            canCopy
          });

          setCurrentPermissions({
            canDownload,
            canPrint, 
            canCopy
          });
        } else {
          // Fallback to role-based permissions ONLY if no session
          console.log('🔄 [Enhanced] Using Fallback Permissions for role:', userRole);
          const fallbackPermissions = getFallbackPermissions(userRole);
          setCurrentPermissions(fallbackPermissions);
        }
      } catch (error) {
        console.error('❌ [Enhanced] Error loading permissions:', error);
        // Fallback to role-based permissions
        const fallbackPermissions = getFallbackPermissions(userRole);
        setCurrentPermissions(fallbackPermissions);
      } finally {
        console.log('✅ [Enhanced] Permissions loaded successfully');
        setPermissionsLoaded(true);
      }
    };

    loadPermissions();
  }, [session, userRole]);

  // Initialize EmbedPDF Snippet
  useEffect(() => {
    console.log('🔍 [Enhanced] useEffect triggered:', { 
      hasContainer: !!containerRef.current, 
      permissionsLoaded,
      fileUrl,
      session: !!session
    });
    
    if (!containerRef.current) {
      console.warn('⚠️ [Enhanced] Container ref not ready');
      return;
    }
    
    if (!permissionsLoaded) {
      console.warn('⚠️ [Enhanced] Permissions not loaded yet');
      return;
    }

    const initEmbedPDF = async () => {
      try {
        setIsLoading(true);
        console.log('🚀 [Enhanced] Starting initialization...');
        
        // Use sessionStorage to track views in current session (for UI feedback only)
        const viewedKey = `doc_viewed_${document?.id}`;
        const hasViewedInSession = sessionStorage.getItem(viewedKey) === 'true';
        
        // Fetch PDF with credentials (backend will handle duplicate detection)
        console.log('🔍 [Enhanced] Fetching PDF:', fileUrl, hasViewedInSession ? '(re-fetch in session)' : '(first fetch in session)');
        const response = await fetch(fileUrl, {
          credentials: 'include', // Include cookies for auth
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        console.log('✅ [Enhanced] PDF fetched, blob created');
        
        // Mark as viewed in sessionStorage for UI tracking
        if (!hasViewedInSession) {
          sessionStorage.setItem(viewedKey, 'true');
          console.log('✅ [Enhanced] Marked as viewed in session (backend handles actual logging)');
        } else {
          console.log('⏭️  [Enhanced] Already viewed in this session (backend will skip duplicate)');
        }
        
        // Dynamically import EmbedPDF (default export)
        const EmbedPDF = await import('@embedpdf/snippet').then(mod => mod.default);
        
        // Clear container
        containerRef.current!.innerHTML = '';
        
        console.log('🔍 [Enhanced] Initializing EmbedPDF with permissions:', currentPermissions);
        
        // Build disabled categories array based on EmbedPDF documentation
        // Available categories: document-open, document-close, document-print, document-export, document-fullscreen
        const disabledCategories: string[] = [
          'document-open',    // Disable "Open" button
          'document-close',   // Disable "Close" button  
          'document-print',   // Disable "Print" button
          'document-export',  // Disable "Export" button
          'annotation',       // Disable all annotation tools
        ];
        
        // Add selection disable if no copy permission
        if (!currentPermissions.canCopy) {
          disabledCategories.push('selection');
        }
        
        console.log('🔍 [Enhanced] Disabled categories:', disabledCategories);
        
        // Initialize EmbedPDF
        const viewer = EmbedPDF.init({
          type: 'container',
          target: containerRef.current!,
          src: blobUrl,
          disabledCategories: disabledCategories,
        });

        console.log('✅ [Enhanced] Viewer object:', viewer);
        
        setIsLoading(false);
        console.log('✅ [Enhanced] EmbedPDF initialized successfully');

        // Cleanup
        return () => {
          URL.revokeObjectURL(blobUrl);
        };
      } catch (err) {
        console.error('EmbedPDF initialization error:', err);
        setError('Failed to load PDF viewer. Please try again.');
        setIsLoading(false);
        return undefined;
      }
    };

    const cleanup = initEmbedPDF();
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, [fileUrl, permissionsLoaded, document?.id]); // Include document.id for sessionStorage key

  // Handle download
  const handleDownload = async () => {
    if (!currentPermissions.canDownload) {
      alert('Download not permitted for your role.');
      return;
    }

    if (isDownloading) return;

    setIsDownloading(true);
    try {
      // Use the download endpoint instead of view endpoint to properly log download activity
      const downloadUrl = document?.id 
        ? `/api/documents/${document.id}/download`
        : fileUrl.replace('/view', '/download');
      
      console.log('📥 Downloading from:', downloadUrl);
      
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = fileName;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
      
      console.log('✅ Download completed');
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle print
  const handlePrint = async () => {
    if (!currentPermissions.canPrint) {
      alert('Print not permitted for your role.');
      return;
    }

    if (isPrinting) return;

    setIsPrinting(true);
    try {
      console.log('🖨️ Printing document...');
      
      // Fetch PDF blob
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create hidden iframe for printing
      const iframe = window.document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = blobUrl;
      window.document.body.appendChild(iframe);
      
      // Wait for iframe to load, then print
      iframe.onload = () => {
        try {
          // Give browser time to render PDF
          setTimeout(() => {
            iframe.contentWindow?.print();
            
            // Cleanup after print dialog closes (wait a bit)
            setTimeout(() => {
              window.document.body.removeChild(iframe);
              window.URL.revokeObjectURL(blobUrl);
              console.log('✅ Print dialog opened');
            }, 1000);
          }, 500);
        } catch (err) {
          console.error('Print iframe error:', err);
          window.document.body.removeChild(iframe);
          window.URL.revokeObjectURL(blobUrl);
          alert('Print failed. Please try again.');
        }
      };
      
      iframe.onerror = () => {
        console.error('Failed to load PDF in iframe');
        window.document.body.removeChild(iframe);
        window.URL.revokeObjectURL(blobUrl);
        alert('Failed to load PDF for printing.');
      };
      
    } catch (error) {
      console.error('Print error:', error);
      alert('Print failed. Please try again.');
    } finally {
      setIsPrinting(false);
    }
  };

  // Security: Disable right-click
  const disableRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Custom Action Buttons Header */}
      {(currentPermissions.canPrint || currentPermissions.canDownload) && permissionsLoaded && (
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">PDF Document</span>
            <span className="text-xs text-muted-foreground">• {fileName}</span>
          </div>
          <div className="flex items-center gap-2">
            {currentPermissions.canPrint && (
              <Button
                onClick={handlePrint}
                disabled={isPrinting || !currentPermissions.canPrint}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Printer className="w-4 h-4" />
                {isPrinting ? 'Printing...' : 'Print'}
              </Button>
            )}
            {currentPermissions.canDownload && (
              <Button
                onClick={handleDownload}
                disabled={isDownloading || !currentPermissions.canDownload}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                {isDownloading ? 'Downloading...' : 'Download'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !error && (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-4 border-4 rounded-full border-t-transparent border-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading Enhanced PDF Viewer...</p>
          </div>
        </div>
      )}

      {/* EmbedPDF Container */}
      <div 
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Permissions Info */}
      {permissionsLoaded && (
        <div className="px-4 py-2 mt-2 text-xs border-t text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Role: <strong>{userRole}</strong></span>
            <span>Download: <strong>{currentPermissions.canDownload ? '✓' : '✗'}</strong></span>
            <span>Print: <strong>{currentPermissions.canPrint ? '✓' : '✗'}</strong></span>
            <span>Copy: <strong>{currentPermissions.canCopy ? '✓' : '✗'}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
