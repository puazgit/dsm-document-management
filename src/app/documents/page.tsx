'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from '../../hooks/use-toast';
import { DocumentUpload } from '../../components/documents/document-upload';
import { DocumentsList } from '../../components/documents/documents-list';
import { PDFSecurityTest } from '../../components/security/pdf-security-test';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '../../components/ui/sidebar'
import { AppSidebar } from '../../components/app-sidebar'
import { Header } from '../../components/ui/header';
import { useRoleVisibility, FeatureToggle, RoleGuard } from '../../hooks/use-role-visibility';

// Document status color mapping
const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  PENDING_APPROVAL: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
  APPROVED: 'bg-green-100 text-green-800 hover:bg-green-200',
  PUBLISHED: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  REJECTED: 'bg-red-100 text-red-800 hover:bg-red-200',
  ARCHIVED: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
  EXPIRED: 'bg-red-100 text-red-600 hover:bg-red-200',
};

export default function DocumentsPage() {
  const { data: session, status } = useSession();
  const roleVisibility = useRoleVisibility();
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Debug: Log session data to check permissions
  useEffect(() => {
    if (session) {
      console.log('📄 Documents Page Session:', {
        email: session?.user?.email,
        role: session?.user?.role,
        permissions: session?.user?.permissions,
        hasPdfDownload: session?.user?.permissions?.includes('pdf.download')
      });
    }
  }, [session]);

  // Security: Disable right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  // Security: Disable certain keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Disable F12 (DevTools), Ctrl+Shift+I, Ctrl+U (View Source)
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.key === 'U')) {
      e.preventDefault();
      return false;
    }
    // Disable Ctrl+S (Save)
    if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      return false;
    }
    return true;
  };
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // Advanced PDF security - Comprehensive download prevention
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const preventPDFAccess = (e: Event) => {
      const target = e.target;
      
      // Ensure target is an HTMLElement before using closest
      if (!target || !(target instanceof HTMLElement)) {
        return true;
      }
      
      // Check if the target is a PDF-related element
      if (target.tagName === 'OBJECT' || 
          target.tagName === 'IFRAME' || 
          target.tagName === 'EMBED' ||
          target.closest('.pdf-viewer-container') ||
          target.closest('.pdf-viewer-restricted')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }
      return true;
    };

    // Comprehensive event prevention
    const events = [
      'contextmenu', 'selectstart', 'dragstart', 'dragover', 'drop',
      'mousedown', 'mouseup', 'copy', 'cut', 'paste', 'beforeprint'
    ];

    events.forEach(eventName => {
      document.addEventListener(eventName, preventPDFAccess, true);
    });

    // Prevent Ctrl+S, Ctrl+P keyboard combinations globally
    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's' || e.key === 'S' || // Save
            e.key === 'p' || e.key === 'P' || // Print
            e.key === 'a' || e.key === 'A' || // Select All
            e.key === 'c' || e.key === 'C' || // Copy
            e.key === 'v' || e.key === 'V' || // Paste
            e.key === 'x' || e.key === 'X') { // Cut
          e.preventDefault();
          e.stopImmediatePropagation();
          return false;
        }
      }
      
      // Prevent F12, DevTools shortcuts
      if (e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
          (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }
      return true;
    };

    if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('keydown', preventKeyboardShortcuts, true);
    }

    // Cleanup
    return () => {
      if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.removeEventListener) {
        events.forEach(eventName => {
          document.removeEventListener(eventName, preventPDFAccess, true);
        });
        document.removeEventListener('keydown', preventKeyboardShortcuts, true);
      }
    };
  }, []);

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
  const fetchDocuments = async () => {
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
  };

  // Fetch stats
  const fetchStats = async () => {
    if (!session) return;

    try {
      const response = await fetch('/api/documents/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.overview);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [session, currentPage, sortBy, sortOrder, selectedType, selectedStatus]);

  useEffect(() => {
    fetchStats();
  }, [session]);

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1);
    fetchDocuments();
  };

  // Handle upload success
  const handleUploadSuccess = (document: any) => {
    setShowUploadDialog(false);
    fetchDocuments();
    fetchStats();
    toast({
      title: 'Success',
      description: 'Document uploaded successfully',
    });
  };

  if (status === 'loading') {
    return (
      <div className="container p-6 mx-auto space-y-6">
        <Skeleton className="w-64 h-8" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container p-6 mx-auto">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please sign in to access documents.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="document-secure-page"
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Header />
          <main className="flex-1 p-6 overflow-y-auto">
          <div className="container mx-auto space-y-6">
            {/* Upload Button - Role-based visibility */}
            <FeatureToggle feature="canUpload">
              <div className="flex justify-end">
                <Button 
                  onClick={() => setShowUploadDialog(true)}
                  className="md:w-auto"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload Document
                </Button>
              </div>
            </FeatureToggle>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
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
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.pendingDocuments}</div>
                    <p className="text-xs text-muted-foreground">
                      Awaiting review
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">My Documents</CardTitle>
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.myDocuments}</div>
                    <p className="text-xs text-muted-foreground">
                      Created by you
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalDownloads}</div>
                    <p className="text-xs text-muted-foreground">
                      All time downloads
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Search and Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Search & Filter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="flex-1">
                    <Input
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <Button onClick={handleSearch}>Search</Button>
                </div>

                <div className="flex flex-col gap-4 md:flex-row">
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-full md:w-48">
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
                    <SelectTrigger className="w-full md:w-48">
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
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* <SelectItem value=""></SelectItem> */}
                      <SelectItem value="createdAt">CreatedDate</SelectItem>
                      <SelectItem value="updatedAt">Updated Date</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      {/* <SelectItem value="downloadCount">Downloads</SelectItem>
                      <SelectItem value="viewCount">Views</SelectItem> */}
                    </SelectContent>
                  </Select>

                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className="w-full md:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Desc</SelectItem>
                      <SelectItem value="asc">Asc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* PDF Security Test Results */}
            {/* <PDFSecurityTest /> */}

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
            <DocumentUpload
              open={showUploadDialog}
              onClose={() => setShowUploadDialog(false)}
              onSuccess={handleUploadSuccess}
              documentTypes={documentTypes}
            />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
    </div>
  );
}