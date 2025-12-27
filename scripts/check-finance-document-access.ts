import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkFinanceAccess() {
  console.log('🔍 Checking document access for finance@dsm.com')
  console.log('=' .repeat(80))
  
  try {
    // 1. Get user details
    const user = await prisma.user.findUnique({
      where: { email: 'finance@dsm.com' },
      include: {
        group: true,
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                capabilityAssignments: {
                  include: {
                    capability: true
                  }
                }
              }
            }
          }
        }
      }
    })
    
    if (!user) {
      console.log('❌ User finance@dsm.com not found')
      return
    }
    
    console.log('\n👤 USER INFORMATION:')
    console.log('-'.repeat(80))
    console.log(`   Email: ${user.email}`)
    console.log(`   Name: ${user.firstName} ${user.lastName}`)
    console.log(`   Group: ${user.group?.name || 'none'}`)
    console.log(`   Group ID: ${user.groupId || 'none'}`)
    console.log(`   Role (legacy): ${user.group?.name || 'none'}`)
    
    // Get capabilities
    const capabilities = user.userRoles.flatMap(ur =>
      ur.role.capabilityAssignments.map(ca => ca.capability.name)
    )
    const uniqueCapabilities = [...new Set(capabilities)]
    
    console.log('\n   User Roles:')
    if (user.userRoles.length === 0) {
      console.log('      (none)')
    } else {
      user.userRoles.forEach(ur => {
        console.log(`      - ${ur.role.name} (${ur.role.displayName})`)
      })
    }
    
    console.log('\n   Capabilities:')
    if (uniqueCapabilities.length === 0) {
      console.log('      (none)')
    } else {
      uniqueCapabilities.sort().forEach(cap => {
        console.log(`      - ${cap}`)
      })
    }
    
    const hasDocumentRead = uniqueCapabilities.includes('DOCUMENT_READ')
    const hasDocumentView = uniqueCapabilities.includes('DOCUMENT_VIEW')
    console.log(`\n   📄 DOCUMENT_READ: ${hasDocumentRead ? '✅' : '❌'}`)
    console.log(`   📄 DOCUMENT_VIEW: ${hasDocumentView ? '✅' : '❌'}`)
    
    // 2. Get published documents
    console.log('\n\n📄 PUBLISHED DOCUMENTS:')
    console.log('-'.repeat(80))
    
    const publishedDocs = await prisma.document.findMany({
      where: {
        status: 'PUBLISHED'
      },
      select: {
        id: true,
        title: true,
        status: true,
        isPublic: true,
        accessGroups: true,
        createdById: true,
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })
    
    console.log(`   Found ${publishedDocs.length} published document(s)\n`)
    
    if (publishedDocs.length === 0) {
      console.log('   No published documents found')
    } else {
      publishedDocs.forEach((doc, index) => {
        const isOwner = doc.createdById === user.id
        const isPublic = doc.isPublic
        const hasGroupAccess = doc.accessGroups.includes(user.group?.name || '')
        const hasGroupIdAccess = doc.accessGroups.includes(user.groupId || '')
        const hasRoleAccess = doc.accessGroups.some(ag => 
          user.userRoles.some(ur => ur.role.name === ag)
        )
        
        // Determine if user can access
        const canAccess = isOwner || isPublic || hasGroupAccess || hasGroupIdAccess || hasRoleAccess
        
        console.log(`   ${index + 1}. "${doc.title}"`)
        console.log(`      Status: ${doc.status}`)
        console.log(`      Public: ${isPublic ? '✅ Yes' : '❌ No'}`)
        console.log(`      Owner: ${isOwner ? `✅ Yes (${user.email})` : `❌ No (${doc.createdBy.email})`}`)
        console.log(`      Access Groups: [${doc.accessGroups.join(', ')}]`)
        console.log(`\n      Access Check:`)
        console.log(`         - Is Owner: ${isOwner ? '✅' : '❌'}`)
        console.log(`         - Is Public: ${isPublic ? '✅' : '❌'}`)
        console.log(`         - Group Name Match (${user.group?.name}): ${hasGroupAccess ? '✅' : '❌'}`)
        console.log(`         - Group ID Match (${user.groupId}): ${hasGroupIdAccess ? '✅' : '❌'}`)
        console.log(`         - Role Match: ${hasRoleAccess ? '✅' : '❌'}`)
        console.log(`\n      ➜ CAN ACCESS: ${canAccess ? '✅ YES' : '❌ NO'}`)
        
        if (!canAccess) {
          console.log(`\n      🔧 TO FIX: Add one of these to document accessGroups:`)
          console.log(`         - "${user.group?.name}" (user's group name)`)
          console.log(`         - "${user.groupId}" (user's group ID)`)
          if (user.userRoles.length > 0) {
            console.log(`         - OR one of user's roles: ${user.userRoles.map(ur => `"${ur.role.name}"`).join(', ')}`)
          }
          console.log(`         - OR set isPublic = true`)
        }
        console.log('')
      })
    }
    
    // 3. Summary
    console.log('\n📊 SUMMARY:')
    console.log('=' .repeat(80))
    
    const accessibleDocs = publishedDocs.filter(doc => {
      const isOwner = doc.createdById === user.id
      const isPublic = doc.isPublic
      const hasGroupAccess = doc.accessGroups.includes(user.group?.name || '')
      const hasGroupIdAccess = doc.accessGroups.includes(user.groupId || '')
      const hasRoleAccess = doc.accessGroups.some(ag => 
        user.userRoles.some(ur => ur.role.name === ag)
      )
      return isOwner || isPublic || hasGroupAccess || hasGroupIdAccess || hasRoleAccess
    })
    
    const restrictedDocs = publishedDocs.filter(doc => {
      const isOwner = doc.createdById === user.id
      const isPublic = doc.isPublic
      const hasGroupAccess = doc.accessGroups.includes(user.group?.name || '')
      const hasGroupIdAccess = doc.accessGroups.includes(user.groupId || '')
      const hasRoleAccess = doc.accessGroups.some(ag => 
        user.userRoles.some(ur => ur.role.name === ag)
      )
      return !(isOwner || isPublic || hasGroupAccess || hasGroupIdAccess || hasRoleAccess)
    })
    
    console.log(`   Total Published Documents: ${publishedDocs.length}`)
    console.log(`   Accessible: ${accessibleDocs.length} ✅`)
    console.log(`   Restricted: ${restrictedDocs.length} ❌`)
    
    if (restrictedDocs.length > 0) {
      console.log(`\n   ⚠️ RESTRICTED DOCUMENTS:`)
      restrictedDocs.forEach(doc => {
        console.log(`      - "${doc.title}"`)
        console.log(`        Access Groups: [${doc.accessGroups.join(', ')}]`)
        console.log(`        User needs one of: ${user.group?.name}, ${user.groupId}, or public access`)
      })
      
      console.log(`\n   💡 SOLUTIONS:`)
      console.log(`      Option 1: Add "${user.group?.name}" to document's accessGroups`)
      console.log(`      Option 2: Set document's isPublic = true`)
      console.log(`      Option 3: Assign user a role that's in document's accessGroups`)
    }
    
    // Check for missing capabilities
    if (!hasDocumentRead && !hasDocumentView) {
      console.log(`\n   ⚠️ WARNING: User lacks document viewing capabilities!`)
      console.log(`      User needs DOCUMENT_READ or DOCUMENT_VIEW capability`)
      console.log(`      Even with access groups, user may not be able to view documents`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkFinanceAccess()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
