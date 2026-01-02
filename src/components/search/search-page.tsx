"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import dynamic from "next/dynamic";
import { SearchBar } from "@/components/search/search-bar";
import { SearchFilters, type SearchFilters as SearchFiltersType } from "@/components/search/search-filters";
import { SearchResults } from "@/components/search/search-results";
import { SearchPagination } from "@/components/search/search-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, User, LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

// Dynamic import for PDF viewer
const PDFViewerWrapper = dynamic(
  () => import('@/components/documents/pdf-viewer-wrapper').then(mod => ({ default: mod.PDFViewerWrapper })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-96">Loading PDF viewer...</div> }
);

// Interface definitions matching API response
interface DocumentHighlights {
  title?: string;
  description?: string;
}

interface DocumentType {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface SearchDocument {
  id: string;
  title: string;
  description?: string;
  file_name: string;
  file_path: string;
  file_size?: bigint;
  file_type?: string;
  mime_type?: string;
  version: string;
  status: string;
  is_public: boolean;
  tags?: string[];
  metadata?: any;
  document_type_id: string;
  created_by_id: string;
  updated_by_id?: string;
  approved_by_id?: string;
  created_at: Date;
  updated_at: Date;
  approved_at?: Date;
  view_count: number;
  download_count: number;
  access_groups?: string[];
  search_rank?: number;
  title_highlight?: string;
  description_highlight?: string;
  documentType?: DocumentType;
  createdBy?: User;
  updatedBy?: User;
  approvedBy?: User;
  _count?: {
    comments: number;
  };
  highlights?: DocumentHighlights;
}

interface SearchPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface FacetItem {
  documentTypeId?: string;
  status?: string;
  fileType?: string;
  _count: { id: number };
  documentType?: DocumentType;
}

interface SearchFacets {
  documentTypes?: FacetItem[];
  statuses?: FacetItem[];
  fileTypes?: FacetItem[];
}

interface SearchResponse {
  documents: SearchDocument[];
  pagination: SearchPagination;
  facets: SearchFacets;
  searchQuery: {
    q?: string;
    documentTypeId?: string;
    status?: string;
    createdById?: string;
    tags?: string;
    dateFrom?: string;
    dateTo?: string;
    fileType?: string;
    minSize?: number;
    maxSize?: number;
    hasComments?: boolean;
    sortBy?: string;
    sortOrder?: string;
  };
}

interface SearchPageProps {
  initialQuery?: string;
}

// User Menu Component
function UserMenu() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Show login button if not authenticated
  if (status === 'unauthenticated') {
    return (
      <Button
        onClick={() => router.push('/auth/login?callbackUrl=' + encodeURIComponent('/search'))}
        variant="default"
        size="sm"
        className="rounded-full"
      >
        Sign In
      </Button>
    );
  }
  
  if (!session?.user) return null;

  const userInitials = session.user.name
    ? session.user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : session?.user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative rounded-full h-9 w-9 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={undefined} alt={session?.user?.name || ''} />
            <AvatarFallback className="text-sm bg-primary text-primary-foreground">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session.user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.location.href = '/dashboard'}>
          <User className="w-4 h-4 mr-2" />
          <span>Dashboard</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.location.href = '/profile'}>
          <Settings className="w-4 h-4 mr-2" />
          <span>Pengaturan</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="w-4 h-4 mr-2" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SearchPage({ initialQuery = "" }: SearchPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  
  // Debug logging
  useEffect(() => {
    console.log('[SEARCH PAGE] Component mounted, status:', status, 'session:', session?.user?.email);
  }, [status, session]);
  
  // State dengan type yang benar
  const [query, setQuery] = useState<string>(initialQuery || searchParams.get("q") || "");
  const [filters, setFilters] = useState<SearchFiltersType>({});
  const [results, setResults] = useState<SearchDocument[]>([]);
  const [facets, setFacets] = useState<SearchFacets | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  
  // Viewer modal states
  const [showViewer, setShowViewer] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  // Helper function untuk map SearchDocument ke format yang dibutuhkan SearchResults component
  const mapSearchDocuments = (documents: SearchDocument[]) => {
    return documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      fileName: doc.file_name,
      filePath: doc.file_path,
      fileType: doc.file_type,
      status: doc.status,
      viewCount: doc.view_count,
      downloadCount: doc.download_count,
      createdAt: doc.created_at.toString(),
      highlight: doc.title_highlight || doc.highlights?.title,
      rank: doc.search_rank,
      documentType: doc.documentType ? {
        name: doc.documentType.name
      } : undefined,
      createdBy: doc.createdBy ? {
        name: `${doc.createdBy.firstName} ${doc.createdBy.lastName}`
      } : undefined,
      tags: doc.tags
    }));
  };

  // Helper function untuk map facets ke format yang dibutuhkan SearchFilters
  const mapFacets = (searchFacets: SearchFacets | null) => {
    if (!searchFacets) return undefined;
    
    return {
      documentTypes: searchFacets.documentTypes?.map(f => ({
        id: f.documentTypeId || '',
        name: f.documentType?.name || '',
        count: f._count.id
      })),
      statuses: searchFacets.statuses?.map(f => ({
        status: f.status || '',
        count: f._count.id
      })),
      fileTypes: searchFacets.fileTypes?.map(f => ({
        fileType: f.fileType || '',
        count: f._count.id
      }))
    };
  };

  // Perform search
  const performSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      setFacets(null);
      setTotalResults(0);
      setTotalPages(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams({
        q: query,
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      // Add filters
      if (filters.status && filters.status.length > 0) {
        filters.status.forEach((s) => params.append("status", s));
      }
      if (filters.fileType && filters.fileType.length > 0) {
        filters.fileType.forEach((f) => params.append("fileType", f));
      }
      if (filters.documentTypeId) {
        params.append("documentTypeId", filters.documentTypeId);
      }
      if (filters.dateFrom) {
        params.append("dateFrom", filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append("dateTo", filters.dateTo);
      }

      // Fetch search results
      const response = await fetch(`/api/documents/search?${params.toString()}`);
      
      if (!response.ok) {
        // Handle unauthorized - redirect to login
        if (response.status === 401) {
          console.log('[SEARCH PAGE] Unauthorized - redirecting to login');
          router.push('/auth/login?callbackUrl=' + encodeURIComponent('/search'));
          return;
        }
        
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Search failed: ${response.statusText}`);
      }

      const data: SearchResponse = await response.json();
      
      // Set state dengan data yang sudah di-type
      setResults(data.documents || []);
      setFacets(data.facets || null);
      setTotalResults(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 0);

      console.log('[SEARCH PAGE] Success:', {
        query,
        documentsCount: data.documents?.length,
        total: data.pagination?.total,
        facets: data.facets
      });

      // Track search analytics
      try {
        await fetch("/api/documents/search/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            resultsCount: data.documents?.length || 0,
            filters: Object.keys(filters).length > 0 ? filters : undefined,
          }),
        });
      } catch (analyticsError) {
        // Ignore analytics errors
        console.error("Failed to track search:", analyticsError);
      }

      // Update URL
      const urlParams = new URLSearchParams({ q: query });
      if (currentPage > 1) {
        urlParams.set("page", currentPage.toString());
      }
      router.replace(`/search?${urlParams.toString()}`, { scroll: false });
      
    } catch (err) {
      console.error("Search error:", err);
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat mencari");
      setResults([]);
      setFacets(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Search when query, filters, page, or pageSize changes
  useEffect(() => {
    // Don't search if still loading session or not authenticated
    if (status === 'loading' || status === 'unauthenticated') {
      return;
    }
    
    const timer = setTimeout(() => {
      if (query.trim()) {
        performSearch();
      }
    }, 300); // Debounce search

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filters, currentPage, pageSize]);

  // Handle search from SearchBar
  const handleSearch = (newQuery: string) => {
    // Check if user is authenticated before allowing search
    if (status === 'unauthenticated') {
      console.log('[SEARCH PAGE] Not authenticated - redirecting to login');
      router.push('/auth/login?callbackUrl=' + encodeURIComponent('/search'));
      return;
    }
    
    setQuery(newQuery);
    setCurrentPage(1); // Reset to first page on new search
  };

  // Handle view document
  const handleViewDocument = (doc: any) => {
    console.log('[SEARCH PAGE] Opening document:', {
      id: doc.id,
      title: doc.title,
      fileName: doc.fileName,
      filePath: doc.filePath,
      apiUrl: `/api/documents/${doc.id}/download`
    });
    setSelectedDocument(doc);
    setShowViewer(true);
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters: SearchFiltersType) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Loading session */}
      {status === 'loading' && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-4 border-4 rounded-full border-t-transparent border-primary animate-spin" />
            <p className="text-muted-foreground">Memuat...</p>
          </div>
        </div>
      )}

      {/* Main content - show to everyone, but require auth to search */}
      {status !== 'loading' && (
        <>
          {/* Google-style centered search (when no results) */}
          {!query.trim() && (
            <div className="relative flex flex-col items-center justify-center min-h-[70vh] px-4 animate-in fade-in duration-500">
              {/* User Menu - Top Right */}
              <div className="absolute top-4 right-4 md:top-6 md:right-6">
                <UserMenu />
              </div>
              <div className="mb-4 space-y-4 text-center">
                    <h1 className="text-4xl font-bold text-transparent md:text-5xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text">
                    DSMT Search
                    </h1>
                <p className="max-w-md mx-auto text-sm md:text-base text-muted-foreground">
                  Temukan dokumen yang Anda butuhkan dengan cepat dan mudah
                </p>
              </div>
              <div className="w-full max-w-2xl space-y-4">
                <SearchBar
                  initialQuery={query}
                  onSearch={handleSearch}
                  placeholder="Cari dokumen, prosedur, sertifikat..."
                />
                <p className="text-xs text-center text-muted-foreground">
                  Tips: Gunakan kata kunci spesifik untuk hasil lebih akurat
                </p>
              </div>
            </div>
          )}

          {/* Google-style header with search bar (when has query/results) */}
          {query.trim() && (
            <>
              <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 border-b shadow-sm">
                <div className="container px-4 py-3 mx-auto md:px-6 md:py-4 max-w-7xl">
                  {/* Desktop layout */}
                  <div className="items-center hidden gap-4 md:flex">
                    <h2 className="text-2xl font-bold tracking-tight text-primary whitespace-nowrap">
                      DSMT
                    </h2>
                    <div className="flex-1 mx-4">
                      <SearchBar
                        initialQuery={query}
                        onSearch={handleSearch}
                        placeholder="Cari dokumen..."
                      />
                    </div>
                    <SearchFilters
                      filters={filters}
                      onFiltersChange={handleFiltersChange}
                      facets={mapFacets(facets)}
                    />                    <UserMenu />                  </div>

                  {/* Mobile layout - Google style */}
                  <div className="flex flex-col gap-3 md:hidden">
                    {/* Top row: Logo and User Menu */}
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-primary">
                        DSMT
                      </h2>
                      <UserMenu />
                    </div>
                    
                    {/* Full width search bar */}
                    <div className="w-full">
                      <SearchBar
                        initialQuery={query}
                        onSearch={handleSearch}
                        placeholder="Cari dokumen..."
                      />
                    </div>
                    
                    {/* Filters below search */}
                    <SearchFilters
                      filters={filters}
                      onFiltersChange={handleFiltersChange}
                      facets={mapFacets(facets)}
                    />
                  </div>
                </div>
              </div>

              <div className="container max-w-4xl px-4 py-6 mx-auto">
                {/* Error Message */}
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Search Results */}
                <SearchResults
                  results={mapSearchDocuments(results)}
                  isLoading={isLoading}
                  query={query}
                  totalResults={totalResults}
                  onViewDocument={handleViewDocument}
                />

                {/* Pagination */}
                {!isLoading && results.length > 0 && totalPages > 1 && (
                  <div className="mt-6">
                    <SearchPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      pageSize={pageSize}
                      totalResults={totalResults}
                      onPageChange={handlePageChange}
                      onPageSizeChange={handlePageSizeChange}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* PDF Viewer Modal */}
      <Dialog open={showViewer} onOpenChange={setShowViewer}>
        <DialogContent className="max-w-6xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.title || 'Document Viewer'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {selectedDocument && session && (
              <PDFViewerWrapper
                fileUrl={`/api/documents/${selectedDocument.id}/download`}
                fileName={selectedDocument.fileName}
                userRole={(session.user as any).role}
                canDownload={false}
                document={selectedDocument}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
