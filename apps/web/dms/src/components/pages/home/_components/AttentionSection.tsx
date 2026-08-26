'use client';

import { AlertTriangle, ArrowRight, ListTodo, RotateCw } from 'lucide-react';
import type { DmsHomeActionItem, DmsHomeSection } from '@ssoo/types/dms';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader } from '@ssoo/web-ui';
import { formatHomeDate } from './homeFormatters';

interface AttentionSectionProps {
  section: DmsHomeSection<DmsHomeActionItem>;
  onOpen: (item: DmsHomeActionItem) => void;
  onRetry: () => void;
}

export function AttentionSection({ section, onOpen, onRetry }: AttentionSectionProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-title-card">
              <ListTodo className="h-5 w-5 text-ssoo-primary" aria-hidden="true" />
              내 처리함
            </h2>
            <CardDescription className="mt-1">승인과 문서 복구처럼 내 판단이 필요한 일입니다.</CardDescription>
          </div>
          <Badge variant={section.items.length > 0 ? 'default' : 'outline'}>{section.items.length}</Badge>
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
              <span className="block text-label-md text-foreground">{item.title}</span>
              <span className="mt-1 block text-body-sm font-normal text-muted-foreground">{item.description}</span>
              <span className="mt-1 block text-caption font-normal text-muted-foreground">{formatHomeDate(item.occurredAt)}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Button>
        ))}
        {section.items.length === 0 && section.status !== 'degraded' && (
          <p className="rounded-md border border-dashed border-ssoo-content-border px-3 py-4 text-body-sm text-muted-foreground">
            지금 처리할 항목이 없습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
