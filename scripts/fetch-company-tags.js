#!/usr/bin/env node
/**
 * Fetches company-wise problem data from GitHub and generates company-tags.json
 * Source: https://github.com/snehasishroy/leetcode-companywise-interview-questions
 *
 * Run: node scripts/fetch-company-tags.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const TARGET_COMPANIES = {
  'amazon': 'Amazon',
  'google': 'Google',
  'meta': 'Meta',
  'microsoft': 'Microsoft',
  'apple': 'Apple',
  'netflix': 'Netflix',
  'uber': 'Uber',
  'airbnb': 'Airbnb',
  'linkedin': 'LinkedIn',
  'twitter': 'Twitter',
  'stripe': 'Stripe',
  'salesforce': 'Salesforce',
  'oracle': 'Oracle',
  'adobe': 'Adobe',
  'bloomberg': 'Bloomberg',
  'bytedance': 'ByteDance',
  'tiktok': 'TikTok',
  'snapchat': 'Snapchat',
  'spotify': 'Spotify',
  'dropbox': 'Dropbox',
  'coinbase': 'Coinbase',
  'robinhood': 'Robinhood',
  'twilio': 'Twilio',
  'databricks': 'Databricks',
  'snowflake': 'Snowflake',
  'palantir': 'Palantir',
  'nvidia': 'NVIDIA',
  'amd': 'AMD',
  'intel': 'Intel',
  'ibm': 'IBM',
  'samsung': 'Samsung',
  'qualcomm': 'Qualcomm',
  'goldman-sachs': 'Goldman Sachs',
  'jp-morgan': 'JP Morgan',
  'morgan-stanley': 'Morgan Stanley',
  'walmart': 'Walmart',
  'ebay': 'eBay',
  'paypal': 'PayPal',
  'expedia': 'Expedia',
  'booking': 'Booking.com',
  'lyft': 'Lyft',
  'doordash': 'DoorDash',
  'instacart': 'Instacart',
  'roblox': 'Roblox',
  'twitch': 'Twitch',
  'reddit': 'Reddit',
  'pinterest': 'Pinterest',
  'shopify': 'Shopify',
  'atlassian': 'Atlassian',
  'cloudflare': 'Cloudflare',
  'cisco': 'Cisco',
  'vmware': 'VMware',
  'sap': 'SAP',
  'dell': 'Dell',
  'zoho': 'Zoho',
};

const BASE_URL = 'https://raw.githubusercontent.com/snehasishroy/leetcode-companywise-interview-questions/master';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 404) {
        resolve(null);
        return;
      }
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(null));
  });
}

function parseCSV(csvText) {
  if (!csvText) return [];
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  // Skip header row
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // CSV format: ID,URL,Title,Difficulty,Acceptance %,Frequency %
    // Split carefully — titles may contain commas quoted, but this source doesn't appear to use quotes
    const parts = line.split(',');
    if (parts.length < 6) continue;

    const lcId = parseInt(parts[0].trim(), 10);
    const url = parts[1].trim();
    const title = parts.slice(2, parts.length - 3).join(',').trim(); // handle commas in titles
    const frequency = parseFloat(parts[parts.length - 1].trim()) || 0;

    if (!lcId || !url) continue;

    // Extract slug from URL
    const slug = url.replace(/\/$/, '').split('/').pop();

    results.push({ lcId, slug, title, frequency });
  }
  return results;
}

function getSlugFromUrl(leetcodeUrl) {
  if (!leetcodeUrl) return null;
  return leetcodeUrl.replace(/\/$/, '').split('/').pop();
}

async function main() {
  const ROOT = path.join(__dirname, '..');
  const problemsPath = path.join(ROOT, 'src', 'data', 'problems.json');
  const outputPath = path.join(ROOT, 'src', 'data', 'company-tags.json');

  console.log('Loading problems.json...');
  const problems = JSON.parse(fs.readFileSync(problemsPath, 'utf-8'));

  // Build slug → our problem ID map
  const slugToId = {};
  for (const p of problems) {
    const slug = getSlugFromUrl(p.leetcode_url);
    if (slug) slugToId[slug] = p.id;
  }
  console.log(`  Built slug map for ${Object.keys(slugToId).length} problems`);

  const byCompany = {};
  const byProblem = {};

  const companyKeys = Object.keys(TARGET_COMPANIES);
  console.log(`\nFetching data for ${companyKeys.length} companies...`);

  for (const slug of companyKeys) {
    const name = TARGET_COMPANIES[slug];
    const url = `${BASE_URL}/${slug}/thirty-days.csv`;
    process.stdout.write(`  ${name}...`);

    const csvText = await fetchUrl(url);
    if (!csvText) {
      process.stdout.write(' (not found)\n');
      continue;
    }

    const rows = parseCSV(csvText);
    const matchedProblems = [];

    for (const row of rows) {
      const ourId = slugToId[row.slug];
      if (ourId !== undefined) {
        matchedProblems.push({
          id: ourId,
          frequency: row.frequency,
          title: row.title,
        });
      }
    }

    if (matchedProblems.length === 0) {
      process.stdout.write(` (0 matches)\n`);
      continue;
    }

    // Sort by frequency descending
    matchedProblems.sort((a, b) => b.frequency - a.frequency);
    byCompany[slug] = { name, problems: matchedProblems };

    // Build byProblem index
    for (const p of matchedProblems) {
      const key = String(p.id);
      if (!byProblem[key]) byProblem[key] = [];
      byProblem[key].push(slug);
    }

    process.stdout.write(` ✓ ${matchedProblems.length} problems\n`);
  }

  const output = {
    byCompany,
    byProblem,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n✅ Wrote company-tags.json`);
  console.log(`   Companies with data: ${Object.keys(byCompany).length}`);
  console.log(`   Problems tagged: ${Object.keys(byProblem).length}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
