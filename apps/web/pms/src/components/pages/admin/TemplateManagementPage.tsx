'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  History,
  LayoutTemplate,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ErrorState, LoadingState } from '@/components/common/StateDisplay';
import {
  useDeactivatePmsCloseConditionTemplateGroup,
  useDeactivatePmsDeliverableTemplateGroup,
  usePmsCloseConditionTemplateGroupHistory,
  usePmsCloseConditionTemplateGroups,
  usePmsDeliverableTemplateGroupHistory,
  usePmsDeliverableTemplateGroups,
  useRestorePmsCloseConditionTemplateGroup,
  useRestorePmsDeliverableTemplateGroup,
  useSavePmsCloseConditionTemplateGroup,
  useSavePmsDeliverableTemplateGroup,
  useUpdatePmsCloseConditionTemplateGroupApproval,
  useUpdatePmsDeliverableTemplateGroupApproval,
} from '@/hooks/queries/usePmsTemplates';
import type {
  CloseConditionTemplateGroup,
  DeliverableTemplateGroup,
  TemplateGroupApprovalStatusCode,
  TemplateGroupHistory,
  UpsertCloseConditionTemplateGroupRequest,
  UpsertDeliverableTemplateGroupRequest,
} from '@/lib/api/endpoints/templates';
import { formatPmsShortDateTime } from '@/lib/pms-format';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';

type TemplateMode = 'deliverables' | 'close-conditions';
type TemplateGroup = DeliverableTemplateGroup | CloseConditionTemplateGroup;
type DeliverableTemplateItemInput = UpsertDeliverableTemplateGroupRequest['items'][number];
type CloseConditionTemplateItemInput = UpsertCloseConditionTemplateGroupRequest['items'][number];

interface TemplateFormState {
  groupCode: string;
  groupName: string;
  description: string;
  sortOrder: string;
  itemText: string;
}

type ConfirmAction =
  | { kind: 'archive'; title: string; description: string }
  | { kind: 'restore'; title: string; description: string; historySeq: string };

const EMPTY_FORM: TemplateFormState = {
  groupCode: '',
  groupName: '',
  description: '',
  sortOrder: '0',
  itemText: '',
};

const STATUS_LABELS: Record<TemplateGroupApprovalStatusCode, string> = {
  draft: '초안',
  approved: '승인',
  archived: '보관',
};

const MODE_LABELS: Record<TemplateMode, string> = {
  deliverables: '산출물',
  'close-conditions': '종료조건',
};

function isDeliverableGroup(group: TemplateGroup): group is DeliverableTemplateGroup {
  return group.items.some((item) => 'deliverableCode' in item);
}

function buildFormFromGroup(group: TemplateGroup, mode: TemplateMode): TemplateFormState {
  const itemText = mode === 'deliverables'
    ? (group as DeliverableTemplateGroup).items
        .map((item) => [
          item.deliverableCode,
          item.deliverableName,
          item.description ?? '',
          item.memo ?? '',
        ].join(' | '))
        .join('\n')
    : (group as CloseConditionTemplateGroup).items
        .map((item) => [
          item.conditionCode,
          item.requiresDeliverable ? 'true' : 'false',
          item.memo ?? '',
        ].join(' | '))
        .join('\n');

  return {
    groupCode: group.groupCode,
    groupName: group.groupName,
    description: group.description ?? '',
    sortOrder: String(group.sortOrder ?? 0),
    itemText,
  };
}

function parseDeliverableItems(itemText: string): UpsertDeliverableTemplateGroupRequest['items'] {
  const items: DeliverableTemplateItemInput[] = [];

  itemText.split('\n').forEach((line, index) => {
    const [code = '', name = '', description = '', memo = ''] = line.split('|').map((part) => part.trim());
    if (!code) return;

    items.push({
      deliverableCode: code,
      deliverableName: name || code,
      description: description || null,
      sortOrder: index + 1,
      memo: memo || null,
    });
  });

  return items;
}

