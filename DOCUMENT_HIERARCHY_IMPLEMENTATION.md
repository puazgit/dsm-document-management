# Document Hierarchy Implementation Guide

## 📋 Overview

Sistem hierarki dokumen untuk DSM Document Management System yang memungkinkan dokumen memiliki struktur parent-child seperti:

```
Prosedur B (Parent)
├── Prosedur A (Child)
├── Prosedur C (Child)
│   ├── Prosedur C.1 (Grandchild)
│   └── Prosedur C.2 (Grandchild)
└── Prosedur D (Child)
```

## 🏗️ Architecture

### Database Schema

#### 1. Document Model (Updated)

```prisma
model Document {
  // ... existing fields ...
  
  // NEW: Hierarchy fields
  parentDocumentId String?  // ID of parent document
  hierarchyLevel   Int      // 0 = root, 1 = child, 2 = grandchild, etc.
  hierarchyPath    String?  // Path: /parent/child/grandchild
  sortOrder        Int      // Order within siblings
  
  // Relations
  parentDocument   Document?   @relation("DocumentHierarchy")
  childDocuments   Document[]  @relation("DocumentHierarchy")
}
```

#### 2. DocumentRelation Model (New)

For advanced relationships beyond simple parent-child:

```prisma
model DocumentRelation {
  id           String
  parentId     String
  childId      String
  relationType DocumentRelationType
  
  enum DocumentRelationType {
    PARENT_CHILD   // Standard hierarchy
    REFERENCE      // "See also..."
    SUPERSEDES     // Replaces older document
    RELATED        // General relationship
    ATTACHMENT     // Attachment to document
  }
}
```

## 🔧 Implementation Steps

### Step 1: Run Migration

```bash
# Apply the migration
npx prisma migrate dev --name add_document_hierarchy

# Generate Prisma client
npx prisma generate
```

### Step 2: API Endpoints

Create API routes for hierarchy management:

#### GET /api/documents/[id]/hierarchy

Get document with full hierarchy tree:

```typescript
// Example response
{
  "document": {
    "id": "doc-1",
    "title": "Prosedur B",
    "hierarchyLevel": 0,
    "childDocuments": [
      {
        "id": "doc-2",
        "title": "Prosedur A",
        "hierarchyLevel": 1
      },
      {
        "id": "doc-3",
        "title": "Prosedur C",
        "hierarchyLevel": 1,
        "childDocuments": [...]
      }
    ]
  },
  "breadcrumb": [
    { "id": "doc-1", "title": "Prosedur B", "level": 0 }
  ]
}
```

#### POST /api/documents/[id]/move

Move document to new parent:

```typescript
POST /api/documents/doc-2/move
{
  "newParentId": "doc-5" // or null for root
}
```

#### POST /api/documents/relations

Create document relationship:

```typescript
POST /api/documents/relations
{
  "parentId": "doc-1",
  "childId": "doc-2",
  "relationType": "REFERENCE" // or SUPERSEDES, RELATED, etc.
}
```

### Step 3: Helper Functions

Use the helper functions from `/src/lib/document-hierarchy.ts`:

```typescript
import {
  getDocumentWithChildren,
  getDocumentWithParents,
  getRootDocuments,
  moveDocument,
  createDocumentRelation,
  getRelatedDocuments,
  getDocumentSiblings,
  reorderDocuments
} from '@/lib/document-hierarchy';

// Get document tree
const tree = await getDocumentWithChildren('doc-id', 3); // max 3 levels

// Get breadcrumb
const { document, breadcrumb } = await getDocumentWithParents('doc-id');

// Move document
await moveDocument('doc-id', 'new-parent-id');

// Create reference
await createDocumentRelation(
  'parent-id',
  'child-id',
  'REFERENCE',
  { note: 'See this for more details' }
);
```

## 🎨 UI Components

### 1. Document Tree Component

```tsx
interface DocumentTreeProps {
  rootDocuments: Document[];
  onSelect: (doc: Document) => void;
  expandedIds: string[];
}

export function DocumentTree({ rootDocuments, onSelect, expandedIds }: DocumentTreeProps) {
  return (
    <div className="document-tree">
      {rootDocuments.map(doc => (
        <TreeNode
          key={doc.id}
          document={doc}
          level={0}
          onSelect={onSelect}
          isExpanded={expandedIds.includes(doc.id)}
        />
      ))}
    </div>
  );
}

function TreeNode({ document, level, onSelect, isExpanded }) {
  return (
    <div style={{ paddingLeft: `${level * 20}px` }}>
      <div className="flex items-center gap-2">
        {document.childDocuments?.length > 0 && (
          <ChevronRight className={isExpanded ? 'rotate-90' : ''} />
        )}
        <FileText />
        <span onClick={() => onSelect(document)}>{document.title}</span>
      </div>
      
      {isExpanded && document.childDocuments?.map(child => (
        <TreeNode
          key={child.id}
          document={child}
          level={level + 1}
          onSelect={onSelect}
          isExpanded={expandedIds.includes(child.id)}
        />
      ))}
    </div>
  );
}
```

### 2. Breadcrumb Component

```tsx
export function DocumentBreadcrumb({ breadcrumb }: { breadcrumb: Breadcrumb[] }) {
  return (
    <nav className="flex items-center gap-2 text-sm">
      {breadcrumb.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="w-4 h-4" />}
          <Link href={`/documents/${item.id}`} className="hover:underline">
            {item.title}
          </Link>
        </div>
      ))}
    </nav>
  );
}
```

