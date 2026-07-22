import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const applicationSchemas = ['common', 'crm', 'dms', 'pms', 'sns'];

function readMigrationContract(packageRoot) {
  const migrationDirectory = path.join(packageRoot, 'prisma', 'launch-migrations');
  const migrations = fs.readdirSync(migrationDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((name) => {
      const sqlPath = path.join(migrationDirectory, name, 'migration.sql');
      if (!fs.existsSync(sqlPath)) {
        throw new Error(`Launch migration is missing migration.sql: ${name}`);
      }
      const sql = fs.readFileSync(sqlPath);
      return {
        name,
        checksum: createHash('sha256').update(sql).digest('hex'),
        sqlPath,
      };
    });

  if (migrations.length === 0) {
    throw new Error('No launch migrations were found.');
  }
  return migrations;
}

function extractCreateTriggerNames(sql) {
  return [...sql.matchAll(/\bCREATE\s+TRIGGER\s+(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_$]*))/giu)]
    .map((match) => match[1] ?? match[2]);
}

function extractCreateTriggerContracts(sql) {
  return [...sql.matchAll(
    /\bCREATE\s+TRIGGER\s+(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_$]*))[\s\S]*?\bON\s+(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_$]*))\s*\.\s*(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_$]*))/giu,
  )].map((match) => ({
    name: match[1] ?? match[2],
    schema: match[3] ?? match[4],
    table: match[5] ?? match[6],
  }));
}

function readTriggerContract(packageRoot, migrations = readMigrationContract(packageRoot)) {
  const triggerDirectory = path.join(packageRoot, 'prisma', 'triggers');
  const manifestPath = path.join(triggerDirectory, 'apply_all_triggers.sql');
  const manifest = fs.readFileSync(manifestPath, 'utf8');
  const triggers = new Map();
  const addTrigger = (trigger, source) => {
    const key = `${trigger.schema}.${trigger.table}.${trigger.name}`;
    if (triggers.has(key)) {
      throw new Error(`Duplicate launch-managed trigger contract: ${key} (${source})`);
    }
    triggers.set(key, trigger);
  };
  const triggerFiles = [...manifest.matchAll(/^\\i\s+([^\s]+)\s*$/gmu)]
    .map((match) => match[1]);

  if (triggerFiles.length === 0) {
    throw new Error('No trigger files were found in apply_all_triggers.sql.');
  }

  for (const triggerFile of triggerFiles) {
    if (path.basename(triggerFile) !== triggerFile) {
      throw new Error(`Unsafe trigger manifest path: ${triggerFile}`);
    }
    const sqlPath = path.join(triggerDirectory, triggerFile);
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Trigger manifest entry is missing: ${triggerFile}`);
    }
    for (const trigger of extractCreateTriggerContracts(fs.readFileSync(sqlPath, 'utf8'))) {
      addTrigger(trigger, triggerFile);
    }
  }

  for (const migration of migrations) {
    for (const trigger of extractCreateTriggerContracts(fs.readFileSync(migration.sqlPath, 'utf8'))) {
      addTrigger(trigger, migration.name);
    }
  }

  if (triggers.size === 0) {
    throw new Error('No launch-managed trigger contracts were found.');
  }
  return [...triggers.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function assertMigrationHistory(expectedMigrations, actualRows) {
  const expectedByName = new Map(expectedMigrations.map((migration) => [migration.name, migration]));
  const actualByName = new Map();

  for (const row of actualRows) {
    if (actualByName.has(row.migration_name)) {
      throw new Error(`Duplicate launch migration history: ${row.migration_name}`);
    }
    actualByName.set(row.migration_name, row);
  }

  const missing = expectedMigrations
    .filter((migration) => !actualByName.has(migration.name))
    .map((migration) => migration.name);
  const unexpected = actualRows
    .filter((row) => !expectedByName.has(row.migration_name))
    .map((row) => row.migration_name);
  const incomplete = actualRows
    .filter((row) => !row.finished_at || row.rolled_back_at)
    .map((row) => row.migration_name);
  const checksumMismatches = actualRows
    .filter((row) => {
      const expected = expectedByName.get(row.migration_name);
      return expected && expected.checksum !== row.checksum;
    })
    .map((row) => row.migration_name);

  const issues = [];
  if (missing.length > 0) issues.push(`missing=${missing.join(',')}`);
  if (unexpected.length > 0) issues.push(`unexpected=${unexpected.join(',')}`);
  if (incomplete.length > 0) issues.push(`incomplete=${incomplete.join(',')}`);
  if (checksumMismatches.length > 0) issues.push(`checksum-mismatch=${checksumMismatches.join(',')}`);
  if (issues.length > 0) {
    throw new Error(`Launch migration history is not release-ready: ${issues.join('; ')}`);
  }
}

function triggerKey(trigger) {
  return `${trigger.schema_name ?? trigger.schema}.${trigger.table_name ?? trigger.table}.${trigger.trigger_name ?? trigger.name}`;
}

function assertTriggerContract(expectedTriggers, actualRows) {
  const expected = new Map(expectedTriggers.map((trigger) => [triggerKey(trigger), trigger]));
  const actual = new Map();

  for (const row of actualRows) {
    const key = triggerKey(row);
    if (actual.has(key)) {
      throw new Error(`Duplicate application trigger contract: ${key}`);
    }
    actual.set(key, row);
  }

  const missing = [...expected.keys()].filter((key) => !actual.has(key));
  const unexpected = actualRows
    .filter((row) => !expected.has(triggerKey(row)))
    .map((row) => triggerKey(row));
  const disabled = actualRows
    .filter((row) => expected.has(triggerKey(row)) && row.enabled !== true)
    .map((row) => triggerKey(row));

  const issues = [];
  if (missing.length > 0) issues.push(`missing=${missing.join(',')}`);
  if (unexpected.length > 0) issues.push(`unexpected=${unexpected.join(',')}`);
  if (disabled.length > 0) issues.push(`disabled=${disabled.join(',')}`);
  if (issues.length > 0) {
    throw new Error(`Launch trigger contract is not release-ready: ${issues.join('; ')}`);
  }
}

function assertNativeContract(contractRow) {
  const missing = Object.entries(contractRow ?? {})
    .filter(([, value]) => value !== true)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`Launch native database contract is incomplete: ${missing.join(',')}`);
  }
}

export {
  applicationSchemas,
  assertMigrationHistory,
  assertNativeContract,
  assertTriggerContract,
  extractCreateTriggerContracts,
  extractCreateTriggerNames,
  readMigrationContract,
  readTriggerContract,
};
