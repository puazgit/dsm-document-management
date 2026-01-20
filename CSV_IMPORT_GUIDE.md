# CSV Import Feature - User Guide

## 📋 Overview

Fitur CSV Import memungkinkan Anda membuat banyak dokumen sekaligus tanpa perlu upload file terlebih dahulu. File dapat diupload nanti via menu Edit Document.

## 🚀 Cara Menggunakan

### **Melalui Web UI** (Recommended)

1. **Buka halaman Documents**
   - Navigate ke `/documents`
   - Klik tombol **"Import CSV"**

2. **Download Template CSV**
   - Di dialog import, klik "Download Template"
   - Atau gunakan template di `documents-import.csv.template`

3. **Edit File CSV**
   - Isi data dokumen Anda
   - Pastikan kolom `documentTypeId` diisi dengan ID yang benar
   - Gunakan script `get-document-types.ts` untuk melihat ID yang tersedia

4. **Upload & Import**
   - Drag & drop CSV file atau klik untuk browse
   - Review file yang dipilih
   - Klik "Import Documents"
   - Lihat hasil import (success/failed per row)

5. **Upload File Dokumen**
   - Buka halaman Documents
   - Cari dokumen yang baru dibuat
   - Klik menu Edit
   - Upload file dokumen

### **Melalui Terminal/Script**

```bash
# 1. Dapatkan Document Type IDs
npx tsx scripts/get-document-types.ts

# 2. Siapkan CSV file
cp documents-import.csv.template documents-import.csv
# Edit documents-import.csv dengan data Anda

# 3. Jalankan import
npx tsx scripts/batch-import-documents-from-csv.ts

# Atau specify file lain
npx tsx scripts/batch-import-documents-from-csv.ts path/to/file.csv

# 4. Lihat dokumen yang menunggu file upload
npx tsx scripts/list-pending-upload-documents.ts
```

## 📝 Format CSV

### **Kolom WAJIB**

| Kolom | Deskripsi | Contoh |
|-------|-----------|--------|
| `title` | Judul dokumen | `"SOP Keuangan 2024"` |
| `documentTypeId` | ID tipe dokumen (lihat via script) | `"cmjwvczbc000gk67ye98oxzz0"` |

### **Kolom OPSIONAL**

| Kolom | Format | Contoh |
|-------|--------|--------|
| `description` | Text | `"Prosedur standar operasional keuangan"` |
| `accessGroups` | Comma-separated | `"administrator,keuangan,hrd"` |
| `tags` | Comma-separated | `"SOP,Keuangan,2024"` |
| `expiresAt` | ISO DateTime | `"2025-12-31T23:59:59Z"` |
| `metadata_*` | Any | Lihat section Metadata |

### **Metadata Custom Fields**

Kolom yang diawali dengan `metadata_` akan dimasukkan ke field metadata:

| CSV Column | Metadata Key | Contoh |
|------------|--------------|--------|
| `metadata_department` | `department` | `"Finance"` |
| `metadata_documentNumber` | `documentNumber` | `"SOP-FIN-001-2024"` |
| `metadata_priority` | `priority` | `"high"` |
| `metadata_effectiveDate` | `effectiveDate` | `"2024-01-01"` |
| `metadata_reviewDate` | `reviewDate` | `"2025-01-01"` |

## 📄 Contoh File CSV

```csv
title,description,documentTypeId,accessGroups,tags,metadata_department,metadata_documentNumber,metadata_priority,expiresAt
"SOP Keuangan 2024","Standard Operating Procedure untuk departemen keuangan","cmjwvczbc000gk67ye98oxzz0","administrator,keuangan","SOP,Keuangan,2024","Finance","SOP-FIN-001-2024","high","2025-12-31T23:59:59Z"
"Panduan IT Security","Panduan keamanan sistem informasi","cmjwvczbc000gk67ye98oxzz0","administrator,tik","Security,IT,Panduan","IT","PAN-IT-002-2024","high",""
"Kebijakan WFH","Kebijakan work from home","cmjwvczbc000gk67ye98oxzz0","administrator,hrd","Kebijakan,WFH,HR","Human Resources","KEB-HR-003-2024","medium","2026-12-31T23:59:59Z"
```

## 🎯 Available Document Types

Jalankan script untuk melihat ID yang tersedia:

```bash
npx tsx scripts/get-document-types.ts
```