function parseCloseConditionItems(itemText: string): UpsertCloseConditionTemplateGroupRequest['items'] {
  const items: CloseConditionTemplateItemInput[] = [];

  itemText.split('\n').forEach((line, index) => {
    const [code = '', requiresDeliverableValue = 'true', memo = ''] = line.split('|').map((part) => part.trim());
    if (!code) return;

    items.push({
      conditionCode: code,
      requiresDeliverable: !['false', 'n', 'no', '0', '아니오'].includes(requiresDeliverableValue.toLowerCase()),
      sortOrder: index + 1,
      memo: memo || null,
    });
  });

  return items;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return '요청 처리 중 오류가 발생했습니다.';
}

function getGroupItemCount(group: TemplateGroup): number {
  return group.items.filter((item) => item.isActive).length;
}

function getStatusTone(status: TemplateGroupApprovalStatusCode) {
  if (status === 'approved') return 'bg-ssoo-success-bg text-ssoo-success border-ssoo-success-border';
  if (status === 'archived') return 'bg-muted text-muted-foreground border-border';
  return 'bg-ssoo-warning-bg text-ssoo-warning border-ssoo-warning-border';
}

export function TemplateManagementPage() {
  const [mode, setMode] = useState<TemplateMode>('deliverables');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateFormState>(EMPTY_FORM);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const deliverableGroupsQuery = usePmsDeliverableTemplateGroups();
  const closeConditionGroupsQuery = usePmsCloseConditionTemplateGroups();
  const saveDeliverableGroup = useSavePmsDeliverableTemplateGroup();
  const saveCloseConditionGroup = useSavePmsCloseConditionTemplateGroup();
  const updateDeliverableApproval = useUpdatePmsDeliverableTemplateGroupApproval();
  const updateCloseConditionApproval = useUpdatePmsCloseConditionTemplateGroupApproval();
  const deactivateDeliverableGroup = useDeactivatePmsDeliverableTemplateGroup();
  const deactivateCloseConditionGroup = useDeactivatePmsCloseConditionTemplateGroup();
  const restoreDeliverableGroup = useRestorePmsDeliverableTemplateGroup();
  const restoreCloseConditionGroup = useRestorePmsCloseConditionTemplateGroup();

  const groups = useMemo<TemplateGroup[]>(() => {
    if (mode === 'deliverables') {
      return deliverableGroupsQuery.data?.data ?? [];
    }
    return closeConditionGroupsQuery.data?.data ?? [];
  }, [closeConditionGroupsQuery.data?.data, deliverableGroupsQuery.data?.data, mode]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.groupCode === selectedCode) ?? null,
    [groups, selectedCode],
  );

  const deliverableHistoryQuery = usePmsDeliverableTemplateGroupHistory(
    selectedCode ?? undefined,
    mode === 'deliverables' && Boolean(selectedCode),
  );
  const closeConditionHistoryQuery = usePmsCloseConditionTemplateGroupHistory(
    selectedCode ?? undefined,
    mode === 'close-conditions' && Boolean(selectedCode),
  );
  const historyQuery = mode === 'deliverables' ? deliverableHistoryQuery : closeConditionHistoryQuery;

  const isLoading = mode === 'deliverables' ? deliverableGroupsQuery.isLoading : closeConditionGroupsQuery.isLoading;
  const isError = mode === 'deliverables' ? deliverableGroupsQuery.isError : closeConditionGroupsQuery.isError;
  const refetch = mode === 'deliverables' ? deliverableGroupsQuery.refetch : closeConditionGroupsQuery.refetch;
  const isMutating = saveDeliverableGroup.isPending
    || saveCloseConditionGroup.isPending
    || updateDeliverableApproval.isPending
    || updateCloseConditionApproval.isPending
    || deactivateDeliverableGroup.isPending
    || deactivateCloseConditionGroup.isPending
    || restoreDeliverableGroup.isPending
    || restoreCloseConditionGroup.isPending;

  useEffect(() => {
    if (selectedGroup) {
      setForm(buildFormFromGroup(selectedGroup, mode));
      return;
    }

    if (groups.length > 0) {
      setSelectedCode(groups[0].groupCode);
      return;
    }

    setSelectedCode(null);
    setForm(EMPTY_FORM);
  }, [groups, mode, selectedGroup]);

  const handleModeChange = (nextMode: TemplateMode) => {
    setMode(nextMode);
    setSelectedCode(null);
    setForm(EMPTY_FORM);
  };

  const handleNew = () => {
    setSelectedCode(null);
    setForm(EMPTY_FORM);
  };

  const handleSelect = (group: TemplateGroup) => {
    setSelectedCode(group.groupCode);
    setForm(buildFormFromGroup(group, mode));
  };

  const handleSave = async () => {
    const groupCode = form.groupCode.trim();
    const groupName = form.groupName.trim();
    if (!groupCode || !groupName) {
      toast.warning('그룹 코드와 그룹명은 필수입니다.');
      return;
    }

    try {
      if (mode === 'deliverables') {
        const items = parseDeliverableItems(form.itemText);
        if (items.length === 0) {
          toast.warning('산출물 항목은 1건 이상 필요합니다.');
          return;
        }
        const response = await saveDeliverableGroup.mutateAsync({
          groupCode,
          groupName,
          description: form.description.trim() || null,
          sortOrder: Number(form.sortOrder) || 0,
          items,
        });
        if (!response.success || !response.data) throw new Error(response.message);
        setSelectedCode(response.data.groupCode);
        return;
      }

      const items = parseCloseConditionItems(form.itemText);
      if (items.length === 0) {
        toast.warning('종료조건 항목은 1건 이상 필요합니다.');
        return;
      }
      const response = await saveCloseConditionGroup.mutateAsync({
        groupCode,
        groupName,
        description: form.description.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
        items,
      });
      if (!response.success || !response.data) throw new Error(response.message);
      setSelectedCode(response.data.groupCode);
    } catch (error) {
      toast.error('템플릿을 저장하지 못했습니다.', {
        description: getErrorMessage(error),
      });
    }
  };

  const handleApproval = async (approvalStatusCode: TemplateGroupApprovalStatusCode) => {
    if (!selectedGroup) return;

    try {
      const payload = { groupCode: selectedGroup.groupCode, approvalStatusCode };
      const response = mode === 'deliverables'
        ? await updateDeliverableApproval.mutateAsync(payload)
        : await updateCloseConditionApproval.mutateAsync(payload);
      if (!response.success) throw new Error(response.message);
    } catch (error) {
      toast.error('승인 상태를 변경하지 못했습니다.', {
        description: getErrorMessage(error),
      });
    }
  };

  const handleArchive = () => {
    if (!selectedGroup) return;
    setConfirmAction({
      kind: 'archive',
      title: `${selectedGroup.groupName} 보관`,
      description: `${MODE_LABELS[mode]} 템플릿을 보관 상태로 전환합니다.`,
    });
  };

  const handleRestore = (history: TemplateGroupHistory) => {
    if (!selectedGroup) return;
    setConfirmAction({
      kind: 'restore',
      title: `${selectedGroup.groupName} 복구`,
      description: `${formatPmsShortDateTime(history.eventAt)} 이력으로 복구합니다.`,
      historySeq: history.historySeq,
    });
  };

  const executeConfirmedAction = async () => {
    if (!selectedGroup || !confirmAction) return;

    try {
      if (confirmAction.kind === 'archive') {
        const response = mode === 'deliverables'
          ? await deactivateDeliverableGroup.mutateAsync(selectedGroup.groupCode)
          : await deactivateCloseConditionGroup.mutateAsync(selectedGroup.groupCode);
        if (!response.success) throw new Error(response.message);
      } else {
        const payload = { groupCode: selectedGroup.groupCode, historySeq: confirmAction.historySeq };
        const response = mode === 'deliverables'
          ? await restoreDeliverableGroup.mutateAsync(payload)
          : await restoreCloseConditionGroup.mutateAsync(payload);
        if (!response.success || !response.data) throw new Error(response.message);
        setSelectedCode(response.data.groupCode);
      }
      setConfirmAction(null);
    } catch (error) {
      toast.error('템플릿 작업을 완료하지 못했습니다.', {
        description: getErrorMessage(error),
      });
    }
  };

  if (isLoading) {
    return <LoadingState message="템플릿을 불러오는 중..." fullHeight />;
  }

  if (isError) {
    return <ErrorState defaultMessage="템플릿을 불러오지 못했습니다." onRetry={() => void refetch()} />;
  }

  return (
    <main className="flex h-full min-h-0 flex-col gap-4 p-4">
      <section className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LayoutTemplate className="h-4 w-4" />
            <span>관리</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">템플릿 관리</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['deliverables', 'close-conditions'] as const).map((item) => (
            <Button
              key={item}
              type="button"
              variant={mode === item ? 'default' : 'outline'}
              onClick={() => handleModeChange(item)}
            >
              {MODE_LABELS[item]}
            </Button>
          ))}
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            <RefreshCw className="icon-body" />
            새로고침
          </Button>
          <Button type="button" onClick={handleNew}>
            <Plus className="icon-body" />
            새 템플릿
          </Button>
        </div>
      </section>

      <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
        <div className="min-h-0 overflow-hidden rounded-md border bg-background">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-base font-semibold tracking-normal">{MODE_LABELS[mode]} 그룹</h2>
            <span className="text-sm text-muted-foreground">{groups.length}건</span>
          </div>
          <div className="h-full overflow-auto">
            <Table className="w-full text-sm">
              <TableHeader>
                <TableRow className="border-b bg-muted">
                  <TableHead className="px-3 py-2 text-left font-medium text-muted-foreground">그룹</TableHead>
                  <TableHead className="w-20 px-3 py-2 text-center font-medium text-muted-foreground">버전</TableHead>
                  <TableHead className="w-20 px-3 py-2 text-center font-medium text-muted-foreground">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow
                    key={group.groupCode}
                    className={cn(
                      'cursor-pointer border-b hover:bg-muted/60',
                      selectedCode === group.groupCode && 'bg-muted',
                    )}
                    onClick={() => handleSelect(group)}
                  >
                    <TableCell className="px-3 py-2">
                      <div className="font-medium">{group.groupName}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{group.groupCode}</span>
                        <span>{getGroupItemCount(group)}개</span>
                        {!group.isActive && <span>비활성</span>}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-center">{group.versionNo}</TableCell>
                    <TableCell className="px-3 py-2 text-center">
                      <Badge className={cn('border', getStatusTone(group.approvalStatusCode))}>
                        {STATUS_LABELS[group.approvalStatusCode]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
          <section className="min-h-0 overflow-auto rounded-md border bg-background">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
              <div>
                <h2 className="text-base font-semibold tracking-normal">편집</h2>
                {selectedGroup && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {STATUS_LABELS[selectedGroup.approvalStatusCode]} · 버전 {selectedGroup.versionNo}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={() => void handleApproval('draft')} disabled={!selectedGroup || isMutating}>
                  초안
                </Button>
                <Button type="button" variant="outline" onClick={() => void handleApproval('approved')} disabled={!selectedGroup || isMutating}>
                  <CheckCircle2 className="icon-body" />
                  승인
                </Button>
                <Button type="button" variant="outline" onClick={handleArchive} disabled={!selectedGroup || isMutating}>
                  <Trash2 className="icon-body" />
                  보관
                </Button>
                <Button type="button" onClick={() => void handleSave()} disabled={isMutating}>
                  <Save className="icon-body" />
                  저장
                </Button>
              </div>
            </div>

            <div className="grid gap-4 p-4">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px]">
                <label className="grid gap-1 text-sm font-medium">
                  그룹 코드
                  <Input
                    value={form.groupCode}
                    onChange={(event) => setForm((current) => ({ ...current, groupCode: event.target.value }))}
                    placeholder="execution-default"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  그룹명
                  <Input
                    value={form.groupName}
                    onChange={(event) => setForm((current) => ({ ...current, groupName: event.target.value }))}
                    placeholder="수행 기본"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  정렬
                  <Input
                    type="number"
                    value={form.sortOrder}
                    onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
                  />
                </label>
              </div>

              <label className="grid gap-1 text-sm font-medium">
                설명
                <Input
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="적용 단계와 용도"
                />
              </label>

              <label className="grid gap-1 text-sm font-medium">
                {mode === 'deliverables' ? '산출물 항목' : '종료조건 항목'}
                <Textarea
                  className="min-h-64 font-mono text-sm"
                  value={form.itemText}
                  onChange={(event) => setForm((current) => ({ ...current, itemText: event.target.value }))}
                  placeholder={mode === 'deliverables'
                    ? 'code | name | description | memo'
                    : 'code | true | memo'}
                />
              </label>

              {selectedGroup && (
                <TemplateItemsPreview group={selectedGroup} />
              )}
            </div>
          </section>

          <section className="min-h-0 overflow-auto rounded-md border bg-background">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-semibold tracking-normal">이력</h2>
            </div>
            <div className="grid gap-2 p-4">
              {!selectedGroup && (
                <p className="py-8 text-center text-sm text-muted-foreground">선택된 그룹이 없습니다.</p>
              )}
              {selectedGroup && historyQuery.isLoading && (
                <LoadingState message="이력을 불러오는 중..." size="sm" />
              )}
              {selectedGroup && !historyQuery.isLoading && (historyQuery.data?.data ?? []).map((history) => (
                <div key={history.historySeq} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{formatPmsShortDateTime(history.eventAt)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {history.eventType} · 버전 {history.versionNo ?? '-'} · {history.isActive ? '활성' : '비활성'}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(history)}
                      disabled={isMutating}
                    >
                      <RotateCcw className="icon-body" />
                      복구
                    </Button>
                  </div>
                </div>
              ))}
              {selectedGroup && !historyQuery.isLoading && (historyQuery.data?.data ?? []).length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">이력이 없습니다.</p>
              )}
            </div>
          </section>
        </div>
      </section>

      <Dialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction?.title ?? ''}</DialogTitle>
            <DialogDescription>{confirmAction?.description ?? ''}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmAction(null)}>
              취소
            </Button>
            <Button type="button" onClick={() => void executeConfirmedAction()} disabled={isMutating}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function TemplateItemsPreview({ group }: { group: TemplateGroup }) {
  if (isDeliverableGroup(group)) {
    return (
      <div className="overflow-hidden rounded-md border">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="border-b bg-muted">
              <TableHead className="w-40 px-3 py-2 text-left font-medium text-muted-foreground">코드</TableHead>
              <TableHead className="px-3 py-2 text-left font-medium text-muted-foreground">산출물</TableHead>
              <TableHead className="w-20 px-3 py-2 text-center font-medium text-muted-foreground">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.items.map((item) => (
              <TableRow key={item.deliverableCode} className="border-b">
                <TableCell className="px-3 py-2 font-mono text-xs">{item.deliverableCode}</TableCell>
                <TableCell className="px-3 py-2">
                  <div className="font-medium">{item.deliverableName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.description ?? item.memo ?? '-'}</div>
                </TableCell>
                <TableCell className="px-3 py-2 text-center text-xs text-muted-foreground">
                  {item.isActive ? '활성' : '비활성'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow className="border-b bg-muted">
            <TableHead className="px-3 py-2 text-left font-medium text-muted-foreground">종료조건</TableHead>
            <TableHead className="w-24 px-3 py-2 text-center font-medium text-muted-foreground">산출물 필요</TableHead>
            <TableHead className="w-20 px-3 py-2 text-center font-medium text-muted-foreground">상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {group.items.map((item) => (
            <TableRow key={item.conditionCode} className="border-b">
              <TableCell className="px-3 py-2">
                <div className="font-mono text-xs">{item.conditionCode}</div>
                <div className="mt-1 text-xs text-muted-foreground">{item.memo ?? '-'}</div>
              </TableCell>
              <TableCell className="px-3 py-2 text-center">{item.requiresDeliverable ? '필요' : '불필요'}</TableCell>
              <TableCell className="px-3 py-2 text-center text-xs text-muted-foreground">
                {item.isActive ? '활성' : '비활성'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
