# 📝 Panduan Revisi Dokumen Terpublikasi

## 🎯 Overview

Sistem sekarang mendukung **pembaharuan dokumen yang sudah PUBLISHED** melalui mekanisme revisi dengan versioning otomatis.

## 🔄 Alur Revisi Dokumen

### **Skenario: Dokumen Prosedur v1.0 sudah PUBLISHED, perlu diperbarui**

```
PUBLISHED (v1.0) → IN_REVIEW (v2.0) → PENDING_APPROVAL → APPROVED → PUBLISHED (v2.0)
     ↓
  Tersimpan di History
```

---

## 📋 Langkah-langkah Revisi

### **1. Inisiasi Revisi** (PPD/Admin)

**Di Halaman Document:**
1. Buka dokumen yang sudah PUBLISHED
2. Klik badge status **PUBLISHED** (warna biru)
3. Pilih opsi: **"Start document revision (new version)"**
4. Masukkan alasan revisi (optional)
5. Klik **Confirm**

**Yang Terjadi Otomatis:**
- ✅ Versi saat ini (v1.0) disimpan ke Document History
- ✅ Version number di-increment (v1.0 → v2.0)
- ✅ Status berubah ke IN_REVIEW
- ✅ Audit trail tercatat lengkap
- ✅ Dokumen versi lama tetap dapat diakses

---

### **2. Review & Edit Dokumen** (Editor/Manager)

**Status: IN_REVIEW (v2.0)**

- Edit konten dokumen sesuai kebutuhan
- Upload file baru jika diperlukan
- Tambahkan komentar perubahan
- Setelah selesai: Forward ke **PENDING_APPROVAL**

---

### **3. Approval Process** (Kadiv/GM/Dirut)

**Status: PENDING_APPROVAL**

- Review perubahan dokumen
- Bandingkan dengan versi sebelumnya (jika perlu)
- Approve atau Reject:
  - **Approve** → Lanjut ke APPROVED
  - **Reject** → Kembali ke DRAFT untuk revisi ulang

---

### **4. Publikasi Versi Baru** (PPD/Admin)

**Status: APPROVED → PUBLISHED**

- Verifikasi final
- Publish dokumen versi baru (v2.0)
- Dokumen versi baru aktif untuk semua user

---

## 📊 Version History

### **Melihat Version History:**

1. Buka dokumen
2. Tab **"Versions"** 
3. Lihat daftar semua versi:
   - v1.0 (Published: 15 Jan 2026)
   - v2.0 (Published: 20 Jan 2026) ← Current
4. Download atau view versi lama jika diperlukan

---

## 🔢 Version Numbering System

### **Major Version (x.0)**
- **Kapan**: Perubahan substansial via workflow revisi
- **Contoh**: 1.0 → 2.0 → 3.0
- **Trigger**: PUBLISHED → IN_REVIEW workflow
- **Use Case**:
  - Perubahan kebijakan
  - Update prosedur
  - Koreksi substansial
  - Reorganisasi struktur

### **Minor Version (x.y)** - Future Feature
- **Kapan**: Perubahan kecil tanpa re-approval
- **Contoh**: 1.0 → 1.1 → 1.2
- **Use Case**: Typo, formatting, link updates

---

## 💡 Best Practices

### ✅ **DO:**

1. **Gunakan revision workflow untuk**:
   - Perubahan kebijakan atau prosedur
   - Update yang memerlukan approval
   - Perubahan substansial pada konten
   - Perubahan yang perlu audit trail

2. **Berikan komentar yang jelas**:
   - Jelaskan alasan revisi
   - List perubahan utama
   - Reference dokumen terkait

3. **Maintain document quality**:
   - Review menyeluruh sebelum forward
   - Verifikasi konsistensi dengan dokumen lain
   - Pastikan formatting dan struktur benar

### ❌ **DON'T:**

1. **Jangan skip approval process**
   - Semua perubahan harus melalui workflow
   - Maintain quality control

2. **Jangan lupa dokumentasi**
   - Selalu tambahkan komentar perubahan
   - Update metadata jika perlu

3. **Jangan publish langsung**
   - Pastikan melalui APPROVED dulu
   - Verifikasi sebelum publish

---

## 🎯 Keuntungan Sistem Revisi

### **1. Audit Trail Lengkap**
- ✅ Semua perubahan tercatat
- ✅ History versi tersimpan
- ✅ Siapa, kapan, kenapa perubahan

### **2. Quality Control**
- ✅ Tetap melalui approval workflow
- ✅ Review multi-level
- ✅ Prevent unauthorized changes

### **3. Document Continuity**
- ✅ Versi lama tetap accessible
- ✅ Compliance & regulatory requirements
- ✅ Reference untuk training

### **4. User Experience**
- ✅ Proses jelas dan terstruktur
- ✅ Transparency untuk semua stakeholder
- ✅ Easy rollback jika diperlukan

---

## 🚨 Troubleshooting

### **Q: Tidak bisa start revision?**
**A:** Pastikan:
- Anda memiliki role PPD atau Administrator
- Dokumen benar-benar dalam status PUBLISHED
- Anda memiliki capability DOCUMENT_PUBLISH + DOCUMENT_EDIT

### **Q: Version number tidak increment?**
**A:** 
- Cek log sistem
- Pastikan transisi PUBLISHED → IN_REVIEW
- Contact administrator jika masalah berlanjut

### **Q: Tidak bisa akses versi lama?**
**A:**
- Versi lama tersimpan di tab "Versions"
- User dengan DOCUMENT_VIEW dapat mengakses
- Contact PPD jika butuh restore versi lama

---

## 📞 Support

**Untuk bantuan lebih lanjut:**
- **PPD Team**: Proses workflow dan approval
- **Admin IT**: Technical issues dan system access
- **Documentation**: Lihat DOCUMENT_STATUS_WORKFLOW.md untuk detail teknis

---

**Last Updated**: 20 Januari 2026  
**Version**: 1.0  
**Status**: PUBLISHED
