'use client';

import { Download, FileText, Loader2, Printer, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';

interface DocumentExportMenuProps {
  onConvertToTemplate: () => void;
  onDownloadMarkdown: () => void;
  onDownloadPdf: () => void;
  loading?: boolean;
  canConvertToTemplate?: boolean;
}

export function DocumentExportMenu({
  onConvertToTemplate,
  onDownloadMarkdown,
  onDownloadPdf,
  loading = false,
  canConvertToTemplate = true,
}: DocumentExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-control-h w-control-h hover:bg-muted"
          aria-label="내보내기"
          title="내보내기"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48 border-border bg-muted p-2 shadow-lg">
        {canConvertToTemplate ? (
          <DropdownMenuItem
            onClick={onConvertToTemplate}
            className="text-body-xs text-foreground focus:bg-card focus:text-ssoo-primary"
          >
            <FileText className="h-4 w-4" />
            템플릿 전환
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={onDownloadMarkdown}
          className="text-body-xs text-foreground focus:bg-card focus:text-ssoo-primary"
        >
          <Download className="h-4 w-4" />
          마크다운 다운로드
        </DropdownMenuItem>
        {canConvertToTemplate ? <DropdownMenuSeparator className="bg-muted" /> : null}
        <DropdownMenuItem
          onClick={onDownloadPdf}
          className="text-body-xs text-foreground focus:bg-card focus:text-ssoo-primary"
        >
          <Printer className="h-4 w-4" />
          PDF 다운로드
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
