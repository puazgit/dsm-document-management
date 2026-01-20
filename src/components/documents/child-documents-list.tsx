'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { FileText, ChevronRight } from 'lucide-react';

interface ChildDocument {
  id: string;
  title: string;
  status: string;
  sortOrder: number;
  documentType?: {
    name: string;
  };
}

interface ChildDocumentsListProps {
  documentId: string;
  className?: string;
}

export function ChildDocumentsList({ documentId, className }: ChildDocumentsListProps) {
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<ChildDocument[]>([]);

  useEffect(() => {
    fetchChildren();
  }, [documentId]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/documents/${documentId}/hierarchy?maxDepth=1`);
      const data = await response.json();

      if (response.ok && data.document.childDocuments) {
        setChildren(data.document.childDocuments);
      }
    } catch (error) {
      console.error('Error fetching child documents:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Child Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (children.length === 0) {
    return null; // Don't show if no children
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Child Documents ({children.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {children.map((child, index) => (
            <Link
              key={child.id}
              href={`/documents/${child.id}`}
              className="flex items-center gap-3 p-3 rounded-md hover:bg-muted transition-colors border"
            >
              <span className="text-sm font-medium text-muted-foreground">
                {index + 1}.
              </span>
              <div className="flex-1">
                <p className="font-medium text-sm">{child.title}</p>
                {child.documentType && (
                  <p className="text-xs text-muted-foreground">
                    {child.documentType.name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-secondary">
                  {child.status}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
