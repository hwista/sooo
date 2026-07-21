'use client';

import { type ReactNode, useState } from 'react';
import { Flag, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useProjectObjectives,
  useProjectAccess,
  useProjectMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
} from '@/hooks/queries/useProjects';
import type { MilestoneItem, CreateMilestoneRequest, ObjectiveItem } from '@/lib/api/endpoints/projects';
import { formatPmsDate } from '@/lib/pms-format';
import { ObjectivesPanel } from './planning/ObjectivesPanel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';

const NO_OBJECTIVE_VALUE = '__none__';

const STATUS_LABELS: Record<string, string> = {
  not_started: '미착수',
  in_progress: '진행중',
  achieved: '달성',
  missed: '미달성',
  cancelled: '취소',
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

interface MilestoneFormState {
  objectiveId: string;
  milestoneCode: string;
  milestoneName: string;
  statusCode: string;
  dueAt: string;
  description: string;
}

const INITIAL_FORM: MilestoneFormState = {
  objectiveId: NO_OBJECTIVE_VALUE,
  milestoneCode: '',
  milestoneName: '',
  statusCode: 'not_started',
  dueAt: '',
  description: '',
};

interface MilestoneMetaFieldProps {
  label: string;
  children: ReactNode;
}

function formatMilestoneDate(value?: string | null) {
  return formatPmsDate(value);
}

function MilestoneMetaField({ label, children }: MilestoneMetaFieldProps) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

interface MilestoneObjectiveSelectProps {
  milestone: MilestoneItem;
  objectives: ObjectiveItem[];
  canManageMilestones: boolean;
  onChange: (milestone: MilestoneItem, objectiveId: string) => void;
}

function MilestoneObjectiveSelect({
  milestone,
  objectives,
  canManageMilestones,
  onChange,
}: MilestoneObjectiveSelectProps) {
  return (
    <Select
      value={milestone.objectiveId ? String(milestone.objectiveId) : NO_OBJECTIVE_VALUE}
      onValueChange={(value) => onChange(milestone, value)}
      disabled={!canManageMilestones}
    >
      <SelectTrigger className="h-8 min-w-0 text-xs md:h-7 md:min-w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_OBJECTIVE_VALUE}>미지정</SelectItem>
        {objectives.map((objective) => (
          <SelectItem key={String(objective.id)} value={String(objective.id)}>
            {objective.objectiveCode} · {objective.objectiveName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface MilestoneStatusSelectProps {
  milestone: MilestoneItem;
  canManageMilestones: boolean;
  onChange: (milestone: MilestoneItem, statusCode: string) => void;
}

function MilestoneStatusSelect({ milestone, canManageMilestones, onChange }: MilestoneStatusSelectProps) {
  return (
    <Select
      value={milestone.statusCode}
      onValueChange={(value) => onChange(milestone, value)}
      disabled={!canManageMilestones}
    >
      <SelectTrigger className="h-8 w-full text-xs md:mx-auto md:h-7 md:w-24">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface Props {
  projectId: number;
}

export function MilestonesTab({ projectId }: Props) {
  const { data: accessResponse } = useProjectAccess(projectId);
  const { data: objectiveResponse } = useProjectObjectives(projectId);
  const { data, isLoading } = useProjectMilestones(projectId);
  const milestones = data?.data ?? [];
  const objectives = objectiveResponse?.data ?? [];
  const canManageMilestones = accessResponse?.data?.features.canManageMilestones ?? false;

  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const handleOpenDialog = () => {
    setFormData(INITIAL_FORM);
    setShowAddDialog(true);
  };

  const handleCreate = async () => {
    if (!formData.milestoneCode.trim() || !formData.milestoneName.trim()) return;

    const payload: CreateMilestoneRequest = {
      milestoneCode: formData.milestoneCode,
      milestoneName: formData.milestoneName,
      ...(formData.objectiveId !== NO_OBJECTIVE_VALUE ? { objectiveId: formData.objectiveId } : {}),
      ...(formData.description ? { description: formData.description } : {}),
      ...(formData.dueAt ? { dueAt: new Date(formData.dueAt).toISOString() } : {}),
    };

    await createMilestone.mutateAsync({ projectId, data: payload });
    setShowAddDialog(false);
    setFormData(INITIAL_FORM);
  };

  const handleStatusChange = (milestone: MilestoneItem, statusCode: string) => {
    updateMilestone.mutate({
      projectId,
      milestoneId: String(milestone.id),
      data: { statusCode },
    });
  };

  const handleObjectiveChange = (milestone: MilestoneItem, objectiveId: string) => {
    updateMilestone.mutate({
      projectId,
      milestoneId: String(milestone.id),
      data: { objectiveId: objectiveId === NO_OBJECTIVE_VALUE ? null : objectiveId },
    });
  };

  const handleDelete = (milestone: MilestoneItem) => {
    deleteMilestone.mutate({ projectId, milestoneId: String(milestone.id) });
  };

  if (isLoading) return <div className="p-4 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-4">
      <ObjectivesPanel projectId={projectId} canManageObjectives={canManageMilestones} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Flag className="h-4 w-4" />
          마일스톤 ({milestones.length})
        </h3>
        {canManageMilestones && (
          <Button size="sm" onClick={handleOpenDialog} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            마일스톤 추가
          </Button>
        )}
      </div>

      {milestones.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          아직 등록된 마일스톤이 없습니다.
        </div>
      ) : (
        <>
        <div className="space-y-3 md:hidden">
          {milestones.map((milestone: MilestoneItem) => (
            <div key={String(milestone.id)} className="rounded-lg border bg-card p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="font-mono text-xs text-muted-foreground">{milestone.milestoneCode}</div>
                  <div className="break-words text-sm font-semibold">{milestone.milestoneName}</div>
                </div>
                {canManageMilestones && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(milestone)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="mt-3 grid gap-3">
                <MilestoneMetaField label="목표">
                  <MilestoneObjectiveSelect
                    milestone={milestone}
                    objectives={objectives}
                    canManageMilestones={canManageMilestones}
                    onChange={handleObjectiveChange}
                  />
                </MilestoneMetaField>
                <div className="grid gap-3 sm:grid-cols-3">
                  <MilestoneMetaField label="상태">
                    <MilestoneStatusSelect
                      milestone={milestone}
                      canManageMilestones={canManageMilestones}
                      onChange={handleStatusChange}
                    />
                  </MilestoneMetaField>
                  <MilestoneMetaField label="기한">
                    <span className="text-muted-foreground">{formatMilestoneDate(milestone.dueAt)}</span>
                  </MilestoneMetaField>
                  <MilestoneMetaField label="달성일">
                    <span className="text-muted-foreground">{formatMilestoneDate(milestone.achievedAt)}</span>
                  </MilestoneMetaField>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-lg border md:block">
          <Table className="w-full text-sm">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-left p-3 font-medium">코드</TableHead>
                <TableHead className="text-left p-3 font-medium">마일스톤명</TableHead>
                <TableHead className="text-left p-3 font-medium">목표</TableHead>
                <TableHead className="text-center p-3 font-medium">상태</TableHead>
                <TableHead className="text-left p-3 font-medium">기한</TableHead>
                <TableHead className="text-left p-3 font-medium">달성일</TableHead>
                <TableHead className="text-center p-3 font-medium w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {milestones.map((m: MilestoneItem) => (
                <TableRow key={String(m.id)} className="hover:bg-muted/30 group">
                  <TableCell className="p-3 font-mono text-xs">{m.milestoneCode}</TableCell>
                  <TableCell className="p-3">{m.milestoneName}</TableCell>
                  <TableCell className="p-3">
                    <MilestoneObjectiveSelect
                      milestone={m}
                      objectives={objectives}
                      canManageMilestones={canManageMilestones}
                      onChange={handleObjectiveChange}
                    />
                  </TableCell>
                  <TableCell className="p-3 text-center">
                    <MilestoneStatusSelect
                      milestone={m}
                      canManageMilestones={canManageMilestones}
                      onChange={handleStatusChange}
                    />
                  </TableCell>
                  <TableCell className="p-3 text-muted-foreground">
                    {formatMilestoneDate(m.dueAt)}
                  </TableCell>
                  <TableCell className="p-3 text-muted-foreground">
                    {formatMilestoneDate(m.achievedAt)}
                  </TableCell>
                  <TableCell className="p-3 text-center">
                    {canManageMilestones && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(m)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        </>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>마일스톤 추가</DialogTitle>
            <DialogDescription>프로젝트에 새 마일스톤을 추가합니다.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">코드 *</label>
                <Input
                  placeholder="예: MS-001"
                  value={formData.milestoneCode}
                  onChange={(e) => setFormData({ ...formData, milestoneCode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">마일스톤명 *</label>
                <Input
                  placeholder="마일스톤명 입력"
                  value={formData.milestoneName}
                  onChange={(e) => setFormData({ ...formData, milestoneName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">목표</label>
                <Select
                  value={formData.objectiveId}
                  onValueChange={(value) => setFormData({ ...formData, objectiveId: value })}
                >
                  <SelectTrigger><SelectValue placeholder="미지정" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_OBJECTIVE_VALUE}>미지정</SelectItem>
                    {objectives.map((objective) => (
                      <SelectItem key={String(objective.id)} value={String(objective.id)}>
                        {objective.objectiveCode} · {objective.objectiveName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">상태</label>
                <Select value={formData.statusCode} onValueChange={(v) => setFormData({ ...formData, statusCode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">기한</label>
                <Input
                  type="date"
                  value={formData.dueAt}
                  onChange={(e) => setFormData({ ...formData, dueAt: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">설명</label>
              <Textarea
                placeholder="마일스톤 설명 (선택)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="w-full sm:w-auto">취소</Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.milestoneCode.trim() || !formData.milestoneName.trim() || createMilestone.isPending || !canManageMilestones}
              className="w-full sm:w-auto"
            >
              {createMilestone.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
