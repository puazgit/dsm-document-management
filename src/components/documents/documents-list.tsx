'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { useToast } from '../../hooks/use-toast';
import { DocumentStatusWorkflow } from './document-status-workflow';
import { DocumentHistory } from './document-history';
import { useRoleVisibility, RoleGuard, FeatureToggle } from '../../hooks/use-role-visibility';

// Utility functions for cleaner permission checks
const hasDocumentAccess = (userSession: any, document: any) => {
  return document?.createdById === userSession?.user?.id;
};

const canPerformAction = (action: string, permissions: string[], document: any, userSession: any, roleVisibility: any) => {
  const actionPermissions = {
    view: ['documents.read', 'pdf.view'],
    history: ['documents.read'],
    edit: ['documents.update'],
    download: ['documents.read', 'pdf.download'],
    delete: ['documents.delete']
  };
  
  const requiredPerms = actionPermissions[action as keyof typeof actionPermissions] || [];
  return roleVisibility.hasAnyPermission(requiredPerms) || hasDocumentAccess(userSession, document);
};

// Simplified ActionMenuItem component
const ActionMenuItem = ({ 
  document, 
  action, 
  onClick, 
  label, 
  className = "",
  userSession,
  roleVisibility 
}: {
  document: any;
  action: string;
  onClick: () => void;
  label: string;
  className?: string;
  userSession: any;
  roleVisibility: any;
}) => {
  const hasAccess = canPerformAction(action, [], document, userSession, roleVisibility);
  
  if (!hasAccess) return null;
  
  return (
    <DropdownMenuItem onClick={onClick} className={className}>
      {label}
    </DropdownMenuItem>
  );
};

// Dynamic import to ensure client-side only execution with error handling
const SecurePDFViewer = dynamic(
  () => import('./pdf-viewer').then(mod => ({ default: mod.SecurePDFViewer })).catch(err => {
    console.warn('Failed to load SecurePDFViewer:', err);
    return { default: () => <div className="p-4 text-center text-red-600">Failed to load PDF viewer</div> };
  }),
  { 
    ssr: false, 
    loading: () => <div className="flex items-center justify-center bg-gray-200 rounded animate-pulse h-96">
      <span className="text-gray-600">Loading PDF viewer...</span>
    </div> 
  }
);

const PDFViewer = dynamic(
  () => import('./pdf-viewer').then(mod => ({ default: mod.PDFViewer })).catch(err => {
    console.warn('Failed to load PDFViewer:', err);
    return { default: () => <div className="p-4 text-center text-red-600">Failed to load PDF viewer</div> };
  }),
  { ssr: false }
);

interface DocumentsListProps {
  documents: any[];
  loading: boolean;
  documentTypes: any[];
  statusColors: Record<string, string>;
  onRefresh: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  userSession?: any;
}

