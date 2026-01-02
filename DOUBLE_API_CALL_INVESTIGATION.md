# 🔍 Investigasi: API Dipanggil 2 Kali

**Date**: December 30, 2025  
**Issue**: User melihat `/api/documents/[id]/view` dipanggil 2 kali di browser console  
**Status**: ⚠️ **REQUIRES SERVER RESTART**

---

## 🎯 Root Cause Analysis

### 1. Mengapa API Dipanggil 2 Kali?

**Answer**: Ini **NORMAL** di React Development Mode!

**Penjelasan**:
- React 18 (Next.js 13+) menjalankan **useEffect 2x di development mode**
- Tujuannya untuk mendeteksi bugs dan side effects
- Di **production mode**, hanya akan dipanggil **1x**

**Proof dari code**:
```typescript
// enhanced-pdf-viewer.tsx line 109
useEffect(() => {
  // Ini akan run 2x di development
  const initEmbedPDF = async () => {
    const response = await fetch(fileUrl, {
      credentials: 'include',
    });
    // ...
  };
  initEmbedPDF();
}, [fileUrl, permissionsLoaded, document?.id]);
```

---

### 2. Apakah Proteksi Backend Berfungsi?

**Status**: ⚠️ **PERLU VERIFIKASI SETELAH RESTART**

**Database Check Results**:
```
VIEW logs in last 10 minutes for doc cmjglzp470007139owc5c5tu2:

1. 22:50:39 - metadata: null ← OLD CODE
2. 22:49:04 - metadata: null ← OLD CODE (95s gap)
3. 22:48:41 - metadata: null ← OLD CODE (23s gap)
4. 22:48:35 - metadata: null ← OLD CODE (6s gap)
5. 22:48:19 - metadata: null ← OLD CODE (16s gap)
6. 22:48:00 - metadata: null ← OLD CODE (19s gap)
```

**⚠️ CRITICAL FINDING**:
- Semua logs punya **metadata: null**
- Kode baru kita **harus** include metadata: `{source: 'document_viewer_get'}`
- Ini berarti logs tersebut **dari kode LAMA** (sebelum fix di-deploy)

**Expected dari kode baru**:
```json
{
  "metadata": {
    "source": "document_viewer_get",
    "timestamp": "2025-12-30T..."
  }
}
```

---

## 🔧 Action Required

### Step 1: Restart Development Server

**IMPORTANT**: Development server masih running kode lama!

```bash
# Stop current server (Ctrl+C di terminal)
# Then restart
npm run dev
```

### Step 2: Clear Next.js Cache

```bash
rm -rf .next
npm run dev
```

### Step 3: Hard Reload Browser

```
1. Buka Chrome DevTools (F12)
2. Right-click pada refresh button
3. Pilih "Empty Cache and Hard Reload"
```

### Step 4: Test Again

```bash
# 1. Open document
http://localhost:3000/documents/cmjglzp470007139owc5c5tu2/view

# 2. Check browser console
# Should see:
✅ [GET /view] Logging new view activity

# 3. Refresh page (F5)
# Should see:
⏭️ [GET /view] Skipping duplicate view log - already viewed recently

# 4. Check database
npx tsx scripts/check-specific-doc-views.ts
```

### Step 5: Verify Logs Have Metadata

**Expected result**:
```
1. ID: xxx
   Time: ...
   Metadata: {
     "source": "document_viewer_get",   ← NEW CODE!
     "timestamp": "2025-12-30T..."
   }
```

If still seeing `metadata: null`, proteksi tidak aktif.

---

## 🎯 Expected Behavior (After Restart)

| Action | API Calls in Console | Database Logs | Status |
|--------|---------------------|---------------|--------|
| First view | 2x (React dev mode) | 1 log created | ✅ OK |
| Refresh (< 5 min) | 2x (React dev mode) | 0 new logs | ✅ OK |
| Refresh (> 5 min) | 2x (React dev mode) | 1 new log | ✅ OK |

**Key Point**: 
- ✅ API dipanggil 2x di development = **NORMAL**
- ✅ Database hanya log 1x = **PROTEKSI BERFUNGSI**
- ❌ Database log 2x = **PROTEKSI GAGAL**

---

## 🐛 If Still Failing After Restart

### Debug Checklist:

1. **Check console logs**:
```
Look for:
✅ [GET /view] Logging new view activity    ← First call
⏭️ [GET /view] Skipping duplicate...       ← Should appear
```

2. **Check database query**:
```typescript
// The protection query
const recentView = await prisma.documentActivity.findFirst({
  where: {
    documentId: id,
    userId: session.user.id,
    action: 'VIEW',
    createdAt: {
      gte: new Date(Date.now() - 5 * 60 * 1000)
    }
  }
});
```

3. **Verify code changes applied**:
```bash
# Check if GET endpoint has the protection
grep -A 20 "Check if user already viewed" src/app/api/documents/[id]/view/route.ts
```

---

## 📊 Summary

### Question: **Mengapa API dipanggil 2 kali?**
**Answer**: ✅ **NORMAL** - React Development Mode behavior

### Question: **Apakah proteksi berfungsi?**
**Answer**: ⚠️ **BELUM TERBUKTI** - perlu restart server & test ulang

### Next Steps:
1. ✅ Restart development server
2. ✅ Clear cache (.next folder)
3. ✅ Hard reload browser
4. ✅ Test document view
5. ✅ Verify logs have metadata
6. ✅ Check only 1 log created despite 2 API calls

---

**Last Updated**: December 30, 2025, 22:55 WIB  
**Status**: Waiting for server restart and retest
