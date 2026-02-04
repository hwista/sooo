# Dead Code 분석 프롬프트

코드베이스의 미사용 코드를 찾아 정리할 때 이 절차를 따르세요.

---

## 분석 범위

Dead Code 유형:
1. **미사용 함수/메서드** - 어디서도 호출되지 않음
2. **미사용 컴포넌트** - import되지 않음
3. **미사용 타입/인터페이스** - 참조되지 않음
4. **미사용 변수/상수** - 선언만 되고 사용 안 됨
5. **미사용 의존성** - package.json에만 있고 사용 안 됨
6. **미사용 파일** - 전체 파일이 사용되지 않음

---

## 분석 절차

### 1단계: 정적 분석

```bash
# TypeScript 컴파일러로 미사용 변수 확인
npx tsc --noEmit

# ESLint로 미사용 코드 확인
npx eslint . --report-unused-disable-directives

# 미사용 의존성 확인 (depcheck)
npx depcheck
```

### 2단계: Export 분석

```bash
# 모든 export 확인
grep -r "export " --include="*.ts" --include="*.tsx"

# 해당 export의 import 여부 확인
grep -r "import.*{exportName}" --include="*.ts" --include="*.tsx"
```

### 3단계: 컴포넌트 사용 확인

```bash
# 컴포넌트 사용처 검색
grep -r "<ComponentName" --include="*.tsx"
grep -r "ComponentName" --include="*.ts" --include="*.tsx"
```

---

## 보고서 형식

분석 결과를 다음 형식으로 보고:

```markdown
## Dead Code 분석 보고서

### 1. 미사용 함수/메서드

| 함수명 | 파일 | 라인 | 증거 |
|--------|------|------|------|
| `formatDate` | lib/utils.ts | L45 | grep 결과: 0건 |

### 2. 미사용 컴포넌트

| 컴포넌트 | 파일 | 증거 |
|----------|------|------|
| `OldCard` | components/OldCard.tsx | import 0건 |

### 3. 미사용 의존성

| 패키지 | package.json 위치 |
|--------|------------------|
| `lodash` | apps/web/pms |

### 4. 삭제 권장 파일

- `src/legacy/old-feature.ts` - 전체 미사용
```

---

## 판단 기준

### 삭제 가능 조건

1. ✅ grep/search로 사용처 0건 확인
2. ✅ 테스트에서도 미사용
3. ✅ 문서에서 참조 없음
4. ✅ 동적 import가 아님

### 삭제 보류 조건

1. ⚠️ 동적 import 가능성 (`import()`, `require()`)
2. ⚠️ 리플렉션/메타데이터 사용
3. ⚠️ 외부 API 엔드포인트
4. ⚠️ 확실하지 않은 경우

---

## 삭제 승인 프로세스

Dead Code 삭제는 **사용자 승인 후** 진행:

1. **분석 보고서 제출** - 증거 포함
2. **사용자 검토** - 삭제 대상 확인
3. **승인 후 삭제** - 한 번에 하나씩
4. **빌드/테스트 확인** - 삭제 후 검증

---

## 주의사항

- ❌ **추정으로 삭제 금지** - 증거 없이 "안 쓰는 것 같다" 금지
- ❌ **일괄 삭제 금지** - 하나씩 확인하며 삭제
- ❌ **테스트 없이 삭제 금지** - 삭제 후 빌드/린트 확인
- ✅ **Changelog 기록** - 삭제 내역 문서화
