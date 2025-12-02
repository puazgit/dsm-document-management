import { PrismaClient } from '@prisma/client'
import { ROLES } from '../src/config/roles'

const prisma = new PrismaClient()

async function updateAllDocumentAccess() {
  console.log('🔄 Updating all documents to include all roles with documents.read permission...')
  
  try {
    // Get all roles yang memiliki documents.read permission
    const rolesWithDocAccess = Object.values(ROLES)
      .filter(role => 
        role.permissions.includes('documents.read') || 
        role.permissions.includes('documents.*') || 
        role.permissions.includes('*')
      )
      .map(role => role.name)

    console.log('📋 Roles yang akan diberikan akses ke semua dokumen:')
    rolesWithDocAccess.forEach(roleName => {
      const role = ROLES[roleName as keyof typeof ROLES]
      if (role) {
        console.log(`   - ${roleName} (${role.displayName}) - Level ${role.level}`)
      }
    })

    // Get all documents
    const documents = await prisma.document.findMany({
      select: {
        id: true,
        title: true,
        accessGroups: true
      }
    })

    console.log(`\n📄 Updating ${documents.length} documents...`)

    // Update each document
    let updatedCount = 0
    for (const doc of documents) {
      // Combine existing accessGroups with all roles that have document read access
      const currentAccessGroups = doc.accessGroups || []
      const newAccessGroups = [...new Set([...currentAccessGroups, ...rolesWithDocAccess])]
      
      // Only update if there are changes
      if (JSON.stringify(currentAccessGroups.sort()) !== JSON.stringify(newAccessGroups.sort())) {
        await prisma.document.update({
          where: { id: doc.id },
          data: {
            accessGroups: newAccessGroups
          }
        })
        
        updatedCount++
        console.log(`✅ Updated "${doc.title}"`)
        console.log(`   Old: [${currentAccessGroups.join(', ')}]`)
        console.log(`   New: [${newAccessGroups.join(', ')}]`)
      } else {
        console.log(`⚪ No changes needed for "${doc.title}"`)
      }
    }

    console.log(`\n🎉 Successfully updated ${updatedCount} documents`)
    console.log('\n📊 Final access summary:')
    console.log('Now ALL users with these roles can access ALL documents:')
    rolesWithDocAccess.forEach(roleName => {
      const role = ROLES[roleName as keyof typeof ROLES]
      if (role) {
        console.log(`   ✅ ${role.displayName} (${roleName}) - Level ${role.level}`)
      }
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the update
updateAllDocumentAccess()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })