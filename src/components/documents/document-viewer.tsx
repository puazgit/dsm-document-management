/**
 * @deprecated This component is no longer used in the codebase.
 * Document viewing is now handled by:
 * - /documents/[id]/view page (for full-page PDF viewing)
 * - EnhancedPDFViewer component (for embedded PDF viewing with EmbedPDF)
 * - PDFViewerWrapper (wrapper for EnhancedPDFViewer)
 * 
 * This component previously had issues with duplicate VIEW logging.
 * Consider removing this file if confirmed unused across all environments.
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Skeleton } from '../ui/skeleton';
import { toast } from '../../hooks/use-toast';
import { DocumentComments } from './document-comments';

interface DocumentViewerProps {
  document: any;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function DocumentViewer({ document, open, onClose, onRefresh }: DocumentViewerProps) {
  const [loading, setLoading] = useState(false);
  const [documentDetails, setDocumentDetails] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (document && open) {
      fetchDocumentDetails();
    }
  }, [document, open]);

  const fetchDocumentDetails = async () => {
    if (!document) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/documents/${document.id}`);
      if (response.ok) {
        const data = await response.json();
        setDocumentDetails(data);
        
        // NOTE: VIEW logging is now handled by the dedicated PDF viewer component
        // to prevent duplicate logs and ensure proper session tracking
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load document details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching document details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load document details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    // Ensure we're running in the browser with document available
    if (typeof window === 'undefined') {
      console.error('❌ Download failed: Not running in browser environment');
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'Please try again',
      });
      return;
    }

    // Get reference to current document and avoid naming collision
    const currentDocument = typeof document !== 'undefined' ? document : null;
    if (!currentDocument) {
      console.error('❌ Download failed: Document not available');
      toast({
        variant: 'destructive',
        title: 'Download Failed', 
        description: 'Please try again',
      });
      return;
    }

    setDownloading(true);
    try {
      console.log('🔄 Starting download for:', document.fileName);
      const response = await fetch(`/api/documents/${document.id}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = currentDocument.createElement('a');
        a.href = url;
        a.download = document.fileName;
        currentDocument.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        currentDocument.body.removeChild(a);
        toast({
          title: 'Success',
          description: 'Document downloaded successfully',
        });
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Error',
        description: 'Failed to download document',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusColors = {
    DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    IN_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    PENDING_APPROVAL: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    PUBLISHED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    ARCHIVED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    EXPIRED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {document.title}
          </DialogTitle>
          <DialogDescription>
            Document details and information
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="w-full h-32" />
            <Skeleton className="w-full h-24" />
            <Skeleton className="w-full h-48" />
          </div>
        ) : (
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="versions">
                Versions ({documentDetails?._count?.versions || 0})
              </TabsTrigger>
              <TabsTrigger value="comments">
                Comments ({documentDetails?._count?.comments || 0})
              </TabsTrigger>
              <TabsTrigger value="activity">
                Activity ({documentDetails?._count?.activities || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Document Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">File Name</label>
                      <p>{documentDetails?.fileName || document.fileName}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Document Type</label>
                      <div className="flex items-center gap-2">
                        {documentDetails?.documentType?.icon && (
                          <span>{documentDetails.documentType.icon}</span>
                        )}
                        <span>{documentDetails?.documentType?.name}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <div>
                        <Badge className={statusColors[documentDetails?.status as keyof typeof statusColors] || statusColors.DRAFT}>
                          {(documentDetails?.status || document.status).replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">File Size</label>
                      <p>{formatFileSize(Number(documentDetails?.fileSize || document.fileSize))}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Version</label>
                      <p>{documentDetails?.version || document.version}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Views / Downloads</label>
                      <p>{documentDetails?.viewCount || 0} views, {documentDetails?.downloadCount || 0} downloads</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Metadata</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Description</label>
                      <p className="text-sm">
                        {documentDetails?.description || document.description || 'No description provided'}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tags</label>
                      <div className="flex flex-wrap gap-1">
                        {(documentDetails?.tags || document.tags || []).map((tag: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Created By</label>
                      <p>
                        {documentDetails?.createdBy?.firstName} {documentDetails?.createdBy?.lastName}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(documentDetails?.createdAt || document.createdAt)}
                        </span>
                      </p>
                    </div>

                    {documentDetails?.updatedBy && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Last Updated By</label>
                        <p>
                          {documentDetails.updatedBy.firstName} {documentDetails.updatedBy.lastName}
                          <br />
                          <span className="text-xs text-muted-foreground">
                            {formatDate(documentDetails.updatedAt)}
                          </span>
                        </p>
                      </div>
                    )}

                    {documentDetails?.approvedBy && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Approved By</label>
                        <p>
                          {documentDetails.approvedBy.firstName} {documentDetails.approvedBy.lastName}
                          <br />
                          <span className="text-xs text-muted-foreground">
                            {formatDate(documentDetails.approvedAt)}
                          </span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="versions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Version History</CardTitle>
                  <CardDescription>
                    Track changes and versions of this document
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {documentDetails?.versions?.length > 0 ? (
                    <div className="space-y-4">
                      {documentDetails.versions.map((version: any) => (
                        <div key={version.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">Version {version.version}</h4>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {version.changes || 'No changes recorded'}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>
                                  {version.createdBy.firstName} {version.createdBy.lastName}
                                </span>
                                <span>{formatDate(version.createdAt)}</span>
                                <span>{formatFileSize(Number(version.fileSize))}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-muted-foreground">
                      No version history available
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comments">
              <DocumentComments
                documentId={document.id}
                onRefresh={fetchDocumentDetails}
              />
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Log</CardTitle>
                  <CardDescription>
                    Recent activities on this document
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {documentDetails?.activities?.length > 0 ? (
                    <div className="space-y-4">
                      {documentDetails.activities.map((activity: any) => (
                        <div key={activity.id} className="pl-4 border-l-2 border-gray-200">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{activity.action.replace('_', ' ')}</h4>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {activity.description}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>
                                  {activity.user.firstName} {activity.user.lastName}
                                </span>
                                <span>{formatDate(activity.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-muted-foreground">
                      No activity recorded
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}