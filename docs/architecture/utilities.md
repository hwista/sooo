# 공통 유틸리티 (Utilities)

SSOO 프론트엔드의 공통 유틸리티 함수 및 모듈 문서입니다.

## 파일 구조

```
apps/web/src/lib/
├── api/                  # API 클라이언트
│   ├── client.ts         # Axios 인스턴스
│   ├── auth.ts           # 인증 API
│   ├── types.ts          # API 응답 타입
│   └── endpoints/        # 도메인별 API
├── utils/                # 유틸리티 함수
│   ├── index.ts          # cn 및 공통 함수
│   └── icons.ts          # 아이콘 유틸리티
└── validations/          # Zod 유효성 검증
    ├── common.ts         # 공통 스키마
    ├── auth.ts           # 인증 스키마
    └── project.ts        # 프로젝트 스키마
```

---

## API 클라이언트

### apiClient

Axios 기반 HTTP 클라이언트입니다.

**파일:** `apps/web/src/lib/api/client.ts`

```typescript
import { apiClient } from '@/lib/api/client';

// GET 요청
const response = await apiClient.get('/menus/my');

// POST 요청
const response = await apiClient.post('/projects', data);

// PUT 요청
const response = await apiClient.put(`/projects/${id}`, data);

// DELETE 요청
const response = await apiClient.delete(`/projects/${id}`);
```

### 설정

| 설정 | 값 |
|------|-----|
| Base URL | `process.env.NEXT_PUBLIC_API_URL` 또는 `http://localhost:4000/api` |
| Timeout | 30초 |
| Content-Type | `application/json` |
| Credentials | `withCredentials: true` |

### 인터셉터

#### Request Interceptor

```typescript
// 자동으로 Authorization 헤더 추가
// localStorage의 'ssoo-auth'에서 accessToken 읽음
config.headers.Authorization = `Bearer ${accessToken}`;
```

#### Response Interceptor

```typescript
// 401 에러 시 자동 토큰 갱신
if (error.response?.status === 401 && !originalRequest._retry) {
  // refreshToken으로 새 accessToken 발급
  // 실패 시 /login으로 리다이렉트
}
```

---

## authApi

인증 관련 API 함수들입니다.

**파일:** `apps/web/src/lib/api/auth.ts`

```typescript
import { authApi } from '@/lib/api/auth';
```

### 함수

| 함수 | 설명 |
|------|------|
| `authApi.login(data)` | 로그인 → 토큰 반환 |
| `authApi.refresh(refreshToken)` | 토큰 갱신 |
| `authApi.logout(accessToken)` | 로그아웃 |
| `authApi.me(accessToken)` | 현재 사용자 정보 |

### 타입

```typescript
interface LoginRequest {
  loginId: string;
  password: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface UserInfo {
  userId: string;
  loginId: string;
  roleCode: string;
  userTypeCode: string;
  isAdmin: boolean;
}
```

---

## API 응답 타입

**파일:** `apps/web/src/lib/api/types.ts`

### ApiResponse

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
}

// 사용 예시
const response: ApiResponse<Project[]> = await apiClient.get('/projects');
if (response.data.success) {
  const projects = response.data.data;
}
```

### PaginatedResponse

```typescript
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

### PaginationParams

```typescript
interface PaginationParams {
  page?: number;
  pageSize?: number;
}
```

### ListParams

```typescript
interface ListParams extends PaginationParams, SortParams {
  search?: string;
}
```

---

## 유틸리티 함수

### cn (Class Names)

Tailwind CSS 클래스 병합 유틸리티입니다.

**파일:** `apps/web/src/lib/utils/index.ts`

```typescript
import { cn } from '@/lib/utils';

// 기본 사용
<div className={cn('p-4', 'bg-white')} />

// 조건부 클래스
<button className={cn(
  'px-4 py-2 rounded',
  isActive && 'bg-blue-500 text-white',
  disabled && 'opacity-50 cursor-not-allowed'
)} />

// 충돌 해결 (tailwind-merge)
<div className={cn('p-4', 'p-6')} />  // → 'p-6'
```

