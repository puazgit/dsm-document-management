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
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!isLoading && results.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Tidak ada hasil untuk &quot;{query}&quot;
          </h3>
          <p className="text-muted-foreground text-center max-w-md">
            Coba gunakan kata kunci yang berbeda atau hapus beberapa filter
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Ditemukan <span className="font-semibold text-foreground">{totalResults}</span>{" "}
          hasil untuk &quot;{query}&quot;
        </p>
      </div>

      {/* Results List */}
      {results.map((result) => {
        const statusConfig = STATUS_CONFIG[result.status as keyof typeof STATUS_CONFIG] || {
          label: result.status,
          variant: "secondary" as const,
        };

        return (
          <Card key={result.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/documents/${result.id}`}
                    className="group"
                  >
                    <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      {FILE_TYPE_ICONS[result.fileType || ""] || "📄"}{" "}
                      {result.title}
                    </CardTitle>
                  </Link>
                  <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
                    <Badge variant={statusConfig.variant}>
                      {statusConfig.label}
                    </Badge>
                    {result.documentType && (
                      <span className="text-xs">
                        {result.documentType.name}
                      </span>
                    )}
                    {result.rank && (
                      <span className="text-xs text-muted-foreground">
                        Relevansi: {(result.rank * 100).toFixed(0)}%
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Highlighted Snippet */}
              {result.highlight && (
                <div
                  className="text-sm text-muted-foreground line-clamp-3 bg-muted/50 p-3 rounded-md"
                  dangerouslySetInnerHTML={{
                    __html: result.highlight
                      .replace(/<b>/g, '<mark class="bg-yellow-200 dark:bg-yellow-900 font-semibold">')
                      .replace(/<\/b>/g, "</mark>"),
                  }}
                />
              )}

              {/* Description fallback if no highlight */}
              {!result.highlight && result.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {result.description}
                </p>
              )}

              {/* Tags */}
              {result.tags && result.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  {result.tags.slice(0, 5).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {result.tags.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{result.tags.length - 5} lainnya
                    </span>
                  )}
                </div>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{result.viewCount} views</span>
                </div>
                <div className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  <span>{result.downloadCount} downloads</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {format(new Date(result.createdAt), "d MMM yyyy", {
                      locale: idLocale,
                    })}
                  </span>
                </div>
                {result.createdBy && (
                  <span>oleh {result.createdBy.name}</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button asChild size="sm" variant="default">
                  <Link href={`/documents/${result.id}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Lihat Detail
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a
                    href={`/api/documents/${result.id}/download`}
                    download
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
