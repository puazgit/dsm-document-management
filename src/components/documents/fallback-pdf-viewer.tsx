'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Download, RefreshCw } from 'lucide-react';

interface FallbackPDFViewerProps {
  fileUrl: string;
  fileName: string;
  userRole?: string;
}

export function FallbackPDFViewer({
  fileUrl,
  fileName,
  userRole = 'viewer'
}: FallbackPDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerType, setViewerType] = useState<'iframe' | 'object' | 'embed'>('iframe');
  const viewerRef = useRef<HTMLIFrameElement | HTMLObjectElement | HTMLEmbedElement>(null);

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    
    // Try different viewer types
    const nextViewerType = 
      viewerType === 'iframe' ? 'object' : 
      viewerType === 'object' ? 'embed' : 'iframe';
    
    setViewerType(nextViewerType);
  };

  const renderPDFViewer = () => {
    const commonProps = {
      width: '100%',
      height: '600px',
      onLoad: () => setIsLoading(false),
      onError: () => {
        setIsLoading(false);
        setError(`Failed to load PDF using ${viewerType}. Try a different method.`);
      }
    };

    switch (viewerType) {
      case 'iframe':
        return (
          <iframe
            ref={viewerRef as React.RefObject<HTMLIFrameElement>}
            src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
            title={`PDF: ${fileName}`}
            style={{ border: 'none', borderRadius: '8px' }}
            {...commonProps}
          />
        );
        
      case 'object':
        return (
          <object
            ref={viewerRef as React.RefObject<HTMLObjectElement>}
            data={fileUrl}
            type="application/pdf"
            style={{ borderRadius: '8px' }}
            {...commonProps}
          >
            <p>Your browser doesn't support PDF viewing. Please <a href={fileUrl} target="_blank" rel="noopener noreferrer">download the PDF</a> to view it.</p>
          </object>
        );
        
      case 'embed':
        return (
          <embed
            ref={viewerRef as React.RefObject<HTMLEmbedElement>}
            src={fileUrl}
            type="application/pdf"
            style={{ borderRadius: '8px' }}
            {...commonProps}
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{fileName}</h3>
            <p className="text-sm text-gray-600">Fallback PDF Viewer ({viewerType})</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetry}
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Try {viewerType === 'iframe' ? 'Object' : viewerType === 'object' ? 'Embed' : 'Iframe'}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4 mr-1" />
                Download
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="relative bg-white border rounded-lg" style={{ minHeight: '600px' }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <div className="text-center">
                  <p className="text-gray-600 font-medium">Loading PDF with {viewerType}...</p>
                </div>
              </div>
            </div>
          )}
          
          {renderPDFViewer()}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Fallback Viewer:</strong> This viewer tries different methods (iframe → object → embed) to display PDFs. 
            If one method fails, click "Try [Method]" to attempt a different approach.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}