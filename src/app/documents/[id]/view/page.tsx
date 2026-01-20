'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PDFViewerWrapper } from '@/components/documents/pdf-viewer-wrapper';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DocumentBreadcrumb } from '@/components/documents/document-breadcrumb';
import { ChildDocumentsList } from '@/components/documents/child-documents-list';
import { RelatedDocuments } from '@/components/documents/related-documents';
import { MoveDocumentDialog } from '@/components/documents/move-document-dialog';
import { DocumentVersionHistory } from '@/components/documents/document-version-history';
import { DocumentComments } from '@/components/documents/document-comments';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DocumentViewPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [document, setDocument] = useState<any>(null);
  const [breadcrumb, setBreadcrumb] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMoveDialog, setShowMoveDialog] = useState(false);

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

      // Fetch hierarchy data
      const hierarchyResponse = await fetch(`/api/documents/${documentId}/hierarchy?withParents=true&maxDepth=1`);
      if (hierarchyResponse.ok) {
        const hierarchyData = await hierarchyResponse.json();
        setBreadcrumb(hierarchyData.breadcrumb || []);
      }
    } catch (error) {
      console.error('Error fetching document:', error);
      toast({        title: 'Error',
        description: 'Failed to load document',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveSuccess = () => {
    setShowMoveDialog(false);
    // Refresh document and hierarchy data
    fetchDocument();
    toast({
      title: 'Success',
      description: 'Document moved successfully',
    });
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
      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <div className="mb-3">
          <DocumentBreadcrumb breadcrumb={breadcrumb} />
        </div>
      )}

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
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{document.title}</h1>
          <p className="text-xs text-muted-foreground">
            {document.documentType?.name} • {document.fileName}
          </p>
        </div>
        {/* Move Document Button */}
        {(session?.user?.capabilities?.includes('DOCUMENT_EDIT') || session?.user?.capabilities?.includes('DOCUMENT_DELETE')) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMoveDialog(true)}
            className="gap-2"
          >
            <FolderOpen className="w-4 h-4" />
            Move Document
          </Button>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden">
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

        {/* Sidebar - Hierarchy info */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-3">
              <TabsTrigger value="details" className="text-xs sm:text-sm">
                Details
              </TabsTrigger>
              <TabsTrigger value="versions" className="text-xs sm:text-sm">
                Versions
              </TabsTrigger>
              <TabsTrigger value="comments" className="text-xs sm:text-sm">
                Comments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-0">{/* Document Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Document Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <label className="text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <Badge variant="outline">{document.status}</Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-muted-foreground">Version</label>
                    <p className="font-medium">{document.version || '1.0'}</p>
                  </div>
                  <div>
                    <label className="text-muted-foreground">Type</label>
                    <p className="font-medium">{document.documentType?.name}</p>
                  </div>
                  <div>
                    <label className="text-muted-foreground">Created By</label>
                    <p className="font-medium">
                      {document.createdBy?.firstName} {document.createdBy?.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="text-muted-foreground">Created At</label>
                    <p className="font-medium">
                      {new Date(document.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  {document.publishedAt && (
                    <div>
                      <label className="text-muted-foreground">Published At</label>
                      <p className="font-medium">
                        {new Date(document.publishedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <ChildDocumentsList documentId={documentId} />
              <RelatedDocuments documentId={documentId} />
            </TabsContent>

            <TabsContent value="versions" className="mt-0">
              <DocumentVersionHistory 
                documentId={documentId} 
                currentVersion={document.version || '1.0'}
              />
            </TabsContent>

            <TabsContent value="comments" className="mt-0">
              <DocumentComments documentId={documentId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Move Document Dialog */}
      <MoveDocumentDialog
        open={showMoveDialog}
        onClose={() => setShowMoveDialog(false)}
        documentId={documentId}
        currentTitle={document.title}
        onSuccess={handleMoveSuccess}
      />
    </div>
  );
}
