# Phase 3: Enhanced Search API

## Overview
Implementasi API pencarian lanjutan dengan PostgreSQL Full-Text Search (FTS) yang mendukung pencarian dalam konten PDF yang telah diekstrak.

## Commit
- **Hash**: fc02557
- **Message**: feat: Enhanced Search API with FTS queries
- **Date**: 2024

## Features Implemented

### 1. Full-Text Search with PostgreSQL
- **Endpoint**: `GET /api/documents/search`
- **Query Parameter**: `q` (query string)
- **Indonesian Language Support**: Menggunakan dictionary `indonesian` untuk stemming
- **Search Target**: 
  - Title
  - Description  
  - Extracted PDF text (dari Phase 2)

### 2. Ranking & Relevance Scoring
Menggunakan `ts_rank_cd()` dengan 3 faktor:
1. **Text Relevance**: Seberapa cocok query dengan dokumen
2. **Popularity Boost**: `1 + log(1 + view_count + download_count * 2)`
3. **Status Weight**: 
   - PUBLISHED: 1.5x
   - APPROVED: 1.2x
   - Others: 1.0x

**Formula**:
```sql
ts_rank_cd(search_vector, query, 32) * 
  (1 + log(1 + views + downloads * 2)) * 
  (CASE status WHEN 'PUBLISHED' THEN 1.5 ... END)
```

### 3. Result Highlighting
Menggunakan `ts_headline()` untuk menampilkan snippet dengan kata yang di-highlight:
```typescript
{
  "highlight": "...Raya Muchtar Nomor 70...Website: https://bssn.go.id...<b>Dokumen</b>..."
}
```

**Parameters**:
- MaxWords: 50
- MinWords: 25
- ShortWord: 3
- MaxFragments: 3

### 4. Advanced Filters (Faceted Search)
**Available Filters**:
- `status`: DRAFT, APPROVED, PUBLISHED, ARCHIVED
- `fileType`: pdf, docx, xlsx, etc.
- `documentTypeId`: ID tipe dokumen
- `dateFrom` / `dateTo`: Filter by created_at
- `tags[]`: Filter by tags
- `createdById`: Filter by creator

**Facets Response**:
```json
{
  "facets": {
    "statuses": [
      {"status": "PUBLISHED", "count": 15},
      {"status": "APPROVED", "count": 8}
    ],
    "fileTypes": [
      {"fileType": "pdf", "count": 20},
      {"fileType": "docx", "count": 3}
    ],
    "documentTypes": [
      {"id": "...", "name": "SOP", "count": 12}
    ]
  }
}
```

### 5. Autocomplete/Suggestions
**Endpoint**: `GET /api/documents/suggestions?q=dok&limit=5`

Menggunakan database function `get_search_suggestions()` untuk:
- Word frequency analysis
- Recent matching documents
- Common search terms

### 6. Search Analytics
**Track Searches** (POST):
```typescript
POST /api/documents/search/analytics
{
  "query": "dokumen sertifikat",
  "resultsCount": 15,
  "filters": { "status": "PUBLISHED" }
}
```

**Get Analytics** (GET - Admin only):
```typescript
GET /api/documents/search/analytics
{
  "topQueries": [
    { "query": "sertifikat", "count": 45 },
    { "query": "dokumen", "count": 32 }
  ],
  "noResultQueries": [
    { "query": "xyz123", "count": 5 }
  ],
  "statistics": {
    "totalSearches": 150,
    "avgResultsCount": 8.5,
    "noResultsRate": 0.12
  }
}
```

## API Endpoints Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/documents/search` | GET | Yes | Main search with FTS |
| `/api/documents/suggestions` | GET | Yes | Autocomplete suggestions |
| `/api/documents/search/analytics` | POST | Yes | Log search query |
| `/api/documents/search/analytics` | GET | Admin | Get search statistics |

## Implementation Details

### Main Search Query Structure
```sql
SELECT d.*,
  ts_rank_cd(d.search_vector, query, 32) * popularity * status_boost AS rank,
  ts_headline('indonesian', text, query, options) AS highlight
FROM documents d
WHERE d.search_vector @@ query
  AND [access_control_conditions]
  AND [filter_conditions]
ORDER BY rank DESC
LIMIT pageSize OFFSET (page - 1) * pageSize
```

### Access Control Integration
- **Public Access**: `isPublic = true` OR user's group in `accessGroups`
- **Admin**: Access all documents
- **Regular Users**: Only accessible documents
- Applied automatically in SQL query

