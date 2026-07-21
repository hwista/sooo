'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, Archive, GitCompareArrows } from 'lucide-react';
import {
  useProjectAccess,
  useProjectIssues,
  useProjectLegacyIssueCleanupSummary,
  useArchiveTerminalLegacyIssues,
  useCanonicalizePendingLegacyIssues,
  useCreateChangeRequest,
  useCreateProjectIssue,
  useCreateRisk,
  useUpdateIssue,
  useDeleteIssue,
} from '@/hooks/queries/useProjects';
import type { IssueItem } from '@/lib/api/endpoints/projects';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ControlDomainPanels } from './control/DomainPanels';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-ssoo-danger-bg text-ssoo-danger',
  in_progress: 'bg-ssoo-info-bg text-ssoo-info',
  resolved: 'bg-ssoo-success-bg text-ssoo-success',
  closed: 'bg-muted text-muted-foreground',
  deferred: 'bg-ssoo-warning-bg text-ssoo-warning',
};

const STATUS_LABELS: Record<string, string> = {
  open: '등록',
  in_progress: '처리중',
  resolved: '해결',
  closed: '종료',
  deferred: '보류',
};

const TERMINAL_LEGACY_ISSUE_STATUS_CODES = new Set(['resolved', 'closed']);

const TYPE_LABELS: Record<string, string> = {
  bug: '버그',
  requirement_change: '요구변경',
  risk: '위험',
  impediment: '장애',
  inquiry: '문의',
  improvement: '개선',
};

const CANONICAL_SURFACE_HINTS: Partial<Record<string, string>> = {
  bug: '정식: 이슈',
  impediment: '정식: 이슈',
  inquiry: '정식: 이슈',
  improvement: '정식: 이슈',
  risk: '정식: 리스크',
  requirement_change: '정식: 변경요청',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-ssoo-danger font-semibold',
  high: 'text-ssoo-warning',
  normal: 'text-muted-foreground',
  low: 'text-muted-foreground',
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: '긴급',
  high: '높음',
  normal: '보통',
  low: '낮음',
};

type CanonicalControlTarget = 'issue' | 'risk' | 'change';

const CANONICAL_TARGET_BY_ISSUE_TYPE: Record<string, CanonicalControlTarget> = {
  bug: 'issue',
  impediment: 'issue',
  inquiry: 'issue',
  improvement: 'issue',
  risk: 'risk',
  requirement_change: 'change',
};

const CANONICAL_TARGET_LABELS: Record<CanonicalControlTarget, string> = {
  issue: '정식 이슈',
  risk: '정식 리스크',
  change: '정식 변경요청',
};

interface Props {
  projectId: number;
}

function LegacyIssueMetaField({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-caption-2xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  );
}

