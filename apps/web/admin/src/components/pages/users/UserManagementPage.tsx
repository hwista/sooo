'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Plus, Pencil, UserX } from 'lucide-react';
import {
  SsooDataWorkspacePage,
  type SsooDataGridColumnDef,
  type SsooDataWorkspaceFilterValues,
} from '@ssoo/web-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  useUserList,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
} from '@/hooks/queries/useUsers';
import type {
  UserItem,
  CreateUserRequest,
  UpdateUserRequest,
} from '@/lib/api/endpoints/users';

const ROLE_OPTIONS = [
  { value: 'admin', label: '관리자' },
  { value: 'manager', label: '매니저' },
  { value: 'user', label: '사용자' },
  { value: 'viewer', label: '뷰어' },
];

const ROLE_LABEL: Record<string, string> = {
  admin: '관리자',
  manager: '매니저',
  user: '사용자',
  viewer: '뷰어',
};

const PRIMARY_AFFILIATION_OPTIONS = [
  { value: 'internal', label: '내부' },
  { value: 'external', label: '외부' },
] as const;

const EMPTY_SELECT_VALUE = '__none__';

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface UserFormData {
  loginId: string;
  password: string;
  userName: string;
  displayName: string;
  email: string;
  phone: string;
  roleCode: string;
  departmentCode: string;
  positionCode: string;
  employeeNumber: string;
  companyName: string;
  customerId: string;
  primaryAffiliationType: string;
}

const INITIAL_FORM: UserFormData = {
  loginId: '',
  password: '',
  userName: '',
  displayName: '',
  email: '',
  phone: '',
  roleCode: 'user',
  departmentCode: '',
  positionCode: '',
  employeeNumber: '',
  companyName: '',
  customerId: '',
  primaryAffiliationType: 'internal',
};

interface UserManagementPageProps {
  path?: string;
}

