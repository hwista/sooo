'use client';

import { Fragment, useState } from 'react';
import { FileOutput, Plus, Save, Settings2, Trash2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  useProjectAccess,
  useProjectMembers,
  useProjectDeliverables,
  useProjectEvents,
  useApplyDeliverableTemplate,
  useDeliverableTemplateGroups,
  useSaveDeliverableTemplateGroup,
  useUpsertDeliverable,
  useUpdateDeliverableSubmission,
  useReplaceDeliverableApprovalRoute,
  useDecideDeliverableApprovalStep,
  useDeleteDeliverable,
} from '@/hooks/queries/useProjects';
import type { DeliverableItem } from '@/lib/api/endpoints/projects';
import { formatPmsDate } from '@/lib/pms-format';
import { toast } from '@/lib/toast';
import { EventRollupSummary } from './EventRollupSummary';
import { CloseoutApprovalRoutePanel } from './CloseoutApprovalRoutePanel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';

const SUBMISSION_STATUS_COLORS: Record<string, string> = {
  not_submitted: 'bg-muted text-muted-foreground',
  before_submit: 'bg-muted text-muted-foreground',
  submitted: 'bg-ssoo-info-bg text-ssoo-info',
  confirmed: 'bg-ssoo-success-bg text-ssoo-success',
  approved: 'bg-ssoo-success-bg text-ssoo-success',
  final: 'bg-ssoo-success-bg text-ssoo-success',
  not_required: 'bg-ssoo-accent-bg text-ssoo-accent',
  rejected: 'bg-ssoo-danger-bg text-ssoo-danger',
};

const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  not_submitted: '미제출',
  before_submit: '미제출',
  submitted: '제출',
  confirmed: '확정',
  approved: '승인',
  final: '최종',
  not_required: '면제',
  rejected: '반려',
};

const VISIBLE_SUBMISSION_STATUS_CODES = [
  'not_submitted',
  'submitted',
  'confirmed',
  'approved',
  'not_required',
  'rejected',
] as const;

const INITIAL_FORM = {
  deliverableCode: '',
  submissionStatusCode: 'not_submitted',
  eventId: 'none',
  memo: '',
};

const TEMPLATE_DIALOG_DEFAULT = '__default__';
type TemplateApplyMode = 'append' | 'replace';

const INITIAL_TEMPLATE_FORM = {
  groupCode: '',
  groupName: '',
  description: '',
};

interface Props {
  projectId: number;
  statusCode: string;
}

function DeliverableMetaField({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-caption-2xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  );
}

