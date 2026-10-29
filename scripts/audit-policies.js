const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261029000000_initial_schema.sql'), 'utf8');

const regex = /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+([^\s\n]+)/gi;
let match;
const results = [];

while ((match = regex.exec(content)) !== null) {
  const policyName = match[1];
  const tableName = match[2];
  
  // Look for DROP POLICY IF EXISTS before this occurrence
  const dropRegex = new RegExp(`DROP\\s+POLICY\\s+(IF\\s+EXISTS\\s+)?"${policyName}"\\s+ON\\s+${tableName}`, 'i');
  const hasDrop = dropRegex.test(content);
  results.push({ tableName, policyName, hasDrop });
}

console.log(`Total policies found: ${results.length}`);
results.forEach(r => {
  console.log(`${r.hasDrop ? '✓ PASS' : '✗ FAIL (MISSING DROP)'}: [${r.tableName}] "${r.policyName}"`);
});
