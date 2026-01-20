'use client';

import { useState } from 'react';
import { ChevronRight, FileText, Folder, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  title: string;
  status: string;
  hierarchyLevel: number;
  sortOrder: number;
  documentType?: {
    name: string;
    icon?: string;
  };
  childDocuments?: Document[];
}

interface DocumentTreeProps {
  documents: Document[];
  onSelect?: (doc: Document) => void;
  selectedId?: string;
  className?: string;
}

export function DocumentTree({ 
  documents, 
  onSelect, 
  selectedId,
  className 
}: DocumentTreeProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {documents.map((doc) => (
        <TreeNode
          key={doc.id}
          document={doc}
          onSelect={onSelect}
          selectedId={selectedId}
          level={0}
        />
      ))}
    </div>
  );
}

interface TreeNodeProps {
  document: Document;
  level: number;
  onSelect?: (doc: Document) => void;
  selectedId?: string;
}

function TreeNode({ document, level, onSelect, selectedId }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const hasChildren = document.childDocuments && document.childDocuments.length > 0;
  const isSelected = selectedId === document.id;

  const paddingLeft = level * 20;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleClick = () => {
    if (onSelect) {
      onSelect(document);
    }
  };

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
          'hover:bg-muted',
          isSelected && 'bg-primary/10 text-primary'
        )}
        style={{ paddingLeft: `${paddingLeft + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/Collapse button */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="p-0.5 hover:bg-accent rounded-sm"
          >
            <ChevronRight
              className={cn(
                'h-4 w-4 transition-transform',
                isExpanded && 'rotate-90'
              )}
            />
          </button>
        ) : (
          <div className="w-5" /> // Spacer for alignment
        )}

        {/* Folder/File icon */}
        {hasChildren ? (
          isExpanded ? (
            <FolderOpen className="h-4 w-4 text-yellow-600" />
          ) : (
            <Folder className="h-4 w-4 text-yellow-600" />
          )
        ) : (
          <FileText className="h-4 w-4 text-blue-600" />
        )}

        {/* Document title */}
        <Link
          href={`/documents/${document.id}`}
          className="flex-1 text-sm hover:underline truncate"
          onClick={(e) => e.stopPropagation()}
        >
          {document.title}
        </Link>

        {/* Status badge */}
        <Badge variant="outline" className="text-xs">
          {document.status}
        </Badge>

        {/* Children count */}
        {hasChildren && (
          <span className="text-xs text-muted-foreground">
            ({document.childDocuments!.length})
          </span>
        )}
      </div>

      {/* Render children */}
      {hasChildren && isExpanded && (
        <div className="mt-0.5">
          {document.childDocuments!.map((child) => (
            <TreeNode
              key={child.id}
              document={child}
              level={level + 1}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
