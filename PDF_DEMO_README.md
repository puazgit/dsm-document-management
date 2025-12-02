# PDF Security Demo - Quick Start

## 🚀 Akses Demo

Buka browser dan akses:
```
http://localhost:3001/pdf-security-demo
```

## 🔒 Fitur yang Dapat Diuji

### 1. **Role-Based Access Control**
- Pilih role berbeda di dropdown (Administrator, Manager, Editor, Reviewer, Viewer, Guest)
- Lihat perubahan permission secara real-time
- Coba fitur download/print/copy sesuai role

### 2. **Security Measures Testing**
Coba lakukan aksi berikut untuk melihat security violations:
- ✅ **Right-click** pada PDF
- ✅ **Press F12** untuk buka DevTools
- ✅ **Ctrl+S** untuk save
- ✅ **Ctrl+P** untuk print
- ✅ **Ctrl+C** untuk copy
- ✅ **Drag** konten PDF
- ✅ **Select text** (tergantung role)

### 3. **Viewer Types**
- **Advanced PDF.js Viewer** - Full featured dengan PDF.js
- **Secure iframe Viewer** - Lightweight alternative

### 4. **Sample Documents**
- Company Policy Document
- Financial Report Q3 2024  
- Technical Specification

## 📊 Monitoring

- **Security Log** di sidebar kanan menampilkan semua violations
- **Real-time role switching** untuk testing permissions
- **Feature comparison table** untuk melihat perbedaan akses

## 🎯 Test Scenarios

### Scenario 1: Administrator Role
```
Role: Administrator
Expected: Full access - dapat download, print, copy, zoom, rotate
Test: Semua fitur harus tersedia
```

### Scenario 2: Viewer Role  
```
Role: Viewer
Expected: View only - tidak ada download/print/copy
Test: Button download/print tidak muncul, copy text diblokir
```

### Scenario 3: Guest Role
```
Role: Guest  
Expected: Restricted view - zoom terbatas, watermark aktif
Test: Zoom maksimal 1.2x, watermark "GUEST ACCESS" muncul
```

### Scenario 4: Security Violations
```
Action: Right-click pada PDF
Expected: Context menu terblokir, muncul di security log
Test: Tidak ada context menu, violation tercatat
```

## 🔧 Jika Ada Masalah

### PDF Tidak Muncul
```bash
# Check console untuk error
# Pastikan PDF.js worker loaded
# Cek network tab untuk failed requests
```

### Security Measures Tidak Bekerja
```bash
# Refresh halaman
# Check JavaScript enabled
# Cek console untuk error
```

### Performance Issues
```bash
# Close DevTools jika terbuka
# Refresh browser
# Check memory usage
```

## 📝 Implementation Notes

File yang dibuat:
- `/src/components/documents/advanced-pdf-viewer.tsx` - Main PDF viewer
- `/src/hooks/use-security-measures.ts` - Security measures hook  
- `/src/lib/pdf-config.ts` - PDF.js configuration
- `/src/app/pdf-security-demo/page.tsx` - Demo page
- Security CSS ditambahkan ke `globals.css`

Dependencies yang diinstall:
- `react-pdf` - React PDF viewer
- `pdfjs-dist` - PDF.js library

## 🎉 Hasil yang Diharapkan

Setelah implementasi ini, Anda memiliki:
1. ✅ **Client-side PDF viewer** dengan kontrol penuh
2. ✅ **Role-based permissions** yang fleksibel  
3. ✅ **Security measures** yang komprehensif
4. ✅ **Monitoring sistem** untuk violations
5. ✅ **Demo page** untuk testing dan presentasi

**Note:** Ini adalah implementasi client-side security yang harus dikombinasikan dengan server-side validation untuk keamanan penuh.