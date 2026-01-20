'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Calendar, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface DocumentVersion {
  id: string;
  version: string;
  fileName: string;
  filePath: string;
  fileSize: bigint | null;
  changes: string | null;
  status: string;
  createdAt: Date;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  metadata?: any;
}

interface DocumentVersionHistoryProps {
  documentId: string;
  currentVersion?: string;
}

export function DocumentVersionHistory({ documentId, currentVersion = '1.0' }: DocumentVersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchVersions();
  }, [documentId]);

  const fetchVersions = async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}/versions`);
      if (!response.ok) {
        throw new Error('Failed to fetch versions');
      }
      const data = await response.json();
      setVersions(data.versions || []);
    } catch (error) {
      console.error('Error fetching versions:', error);
      toast.error('Failed to load version history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadVersion = async (versionId: string, fileName: string) => {
    setDownloadingId(versionId);
    try {
      const response = await fetch(`/api/documents/${documentId}/versions/${versionId}/download`);
      if (!response.ok) {
        throw new Error('Failed to download version');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Downloaded version ${fileName}`);
    } catch (error) {
      console.error('Error downloading version:', error);
      toast.error('Failed to download version');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatFileSize = (bytes: bigint | null): string => {
    if (!bytes) return 'N/A';
    const numBytes = Number(bytes);
    if (numBytes < 1024) return `${numBytes} B`;
    if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(2)} KB`;
    return `${(numBytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'DRAFT':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Version History</CardTitle>
          <CardDescription className="text-sm">Loading...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="p-3 border rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Version History</CardTitle>
          <CardDescription className="text-sm">
            Track changes and versions of this document
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground mb-1">
              No previous versions
            </p>
            <p className="text-xs text-muted-foreground">
              Current version: <span className="font-mono font-semibold">{currentVersion}</span>
            </p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              When this document is revised, previous versions will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Version History</CardTitle>
        <CardDescription className="text-sm">
          {versions.length} previous {versions.length === 1 ? 'version' : 'versions'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
        {versions.map((version, index) => (
          <div
            key={version.id}
            className="p-3 border rounded-lg hover:bg-accent/30 transition-colors space-y-3"
          >
            {/* Version Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-xs">
                  v{version.version}
                </Badge>
                <Badge className={`${getStatusColor(version.status)} text-xs`}>
                  {version.status}
                </Badge>
                {index === 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Latest
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatFileSize(version.fileSize)}
              </span>
            </div>

            {/* File Name */}
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium break-all">{version.fileName}</p>
              </div>
            </div>

            {/* Changes Description */}
            {version.changes && (
              <div className="pl-6">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {version.changes}
                </p>
              </div>
            )}

            {/* Metadata */}
            <div className="pl-6 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">
                  {version.createdBy.firstName} {version.createdBy.lastName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span title={new Date(version.createdAt).toLocaleString('id-ID')}>
                  {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>

            {/* Additional metadata from revision */}
            {version.metadata?.revisionReason && (
              <div className="text-xs italic text-muted-foreground p-2 bg-muted/50 rounded border-l-2 border-primary/50">
                <strong>Reason:</strong> {version.metadata.revisionReason}
              </div>
            )}

            {/* Download Button */}
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadVersion(version.id, version.fileName)}
                disabled={downloadingId === version.id}
                className="w-full"
              >
                {downloadingId === version.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Downloading...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    <span className="text-xs">Download this version</span>
                  </span>
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
