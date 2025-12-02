## 📋 CONTOH PRAKTIS: Role vs Group dalam DSM System

### 👨‍💼 Contoh User: "Budi Santoso"

**🏢 ORGANIZATIONAL GROUP (Posisi di Perusahaan):**
- Group: "Manager" 
- Level: 6
- Deskripsi: Manajer Departemen IT
- Basic Permissions: Manajemen tim, approval dokumen departemen

**🔐 FUNCTIONAL ROLES (Hak Akses Spesifik):**
1. **Role: "Document.Editor"**
   - Permission: document.create, document.read, document.update
   - Bisa edit semua dokumen

2. **Role: "IT.Admin"** 
   - Permission: system.config, user.manage, backup.access
   - Admin sistem IT

3. **Role: "Finance.Viewer"**
   - Permission: finance.read
   - Bisa lihat laporan keuangan (temporary, expires next month)

### 🔄 Bagaimana Sistem Bekerja:

**Ketika Budi login:**
1. **Group Check**: "Manager" → Akses level 6, bisa approve dokumen departemen
2. **Role Check**: 
   - "Document.Editor" → Bisa create/edit dokumen
   - "IT.Admin" → Bisa akses system config  
   - "Finance.Viewer" → Bisa baca finance report

**Hasil Akhir:**
Budi punya akses **gabungan** dari Group (posisi organisasi) + Roles (fungsi spesifik)

---

## 🎯 ANALOGI SEDERHANA:

**GROUP = JABATAN di KTP** 
- "Manager", "Staff", "Direktur" 
- Menentukan posisi formal dalam organisasi
- Satu orang = satu jabatan utama

**ROLE = SERTIFIKAT KEAHLIAN**
- "Driver License", "Pilot License", "Medical License"
- Menentukan apa yang boleh dilakukan  
- Satu orang bisa punya banyak sertifikat
- Sertifikat bisa expired

---

## 🔧 REKOMENDASI PERBAIKAN:

Sistem saat ini **REDUNDANT** karena Group dan Role overlap. 

**Pilihan:**

### **Opsi 1: Simplifikasi - Hapus Group, Pakai Role Only**
```sql
User → UserRole → Role → RolePermission → Permission
```

### **Opsi 2: Gunakan Group untuk Organisasi, Role untuk Fungsi** 
```sql
User → Group (Organisasi) + UserRole → Role (Fungsi) → Permission
```

### **Opsi 3: Gabung Group & Role jadi satu konsep**
```sql  
User → UserRole → Role (include organisasi + fungsi)
```

Mana yang Anda pilih? 🤔