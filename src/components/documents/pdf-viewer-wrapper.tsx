'use client';

import React from 'react';
import { EnhancedPDFViewer } from './enhanced-pdf-viewer';

interface PDFViewerWrapperProps {
  fileUrl: string;
  fileName: string;
  userRole: string;
  canDownload?: boolean;
  document?: any;
}

/**
 * PDF Viewer Wrapper - Production Component
 * 
 * This component uses the EnhancedPDFViewer (EmbedPDF-based) for all PDF viewing.
 * 
 * Usage:
 * <PDFViewerWrapper 
 *   fileUrl="/api/documents/123/download"
 *   fileName="document.pdf"
 *   userRole="admin"
 * />
 */
export function PDFViewerWrapper({
  fileUrl,
  fileName,
  userRole,
  canDownload = false,
  document
}: PDFViewerWrapperProps) {
  // For debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('[PDF Viewer Wrapper]', {
      viewer: 'Enhanced (EmbedPDF)',
      fileUrl,
      fileName,
      userRole,
      canDownload,
      documentId: document?.id
    });
  }

  return (
    <EnhancedPDFViewer
      fileUrl={fileUrl}
      fileName={fileName}
      userRole={userRole}
      canDownload={canDownload}
      document={document}
    />
  );
}

// Export for direct usage if needed
export { EnhancedPDFViewer };
