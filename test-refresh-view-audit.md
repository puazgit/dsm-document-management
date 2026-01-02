# Test Report: Refresh Page View Audit Log

## Tanggal Test: 30 Desember 2025

## URL yang di-test:
- Document View: `http://localhost:3000/documents/cmjgs318h00032pa3aeq66d7f/view`
- Audit Logs: `http://localhost:3000/admin/audit-logs`

## Analisis Kode:

### 1. **Mekanisme Logging di `/api/documents/[id]/view` (GET method)**

**File:** `src/app/api/documents/[id]/view/route.ts` (Lines 75-97)

```typescript
// Check if this is a refresh request (skip logging)
const url = new URL(request.url);
const skipLog = url.searchParams.get('skipLog') === 'true';

// Only increment view count and log activity on first view (not on refresh)
if (!skipLog) {
  // Increment view count (not download count)
  await prisma.document.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  // Log view activity only for published documents
  if (document.status === 'PUBLISHED') {
    await prisma.documentActivity.create({
      data: {
        documentId: id,
        userId: session.user.id,
        action: 'VIEW',
        description: `Document "${document.title}" was viewed`,
      },
    });
  }
}
```

**Kesimpulan:**
- API endpoint memiliki mekanisme `skipLog` query parameter
- Jika `skipLog=true`, maka **TIDAK ada** logging ke `documentActivity` dan **TIDAK ada** increment `viewCount`
- Logging hanya terjadi untuk dokumen dengan status `PUBLISHED`

---

### 2. **Mekanisme di Enhanced PDF Viewer Component**

**File:** `src/components/documents/enhanced-pdf-viewer.tsx` (Lines 23-24, 128-147)

```typescript
const hasLoggedViewRef = useRef(false); // Track if we've logged the view already

// Di dalam useEffect:
const initEmbedPDF = async () => {
  try {
    setIsLoading(true);
    
    // Determine if we should skip logging (after first view)
    const shouldSkipLog = hasLoggedViewRef.current;
    const fetchUrl = shouldSkipLog ? `${fileUrl}?skipLog=true` : fileUrl;
    
    // Fetch PDF with credentials first (solve auth issue)
    console.log('🔍 [Enhanced] Fetching PDF:', fetchUrl, shouldSkipLog ? '(skip log)' : '(will log)');
    const response = await fetch(fetchUrl, {
      credentials: 'include',
    });
    
    // ... fetch PDF blob ...
    
    // Mark that we've logged the view for this component instance
    if (!shouldSkipLog) {
      hasLoggedViewRef.current = true;
      console.log('✅ [Enhanced] View logged to audit');
    }
```

**Kesimpulan:**
- Component menggunakan `useRef` (`hasLoggedViewRef`) untuk tracking apakah view sudah di-log
- **Pada first load:** `hasLoggedViewRef.current = false` → fetch tanpa `?skipLog=true` → **VIEW akan tercatat**
- **Pada refresh/re-render:** `hasLoggedViewRef.current = true` → fetch dengan `?skipLog=true` → **VIEW TIDAK tercatat**

---

### 3. **Dependency Array useEffect**

```typescript
}, [fileUrl, permissionsLoaded]); // Only re-init when fileUrl or permissions change
```

**Kesimpulan:**
- useEffect hanya re-run jika `fileUrl` atau `permissionsLoaded` berubah
- **Pada browser refresh (F5 atau Ctrl+R):** Component akan unmount dan mount ulang
- Saat component mount ulang, `hasLoggedViewRef.current` akan **reset ke `false`**
- **Ini berarti setiap refresh browser AKAN mencatat VIEW baru!**

---

## ⚠️ TEMUAN PENTING: BUG TERDETEKSI!

### Masalah:
**Mekanisme `hasLoggedViewRef.current` TIDAK BEKERJA untuk browser refresh!**

### Alasan:
1. **useRef di React hanya persist selama component lifecycle**
2. **Ketika browser di-refresh (F5 atau hard reload):**
   - Seluruh aplikasi React restart
   - Component `EnhancedPDFViewer` unmount
   - State dan ref (termasuk `hasLoggedViewRef`) akan **reset ke nilai awal**
3. **Setelah reload:**
   - Component mount ulang dengan `hasLoggedViewRef.current = false`
   - Akan fetch dengan URL **tanpa** `?skipLog=true`
   - **VIEW baru akan tercatat di audit log!**

### Perbedaan antara:
- ✅ **Component re-render/soft navigation:** Ref persist, logging di-skip (BENAR)
- ❌ **Browser refresh/hard reload:** Ref reset, logging terjadi lagi (BUG!)

---

## Cara Verifikasi Bug:

### Test Steps:
1. Login ke aplikasi
2. Buka document view page: `http://localhost:3000/documents/cmjgs318h00032pa3aeq66d7f/view`
3. Buka admin audit logs di tab lain: `http://localhost:3000/admin/audit-logs`
4. Catat jumlah VIEW entries untuk document tersebut
5. **Refresh (F5)** pada document view page
6. Kembali ke audit logs page dan **refresh** untuk melihat data terbaru
7. **Hasil yang diharapkan (bug):** VIEW count bertambah setiap kali refresh

---

## Solusi yang Disarankan:

### Option 1: Gunakan Session Storage (Recommended)
```typescript
const STORAGE_KEY = `pdf_viewed_${document?.id}`;

// Check if already viewed in this session
const hasViewed = sessionStorage.getItem(STORAGE_KEY);
const shouldSkipLog = hasViewed === 'true';
const fetchUrl = shouldSkipLog ? `${fileUrl}?skipLog=true` : fileUrl;

// After first fetch
if (!shouldSkipLog) {
  sessionStorage.setItem(STORAGE_KEY, 'true');
}
```

**Keuntungan:**
- Session storage persist across page refresh dalam satu browser session
- Otomatis clear saat browser/tab ditutup
- Simple implementation

### Option 2: Gunakan API POST untuk explicit logging
**Current:** Logging otomatis di GET endpoint
**Better:** Panggil endpoint POST `/api/documents/[id]/view` secara explicit untuk logging

```typescript
// First load only - call explicit logging API
useEffect(() => {
  if (document?.id && !hasLoggedViewRef.current) {
    fetch(`/api/documents/${document.id}/view`, {
      method: 'POST',
      credentials: 'include'
    }).then(() => {
      hasLoggedViewRef.current = true;
    });
  }
}, [document?.id]);

// Then fetch PDF always with skipLog=true
const response = await fetch(`${fileUrl}?skipLog=true`, {
  credentials: 'include',
});
```

### Option 3: Track di backend dengan session/timestamp
Simpan di database "last viewed" timestamp per user per document, dan ignore jika < 5 menit.

---

## Kesimpulan:

**PERTANYAAN:** Apakah refresh page benar-benar TIDAK menambah VIEW di audit log?

**JAWABAN:** ❌ **TIDAK BENAR**

Berdasarkan analisis kode:
1. ✅ Mekanisme `skipLog` sudah ada dan berfungsi
2. ✅ Component sudah implement tracking dengan `useRef`
3. ❌ **NAMUN** `useRef` **TIDAK persist** across browser refresh
4. ❌ Setiap browser refresh akan **reset** ref dan **mencatat VIEW baru**

**Rekomendasi:**
- Implementasi Option 1 (Session Storage) untuk fix bug ini
- Atau gunakan Option 2 untuk explicit logging yang lebih terkontrol

---

## File yang Perlu Dimodifikasi:
1. `src/components/documents/enhanced-pdf-viewer.tsx` - Implementasi session storage
2. Testing setelah fix untuk memastikan refresh tidak menambah VIEW log

