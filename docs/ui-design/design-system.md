# 디자인 시스템 가이드

SSOO 프로젝트의 일관된 UI/UX를 위한 디자인 시스템 표준 문서입니다.

## 목차
1. [색상 체계](#색상-체계)
2. [타이포그래피](#타이포그래피)
3. [아이콘 크기](#아이콘-크기)
4. [버튼](#버튼)
5. [간격 및 레이아웃](#간격-및-레이아웃)
6. [사용 예시](#사용-예시)

---

## 색상 체계

> 📝 그룹웨어 색상 체계를 기반으로 브랜드 일관성을 유지합니다.

### 테마 색상 팔레트

| 색상명 | HEX | 용도 |
|-------|-----|------|
| **Primary** | `#003876` | 메인 브랜드색, 중요 액션, CUD 버튼 |
| **Secondary** | `#235a98` | 보조색, 일반 작업 버튼, Hover 상태 |
| **Portal Background** | `#F9FBFD` | 페이지 배경 |
| **Content Border** | `#9FC1E7` | 카드/패널 테두리 |
| **Content Background** | `#DEE7F1` | 카드 배경, Muted 영역 |
| **Sitemap Title** | `#016CA2` | 링크 색상, 액센트 |
| **Sitemap Bullet** | `#00588A` | 보조 액센트 |
| **Sitemap Background** | `#F6FBFF` | Hover 배경 |

### CSS 변수

```css
/* globals.css에서 정의됨 */
--ssoo-primary: #003876;
--ssoo-primary-hover: #235a98;
--ssoo-secondary: #235a98;
--ssoo-background: #F9FBFD;
--ssoo-content-border: #9FC1E7;
--ssoo-content-background: #DEE7F1;
--ssoo-sitemap-title: #016CA2;
--ssoo-sitemap-bullet: #00588A;
--ssoo-sitemap-background: #F6FBFF;
```

### Primary (네이비 블루)
**용도**: CUD(생성/수정/삭제) 작업, 중요한 액션, 메인 버튼
```css
bg-[#003876]            /* Primary */
hover:bg-[#235a98]      /* Hover 시 Secondary로 */
```

### Secondary (라이트 네이비)
**용도**: 일반 작업, 보조 버튼, 취소 액션
```css
bg-[#235a98]            /* Secondary */
hover:bg-[#003876]      /* Hover 시 Primary로 */
```

### Destructive (빨간색)
**용도**: 삭제, 경고, 위험한 작업
```css
bg-red-600
hover:bg-red-700
```

### Outline (테두리)
**용도**: 덜 중요한 액션, 필터, 정렬
```css
border border-[#9FC1E7] bg-white text-[#003876]
hover:bg-[#F6FBFF]
```

### Ghost (배경 없음)
**용도**: 아이콘 버튼, 서브 액션
```css
text-[#003876]
hover:bg-[#DEE7F1]
```

### Link (링크 스타일)
**용도**: 텍스트 링크, 내비게이션
```css
text-[#016CA2]
hover:underline
```

---

## 타이포그래피

### H1 - 페이지 제목
**크기**: 28px (1.75rem)  
**가중치**: Bold (700)  
**용도**: 페이지 최상단 메인 제목

```tsx
<h1 className="heading-1">고객 요청 관리</h1>
// 또는
<h1 className="text-h1 text-gray-900 font-bold">고객 요청 관리</h1>
```

### H2 - 섹션 제목
**크기**: 24px (1.5rem)  
**가중치**: Semibold (600)  
**용도**: 페이지 내 주요 섹션 제목

```tsx
<h2 className="heading-2">요청 목록</h2>
// 또는
<h2 className="text-h2 text-gray-800 font-semibold">요청 목록</h2>
```

### H3 - 하위 섹션 제목
**크기**: 20px (1.25rem)  
**가중치**: Semibold (600)  
**용도**: 카드/패널 제목, 폼 섹션 제목

```tsx
<h3 className="heading-3">기본 정보</h3>
// 또는
<h3 className="text-h3 text-gray-800 font-semibold">기본 정보</h3>
```

### Body Text - 본문
**크기**: 14px (0.875rem)  
**가중치**: Regular (400)  
**용도**: 일반 텍스트, 설명, 레이블

```tsx
<p className="body-text">요청 내용을 입력하세요.</p>
// 회색 텍스트
<p className="body-text-muted">선택 사항입니다.</p>
```

---

## 아이콘 크기

각 텍스트 레벨에 맞는 아이콘 크기를 사용합니다.

| 텍스트 레벨 | 아이콘 크기 | 클래스명 | 실제 크기 |
|------------|-----------|---------|----------|
| H1 | icon-h1 | `icon-h1` | 28px |
| H2 | icon-h2 | `icon-h2` | 24px |
| H3 | icon-h3 | `icon-h3` | 20px |
| Body | icon-body | `icon-body` | 16px |

### 사용 예시

```tsx
// H1과 함께
<div className="flex items-center gap-2">
  <FolderIcon className="icon-h1 text-blue-600" />
  <h1 className="heading-1">프로젝트 관리</h1>
</div>

// H2와 함께
<div className="flex items-center gap-2">
  <ListIcon className="icon-h2 text-gray-700" />
  <h2 className="heading-2">요청 목록</h2>
</div>

// H3와 함께
<div className="flex items-center gap-2">
  <InfoIcon className="icon-h3 text-gray-600" />
  <h3 className="heading-3">상세 정보</h3>
</div>

// Body와 함께
<div className="flex items-center gap-1">
  <CheckIcon className="icon-body text-green-600" />
  <span className="body-text">완료</span>
</div>
```

---

## 컨트롤 높이 표준

> 📏 UI 컨트롤(버튼, 입력, 탭, 메뉴 등)의 높이를 **36px**로 통일하여 일관성 있는 인터페이스를 제공합니다.

### 높이 토큰

| 크기 | Tailwind 클래스 | 실제 높이 | 용도 |
|------|----------------|----------|------|
| **Small** | `h-control-h-sm` | 32px | 밀집된 UI, 테이블 내 컨트롤 |
| **Default** | `h-control-h` | 36px | **표준** - 버튼, 입력, 탭, 메뉴 |
| **Large** | `h-control-h-lg` | 44px | 강조가 필요한 CTA 버튼 |

### 적용 대상

| 컴포넌트 | 클래스 | 높이 |
|----------|--------|------|
| Button (기본) | `h-control-h` | 36px |
| Input | `h-control-h` | 36px |
| Select | `h-control-h` | 36px |
| MDI 탭 | `h-control-h` | 36px |
| 사이드바 검색란 | `h-control-h` | 36px |
| 메뉴 트리 노드 | `h-control-h` | 36px |
| 즐겨찾기 항목 | `h-control-h` | 36px |
| 열린 탭 항목 | `h-control-h` | 36px |

### 사용 예시

```tsx
// 표준 높이 적용
<input className="h-control-h px-3 border rounded-md" />
<Button>저장</Button>  {/* 자동으로 h-control-h 적용 */}

// 작은 컨트롤
<Button size="sm">필터</Button>  {/* h-control-h-sm */}

// 큰 컨트롤
<Button size="lg">시작하기</Button>  {/* h-control-h-lg */}

// 유틸리티 클래스
<div className="control-height">커스텀 컨트롤</div>
```

---

## 버튼

### 버튼 높이 표준
**기본 높이**: 36px (`h-control-h`)

### 버튼 변형

#### 1. Primary (default) - 네이비 블루
**용도**: 생성, 저장, 확인 등 주요 액션
```tsx
<Button>생성</Button>
<Button variant="default">저장</Button>
```

#### 2. Secondary - 라이트 네이비
**용도**: 일반 작업, 보조 액션
```tsx
<Button variant="secondary">취소</Button>
<Button variant="secondary">닫기</Button>
```

#### 3. Outline - 테두리만
**용도**: 필터, 정렬, 덜 중요한 액션
```tsx
<Button variant="outline">필터</Button>
<Button variant="outline">정렬</Button>
```

#### 4. Destructive - 빨간색
**용도**: 삭제, 위험한 작업
```tsx
<Button variant="destructive">삭제</Button>
```

#### 5. Ghost - 배경 없음
**용도**: 아이콘 버튼, 서브 액션
```tsx
<Button variant="ghost">더보기</Button>
```

### 버튼 크기

```tsx
// 작은 버튼 (높이 32px)
<Button size="sm">작게</Button>

// 기본 버튼 (높이 36px)
<Button>기본</Button>

// 큰 버튼 (높이 44px)
<Button size="lg">크게</Button>

// 아이콘 버튼 (36x36px)
<Button size="icon">
  <PlusIcon className="icon-body" />
</Button>
```

### 텍스트 오버플로우 처리

#### 한 줄 말줄임
```tsx
<Button className="max-w-xs">
  <span className="text-ellipsis-line">
    매우 긴 버튼 텍스트가 있을 때 처리
  </span>
</Button>
```

#### Tooltip과 함께 사용
```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button className="max-w-xs">
        <span className="text-ellipsis-line">
          매우 긴 버튼 텍스트
        </span>
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>매우 긴 버튼 텍스트 전체 내용</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

## 간격 및 레이아웃

### 표준 간격

| 용도 | 간격 | Tailwind 클래스 |
|-----|------|----------------|
| 요소 사이 작은 간격 | 8px | `gap-2` |
| 요소 사이 중간 간격 | 16px | `gap-4` |
| 섹션 사이 간격 | 24px | `gap-6` |
| 페이지 패딩 | 24px | `p-6` |

### 레이아웃 가이드

```tsx
// 페이지 컨테이너
<div className="p-6 space-y-6">
  {/* H1 제목 */}
  <div className="flex items-center justify-between">
    <h1 className="heading-1">페이지 제목</h1>
    <Button>액션</Button>
  </div>

  {/* H2 섹션 */}
  <div className="space-y-4">
    <h2 className="heading-2">섹션 제목</h2>
    <div className="bg-white rounded-lg border p-4">
      {/* 콘텐츠 */}
    </div>
  </div>
</div>
```

---

## 사용 예시

### 페이지 헤더

```tsx
import { Button } from '@/components/ui/button';
import { PlusIcon, FilterIcon } from 'lucide-react';

export function PageHeader() {
  return (
    <div className="flex items-center justify-between mb-6">
      {/* 제목 */}
      <div className="flex items-center gap-3">
        <FolderIcon className="icon-h1 text-[#003876]" />
        <h1 className="heading-1">고객 요청 관리</h1>
      </div>
      
      {/* 액션 버튼들 */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <FilterIcon className="icon-body" />
          필터
        </Button>
        <Button>
          <PlusIcon className="icon-body" />
          새 요청
        </Button>
      </div>
    </div>
  );
}
```

### 카드 컴포넌트

```tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EditIcon, TrashIcon } from 'lucide-react';

export function RequestCard({ title, description }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="heading-3">{title}</h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon">
              <EditIcon className="icon-body" />
            </Button>
            <Button variant="ghost" size="icon">
              <TrashIcon className="icon-body text-red-600" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="body-text">{description}</p>
      </CardContent>
    </Card>
  );
}
```

### 폼 레이아웃

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CreateForm() {
  return (
    <form className="space-y-6">
      {/* 폼 섹션 */}
      <div className="space-y-4">
        <h3 className="heading-3">기본 정보</h3>
        
        <div className="space-y-2">
          <Label className="body-text">요청 제목</Label>
          <Input placeholder="제목을 입력하세요" />
        </div>
        
        <div className="space-y-2">
          <Label className="body-text">설명</Label>
          <Textarea placeholder="설명을 입력하세요" />
          <p className="body-text-muted">선택 사항입니다.</p>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary">
          취소
        </Button>
        <Button type="submit">
          생성
        </Button>
      </div>
    </form>
  );
}
```

### 리스트 아이템

```tsx
import { CheckCircleIcon, ClockIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RequestListItem({ request }) {
  return (
    <div className="flex items-center justify-between p-4 border-b hover:bg-gray-50">
      {/* 왼쪽: 상태 + 정보 */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {request.status === 'completed' ? (
          <CheckCircleIcon className="icon-h3 text-green-600 flex-shrink-0" />
        ) : (
          <ClockIcon className="icon-h3 text-orange-600 flex-shrink-0" />
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="heading-3 text-ellipsis-line">{request.title}</h3>
          <p className="body-text-muted text-ellipsis-line">{request.description}</p>
        </div>
      </div>

      {/* 오른쪽: 액션 */}
      <div className="flex gap-2 ml-4">
        <Button variant="outline" size="sm">상세</Button>
        <Button variant="secondary" size="sm">편집</Button>
      </div>
    </div>
  );
}
```

---

## 체크리스트

새로운 컴포넌트나 페이지를 만들 때 다음을 확인하세요:

- [ ] H1, H2, H3는 적절한 클래스(`heading-1`, `heading-2`, `heading-3`) 사용
- [ ] 아이콘 크기가 텍스트 레벨과 일치 (`icon-h1`, `icon-h2`, `icon-h3`, `icon-body`)
- [ ] 버튼은 표준 높이(40px) 사용
- [ ] **Primary(#003876)는 주요 액션, Secondary(#235a98)는 보조 액션**
- [ ] **테두리는 #9FC1E7, Hover 배경은 #DEE7F1 또는 #F6FBFF 사용**
- [ ] 긴 텍스트는 `text-ellipsis-line` + Tooltip 처리
- [ ] 일관된 간격 사용 (`gap-2`, `gap-4`, `gap-6`)
- [ ] 본문 텍스트는 `body-text` 또는 `body-text-muted` 사용

---

## 참고 자료

- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [shadcn/ui 컴포넌트](https://ui.shadcn.com/)
- [Lucide Icons](https://lucide.dev/)
