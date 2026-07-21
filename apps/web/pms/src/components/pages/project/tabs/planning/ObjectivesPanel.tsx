'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { Plus, Target, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateObjective,
  useDeleteObjective,
  useProjectObjectives,
  useUpdateObjective,
} from '@/hooks/queries/useProjects';
import type { ObjectiveItem } from '@/lib/api/endpoints/projects';
import { formatPmsDate } from '@/lib/pms-format';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';

const NO_PARENT_OBJECTIVE = '__none__';

const STATUS_LABELS: Record<string, string> = {
  not_started: '미착수',
  in_progress: '진행중',
  achieved: '달성',
  missed: '미달성',
  cancelled: '취소',
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

interface ObjectiveFormState {
  objectiveCode: string;
  objectiveName: string;
  parentObjectiveId: string;
  statusCode: string;
  dueAt: string;
  description: string;
}

const INITIAL_FORM: ObjectiveFormState = {
  objectiveCode: '',
  objectiveName: '',
  parentObjectiveId: NO_PARENT_OBJECTIVE,
  statusCode: 'not_started',
  dueAt: '',
  description: '',
};

interface ObjectiveMetaFieldProps {
  label: string;
  children: ReactNode;
}

function formatObjectiveDate(value?: string | null) {
  return formatPmsDate(value);
}

function ObjectiveMetaField({ label, children }: ObjectiveMetaFieldProps) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

interface ObjectiveStatusSelectProps {
  objective: ObjectiveItem;
  canManageObjectives: boolean;
  onChange: (objectiveId: string, statusCode: string) => void;
}

function ObjectiveStatusSelect({ objective, canManageObjectives, onChange }: ObjectiveStatusSelectProps) {
  return (
    <Select
      value={objective.statusCode}
      onValueChange={(value) => onChange(String(objective.id), value)}
      disabled={!canManageObjectives}
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
  canManageObjectives: boolean;
}

export function ObjectivesPanel({ projectId, canManageObjectives }: Props) {
  const { data, isLoading } = useProjectObjectives(projectId);
  const objectiveData = data?.data;
  const objectives = objectiveData ?? [];

  const createObjective = useCreateObjective();
  const updateObjective = useUpdateObjective();
  const deleteObjective = useDeleteObjective();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState<ObjectiveFormState>(INITIAL_FORM);

  const objectiveMap = useMemo(
    () => new Map((objectiveData ?? []).map((objective) => [String(objective.id), objective])),
    [objectiveData],
  );

  const handleOpenDialog = () => {
    setFormData(INITIAL_FORM);
    setShowCreateDialog(true);
  };

  const handleCreate = async () => {
    if (!formData.objectiveCode.trim() || !formData.objectiveName.trim()) {
      return;
    }

    await createObjective.mutateAsync({
      projectId,
      data: {
        objectiveCode: formData.objectiveCode,
        objectiveName: formData.objectiveName,
        statusCode: formData.statusCode,
        ...(formData.parentObjectiveId !== NO_PARENT_OBJECTIVE
          ? { parentObjectiveId: formData.parentObjectiveId }
          : {}),
        ...(formData.dueAt ? { dueAt: new Date(formData.dueAt).toISOString() } : {}),
        ...(formData.description.trim() ? { description: formData.description } : {}),
      },
    });

    setShowCreateDialog(false);
    setFormData(INITIAL_FORM);
  };

  const handleStatusChange = (objectiveId: string, statusCode: string) => {
    updateObjective.mutate({
      projectId,
      objectiveId,
      data: { statusCode },
    });
  };

  const handleDelete = (objectiveId: string) => {
    deleteObjective.mutate({ projectId, objectiveId });
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Target className="h-4 w-4" />
          목표 ({objectives.length})
        </h4>
        {canManageObjectives && (
          <Button size="sm" variant="outline" onClick={handleOpenDialog} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            목표 추가
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">목표를 불러오는 중...</div>
      ) : objectives.length === 0 ? (
        <div className="text-sm text-muted-foreground">아직 등록된 목표가 없습니다.</div>
      ) : (
        <>
        <div className="space-y-3 md:hidden">
          {objectives.map((objective) => {
            const parentObjective = objective.parentObjectiveId
              ? objectiveMap.get(String(objective.parentObjectiveId))
              : null;

            return (
              <div key={String(objective.id)} className="rounded-lg border bg-card p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="font-mono text-xs text-muted-foreground">{objective.objectiveCode}</div>
                    <div className="break-words text-sm font-semibold">{objective.objectiveName}</div>
                  </div>
                  {canManageObjectives && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(String(objective.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <ObjectiveMetaField label="상위목표">
                    <span className="text-muted-foreground">
                      {parentObjective ? `${parentObjective.objectiveCode} · ${parentObjective.objectiveName}` : '-'}
                    </span>
                  </ObjectiveMetaField>
                  <ObjectiveMetaField label="상태">
                    <ObjectiveStatusSelect
                      objective={objective}
                      canManageObjectives={canManageObjectives}
                      onChange={handleStatusChange}
                    />
                  </ObjectiveMetaField>
                  <ObjectiveMetaField label="기한">
                    <span className="text-muted-foreground">{formatObjectiveDate(objective.dueAt)}</span>
                  </ObjectiveMetaField>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden overflow-hidden rounded-md border bg-card md:block">
          <Table className="w-full text-sm">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="p-3 text-left font-medium">코드</TableHead>
                <TableHead className="p-3 text-left font-medium">목표명</TableHead>
                <TableHead className="p-3 text-left font-medium">상위목표</TableHead>
                <TableHead className="p-3 text-center font-medium">상태</TableHead>
                <TableHead className="p-3 text-left font-medium">기한</TableHead>
                <TableHead className="w-10 p-3"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {objectives.map((objective) => {
                const parentObjective = objective.parentObjectiveId
                  ? objectiveMap.get(String(objective.parentObjectiveId))
                  : null;

                return (
                  <TableRow key={String(objective.id)} className="group hover:bg-muted/20">
                    <TableCell className="p-3 font-mono text-xs" style={{ paddingLeft: `${(objective.depth * 16) + 12}px` }}>
                      {objective.objectiveCode}
                    </TableCell>
                    <TableCell className="p-3">{objective.objectiveName}</TableCell>
                    <TableCell className="p-3 text-muted-foreground">
                      {parentObjective ? `${parentObjective.objectiveCode} · ${parentObjective.objectiveName}` : '-'}
                    </TableCell>
                    <TableCell className="p-3 text-center">
                      <ObjectiveStatusSelect
                        objective={objective}
                        canManageObjectives={canManageObjectives}
                        onChange={handleStatusChange}
                      />
                    </TableCell>
                    <TableCell className="p-3 text-muted-foreground">
                      {formatObjectiveDate(objective.dueAt)}
                    </TableCell>
                    <TableCell className="p-3 text-center">
                      {canManageObjectives && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(String(objective.id))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        </>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>목표 추가</DialogTitle>
            <DialogDescription>마일스톤과 WBS를 연결할 planning 목표를 등록합니다.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">코드 *</label>
                <Input
                  placeholder="예: OBJ-001"
                  value={formData.objectiveCode}
                  onChange={(event) => setFormData({ ...formData, objectiveCode: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">목표명 *</label>
                <Input
                  placeholder="목표명 입력"
                  value={formData.objectiveName}
                  onChange={(event) => setFormData({ ...formData, objectiveName: event.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">상위목표</label>
                <Select
                  value={formData.parentObjectiveId}
                  onValueChange={(value) => setFormData({ ...formData, parentObjectiveId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="없음" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PARENT_OBJECTIVE}>없음</SelectItem>
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
                <Select
                  value={formData.statusCode}
                  onValueChange={(value) => setFormData({ ...formData, statusCode: value })}
                >
                  <SelectTrigger>
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
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">기한</label>
                <Input
                  type="date"
                  value={formData.dueAt}
                  onChange={(event) => setFormData({ ...formData, dueAt: event.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">설명</label>
              <Textarea
                rows={3}
                placeholder="목표 설명 (선택)"
                value={formData.description}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="w-full sm:w-auto">
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !canManageObjectives
                || !formData.objectiveCode.trim()
                || !formData.objectiveName.trim()
                || createObjective.isPending
              }
              className="w-full sm:w-auto"
            >
              {createObjective.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