function DeliverableStatusSelect({
  value,
  disabled,
  onChange,
  className = 'h-8 w-full text-xs',
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  className?: string;
}) {
  const normalizedValue = normalizeSubmissionStatusForSelect(value);

  return (
    <Select value={normalizedValue} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {VISIBLE_SUBMISSION_STATUS_CODES.map((code) => (
          <SelectItem key={code} value={code}>
            <span
              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${SUBMISSION_STATUS_COLORS[code] || ''}`}
            >
              {SUBMISSION_STATUS_LABELS[code]}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function normalizeSubmissionStatusForSelect(value: string) {
  if (value === 'before_submit') {
    return 'not_submitted';
  }
  if (value === 'final') {
    return 'confirmed';
  }
  return VISIBLE_SUBMISSION_STATUS_CODES.some((code) => code === value)
    ? value
    : 'not_submitted';
}

function DeliverableEventSelect({
  value,
  disabled,
  events,
  onChange,
  className = 'h-8 w-full text-xs',
}: {
  value: string;
  disabled: boolean;
  events: Array<{ eventId: number | string; eventName: string }>;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">미연결</SelectItem>
        {events.map((event) => (
          <SelectItem key={String(event.eventId)} value={String(event.eventId)}>
            {event.eventName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DeliverablesTab({ projectId, statusCode }: Props) {
  const { data: accessResponse } = useProjectAccess(projectId);
  const { data: membersResponse } = useProjectMembers(projectId);
  const { data, isLoading } = useProjectDeliverables(projectId, statusCode);
  const { data: eventResponse } = useProjectEvents(projectId);
  const { data: templateResponse } = useDeliverableTemplateGroups(projectId);
  const deliverables = data?.data ?? [];
  const events = eventResponse?.data ?? [];
  const templateGroups = templateResponse?.data ?? [];
  const members = membersResponse?.data ?? [];
  const eventLookup = new Map(events.map((event) => [String(event.eventId), event] as const));
  const canManageDeliverables = accessResponse?.data?.features.canManageDeliverables ?? false;

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplateCode, setSelectedTemplateCode] = useState(TEMPLATE_DIALOG_DEFAULT);
  const [templateApplyMode, setTemplateApplyMode] = useState<TemplateApplyMode>('append');
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [templateForm, setTemplateForm] = useState(INITIAL_TEMPLATE_FORM);
  const applyTemplate = useApplyDeliverableTemplate();
  const saveTemplate = useSaveDeliverableTemplateGroup();
  const upsertDeliverable = useUpsertDeliverable();
  const updateSubmission = useUpdateDeliverableSubmission();
  const replaceApprovalRoute = useReplaceDeliverableApprovalRoute();
  const decideApprovalStep = useDecideDeliverableApprovalStep();
  const deleteDeliverable = useDeleteDeliverable();

  const getErrorMessage = (error: unknown, fallback: string) => (
    error instanceof Error && error.message ? error.message : fallback
  );

  const handleApplyTemplate = async (groupCode?: string, applyMode: TemplateApplyMode = 'append') => {
    try {
      const result = await applyTemplate.mutateAsync({
        projectId,
        data: {
          statusCode,
          applyMode,
          ...(groupCode ? { groupCode } : {}),
        },
      });
      const applied = result.data;
      if (!applied) {
        throw new Error('응답 데이터가 비어 있습니다.');
      }
      toast.success('산출물 템플릿을 적용했습니다.', {
        description: `신규 ${applied.createdCount}건, 복구 ${applied.restoredCount}건, 유지 ${applied.keptCount}건, 비활성 ${applied.deactivatedCount}건`,
      });
      setShowTemplateDialog(false);
    } catch (error) {
      toast.error('산출물 템플릿을 적용하지 못했습니다.', {
        description: getErrorMessage(error, '잠시 후 다시 시도해주세요.'),
      });
    }
  };

  const handleSaveTemplate = async () => {
    try {
      const groupCode = templateForm.groupCode.trim();
      const groupName = templateForm.groupName.trim();
      const result = await saveTemplate.mutateAsync({
        projectId,
        data: {
          groupCode,
          groupName,
          description: templateForm.description.trim() || undefined,
          sortOrder: templateGroups.length + 1,
          items: deliverables.map((item, index) => ({
            deliverableCode: item.deliverableCode,
            deliverableName: item.deliverable?.deliverableName ?? item.deliverableName ?? item.deliverableCode,
            description: item.deliverable?.description ?? undefined,
            sortOrder: item.deliverable?.sortOrder ?? index + 1,
            memo: item.memo ?? undefined,
          })),
        },
      });
      const saved = result.data;
      if (saved) {
        setSelectedTemplateCode(saved.groupCode);
      }
      setTemplateForm(INITIAL_TEMPLATE_FORM);
      toast.success('산출물 템플릿을 저장했습니다.');
    } catch (error) {
      toast.error('산출물 템플릿을 저장하지 못했습니다.', {
        description: getErrorMessage(error, '잠시 후 다시 시도해주세요.'),
      });
    }
  };

  const handleCreate = async () => {
    await upsertDeliverable.mutateAsync({
      projectId,
      data: {
        statusCode,
        deliverableCode: formData.deliverableCode,
        submissionStatusCode: formData.submissionStatusCode,
        eventId: formData.eventId !== 'none' ? formData.eventId : undefined,
        memo: formData.memo || undefined,
      },
    });
    setShowAddDialog(false);
    setFormData(INITIAL_FORM);
  };

  const handleStatusChange = async (item: DeliverableItem, newStatus: string) => {
    await updateSubmission.mutateAsync({
      projectId,
      statusCode: item.statusCode,
      deliverableCode: item.deliverableCode,
      data: { submissionStatusCode: newStatus },
    });
  };

  const handleDelete = async (item: DeliverableItem) => {
    await deleteDeliverable.mutateAsync({
      projectId,
      statusCode: item.statusCode,
      deliverableCode: item.deliverableCode,
    });
  };

  const handleEventChange = (item: DeliverableItem, eventId: string) => {
    upsertDeliverable.mutate({
      projectId,
      data: {
        statusCode: item.statusCode,
        deliverableCode: item.deliverableCode,
        submissionStatusCode: item.submissionStatusCode,
        eventId: eventId !== 'none' ? eventId : undefined,
        memo: item.memo ?? undefined,
      },
    });
  };

  const handleSaveApprovalRoute = async (item: DeliverableItem, approverUserIds: string[]) => {
    try {
      await replaceApprovalRoute.mutateAsync({
        projectId,
        statusCode: item.statusCode,
        deliverableCode: item.deliverableCode,
        data: {
          steps: approverUserIds.map((approverUserId, index) => ({
            sequenceNo: index + 1,
            approverUserId,
          })),
        },
      });
      toast.success('산출물 승인선을 저장했습니다.');
    } catch (error) {
      toast.error('산출물 승인선을 저장하지 못했습니다.', {
        description: getErrorMessage(error, '잠시 후 다시 시도해주세요.'),
      });
    }
  };

  const handleDecideApprovalStep = async (
    item: DeliverableItem,
    approvalStepId: string,
    approvalStatusCode: 'approved' | 'rejected' | 'skipped',
  ) => {
    try {
      await decideApprovalStep.mutateAsync({
        projectId,
        statusCode: item.statusCode,
        deliverableCode: item.deliverableCode,
        approvalStepId,
        data: { approvalStatusCode },
      });
      toast.success(approvalStatusCode === 'approved' ? '산출물을 승인했습니다.' : '산출물을 반려했습니다.');
    } catch (error) {
      toast.error('산출물 승인 상태를 변경하지 못했습니다.', {
        description: getErrorMessage(error, '지정 승인자만 처리할 수 있습니다.'),
      });
    }
  };

  if (isLoading) return <div className="p-4 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <FileOutput className="h-4 w-4" />
            산출물 ({deliverables.length})
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            연결 이벤트를 선택하면 해당 이벤트의 진행 요약이 함께 표시됩니다.
          </p>
        </div>
        {canManageDeliverables && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => handleApplyTemplate()}
              disabled={applyTemplate.isPending}
            >
              <Wand2 className="h-4 w-4" />
              기본 템플릿
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setShowTemplateDialog(true)}
            >
              <Settings2 className="h-4 w-4" />
              템플릿 선택
            </Button>
            <Button size="sm" className="w-full sm:w-auto" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4" />
              산출물 추가
            </Button>
          </div>
        )}
      </div>

      {deliverables.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          아직 등록된 산출물이 없습니다.
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {deliverables.map((d: DeliverableItem) => {
              const linkedEvent = d.eventId ? eventLookup.get(String(d.eventId)) : undefined;

              return (
                <div key={`${d.statusCode}-${d.deliverableCode}`} className="space-y-3 rounded-md border bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-caption-2xs text-muted-foreground">{d.deliverableCode}</p>
                      <p className="mt-1 truncate text-sm font-semibold text-foreground">
                        {d.deliverable?.deliverableName ?? d.deliverableName ?? '-'}
                      </p>
                    </div>
                    {canManageDeliverables ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        disabled={deleteDeliverable.isPending}
                        onClick={() => handleDelete(d)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <DeliverableMetaField label="제출상태" className="col-span-2">
                      <DeliverableStatusSelect
                        value={d.submissionStatusCode}
                        onChange={(value) => handleStatusChange(d, value)}
                        disabled={!canManageDeliverables}
                      />
                    </DeliverableMetaField>
                    <DeliverableMetaField label="제출일">
                      {formatPmsDate(d.submittedAt)}
                    </DeliverableMetaField>
                    <DeliverableMetaField label="파일명">
                      <span className="block truncate">{d.originalFileName ?? '-'}</span>
                    </DeliverableMetaField>
                    <DeliverableMetaField label="연결 이벤트" className="col-span-2">
                      <DeliverableEventSelect
                        value={d.eventId ? String(d.eventId) : 'none'}
                        onChange={(value) => handleEventChange(d, value)}
                        disabled={!canManageDeliverables || upsertDeliverable.isPending}
                        events={events}
                      />
                      <EventRollupSummary rollup={linkedEvent?.rollup} className="mt-2" />
                    </DeliverableMetaField>
                    {d.memo ? (
                      <DeliverableMetaField label="메모" className="col-span-2">
                        <span className="text-xs text-muted-foreground">{d.memo}</span>
                      </DeliverableMetaField>
                    ) : null}
                  </div>
                  <CloseoutApprovalRoutePanel
                    title="산출물 승인선"
                    steps={d.approvalSteps ?? []}
                    members={members}
                    disabled={!canManageDeliverables}
                    isSaving={replaceApprovalRoute.isPending}
                    isDeciding={decideApprovalStep.isPending}
                    onSave={(approverUserIds) => handleSaveApprovalRoute(d, approverUserIds)}
                    onDecide={(approvalStepId, approvalStatusCode) =>
                      handleDecideApprovalStep(d, approvalStepId, approvalStatusCode)
                    }
                  />
                </div>
              );
            })}
          </div>
          <div className="hidden overflow-hidden rounded-lg border md:block">
            <Table className="w-full text-sm">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="p-3 text-left font-medium">코드</TableHead>
                  <TableHead className="p-3 text-left font-medium">산출물명</TableHead>
                  <TableHead className="p-3 text-left font-medium">연결 이벤트 / 요약</TableHead>
                  <TableHead className="p-3 text-center font-medium">제출상태</TableHead>
                  <TableHead className="p-3 text-left font-medium">제출일</TableHead>
                  <TableHead className="p-3 text-left font-medium">파일명</TableHead>
                  <TableHead className="p-3 text-left font-medium">메모</TableHead>
                  <TableHead className="w-16 p-3 text-center font-medium">삭제</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {deliverables.map((d: DeliverableItem) => {
                  const linkedEvent = d.eventId ? eventLookup.get(String(d.eventId)) : undefined;

                  return (
                    <Fragment key={`${d.statusCode}-${d.deliverableCode}`}>
                      <TableRow className="hover:bg-muted/30">
                        <TableCell className="p-3 font-mono text-xs">{d.deliverableCode}</TableCell>
                        <TableCell className="p-3">{d.deliverable?.deliverableName ?? d.deliverableName ?? '-'}</TableCell>
                        <TableCell className="p-3">
                          <DeliverableEventSelect
                            value={d.eventId ? String(d.eventId) : 'none'}
                            onChange={(value) => handleEventChange(d, value)}
                            disabled={!canManageDeliverables || upsertDeliverable.isPending}
                            events={events}
                            className="h-7 w-36 text-xs"
                          />
                          <EventRollupSummary rollup={linkedEvent?.rollup} className="mt-1" />
                        </TableCell>
                        <TableCell className="p-3 text-center">
                          <DeliverableStatusSelect
                            value={d.submissionStatusCode}
                            onChange={(value) => handleStatusChange(d, value)}
                            disabled={!canManageDeliverables}
                            className="mx-auto h-7 w-24 text-xs"
                          />
                        </TableCell>
                        <TableCell className="p-3 text-muted-foreground">
                          {formatPmsDate(d.submittedAt)}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate p-3 text-xs text-muted-foreground">
                          {d.originalFileName ?? '-'}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate p-3 text-xs text-muted-foreground">
                          {d.memo ?? '-'}
                        </TableCell>
                        <TableCell className="p-3 text-center">
                          {canManageDeliverables ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              disabled={deleteDeliverable.isPending}
                              onClick={() => handleDelete(d)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={8} className="p-3">
                          <CloseoutApprovalRoutePanel
                            title="산출물 승인선"
                            steps={d.approvalSteps ?? []}
                            members={members}
                            disabled={!canManageDeliverables}
                            isSaving={replaceApprovalRoute.isPending}
                            isDeciding={decideApprovalStep.isPending}
                            onSave={(approverUserIds) => handleSaveApprovalRoute(d, approverUserIds)}
                            onDecide={(approvalStepId, approvalStatusCode) =>
                              handleDecideApprovalStep(d, approvalStepId, approvalStatusCode)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>산출물 추가</DialogTitle>
            <DialogDescription>프로젝트에 새 산출물을 등록합니다.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">산출물 코드</label>
              <Input
                placeholder="예: DLV-001"
                value={formData.deliverableCode}
                onChange={(e) => setFormData({ ...formData, deliverableCode: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">제출 상태</label>
              <Select
                value={formData.submissionStatusCode}
                onValueChange={(value) => setFormData({ ...formData, submissionStatusCode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIBLE_SUBMISSION_STATUS_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {SUBMISSION_STATUS_LABELS[code]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">연결 이벤트</label>
              <Select
                value={formData.eventId}
                onValueChange={(value) => setFormData({ ...formData, eventId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">미연결</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={String(event.eventId)} value={String(event.eventId)}>
                      {event.eventName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">메모 (선택)</label>
              <Textarea
                placeholder="산출물에 대한 메모"
                rows={3}
                value={formData.memo}
                onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setShowAddDialog(false)}
            >
              취소
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={handleCreate}
              disabled={!formData.deliverableCode.trim() || upsertDeliverable.isPending || !canManageDeliverables}
            >
              {upsertDeliverable.isPending ? '등록 중...' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>산출물 템플릿</DialogTitle>
            <DialogDescription>현재 단계에 적용할 템플릿을 선택하거나 현재 목록을 템플릿으로 저장합니다.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-3 rounded-md border p-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">적용 템플릿</label>
                <Select value={selectedTemplateCode} onValueChange={setSelectedTemplateCode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TEMPLATE_DIALOG_DEFAULT}>상태 기본 템플릿</SelectItem>
                    {templateGroups.map((group) => (
                      <SelectItem key={group.groupCode} value={group.groupCode}>
                        {group.groupName} ({group.items.length})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
                <Checkbox
                  id="deliverable-template-replace-mode"
                  checked={templateApplyMode === 'replace'}
                  onCheckedChange={(checked) => setTemplateApplyMode(checked === true ? 'replace' : 'append')}
                />
                <label htmlFor="deliverable-template-replace-mode" className="text-sm font-medium">
                  기존 산출물 교체
                </label>
              </div>
              <Button
                className="w-full sm:w-auto"
                onClick={() =>
                  handleApplyTemplate(
                    selectedTemplateCode === TEMPLATE_DIALOG_DEFAULT ? undefined : selectedTemplateCode,
                    templateApplyMode,
                  )
                }
                disabled={applyTemplate.isPending}
              >
                <Wand2 className="h-4 w-4" />
                {applyTemplate.isPending ? '적용 중...' : '선택 템플릿 적용'}
              </Button>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">그룹 코드</label>
                  <Input
                    placeholder="예: execution-customer-a"
                    value={templateForm.groupCode}
                    onChange={(event) => setTemplateForm({ ...templateForm, groupCode: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">그룹명</label>
                  <Input
                    placeholder="예: 고객사 A 수행 산출물"
                    value={templateForm.groupName}
                    onChange={(event) => setTemplateForm({ ...templateForm, groupName: event.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">설명</label>
                <Textarea
                  rows={2}
                  value={templateForm.description}
                  onChange={(event) => setTemplateForm({ ...templateForm, description: event.target.value })}
                />
              </div>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={handleSaveTemplate}
                disabled={
                  !templateForm.groupCode.trim()
                  || !templateForm.groupName.trim()
                  || deliverables.length === 0
                  || saveTemplate.isPending
                }
              >
                <Save className="h-4 w-4" />
                {saveTemplate.isPending ? '저장 중...' : '현재 목록 저장'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
