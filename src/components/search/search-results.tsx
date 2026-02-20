"use client";

import { FileText, Download, Eye, Calendar, Tag, ExternalLink, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  filePath: string;
  fileType?: string;
  status: string;
  viewCount: number;
  downloadCount: number;
  createdAt: string;
  highlight?: string;
  rank?: number;
  search_rank?: string | number; // Relevance score from database
  documentType?: {
    name: string;
  };
  createdBy?: {
    name: string;
  };
  tags?: string[];
}

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
  totalResults: number;
  onViewDocument?: (document: SearchResult) => void;
  selectedDocumentId?: string;
  compact?: boolean;
}

const STATUS_CONFIG = {
  DRAFT: { label: "Draft", variant: "secondary" as const },
  APPROVED: { label: "Disetujui", variant: "default" as const },
  PUBLISHED: { label: "Diterbitkan", variant: "default" as const },
  ARCHIVED: { label: "Diarsipkan", variant: "outline" as const },
};

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: "📄",
  docx: "📝",
  xlsx: "📊",
  pptx: "📽️",
};

export function SearchResults({
  results,
  isLoading,
  query,
  totalResults,
  onViewDocument,
  selectedDocumentId,
  compact = false,
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="pb-6 border-b last:border-b-0">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-2/3 mb-3" />
            <div className="flex gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!isLoading && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 mb-6 rounded-full bg-muted/50 flex items-center justify-center">
          <FileText className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <h3 className="text-xl font-semibold mb-2">
          Tidak ada hasil untuk &quot;{query}&quot;
        </h3>
        <p className="text-muted-foreground text-sm max-w-md mb-6">
          Coba gunakan kata kunci yang berbeda atau lebih umum.
          Pastikan ejaan Anda benar.
        </p>
        <div className="flex flex-wrap gap-2 justify-center text-xs">
          <span className="text-muted-foreground">Saran:</span>
          <span className="px-2 py-1 rounded-md bg-muted">Gunakan sinonim</span>
          <span className="px-2 py-1 rounded-md bg-muted">Kurangi filter</span>
          <span className="px-2 py-1 rounded-md bg-muted">Coba kata kunci umum</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Results Summary */}
      <div className={`text-sm text-muted-foreground px-1 ${compact ? 'mb-3' : 'mb-6'}`}>
        Sekitar <span className="font-medium">{totalResults.toLocaleString('id-ID')}</span> hasil
      </div>

      {/* Results List */}
      <div className={compact ? 'space-y-1' : 'space-y-6'}>
      {results.map((result) => {
        const statusConfig = STATUS_CONFIG[result.status as keyof typeof STATUS_CONFIG] || {
          label: result.status,
          variant: "secondary" as const,
        };

        return (
          <article
            key={result.id}
            className={`group border-b last:border-b-0 -mx-2 px-2 rounded-lg transition-colors duration-200 cursor-pointer ${
              selectedDocumentId === result.id
                ? 'bg-primary/10 border-l-2 border-l-primary'
                : 'hover:bg-accent/30'
            } ${compact ? 'pb-3 py-2' : 'pb-6 py-1'}`}
            onClick={() => onViewDocument?.(result)}
          >
            {/* Breadcrumb / Type */}
            <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
              <span className="font-medium truncate">{result.documentType?.name || "Dokumen"}</span>
              <span>•</span>
              <Badge variant={statusConfig.variant} className="h-5 text-xs flex-shrink-0">
                {statusConfig.label}
              </Badge>
            </div>

            {/* Title */}
            <div className="block mb-1 ">
              <h3 className={`text-primary group-hover:underline underline-offset-2 font-normal leading-tight ${
                compact ? 'text-base line-clamp-2' : 'text-xl md:text-2xl line-clamp-1'
              } ${selectedDocumentId === result.id ? 'font-semibold' : ''}`}>
                {result.title}
              </h3>
            </div>

            {/* Snippet */}
            {!compact && result.highlight && (
              <div
                className="text-sm md:text-base text-foreground/70 line-clamp-2 mb-2.5 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: result.highlight
                    .replace(/<b>/g, '<strong class="font-semibold text-foreground">')
                    .replace(/<\/b>/g, "</strong>"),
                }}
              />
            )}

            {/* Description fallback */}
            {!compact && !result.highlight && result.description && (
              <div className="text-sm md:text-base text-foreground/70 line-clamp-2 mb-2.5 leading-relaxed">
                {result.description}
              </div>
            )}

            {/* Compact description (1 line only) */}
            {compact && (result.highlight || result.description) && (
              <div
                className="text-xs text-foreground/60 line-clamp-1 mb-1.5 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: (result.highlight || result.description || '')
                    .replace(/<b>/g, '<strong class="font-semibold text-foreground">')
                    .replace(/<\/b>/g, "</strong>"),
                }}
              />
            )}

            {/* Metadata */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
              <span className="whitespace-nowrap">
                {format(new Date(result.createdAt), "d MMM yyyy", {
                  locale: idLocale,
                })}
              </span>
              <span>•</span>
              <span className="whitespace-nowrap">{result.viewCount} views</span>
              {!compact && result.downloadCount > 0 && (
                <>
                  <span>•</span>
                  <span className="whitespace-nowrap">{result.downloadCount} downloads</span>
                </>
              )}
              {!compact && (result.search_rank || result.rank) && (
                <>
                  <span className="hidden md:inline">•</span>
                  <span className="hidden md:inline-flex items-center gap-1 whitespace-nowrap font-medium text-primary">
                    <TrendingUp className="h-3 w-3" />
                    {parseFloat(String(result.search_rank || result.rank)).toFixed(2)}
                  </span>
                </>
              )}
            </div>

            {/* Tags */}
            {!compact && result.tags && result.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap mt-2.5">
                {result.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs h-6 font-normal">
                    {tag}
                  </Badge>
                ))}
                {result.tags.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{result.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </article>
        );
      })}
      </div>
    </div>
  );
}
