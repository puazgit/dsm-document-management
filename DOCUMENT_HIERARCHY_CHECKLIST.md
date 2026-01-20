# Document Hierarchy - Integration Checklist

## Phase 3: UI Components ✅ COMPLETE

- [x] Create DocumentTree component
- [x] Create DocumentBreadcrumb component  
- [x] Create MoveDocumentDialog component
- [x] Create RelatedDocuments widget
- [x] Create ChildDocumentsList component
- [x] Create TreeViewToggle component
- [x] Create ParentDocumentSelector component
- [x] Create UI components documentation

## Phase 4: Integration with Existing Pages

### 4.1 Document Upload Page
**File:** `/src/app/(protected)/documents/upload/page.tsx`

- [ ] Import ParentDocumentSelector
- [ ] Add parent document selection field to form
- [ ] Update form submission to include parentDocumentId
- [ ] Update API handler to accept parentDocumentId
- [ ] Test upload with and without parent

### 4.2 Document Detail Page
**File:** `/src/app/(protected)/documents/[id]/page.tsx`

- [ ] Import DocumentBreadcrumb component
- [ ] Import ChildDocumentsList component
- [ ] Import RelatedDocuments component
- [ ] Fetch hierarchy data with API call
- [ ] Display breadcrumb at top of page
- [ ] Add ChildDocumentsList in sidebar or bottom section
- [ ] Add RelatedDocuments widget
- [ ] Add "Move Document" button with MoveDocumentDialog

### 4.3 Documents List Page
**File:** `/src/app/(protected)/documents/page.tsx`

- [ ] Import TreeViewToggle component
- [ ] Import DocumentTree component
- [ ] Add view mode state (list/tree)
- [ ] Add toggle button in page header
- [ ] Fetch tree data when in tree mode
- [ ] Conditionally render list or tree view
- [ ] Update filters to work with both views

### 4.4 Document Edit Page (if exists)
**File:** `/src/app/(protected)/documents/[id]/edit/page.tsx`

- [ ] Import ParentDocumentSelector
- [ ] Pre-populate parent selection with current parent
- [ ] Update form submission to handle parent changes
- [ ] Add validation for circular references

### 4.5 Document Upload API
**File:** `/src/app/api/documents/upload/route.ts`

- [ ] Accept parentDocumentId in request body/FormData
- [ ] Validate parent document exists
- [ ] Calculate hierarchyLevel and hierarchyPath
- [ ] Update sortOrder for new child
- [ ] Log parent assignment in DocumentActivity

### 4.6 Search/Filter Integration

- [ ] Add hierarchy filters (root only, with children, etc.)
- [ ] Update search to optionally include/exclude children
- [ ] Add "Show in Hierarchy" link from search results
- [ ] Add hierarchy breadcrumb in search result cards

## Phase 5: Testing

### 5.1 Unit Tests

- [ ] Test helper functions (document-hierarchy.ts)
- [ ] Test circular reference detection
- [ ] Test hierarchyPath calculation
- [ ] Test moveDocument function

### 5.2 API Tests

- [ ] Test GET /api/documents/[id]/hierarchy
- [ ] Test POST /api/documents/[id]/move
- [ ] Test POST /api/documents/relations
- [ ] Test GET /api/documents/tree
- [ ] Test POST /api/documents/reorder
- [ ] Test error cases and validation

### 5.3 UI Component Tests

- [ ] Test DocumentTree expand/collapse
- [ ] Test MoveDocumentDialog parent selection
- [ ] Test ParentDocumentSelector filtering
- [ ] Test TreeViewToggle mode switching

### 5.4 Integration Tests

- [ ] Test upload with parent assignment
- [ ] Test move document to new parent
- [ ] Test delete parent (orphan children)
- [ ] Test permissions with hierarchy
- [ ] Test search with hierarchy filters

### 5.5 Performance Tests

- [ ] Test tree view with 100+ documents
- [ ] Test deep hierarchies (10+ levels)
- [ ] Test concurrent move operations
- [ ] Measure API response times

## Phase 6: Database Indexes (if needed)

Based on query performance:

- [ ] Add index on parentDocumentId if slow
- [ ] Add index on hierarchyPath for ancestry queries
- [ ] Add composite index on (parentDocumentId, sortOrder)
- [ ] Analyze query execution plans

## Phase 7: Documentation

- [ ] Update main README.md with hierarchy feature
- [ ] Add hierarchy section to user manual
- [ ] Create video tutorial (optional)
- [ ] Update API documentation
- [ ] Document migration strategy for existing documents

## Phase 8: Deployment

- [ ] Review all code changes
- [ ] Run all tests
- [ ] Create database backup
- [ ] Run Prisma migrations in production
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Announce feature to users

## Current Status

**Completed:**
- ✅ Database schema (Phase 1)
- ✅ Helper functions library (Phase 1)
- ✅ API endpoints (Phase 2)
- ✅ UI components (Phase 3)

**Next Up:**
- ⏳ Document Upload page integration (Phase 4.1)
- ⏳ Document Detail page integration (Phase 4.2)

**Estimated Completion:** ~2-3 days for Phase 4-5
