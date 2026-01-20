'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Link as LinkIcon, ArrowRight, Paperclip } from 'lucide-react';
import Link from 'next/link';

interface RelatedDocument {
  id: string;
  title: string;
  status: string;
  relationType: string;
  documentType?: {
    name: string;
    icon?: string;
  };
}

interface RelatedDocumentsProps {
  documentId: string;
  className?: string;
}

export function RelatedDocuments({ documentId, className }: RelatedDocumentsProps) {
  const [loading, setLoading] = useState(true);
  const [parents, setParents] = useState<RelatedDocument[]>([]);
  const [children, setChildren] = useState<RelatedDocument[]>([]);

  useEffect(() => {
    fetchRelations();
  }, [documentId]);

  const fetchRelations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/documents/${documentId}/relations`);
      const data = await response.json();

      if (response.ok) {
        setParents(data.parents || []);
        setChildren(data.children || []);
      }
    } catch (error) {
      console.error('Error fetching relations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRelationIcon = (type: string) => {
    switch (type) {
      case 'REFERENCE':
        return <LinkIcon className="h-4 w-4" />;
      case 'SUPERSEDES':
        return <ArrowRight className="h-4 w-4" />;
      case 'ATTACHMENT':
        return <Paperclip className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getRelationBadgeVariant = (type: string) => {
    switch (type) {
      case 'SUPERSEDES':
        return 'destructive';
      case 'REFERENCE':
        return 'default';
      case 'ATTACHMENT':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Related Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (parents.length === 0 && children.length === 0) {
    return null; // Don't show if no relations
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Related Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Parent documents (this doc references) */}
        {parents.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">References</h4>
            <div className="space-y-2">
              {parents.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors"
                >
                  {getRelationIcon(doc.relationType)}
                  <span className="flex-1 text-sm truncate">{doc.title}</span>
                  <Badge variant={getRelationBadgeVariant(doc.relationType) as any}>
                    {doc.relationType}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Child documents (referenced by this doc) */}
        {children.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Referenced By</h4>
            <div className="space-y-2">
              {children.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors"
                >
                  {getRelationIcon(doc.relationType)}
                  <span className="flex-1 text-sm truncate">{doc.title}</span>
                  <Badge variant={getRelationBadgeVariant(doc.relationType) as any}>
                    {doc.relationType}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