Output:
```
📋 1. Panduan Sistem Manajemen
   ID: cmjwvczbc000ik67y1rjyio3n

⚙️ 2. Prosedur
   ID: cmjwvczbc000gk67ye98oxzz0

🎯 3. Instruksi Kerja Bersifat Khusus
   ID: cmjwvczbc000hk67yuku0hn1h

📝 4. Instruksi Kerja Bersifat Umum
   ID: cmjwvczbc000jk67yw1r045wp

🏢 5. Dokumen Internal
   ID: cmjwvczbc000kk67yfddpf5mc

🌐 6. Dokumen Eksternal
   ID: cmjwvczbc000lk67yc5b5pks0

🛡️ 7. Dokumen Eksternal SMK3
   ID: cmjwvczbc000mk67ytwvk56xq
```

## ✨ Fitur

### **Web UI**
- ✅ Drag & drop CSV upload
- ✅ Download template CSV
- ✅ Real-time import progress
- ✅ Detailed results per-row
- ✅ Success/Failed summary
- ✅ Error messages untuk troubleshooting
- ✅ Import multiple CSV files

### **Terminal Script**
- ✅ Batch processing
- ✅ Validasi per-row
- ✅ Skip error, lanjut row berikutnya
- ✅ Detailed error report
- ✅ Summary statistics
- ✅ Activity log otomatis

## 🔍 Tracking Dokumen Pending Upload

### **Via Web UI**
Filter dokumen dengan:
- Status: DRAFT
- File Name: (kosong)

### **Via Script**
```bash
npx tsx scripts/list-pending-upload-documents.ts
```

Output menampilkan:
- Daftar dokumen tanpa file
- Document ID untuk reference
- Metadata (department, document number, dll)
- Summary by document type

## ⚠️ Error Handling

### **Common Errors**

**1. "Document type not found"**
- Pastikan `documentTypeId` benar
- Gunakan `get-document-types.ts` untuk melihat ID yang valid

**2. "Title is required"**
- Kolom `title` tidak boleh kosong
- Check CSV untuk row yang missing title

**3. "Invalid CSV format"**
- Pastikan file adalah CSV valid
- Check encoding (UTF-8)
- Pastikan ada header row

**4. "Unauthorized"**
- User harus memiliki capability `DOCUMENT_CREATE`
- Login dengan user yang memiliki permission

### **Error di Specific Row**

Jika ada error di row tertentu:
- Script akan skip row tersebut
- Lanjut ke row berikutnya
- Error detail ditampilkan di hasil akhir
- Row number dicatat untuk troubleshooting

## 📊 Best Practices

1. **Test dengan Sample Kecil**
   - Import 2-3 dokumen dulu
   - Verify hasilnya
   - Baru import full list

2. **Validasi Data Sebelum Import**
   - Check semua Document Type IDs valid
   - Verify access groups exist
   - Check format expiresAt (ISO datetime)

3. **Gunakan Metadata untuk Tracking**
   - Tambahkan `metadata_importBatch`
   - Simpan reference ke source file
   - Catat deadline upload file

4. **Backup Sebelum Import Besar**
   ```bash
   npm run db:backup
   ```

5. **Monitor Progress**
   - Untuk import >100 row, gunakan terminal script
   - Web UI untuk <50 row
   - Check results setelah import

## 🔐 Security & Permissions

- Requires capability: `DOCUMENT_CREATE`
- Access groups divalidasi terhadap user permission
- Documents dibuat dengan status DRAFT
- Activity log recorded untuk audit trail

## 📁 File Locations

| File | Path |
|------|------|
| API Endpoint | `/src/app/api/documents/import-csv/route.ts` |
| UI Component | `/src/components/documents/document-csv-import.tsx` |
| Import Script | `/scripts/batch-import-documents-from-csv.ts` |
| Get Types Script | `/scripts/get-document-types.ts` |
| List Pending Script | `/scripts/list-pending-upload-documents.ts` |
| CSV Template | `/documents-import.csv.template` |

## 🆘 Troubleshooting

### Import gagal di web UI?
```bash
# Check browser console untuk error details
# Atau gunakan terminal script untuk verbose output
npx tsx scripts/batch-import-documents-from-csv.ts your-file.csv
```

### Dokumen tidak muncul setelah import?
```bash
# Check status dokumen
npx tsx scripts/list-pending-upload-documents.ts

# Atau query database langsung
npx prisma studio
```

### Need to rollback import?
```bash
# Delete dokumen dengan metadata tertentu
# Via Prisma Studio atau custom script
```

## 📞 Support

Jika mengalami masalah:
1. Check error message detail
2. Verify CSV format & data
3. Test dengan sample kecil
4. Check user permissions
5. Review activity logs

---

**Version:** 1.0.0  
**Last Updated:** January 19, 2026
