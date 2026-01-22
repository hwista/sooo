# UI 컴포넌트 (UI Components)

SSOO 프론트엔드의 공통 UI 컴포넌트 문서입니다.

## 개요

Radix UI Primitives + shadcn/ui 기반의 커스텀 컴포넌트입니다.

### 기술 스택

- **Radix UI**: 접근성이 보장된 headless 컴포넌트
- **class-variance-authority (cva)**: 조건부 스타일링
- **Tailwind CSS**: 유틸리티 스타일링
- **Lucide Icons**: 아이콘 라이브러리

### 파일 위치

```
apps/web-pms/src/components/ui/
├── badge.tsx
├── breadcrumb.tsx
├── button.tsx
├── card.tsx
├── checkbox.tsx
├── dialog.tsx
├── dropdown-menu.tsx
├── input.tsx
├── label.tsx
├── scroll-area.tsx
├── select.tsx
├── separator.tsx
├── sheet.tsx
├── skeleton.tsx
├── table.tsx
├── textarea.tsx
└── tooltip.tsx
```

---

## 표준 높이 규격

SSOO UI는 일관된 컨트롤 높이를 사용합니다.

| 클래스 | 높이 | 용도 |
|--------|------|------|
| `h-control-h-sm` | 32px | 작은 버튼, 인라인 컨트롤 |
| `h-control-h` | 36px | **기본 높이** (버튼, 입력, 선택) |
| `h-control-h-lg` | 44px | 큰 버튼, 주요 액션 |

---

## Button

버튼 컴포넌트입니다.

### Import

```tsx
import { Button } from '@/components/ui/button';
```

### Variants

| variant | 색상 | 용도 |
|---------|------|------|
| `default` | 네이비 블루 | **주요 액션** (생성, 저장, 확인) |
| `secondary` | 보조색 | 일반 액션 |
| `outline` | 테두리만 | 보조 버튼 |
| `destructive` | LS Red | 삭제, 위험 액션 |
| `ghost` | 투명 | 아이콘 버튼, 최소 강조 |
| `link` | 텍스트 | 링크 스타일 |

### Sizes

| size | 높이 | 용도 |
|------|------|------|
| `sm` | 32px | 작은 버튼 |
| `default` | 36px | 기본 버튼 |
| `lg` | 44px | 큰 버튼 |
| `icon` | 36x36px | 아이콘 전용 |

### 사용 예시

```tsx
// 주요 액션 버튼
<Button>저장</Button>

// 위험한 액션
<Button variant="destructive">삭제</Button>

// 아이콘 버튼
<Button variant="ghost" size="icon">
  <Search className="h-4 w-4" />
</Button>

// 비활성화
<Button disabled>처리 중...</Button>

// Link로 사용 (asChild)
<Button asChild>
  <Link href="/create">새로 만들기</Link>
</Button>
```

---

## Input

텍스트 입력 컴포넌트입니다.

### Import

```tsx
import { Input } from '@/components/ui/input';
```

### 사용 예시

```tsx
// 기본 텍스트 입력
<Input placeholder="이름을 입력하세요" />

// 비밀번호
<Input type="password" />

// 검색
<Input type="search" placeholder="검색..." />

// 비활성화
<Input disabled value="수정 불가" />

// 커스텀 스타일
<Input className="w-[300px]" />
```

### 주요 스타일

- 높이: `h-control-h` (36px)
- 테두리: `border-input`
- 포커스: `ring-1 ring-ring`

---

## Select

드롭다운 선택 컴포넌트입니다. (Radix UI 기반)

### Import

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
```

### 사용 예시

```tsx
<Select defaultValue="option1">
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="선택하세요" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">옵션 1</SelectItem>
    <SelectItem value="option2">옵션 2</SelectItem>
    <SelectItem value="option3">옵션 3</SelectItem>
  </SelectContent>
</Select>
```

### 제어 컴포넌트

```tsx
const [value, setValue] = useState('');

<Select value={value} onValueChange={setValue}>
  {/* ... */}
</Select>
```

---

## Card

카드 레이아웃 컴포넌트입니다.

### Import

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
```

### 사용 예시

```tsx
<Card>
  <CardHeader>
    <CardTitle>제목</CardTitle>
    <CardDescription>설명 텍스트</CardDescription>
  </CardHeader>
  <CardContent>
    <p>카드 내용</p>
  </CardContent>
  <CardFooter>
    <Button>확인</Button>
  </CardFooter>
</Card>
```

---

## Table

테이블 컴포넌트입니다.

### Import

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
```

### 사용 예시

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>이름</TableHead>
      <TableHead>상태</TableHead>
      <TableHead className="text-right">금액</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>프로젝트 A</TableCell>
      <TableCell>진행 중</TableCell>
      <TableCell className="text-right">₩1,000,000</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### 스타일 특징

- 자동 가로 스크롤 (`overflow-auto`)
- hover 시 행 하이라이트
- 반응형 너비

---

## Dialog

모달 다이얼로그 컴포넌트입니다. (Radix UI 기반)

### Import

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
```