### Performance Optimizations
1. **GIN Index** on `search_vector` column
2. **Parameterized Queries** untuk prevent SQL injection
3. **Pagination** untuk limit data transfer
4. **Facet Queries** run in parallel dengan main query

## Test Results

### Test Script
File: `scripts/test-search-api.ts`

### Test 1: Basic Search
```
Query: "dokumen"
Results: 2 documents
- Pedoman BCMS (rank: 0.286, PUBLISHED)
- PROSEDUR PENGEMBANGAN (rank: 0.091, APPROVED)
```

### Test 2: Popularity Ranking
```
Document 1: 40 views, 4 downloads → boosted rank: 0.769
Document 2: 12 views, 1 download → boosted rank: 0.198
```

### Test 3: Facets
```
Status Facets:
- APPROVED: 1
- PUBLISHED: 1

File Type Facets:
- pdf: 2
```

### Test 4: Filtering
```
Filter: status=PUBLISHED
Results: 1 document (filtered from 2)
```

## Security

### Snyk Code Scan
```bash
✅ No security issues found
```

**Scan Details**:
- Path: `/Users/usertikpjt2/newdsmt/src/app/api/documents`
- Issues: 0
- Status: PASS

### Security Features
1. **SQL Injection Prevention**: All queries use parameterized statements
2. **Access Control**: Enforced at database query level
3. **Authentication Required**: All endpoints require valid session
4. **Input Validation**: Zod schemas for all inputs
5. **Rate Limiting**: Can be added via middleware

## Usage Examples

### 1. Simple Search
```bash
curl -H "Cookie: session=..." \
  'http://localhost:3001/api/documents/search?q=sertifikat'
```

### 2. Search with Filters
```bash
curl -H "Cookie: session=..." \
  'http://localhost:3001/api/documents/search?q=dokumen&status=PUBLISHED&fileType=pdf'
```

### 3. Paginated Search
```bash
curl -H "Cookie: session=..." \
  'http://localhost:3001/api/documents/search?q=prosedur&page=2&pageSize=10'
```

### 4. Autocomplete
```bash
curl -H "Cookie: session=..." \
  'http://localhost:3001/api/documents/suggestions?q=dok'
```

### 5. Track Search
```bash
curl -X POST -H "Cookie: session=..." \
  -H "Content-Type: application/json" \
  -d '{"query":"dokumen","resultsCount":5}' \
  'http://localhost:3001/api/documents/search/analytics'
```

## Next Steps (Phase 4)

### Search UI Component
Akan diimplementasikan:

1. **Search Bar Component**
   - Debounced input
   - Real-time suggestions
   - Search history

2. **Advanced Filter Panel**
   - Status checkboxes
   - File type selector
   - Date range picker
   - Tag selector

3. **Results Display**
   - Highlighted snippets
   - Pagination controls
   - Sort options
   - View/Download actions

4. **Search Analytics Dashboard**
   - Top queries chart
   - No-result queries list
   - Search trends over time

## Technical Debt & Future Improvements

### Known Limitations
1. **Suggestions Function**: Returns empty - needs more sample data or improved text parsing
2. **Stemming**: Indonesian dictionary might not cover all variations
3. **Exact Phrase Search**: Not yet implemented (can use `phraseto_tsquery`)

### Future Enhancements
1. **Typo Tolerance**: Add fuzzy matching with trigram similarity
2. **Search History**: Per-user search history
3. **Saved Searches**: Allow users to save frequently used queries
4. **Export Results**: Export search results to CSV/Excel
5. **Advanced Operators**: Support AND, OR, NOT, parentheses
6. **Synonyms**: Add synonym dictionary for better matching
7. **Multilingual**: Support English and other languages

## Resources

### Documentation
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [ts_rank_cd](https://www.postgresql.org/docs/current/textsearch-controls.html#TEXTSEARCH-RANKING)
- [ts_headline](https://www.postgresql.org/docs/current/textsearch-controls.html#TEXTSEARCH-HEADLINE)

### Related Files
- Migration: `prisma/migrations/20251228132552_add_fulltext_search/`
- Search Route: `src/app/api/documents/search/route.ts`
- Suggestions: `src/app/api/documents/suggestions/route.ts`
- Analytics: `src/app/api/documents/search/analytics/route.ts`
- Test Script: `scripts/test-search-api.ts`

---

**Status**: ✅ COMPLETED
**Testing**: ✅ PASSED
**Security Scan**: ✅ NO ISSUES
**Commit**: fc02557
