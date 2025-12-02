// DATABASE ROLES (from audit-database-roles.js output)
const dbRoles = [
  'admin', 'editor', 'org_dirut', 'viewer', 'org_administrator', 'org_dewas', 
  'org_ppd', 'org_komite_audit', 'org_kadiv', 'org_gm', 'org_finance', 
  'org_hrd', 'org_manager', 'org_supervisor', 'org_sekretaris', 'org_staff', 'org_guest'
];

// CODE ROLES (from audit-code-roles.js output)
const codeRoles = [
  'admin', 'admin_email', 'administrator', 'dewas', 'dirut', 'editor', 'gm', 
  'guest', 'kadiv', 'komite_audit', 'manager', 'org_', 'org_administrator', 
  'org_dewas', 'org_dirut', 'org_finance', 'org_gm', 'org_guest', 'org_hrd', 
  'org_kadiv', 'org_komite_audit', 'org_manager', 'org_ppd', 'org_sekretaris', 
  'org_staff', 'org_supervisor', 'ppd', 'reviewer', 'viewer'
];

function analyzeRoleConsistency() {
  console.log('🔍 ROLE CONSISTENCY ANALYSIS');
  console.log('='.repeat(60));
  
  // Filter out non-role entries from code
  const filteredCodeRoles = codeRoles.filter(role => 
    !['admin_email', 'org_'].includes(role)
  );
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`Database Roles: ${dbRoles.length}`);
  console.log(`Code Roles (filtered): ${filteredCodeRoles.length}`);
  
  // Find roles in database but not in code
  const onlyInDb = dbRoles.filter(role => !filteredCodeRoles.includes(role));
  console.log(`\n❌ ROLES IN DATABASE BUT NOT USED IN CODE (${onlyInDb.length}):`);
  onlyInDb.forEach(role => console.log(`   - ${role}`));
  
  // Find roles in code but not in database
  const onlyInCode = filteredCodeRoles.filter(role => !dbRoles.includes(role));
  console.log(`\n⚠️  ROLES IN CODE BUT NOT IN DATABASE (${onlyInCode.length}):`);
  onlyInCode.forEach(role => console.log(`   - ${role}`));
  
  // Find matching roles
  const matching = dbRoles.filter(role => filteredCodeRoles.includes(role));
  console.log(`\n✅ MATCHING ROLES (${matching.length}):`);
  matching.forEach(role => console.log(`   - ${role}`));
  
  // Legacy vs new role mapping analysis
  console.log(`\n🔄 LEGACY vs NEW ROLE MAPPING:`);
  
  const legacyMappings = {
    'administrator': 'admin',
    'dirut': 'org_dirut',
    'gm': 'org_gm', 
    'kadiv': 'org_kadiv',
    'ppd': 'org_ppd',
    'manager': 'org_manager',
    'dewas': 'org_dewas',
    'komite_audit': 'org_komite_audit',
    'guest': 'org_guest'
  };
  
  Object.entries(legacyMappings).forEach(([legacy, modern]) => {
    const legacyInCode = filteredCodeRoles.includes(legacy);
    const modernInDb = dbRoles.includes(modern);
    const modernInCode = filteredCodeRoles.includes(modern);
    
    console.log(`   ${legacy} → ${modern}`);
    console.log(`     Legacy in code: ${legacyInCode ? '✅' : '❌'}`);
    console.log(`     Modern in DB: ${modernInDb ? '✅' : '❌'}`);
    console.log(`     Modern in code: ${modernInCode ? '✅' : '❌'}`);
    
    if (legacyInCode && modernInDb) {
      console.log(`     🔧 NEEDS MIGRATION: Update ${legacy} to ${modern} in code`);
    }
    console.log('');
  });
  
  // Issues and recommendations
  console.log(`\n📋 ISSUES & RECOMMENDATIONS:`);
  
  if (onlyInCode.length > 0) {
    console.log(`1. 🚨 CRITICAL: ${onlyInCode.length} roles used in code but missing from database`);
    console.log(`   Action: Create missing roles in database or update code to use correct role names`);
  }
  
  if (onlyInDb.length > 0) {
    console.log(`2. ⚠️  WARNING: ${onlyInDb.length} roles in database but not used in code`);
    console.log(`   Action: Either use these roles in code or remove if obsolete`);
  }
  
  const legacyInUse = Object.keys(legacyMappings).filter(legacy => 
    filteredCodeRoles.includes(legacy)
  );
  
  if (legacyInUse.length > 0) {
    console.log(`3. 🔄 MIGRATION NEEDED: ${legacyInUse.length} legacy role names still in use`);
    console.log(`   Legacy roles to update: ${legacyInUse.join(', ')}`);
    console.log(`   Action: Replace with modern role names (org_ prefix)`);
  }
  
  // Special cases
  if (filteredCodeRoles.includes('reviewer')) {
    console.log(`4. ❓ UNDEFINED: 'reviewer' role used in code but not defined anywhere`);
    console.log(`   Action: Define reviewer role in database or remove from code`);
  }
  
  console.log(`\n🎯 CONSISTENCY SCORE: ${matching.length}/${Math.max(dbRoles.length, filteredCodeRoles.length)} (${Math.round(matching.length / Math.max(dbRoles.length, filteredCodeRoles.length) * 100)}%)`);
}

analyzeRoleConsistency();