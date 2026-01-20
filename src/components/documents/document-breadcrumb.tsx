'use client';

import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

interface BreadcrumbItem {
  id: string;
  title: string;
  level: number;
}

interface DocumentBreadcrumbProps {
  breadcrumb: BreadcrumbItem[];
  className?: string;
}

export function DocumentBreadcrumb({ breadcrumb, className }: DocumentBreadcrumbProps) {
  if (!breadcrumb || breadcrumb.length === 0) {
    return null;
  }

  return (
    <nav className={className} aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 text-sm text-muted-foreground">
        {/* Home link */}
        <li>
          <Link
            href="/documents"
            className="flex items-center hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
          </Link>
        </li>

        {breadcrumb.map((item, index) => (
          <li key={item.id} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            {index === breadcrumb.length - 1 ? (
              // Current page - no link
              <span className="font-medium text-foreground truncate max-w-[200px]">
                {item.title}
              </span>
            ) : (
              // Parent pages - with link
              <Link
                href={`/documents/${item.id}`}
                className="hover:text-foreground transition-colors truncate max-w-[200px]"
                title={item.title}
              >
                {item.title}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
