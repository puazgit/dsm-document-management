import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface PermissionUsage {
  file: string;
  lineNumber: number;
  line: string;
  type: 'permission_string' | 'permission_check' | 'prisma_query' | 'session_property';
}

async function auditPermissionUsage() {
  console.log('🔍 Auditing Permission System Usage\n');
  console.log('=' .repeat(80));
  
  const usages: PermissionUsage[] = [];
  const srcDir = path.join(process.cwd(), 'src');
  
  // Patterns to search
  const patterns = [
    { pattern: 'session.user.permissions', type: 'session_property' as const },
    { pattern: 'session?.user?.permissions', type: 'session_property' as const },
    { pattern: 'permissions?.includes', type: 'permission_check' as const },
    { pattern: 'permissions.includes', type: 'permission_check' as const },
    { pattern: 'prisma.permission', type: 'prisma_query' as const },
    { pattern: 'prisma.rolePermission', type: 'prisma_query' as const },
    { pattern: 'rolePermissions', type: 'prisma_query' as const },
    { pattern: 'permission.name', type: 'permission_string' as const },
  ];

  console.log('\n📋 Searching for permission usage patterns...\n');

  for (const { pattern, type } of patterns) {
    try {
      const result = execSync(
        `grep -rn "${pattern}" ${srcDir} --include="*.ts" --include="*.tsx" 2>/dev/null || true`,
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );

      if (result) {
        const lines = result.trim().split('\n');
        for (const line of lines) {
          const match = line.match(/^(.+):(\d+):(.+)$/);
          if (match && match[1] && match[2] && match[3]) {
            const [, file, lineNum, content] = match;
            usages.push({
              file: file.replace(srcDir + '/', ''),
              lineNumber: parseInt(lineNum, 10),
              line: content.trim(),
              type,
            });
          }
        }
      }
    } catch (error) {
      // Ignore errors (no matches found)
    }
  }

  // Remove duplicates
  const uniqueUsages = usages.filter((usage, index, self) =>
    index === self.findIndex((u) =>
      u.file === usage.file && u.lineNumber === usage.lineNumber
    )
  );

  // Group by type
  const byType: Record<string, PermissionUsage[]> = {};
  uniqueUsages.forEach(usage => {
    if (!byType[usage.type]) {
      byType[usage.type] = [];
    }
    byType[usage.type]!.push(usage);
  });

  // Display results
  console.log('\n📊 AUDIT RESULTS\n');
  console.log('=' .repeat(80));
  console.log(`Total locations found: ${uniqueUsages.length}\n`);

  // Session Property Usage
  if (byType.session_property) {
    console.log(`\n🔴 SESSION PROPERTY USAGE (${byType.session_property.length} locations)`);
    console.log('These need to be removed - session.user.permissions will be deleted\n');
    byType.session_property.forEach(u => {
      console.log(`   📄 ${u.file}:${u.lineNumber}`);
      console.log(`      ${u.line.substring(0, 100)}${u.line.length > 100 ? '...' : ''}`);
    });
  }

  // Permission Checks
  if (byType.permission_check) {
    console.log(`\n🟡 PERMISSION CHECKS (${byType.permission_check.length} locations)`);
    console.log('These need to be migrated to hasCapability()\n');
    byType.permission_check.forEach(u => {
      console.log(`   📄 ${u.file}:${u.lineNumber}`);
      console.log(`      ${u.line.substring(0, 100)}${u.line.length > 100 ? '...' : ''}`);
    });
  }

  // Prisma Queries
  if (byType.prisma_query) {
    console.log(`\n🔵 PRISMA QUERIES (${byType.prisma_query.length} locations)`);
    console.log('These need to be updated to use RoleCapability\n');
    
    // Group by file
    const byFile: Record<string, PermissionUsage[]> = {};
    byType.prisma_query.forEach(u => {
      if (!byFile[u.file]) byFile[u.file] = [];
      byFile[u.file]!.push(u);
    });

    Object.keys(byFile).sort().forEach(file => {
      const fileUsages = byFile[file];
      if (fileUsages) {
        console.log(`   📄 ${file} (${fileUsages.length} usages)`);
        fileUsages.forEach(u => {
          console.log(`      Line ${u.lineNumber}: ${u.line.substring(0, 80)}${u.line.length > 80 ? '...' : ''}`);
        });
      }
    });
  }

  // Permission String Usage
  if (byType.permission_string) {
    console.log(`\n🟢 PERMISSION STRINGS (${byType.permission_string.length} locations)`);
    console.log('Extract permission strings being used\n');
    
    // Extract unique permission strings from code
    const permissionStrings = new Set<string>();
    byType.permission_string.forEach(u => {
      // Try to extract permission string patterns
      const matches = u.line.match(/['"]([a-z\-]+\.[a-z\-\.]+)['"]/g);
      if (matches) {
        matches.forEach(m => {
          const clean = m.replace(/['"]/g, '');
          if (clean.includes('.')) {
            permissionStrings.add(clean);
          }
        });
      }
    });

    if (permissionStrings.size > 0) {
      console.log('   Found permission strings in code:');
      Array.from(permissionStrings).sort().forEach(p => {
        console.log(`      - ${p}`);
      });
    }
  }

  // Summary
  console.log('\n\n📊 MIGRATION SUMMARY\n');
  console.log('=' .repeat(80));
  console.log(`
Files to Update:
  - Session properties: ${byType.session_property?.length || 0} locations
  - Permission checks: ${byType.permission_check?.length || 0} locations  
  - Prisma queries: ${byType.prisma_query?.length || 0} locations
  - Total unique files: ${new Set(uniqueUsages.map(u => u.file)).size}

Priority Files (most changes needed):
`);

  // Find files with most usages
  const fileUsages: Record<string, number> = {};
  uniqueUsages.forEach(u => {
    fileUsages[u.file] = (fileUsages[u.file] || 0) + 1;
  });

  Object.entries(fileUsages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([file, count]) => {
      console.log(`  ${count.toString().padStart(3)} usages - ${file}`);
    });

  // API Routes that need updating
  console.log('\n\n🔧 API ROUTES TO UPDATE:\n');
  const apiRoutes = uniqueUsages
    .filter(u => u.file.startsWith('app/api/'))
    .map(u => u.file.split('/').slice(0, -1).join('/'))
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();

  apiRoutes.forEach(route => {
    const count = uniqueUsages.filter(u => u.file.startsWith(route)).length;
    console.log(`  - /${route} (${count} usages)`);
  });

  // Hooks to update
  console.log('\n\n🪝 HOOKS TO UPDATE:\n');
  const hooks = uniqueUsages
    .filter(u => u.file.includes('hooks/'))
    .map(u => u.file)
    .filter((v, i, a) => a.indexOf(v) === i);

  hooks.forEach(hook => {
    const count = uniqueUsages.filter(u => u.file === hook).length;
    console.log(`  - ${hook} (${count} usages)`);
  });

  // Components to update
  console.log('\n\n🧩 COMPONENTS TO UPDATE:\n');
  const components = uniqueUsages
    .filter(u => u.file.includes('components/'))
    .map(u => u.file)
    .filter((v, i, a) => a.indexOf(v) === i);

  components.forEach(comp => {
    const count = uniqueUsages.filter(u => u.file === comp).length;
    console.log(`  - ${comp} (${count} usages)`);
  });

  // Generate migration checklist
  console.log('\n\n✅ PHASE 1 TASK 1.2 COMPLETE\n');
  console.log('=' .repeat(80));
  console.log(`
Next Steps:
  1. Review files listed above
  2. Prioritize high-usage files first
  3. Create missing capabilities (Task 1.3)
  4. Begin migration (Phase 2)

Report saved to: docs/PERMISSION_USAGE_AUDIT.md
`);

  // Save detailed report
  const report = generateMarkdownReport(uniqueUsages, byType, fileUsages, apiRoutes, hooks, components);
  fs.writeFileSync('docs/PERMISSION_USAGE_AUDIT.md', report);
  console.log('✅ Detailed audit report generated\n');
}

function generateMarkdownReport(
  usages: PermissionUsage[],
  byType: Record<string, PermissionUsage[]>,
  fileUsages: Record<string, number>,
  apiRoutes: string[],
  hooks: string[],
  components: string[]
): string {
  return `# Permission Usage Audit Report

**Date:** ${new Date().toISOString().split('T')[0]}  
**Phase:** 1.2 - Audit Permission Usage  
**Total Locations:** ${usages.length}

---

## Executive Summary

This report identifies all locations in the codebase that use the legacy Permission system and need migration to the Capability-based system.

### Statistics
- **Session Property Usage:** ${byType.session_property?.length || 0} locations
- **Permission Checks:** ${byType.permission_check?.length || 0} locations
- **Prisma Queries:** ${byType.prisma_query?.length || 0} locations
- **Unique Files:** ${new Set(usages.map(u => u.file)).size}

---

## Files by Priority (Most Changes)

${Object.entries(fileUsages)
  .sort(([, a], [, b]) => b - a)
  .map(([file, count]) => `- **${count} usages** - \`${file}\``)
  .join('\n')}

---

## API Routes to Update (${apiRoutes.length} routes)

${apiRoutes.map(route => {
  const count = usages.filter(u => u.file.startsWith(route)).length;
  return `- [ ] \`/${route}\` (${count} usages)`;
}).join('\n')}

---

## Hooks to Update (${hooks.length} hooks)

${hooks.map(hook => {
  const count = usages.filter(u => u.file === hook).length;
  return `- [ ] \`${hook}\` (${count} usages)`;
}).join('\n')}

---

## Components to Update (${components.length} components)

${components.map(comp => {
  const count = usages.filter(u => u.file === comp).length;
  return `- [ ] \`${comp}\` (${count} usages)`;
}).join('\n')}

---

## Detailed Locations

### Session Property Usage (HIGH PRIORITY)
${byType.session_property?.map(u => 
  `\n#### ${u.file}:${u.lineNumber}\n\`\`\`typescript\n${u.line}\n\`\`\``
).join('\n') || 'None found'}

### Permission Checks
${byType.permission_check?.map(u => 
  `\n#### ${u.file}:${u.lineNumber}\n\`\`\`typescript\n${u.line}\n\`\`\``
).join('\n') || 'None found'}

### Prisma Queries
${byType.prisma_query?.map(u => 
  `\n#### ${u.file}:${u.lineNumber}\n\`\`\`typescript\n${u.line}\n\`\`\``
).join('\n') || 'None found'}

---

*Generated automatically by phase1-task2-audit-permission-usage.ts*
`;
}

auditPermissionUsage().catch(console.error);
