import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Wait for server to be ready
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function testRoleUpdateAPI() {
  console.log('🧪 Testing Role Update API with Server Running...\n')
  
  await delay(2000) // Wait for server to fully start
  
  try {
    // 1. Create test permissions first
    console.log('1️⃣ Creating test permissions...')
    
    const testPermissions = await Promise.all([
      prisma.permission.upsert({
        where: { name: 'api.test.read' },
        update: {},
        create: {
          name: 'api.test.read',
          displayName: 'API Test Read',
          description: 'Permission to read via API test',
          module: 'api',
          action: 'read',
          resource: 'test'
        }
      }),
      prisma.permission.upsert({
        where: { name: 'api.test.write' },
        update: {},
        create: {
          name: 'api.test.write',
          displayName: 'API Test Write',
          description: 'Permission to write via API test',
          module: 'api',
          action: 'write',
          resource: 'test'
        }
      }),
      prisma.permission.upsert({
        where: { name: 'api.test.delete' },
        update: {},
        create: {
          name: 'api.test.delete',
          displayName: 'API Test Delete',
          description: 'Permission to delete via API test',
          module: 'api',
          action: 'delete',
          resource: 'test'
        }
      })
    ])

    console.log('✅ Test permissions created:')
    testPermissions.forEach(perm => {
      console.log(`   - ${perm.name} (${perm.displayName})`)
    })

    // 2. Create test role via API
    console.log('\n2️⃣ Creating test role via API...')
    
    const createRoleData = {
      name: 'api_test_role',
      displayName: 'API Test Role',
      description: 'Test role created via API',
      level: 3,
      permissions: [testPermissions[0].id] // Start with one permission
    }

    const createResponse = await fetch('http://localhost:3001/api/roles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createRoleData)
    })

    if (!createResponse.ok) {
      const errorData = await createResponse.json()
      console.log('❌ Role creation failed:', createResponse.status, errorData)
      throw new Error('Failed to create role')
    }

    const createdRole = await createResponse.json()
    console.log('✅ Role created via API:')
    console.log(`   - ID: ${createdRole.id}`)
    console.log(`   - Name: ${createdRole.name}`)
    console.log(`   - Display Name: ${createdRole.displayName}`)
    console.log(`   - Initial permissions: ${createdRole.rolePermissions?.length || 0}`)

    // 3. Test role update via API
    console.log('\n3️⃣ Testing role update via API...')
    
    const updateData = {
      displayName: 'Updated API Test Role',
      description: 'Updated description via API test',
      level: 4,
      permissions: [testPermissions[1].id, testPermissions[2].id] // Change to different permissions
    }

    const updateResponse = await fetch(`http://localhost:3001/api/roles/${createdRole.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    })

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json()
      console.log('❌ Role update failed:', updateResponse.status)
      console.log('Error details:', JSON.stringify(errorData, null, 2))
      throw new Error('Failed to update role')
    }

    const updatedRole = await updateResponse.json()
    console.log('✅ Role updated via API:')
    console.log(`   - Display Name: ${updatedRole.displayName}`)
    console.log(`   - Description: ${updatedRole.description}`)
    console.log(`   - Level: ${updatedRole.level}`)
    console.log(`   - Permissions (${updatedRole.rolePermissions?.length || 0}):`)
    updatedRole.rolePermissions?.forEach((rp: any) => {
      console.log(`     - ${rp.permission.name} (${rp.permission.displayName})`)
    })

    // 4. Test get single role via API
    console.log('\n4️⃣ Testing get role via API...')
    
    const getResponse = await fetch(`http://localhost:3001/api/roles/${createdRole.id}`)
    
    if (!getResponse.ok) {
      console.log('❌ Get role failed:', getResponse.status)
      throw new Error('Failed to get role')
    }

    const fetchedRole = await getResponse.json()
    console.log('✅ Role fetched via API:')
    console.log(`   - Name: ${fetchedRole.name}`)
    console.log(`   - Display Name: ${fetchedRole.displayName}`)
    console.log(`   - Permissions (${fetchedRole.rolePermissions?.length || 0}):`)
    fetchedRole.rolePermissions?.forEach((rp: any) => {
      console.log(`     - ${rp.permission.name}`)
    })

    // 5. Test list roles via API
    console.log('\n5️⃣ Testing list roles via API...')
    
    const listResponse = await fetch('http://localhost:3001/api/roles')
    
    if (!listResponse.ok) {
      console.log('❌ List roles failed:', listResponse.status)
      throw new Error('Failed to list roles')
    }

    const allRoles = await listResponse.json()
    const ourTestRole = allRoles.find((role: any) => role.id === createdRole.id)
    
    console.log(`✅ Found ${allRoles.length} total roles`)
    console.log('✅ Our test role in list:')
    console.log(`   - Name: ${ourTestRole.name}`)
    console.log(`   - Display Name: ${ourTestRole.displayName}`)

    // 6. Clean up via API
    console.log('\n6️⃣ Cleaning up via API...')
    
    const deleteResponse = await fetch(`http://localhost:3001/api/roles/${createdRole.id}`, {
      method: 'DELETE'
    })

    if (!deleteResponse.ok) {
      console.log('❌ Delete role failed:', deleteResponse.status)
    } else {
      console.log('✅ Role deleted via API')
    }

    // Clean up test permissions
    await Promise.all([
      prisma.permission.delete({ where: { id: testPermissions[0].id } }),
      prisma.permission.delete({ where: { id: testPermissions[1].id } }),
      prisma.permission.delete({ where: { id: testPermissions[2].id } })
    ])
    
    console.log('✅ Test permissions cleaned up')
    
    console.log('\n🎉 All API tests completed successfully!')
    
  } catch (error) {
    console.error('❌ API Test failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testRoleUpdateAPI()
  .catch((error) => {
    console.error('API test script failed:', error)
    process.exit(1)
  })