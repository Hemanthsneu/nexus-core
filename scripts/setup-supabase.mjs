#!/usr/bin/env node
/**
 * Nexus Core — Automated Supabase Setup
 * =======================================
 * Usage:
 *   node scripts/setup-supabase.mjs --token <YOUR_SUPABASE_PAT>
 *
 * Get your Personal Access Token:
 *   → https://supabase.com/dashboard/account/tokens → "Generate new token"
 *
 * What this script does:
 *   1. Lists your existing Supabase projects (lets you pick one or create new)
 *   2. Waits for the project to be healthy
 *   3. Applies the nexus_schema.sql to the project
 *   4. Fetches the anon key and project URL
 *   5. Writes .env.local automatically
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MGMT_BASE = 'https://api.supabase.com/v1';

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--token' && argv[i + 1]) {
      args.token = argv[i + 1];
      i++;
    }
    if (argv[i] === '--project' && argv[i + 1]) {
      args.project = argv[i + 1];
      i++;
    }
  }
  return args;
}

async function api(token, method, path, body) {
  const res = await fetch(`${MGMT_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase API ${method} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return res.json();
}

function prompt(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function bold(s) { return `\x1b[1m${s}\x1b[0m`; }
function green(s) { return `\x1b[32m${s}\x1b[0m`; }
function cyan(s) { return `\x1b[36m${s}\x1b[0m`; }
function yellow(s) { return `\x1b[33m${s}\x1b[0m`; }
function red(s) { return `\x1b[31m${s}\x1b[0m`; }

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log(`\n${bold('Nexus Core — Supabase Setup')}\n`);

  // 1. Get token
  let token = args.token;
  if (!token) {
    console.log(yellow('Get your Personal Access Token from:'));
    console.log(cyan('  https://supabase.com/dashboard/account/tokens'));
    console.log('  → Click "Generate new token" → copy it\n');
    token = (await prompt(rl, 'Paste your Supabase Personal Access Token: ')).trim();
  }
  if (!token) {
    console.error(red('No token provided. Exiting.'));
    rl.close();
    process.exit(1);
  }

  // 2. List projects
  console.log('\nFetching your Supabase projects...');
  let projects;
  try {
    projects = await api(token, 'GET', '/projects');
  } catch (err) {
    console.error(red(`Failed to fetch projects: ${err.message}`));
    console.error('Check that your token is valid.');
    rl.close();
    process.exit(1);
  }

  let projectRef;
  let projectUrl;

  if (projects.length === 0) {
    console.log(yellow('\nNo existing projects found.'));
    console.log('Creating a new project...\n');

    const name = (await prompt(rl, 'Project name [nexus-core]: ')).trim() || 'nexus-core';
    const dbPass = (await prompt(rl, 'Database password (min 8 chars): ')).trim();
    if (dbPass.length < 8) {
      console.error(red('Password too short.'));
      rl.close();
      process.exit(1);
    }

    // Get available regions
    let regions = [];
    try {
      regions = await api(token, 'GET', '/regions');
    } catch {
      regions = [{ id: 'us-east-1', name: 'US East (N. Virginia)' }];
    }
    console.log('\nAvailable regions:');
    regions.slice(0, 8).forEach((r, i) => console.log(`  ${i + 1}. ${r.name} (${r.id})`));
    const regionIdx = parseInt(await prompt(rl, `\nPick region [1]: `)) || 1;
    const region = regions[Math.max(0, Math.min(regions.length - 1, regionIdx - 1))].id;

    console.log(cyan(`\nCreating project "${name}" in ${region}...`));
    const created = await api(token, 'POST', '/projects', {
      name,
      db_pass: dbPass,
      region,
      plan: 'free',
    });
    projectRef = created.id;
    console.log(green(`Project created: ${projectRef}`));
    console.log('Waiting for project to become healthy (this takes ~60s)...');
  } else {
    // Pick existing project
    console.log('\nYour projects:');
    projects.forEach((p, i) => {
      console.log(`  ${i + 1}. ${bold(p.name)} — ${p.id} [${p.status}]`);
    });
    console.log(`  ${projects.length + 1}. ${yellow('Create a new project')}`);

    const pick = parseInt(await prompt(rl, `\nPick project [1]: `)) || 1;
    if (pick === projects.length + 1) {
      console.log(yellow('\nOpen https://supabase.com/dashboard to create a project, then rerun this script.'));
      rl.close();
      process.exit(0);
    }
    const chosen = projects[Math.max(0, Math.min(projects.length - 1, pick - 1))];
    projectRef = chosen.id;
    console.log(green(`\nUsing project: ${chosen.name} (${projectRef})`));
  }

  // 3. Wait for healthy status
  for (let attempt = 0; attempt < 30; attempt++) {
    const project = await api(token, 'GET', `/projects/${projectRef}`);
    projectUrl = `https://${project.id}.supabase.co`;
    if (project.status === 'ACTIVE_HEALTHY') {
      console.log(green('✓ Project is healthy'));
      break;
    }
    if (attempt === 29) {
      console.error(red('Project did not become healthy in time. Try again in a moment.'));
      rl.close();
      process.exit(1);
    }
    process.stdout.write('.');
    await sleep(4000);
  }

  // 4. Apply migrations in order
  const migrationsDir = resolve(ROOT, 'supabase', 'migrations');
  let migrationFiles = [];
  if (existsSync(migrationsDir)) {
    migrationFiles = (await readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort();
  }

  // Fallback to legacy single-file schema if migrations folder is missing
  if (migrationFiles.length === 0 && existsSync(resolve(ROOT, 'nexus_schema.sql'))) {
    migrationFiles = ['__legacy__'];
  }

  console.log(`\nApplying ${migrationFiles.length} migration(s)...`);
  for (const file of migrationFiles) {
    const filePath = file === '__legacy__'
      ? resolve(ROOT, 'nexus_schema.sql')
      : resolve(migrationsDir, file);

    const sql = await readFile(filePath, 'utf8');

    // Split ALTER PUBLICATION statements — run them separately so
    // "already added" errors don't abort the whole migration.
    const safeSql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('ALTER PUBLICATION'))
      .join('\n');

    const pubLines = sql
      .split('\n')
      .filter(line => line.trim().startsWith('ALTER PUBLICATION'));

    try {
      await api(token, 'POST', `/projects/${projectRef}/database/query`, { query: safeSql });
      console.log(green(`  ✓ ${file}`));
    } catch (err) {
      console.error(yellow(`  ⚠ ${file}: ${err.message.slice(0, 200)}`));
    }

    for (const pubLine of pubLines) {
      try {
        await api(token, 'POST', `/projects/${projectRef}/database/query`, { query: pubLine });
      } catch {
        // Table may already be in publication — ignore
      }
    }
  }
  console.log(green('✓ Migrations applied'));

  // 6. Fetch API keys
  console.log('Fetching API keys...');
  const keys = await api(token, 'GET', `/projects/${projectRef}/api-keys`);
  const anonKey = keys.find(k => k.name === 'anon')?.api_key ?? keys[0]?.api_key;
  const serviceRoleKey = keys.find(k => k.name === 'service_role')?.api_key;
  if (!anonKey) {
    console.error(red('Could not fetch anon key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY manually.'));
    rl.close();
    process.exit(1);
  }

  // 7. Write .env.local
  const envPath = resolve(ROOT, '.env.local');
  const existingLines = existsSync(envPath)
    ? (await readFile(envPath, 'utf8')).split('\n')
    : [];

  // Merge: preserve existing keys not being set, overwrite these two
  const mergedMap = new Map();
  for (const line of existingLines) {
    const [key, ...rest] = line.split('=');
    if (key) mergedMap.set(key.trim(), rest.join('='));
  }
  mergedMap.set('NEXT_PUBLIC_SUPABASE_URL', projectUrl);
  mergedMap.set('NEXT_PUBLIC_SUPABASE_ANON_KEY', anonKey);
  if (serviceRoleKey) {
    mergedMap.set('SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey);
  }

  const envContent = [
    '# Auto-generated by scripts/setup-supabase.mjs',
    ...Array.from(mergedMap.entries()).map(([k, v]) => `${k}=${v}`),
    '',
  ].join('\n');

  await writeFile(envPath, envContent, 'utf8');
  console.log(green(`✓ Written to .env.local`));

  // 8. Summary
  console.log(`
${bold(green('✅ Setup complete!'))}

  ${bold('Project URL:')}  ${cyan(projectUrl)}
  ${bold('Anon key:')}     ${anonKey.slice(0, 24)}...

  ${bold('Next steps:')}
  1. ${yellow('Add your Teams webhook:')}
       Open .env.local → set TEAMS_WEBHOOK_URL
       (Teams channel → ⋯ → Connectors → Incoming Webhook)

  2. ${yellow('Start the dev server:')}
       cd ${ROOT.split('/').pop()} && npm run dev

  3. ${yellow('Test the full flow:')}
       node test-agent.mjs
`);

  rl.close();
}

main().catch((err) => {
  console.error(red(`\nSetup failed: ${err.message}`));
  process.exit(1);
});
