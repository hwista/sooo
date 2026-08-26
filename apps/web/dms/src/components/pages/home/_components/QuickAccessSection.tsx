'use client';

import { Bookmark, FilePlus2, Search } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader } from '@ssoo/web-ui';
import { cn } from '@/lib/utils';

interface QuickBookmark {
  id: string;
  title: string;
  path: string;
}

interface QuickAccessSectionProps {
  canWriteDocuments: boolean;
  canUseSearch: boolean;
  bookmarks: QuickBookmark[];
  onNewDocument: () => void;
  onSearch: () => void;
  onOpenBookmark: (bookmark: QuickBookmark) => void;
}

const quickCardClassName = 'h-auto w-full flex-col items-start justify-start gap-3 whitespace-normal rounded-lg border border-ssoo-content-border bg-card p-4 text-left shadow-sm transition-colors hover:border-ssoo-primary/55 hover:bg-ssoo-content-bg/35';

export function QuickAccessSection({
  canWriteDocuments,
  canUseSearch,
  bookmarks,
  onNewDocument,
  onSearch,
  onOpenBookmark,
}: QuickAccessSectionProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="p-5 pb-3">
        <h2 className="text-title-card">빠른 시작</h2>
        <CardDescription>작성과 검색, 자주 쓰는 문서로 바로 이동합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="plain"
            size="plain"
            className={cn(quickCardClassName, !canWriteDocuments && 'cursor-not-allowed opacity-60')}
            disabled={!canWriteDocuments}
            onClick={onNewDocument}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ssoo-primary/10 text-ssoo-primary">
              <FilePlus2 aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-label-md text-foreground">새 문서 작성</span>
              <span className="mt-1 block text-body-sm font-normal text-muted-foreground">
                {canWriteDocuments ? '빈 문서나 템플릿에서 시작' : '문서 작성 권한이 필요합니다'}
              </span>
            </span>
          </Button>
          <Button
            variant="plain"
            size="plain"
            className={cn(quickCardClassName, !canUseSearch && 'cursor-not-allowed opacity-60')}
            disabled={!canUseSearch}
            onClick={onSearch}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ssoo-primary/10 text-ssoo-primary">
              <Search aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-label-md text-foreground">AI 검색</span>
              <span className="mt-1 block text-body-sm font-normal text-muted-foreground">
                {canUseSearch ? '전체 문서에서 근거와 함께 찾기' : 'AI 검색 권한이 필요합니다'}
              </span>
            </span>
          </Button>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-label-sm text-muted-foreground">
            <Bookmark className="h-4 w-4" aria-hidden="true" />
            이 기기의 책갈피
          </div>
          {bookmarks.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {bookmarks.map((bookmark) => (
                <Button
                  key={bookmark.id}
                  variant="outline"
                  size="sm"
                  className="max-w-full justify-start"
                  onClick={() => onOpenBookmark(bookmark)}
                  title={bookmark.path}
                >
                  <Bookmark aria-hidden="true" />
                  <span className="truncate">{bookmark.title}</span>
                </Button>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-ssoo-content-border px-3 py-2 text-body-sm text-muted-foreground">
              책갈피가 생기면 여기에 최대 4개까지 표시됩니다.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
