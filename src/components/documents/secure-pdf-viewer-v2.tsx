'use client';

import React from 'react';
import { EnhancedPDFViewer } from './enhanced-pdf-viewer';

interface SecurePDFViewerV2Props {
  fileUrl: string;
  fileName: string;
  userRole?: string;
  canDownload?: boolean;
  canPrint?: boolean;
  canCopy?: boolean;
  watermark?: string;
  document?: any;
  onSecurityViolation?: (type: string, details: any) => void;
}

/**
 * SecurePDFViewerV2 - Enhanced security wrapper for EnhancedPDFViewer
 * Used in pdf-security-demo page
 */
export default function SecurePDFViewerV2({
  fileUrl,
  fileName,
  userRole = 'viewer',
  canDownload = false,
  canPrint = false,
  canCopy = false,
  watermark,
  document
}: SecurePDFViewerV2Props) {
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
