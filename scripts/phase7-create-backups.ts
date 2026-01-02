#!/usr/bin/env ts-node

/**
 * Phase 7: Database Backup Script
 * Creates backup tables before dropping deprecated Permission tables
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const prisma = new PrismaClient()

async function createBackupTables() {
  console.log('🗄️  Phase 7: Creating Backup Tables')
  console.log('=' .repeat(80))
  console.log()

  try {
    // Step 1: Create backup table for Permission
    console.log('📋 Step 1: Creating backup for Permission table...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_backup_permissions" AS 
      SELECT * FROM "permissions";
    `)
    
    const permissionBackupCount = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) as count FROM "_backup_permissions"
    `)
    console.log(`   ✅ Backed up ${permissionBackupCount[0].count} Permission records`)
    console.log()

    // Step 2: Create backup table for RolePermission
    console.log('📋 Step 2: Creating backup for RolePermission table...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_backup_role_permissions" AS 
      SELECT * FROM "role_permissions";
    `)
    
    const rolePermissionBackupCount = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) as count FROM "_backup_role_permissions"
    `)
    console.log(`   ✅ Backed up ${rolePermissionBackupCount[0].count} RolePermission records`)
    console.log()

    // Step 3: Verify backup data integrity
    console.log('🔍 Step 3: Verifying backup integrity...')
    
    const originalPermCount = await prisma.permission.count()
    const backupPermCount = parseInt(permissionBackupCount[0].count)
    
    if (originalPermCount === backupPermCount) {
      console.log(`   ✅ Permission backup verified: ${originalPermCount} records match`)
    } else {
      throw new Error(`Permission backup mismatch! Original: ${originalPermCount}, Backup: ${backupPermCount}`)
    }

    const originalRolePermCount = await prisma.rolePermission.count()
    const backupRolePermCount = parseInt(rolePermissionBackupCount[0].count)
    
    if (originalRolePermCount === backupRolePermCount) {
      console.log(`   ✅ RolePermission backup verified: ${originalRolePermCount} records match`)
    } else {
      throw new Error(`RolePermission backup mismatch! Original: ${originalRolePermCount}, Backup: ${backupRolePermCount}`)
    }
    console.log()

    // Step 4: Show backup table structure
    console.log('📊 Step 4: Backup tables created:')
    console.log('   • _backup_permissions')
    console.log('   • _backup_role_permissions')
    console.log()

    // Step 5: Export backup data as JSON (additional safety)
    console.log('💾 Step 5: Exporting backup as JSON files...')
    
    const permissions = await prisma.permission.findMany({
      include: {
        rolePermissions: true
      }
    })
    
    const rolePermissions = await prisma.rolePermission.findMany({
      include: {
        role: { select: { name: true, displayName: true } },
        permission: { select: { name: true, displayName: true } }
      }
    })

    const backupDir = path.join(__dirname, '..', 'backups', 'phase7')
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    fs.writeFileSync(
      path.join(backupDir, `permissions-backup-${Date.now()}.json`),
      JSON.stringify(permissions, null, 2)
    )
    
    fs.writeFileSync(
      path.join(backupDir, `role-permissions-backup-${Date.now()}.json`),
      JSON.stringify(rolePermissions, null, 2)
    )

    console.log(`   ✅ JSON backups saved to: ${backupDir}/`)
    console.log()

    console.log('=' .repeat(80))
    console.log('✅ BACKUP COMPLETED SUCCESSFULLY')
    console.log('=' .repeat(80))
    console.log()
    console.log('Summary:')
    console.log(`   • Permission records backed up: ${originalPermCount}`)
    console.log(`   • RolePermission records backed up: ${originalRolePermCount}`)
    console.log(`   • Database tables created: 2`)
    console.log(`   • JSON backup files created: 2`)
    console.log()
    console.log('⚠️  IMPORTANT: Backup tables created:')
    console.log('   • _backup_permissions (can be restored if needed)')
    console.log('   • _backup_role_permissions (can be restored if needed)')
    console.log()
    console.log('Next step: Update Prisma schema to remove deprecated models')
    console.log()

  } catch (error: any) {
    console.error('❌ ERROR during backup:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Rollback function (just in case)
async function showRollbackInstructions() {
  console.log('📝 ROLLBACK INSTRUCTIONS (if needed):')
  console.log('=' .repeat(80))
  console.log()
  console.log('To restore from backup tables, run:')
  console.log()
  console.log('1. Recreate Permission table:')
  console.log('   CREATE TABLE "permissions" AS SELECT * FROM "_backup_permissions";')
  console.log()
  console.log('2. Recreate RolePermission table:')
  console.log('   CREATE TABLE "role_permissions" AS SELECT * FROM "_backup_role_permissions";')
  console.log()
  console.log('3. Restore Prisma schema from git:')
  console.log('   git checkout prisma/schema.prisma')
  console.log()
  console.log('4. Run Prisma generate:')
  console.log('   npx prisma generate')
  console.log()
  console.log('=' .repeat(80))
}

createBackupTables().then(() => {
  console.log()
  showRollbackInstructions()
})
