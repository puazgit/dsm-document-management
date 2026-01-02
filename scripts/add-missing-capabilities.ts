#!/usr/bin/env tsx
/**
 * Add Missing Capabilities to Database
 * 
 * Adds capabilities that were defined in useCapabilities hook
 * but not yet in the database.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const missingCapabilities = [
  {
    name: 'DOCUMENT_DOWNLOAD',
    description: 'Permission to download documents',
    category: 'document'
  },
  {
    name: 'DOCUMENT_COMMENT',
    description: 'Permission to add comments to documents',
    category: 'document'
  },
  {
    name: 'USER_DELETE',
    description: 'Permission to delete user accounts',
    category: 'user'
  },
  {
    name: 'ROLE_VIEW',
    description: 'Permission to view roles and their configurations',
    category: 'role'
  }
]

async function main() {
  console.log('\n🔧 Adding Missing Capabilities to Database\n')

  for (const cap of missingCapabilities) {
    try {
      const existing = await prisma.roleCapability.findUnique({
        where: { name: cap.name }
      })

      if (existing) {
        console.log(`⏭️  ${cap.name} - Already exists`)
        continue
      }

      const created = await prisma.roleCapability.create({
        data: cap
      })

      console.log(`✅ ${cap.name} - Created`)
    } catch (error) {
      console.log(`❌ ${cap.name} - Failed: ${error}`)
    }
  }

  console.log('\n📋 Assigning Capabilities to Roles\n')

  // Assign to admin role
  const adminRole = await prisma.role.findUnique({
    where: { name: 'admin' },
    include: {
      capabilityAssignments: {
        include: { capability: true }
      }
    }
  })

  if (adminRole) {
    for (const capName of ['DOCUMENT_DOWNLOAD', 'DOCUMENT_COMMENT', 'USER_DELETE', 'ROLE_VIEW']) {
      const capability = await prisma.roleCapability.findUnique({
        where: { name: capName }
      })

      if (!capability) continue

      const exists = adminRole.capabilityAssignments.some(
        ca => ca.capability.name === capName
      )

      if (exists) {
        console.log(`⏭️  admin → ${capName} - Already assigned`)
        continue
      }

      try {
        await prisma.roleCapabilityAssignment.create({
          data: {
            roleId: adminRole.id,
            capabilityId: capability.id
          }
        })
        console.log(`✅ admin → ${capName} - Assigned`)
      } catch (error) {
        console.log(`❌ admin → ${capName} - Failed: ${error}`)
      }
    }
  }

  // Assign DOCUMENT_DOWNLOAD to manager, editor
  for (const roleName of ['manager', 'editor']) {
    const role = await prisma.role.findUnique({
      where: { name: roleName },
      include: {
        capabilityAssignments: {
          include: { capability: true }
        }
      }
    })

    if (!role) continue

    const capability = await prisma.roleCapability.findUnique({
      where: { name: 'DOCUMENT_DOWNLOAD' }
    })

    if (!capability) continue

    const exists = role.capabilityAssignments.some(
      ca => ca.capability.name === 'DOCUMENT_DOWNLOAD'
    )

    if (exists) {
      console.log(`⏭️  ${roleName} → DOCUMENT_DOWNLOAD - Already assigned`)
      continue
    }

    try {
      await prisma.roleCapabilityAssignment.create({
        data: {
          roleId: role.id,
          capabilityId: capability.id
        }
      })
      console.log(`✅ ${roleName} → DOCUMENT_DOWNLOAD - Assigned`)
    } catch (error) {
      console.log(`❌ ${roleName} → DOCUMENT_DOWNLOAD - Failed: ${error}`)
    }
  }

  // Assign DOCUMENT_COMMENT to editor, manager
  for (const roleName of ['editor', 'manager']) {
    const role = await prisma.role.findUnique({
      where: { name: roleName },
      include: {
        capabilityAssignments: {
          include: { capability: true }
        }
      }
    })

    if (!role) continue

    const capability = await prisma.roleCapability.findUnique({
      where: { name: 'DOCUMENT_COMMENT' }
    })

    if (!capability) continue

    const exists = role.capabilityAssignments.some(
      ca => ca.capability.name === 'DOCUMENT_COMMENT'
    )

    if (exists) {
      console.log(`⏭️  ${roleName} → DOCUMENT_COMMENT - Already assigned`)
      continue
    }

    try {
      await prisma.roleCapabilityAssignment.create({
        data: {
          roleId: role.id,
          capabilityId: capability.id
        }
      })
      console.log(`✅ ${roleName} → DOCUMENT_COMMENT - Assigned`)
    } catch (error) {
      console.log(`❌ ${roleName} → DOCUMENT_COMMENT - Failed: ${error}`)
    }
  }

  console.log('\n✅ Done! Missing capabilities added and assigned.\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
