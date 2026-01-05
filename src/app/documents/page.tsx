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
import { CapabilityGuard } from '../../hooks/use-capabilities';
import { withAuth } from '../../components/auth/with-auth';
import { FileText, Clock, User, Download } from 'lucide-react';

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  IN_REVIEW: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  PENDING_APPROVAL: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
  APPROVED: 'bg-green-100 text-green-800 hover:bg-green-200',
  PUBLISHED: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  REJECTED: 'bg-red-100 text-red-800 hover:bg-red-200',
  ARCHIVED: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
  EXPIRED: 'bg-red-100 text-red-600 hover:bg-red-200',
};

function DocumentsPage() {
  const { data: session, status } = useSession();
  
  // Document states
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

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
    fetchDocuments();
  }, [fetchDocuments]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchDocuments();
  };

  const handleUploadSuccess = (document: any) => {
    setShowUploadDialog(false);
    fetchDocuments();
    toast({
      title: 'Success',
      description: 'Document uploaded successfully',
    });
  };

  if (status === 'loading') {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="w-1/4 h-8 bg-gray-200 rounded"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
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
      {/* Upload Button */}
      <div className="flex justify-end">
        <CapabilityGuard capability="DOCUMENT_CREATE">
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

      {/* Search and Filters */}
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

      {/* Documents List */}
      <DocumentsList 
        documents={documents}
        loading={loading}
        documentTypes={documentTypes}
        statusColors={statusColors}
        onRefresh={fetchDocuments}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        userSession={session}
      />

      {/* Upload Dialog */}
      <DocumentUploadV2
        open={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        onSuccess={handleUploadSuccess}
        documentTypes={documentTypes}
      />
    </div>
  );
}

// Wrap with authentication and require DOCUMENT_VIEW capability
export default withAuth(DocumentsPage, {
  requiredCapabilities: ['DOCUMENT_VIEW']
});