import { PrismaClient } from '@prisma/client'
import { ROLES } from '../src/config/roles'

const prisma = new PrismaClient()

async function analyzeDocumentAccess() {
  console.log('🔍 Analyzing current document access configuration...')
  
  try {
    // Show roles yang memiliki documents.read permission
    console.log('\n📋 Roles dengan documents.read permission:')
    Object.values(ROLES).forEach(role => {
      const hasDocRead = role.permissions.includes('documents.read') || 
                        role.permissions.includes('documents.*') || 
                        role.permissions.includes('*')
      
      if (hasDocRead) {
        console.log(`✅ ${role.name} (${role.displayName}) - Level ${role.level}`)
        console.log(`   Permissions: [${role.permissions.join(', ')}]`)
      } else {
        console.log(`❌ ${role.name} (${role.displayName}) - Level ${role.level}`)
        console.log(`   Permissions: [${role.permissions.join(', ')}]`)
      }
      console.log()
    })

    // Check current document accessGroups
    console.log('📄 Current document access groups:')
    const documents = await prisma.document.findMany({
      select: {
        title: true,
        accessGroups: true,
        status: true
      }
    })

    const uniqueAccessGroups = new Set()
    documents.forEach(doc => {
      doc.accessGroups.forEach(group => uniqueAccessGroups.add(group))
    })

    console.log('Current accessGroups in documents:', Array.from(uniqueAccessGroups))

    // Show which roles should have full document access
    console.log('\n💡 Roles yang SEHARUSNYA memiliki akses ke semua dokumen:')
    const rolesWithDocAccess = Object.values(ROLES).filter(role => 
      role.permissions.includes('documents.read') || 
      role.permissions.includes('documents.*') || 
      role.permissions.includes('*')
    )

    rolesWithDocAccess.forEach(role => {
      console.log(`   - ${role.name} (${role.displayName})`)
    })

    console.log('\n🔧 Roles yang perlu ditambahkan ke document accessGroups:')
    const missingRoles = rolesWithDocAccess
      .map(role => role.name)
      .filter(roleName => !uniqueAccessGroups.has(roleName))

    if (missingRoles.length > 0) {
      console.log('Missing roles:', missingRoles)
    } else {
      console.log('✅ All roles with document.read permission already in accessGroups')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the analysis
analyzeDocumentAccess()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })