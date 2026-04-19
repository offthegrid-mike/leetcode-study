#!/usr/bin/env node
/**
 * Build script: merges problem data parts into a single problems.json
 * and copies source files into public/ for serving.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_DATA = path.join(ROOT, 'src', 'data');

function mergeProblems() {
  const files = ['problems-part1.json', 'problems-part2.json'];
  let allProblems = [];

  for (const file of files) {
    const filePath = path.join(SRC_DATA, file);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      allProblems = allProblems.concat(data);
      console.log(`  ✓ Loaded ${data.length} problems from ${file}`);
    } else {
      console.warn(`  ⚠ ${file} not found, skipping`);
    }
  }

  // Sort by ID
  allProblems.sort((a, b) => a.id - b.id);

  // Write merged file
  const outPath = path.join(SRC_DATA, 'problems.json');
  fs.writeFileSync(outPath, JSON.stringify(allProblems, null, 2));
  console.log(`  ✓ Merged ${allProblems.length} problems into problems.json`);
}

console.log('Building LeetCode Study...');
console.log('\n📦 Merging problem data...');
mergeProblems();
console.log('\n✅ Build complete!');
