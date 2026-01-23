#!/usr/bin/env node
const fs = require('fs');
const paths = [
  'docs/common/reference/typedoc/server',
  'docs/pms/reference/typedoc/server',
  'docs/pms/reference/typedoc/web-pms',
  'docs/pms/reference/storybook/web-pms',
];
const missing = paths.filter((p) => !fs.existsSync(p));
if (missing.length) {
  console.error('Missing docs outputs:', missing.join(', '));
  process.exit(1);
}
console.log('Docs outputs exist:', paths.join(', '));