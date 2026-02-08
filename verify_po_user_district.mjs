#!/usr/bin/env node

/**
 * Verify and fix PO user district assignment
 * This script checks if PO users have districts assigned and fixes the issue
 */

import { db } from './server/db.ts';
import { users, schools } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function verifyAndFixPOUsers() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║  PO User District Verification & Fix                      ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  try {
    // Get all PO users
    log('\n🔍 Checking PO users...', 'blue');
    const poUsers = await db.select().from(users).where(eq(users.role, 'PO'));
    
    log(`\n✅ Found ${poUsers.length} PO user(s)`, 'green');
    
    if (poUsers.length === 0) {
      log('\n⚠️  No PO users found in the system', 'yellow');
      return;
    }

    // Get all schools to find available districts
    const allSchools = await db.select().from(schools);
    const districts = [...new Set(allSchools.map(s => s.district).filter(Boolean))];
    
    log(`\n📍 Available districts: ${districts.join(', ')}`, 'cyan');
    
    // Check each PO user
    for (const poUser of poUsers) {
      log(`\n${'─'.repeat(60)}`, 'blue');
      log(`👤 User: ${poUser.username} (ID: ${poUser.id})`, 'cyan');
      log(`   Role: ${poUser.role}`, 'blue');
      log(`   District: ${poUser.district || 'NOT SET'}`, poUser.district ? 'green' : 'red');
      
      if (!poUser.district) {
        log(`\n❌ ISSUE: This PO user has no district assigned!`, 'red');
        log(`   This is why drill-down shows no data.`, 'yellow');
        
        if (districts.length > 0) {
          const firstDistrict = districts[0];
          log(`\n🔧 Fixing: Assigning district '${firstDistrict}'...`, 'yellow');
          
          await db.update(users)
            .set({ district: firstDistrict })
            .where(eq(users.id, poUser.id));
          
          log(`✅ Fixed! User now assigned to district: ${firstDistrict}`, 'green');
          
          // Count schools in this district
          const districtSchools = allSchools.filter(s => s.district === firstDistrict);
          log(`   Schools in this district: ${districtSchools.length}`, 'blue');
        } else {
          log(`\n⚠️  Cannot auto-fix: No districts found in schools`, 'red');
          log(`   Please manually assign a district to this user`, 'yellow');
        }
      } else {
        // Verify district has schools
        const districtSchools = allSchools.filter(s => s.district === poUser.district);
        log(`   Schools in district: ${districtSchools.length}`, 'blue');
        
        if (districtSchools.length === 0) {
          log(`\n⚠️  WARNING: No schools found in district '${poUser.district}'`, 'yellow');
          log(`   Drill-down will show no data until schools are added`, 'yellow');
        } else {
          log(`\n✅ Configuration looks good!`, 'green');
        }
      }
    }
    
    log(`\n${'═'.repeat(60)}`, 'cyan');
    log(`✅ Verification Complete`, 'cyan');
    log('═'.repeat(60), 'cyan');
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run verification
verifyAndFixPOUsers()
  .then(() => process.exit(0))
  .catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
