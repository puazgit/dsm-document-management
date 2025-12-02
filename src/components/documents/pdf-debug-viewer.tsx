'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface PDFDebugViewerProps {
  fileUrl: string;
  fileName: string;
}

export function PDFDebugViewer({ fileUrl, fileName }: PDFDebugViewerProps) {
  const [checks, setChecks] = useState({
    urlAccessible: { status: 'checking' as 'checking' | 'success' | 'error', message: '' },
    fileExists: { status: 'checking' as 'checking' | 'success' | 'error', message: '' },
    mimeType: { status: 'checking' as 'checking' | 'success' | 'error', message: '' },
    cors: { status: 'checking' as 'checking' | 'success' | 'error', message: '' }
  });

  useEffect(() => {
    const runChecks = async () => {
      // Reset checks
      setChecks({
        urlAccessible: { status: 'checking', message: 'Checking URL accessibility...' },
        fileExists: { status: 'checking', message: 'Verifying file existence...' },
        mimeType: { status: 'checking', message: 'Checking MIME type...' },
        cors: { status: 'checking', message: 'Testing CORS policy...' }
      });

      try {
        // Check if URL is accessible
        const response = await fetch(fileUrl, { method: 'HEAD' });
        
        if (response.ok) {
          setChecks(prev => ({
            ...prev,
            urlAccessible: { status: 'success', message: `URL accessible (${response.status})` },
            fileExists: { status: 'success', message: 'File exists and is reachable' }
          }));

          // Check MIME type
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/pdf')) {
            setChecks(prev => ({
              ...prev,
              mimeType: { status: 'success', message: `Correct MIME type: ${contentType}` }
            }));
          } else {
            setChecks(prev => ({
              ...prev,
              mimeType: { 
                status: 'error', 
                message: `Incorrect MIME type: ${contentType || 'unknown'}. Expected: application/pdf` 
              }
            }));
          }

          // Check CORS (if we got here, CORS is likely OK for HEAD requests)
          setChecks(prev => ({
            ...prev,
            cors: { status: 'success', message: 'CORS policy allows access' }
          }));

        } else {
          setChecks(prev => ({
            ...prev,
            urlAccessible: { 
              status: 'error', 
              message: `URL not accessible (${response.status}: ${response.statusText})` 
            },
            fileExists: { status: 'error', message: 'File not found or not accessible' },
            cors: { status: 'error', message: 'Unable to determine CORS status' }
          }));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        setChecks(prev => ({
          ...prev,
          urlAccessible: { status: 'error', message: `Network error: ${errorMessage}` },
          fileExists: { status: 'error', message: 'Cannot verify file existence' },
          cors: { 
            status: 'error', 
            message: 'CORS error - the server may not allow cross-origin requests' 
          }
        }));
      }
    };

    if (fileUrl) {
      runChecks();
    }
  }, [fileUrl]);

  const getIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'checking': return <Clock className="w-5 h-5 text-blue-600 animate-spin" />;
      default: return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const allSuccess = Object.values(checks).every(check => check.status === 'success');
  const hasErrors = Object.values(checks).some(check => check.status === 'error');

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          PDF Debug Information
          {allSuccess && <CheckCircle className="w-6 h-6 text-green-600" />}
          {hasErrors && <XCircle className="w-6 h-6 text-red-600" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">File: {fileName}</p>
          <p className="text-sm text-gray-600 break-all">URL: {fileUrl}</p>
        </div>

        <div className="space-y-3">
          {Object.entries(checks).map(([key, check]) => (
            <div key={key} className="flex items-start gap-3 p-3 border rounded-lg">
              {getIcon(check.status)}
              <div className="flex-1">
                <p className="text-sm font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1')}
                </p>
                <p className="text-sm text-gray-600">{check.message}</p>
              </div>
            </div>
          ))}
        </div>

        {allSuccess && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All checks passed! The PDF should load correctly. If it's still not working, 
              try the Fallback Viewer option.
            </AlertDescription>
          </Alert>
        )}

        {hasErrors && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Some checks failed. Try using a local PDF file (upload to /public folder) 
              or use the Fallback Viewer option.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              Open PDF Directly
            </a>
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.reload()}
          >
            Refresh Checks
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}