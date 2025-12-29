"use client";

import { FileText, Download, Eye, Calendar, Tag, ExternalLink } from "lucide-react";
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
      {/* Results Summary - Google style */}
      <div className="text-sm text-muted-foreground mb-6 px-1">
        Sekitar <span className="font-medium">{totalResults.toLocaleString('id-ID')}</span> hasil
      </div>

      {/* Results List - Clean Google style */}
      <div className="space-y-6">
      {results.map((result) => {
        const statusConfig = STATUS_CONFIG[result.status as keyof typeof STATUS_CONFIG] || {
          label: result.status,
          variant: "secondary" as const,
        };

        return (
          <article key={result.id} className="group pb-6 border-b last:border-b-0 hover:bg-accent/30 -mx-2 px-2 py-1 rounded-lg transition-colors duration-200">
            {/* Breadcrumb / Type */}
            <div className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground">
              <span className="font-medium">{result.documentType?.name || "Dokumen"}</span>
              <span>•</span>
              <Badge variant={statusConfig.variant} className="h-5 text-xs">
                {statusConfig.label}
              </Badge>
            </div>

            {/* Title - Google style */}
            <div
              onClick={() => onViewDocument?.(result)}
              className="block mb-1.5 cursor-pointer"
            >
              <h3 className="text-xl md:text-2xl text-primary group-hover:underline underline-offset-2 line-clamp-1 font-normal leading-tight">
                {result.title}
              </h3>
            </div>

            {/* Snippet - Google style highlighted text */}
            {result.highlight && (
              <div
                className="text-sm md:text-base text-foreground/70 line-clamp-2 mb-2.5 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: result.highlight
                    .replace(/<b>/g, '<strong class="font-semibold text-foreground">')
                    .replace(/<\/b>/g, "</strong>"),
                }}
              />
            )}

            {/* Description fallback if no highlight */}
            {!result.highlight && result.description && (
              <div className="text-sm md:text-base text-foreground/70 line-clamp-2 mb-2.5 leading-relaxed">
                {result.description}
              </div>
            )}

            {/* Metadata - Compact Google style */}
            <div className="flex items-center gap-2 md:gap-3 text-xs text-muted-foreground flex-wrap">
              {result.createdBy && (
                <>
                  <span className="truncate max-w-[120px] md:max-w-none">{result.createdBy.name}</span>
                  <span className="hidden sm:inline">•</span>
                </>
              )}
              <span className="whitespace-nowrap">
                {format(new Date(result.createdAt), "d MMM yyyy", {
                  locale: idLocale,
                })}
              </span>
              <span>•</span>
              <span className="whitespace-nowrap">{result.viewCount} views</span>
              {result.rank && (
                <>
                  <span className="hidden md:inline">•</span>
                  <span className="hidden md:inline whitespace-nowrap">Relevansi: {(result.rank * 100).toFixed(0)}%</span>
                </>
              )}
            </div>

            {/* Tags - Minimal */}
            {result.tags && result.tags.length > 0 && (
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
