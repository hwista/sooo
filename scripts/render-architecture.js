const fs = require('fs');
const path = require('path');

const KROKI_URL = process.env.KROKI_URL || 'http://localhost:8000';
const scopes = ['common', 'pms', 'dms'];
const typeByExt = {
  '.mmd': 'mermaid',
  '.puml': 'plantuml',
  '.plantuml': 'plantuml',
  '.pu': 'plantuml',
  '.uml': 'plantuml',
};

const listFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
};

const renderDiagram = async (srcFile, outFile, type) => {
  const source = fs.readFileSync(srcFile, 'utf8');
  const res = await fetch(`${KROKI_URL}/${type}/svg`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: source,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Kroki render failed (${res.status}) for ${srcFile}: ${body}`);
  }
  const svg = await res.text();
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, svg, 'utf8');
};

const main = async () => {
  let hadError = false;
  for (const scope of scopes) {
    const srcDir = path.join('docs', scope, 'architecture', 'diagrams-src');
    const outDir = path.join('docs', scope, 'reference', 'architecture', 'diagrams');
    if (!fs.existsSync(srcDir)) {
      // eslint-disable-next-line no-console
      console.log(`[skip] ${srcDir} not found`);
      continue;
    }
    const files = listFiles(srcDir).filter((file) => typeByExt[path.extname(file)]);
    if (!files.length) {
      // eslint-disable-next-line no-console
      console.log(`[skip] ${scope}: no diagram sources`);
      continue;
    }
    for (const file of files) {
      const ext = path.extname(file);
      const type = typeByExt[ext];
      const rel = path.relative(srcDir, file).replace(ext, '.svg');
      const outFile = path.join(outDir, rel);
      try {
        await renderDiagram(file, outFile, type);
        // eslint-disable-next-line no-console
        console.log(`[ok] ${scope}: ${rel}`);
      } catch (err) {
        hadError = true;
        // eslint-disable-next-line no-console
        console.error(`[error] ${scope}: ${file}`);
        // eslint-disable-next-line no-console
        console.error(err.message);
      }
    }
  }
  if (hadError) process.exitCode = 1;
};

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
