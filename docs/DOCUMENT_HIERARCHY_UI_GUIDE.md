# Document Hierarchy - UI Components Guide

## Overview
This guide explains how to use the document hierarchy UI components that have been implemented.

## Available Components

### 1. DocumentTree
Displays documents in a collapsible tree structure.

```tsx
import { DocumentTree } from '@/components/documents/document-tree';

<DocumentTree
  documents={rootDocuments}
  onSelect={(doc) => console.log('Selected:', doc)}
  selectedId={currentDocId}
/>
```

**Features:**
- Expandable/collapsible nodes
- Folder icons for parents, file icons for leaves
- Click to select, link to view
- Shows document status and child count
- Indented hierarchy visualization

### 2. DocumentBreadcrumb
Shows the path from root to current document.

```tsx
import { DocumentBreadcrumb } from '@/components/documents/document-breadcrumb';

<DocumentBreadcrumb
  breadcrumb={[
    { id: '1', title: 'Prosedur A', level: 0 },
    { id: '2', title: 'Prosedur B', level: 1 },
    { id: '3', title: 'Current Doc', level: 2 }
  ]}
/>
```

**Features:**
- Home icon linking to documents list
- Clickable parent links
- Current document as plain text
- Truncated long titles with tooltips

### 3. MoveDocumentDialog
Dialog for moving documents to a new parent.

```tsx
import { MoveDocumentDialog } from '@/components/documents/move-document-dialog';

const [isOpen, setIsOpen] = useState(false);

<MoveDocumentDialog
  document={currentDocument}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSuccess={() => {
    // Refresh data
    fetchDocument();
  }}
/>
```

**Features:**
- Tree view for parent selection
- Root level option
- Excludes current document and descendants
- Circular reference prevention
- Loading states and error handling

### 4. RelatedDocuments
Widget showing document relationships.

```tsx
import { RelatedDocuments } from '@/components/documents/related-documents';

<RelatedDocuments documentId={docId} />
```

**Features:**
- Shows parent relations (references)
- Shows child relations (referenced by)
- Relation type badges
- Icons per relation type
- Only displays if relations exist

### 5. ChildDocumentsList
Card displaying direct children of a document.

```tsx
import { ChildDocumentsList } from '@/components/documents/child-documents-list';

<ChildDocumentsList documentId={docId} />
```

**Features:**
- Numbered list of children
- Document type and status display
- Click to navigate
- Shows count in header
- Only displays if children exist

### 6. TreeViewToggle
Toggle between list and tree view modes.

```tsx
import { TreeViewToggle } from '@/components/documents/tree-view-toggle';

const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');

<TreeViewToggle
  value={viewMode}
  onChange={setViewMode}
/>
```

**Features:**
- List and Tree icons
- Tab-style toggle
- Accessible keyboard navigation

### 7. ParentDocumentSelector
Dropdown selector for choosing parent document.

```tsx
import { ParentDocumentSelector } from '@/components/documents/parent-document-selector';

const [parentId, setParentId] = useState<string | null>(null);

<ParentDocumentSelector
  value={parentId}
  onChange={setParentId}
  currentDocumentId={editingDocId} // Optional, for edit mode
/>
```

**Features:**
- Fetches all documents with hierarchy
- Indented display showing hierarchy levels
- "No Parent" option for root level
- Excludes current document when editing
- Loading skeleton

## Integration Examples

### Example 1: Document List Page with Tree View

```tsx
'use client';

import { useState } from 'react';
import { TreeViewToggle } from '@/components/documents/tree-view-toggle';
import { DocumentTree } from '@/components/documents/document-tree';
import { DocumentsList } from '@/components/documents/documents-list';

export default function DocumentsPage() {
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
  const [documents, setDocuments] = useState([]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1>Documents</h1>
        <TreeViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {viewMode === 'tree' ? (
        <DocumentTree documents={documents} />
      ) : (
        <DocumentsList documents={documents} />
      )}
    </div>
  );
}
```

### Example 2: Document Detail Page with Hierarchy

```tsx
'use client';

import { DocumentBreadcrumb } from '@/components/documents/document-breadcrumb';
import { ChildDocumentsList } from '@/components/documents/child-documents-list';
import { RelatedDocuments } from '@/components/documents/related-documents';

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
  const [document, setDocument] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);

  useEffect(() => {
    // Fetch document with breadcrumb
    fetch(`/api/documents/${params.id}/hierarchy?withParents=true`)
      .then(res => res.json())
      .then(data => {
        setDocument(data.document);
        setBreadcrumb(data.breadcrumb);
      });
  }, [params.id]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb navigation */}
      <DocumentBreadcrumb breadcrumb={breadcrumb} />

      {/* Document content */}
      <div>
        <h1>{document?.title}</h1>
        {/* ... document details ... */}
      </div>

      {/* Hierarchy widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChildDocumentsList documentId={params.id} />
        <RelatedDocuments documentId={params.id} />
      </div>
    </div>
  );
}
```

### Example 3: Document Upload Form with Parent Selection

```tsx
'use client';

import { ParentDocumentSelector } from '@/components/documents/parent-document-selector';

export default function DocumentUploadForm() {
  const [parentId, setParentId] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData();
    // ... other fields ...
    if (parentId) {
      formData.append('parentDocumentId', parentId);
    }

    await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... other fields ... */}
      
      <ParentDocumentSelector
        value={parentId}
        onChange={setParentId}
      />

      <Button type="submit">Upload</Button>
    </form>
  );
}
```

## Styling

All components use:
- **shadcn/ui** components (Button, Dialog, Card, etc.)
- **Tailwind CSS** utility classes
- **Lucide React** icons
- Consistent spacing and color tokens

## Accessibility

All components include:
- Proper ARIA labels
- Keyboard navigation support
- Focus management
- Screen reader friendly

## Performance Considerations

1. **Tree View**: Large trees (>100 documents) should implement virtualization
2. **API Calls**: Components cache results and debounce requests
3. **Loading States**: All components show skeletons during data fetch
4. **Lazy Loading**: Children loaded on-demand when expanding nodes

## Next Steps

1. Add drag-and-drop reordering for tree nodes
2. Implement bulk move operations
3. Add hierarchy depth visualization (level indicators)
4. Create hierarchy statistics dashboard
5. Add export tree as PDF/image feature
