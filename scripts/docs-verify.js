const fs = require('fs');
const paths = [
  'docs/common/reference/typedoc/server',
  'docs/common/reference/typedoc/types',
  'docs/common/reference/api/openapi.json',
  'docs/common/reference/db/erd.svg',
  'docs/pms/reference/typedoc/server',
  'docs/pms/reference/typedoc/web',
  'docs/pms/reference/api/openapi.json',
  'docs/pms/reference/db/erd.svg',
  'docs/pms/reference/storybook',
];
const missing = paths.filter((p) => !fs.existsSync(p));
if (missing.length) {
  console.error('❌ Missing docs outputs:', missing.join(', '));
  process.exit(1);
}
console.log('✅ All docs outputs exist:', paths.length, 'items verified');