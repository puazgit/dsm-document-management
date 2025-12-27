import * as LucideIcons from 'lucide-react'

console.log('🔍 Testing Lucide Icon Import...\n')

// Test if LayoutDashboard exists
const LayoutDashboard = (LucideIcons as any)['LayoutDashboard']

console.log('📋 Icon Check:')
console.log(`   LayoutDashboard exists: ${!!LayoutDashboard}`)
console.log(`   Type: ${typeof LayoutDashboard}`)

if (LayoutDashboard) {
  console.log('   ✅ LayoutDashboard is available')
} else {
  console.log('   ❌ LayoutDashboard NOT FOUND')
  
  // Check for similar names
  const allIcons = Object.keys(LucideIcons)
  const dashboardIcons = allIcons.filter(name => 
    name.toLowerCase().includes('dashboard')
  )
  
  console.log('\n🔍 Available dashboard-related icons:')
  dashboardIcons.forEach(name => {
    console.log(`   • ${name}`)
  })
}

// Test other common icons
console.log('\n📋 Testing other icons:')
const testIcons = ['FileText', 'Users', 'Shield', 'Settings', 'BarChart3']

testIcons.forEach(iconName => {
  const icon = (LucideIcons as any)[iconName]
  console.log(`   ${iconName}: ${icon ? '✅' : '❌'}`)
})

// List all available icons (first 20)
console.log('\n📋 Sample of available icons (first 20):')
const allIcons = Object.keys(LucideIcons).filter(key => {
  const value = (LucideIcons as any)[key]
  return typeof value === 'function' && key[0] === key[0].toUpperCase()
})

allIcons.slice(0, 20).forEach(name => {
  console.log(`   • ${name}`)
})

console.log(`\n   Total icons available: ${allIcons.length}`)
