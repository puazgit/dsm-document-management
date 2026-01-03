'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PDFViewerWrapper } from '@/components/documents/pdf-viewer-wrapper';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DocumentViewPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [document, setDocument] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const documentId = params.id as string;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    if (status === 'authenticated' && documentId) {
      fetchDocument();
    }
  }, [status, documentId]);

  const fetchDocument = async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }
      const data = await response.json();
      setDocument(data);
    } catch (error) {
      console.error('Error fetching document:', error);
      toast({
        title: 'Error',
        description: 'Failed to load document',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-4 rounded-full border-t-transparent border-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold">Document not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const isPDF = document.mimeType === 'application/pdf' || document.fileName?.toLowerCase().endsWith('.pdf');

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Documents
        </Button>
        <div className="h-6 border-l" />
        <div>
          <h1 className="text-lg font-semibold">{document.title}</h1>
          <p className="text-xs text-muted-foreground">
            {document.documentType?.name} • {document.fileName}
          </p>
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 overflow-hidden border rounded-lg bg-card">
        {isPDF ? (
          <PDFViewerWrapper
            fileUrl={`/api/documents/${documentId}/view`}
            fileName={document.fileName}
            userRole={session?.user?.role || 'viewer'}
            canDownload={session?.user?.capabilities?.includes('PDF_DOWNLOAD') || session?.user?.capabilities?.includes('DOCUMENT_DOWNLOAD') || false}
            document={document}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="mb-2 text-lg font-semibold">Preview not available</p>
              <p className="text-sm text-muted-foreground">
                This document type cannot be previewed in the browser.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
