'use client';

import { useState } from 'react';
import { ClipboardCheck, Plus, Trash2, CheckCircle2, Circle, FileOutput, Save, Settings2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  useProjectCloseConditions,
  useProjectEvents,
  useApplyCloseConditionTemplate,
  useCloseConditionTemplateGroups,
  useSaveCloseConditionTemplateGroup,
  useUpsertCloseCondition,
  useToggleCloseCondition,
  useReplaceCloseConditionApprovalRoute,
  useDecideCloseConditionApprovalStep,
  useDeleteCloseCondition,
} from '@/hooks/queries/useProjects';
import type { CloseConditionItem } from '@/lib/api/endpoints/projects';
import { formatPmsDate } from '@/lib/pms-format';
import { toast } from '@/lib/toast';
import { EventRollupSummary } from './EventRollupSummary';
import { CloseoutApprovalRoutePanel } from './CloseoutApprovalRoutePanel';

const INITIAL_FORM = {
  conditionCode: '',
  requiresDeliverable: false,
  eventId: 'none',
  sortOrder: 0,
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

export function CloseConditionsTab({ projectId, statusCode }: Props) {
  const { data: accessResponse } = useProjectAccess(projectId);
  const { data: membersResponse } = useProjectMembers(projectId);
  const { data, isLoading } = useProjectCloseConditions(projectId, statusCode);
  const { data: eventResponse } = useProjectEvents(projectId);
  const { data: templateResponse } = useCloseConditionTemplateGroups(projectId);
  const conditions = data?.data ?? [];
  const events = eventResponse?.data ?? [];
  const templateGroups = templateResponse?.data ?? [];
  const members = membersResponse?.data ?? [];
  const eventLookup = new Map(events.map((event) => [String(event.eventId), event] as const));
  const canManageCloseConditions = accessResponse?.data?.features.canManageCloseConditions ?? false;

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplateCode, setSelectedTemplateCode] = useState(TEMPLATE_DIALOG_DEFAULT);
  const [templateApplyMode, setTemplateApplyMode] = useState<TemplateApplyMode>('append');
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [templateForm, setTemplateForm] = useState(INITIAL_TEMPLATE_FORM);
  const applyTemplate = useApplyCloseConditionTemplate();
  const saveTemplate = useSaveCloseConditionTemplateGroup();
  const upsertCondition = useUpsertCloseCondition();
  const toggleCondition = useToggleCloseCondition();
  const replaceApprovalRoute = useReplaceCloseConditionApprovalRoute();
  const decideApprovalStep = useDecideCloseConditionApprovalStep();
  const deleteCondition = useDeleteCloseCondition();

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
      toast.success('종료조건 템플릿을 적용했습니다.', {
        description: `신규 ${applied.createdCount}건, 복구 ${applied.restoredCount}건, 유지 ${applied.keptCount}건, 비활성 ${applied.deactivatedCount}건`,
      });
      setShowTemplateDialog(false);
    } catch (error) {
      toast.error('종료조건 템플릿을 적용하지 못했습니다.', {
        description: getErrorMessage(error, '잠시 후 다시 시도해주세요.'),
      });
    }
  };

  const handleSaveTemplate = async () => {
    try {
      const result = await saveTemplate.mutateAsync({
        projectId,
        data: {
          groupCode: templateForm.groupCode.trim(),
          groupName: templateForm.groupName.trim(),
          description: templateForm.description.trim() || undefined,
          sortOrder: templateGroups.length + 1,
          items: conditions.map((item, index) => ({
            conditionCode: item.conditionCode,
            requiresDeliverable: item.requiresDeliverable,
            sortOrder: item.sortOrder || index + 1,
            memo: item.memo ?? undefined,
          })),
        },
      });
      const saved = result.data;
      if (saved) {
        setSelectedTemplateCode(saved.groupCode);
      }
      setTemplateForm(INITIAL_TEMPLATE_FORM);
      toast.success('종료조건 템플릿을 저장했습니다.');
    } catch (error) {
      toast.error('종료조건 템플릿을 저장하지 못했습니다.', {
        description: getErrorMessage(error, '잠시 후 다시 시도해주세요.'),
      });
    }
  };

  const handleCreate = async () => {
    try {
      await upsertCondition.mutateAsync({
        projectId,
        data: {
          statusCode,
          conditionCode: formData.conditionCode,
          requiresDeliverable: formData.requiresDeliverable,
          eventId: formData.eventId !== 'none' ? formData.eventId : undefined,
          sortOrder: formData.sortOrder || undefined,
          memo: formData.memo || undefined,
        },
      });
      setShowAddDialog(false);
      setFormData(INITIAL_FORM);
    } catch (error) {
      toast.error('종료조건을 등록하지 못했습니다.', {
        description: getErrorMessage(error, '잠시 후 다시 시도해주세요.'),
      });
    }
  };

  const handleToggle = async (item: CloseConditionItem) => {
    try {
      await toggleCondition.mutateAsync({
        projectId,
        statusCode: item.statusCode,
        conditionCode: item.conditionCode,
        data: { isChecked: !item.isChecked },
      });
    } catch (error) {
      toast.error('종료조건 상태를 변경하지 못했습니다.', {
        description: getErrorMessage(error, '잠시 후 다시 시도해주세요.'),
      });
    }
  };

  const handleDelete = async (item: CloseConditionItem) => {
    try {
      await deleteCondition.mutateAsync({
        projectId,
        statusCode: item.statusCode,
        conditionCode: item.conditionCode,
      });
    } catch (error) {
      toast.error('종료조건을 삭제하지 못했습니다.', {
        description: getErrorMessage(error, '잠시 후 다시 시도해주세요.'),
      });
    }
  };

  const handleEventChange = async (item: CloseConditionItem, eventId: string) => {
    try {
      await upsertCondition.mutateAsync({
        projectId,
        data: {
          statusCode: item.statusCode,
          conditionCode: item.conditionCode,
          requiresDeliverable: item.requiresDeliverable,
          eventId: eventId !== 'none' ? eventId : undefined,
          sortOrder: item.sortOrder,
          memo: item.memo ?? undefined,
        },
      });
    } catch (error) {
      toast.error('연결 이벤트를 변경하지 못했습니다.', {
        description: getErrorMessage(error, '잠시 후 다시 시도해주세요.'),
      });
    }
  };

  const handleSaveApprovalRoute = async (item: CloseConditionItem, approverUserIds: string[]) => {
    try {
      await replaceApprovalRoute.mutateAsync({
        projectId,
        statusCode: item.statusCode,
        conditionCode: item.conditionCode,
        data: {
          steps: approverUserIds.map((approverUserId, index) => ({
            sequenceNo: index + 1,
            approverUserId,
          })),
        },
      });
      toast.success('종료조건 승인선을 저장했습니다.');
    } catch (error) {
      toast.error('종료조건 승인선을 저장하지 못했습니다.', {
        description: getErrorMessage(error, '잠시 후 다시 시도해주세요.'),
      });
    }
  };

  const handleDecideApprovalStep = async (
    item: CloseConditionItem,
    approvalStepId: string,
    approvalStatusCode: 'approved' | 'rejected' | 'skipped',
  ) => {
    try {
      await decideApprovalStep.mutateAsync({
        projectId,
        statusCode: item.statusCode,
        conditionCode: item.conditionCode,
        approvalStepId,
        data: { approvalStatusCode },
      });
      toast.success(approvalStatusCode === 'approved' ? '종료조건을 승인했습니다.' : '종료조건을 반려했습니다.');
    } catch (error) {
      toast.error('종료조건 승인 상태를 변경하지 못했습니다.', {
        description: getErrorMessage(error, '지정 승인자만 처리할 수 있습니다.'),
      });
    }
  };

  const checkedCount = conditions.filter((c: CloseConditionItem) => c.isChecked).length;

  if (isLoading) return <div className="p-4 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardCheck className="h-4 w-4" />
            종료조건 ({checkedCount}/{conditions.length})
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            연결 이벤트를 선택하면 해당 이벤트의 진행 요약이 함께 표시됩니다.
          </p>
        </div>
        {canManageCloseConditions && (
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
              종료조건 추가
            </Button>
          </div>
        )}
      </div>

      {conditions.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          아직 등록된 종료조건이 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {conditions.map((c: CloseConditionItem) => (
            <div
              key={`${c.statusCode}-${c.conditionCode}`}
              className={`rounded-lg border transition-colors ${
                c.isChecked ? 'bg-ssoo-success-bg border-ssoo-success-border' : 'bg-card hover:bg-muted/30'
              }`}
            >
              <div className="flex items-start gap-3 p-3">
                <Button variant="plain" size="plain"
                  className="mt-0.5 shrink-0"
                  onClick={() => handleToggle(c)}
                  disabled={toggleCondition.isPending || !canManageCloseConditions}
                >
                  {c.isChecked ? (
                    <CheckCircle2 className="h-5 w-5 text-ssoo-success" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </Button>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-medium ${c.isChecked ? 'line-through text-muted-foreground' : ''}`}>
                      {c.conditionCode}
                    </span>
                    {c.event && (
                      <span className="inline-flex items-center rounded-full bg-ssoo-accent-bg px-2 py-0.5 text-caption-xs font-medium text-ssoo-accent">
                        {c.event.eventName}
                      </span>
                    )}
                    {c.requiresDeliverable && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-ssoo-info-bg px-2 py-0.5 text-caption-xs font-medium text-ssoo-info">
                        <FileOutput className="h-3 w-3" />
                        산출물 필요
                      </span>
                    )}
                  </div>
                  {c.memo && (
                    <p className="text-xs text-muted-foreground mt-1">{c.memo}</p>
                  )}
                  {c.checkedAt && (
                    <p className="text-caption-xs text-muted-foreground mt-1">
                      완료: {formatPmsDate(c.checkedAt)}
                    </p>
                  )}
                  <div className="mt-2">
                    <Select
                      value={c.eventId ? String(c.eventId) : 'none'}
                      onValueChange={(value) => void handleEventChange(c, value)}
                      disabled={!canManageCloseConditions || upsertCondition.isPending}
                    >
                      <SelectTrigger className="h-7 w-40 text-xs">
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
                    <EventRollupSummary
                      rollup={c.eventId ? eventLookup.get(String(c.eventId))?.rollup : undefined}
                      className="mt-1"
                    />
                  </div>
                </div>

                {canManageCloseConditions ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={deleteCondition.isPending}
                    onClick={() => handleDelete(c)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </div>
              <div className="px-3 pb-3">
                <CloseoutApprovalRoutePanel
                  title="종료조건 승인선"
                  steps={c.approvalSteps ?? []}
                  members={members}
                  disabled={!canManageCloseConditions}
                  isSaving={replaceApprovalRoute.isPending}
                  isDeciding={decideApprovalStep.isPending}
                  onSave={(approverUserIds) => handleSaveApprovalRoute(c, approverUserIds)}
                  onDecide={(approvalStepId, approvalStatusCode) =>
                    handleDecideApprovalStep(c, approvalStepId, approvalStatusCode)
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>종료조건 추가</DialogTitle>
            <DialogDescription>프로젝트에 새 종료조건을 등록합니다.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">조건 코드</label>
              <Input
                placeholder="예: CC-001"
                value={formData.conditionCode}
                onChange={(e) => setFormData({ ...formData, conditionCode: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="requiresDeliverable"
                checked={formData.requiresDeliverable}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requiresDeliverable: checked === true })
                }
              />
              <label htmlFor="requiresDeliverable" className="text-sm font-medium cursor-pointer">
                산출물 제출 필요
              </label>
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
              <label className="text-sm font-medium">정렬 순서</label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">메모 (선택)</label>
              <Textarea
                placeholder="종료조건에 대한 메모"
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
              disabled={!formData.conditionCode.trim() || upsertCondition.isPending || !canManageCloseConditions}
            >
              {upsertCondition.isPending ? '등록 중...' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>종료조건 템플릿</DialogTitle>
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
                  id="close-condition-template-replace-mode"
                  checked={templateApplyMode === 'replace'}
                  onCheckedChange={(checked) => setTemplateApplyMode(checked === true ? 'replace' : 'append')}
                />
                <label htmlFor="close-condition-template-replace-mode" className="text-sm font-medium">
                  기존 종료조건 교체
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
                    placeholder="예: execution-close-customer-a"
                    value={templateForm.groupCode}
                    onChange={(event) => setTemplateForm({ ...templateForm, groupCode: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">그룹명</label>
                  <Input
                    placeholder="예: 고객사 A 수행 종료조건"
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
                  || conditions.length === 0
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
