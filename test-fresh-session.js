const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function testFreshLoginSession() {
    const prisma = new PrismaClient();
    
    try {
        console.log('🧪 Testing fresh login session simulation...\n');
        
        // Simulate the exact process NextAuth does
        const email = 'manager@dsm.com';
        const password = 'manager123';
        
        console.log(`🔍 Testing login for: ${email}`);
        
        // Step 1: Authenticate user (like credentials provider)
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
              passwordHash: true,
              groupId: true,
              divisiId: true,
              isActive: true,
              group: true,
              divisi: true,
              userRoles: {
                where: { isActive: true },
                select: {
                  role: {
                    select: {
                      id: true,
                      name: true,
                      displayName: true
                    }
                  }
                }
              }
            }
        });
        
        if (!user) {
            console.log('❌ User not found');
            return;
        }
        
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            console.log('❌ Invalid password');
            return;
        }
        
        console.log('✅ Authentication successful');
        console.log(`👤 User: ${user.firstName} ${user.lastName}`);
        console.log(`👔 Primary Role: ${user.userRoles?.[0]?.role?.name}`);
        
        // Step 2: Load permissions (like JWT callback)
        console.log('\n🔐 Loading permissions for JWT token...');
        const userWithPermissions = await prisma.user.findUnique({
            where: { email },
            include: {
              userRoles: {
                where: { isActive: true },
                include: {
                  role: {
                    include: {
                      rolePermissions: {
                        include: {
                          permission: true
                        }
                      }
                    }
                  }
                }
              }
            }
        });
        
        if (userWithPermissions) {
            const permissions = userWithPermissions.userRoles.flatMap(userRole => 
              userRole.role.rolePermissions.map(rp => rp.permission.name)
            );
            
            console.log(`✅ Total permissions loaded: ${permissions.length}`);
            
            const pdfPermissions = permissions.filter(p => p.includes('pdf') || p.includes('download'));
            console.log(`📄 PDF/Download permissions: ${pdfPermissions.length}`);
            console.log(`   ${pdfPermissions.join(', ')}`);
            
            // Check specific permissions
            const hasDownload = permissions.includes('pdf.download');
            const hasDocDownload = permissions.includes('documents.download');
            console.log(`\n🔑 Key permissions:`);
            console.log(`   pdf.download: ${hasDownload ? '✅' : '❌'}`);
            console.log(`   documents.download: ${hasDocDownload ? '✅' : '❌'}`);
            
            // Step 3: Simulate session creation
            console.log('\n📋 Simulated session object:');
            const simulatedSession = {
                user: {
                    id: user.id,
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`,
                    role: user.userRoles?.[0]?.role?.name,
                    permissions: permissions
                }
            };
            
            console.log(JSON.stringify(simulatedSession, null, 2));
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testFreshLoginSession();