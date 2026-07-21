'use client';

import { useState, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  SsooDataWorkspacePage,
  type SsooDataGridColumnDef,
} from '@ssoo/web-shell';
import { Badge } from '@ssoo/web-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  useCodesByGroup,
  useCreateCode,
  useUpdateCode,
  useDeactivateCode,
} from '@/hooks/queries/useCodes';
import type { CodeItem, CreateCodeRequest, UpdateCodeRequest } from '@/lib/api/endpoints/codes';

const DEPT_GROUP = 'USER_DEPARTMENT';

type FormMode = 'create' | 'edit';

interface OrgFormData {
  codeValue: string;
  displayNameKo: string;
  displayNameEn: string;
  description: string;
  sortOrder: number;
}

const INITIAL_FORM: OrgFormData = {
  codeValue: '',
  displayNameKo: '',
  displayNameEn: '',
  description: '',
  sortOrder: 0,
};

function validateOrgForm(data: OrgFormData, mode: FormMode): Record<string, string> {
  const errors: Record<string, string> = {};
  if (mode === 'create' && !data.codeValue.trim()) errors.codeValue = '조직코드를 입력하세요';
  if (!data.displayNameKo.trim()) errors.displayNameKo = '조직명을 입력하세요';
  return errors;
}

export function OrgManagementPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<OrgFormData>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: codesResponse, isLoading, error, refetch } = useCodesByGroup(DEPT_GROUP);
  const createMutation = useCreateCode();
  const updateMutation = useUpdateCode();
  const deactivateMutation = useDeactivateCode();

  const departments = codesResponse?.data ?? [];

  const handleOpenCreate = useCallback(() => {
    setFormMode('create');
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setSubmitError(null);
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((dept: CodeItem) => {
    setFormMode('edit');
    setEditingId(dept.id);
    setFormData({
      codeValue: dept.codeValue,
      displayNameKo: dept.displayNameKo,
      displayNameEn: dept.displayNameEn ?? '',
      description: dept.description ?? '',
      sortOrder: dept.sortOrder,
    });
    setFormErrors({});
    setSubmitError(null);
    setDialogOpen(true);
  }, []);

  const handleDeactivate = useCallback(
    (dept: CodeItem) => {
      if (!confirm(`"${dept.displayNameKo}" 조직을 비활성화하시겠습니까?`)) return;
      deactivateMutation.mutate(dept.id, {
        onError: () => window.alert('조직 비활성화에 실패했습니다.'),
      });
    },
    [deactivateMutation],
  );

  const columns = useMemo<SsooDataGridColumnDef<CodeItem>[]>(() => [
    {
      accessorKey: 'codeValue',
      header: '조직코드',
      size: 120,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.codeValue}</span>,
    },
    {
      accessorKey: 'displayNameKo',
      header: '조직명',
      size: 150,
    },
    {
      accessorKey: 'displayNameEn',
      header: '조직명(영문)',
      size: 160,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.displayNameEn ?? '-'}</span>,
    },
    {
      accessorKey: 'description',
      header: '설명',
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.description ?? '-'}</span>,
    },
    {
      accessorKey: 'sortOrder',
      header: '정렬순서',
      size: 90,
      cell: ({ row }) => <span className="flex justify-center">{row.original.sortOrder}</span>,
    },
    {
      accessorKey: 'isActive',
      header: '상태',
      size: 90,
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'default' : 'outline'}>
          {row.original.isActive ? '활성' : '비활성'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '작업',
      size: 100,
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => {
              event.stopPropagation();
              handleOpenEdit(row.original);
            }}
            title="수정"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => {
              event.stopPropagation();
              handleDeactivate(row.original);
            }}
            disabled={!row.original.isActive}
            title="비활성화"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ], [handleDeactivate, handleOpenEdit]);

  const handleSubmit = useCallback(() => {
    const errors = validateOrgForm(formData, formMode);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSubmitError(null);

    const onError = (err: Error) => setSubmitError(err.message || '저장에 실패했습니다.');

    if (formMode === 'create') {
      const req: CreateCodeRequest = {
        codeGroup: DEPT_GROUP,
        codeValue: formData.codeValue,
        displayNameKo: formData.displayNameKo,
        ...(formData.displayNameEn && { displayNameEn: formData.displayNameEn }),
        ...(formData.description && { description: formData.description }),
        sortOrder: formData.sortOrder,
      };
      createMutation.mutate(req, { onSuccess: () => setDialogOpen(false), onError });
    } else if (editingId) {
      const req: UpdateCodeRequest = {
        displayNameKo: formData.displayNameKo,
        displayNameEn: formData.displayNameEn || undefined,
        description: formData.description || undefined,
        sortOrder: formData.sortOrder,
      };
      updateMutation.mutate(
        { id: editingId, data: req },
        { onSuccess: () => setDialogOpen(false), onError },
      );
    }
  }, [formMode, formData, editingId, createMutation, updateMutation]);

  const updateField = useCallback(
    <K extends keyof OrgFormData>(field: K, value: OrgFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <SsooDataWorkspacePage
        breadcrumb={['admin', 'organizations']}
        toolbar={{
          actions: [
            {
              label: '조직 추가',
              icon: <Plus className="h-4 w-4" />,
              onClick: handleOpenCreate,
            },
          ],
          collapsible: false,
        }}
        table={{
          columns,
          data: departments,
          loading: isLoading,
          error,
          onRetry: () => refetch(),
          emptyState: <div className="text-sm text-muted-foreground">등록된 조직이 없습니다.</div>,
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? '조직 추가' : '조직 수정'}</DialogTitle>
            <DialogDescription>
              {formMode === 'create' ? '새로운 조직을 추가합니다.' : '조직 정보를 수정합니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">조직코드 *</label>
                <Input
                  value={formData.codeValue}
                  onChange={(e) => updateField('codeValue', e.target.value)}
                  disabled={formMode === 'edit'}
                  placeholder="DEV, QA, PM 등"
                />
                {formErrors.codeValue && (
                  <p className="text-xs text-destructive mt-1">{formErrors.codeValue}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">조직명 *</label>
                <Input
                  value={formData.displayNameKo}
                  onChange={(e) => updateField('displayNameKo', e.target.value)}
                  placeholder="개발팀"
                />
                {formErrors.displayNameKo && (
                  <p className="text-xs text-destructive mt-1">{formErrors.displayNameKo}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">조직명(영문)</label>
                <Input
                  value={formData.displayNameEn}
                  onChange={(e) => updateField('displayNameEn', e.target.value)}
                  placeholder="Development (선택)"
                />
              </div>
              <div className="w-32">
                <label className="text-sm font-medium mb-1.5 block">정렬순서</label>
                <Input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => updateField('sortOrder', e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">설명</label>
              <Input
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="조직 설명 (선택)"
              />
            </div>
          </div>

          {submitError && (
            <p className="text-sm text-destructive px-1">{submitError}</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? '처리 중...' : formMode === 'create' ? '추가' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
