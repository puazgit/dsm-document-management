'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '../ui/button';
import { Download, AlertCircle, Printer, RefreshCw } from 'lucide-react';
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const { data: session } = useSession();

  const [currentPermissions, setCurrentPermissions] = useState({
    canDownload: false,
    canPrint: false,
    canCopy: false
  });
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

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

  // Load permissions
  useEffect(() => {
    try {
      const userCapabilities = (session?.user as any)?.capabilities || [];
      if (session?.user) {
        setCurrentPermissions({
          canDownload: userCapabilities.includes('PDF_DOWNLOAD') || userCapabilities.includes('DOCUMENT_DOWNLOAD'),
          canPrint: userCapabilities.includes('PDF_PRINT'),
          canCopy: userCapabilities.includes('PDF_COPY'),
        });
      } else {
        setCurrentPermissions(getFallbackPermissions(userRole));
      }
    } catch {
      setCurrentPermissions(getFallbackPermissions(userRole));
    } finally {
      setPermissionsLoaded(true);
    }
  }, [session, userRole]);

  // Fetch PDF and load into iframe via blob URL
  const loadPDF = useCallback(async () => {
    setIsLoading(true);
    setError('');

    // Revoke previous blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    try {
      const response = await fetch(fileUrl, { credentials: 'include' });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('pdf') && !contentType.includes('octet-stream') && !contentType.includes('application')) {
        console.warn('[PDF Viewer] Unexpected content-type:', contentType);
      }

      const blob = await response.blob();
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(pdfBlob);
      blobUrlRef.current = blobUrl;

      if (iframeRef.current) {
        iframeRef.current.src = blobUrl;
      }

      // Track view in sessionStorage
      if (document?.id) {
        sessionStorage.setItem(`doc_viewed_${document.id}`, 'true');
      }
    } catch (err: any) {
      console.error('[PDF Viewer] Load error:', err);
      setError(`Gagal memuat PDF: ${err.message}`);
      setIsLoading(false);
    }
  }, [fileUrl, document?.id]);

  useEffect(() => {
    if (permissionsLoaded) {
      loadPDF();
    }
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [loadPDF, permissionsLoaded]);

  // Handle download
  const handleDownload = async () => {
    if (!currentPermissions.canDownload || isDownloading) return;
    setIsDownloading(true);
    try {
      const downloadUrl = document?.id ? `/api/documents/${document.id}/download` : fileUrl;
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = fileName;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Download gagal. Coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle print
  const handlePrint = async () => {
    if (!currentPermissions.canPrint || isPrinting) return;
    setIsPrinting(true);
    try {
      const response = await fetch(fileUrl, { credentials: 'include' });
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const iframe = window.document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = blobUrl;
      window.document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            window.document.body.removeChild(iframe);
            window.URL.revokeObjectURL(blobUrl);
          }, 1000);
        }, 500);
      };
    } catch (error) {
      console.error('Print error:', error);
      alert('Print gagal. Coba lagi.');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Action Buttons Header */}
      {permissionsLoaded && (currentPermissions.canPrint || currentPermissions.canDownload) && (
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 flex-shrink-0">
          <span className="text-xs text-muted-foreground truncate">{fileName}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {currentPermissions.canPrint && (
              <Button onClick={handlePrint} disabled={isPrinting} variant="outline" size="sm" className="gap-1.5 h-8">
                <Printer className="w-3.5 h-3.5" />
                {isPrinting ? 'Printing...' : 'Print'}
              </Button>
            )}
            {currentPermissions.canDownload && (
              <Button onClick={handleDownload} disabled={isDownloading} variant="outline" size="sm" className="gap-1.5 h-8">
                <Download className="w-3.5 h-3.5" />
                {isDownloading ? 'Downloading...' : 'Download'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center flex-1 p-6 gap-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={loadPDF} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10 pointer-events-none">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-3 border-4 rounded-full border-t-transparent border-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Memuat PDF...</p>
          </div>
        </div>
      )}

      {/* PDF iframe */}
      {!error && (
        <div className="flex-1 relative" style={{ minHeight: 0 }}>
          <iframe
            ref={iframeRef}
            title={fileName}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError('Gagal menampilkan PDF. Coba lagi.');
            }}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
          />
        </div>
      )}
    </div>
  );
}
