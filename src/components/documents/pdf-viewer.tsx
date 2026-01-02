'use client';

import React from 'react';
import { EnhancedPDFViewer } from './enhanced-pdf-viewer';

interface SecurePDFViewerProps {
  fileUrl: string;
  fileName: string;
  userRole: string;
  canDownload?: boolean;
  canPrint?: boolean;
  canCopy?: boolean;
  document?: any;
}

/**
 * SecurePDFViewer - Alias for EnhancedPDFViewer
 * Used in pdf-demo page
 */
export function SecurePDFViewer({
  fileUrl,
  fileName,
  userRole,
  canDownload = false,
  canPrint = false,
  canCopy = false,
  document
}: SecurePDFViewerProps) {
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

export default SecurePDFViewer;
