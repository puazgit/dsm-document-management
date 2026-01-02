# Login System Update - Email or Username Support

## 📋 Perubahan yang Dilakukan

Sistem login telah diupdate untuk mendukung **2 metode login**:
1. **Login dengan Email** (contoh: `admin@dsm.com`)
2. **Login dengan Username** (contoh: `admin`)

---

## 🔧 File yang Dimodifikasi

### 1. **Validation Schema** - `/src/lib/validations/schemas.ts`
```typescript
export const loginSchema = z.object({
  emailOrUsername: z
    .string()
    .min(1, 'Email or username is required'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});
```

**Perubahan:**
- Field `email` diganti menjadi `emailOrUsername`
- Validasi email dihapus karena bisa menerima username juga
- Lebih fleksibel untuk input user

---

### 2. **NextAuth Configuration** - `/src/lib/next-auth.ts`
```typescript
CredentialsProvider({
  name: "credentials",
  credentials: {
    emailOrUsername: { label: "Email or Username", type: "text" },
    password: { label: "Password", type: "password" }
  },
  async authorize(credentials) {
    if (!credentials?.emailOrUsername || !credentials?.password) {
      return null
    }

    // Deteksi apakah input adalah email atau username
    const isEmail = credentials.emailOrUsername.includes('@');
    
    // Query database berdasarkan deteksi
    const user = await prisma.user.findUnique({
      where: isEmail 
        ? { email: credentials.emailOrUsername }
        : { username: credentials.emailOrUsername },
      // ... rest of query
    });
    
    // ... rest of auth logic
  }
})
```

**Logic Deteksi:**
- Jika input mengandung karakter `@` → Dianggap **email**
- Jika input tidak ada `@` → Dianggap **username**

---

### 3. **Login Page UI** - `/src/app/auth/login/page.tsx`
```tsx
<Label htmlFor="emailOrUsername">Email or Username</Label>
<Input
  id="emailOrUsername"
  name="emailOrUsername"
  type="text"
  autoComplete="username"
  required
  value={emailOrUsername}
  onChange={(e) => setEmailOrUsername(e.target.value)}
  placeholder="Enter your email or username"
/>
```

**Perubahan:**
- Input field label: "Email" → "Email or Username"
- Placeholder lebih jelas: "Enter your email or username"
- State variable: `email` → `emailOrUsername`

---

## 🎯 Cara Kerja

### Login Flow:
1. User memasukkan email atau username di form login
2. System mendeteksi format input:
   - **Mengandung @**: Query `WHERE email = ?`
   - **Tidak ada @**: Query `WHERE username = ?`
3. Password diverifikasi dengan bcrypt
4. Jika valid, session dibuat dan user diarahkan ke dashboard

### Contoh Penggunaan:

#### ✅ Login dengan Email:
- Input: `admin@dsm.com`
- Detection: `isEmail = true` (ada karakter @)
- Query: `prisma.user.findUnique({ where: { email: "admin@dsm.com" } })`

#### ✅ Login dengan Username:
- Input: `admin`
- Detection: `isEmail = false` (tidak ada @)
- Query: `prisma.user.findUnique({ where: { username: "admin" } })`

---

## ✅ Testing

Jalankan script testing:
```bash
node test-login-username.js
```

Script ini akan menampilkan:
- ✅ Validasi schema untuk email
- ✅ Validasi schema untuk username
- ✅ Expected behavior untuk invalid credentials
- ✅ Summary lengkap perubahan

---

## 🔒 Security Notes

1. **Unique Constraints**: 
   - Email dan username keduanya memiliki unique constraint di database
   - Tidak ada konflik karena query dilakukan pada field yang berbeda

2. **Password Hashing**: 
   - Tetap menggunakan bcrypt dengan 12 salt rounds
   - Tidak ada perubahan pada security password

3. **Audit Logging**: 
   - Login attempts tetap dicatat di audit log
   - Failed login juga tetap ditrack

4. **Rate Limiting**: 
   - Perlu diimplementasikan untuk mencegah brute force
   - (Rekomendasi: Tambahkan rate limiting middleware)

---

## 📝 Database Schema

Schema `User` sudah mendukung kedua field:
```prisma
model User {
  id           String   @id @default(cuid())
  username     String   @unique @db.VarChar(50)
  email        String   @unique @db.VarChar(255)
  passwordHash String   @map("password_hash")
  // ... fields lainnya
  
  @@index([email])
  @@index([username])
}
```

Kedua field sudah:
- ✅ Unique constraint
- ✅ Indexed untuk performa query
- ✅ Proper validation

---

## 🚀 Next Steps (Opsional)

### Rekomendasi Enhancement:

1. **Rate Limiting**
   ```typescript
   // Tambahkan di middleware atau auth route
   import rateLimit from 'express-rate-limit';
   
   const loginLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 5 // 5 attempts
   });
   ```

2. **Better Error Messages**
   - Jangan expose apakah email/username exist atau tidak
   - Gunakan generic message: "Invalid credentials"

3. **2FA Support**
   - Tambahkan two-factor authentication
   - Optional untuk enhanced security

4. **Session Management**
   - Implement remember me functionality
   - Session timeout handling

---

## 📞 Support

Jika ada masalah atau pertanyaan:
1. Check audit logs untuk failed login attempts
2. Verify database indexes untuk performa
3. Test dengan berbagai format input

---

**Status**: ✅ Implemented and Tested
**Version**: 1.0.0
**Date**: December 30, 2025
