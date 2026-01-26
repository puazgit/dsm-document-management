'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from '../../hooks/use-toast';
import { DocumentUploadV2 } from '../../components/documents/document-upload-v2';
import { DocumentsList } from '../../components/documents/documents-list';
import { DocumentTree } from '../../components/documents/document-tree';
import { TreeViewToggle } from '../../components/documents/tree-view-toggle';
import { DocumentCSVImport } from '../../components/documents/document-csv-import';
import { CapabilityGuard } from '../../hooks/use-capabilities';
import { withAuth } from '../../components/auth/with-auth';
import { FileText, Clock, User, Download, Upload } from 'lucide-react';

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50',
  PENDING_APPROVAL: 'bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50',
  APPROVED: 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50',
  PUBLISHED: 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50',
  REJECTED: 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50',
  ARCHIVED: 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
  EXPIRED: 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50',
};

function DocumentsPage() {
  const { data: session, status } = useSession();
  
  // Document states
  const [documents, setDocuments] = useState<any[]>([]);
  const [treeDocuments, setTreeDocuments] = useState<any[]>([]);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showCSVImportDialog, setShowCSVImportDialog] = useState(false);

  // Fetch document types
  useEffect(() => {
    const fetchDocumentTypes = async () => {
      try {
        const response = await fetch('/api/document-types');
        if (response.ok) {
          const data = await response.json();
          setDocumentTypes(data);
        }
      } catch (error) {
        console.error('Error fetching document types:', error);
      }
    };

    if (session) {
      fetchDocumentTypes();
    }
  }, [session]);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        sortBy,
        sortOrder,
      });

      if (searchQuery) params.append('search', searchQuery);
      if (selectedType && selectedType !== 'all') params.append('documentTypeId', selectedType);
      if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);

      const response = await fetch(`/api/documents?${params}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents);
        setTotalPages(data.pagination.totalPages);
        setTotalDocuments(data.pagination.total);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch documents',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [session, currentPage, sortBy, sortOrder, searchQuery, selectedType, selectedStatus]);

  useEffect(() => {
    if (viewMode === 'list') {
      fetchDocuments();
    }
  }, [fetchDocuments, viewMode]);

  // Auto-fetch when filters change
  useEffect(() => {
    if (viewMode === 'list') {
      setCurrentPage(1); // Reset to first page when filters change
    }
  }, [selectedType, selectedStatus, sortBy, sortOrder, viewMode]);

  // Fetch tree documents for tree view
  const fetchTreeDocuments = useCallback(async () => {
    if (!session || viewMode !== 'tree') return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        includeChildren: 'true',
      });

      if (selectedType && selectedType !== 'all') params.append('documentTypeId', selectedType);
      if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);

      const response = await fetch(`/api/documents/tree?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTreeDocuments(data.documents || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch document tree',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching tree documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch document tree',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [session, viewMode, selectedType, selectedStatus]);

  useEffect(() => {
    if (viewMode === 'tree') {
      fetchTreeDocuments();
    }
  }, [viewMode, fetchTreeDocuments]);

  const handleSearch = () => {
    setCurrentPage(1);
    // fetchDocuments will be called automatically by useEffect
  };

  // Debounced search - auto search after user stops typing
  useEffect(() => {
    if (searchQuery === '') {
      // If search is cleared, fetch immediately
      return;
    }
    
    const debounceTimer = setTimeout(() => {
      if (searchQuery.length > 0) {
        setCurrentPage(1);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleUploadSuccess = (document: any) => {
    setShowUploadDialog(false);
    fetchDocuments();
    toast({
      title: 'Success',
      description: 'Document uploaded successfully',
    });
  };

  const handleCSVImportSuccess = () => {
    fetchDocuments();
  };

  if (status === 'loading') {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="w-1/4 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Please sign in to access documents.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Upload Button and View Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-2xl font-bold">Documents</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <TreeViewToggle value={viewMode} onChange={setViewMode} />
          <CapabilityGuard capability="DOCUMENT_CREATE">
            <Button 
              onClick={() => setShowCSVImportDialog(true)}
              variant="outline"
              size="default"
              className="w-full sm:w-auto"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Button 
              onClick={() => setShowUploadDialog(true)}
              size="default"
              className="w-full sm:w-auto"
            >
              <FileText className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </CapabilityGuard>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDocuments}</div>
              <p className="text-xs text-muted-foreground">
                {stats.recentChangePercentage > 0 ? '+' : ''}{stats.recentChangePercentage}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingDocuments}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">My Documents</CardTitle>
              <User className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.myDocuments}</div>
              <p className="text-xs text-muted-foreground">Created by you</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
              <Download className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDownloads}</div>
              <p className="text-xs text-muted-foreground">All time downloads</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters - Only show in list view */}
      {viewMode === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
            <CardDescription>Find documents by title, type, or status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch}>Search</Button>
              </div>

              {/* Quick Status Filters */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Quick Status Filter</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={selectedStatus === 'all' ? 'default' : 'outline'}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setSelectedStatus('all')}
                  >
                    All Status
                  </Badge>
                  {Object.keys(statusColors).map((status) => (
                    <Badge
                      key={status}
                      variant={selectedStatus === status ? 'default' : 'outline'}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedStatus(status)}
                    >
                      {status.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Document Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {Object.keys(statusColors).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                    <SelectItem value="updatedAt">Updated Date</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List or Tree View */}
      {viewMode === 'list' ? (
        <DocumentsList 
          documents={documents}
          loading={loading}
          documentTypes={documentTypes}
          statusColors={statusColors}
          onRefresh={fetchDocuments}
          currentPage={currentPage}
          totalPages={totalPages}
          totalDocuments={totalDocuments}
          onPageChange={setCurrentPage}
          userSession={session}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Document Hierarchy</CardTitle>
            <CardDescription>Tree view of documents organized by parent-child relationships</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 mx-auto mb-4 border-4 rounded-full border-t-transparent border-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading document tree...</p>
                </div>
              </div>
            ) : treeDocuments.length > 0 ? (
              <DocumentTree documents={treeDocuments} />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No documents found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <DocumentUploadV2
        open={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        onSuccess={handleUploadSuccess}
        documentTypes={documentTypes}
      />

      {/* CSV Import Dialog */}
      <DocumentCSVImport
        open={showCSVImportDialog}
        onClose={() => setShowCSVImportDialog(false)}
        onSuccess={handleCSVImportSuccess}
      />
    </div>
  );
}

// Wrap with authentication and require DOCUMENT_VIEW capability
export default withAuth(DocumentsPage, {
  requiredCapabilities: ['DOCUMENT_VIEW']
});