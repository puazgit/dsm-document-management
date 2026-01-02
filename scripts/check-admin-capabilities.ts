#!/usr/bin/env tsx
/**
 * Check Admin Capabilities
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n🔍 Checking admin@dsm.com capabilities...\n')

  const user = await prisma.user.findUnique({
    where: { email: 'admin@dsm.com' },
    include: {
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
    console.log('❌ User not found')
    return
  }

  console.log(`👤 User: ${user.email}`)
  console.log(`   Name: ${user.firstName} ${user.lastName}`)
  console.log(`📋 Roles: ${user.userRoles.map(ur => ur.role.displayName).join(', ')}`)

  const capabilities = user.userRoles.flatMap(ur =>
    ur.role.capabilityAssignments.map(ca => ({
      name: ca.capability.name,
      description: ca.capability.description,
      category: ca.capability.category
    }))
  )

  const uniqueCapabilities = Array.from(
    new Map(capabilities.map(c => [c.name, c])).values()
  ).sort((a, b) => a.name.localeCompare(b.name))

  console.log(`\n🔑 Capabilities (${uniqueCapabilities.length}):\n`)
  
  const hasDashboardView = uniqueCapabilities.find(c => c.name === 'DASHBOARD_VIEW')
  
  for (const cap of uniqueCapabilities) {
    const marker = cap.name === 'DASHBOARD_VIEW' ? '⭐' : '  '
    console.log(`${marker} • ${cap.name}`)
    if (cap.description) {
      console.log(`      ${cap.description}`)
    }
  }

  if (hasDashboardView) {
    console.log(`\n✅ DASHBOARD_VIEW capability is assigned!`)
  } else {
    console.log(`\n❌ DASHBOARD_VIEW capability is NOT assigned!`)
  }
}

main()
  .then(() => {
    console.log('\n✅ Check complete\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
