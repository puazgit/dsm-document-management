"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/search/search-bar";
import { SearchFilters, type SearchFilters as SearchFiltersType } from "@/components/search/search-filters";
import { SearchResults } from "@/components/search/search-results";
import { SearchPagination } from "@/components/search/search-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface SearchPageProps {
  initialQuery?: string;
}

export function SearchPage({ initialQuery = "" }: SearchPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State
  const [query, setQuery] = useState(initialQuery || searchParams.get("q") || "");
  const [filters, setFilters] = useState<SearchFiltersType>({});
  const [results, setResults] = useState<any[]>([]);
  const [facets, setFacets] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

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
        pageSize: pageSize.toString(),
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
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      setResults(data.results || []);
      setFacets(data.facets || null);
      setTotalResults(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 0);

      // Track search analytics
      try {
        await fetch("/api/documents/search/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            resultsCount: data.results?.length || 0,
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
    setQuery(newQuery);
    setCurrentPage(1); // Reset to first page on new search
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
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Pencarian Dokumen</h1>
        <p className="text-muted-foreground">
          Cari dokumen berdasarkan judul, deskripsi, atau konten PDF
        </p>
      </div>

      {/* Search Bar & Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                initialQuery={query}
                onSearch={handleSearch}
                placeholder="Cari dokumen, contoh: sertifikat, prosedur, panduan..."
              />
            </div>
            <SearchFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              facets={facets}
            />
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search Results */}
      <SearchResults
        results={results}
        isLoading={isLoading}
        query={query}
        totalResults={totalResults}
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
  );
}
