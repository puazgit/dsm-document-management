import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Updating all navigation icons to proper Lucide names...\n')
  
  // Define correct icon mappings
  const iconUpdates = [
    { name: 'Dashboard', icon: 'LayoutDashboard' },
    { name: 'Documents', icon: 'FileText' },
    { name: 'Analytics', icon: 'BarChart3' },
    { name: 'Admin', icon: 'Settings' },
    { name: 'User Management', icon: 'Users' },
    { name: 'Role Management', icon: 'Shield' },
    { name: 'Permission Management', icon: 'Key' },
    { name: 'Organization', icon: 'Building2' },
    { name: 'Group Management', icon: 'Users' },
    { name: 'Audit Logs', icon: 'Activity' },
    { name: 'RBAC Management', icon: 'Shield' },
    { name: 'Resources', icon: 'Database' },
    { name: 'Assignments', icon: 'UserCheck' },
  ]
  
  for (const { name, icon } of iconUpdates) {
    const result = await prisma.resource.updateMany({
      where: {
        type: 'navigation',
        name: name
      },
      data: {
        icon: icon
      }
    })
    
    if (result.count > 0) {
      console.log(`✅ Updated "${name}" → ${icon}`)
    } else {
      console.log(`ℹ️  "${name}" not found (may not exist)`)
    }
  }
  
  // Verify all navigation items
  console.log('\n📋 Current Navigation Icons:\n')
  
  const navItems = await prisma.resource.findMany({
    where: {
      type: 'navigation',
      isActive: true
    },
    orderBy: {
      sortOrder: 'asc'
    },
    select: {
      name: true,
      icon: true,
      path: true
    }
  })
  
  navItems.forEach(item => {
    const iconDisplay = item.icon || '(null)'
    const status = item.icon && item.icon[0] === item.icon[0].toUpperCase() ? '✅' : '⚠️ '
    console.log(`${status} ${item.name.padEnd(30)} ${iconDisplay}`)
  })
  
  console.log('\n✅ Icon update complete!')
  console.log('💡 Please hard refresh your browser (Cmd+Shift+R / Ctrl+Shift+R)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
