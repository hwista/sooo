'use client';

import { AlertTriangle, ArrowRight, RotateCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DmsHomeDocumentItem, DmsHomeSection } from '@ssoo/types/dms';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader } from '@ssoo/web-ui';
import { formatHomeDate } from './homeFormatters';

interface DocumentSectionProps {
  title: string;
  description: string;
  emptyMessage: string;
  icon: LucideIcon;
  section: DmsHomeSection<DmsHomeDocumentItem>;
  timeSource: 'lastOpenedAt' | 'updatedAt';
  onOpen: (document: DmsHomeDocumentItem) => void;
  onRetry: () => void;
}

export function DocumentSection({
  title,
  description,
  emptyMessage,
  icon: Icon,
  section,
  timeSource,
  onOpen,
  onRetry,
}: DocumentSectionProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-title-card">
              <Icon className="h-5 w-5 text-ssoo-primary" aria-hidden="true" />
              {title}
            </h2>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <Badge variant="outline" aria-label={`${section.items.length}건`}>
            {section.items.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {section.status === 'degraded' && (
          <div className="m-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-ssoo-warning-border bg-ssoo-warning-bg px-3 py-2 text-body-sm text-foreground" role="status">
            <span className="flex min-w-0 items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-ssoo-warning" aria-hidden="true" />
              <span>{section.reason}</span>
            </span>
            <Button variant="ghost" size="xs" onClick={onRetry}>
              <RotateCw aria-hidden="true" /> 다시 시도
            </Button>
          </div>
        )}

        {section.items.length > 0 ? (
          <div className="divide-y divide-ssoo-content-border/70">
            {section.items.map((document) => (
              <Button
                key={document.documentId}
                variant="plain"
                size="plain"
                className="group flex h-auto w-full items-center justify-between gap-3 whitespace-normal rounded-md px-3 py-3 text-left hover:bg-ssoo-content-bg/55"
                onClick={() => onOpen(document)}
                title={document.path}
              >
                <span className="min-w-0">
                  <span className="block truncate text-label-md text-foreground">{document.title}</span>
                  <span className="mt-1 block truncate text-caption font-normal text-muted-foreground" title={document.path}>
                    {document.path}
                  </span>
                  <span className="mt-0.5 block truncate text-caption font-normal text-muted-foreground">
                    {document.ownerName ? `${document.ownerName} · ` : ''}
                    {formatHomeDate(timeSource === 'lastOpenedAt' ? document.lastOpenedAt : document.updatedAt)}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Button>
            ))}
          </div>
        ) : section.status !== 'degraded' ? (
          <p className="m-2 rounded-md border border-dashed border-ssoo-content-border px-3 py-4 text-body-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
