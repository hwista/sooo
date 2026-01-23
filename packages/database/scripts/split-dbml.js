// Split generated DBML (schema.dbml) into per-schema files: common, pms, dms.
// Output: packages/database/dbml/{common,pms,dms}.dbml
// Refs are kept only if both sides belong to the target schema.

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', 'dbml');
const source = join(root, 'schema.dbml');

const text = readFileSync(source, 'utf8');
const blocks = text
  .split(/\n\s*\n/) // separate by blank lines
  .map((b) => b.trim())
  .filter(Boolean);

const headers = [];
const bySchema = { common: [], pms: [], dms: [] };
const refs = { common: [], pms: [], dms: [] };

const getSchema = (line) => {
  const m = line.match(/^(Table|Enum)\s+([^.]+)\./);
  return m ? m[2] : null;
};

const getRefSchema = (line) => {
  // Ref: pms.table.col > pms.table2.col
  const m = line.match(/^Ref:\s+([^.]+)\./);
  return m ? m[1] : null;
};

for (const block of blocks) {
  if (block.startsWith('Table ') || block.startsWith('Enum ')) {
    const schema = getSchema(block);
    if (schema && bySchema[schema]) {
      bySchema[schema].push(block);
    }
  } else if (block.startsWith('Ref:')) {
    const schema = getRefSchema(block);
    if (schema && refs[schema]) {
      // keep only if both sides share schema
      const parts = block.split(/\s+/).slice(1).join(' ');
      const targets = parts.split(/[#>|=]/).map((p) => p.trim());
      const allSame = targets.every((t) => t.startsWith(`${schema}.`));
      if (allSame) refs[schema].push(block);
    }
  } else {
    headers.push(block);
  }
}

mkdirSync(root, { recursive: true });

const writeSchema = (schema) => {
  const body = [...headers, ...bySchema[schema], ...refs[schema]]
    .filter(Boolean)
    .join('\n\n');
  const outFile = join(root, `${schema}.dbml`);
  writeFileSync(outFile, body + '\n', 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Split DBML for ${schema}: ${outFile}`);
};

['common', 'pms', 'dms'].forEach(writeSchema);