function LegacyIssueMobileCard({
  issue,
  canManageIssues,
  onConvert,
  onStatusChange,
  onDelete,
  isConverting,
  isDeleting,
}: {
  issue: IssueItem;
  canManageIssues: boolean;
  onConvert: (issue: IssueItem) => void;
  onStatusChange: (issue: IssueItem, value: string) => void;
  onDelete: (issueId: string) => void;
  isConverting: boolean;
  isDeleting: boolean;
}) {
  const canonicalHint = CANONICAL_SURFACE_HINTS[issue.issueTypeCode];
  const isTerminal = TERMINAL_LEGACY_ISSUE_STATUS_CODES.has(issue.statusCode);
  const canConvert = canManageIssues && !isTerminal;

  return (
    <div data-testid="pms-legacy-issue-card" className="space-y-3 rounded-md border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-caption-2xs text-muted-foreground">{issue.issueCode}</p>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">{issue.issueTitle}</p>
        </div>
        {canManageIssues ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            disabled={isDeleting}
            onClick={() => onDelete(String(issue.id))}
            aria-label="기존 Issue 숨기기"
            title="기존 Issue 숨기기"
          >
            <Archive className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <LegacyIssueMetaField label="유형">
          <div className="flex flex-wrap items-center gap-1.5">
            <span>{TYPE_LABELS[issue.issueTypeCode] || issue.issueTypeCode}</span>
            {canonicalHint ? (
              <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-caption-xs font-medium text-muted-foreground">
                {canonicalHint}
              </span>
            ) : null}
          </div>
        </LegacyIssueMetaField>
        <LegacyIssueMetaField label="우선순위">
          <span className={PRIORITY_COLORS[issue.priorityCode] || ''}>
            {PRIORITY_LABELS[issue.priorityCode] || issue.priorityCode}
          </span>
        </LegacyIssueMetaField>
        <LegacyIssueMetaField label="상태" className="col-span-2">
          <Select
            value={issue.statusCode}
            onValueChange={(value) => onStatusChange(issue, value)}
            disabled={!canManageIssues}
          >
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([code, label]) => (
                <SelectItem key={code} value={code}>
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[code] || ''}`}
                  >
                    {label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </LegacyIssueMetaField>
        <LegacyIssueMetaField label="기존 담당자" className="col-span-2">
          {issue.assignee?.displayName || issue.assignee?.userName || '-'}
        </LegacyIssueMetaField>
      </div>

      <Button
        variant="outline"
        size="sm"
        data-testid="pms-legacy-issue-canonicalize-action"
        className="w-full justify-start"
        disabled={!canConvert || isConverting}
        onClick={() => onConvert(issue)}
      >
        <GitCompareArrows className="h-4 w-4" />
        {canConvert ? '정식 통제 항목으로 전환' : '정리 완료 / 기본 숨김'}
      </Button>
    </div>
  );
}

function getCanonicalTarget(issueTypeCode: string): CanonicalControlTarget {
  return CANONICAL_TARGET_BY_ISSUE_TYPE[issueTypeCode] ?? 'issue';
}

function getCanonicalCode(prefix: string, issue: IssueItem) {
  return `${prefix}-LEG-${String(issue.id)}`;
}

function buildLegacyDescription(issue: IssueItem) {
  const lines = [
    issue.description,
    '',
    `전환 원본: 기존 Issue ${issue.issueCode}`,
  ].filter(Boolean);

  return lines.join('\n');
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function ControlsTab({ projectId }: Props) {
  const { data: accessResponse } = useProjectAccess(projectId);
  const { data, isLoading } = useProjectIssues(projectId);
  const { data: cleanupSummaryResponse } = useProjectLegacyIssueCleanupSummary(projectId);
  const [showCompletedLegacyIssues, setShowCompletedLegacyIssues] = useState(false);
  const issues = useMemo(() => data?.data ?? [], [data?.data]);
  const pendingLegacyIssues = useMemo(
    () => issues.filter((issue) => !TERMINAL_LEGACY_ISSUE_STATUS_CODES.has(issue.statusCode)),
    [issues],
  );
  const completedLegacyIssues = useMemo(
    () => issues.filter((issue) => TERMINAL_LEGACY_ISSUE_STATUS_CODES.has(issue.statusCode)),
    [issues],
  );
  const visibleLegacyIssues = showCompletedLegacyIssues ? issues : pendingLegacyIssues;
  const cleanupSummary = cleanupSummaryResponse?.data;
  const activeCleanupCount = cleanupSummary?.activeCleanupCount ?? issues.length;
  const pendingCleanupCount = cleanupSummary?.pendingCleanupCount ?? pendingLegacyIssues.length;
  const terminalCleanupCount = cleanupSummary?.terminalCleanupCount ?? completedLegacyIssues.length;
  const archivedCleanupCount = cleanupSummary?.archivedCleanupCount ?? 0;
  const readyForPhysicalRemoval = cleanupSummary?.readyForPhysicalRemoval ?? false;
  const canManageIssues = accessResponse?.data?.features.canManageIssues ?? false;

  const createProjectIssue = useCreateProjectIssue();
  const createRisk = useCreateRisk();
  const createChangeRequest = useCreateChangeRequest();
  const updateIssue = useUpdateIssue();
  const deleteIssue = useDeleteIssue();
  const archiveTerminalIssues = useArchiveTerminalLegacyIssues();
  const canonicalizePendingIssues = useCanonicalizePendingLegacyIssues();
  const isConvertingLegacyIssue =
    createProjectIssue.isPending ||
    createRisk.isPending ||
    createChangeRequest.isPending ||
    updateIssue.isPending ||
    canonicalizePendingIssues.isPending;

  const handleStatusChange = async (issue: IssueItem, newStatus: string) => {
    await updateIssue.mutateAsync({
      projectId,
      issueId: String(issue.id),
      data: { statusCode: newStatus },
    });
  };

  const handleDelete = async (issueId: string) => {
    await deleteIssue.mutateAsync({ projectId, issueId });
    toast.success('기존 Issue 호환 행을 숨김 처리했습니다.');
  };

  const handleArchiveCompletedLegacyIssues = async () => {
    try {
      const result = await archiveTerminalIssues.mutateAsync({ projectId });
      toast.success('완료된 기존 Issue 행을 숨김 처리했습니다.', {
        description: `${result.data?.archivedCount ?? 0}건 처리`,
      });
    } catch (error) {
      toast.error('완료된 기존 Issue 행을 숨김 처리하지 못했습니다.', {
        description: getErrorMessage(error, '잠시 후 다시 시도해주세요.'),
      });
    }
  };

  const handleCanonicalizePendingLegacyIssues = async () => {
    try {
      const result = await canonicalizePendingIssues.mutateAsync({ projectId });
      toast.success('열린 기존 Issue 행을 정식 통제 항목으로 전환했습니다.', {
        description: `${result.data?.convertedCount ?? 0}건 처리`,
      });
    } catch (error) {
      toast.error('열린 기존 Issue 행을 일괄 전환하지 못했습니다.', {
        description: getErrorMessage(error, '잠시 후 다시 시도해주세요.'),
      });
    }
  };

  const handleConvertLegacyIssue = async (issue: IssueItem) => {
    const target = getCanonicalTarget(issue.issueTypeCode);
    const targetLabel = CANONICAL_TARGET_LABELS[target];
    const ownerUserId = issue.assigneeUserId ? String(issue.assigneeUserId) : undefined;
    const description = buildLegacyDescription(issue);
    const memo = `기존 Issue ${issue.issueCode}에서 전환`;

    try {
      if (target === 'risk') {
        await createRisk.mutateAsync({
          projectId,
          data: {
            riskCode: getCanonicalCode('RK', issue),
            riskTitle: issue.issueTitle,
            description,
            statusCode: issue.statusCode === 'in_progress' ? 'monitoring' : 'identified',
            impactCode: issue.priorityCode === 'critical' || issue.priorityCode === 'high' ? 'high' : 'medium',
            likelihoodCode: 'medium',
            responsePlan: issue.resolution ?? undefined,
            ownerUserId,
            dueAt: issue.dueAt ?? undefined,
            memo,
          },
        });
      } else if (target === 'change') {
        await createChangeRequest.mutateAsync({
          projectId,
          data: {
            changeCode: getCanonicalCode('CHG', issue),
            changeTitle: issue.issueTitle,
            description,
            statusCode: issue.statusCode === 'in_progress' ? 'reviewing' : 'requested',
            priorityCode: issue.priorityCode,
            ownerUserId,
            requestedAt: issue.reportedAt,
            memo,
          },
        });
      } else {
        const canonicalIssueType = ['bug', 'impediment', 'inquiry', 'improvement'].includes(issue.issueTypeCode)
          ? issue.issueTypeCode
          : 'inquiry';
        await createProjectIssue.mutateAsync({
          projectId,
          data: {
            issueCode: getCanonicalCode('PI', issue),
            issueTitle: issue.issueTitle,
            description,
            issueTypeCode: canonicalIssueType,
            statusCode: issue.statusCode,
            priorityCode: issue.priorityCode,
            reportedByUserId: issue.reportedByUserId ? String(issue.reportedByUserId) : undefined,
            ownerUserId,
            assigneeUserId: ownerUserId,
            reportedAt: issue.reportedAt,
            dueAt: issue.dueAt ?? undefined,
            resolution: issue.resolution ?? undefined,
            memo,
          },
        });
      }

      await updateIssue.mutateAsync({
        projectId,
        issueId: String(issue.id),
        data: {
          statusCode: 'closed',
          resolvedAt: new Date().toISOString(),
          resolution: `${targetLabel}으로 전환됨`,
          memo,
        },
      });

      toast.success(`${targetLabel}으로 전환했습니다.`);
    } catch (error) {
      toast.error('정식 통제 항목으로 전환하지 못했습니다.', {
        description: getErrorMessage(error, '잠시 후 다시 시도해주세요.'),
      });
    }
  };

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">로딩 중...</div>;
  }

  return (
    <div className="space-y-4">
      <ControlDomainPanels projectId={projectId} canManage={canManageIssues} />

      <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
        새 항목은 상단 <span className="font-medium text-foreground">정식 컨트롤 패널</span>
        에서 등록합니다. <span className="font-medium text-foreground">버그 / 장애 / 문의 / 개선</span>
        은 이슈, <span className="font-medium text-foreground">리스크</span> 는 리스크,{' '}
        <span className="font-medium text-foreground">요구변경</span> 은 변경요청 패널이 기본
        경로입니다. 아래 <code>Issue</code> 목록은 열린 cleanup 대상만 기본 표시하며,
        완료/전환된 기존 Issue는 기본 보기에서 숨깁니다.
      </div>

      <div
        data-testid="pms-legacy-issue-cleanup-summary"
        className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="rounded-md border bg-background px-3 py-2">
          <p className="text-muted-foreground">활성 cleanup</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{activeCleanupCount}</p>
        </div>
        <div className="rounded-md border bg-background px-3 py-2">
          <p className="text-muted-foreground">열린 대상</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{pendingCleanupCount}</p>
          <p className="mt-1 text-caption-xs text-muted-foreground">완료 상태 {terminalCleanupCount}</p>
        </div>
        <div className="rounded-md border bg-background px-3 py-2">
          <p className="text-muted-foreground">숨김 보존</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{archivedCleanupCount}</p>
        </div>
        <div
          className={`rounded-md border px-3 py-2 ${
            readyForPhysicalRemoval ? 'bg-ssoo-success-bg text-ssoo-success' : 'bg-ssoo-warning-bg text-ssoo-warning'
          }`}
        >
          <p className="text-current/80">물리 제거 조건</p>
          <p className="mt-1 text-lg font-semibold">{readyForPhysicalRemoval ? '충족' : '대기'}</p>
          <p className="mt-1 text-caption-xs text-current/80">활성 cleanup 0건 기준</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <AlertCircle className="h-4 w-4" />
            기존 Issue cleanup 인박스 ({pendingCleanupCount})
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            신규 작성 경로가 아니라 기존 <code>Issue</code> 행의 정식 전환과 숨김 처리를 위한 축소 인박스입니다.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {canManageIssues && pendingCleanupCount > 0 ? (
            <Button
              variant="default"
              size="sm"
              data-testid="pms-legacy-issue-canonicalize-pending-action"
              className="w-full sm:w-auto"
              disabled={isConvertingLegacyIssue}
              onClick={handleCanonicalizePendingLegacyIssues}
            >
              <GitCompareArrows className="h-4 w-4" />
              열린 대상 일괄 전환 ({pendingCleanupCount})
            </Button>
          ) : null}
          {canManageIssues && terminalCleanupCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              data-testid="pms-legacy-issue-archive-completed-action"
              className="w-full sm:w-auto"
              disabled={archiveTerminalIssues.isPending}
              onClick={handleArchiveCompletedLegacyIssues}
            >
              <Archive className="h-4 w-4" />
              완료 일괄 숨김 ({terminalCleanupCount})
            </Button>
          ) : null}
          {completedLegacyIssues.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              data-testid="pms-legacy-issue-archive-toggle"
              className="w-full sm:w-auto"
              onClick={() => setShowCompletedLegacyIssues((value) => !value)}
            >
              {showCompletedLegacyIssues ? '완료 항목 숨기기' : `완료 항목 보기 (${completedLegacyIssues.length})`}
            </Button>
          ) : null}
        </div>
      </div>

      {visibleLegacyIssues.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {completedLegacyIssues.length > 0
            ? '열린 cleanup 대상은 없습니다. 필요하면 완료 항목을 펼쳐 이력을 확인하세요.'
            : (
                <>
                  정리할 기존 <code>Issue</code> 행이 없습니다.
                </>
              )}
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {visibleLegacyIssues.map((issue) => (
              <LegacyIssueMobileCard
                key={String(issue.id)}
                issue={issue}
                canManageIssues={canManageIssues}
                onConvert={handleConvertLegacyIssue}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                isConverting={isConvertingLegacyIssue}
                isDeleting={deleteIssue.isPending || archiveTerminalIssues.isPending || canonicalizePendingIssues.isPending}
              />
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-lg border md:block">
            <Table className="w-full text-sm">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="p-3 text-left font-medium">코드</TableHead>
                  <TableHead className="p-3 text-left font-medium">제목</TableHead>
                  <TableHead className="p-3 text-center font-medium">유형</TableHead>
                  <TableHead className="p-3 text-center font-medium">상태</TableHead>
                  <TableHead className="p-3 text-center font-medium">우선순위</TableHead>
                  <TableHead className="p-3 text-left font-medium">기존 담당자</TableHead>
                  <TableHead className="w-32 p-3 text-center font-medium">정식 전환</TableHead>
                  <TableHead className="w-16 p-3 text-center font-medium">숨김</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {visibleLegacyIssues.map((issue) => (
                  <TableRow key={String(issue.id)} data-testid="pms-legacy-issue-row" className="hover:bg-muted/30">
                    <TableCell className="p-3 font-mono text-xs">{issue.issueCode}</TableCell>
                    <TableCell className="p-3">{issue.issueTitle}</TableCell>
                    <TableCell className="p-3 text-center text-xs">
                      <div className="flex flex-col items-center gap-1">
                        <span>{TYPE_LABELS[issue.issueTypeCode] || issue.issueTypeCode}</span>
                        {CANONICAL_SURFACE_HINTS[issue.issueTypeCode] ? (
                          <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-caption-xs font-medium text-muted-foreground">
                            {CANONICAL_SURFACE_HINTS[issue.issueTypeCode]}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="p-3 text-center">
                      <Select
                        value={issue.statusCode}
                        onValueChange={(value) => handleStatusChange(issue, value)}
                        disabled={!canManageIssues}
                      >
                        <SelectTrigger className="mx-auto h-7 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([code, label]) => (
                            <SelectItem key={code} value={code}>
                              <span
                                className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[code] || ''}`}
                              >
                                {label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className={`p-3 text-center text-xs ${PRIORITY_COLORS[issue.priorityCode] || ''}`}>
                      {PRIORITY_LABELS[issue.priorityCode] || issue.priorityCode}
                    </TableCell>
                    <TableCell className="p-3 text-muted-foreground">
                      {issue.assignee?.displayName || issue.assignee?.userName || '-'}
                    </TableCell>
                    <TableCell className="p-3 text-center">
                      {canManageIssues ? (
                        <Button
                          variant="outline"
                          size="xs"
                          data-testid="pms-legacy-issue-canonicalize-action"
                          disabled={
                            isConvertingLegacyIssue || TERMINAL_LEGACY_ISSUE_STATUS_CODES.has(issue.statusCode)
                          }
                          onClick={() => handleConvertLegacyIssue(issue)}
                        >
                          <GitCompareArrows className="h-3.5 w-3.5" />
                          {TERMINAL_LEGACY_ISSUE_STATUS_CODES.has(issue.statusCode) ? '완료' : '전환'}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="p-3 text-center">
                      {canManageIssues ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          disabled={deleteIssue.isPending || archiveTerminalIssues.isPending || canonicalizePendingIssues.isPending}
                          onClick={() => handleDelete(String(issue.id))}
                          aria-label="기존 Issue 숨기기"
                          title="기존 Issue 숨기기"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