export function DocumentsList({
  documents,
  loading,
  documentTypes,
  statusColors,
  onRefresh,
  currentPage,
  totalPages,
  onPageChange,
  userSession,
}: DocumentsListProps) {
  const roleVisibility = useRoleVisibility();
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    documentTypeId: '',
    tags: '',
    isPublic: false,
    accessGroups: [] as string[],
    expiresAt: ''
  });

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedDocumentForHistory, setSelectedDocumentForHistory] = useState<any>(null);
  const { toast } = useToast();

  // Debug: Log userSession in DocumentsList
  console.log('📋 DocumentsList userSession:', {
    role: userSession?.user?.role,
    permissions: userSession?.user?.permissions,
    hasPdfDownload: userSession?.user?.permissions?.includes('pdf.download')
  });

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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownload = async (doc: any) => {
    // Ensure we're running in the browser with document available
    if (typeof window === 'undefined') {
      console.error('❌ Download failed: Not running in browser environment');
      alert('Download failed: Please try again');
      return;
    }

    // Double check document is available and avoid variable conflicts
    const browserDocument = typeof window !== 'undefined' && typeof window.document !== 'undefined' ? window.document : null;
    if (!browserDocument) {
      console.error('❌ Download failed: Document not available');
      alert('Download failed: Please try again');
      return;
    }

    setActionLoading(doc.id);
    try {
      console.log('🔄 Starting download for:', doc.fileName);
      // Sanitize fileName to prevent XSS
      const safeFileName = doc.fileName.replace(/<[^>]*>/g, '').replace(/[<>\"'`]/g, '');
      
      const response = await fetch(`/api/documents/${doc.id}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = browserDocument.createElement('a');
        a.href = url;
        a.download = safeFileName;
        browserDocument.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        browserDocument.body.removeChild(a);
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
      setActionLoading(null);
    }
  };

  const handleDelete = async (doc: any) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    setActionLoading(doc.id);
    try {
      const response = await fetch(`/api/documents/${doc.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Document deleted successfully',
        });
        onRefresh();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete document',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (doc: any) => {
    setEditingDocument(doc);
    setEditFormData({
      title: doc.title || '',
      description: doc.description || '',
      documentTypeId: doc.documentTypeId || '',
      tags: doc.tags ? doc.tags.join(', ') : '',
      isPublic: doc.isPublic || false,
      accessGroups: doc.accessGroups || [],
      expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString().split('T')[0] || '' : ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!editingDocument) return;

    setActionLoading('edit');
    try {
      const response = await fetch(`/api/documents/${editingDocument.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editFormData.title,
          description: editFormData.description,
          documentTypeId: editFormData.documentTypeId,
          tags: editFormData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
          isPublic: editFormData.isPublic,
          accessGroups: editFormData.accessGroups,
          expiresAt: editFormData.expiresAt ? new Date(editFormData.expiresAt).toISOString() : null
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Document updated successfully',
        });
        setShowEditModal(false);
        setEditingDocument(null);
        onRefresh();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Update failed');
      }
    } catch (error: any) {
      console.error('Update error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update document',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    setEditingDocument(null);
    setEditFormData({ 
      title: '', 
      description: '', 
      documentTypeId: '', 
      tags: '', 
      isPublic: false, 
      accessGroups: [], 
      expiresAt: '' 
    });
  };

  const handleViewDocument = (doc: any) => {
    setSelectedDocument(doc);
    setShowViewer(true);
  };

  const isPDFFile = (doc: any) => {
    return doc.fileName?.toLowerCase().endsWith('.pdf') || doc.mimeType === 'application/pdf';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Documents</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Loading documents...
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="h-12 px-4 font-medium">Document</TableHead>
                  <TableHead className="h-12 px-4 font-medium w-[120px]">Type</TableHead>
                  <TableHead className="h-12 px-4 font-medium w-[160px]">Status</TableHead>
                  <TableHead className="h-12 px-4 font-medium w-[80px]">Size</TableHead>
                  <TableHead className="h-12 px-4 font-medium w-[120px]">Created</TableHead>
                  <TableHead className="h-12 px-4 font-medium w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <div className="space-y-2">
                          <Skeleton className="w-48 h-4" />
                          <Skeleton className="w-32 h-3" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <Skeleton className="w-20 h-4" />
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <Skeleton className="w-24 h-6 rounded-full" />
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <Skeleton className="w-16 h-4" />
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="space-y-1">
                        <Skeleton className="w-20 h-4" />
                        <Skeleton className="w-24 h-3" />
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right">
                      <Skeleton className="w-8 h-8 ml-auto rounded" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!documents.length) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Documents</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                No documents found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 mb-4 rounded-full bg-muted">
            </div>
            <h3 className="mb-2 font-semibold text-foreground">No documents yet</h3>
            <p className="max-w-sm mb-4 text-sm text-muted-foreground">
              Get started by uploading your first document to the system.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Documents</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {documents.length} document{documents.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="h-12 px-4 font-medium">Document</TableHead>
                  <TableHead className="h-12 px-4 font-medium w-[120px]">Type</TableHead>
                  <TableHead className="h-12 px-4 font-medium w-[160px]">Status</TableHead>
                  <TableHead className="h-12 px-4 font-medium w-[80px]">Size</TableHead>
                  <TableHead className="h-12 px-4 font-medium w-[120px]">Created</TableHead>
                  <TableHead className="h-12 px-4 font-medium w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => (
                  <TableRow key={document.id} className="hover:bg-muted/50">
                    <TableCell className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                          {isPDFFile(document) ? (
                            <span className="text-xs font-semibold text-red-600">PDF</span>
                          ) : (
                            <span className="text-xs font-semibold text-muted-foreground">DOC</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{document.title}</p>
                            {isPDFFile(document) && (
                              <Badge variant="secondary" className="h-5 text-xs">
                                PDF
                              </Badge>
                            )}
                          </div>
                          {document.description && (
                            <p className="max-w-md mt-1 text-sm truncate text-muted-foreground">
                              {document.description}
                            </p>
                          )}
                          {document.tags && document.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {document.tags.slice(0, 2).map((tag: string, index: number) => (
                                <Badge key={index} variant="outline" className="h-5 text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {document.tags.length > 2 && (
                                <Badge variant="outline" className="h-5 text-xs">
                                  +{document.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{document.documentType?.name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <DocumentStatusWorkflow
                        document={{
                          id: document.id,
                          title: document.title,
                          status: document.status || 'DRAFT'
                        }}
                        onStatusChange={onRefresh}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                      {formatFileSize(document.fileSize ? Number(document.fileSize) : 0)}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="text-sm font-medium">
                        {document.createdAt ? formatDate(document.createdAt) : 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {document.createdBy?.firstName || 'Unknown'} {document.createdBy?.lastName || ''}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      {/* Check if user has any permissions for actions */}
                      {(roleVisibility.hasAnyPermission(['documents.read', 'documents.update', 'documents.delete', 'pdf.view', 'pdf.download']) || 
                        document?.createdById === userSession?.user?.id || 
                        !roleVisibility.isGuest) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-8 h-8 p-0" disabled={actionLoading === document.id}>
                              <span className="sr-only">Open menu</span>
                              {actionLoading === document.id ? (
                                <span className="text-xs">...</span>
                              ) : (
                                <span className="text-xs">⋮</span>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <ActionMenuItem 
                            document={document} 
                            action="view" 
                            onClick={() => handleViewDocument(document)} 
                            label={isPDFFile(document) ? 'Preview PDF' : 'View Details'}
                            userSession={userSession}
                            roleVisibility={roleVisibility}
                          />
                          <ActionMenuItem 
                            document={document} 
                            action="history" 
                            onClick={() => {
                              setSelectedDocumentForHistory(document);
                              setShowHistoryModal(true);
                            }} 
                            label="History"
                            userSession={userSession}
                            roleVisibility={roleVisibility}
                          />
                          <ActionMenuItem 
                            document={document} 
                            action="edit" 
                            onClick={() => handleEdit(document)} 
                            label="Edit"
                            userSession={userSession}
                            roleVisibility={roleVisibility}
                          />
                          <ActionMenuItem 
                            document={document} 
                            action="download" 
                            onClick={() => handleDownload(document)} 
                            label="Download"
                            userSession={userSession}
                            roleVisibility={roleVisibility}
                          />
                          <ActionMenuItem 
                            document={document} 
                            action="delete" 
                            onClick={() => handleDelete(document)} 
                            label="Delete"
                            className="text-red-600"
                            userSession={userSession}
                            roleVisibility={roleVisibility}
                          />
                        </DropdownMenuContent>
                      </DropdownMenu>
                      ) : (
                        <span className="text-xs text-gray-400">No actions</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="h-8"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="h-8"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Viewer Dialog */}
      {showViewer && selectedDocument && (
        <Dialog open={showViewer} onOpenChange={() => {
          setShowViewer(false);
          setSelectedDocument(null);
        }}>
          <DialogContent className="max-w-7xl max-h-[98vh] overflow-hidden">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>{selectedDocument.title}</DialogTitle>
                  <DialogDescription>
                    {isPDFFile(selectedDocument) ? 'PDF Document Preview' : 'Document details and information'}
                  </DialogDescription>
                </div>
                
                {isPDFFile(selectedDocument) && (
                  <div className="flex gap-2">
                    {/* Download button - only show if user has permissions */}
                    {(userSession?.user?.permissions?.includes('pdf.download') || 
                      userSession?.user?.permissions?.includes('documents.download') ||
                      selectedDocument?.createdById === userSession?.user?.id) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleDownload(selectedDocument)}
                        disabled={actionLoading === selectedDocument.id}
                        className="text-white bg-green-600 hover:bg-green-700"
                      >
                        {actionLoading === selectedDocument.id ? (
                          <>
                            <div className="w-3 h-3 mr-2 border border-white rounded-full border-t-transparent animate-spin"></div>
                            Downloading...
                          </>
                        ) : (
                          <>
                            Download PDF
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </DialogHeader>
            
            <div className="overflow-y-auto max-h-[85vh]">
              {isPDFFile(selectedDocument) ? (
                <SecurePDFViewer
                  fileUrl={`/api/documents/${selectedDocument.id}/download`}
                  fileName={selectedDocument.fileName}
                  userRole={userSession?.user?.role || 'viewer'}
                  canDownload={false}
                  document={selectedDocument}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 mb-4 rounded-full bg-muted">
                    <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">Non-PDF Document</h3>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    This document is not a PDF file. Document information is displayed above.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Document Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>
              Update document information for: {editingDocument?.fileName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Basic Information</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title *</Label>
                  <Input
                    id="edit-title"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Document title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Document Type</Label>
                  <Select
                    value={editFormData.documentTypeId}
                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, documentTypeId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Document description"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-tags">Tags</Label>
                <Input
                  id="edit-tags"
                  value={editFormData.tags}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="Enter tags separated by commas"
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple tags with commas (e.g., policy, procedure, manual)
                </p>
              </div>
            </div>

            {/* Access Control */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Access Control</h4>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-public"
                  checked={editFormData.isPublic}
                  onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, isPublic: checked }))}
                />
                <Label htmlFor="edit-public">Make this document public</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Public documents can be accessed by all users in the system
              </p>
            </div>

            {/* Expiration */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Document Lifecycle</h4>
              <div className="space-y-2">
                <Label htmlFor="edit-expires">Expiration Date (Optional)</Label>
                <Input
                  id="edit-expires"
                  type="date"
                  value={editFormData.expiresAt}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty if the document doesn't expire
                </p>
              </div>
            </div>

            {/* Current File Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Current File</h4>
              <div className="p-4 rounded-lg bg-muted">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Filename:</span> {editingDocument?.fileName}
                  </div>
                  <div>
                    <span className="font-medium">Size:</span> {formatFileSize(editingDocument?.fileSize)}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span> {editingDocument?.mimeType}
                  </div>
                  <div>
                    <span className="font-medium">Version:</span> {editingDocument?.version}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4 space-x-2 border-t">
            <Button variant="outline" onClick={handleEditCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditSubmit}
              disabled={actionLoading === 'edit' || !editFormData.title.trim()}
            >
              {actionLoading === 'edit' ? 'Updating...' : 'Update Document'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document History Modal */}
      {selectedDocumentForHistory && (
        <DocumentHistory 
          documentId={selectedDocumentForHistory.id}
          documentTitle={selectedDocumentForHistory.title}
          isOpen={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedDocumentForHistory(null);
          }}
        />
      )}
    </>
  );
}