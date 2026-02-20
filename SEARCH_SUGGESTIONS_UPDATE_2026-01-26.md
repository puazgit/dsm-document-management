# Search Suggestions Function Update

## Date: 2026-01-26

## Problem
Search suggestions tidak menampilkan kata yang mengandung special characters seperti "(BJPSDA)". 

Contoh: 
- Document title: "Prosedur... (BJPSDA) Ke Kem..."
- Query: "bjp"
- Result: Tidak ada suggestion

**Root Cause**: Fungsi `get_search_suggestions()` menggunakan `string_to_array(title, ' ')` yang hanya memisahkan berdasarkan spasi tanpa menghapus special characters. Sehingga kata "(bjpsda)" dimulai dengan "(" bukan "b", dan tidak cocok dengan pattern `LIKE 'bjp%'`.

## Solution Implemented

Updated `get_search_suggestions()` function to strip special characters using `regexp_replace()`:

```sql
-- Before: string_to_array(lower(title), ' ')
-- After: regexp_replace(lower(unnest(string_to_array(title, ' '))), '[^a-z0-9]', '', 'g')
```

### Changes Made

1. **Function Update** ([update-search-suggestions-strip-special-chars.sql](update-search-suggestions-strip-special-chars.sql))
   - Added `regexp_replace()` to strip all non-alphanumeric characters
   - Pattern: `[^a-z0-9]` with global flag `'g'`
   - Added filter `word != ''` to exclude empty strings after stripping
   - Updated function comment to reflect the change

2. **Database Changes**
   - Function recreated successfully
   - BJPSDA document updated to `PUBLISHED` status

## Test Results

### Before Update
```sql
SELECT * FROM get_search_suggestions('bjp', 10);
-- Result: 0 rows (empty)
```

### After Update
```sql
SELECT * FROM get_search_suggestions('bjp', 10);
-- Result:
--  suggestion | frequency 
-- ------------+-----------
--  bjpsda     |         1
```

### Other Queries Still Work
```sql
SELECT * FROM get_search_suggestions('lis', 10);
-- Result:
--  suggestion | frequency 
-- ------------+-----------
--  listrik    |         7
```

## Impact

### Positive
✅ Words with special characters now appear in suggestions
✅ Better autocomplete coverage for documents with special chars
✅ Improves user search experience
✅ No breaking changes to API interface

### Considerations
⚠️ Special characters are stripped, so "(BJPSDA)" and "BJPSDA" are treated the same
⚠️ Function now does more string processing (regexp_replace on each word)
⚠️ Performance should still be fine due to filtering on PUBLISHED/APPROVED status first

## Files Modified
- `update-search-suggestions-strip-special-chars.sql` - New SQL script with function update

## Database Function Location
- **Original Definition**: `prisma/migrations/20251228132552_add_fulltext_search/migration.sql`
- **Current State**: Updated in live database via SQL script

## Next Steps
- ✅ Test in web application at http://localhost:3000/search
- ✅ Verify autocomplete shows "bjpsda" when typing "bjp"
- ⏳ Monitor performance if large volume of suggestions
- ⏳ Consider adding migration file for future deployments

## Verification Commands

```bash
# Test suggestions for "bjp"
docker exec -it dsm_postgres psql -U postgres -d dsm_db -c "SELECT * FROM get_search_suggestions('bjp', 10);"

# Test suggestions for "listrik"
docker exec -it dsm_postgres psql -U postgres -d dsm_db -c "SELECT * FROM get_search_suggestions('lis', 10);"

# Check BJPSDA document status
docker exec -it dsm_postgres psql -U postgres -d dsm_db -c "SELECT id, title, status FROM documents WHERE LOWER(title) LIKE '%bjpsda%';"
```
