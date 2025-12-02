'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

interface FastPDFViewerProps {
  fileUrl: string;
  fileName: string;
  userRole?: string;
  onSecurityViolation?: (type: string, details: any) => void;
}

export function FastPDFViewer({
  fileUrl,
  fileName,
  userRole = 'viewer',
  onSecurityViolation
}: FastPDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadTime, setLoadTime] = useState<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    setIsLoading(true);
    setError(null);
    setLoadTime(0);

    // Quick timeout for fast loading
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setError('Fast loading timeout - file may be large or external. Try Ultra Secure or Fallback viewer.');
        setIsLoading(false);
      }
    }, 3000); // 3 second fast timeout

    return () => clearTimeout(timeoutId);
  }, [fileUrl]);

  const handleLoad = () => {
    const endTime = Date.now();
    setLoadTime(endTime - startTimeRef.current);
    setIsLoading(false);
    setError(null);
  };

  const handleError = () => {
    setError('Failed to load PDF. The file may not be accessible or may not be a valid PDF.');
    setIsLoading(false);
  };

  const retryLoad = () => {
    startTimeRef.current = Date.now();
    setError(null);
    setIsLoading(true);
    setLoadTime(0);
    
    if (iframeRef.current) {
      // Force reload
      const src = iframeRef.current.src;
      iframeRef.current.src = '';
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = src;
        }
      }, 100);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onSecurityViolation?.('FAST_VIEWER_CONTEXT_MENU_BLOCKED', {
      target: 'FAST_PDF_CONTAINER'
    });
    return false;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Clock className="w-5 h-5 text-blue-600 animate-spin" />
              ) : error ? (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
              <div>
                <h3 className="text-lg font-semibold">{fileName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    Fast Viewer • Role: {userRole}
                  </Badge>
                  {loadTime > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Loaded in {loadTime}ms
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={retryLoad} disabled={isLoading}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Fast PDF Viewer:</strong> Optimized for quick loading with minimal security features. 
            Best for local files and fast preview. For maximum security, use Ultra Secure viewer.
          </p>
        </div>

        {/* PDF Viewer Container */}
        <div 
          className="relative bg-white border rounded-lg shadow-inner" 
          style={{ minHeight: '600px' }}
          onContextMenu={handleContextMenu}
        >
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <div className="text-center">
                  <p className="text-gray-600 font-medium">Fast loading PDF...</p>
                  <p className="text-sm text-gray-500 mt-1">3 second timeout for optimal performance</p>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg z-10">
              <div className="text-center max-w-md p-6">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Fast Loading Failed</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <div className="space-y-2">
                  <Button onClick={retryLoad} variant="outline" className="w-full">
                    Retry Fast Loading
                  </Button>
                  <p className="text-xs text-gray-500">
                    For better compatibility, try &quot;🛡️ Ultra Secure&quot; or &quot;Fallback Viewer&quot;
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Fast PDF Iframe */}
          <iframe
            ref={iframeRef}
            src={fileUrl}
            width="100%"
            height="600px"
            style={{
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#f9fafb'
            }}
            title={`Fast PDF: ${fileName}`}
            onLoad={handleLoad}
            onError={handleError}
            loading="eager"
          />
        </div>

        {/* Performance Info */}
        {loadTime > 0 && (
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-700">✓ PDF loaded successfully</span>
              <span className="text-green-600 font-medium">{loadTime}ms</span>
            </div>
            {loadTime < 1000 && (
              <p className="text-xs text-green-600 mt-1">Excellent loading performance!</p>
            )}
            {loadTime >= 1000 && loadTime < 3000 && (
              <p className="text-xs text-green-600 mt-1">Good loading performance</p>
            )}
            {loadTime >= 3000 && (
              <p className="text-xs text-amber-600 mt-1">Consider using a smaller file or local PDF for better performance</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}