### 구현

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 아이콘 유틸리티

Lucide Icons 동적 로딩 유틸리티입니다.

**파일:** `apps/web/src/lib/utils/icons.ts`

### getIconComponent

```typescript
import { getIconComponent } from '@/lib/utils/icons';

// 아이콘 이름으로 컴포넌트 가져오기
const HomeIcon = getIconComponent('Home');
const SettingsIcon = getIconComponent('Settings');

// 사용
{HomeIcon && <HomeIcon className="w-5 h-5" />}

// 메뉴 아이콘 렌더링
const IconComponent = getIconComponent(menu.icon);
return IconComponent ? <IconComponent /> : null;
```

### hasIcon

```typescript
import { hasIcon } from '@/lib/utils/icons';

// 아이콘 존재 여부 확인
if (hasIcon('CustomIcon')) {
  // 아이콘 존재
}
```

### 지원 아이콘

Lucide Icons 전체 지원. [Lucide Icons](https://lucide.dev/icons/)

```
Home, Settings, User, Search, Menu, X, Check, 
ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
Star, FileText, Folder, FolderTree, Bell, LogOut,
Plus, Minus, Edit, Trash, Save, Refresh, ...
```

---

## Zod 유효성 검증

### 공통 스키마

**파일:** `apps/web/src/lib/validations/common.ts`

#### 문자열

```typescript
import { requiredString, optionalString, requiredStringMax } from '@/lib/validations';

// 필수 문자열
requiredString  // 빈 값 불허

// 선택 문자열
optionalString  // 빈 값 → undefined

// 최대 길이 제한
requiredStringMax(50)  // 최대 50자
```

#### 연락처

```typescript
import { emailField, requiredEmail, phoneField, mobileField } from '@/lib/validations';

// 이메일 (선택)
emailField

// 이메일 (필수)
requiredEmail

// 전화번호 (유선/무선)
phoneField

// 휴대폰 번호
mobileField
```

#### 숫자

```typescript
import { requiredPositiveNumber, optionalNumber } from '@/lib/validations';

// 필수 양수
requiredPositiveNumber

// 선택 숫자
optionalNumber
```

### 사용 예시

```typescript
import { z } from 'zod';
import { requiredString, requiredEmail, optionalString } from '@/lib/validations';

// 스키마 정의
const userSchema = z.object({
  name: requiredString,
  email: requiredEmail,
  phone: optionalString,
});

// 타입 추출
type UserForm = z.infer<typeof userSchema>;

// React Hook Form과 함께 사용
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm<UserForm>({
  resolver: zodResolver(userSchema),
});
```

---

## 환경 변수

**파일:** `.env.local`

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `NEXT_PUBLIC_API_URL` | API 서버 URL | `http://localhost:4000/api` |

### 사용

```typescript
// 클라이언트에서 접근
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

> ⚠️ `NEXT_PUBLIC_` 접두사가 있어야 클라이언트에서 접근 가능

---

## 구현 파일

- `apps/web/src/lib/api/client.ts` - Axios 클라이언트
- `apps/web/src/lib/api/auth.ts` - 인증 API
- `apps/web/src/lib/api/types.ts` - API 타입
- `apps/web/src/lib/utils/index.ts` - cn 유틸리티
- `apps/web/src/lib/utils/icons.ts` - 아이콘 유틸리티
- `apps/web/src/lib/validations/*.ts` - Zod 스키마

## 관련 문서

- [API 명세서](../api/README.md)
- [인증 시스템](./auth-system.md)
- [상태 관리](./state-management.md)

---

## Backlog

> 이 영역 관련 개선/추가 예정 항목

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| UTL-01 | 날짜/숫자/금액 포맷 유틸리티 추가 | P2 | 🔲 대기 |
| UTL-02 | 디바운스/쓰로틀 유틸리티 추가 | P3 | 🔲 대기 |

---

## Changelog

> 이 영역 관련 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-21 | 메뉴 아이콘 필드명 정합화 (icon) |
| 2026-01-21 | 유틸리티 문서 최초 작성 |
