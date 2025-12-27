# Test Mobile Sidebar - Quick Guide

## URL untuk Testing
- Development: http://localhost:3001/documents
- Production: http://localhost:3000/documents

## Quick Test Steps

### 1. Test di Browser DevTools
```bash
1. Buka browser (Chrome/Firefox/Safari)
2. Kunjungi: http://localhost:3001/documents
3. Buka DevTools: F12 atau Cmd+Option+I (Mac)
4. Toggle Device Toolbar: Cmd+Shift+M atau Ctrl+Shift+M
5. Pilih device: iPhone 12 atau atur width < 768px
```

### 2. Cek Hamburger Menu
- ✅ Harus ada icon hamburger (☰) di pojok kiri atas header
- ✅ Icon harus berukuran cukup besar untuk di-tap (36px × 36px)
- ✅ Icon harus terlihat jelas (tidak blur atau tertutup)

### 3. Cek Sidebar Functionality
- ✅ Tap hamburger → sidebar muncul dari kiri
- ✅ Ada overlay gelap di belakang sidebar
- ✅ Sidebar width sekitar 85% dari layar
- ✅ Animasi slide-in smooth (tidak patah-patah)

### 4. Cek Interaksi
- ✅ Tap menu item → navigate ke page & sidebar otomatis tutup
- ✅ Tap overlay (area gelap) → sidebar tutup
- ✅ Swipe dari kiri ke kanan → sidebar tutup (jika supported)

### 5. Cek Theme
- ✅ Toggle theme (Sun/Moon icon di header kanan)
- ✅ Sidebar ikut berubah warna:
  - Light mode: putih/terang
  - Dark mode: gelap/biru gelap
- ✅ Text readable di kedua mode

## Test Checklist Visual

### Light Theme
```
Header: [ ☰ ]  Documents                    [🔄] [☀️] [🔔]
        └─ Hamburger icon harus terlihat jelas
```

### Dark Theme
```
Header: [ ☰ ]  Documents                    [🔄] [🌙] [🔔]
        └─ Hamburger icon dengan contrast yang baik
```

### Sidebar Terbuka (Mobile)
```
┌─────────────────────┐┌──────────┐
│ [DSMT Logo]        ││          │← Overlay gelap
│                     ││          │
│ Navigation          ││          │
│ ├─ Dashboard       ││          │
│ ├─ Documents ✓     ││          │
│ └─ ...             ││          │
│                     ││          │
│ [User Profile]     ││          │
└─────────────────────┘└──────────┘
 └─ Sidebar (288px)    └─ Content
```

## Screen Sizes to Test

### Mobile Phones
- iPhone SE: 375px
- iPhone 12/13: 390px
- iPhone 14 Pro Max: 430px
- Samsung Galaxy S21: 360px

### Tablets
- iPad Mini: 768px
- iPad: 810px
- iPad Pro: 1024px

### Desktop
- Laptop: 1280px
- Desktop: 1920px

## Common Issues & Fixes

### Issue 1: Hamburger tidak terlihat
**Solution**: Cek z-index dan visibility
```css
[data-sidebar="trigger"] {
  display: flex !important;
  z-index: 50;
}
```

### Issue 2: Sidebar tidak slide-in
**Solution**: Cek Sheet component open state
- Pastikan `openMobile` state ter-update
- Cek `toggleSidebar()` function dipanggil

### Issue 3: Overlay tidak muncul
**Solution**: Cek SheetOverlay z-index
```css
z-50 bg-black/80 backdrop-blur-sm
```

### Issue 4: Text tidak terbaca di dark mode
**Solution**: Cek CSS variables untuk sidebar
```css
.dark {
  --sidebar-background: 222.2 84% 4.9%;
  --sidebar-foreground: 210 40% 98%;
}
```

## Debug Commands

### Check if mobile detected
```javascript
// Di browser console
window.innerWidth < 768 // Should return true on mobile
```

### Check sidebar state
```javascript
// Di React DevTools
// Cari SidebarProvider component
// Lihat state: { openMobile: false/true }
```

### Force mobile view
```css
/* Temporary override di DevTools */
.peer {
  display: none !important;
}
```

## Expected Results

✅ **All Green**
- Hamburger visible on mobile (<768px)
- Sidebar opens on tap
- Sidebar closes on navigation/overlay tap
- Theme switching works
- Smooth animations
- Touch-friendly button sizes

❌ **Need Fixing**
- Hamburger not visible → Check header.tsx
- Sidebar not opening → Check sidebar.tsx toggleSidebar()
- Theme not working → Check globals.css variables
- Janky animation → Check Sheet animation classes

## Performance Check

### Animation should be smooth (60fps)
1. Open DevTools
2. Go to Performance tab
3. Record while opening/closing sidebar
4. Check for frame drops

### Loading should be fast
- Initial render: < 100ms
- Sidebar open: < 300ms
- Theme switch: < 200ms

## Accessibility Check

### Keyboard Navigation
- Tab to hamburger button ✅
- Enter/Space to open sidebar ✅
- Tab through menu items ✅
- Escape to close sidebar ✅

### Screen Reader
- Hamburger announces "Toggle Sidebar" ✅
- Menu items announce properly ✅
- Current page indicated ✅

## Final Verification

Login ke aplikasi dan test semua ini:
1. ✅ Login page responsive
2. ✅ Dashboard sidebar works on mobile
3. ✅ Documents page sidebar works on mobile
4. ✅ All nested pages work
5. ✅ Theme persists across navigation
6. ✅ No console errors

---

**Status**: Ready for testing
**Port**: 3001 (or 3000)
**Updated**: December 27, 2025
