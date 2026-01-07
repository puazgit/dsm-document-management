/**
 * SIKAWAN API Integration Service
 * 
 * Service untuk integrasi dengan API SIKAWAN Jasa Tirta 2
 * untuk autentikasi dan sinkronisasi data pegawai
 */

import { hash, compare } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

// Konfigurasi SIKAWAN API
const SIKAWAN_CONFIG = {
  url: 'http://sikawan.jasatirta2.co.id/V_API2/Apipegawai/get_data_pegawai_for_grc',
  apiKey: 'apiforgrc123nchsjw0',
  timeout: 10000, // 10 detik
};

/**
 * Interface untuk data pegawai dari SIKAWAN API
 */
export interface SikawanPegawai {
  nama: string;
  nik: string;
  email: string;
  nama_jabatan: string;
  nama_unitkerja: string;
  id_jabatan?: string;
  id_unitkerja?: string;
  nama_bidang?: string;
  nama_subbidang?: string;
}

/**
 * Interface untuk user session setelah login
 */
export interface SessionUser {
  id: string;
  username: string;
  email: string;
  name: string;
  isExternal: boolean;
  mustChangePassword: boolean;
  roles: string[];
}

/**
 * Service class untuk integrasi SIKAWAN
 */
export class SikawanService {
  /**
   * Fetch semua data pegawai dari SIKAWAN API
   */
  private async fetchAllPegawai(): Promise<SikawanPegawai[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SIKAWAN_CONFIG.timeout);

