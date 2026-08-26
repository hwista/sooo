'use client';

import { AlertTriangle, ArrowRight, RotateCw, ShieldCheck } from 'lucide-react';
import type { DmsHomeOperationalExceptionItem, DmsHomeSection } from '@ssoo/types/dms';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader } from '@ssoo/web-ui';

interface OperationsSectionProps {
  section: DmsHomeSection<DmsHomeOperationalExceptionItem>;
  onOpen: (item: DmsHomeOperationalExceptionItem) => void;
  onRetry: () => void;
}

export function OperationsSection({ section, onOpen, onRetry }: OperationsSectionProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-title-card">
              <ShieldCheck className="h-5 w-5 text-ssoo-primary" aria-hidden="true" />
              운영 예외
            </h2>
            <CardDescription className="mt-1">관리자 확인이 필요한 실행·게시·수집 상태만 모았습니다.</CardDescription>
          </div>
          <Badge variant={section.items.some((item) => item.severity === 'critical') ? 'destructive' : 'outline'}>
            {section.items.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-5 pt-0">
        {section.status === 'degraded' && (
          <div className="flex items-start gap-2 rounded-md border border-ssoo-warning-border bg-ssoo-warning-bg p-3 text-body-sm" role="status">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-ssoo-warning" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p>{section.reason}</p>
              <Button variant="ghost" size="xs" className="mt-1" onClick={onRetry}>
                <RotateCw aria-hidden="true" /> 다시 시도
              </Button>
            </div>
          </div>
        )}
        {section.items.map((item) => (
          <Button
            key={item.id}
            variant="plain"
            size="plain"
            className="group flex h-auto w-full items-center justify-between gap-3 whitespace-normal rounded-md border border-ssoo-content-border px-3 py-3 text-left hover:border-ssoo-primary/45 hover:bg-ssoo-content-bg/40"
            onClick={() => onOpen(item)}
          >
            <span className="min-w-0">
              <span className="mb-1 flex items-center gap-2">
                <span className="text-label-md text-foreground">{item.title}</span>
                <Badge variant={item.severity === 'critical' ? 'destructive' : 'outline'}>
                  {item.severity === 'critical' ? '차단' : '주의'}
                </Badge>
              </span>
              <span className="block text-body-sm font-normal text-muted-foreground">{item.description}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Button>
        ))}
        {section.items.length === 0 && section.status !== 'degraded' && (
          <p className="rounded-md border border-dashed border-ssoo-content-border px-3 py-4 text-body-sm text-muted-foreground">
            현재 확인할 운영 예외가 없습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
