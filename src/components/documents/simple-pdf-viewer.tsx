'use client';

import React from 'react';
import { EnhancedPDFViewer } from './enhanced-pdf-viewer';

interface SimplePDFViewerProps {
  fileUrl: string;
  fileName?: string;
  userRole?: string;
  document?: any;
  watermark?: string;
  onSecurityViolation?: (type: string, details: any) => void;
}

/**
 * SimplePDFViewer - Simplified wrapper for EnhancedPDFViewer
 * Used in pdf-security-demo page
 */
export default function SimplePDFViewer({
  fileUrl,
  fileName = 'document.pdf',
  userRole = 'viewer',
  document
}: SimplePDFViewerProps) {
  return (
    <EnhancedPDFViewer
      fileUrl={fileUrl}
      fileName={fileName}
      userRole={userRole}
      canDownload={false}
      document={document}
    />
  );
}