export function UserManagementPage({ path }: UserManagementPageProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [filterValues, setFilterValues] = useState<SsooDataWorkspaceFilterValues>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [form, setForm] = useState<UserFormData>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const limit = 20;
  const { data: response, isLoading, error: listError, refetch } = useUserList({
    page,
    limit,
    search: search || undefined,
    roleCode: roleFilter || undefined,
  });

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deactivateMutation = useDeactivateUser();
  const pathParams = useMemo(() => new URLSearchParams(path?.split('?')[1] ?? ''), [path]);
  const pathSearch = pathParams.get('search')?.trim() ?? '';
  const shouldOpenCreateDialog = pathParams.get('create') === '1';

  const users = response?.data ?? [];
  const total = response?.meta?.total ?? 0;
  const handleSearch = useCallback((values: SsooDataWorkspaceFilterValues) => {
    setSearch(values.search?.trim() ?? '');
    setRoleFilter(values.roleCode ?? '');
    setPage(1);
  }, []);

  const handleReset = useCallback(() => {
    setFilterValues({});
    setSearch('');
    setRoleFilter('');
    setPage(1);
  }, []);

  const openCreateDialog = useCallback(() => {
    setEditingUser(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
    setDialogOpen(true);
  }, []);

  useEffect(() => {
    setFilterValues((prev) => ({ ...prev, search: pathSearch }));
    setSearch(pathSearch);
    setPage(1);
  }, [pathSearch]);

  useEffect(() => {
    if (shouldOpenCreateDialog) {
      openCreateDialog();
    }
  }, [openCreateDialog, shouldOpenCreateDialog]);

  const openEditDialog = useCallback((user: UserItem) => {
    setEditingUser(user);
    setForm({
      loginId: user.loginId,
      password: '',
      userName: user.userName,
      displayName: user.displayName ?? '',
      email: user.email,
      phone: user.phone ?? '',
      roleCode: user.roleCode,
      departmentCode: user.departmentCode ?? '',
      positionCode: user.positionCode ?? '',
      employeeNumber: user.employeeNumber ?? '',
      companyName: user.companyName ?? '',
      customerId: user.customerId ?? '',
      primaryAffiliationType: user.primaryAffiliationType ?? 'internal',
    });
    setFormErrors({});
    setDialogOpen(true);
  }, []);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!editingUser && !form.loginId.trim()) errors.loginId = '로그인 ID를 입력하세요';
    if (!editingUser && !form.password) errors.password = '비밀번호를 입력하세요';
    if (form.password) {
      if (form.password.length < 8) errors.password = '비밀번호는 8자 이상이어야 합니다';
      else if (!/[a-zA-Z]/.test(form.password)) errors.password = '영문자를 포함해야 합니다';
      else if (!/\d/.test(form.password)) errors.password = '숫자를 포함해야 합니다';
      else if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) errors.password = '특수문자를 포함해야 합니다';
    }
    if (!form.userName.trim()) errors.userName = '이름을 입력하세요';
    if (!form.email.trim()) errors.email = '이메일을 입력하세요';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = '올바른 이메일 형식이 아닙니다';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form, editingUser]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;
    setSubmitError(null);

    try {
      if (editingUser) {
        const updateData: UpdateUserRequest = {};
        if (form.userName !== editingUser.userName) updateData.userName = form.userName;
        if (form.displayName !== (editingUser.displayName ?? ''))
          updateData.displayName = form.displayName;
        if (form.email !== editingUser.email) updateData.email = form.email;
        if (form.phone !== (editingUser.phone ?? '')) updateData.phone = form.phone;
        if (form.roleCode !== editingUser.roleCode) updateData.roleCode = form.roleCode;
        if (form.departmentCode !== (editingUser.departmentCode ?? ''))
          updateData.departmentCode = form.departmentCode;
        if (form.positionCode !== (editingUser.positionCode ?? ''))
          updateData.positionCode = form.positionCode;
        if (form.employeeNumber !== (editingUser.employeeNumber ?? ''))
          updateData.employeeNumber = form.employeeNumber;
        if (form.companyName !== (editingUser.companyName ?? ''))
          updateData.companyName = form.companyName;
        if (form.customerId !== (editingUser.customerId ?? ''))
          updateData.customerId = form.customerId;
        if (form.primaryAffiliationType !== (editingUser.primaryAffiliationType ?? 'internal'))
          updateData.primaryAffiliationType = form.primaryAffiliationType as 'internal' | 'external';
        if (form.password) updateData.password = form.password;

        await updateMutation.mutateAsync({ id: editingUser.id, data: updateData });
      } else {
        const createData: CreateUserRequest = {
          loginId: form.loginId,
          password: form.password,
          userName: form.userName,
          email: form.email,
          ...(form.displayName && { displayName: form.displayName }),
          ...(form.phone && { phone: form.phone }),
          ...(form.roleCode && { roleCode: form.roleCode }),
          ...(form.departmentCode && { departmentCode: form.departmentCode }),
          ...(form.positionCode && { positionCode: form.positionCode }),
          ...(form.employeeNumber && { employeeNumber: form.employeeNumber }),
          ...(form.companyName && { companyName: form.companyName }),
          ...(form.customerId && { customerId: form.customerId }),
          ...(form.primaryAffiliationType && {
            primaryAffiliationType: form.primaryAffiliationType as 'internal' | 'external',
          }),
        };
        await createMutation.mutateAsync(createData);
      }
      setDialogOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : '저장에 실패했습니다.';
      setSubmitError(message);
    }
  }, [form, editingUser, validateForm, createMutation, updateMutation]);

  const handleDeactivate = useCallback(
    async (user: UserItem) => {
      if (!window.confirm(`'${user.userName}' 사용자를 비활성화하시겠습니까?`)) return;
      try {
        await deactivateMutation.mutateAsync(user.id);
      } catch {
        window.alert('사용자 비활성화에 실패했습니다.');
      }
    },
    [deactivateMutation],
  );

  const columns = useMemo<SsooDataGridColumnDef<UserItem>[]>(() => [
    {
      accessorKey: 'loginId',
      header: '로그인ID',
      size: 120,
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.loginId}</span>,
    },
    {
      accessorKey: 'userName',
      header: '이름',
      size: 100,
    },
    {
      accessorKey: 'email',
      header: '이메일',
      size: 180,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.email}</span>,
    },
    {
      accessorKey: 'roleCode',
      header: '역할',
      size: 90,
      cell: ({ row }) => {
        const roleCode = row.original.roleCode;
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              roleCode === 'admin'
                ? 'bg-ssoo-danger-bg text-ssoo-danger'
                : 'bg-ssoo-info-bg text-ssoo-info'
            }`}
          >
            {ROLE_LABEL[roleCode] ?? roleCode}
          </span>
        );
      },
    },
    {
      accessorKey: 'departmentCode',
      header: '부서',
      size: 110,
      cell: ({ row }) => <span className="text-sm">{row.original.departmentCode ?? '-'}</span>,
    },
    {
      accessorKey: 'isActive',
      header: '상태',
      size: 80,
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            row.original.isActive
              ? 'bg-ssoo-success-bg text-ssoo-success'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {row.original.isActive ? '활성' : '비활성'}
        </span>
      ),
    },
    {
      accessorKey: 'lastLoginAt',
      header: '최종로그인',
      size: 150,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDateTime(row.original.lastLoginAt)}</span>,
    },
    {
      id: 'actions',
      header: '작업',
      size: 90,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => {
              event.stopPropagation();
              openEditDialog(row.original);
            }}
            title="수정"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {row.original.isActive ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => {
                event.stopPropagation();
                void handleDeactivate(row.original);
              }}
              title="비활성화"
              disabled={deactivateMutation.isPending}
            >
              <UserX className="h-3.5 w-3.5 text-destructive" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ], [deactivateMutation.isPending, handleDeactivate, openEditDialog]);

  const updateField = useCallback((field: keyof UserFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <SsooDataWorkspacePage
        breadcrumb={['admin', 'users']}
        toolbar={{
          actions: [
            {
              label: '사용자 추가',
              icon: <Plus className="h-4 w-4" />,
              onClick: openCreateDialog,
            },
          ],
          filters: [
            { key: 'search', type: 'text', placeholder: '이름, 로그인ID, 이메일 검색', width: '280px' },
            { key: 'roleCode', type: 'select', placeholder: '역할 전체', options: ROLE_OPTIONS, width: '160px' },
          ],
          filterValues,
          onFilterValuesChange: setFilterValues,
          onSearch: handleSearch,
          onReset: handleReset,
        }}
        table={{
          columns,
          data: users,
          loading: isLoading,
          error: listError,
          onRetry: () => refetch(),
          pagination: {
            page,
            pageSize: limit,
            total,
            onPageChange: setPage,
          },
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? '사용자 수정' : '사용자 추가'}</DialogTitle>
            <DialogDescription>
              {editingUser ? '사용자 정보를 수정합니다.' : '새 사용자를 등록합니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Login ID */}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">로그인 ID *</label>
              <Input
                value={form.loginId}
                onChange={(e) => updateField('loginId', e.target.value)}
                disabled={!!editingUser}
                placeholder="로그인 ID"
              />
              {formErrors.loginId && (
                <p className="text-xs text-destructive">{formErrors.loginId}</p>
              )}
            </div>

            {/* Password */}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">
                비밀번호 {editingUser ? '(변경 시에만 입력)' : '*'}
              </label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder={editingUser ? '변경하지 않으려면 비워두세요' : '비밀번호 (8자 이상)'}
              />
              {formErrors.password && (
                <p className="text-xs text-destructive">{formErrors.password}</p>
              )}
            </div>

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">이름 *</label>
                <Input
                  value={form.userName}
                  onChange={(e) => updateField('userName', e.target.value)}
                  placeholder="이름"
                />
                {formErrors.userName && (
                  <p className="text-xs text-destructive">{formErrors.userName}</p>
                )}
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">표시명</label>
                <Input
                  value={form.displayName}
                  onChange={(e) => updateField('displayName', e.target.value)}
                  placeholder="표시명"
                />
              </div>
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">이메일 *</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="이메일"
                />
                {formErrors.email && (
                  <p className="text-xs text-destructive">{formErrors.email}</p>
                )}
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">전화번호</label>
                <Input
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="010-1234-5678"
                />
              </div>
            </div>

            {/* Role + Department + Position */}
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">역할</label>
                <Select value={form.roleCode} onValueChange={(v) => updateField('roleCode', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">부서</label>
                <Input
                  value={form.departmentCode}
                  onChange={(e) => updateField('departmentCode', e.target.value)}
                  placeholder="부서 코드"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">직급</label>
                <Input
                  value={form.positionCode}
                  onChange={(e) => updateField('positionCode', e.target.value)}
                  placeholder="직급 코드"
                />
              </div>
            </div>

            {/* Primary Affiliation + Employee Number */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Primary 소속</label>
                <Select
                  value={form.primaryAffiliationType || EMPTY_SELECT_VALUE}
                  onValueChange={(v) =>
                    updateField('primaryAffiliationType', v === EMPTY_SELECT_VALUE ? '' : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="primary 소속을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>선택 안함</SelectItem>
                    {PRIMARY_AFFILIATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">사번</label>
                <Input
                  value={form.employeeNumber}
                  onChange={(e) => updateField('employeeNumber', e.target.value)}
                  placeholder="사번"
                />
              </div>
            </div>

            {/* Company + Customer ID */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">외부 회사명</label>
                <Input
                  value={form.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  placeholder="외부 회사명"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">고객사 ID</label>
                <Input
                  value={form.customerId}
                  onChange={(e) => updateField('customerId', e.target.value)}
                  placeholder="고객사 ID"
                />
              </div>
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
              {isSaving ? '저장 중...' : editingUser ? '수정' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
