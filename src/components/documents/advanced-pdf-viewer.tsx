'use client';

import React from 'react';
import { EnhancedPDFViewer } from './enhanced-pdf-viewer';

interface AdvancedPDFViewerProps {
  fileUrl: string;
  fileName: string;
  userRole?: string;
  canDownload?: boolean;
  canPrint?: boolean;
  canCopy?: boolean;
  securityLevel?: 'high' | 'medium' | 'low';
  document?: any;
  watermark?: string;
  onSecurityViolation?: (type: string, details: any) => void;
}

/**
 * AdvancedPDFViewer - Alias for EnhancedPDFViewer
 * Used in pdf-security-demo page
 */
export default function AdvancedPDFViewer({
  fileUrl,
  fileName,
  userRole = 'viewer',
  canDownload = false,
  canPrint = false,
  canCopy = false,
  securityLevel = 'high',
  document
}: AdvancedPDFViewerProps) {
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
