const { PrismaClient } = require('@prisma/client');

async function addPdfPermissionsToAllRoles() {
    const prisma = new PrismaClient();
    
    try {
        console.log('🔧 Adding PDF permissions to all organizational roles...\n');
        
        // Get all organizational roles
        const orgRoles = await prisma.role.findMany({
            where: {
                OR: [
                    { name: { startsWith: 'org_' } },
                    { name: { in: ['viewer', 'admin', 'administrator'] } }
                ]
            }
        });
        
        console.log(`Found ${orgRoles.length} organizational roles:`);
        orgRoles.forEach(role => console.log(`- ${role.name} (${role.displayName})`));
        
        // Get all PDF-related permissions
        const pdfPermissions = await prisma.permission.findMany({
            where: {
                OR: [
                    { name: { contains: 'pdf' } },
                    { name: { contains: 'document' } }
                ]
            }
        });
        
        console.log(`\nFound ${pdfPermissions.length} PDF/document permissions:`);
        pdfPermissions.forEach(perm => console.log(`- ${perm.name}`));
        
        // Add all permissions to all roles
        for (const role of orgRoles) {
            console.log(`\n🔧 Adding permissions to role: ${role.name}`);
            
            for (const permission of pdfPermissions) {
                try {
                    await prisma.rolePermission.upsert({
                        where: {
                            roleId_permissionId: {
                                roleId: role.id,
                                permissionId: permission.id
                            }
                        },
                        update: {
                            isGranted: true
                        },
                        create: {
                            roleId: role.id,
                            permissionId: permission.id,
                            isGranted: true
                        }
                    });
                    console.log(`  ✅ Added: ${permission.name}`);
                } catch (error) {
                    console.log(`  ⚠��  Skipped: ${permission.name} (already exists)`);
                }
            }
        }
        
        console.log('\n🎉 All PDF permissions added successfully!');
        
        // Verify permissions for each role
        console.log('\n📊 Verification - Permissions per role:');
        console.log('==========================================');
        
        for (const role of orgRoles) {
            const roleWithPermissions = await prisma.role.findUnique({
                where: { id: role.id },
                include: {
                    rolePermissions: {
                        include: {
                            permission: true
                        }
                    }
                }
            });
            
            const pdfPerms = roleWithPermissions.rolePermissions
                .filter(rp => rp.permission.name.includes('pdf') || rp.permission.name.includes('document'))
                .map(rp => rp.permission.name);
                
            console.log(`\n👔 ${role.name} (${role.displayName}):`);
            console.log(`📄 PDF Permissions: ${pdfPerms.length}`);
            console.log(`   ${pdfPerms.slice(0, 5).join(', ')}${pdfPerms.length > 5 ? '...' : ''}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

addPdfPermissionsToAllRoles();