### 3. Move Document Dialog

```tsx
export function MoveDocumentDialog({ document, onMove }: MoveDocumentDialogProps) {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  
  const handleMove = async () => {
    await fetch(`/api/documents/${document.id}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newParentId: selectedParentId })
    });
    onMove();
  };
  
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Document</DialogTitle>
        </DialogHeader>
        <div>
          <Label>Select Parent Document</Label>
          <DocumentTreeSelect 
            value={selectedParentId}
            onChange={setSelectedParentId}
            excludeId={document.id} // Can't move to self
          />
        </div>
        <DialogFooter>
          <Button onClick={handleMove}>Move</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. Related Documents Widget

```tsx
export function RelatedDocuments({ documentId }: { documentId: string }) {
  const { data } = useSWR(`/api/documents/${documentId}/relations`);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Related Documents</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Parent documents (this doc references) */}
        {data?.parents.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium mb-2">References</h4>
            {data.parents.map(doc => (
              <div key={doc.id} className="flex items-center gap-2">
                <Badge variant={doc.relationType === 'SUPERSEDES' ? 'destructive' : 'secondary'}>
                  {doc.relationType}
                </Badge>
                <Link href={`/documents/${doc.id}`}>{doc.title}</Link>
              </div>
            ))}
          </div>
        )}
        
        {/* Child documents (referenced by this doc) */}
        {data?.children.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Referenced By</h4>
            {data.children.map(doc => (
              <div key={doc.id} className="flex items-center gap-2">
                <Badge>{doc.relationType}</Badge>
                <Link href={`/documents/${doc.id}`}>{doc.title}</Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

## 📊 Use Cases

### 1. Standard Hierarchy (SOP Structure)

```
Panduan Sistem Manajemen (Root)
├── Prosedur Umum (Level 1)
│   ├── Prosedur Pengelolaan Dokumen (Level 2)
│   └── Prosedur Audit Internal (Level 2)
└── Prosedur Khusus (Level 1)
    ├── Prosedur Keamanan (Level 2)
    └── Prosedur Keuangan (Level 2)
```

### 2. Document References

```
Document A "SUPERSEDES" Document B (Document A replaces old Document B)
Document C "REFERENCE" Document D (See Document D for details)
Document E "RELATED" Document F (Related topic)
```

### 3. Attachments

```
Kontrak Kerja (Main)
└── ATTACHMENT: Lampiran A - Syarat dan Ketentuan
└── ATTACHMENT: Lampiran B - Daftar Harga
```

## 🔍 Queries & Examples

### Get Full Tree

```typescript
const rootDocs = await getRootDocuments({
  documentTypeId: 'prosedur-type-id',
  status: 'PUBLISHED',
  includeChildren: true
});
```

### Get Document Path

```typescript
const { breadcrumb } = await getDocumentWithParents('doc-id');
// Result: [Root, Level1, Level2, CurrentDoc]
```

### Move Document

```typescript
await moveDocument('prosedur-a-id', 'prosedur-b-id');
// Prosedur A is now child of Prosedur B
```

### Create Reference

```typescript
await createDocumentRelation(
  'new-procedure-id',
  'old-procedure-id',
  'SUPERSEDES',
  { reason: 'Updated policy' }
);
```

## ⚠️ Important Notes

1. **Circular References**: System prevents moving document to its own descendant
2. **Hierarchy Depth**: Recommended max depth is 5 levels for UI/UX
3. **Performance**: Use `hierarchyPath` for fast ancestor queries
4. **Permissions**: Child documents inherit parent's base access, but can be more restrictive
5. **Archive**: Archiving parent doesn't auto-archive children (by design)

## 🚀 Migration Strategy

### Phase 1: Database Setup
- [x] Add hierarchy fields to schema
- [x] Create DocumentRelation model
- [ ] Run migrations

### Phase 2: API Development
- [ ] Create /api/documents/[id]/hierarchy endpoint
- [ ] Create /api/documents/[id]/move endpoint
- [ ] Create /api/documents/relations endpoint
- [ ] Add hierarchy queries to existing endpoints

### Phase 3: UI Components
- [ ] Document tree view component
- [ ] Breadcrumb navigation
- [ ] Move document dialog
- [ ] Related documents widget
- [ ] Drag-and-drop reordering

### Phase 4: Data Migration
- [ ] Script to migrate existing documents (if any need hierarchy)
- [ ] Update document upload to support parent selection
- [ ] Backfill hierarchyPath for existing docs

### Phase 5: Testing & Optimization
- [ ] Test circular reference prevention
- [ ] Test deep hierarchies (5+ levels)
- [ ] Performance testing with large trees
- [ ] Index optimization

## 📚 Resources

- Prisma Self-Relations: https://www.prisma.io/docs/concepts/components/prisma-schema/relations/self-relations
- Tree Structures in SQL: https://www.postgresql.org/docs/current/ltree.html
- React Tree Component Libraries:
  - react-arborist
  - react-complex-tree
  - @minoru/react-dnd-treeview

---

**Status**: ✅ Schema Ready | ⏳ API Pending | ⏳ UI Pending
**Last Updated**: January 7, 2026
