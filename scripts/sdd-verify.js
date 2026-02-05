#!/usr/bin/env node

/**
 * SDD Framework 검증 스크립트 (래퍼)
 * 
 * 실제 스크립트는 .github/scripts/sdd-verify.js에 있습니다.
 * 이 파일은 하위 호환성을 위한 래퍼입니다.
 * 
 * 새 프로젝트에서는 .github/scripts/sdd-verify.js를 직접 사용하세요.
 */

const path = require('path');
const coreScript = path.join(__dirname, '..', '.github', 'scripts', 'sdd-verify.js');

try {
  require(coreScript);
} catch (e) {
  console.error('❌ .github/scripts/sdd-verify.js를 찾을 수 없습니다.');
  console.error('   SDD Framework가 올바르게 설치되었는지 확인하세요.');
  process.exit(1);
}
