'use client';

import React from 'react';
import { EnhancedPDFViewer } from './enhanced-pdf-viewer';

interface PDFDebugViewerProps {
  fileUrl: string;
  fileName?: string;
  userRole?: string;
  showDebugInfo?: boolean;
  document?: any;
  watermark?: string;
  onSecurityViolation?: (type: string, details: any) => void;
}

/**
 * PDFDebugViewer - Debug wrapper for EnhancedPDFViewer
 * Shows additional debug information in development mode
 */
export function PDFDebugViewer({
  fileUrl,
  fileName = 'document.pdf',
  userRole = 'viewer',
  showDebugInfo = true,
  document
}: PDFDebugViewerProps) {
  if (process.env.NODE_ENV === 'development' && showDebugInfo) {
    console.log('[PDF Debug Viewer]', {
      fileUrl,
      fileName,
      userRole,
      document
    });
  }

  return (
    <div>
      {process.env.NODE_ENV === 'development' && showDebugInfo && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 mb-4 rounded text-sm">
          <strong>Debug Info:</strong>
          <ul className="mt-2 space-y-1">
            <li>File: {fileName}</li>
            <li>URL: {fileUrl}</li>
            <li>Role: {userRole}</li>
            <li>Document ID: {document?.id || 'N/A'}</li>
          </ul>
        </div>
      )}
      <EnhancedPDFViewer
        fileUrl={fileUrl}
        fileName={fileName}
        userRole={userRole}
        canDownload={false}
        document={document}
      />
    </div>
  );
}

export default PDFDebugViewer;