### 사용 예시

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>열기</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>제목</DialogTitle>
      <DialogDescription>
        설명 텍스트
      </DialogDescription>
    </DialogHeader>
    <div className="py-4">
      {/* 내용 */}
    </div>
    <DialogFooter>
      <Button variant="outline">취소</Button>
      <Button>확인</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 제어 컴포넌트

```tsx
const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
  {/* ... */}
</Dialog>
```

---

## Badge

상태/라벨 표시용 배지 컴포넌트입니다.

### Import

```tsx
import { Badge } from '@/components/ui/badge';
```

### Variants

| variant | 용도 |
|---------|------|
| `default` | 기본 |
| `secondary` | 보조 |
| `destructive` | 경고/오류 |
| `outline` | 테두리만 |

### 사용 예시

```tsx
<Badge>기본</Badge>
<Badge variant="secondary">보류</Badge>
<Badge variant="destructive">오류</Badge>
<Badge variant="outline">초안</Badge>
```

---

## ScrollArea

커스텀 스크롤바가 적용된 스크롤 영역입니다.

### Import

```tsx
import { ScrollArea } from '@/components/ui/scroll-area';
```

### Props

| prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `orientation` | `'vertical' \| 'horizontal' \| 'both'` | `'vertical'` | 스크롤 방향 |
| `scrollbarSize` | `'thin' \| 'default' \| 'wide'` | `'default'` | 스크롤바 굵기 |
| `scrollbarTheme` | `'default' \| 'primary' \| 'accent' \| 'transparent'` | `'default'` | 색상 테마 |
| `showOnHover` | `boolean` | `false` | 호버 시만 표시 |
| `variant` | `'default' \| 'sidebar' \| 'table'` | `'default'` | 프리셋 |

### 사용 예시

```tsx
// 기본 세로 스크롤
<ScrollArea className="h-[300px]">
  <div>긴 콘텐츠...</div>
</ScrollArea>

// 사이드바용 (호버 시만 표시)
<ScrollArea variant="sidebar" showOnHover className="h-full">
  {/* 메뉴 트리 */}
</ScrollArea>

// 테이블용 가로 스크롤
<ScrollArea variant="table" orientation="horizontal">
  <Table>...</Table>
</ScrollArea>
```

➡️ [스크롤바 시스템 상세](./scrollbar.md)

---

## 기타 컴포넌트

| 컴포넌트 | 설명 |
|----------|------|
| `Checkbox` | 체크박스 |
| `Label` | 폼 라벨 |
| `Textarea` | 여러 줄 텍스트 입력 |
| `Separator` | 구분선 |
| `Skeleton` | 로딩 플레이스홀더 |
| `Tooltip` | 툴팁 |
| `DropdownMenu` | 드롭다운 메뉴 |
| `Sheet` | 사이드 패널 |
| `Breadcrumb` | 경로 네비게이션 |

---

## 테마 색상

SSOO 디자인 시스템 색상입니다.

| 변수 | 색상 | 용도 |
|------|------|------|
| `ssoo-primary` | 네이비 블루 | 주요 액션, 강조 |
| `ssoo-secondary` | 보조색 | 보조 요소 |
| `ls-red` | LS Red | 삭제, 위험, 포인트 |
| `ls-gray` | LS Gray | 배경, 비활성 |

### Tailwind 사용

```tsx
// 배경색
<div className="bg-ssoo-primary" />

// 텍스트
<span className="text-ls-red" />

// 테두리
<div className="border-ssoo-content-border" />
```

---

## 접근성

모든 컴포넌트는 접근성을 고려합니다:

- **키보드 네비게이션**: Tab, Enter, Escape
- **ARIA 속성**: 자동 적용 (Radix UI)
- **포커스 표시**: `focus-visible:ring`
- **스크린 리더**: 의미론적 마크업

---

## 구현 파일

- `apps/web-pms/src/components/ui/*.tsx`
- `apps/web-pms/src/lib/utils/index.ts` (`cn` 유틸리티)

## 관련 문서

- [스크롤바 시스템](./scrollbar.md)
- [레이아웃 시스템](./layout-system.md)

---

## Backlog

> 이 영역 관련 개선/추가 예정 항목

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| UIC-01 | 개별 컴포넌트 상세 문서 (각 컴포넌트별 props 상세) | P3 | 🔲 대기 |
| UIC-02 | Storybook 도입 검토 | P4 | 🔲 대기 |

---

## Changelog

> 이 영역 관련 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-21 | UI 컴포넌트 문서 최초 작성 |
| 2026-01-21 | 커스텀 스크롤바 디자인 시스템 추가 |
| 2026-01-21 | ScrollArea 컴포넌트 추가 |
