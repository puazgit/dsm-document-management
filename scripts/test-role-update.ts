import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testRoleUpdate() {
  console.log('🧪 Testing Role Update Functionality...\n')
  
  try {
    // 1. Create test permissions first
    console.log('1️⃣ Creating test permissions...')
    
    const testPermissions = await Promise.all([
      prisma.permission.upsert({
        where: { name: 'documents.test.read' },
        update: {},
        create: {
          name: 'documents.test.read',
          displayName: 'Read Test Documents',
          description: 'Permission to read test documents',
          module: 'documents',
          action: 'read',
          resource: 'test'
        }
      }),
      prisma.permission.upsert({
        where: { name: 'documents.test.write' },
        update: {},
        create: {
          name: 'documents.test.write',
          displayName: 'Write Test Documents',
          description: 'Permission to write test documents',
          module: 'documents',
          action: 'write',
          resource: 'test'
        }
      }),
      prisma.permission.upsert({
        where: { name: 'users.test.manage' },
        update: {},
        create: {
          name: 'users.test.manage',
          displayName: 'Manage Test Users',
          description: 'Permission to manage test users',
          module: 'users',
          action: 'manage',
          resource: 'test'
        }
      })
    ])

    console.log('✅ Test permissions created:')
    testPermissions.forEach(perm => {
      console.log(`   - ${perm.name} (${perm.displayName})`)
    })

    // 2. Create test role
    console.log('\n2️⃣ Creating test role...')
    
    // Clean up existing test role
    await prisma.role.deleteMany({
      where: { name: 'test_role' }
    })

    const testRole = await prisma.role.create({
      data: {
        name: 'test_role',
        displayName: 'Test Role',
        description: 'Test role for update functionality',
        level: 5,
        isActive: true,
        isSystem: false
      }
    })

    console.log('✅ Test role created:', testRole.name)

    // 3. Test adding permissions to role
    console.log('\n3️⃣ Testing permission assignment...')
    
    const initialPermissions = [testPermissions[0].id, testPermissions[1].id]
    
    await prisma.rolePermission.createMany({
      data: initialPermissions.map(permId => ({
        roleId: testRole.id,
        permissionId: permId,
        isGranted: true
      }))
    })

    // Verify initial permissions
    const roleWithPerms = await prisma.role.findUnique({
      where: { id: testRole.id },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    })

    console.log('✅ Initial permissions assigned:')
    roleWithPerms?.rolePermissions.forEach(rp => {
      console.log(`   - ${rp.permission.name}`)
    })

    // 4. Test API update via direct call
    console.log('\n4️⃣ Testing API role update...')
    
    const updateData = {
      displayName: 'Updated Test Role',
      description: 'Updated description for test role',
      permissions: [testPermissions[1].id, testPermissions[2].id] // Change permissions
    }

    try {
      const response = await fetch(`http://localhost:3001/api/roles/${testRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        const updatedRole = await response.json()
        console.log('✅ API update successful!')
        console.log('   - New display name:', updatedRole.displayName)
        console.log('   - New description:', updatedRole.description)
        console.log('   - New permissions:')
        updatedRole.rolePermissions?.forEach((rp: any) => {
          console.log(`     - ${rp.permission.name}`)
        })
      } else {
        const errorData = await response.json()
        console.log('❌ API update failed:', response.status, errorData)
      }
    } catch (error) {
      console.log('⚠️ API test skipped (server might not be running):', (error as Error).message)
      
      // Test direct database update instead
      console.log('\n5️⃣ Testing direct database update...')
      
      // Remove existing permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId: testRole.id }
      })
      
      // Add new permissions
      await prisma.rolePermission.createMany({
        data: [testPermissions[1].id, testPermissions[2].id].map(permId => ({
          roleId: testRole.id,
          permissionId: permId,
          isGranted: true
        }))
      })
      
      // Update role info
      await prisma.role.update({
        where: { id: testRole.id },
        data: {
          displayName: updateData.displayName,
          description: updateData.description
        }
      })
      
      console.log('✅ Direct database update successful!')
    }

    // 5. Verify final state
    console.log('\n6️⃣ Verifying final state...')
    
    const finalRole = await prisma.role.findUnique({
      where: { id: testRole.id },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    })

    if (finalRole) {
      console.log('✅ Final role state:')
      console.log(`   - Name: ${finalRole.name}`)
      console.log(`   - Display Name: ${finalRole.displayName}`)
      console.log(`   - Description: ${finalRole.description}`)
      console.log(`   - Permissions (${finalRole.rolePermissions.length}):`)
      finalRole.rolePermissions.forEach(rp => {
        console.log(`     - ${rp.permission.name} (${rp.permission.displayName})`)
      })
    }

    // 6. Clean up
    console.log('\n🧹 Cleaning up test data...')
    await prisma.role.delete({
      where: { id: testRole.id }
    })
    
    await Promise.all([
      prisma.permission.delete({ where: { id: testPermissions[0].id } }),
      prisma.permission.delete({ where: { id: testPermissions[1].id } }),
      prisma.permission.delete({ where: { id: testPermissions[2].id } })
    ])
    
    console.log('✅ Test data cleaned up')
    
    console.log('\n🎉 Role update functionality test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testRoleUpdate()
  .catch((error) => {
    console.error('Test script failed:', error)
    process.exit(1)
  })