      const response = await fetch(SIKAWAN_CONFIG.url, {
        method: 'POST',
        headers: {
          'X-APIKEY': SIKAWAN_CONFIG.apiKey,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`SIKAWAN API error: ${response.status}`);
      }

      const responseData = await response.json();
      
      // SIKAWAN API mengembalikan { status, msg, data }
      if (!responseData.data || !Array.isArray(responseData.data)) {
        throw new Error('Invalid SIKAWAN API response format');
      }

      return responseData.data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('SIKAWAN API timeout');
        }
        throw new Error(`SIKAWAN API error: ${error.message}`);
      }
      throw new Error('Unknown SIKAWAN API error');
    }
  }

  /**
   * Validasi NIP dan ambil data pegawai dari SIKAWAN
   * 
   * @param nip - NIP pegawai yang akan divalidasi
   * @returns Data pegawai jika ditemukan, null jika tidak
   */
  async validateNIP(nip: string): Promise<SikawanPegawai | null> {
    try {
      const allPegawai = await this.fetchAllPegawai();
      
      // Cari pegawai berdasarkan NIK (trim untuk handle trailing spaces dari API)
      const pegawai = allPegawai.find(p => p.nik.trim() === nip.trim());
      
      if (!pegawai) {
        return null;
      }

      return pegawai;
    } catch (error) {
      console.error('Error validating NIP:', error);
      throw error;
    }
  }

  /**
   * Sinkronisasi data pegawai dari SIKAWAN ke database lokal
   * User baru akan mendapatkan role "viewer" secara default
   * 
   * @param pegawai - Data pegawai dari SIKAWAN
   * @param isFirstLogin - Apakah ini first login (untuk set password = NIP)
   * @returns User yang telah disinkronkan
   */
  async syncPegawaiToLocal(
    pegawai: SikawanPegawai,
    isFirstLogin: boolean = false
  ): Promise<any> {
    try {
      // Cek apakah user sudah ada
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { externalId: pegawai.nik.trim() },
            { email: pegawai.email },
          ],
        },
        include: {
          userRoles: {
            where: { isActive: true },
            include: { role: true },
          },
        },
      });

      const metadata = {
        jabatan: pegawai.nama_jabatan,
        unit_kerja: pegawai.nama_unitkerja,
        id_jabatan: pegawai.id_jabatan,
        id_unitkerja: pegawai.id_unitkerja,
        nama_bidang: pegawai.nama_bidang,
        nama_subbidang: pegawai.nama_subbidang,
      };

      if (user) {
        // Update existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            email: pegawai.email,
            firstName: pegawai.nama.split(' ')[0] || pegawai.nama,
            lastName: pegawai.nama.split(' ').slice(1).join(' ') || '',
            lastSyncAt: new Date(),
            metadata: metadata,
          },
          include: {
            userRoles: {
              where: { isActive: true },
              include: { role: true },
            },
          },
        });

        return user;
      }

      // Create new user dengan password default = NIP (trim untuk konsistensi)
      const defaultPassword = await hash(pegawai.nik.trim(), 12);

      // Ambil viewer role
      const viewerRole = await prisma.role.findUnique({
        where: { name: 'viewer' },
      });

      if (!viewerRole) {
        throw new Error('Viewer role not found in database');
      }

      // Get admin user for assignedBy (system user)
      const adminUser = await prisma.user.findFirst({
        where: { username: 'admin' },
        select: { id: true },
      })

      if (!adminUser) {
        throw new Error('Admin user not found in database');
      }

      // Create user baru
      user = await prisma.user.create({
        data: {
          username: pegawai.nik.trim(),
          email: pegawai.email,
          passwordHash: defaultPassword,
          firstName: pegawai.nama.split(' ')[0] || pegawai.nama,
          lastName: pegawai.nama.split(' ').slice(1).join(' ') || '',
          isActive: true,
          isExternal: true,
          externalId: pegawai.nik.trim(),
          externalSource: 'SIKAWAN',
          mustChangePassword: true,
          lastSyncAt: new Date(),
          metadata: metadata,
          userRoles: {
            create: {
              roleId: viewerRole.id,
              assignedBy: adminUser.id, // System assignment via admin
              isManuallyAssigned: false,
            },
          },
        },
        include: {
          userRoles: {
            where: { isActive: true },
            include: { role: true },
          },
        },
      });

      console.log(`New SIKAWAN user created: ${user.username} (${user.email}) with viewer role`);

      return user;
    } catch (error) {
      console.error('Error syncing pegawai to local:', error);
      throw error;
    }
  }

  /**
   * Autentikasi user dengan NIP dan password
   * 
   * Flow:
   * 1. Validasi NIP ke SIKAWAN API
   * 2. Sync data pegawai ke database lokal
   * 3. Verifikasi password (lokal)
   * 4. Return session user
   * 
   * @param nip - NIP pegawai
   * @param password - Password (default: NIP untuk first login)
   * @returns Session user jika berhasil, null jika gagal
   */
  async authenticateUser(nip: string, password: string): Promise<SessionUser | null> {
    try {
      // 1. Validasi NIP ke SIKAWAN
      const pegawai = await this.validateNIP(nip);
      
      if (!pegawai) {
        console.log(`NIP not found in SIKAWAN: ${nip}`);
        return null;
      }

      // 2. Sync pegawai ke database lokal
      const user = await this.syncPegawaiToLocal(pegawai, false);

      // 3. Verifikasi password (lokal)
      const isPasswordValid = await compare(password, user.passwordHash);
      
      if (!isPasswordValid) {
        console.log(`Invalid password for user: ${nip}`);
        return null;
      }

      // 4. Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // 5. Return session user
      const sessionUser: SessionUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        isExternal: user.isExternal,
        mustChangePassword: user.mustChangePassword,
        roles: user.userRoles.map((ur: any) => ur.role.name),
      };

      return sessionUser;
    } catch (error) {
      console.error('Error authenticating user:', error);
      throw error;
    }
  }

  /**
   * Update password user
   * Set mustChangePassword = false setelah user ganti password
   * 
   * @param userId - User ID
   * @param newPassword - Password baru
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    try {
      const hashedPassword = await hash(newPassword, 12);

      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: hashedPassword,
          mustChangePassword: false,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  /**
   * Get list user SIKAWAN yang pending role assignment
   * (user dengan hanya viewer role dan belum manually assigned)
   */
  async getPendingSikawanUsers() {
    try {
      const users = await prisma.user.findMany({
        where: {
          isExternal: true,
          externalSource: 'SIKAWAN',
          isActive: true,
          userRoles: {
            every: {
              isManuallyAssigned: false,
            },
          },
        },
        include: {
          userRoles: {
            where: { isActive: true },
            include: { role: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        createdAt: user.createdAt,
        metadata: user.metadata,
        currentRoles: user.userRoles.map(ur => ur.role.name),
      }));
    } catch (error) {
      console.error('Error getting pending SIKAWAN users:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const sikawanService = new SikawanService();
