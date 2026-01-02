import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getAllPermissions() {
  console.log('🔍 Fetching all permissions from database...\n');
  
  const permissions = await prisma.permission.findMany({
    select: {
      name: true,
      displayName: true,
      module: true,
      action: true,
      resource: true,
    },
    orderBy: [
      { module: 'asc' },
      { action: 'asc' },
    ],
  });

  console.log(`Found ${permissions.length} permissions:\n`);
  
  // Group by module
  const byModule: Record<string, typeof permissions> = {};
  permissions.forEach(p => {
    if (!byModule[p.module]) {
      byModule[p.module] = [];
    }
    byModule[p.module]!.push(p);
  });

  // Display grouped
  Object.keys(byModule).sort().forEach(module => {
    const modulePerms = byModule[module];
    if (modulePerms) {
      console.log(`\n📦 ${module.toUpperCase()} (${modulePerms.length} permissions):`);
      modulePerms.forEach(p => {
        console.log(`   - ${p.name.padEnd(30)} → ${p.displayName}`);
      });
    }
  });

  // Export as JSON for mapping task
  const exportData = permissions.map(p => ({
    permission: p.name,
    module: p.module,
    action: p.action,
    displayName: p.displayName,
  }));

  console.log('\n\n📄 JSON Export for mapping:');
  console.log(JSON.stringify(exportData, null, 2));
}

getAllPermissions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
