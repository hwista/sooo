'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import {
  DEFAULT_DMS_CRM_CONTRACT_APPROVAL_ROUTE_POLICY,
  type DmsCrmContractApprovalRoutePolicy,
} from '@ssoo/types/dms';
import { LoadingSpinner } from '@/components/common/StateDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DeepPartialClient, DmsSettingsConfigClient } from '@/lib/api/endpoints/settings';

type ApprovalRoutePolicyAnchorKey = 'status' | 'policy' | 'roles';

interface ApprovalRoutePolicySectionProps {
  policy?: DmsCrmContractApprovalRoutePolicy | null;
  isSavingSettings?: boolean;
  onUpdateSettings?: (partial: DeepPartialClient<DmsSettingsConfigClient>) => Promise<boolean>;
  anchorIds?: Partial<Record<ApprovalRoutePolicyAnchorKey, string>>;
}

function cloneDefaultPolicy(): DmsCrmContractApprovalRoutePolicy {
  return {
    ...DEFAULT_DMS_CRM_CONTRACT_APPROVAL_ROUTE_POLICY,
    requiredRoles: [...DEFAULT_DMS_CRM_CONTRACT_APPROVAL_ROUTE_POLICY.requiredRoles],
  };
}

function normalizeRoles(roles: readonly string[]): string[] {
  return Array.from(new Set(roles.map((role) => role.trim()).filter(Boolean)));
}

function normalizePolicy(policy: DmsCrmContractApprovalRoutePolicy): DmsCrmContractApprovalRoutePolicy {
  const fallback = cloneDefaultPolicy();
  return {
    routeKey: policy.routeKey.trim() || fallback.routeKey,
    routeName: policy.routeName.trim() || fallback.routeName,
    policyVersion: policy.policyVersion.trim() || fallback.policyVersion,
    organizationScope: policy.organizationScope.trim() || fallback.organizationScope,
    requiredRoles: normalizeRoles(policy.requiredRoles).length > 0
      ? normalizeRoles(policy.requiredRoles)
      : fallback.requiredRoles,
  };
}

function toPolicyDraft(policy?: DmsCrmContractApprovalRoutePolicy | null): DmsCrmContractApprovalRoutePolicy {
  return normalizePolicy(policy ?? cloneDefaultPolicy());
}

function getValidationError(policy: DmsCrmContractApprovalRoutePolicy): string | null {
  if (!policy.routeKey.trim()) return 'Route key를 입력하세요.';
  if (!policy.routeName.trim()) return 'Route name을 입력하세요.';
  if (!policy.policyVersion.trim()) return 'Policy version을 입력하세요.';
  if (!policy.organizationScope.trim()) return 'Organization scope를 입력하세요.';
  if (normalizeRoles(policy.requiredRoles).length === 0) return '승인 역할을 1개 이상 추가하세요.';
  return null;
}

function isSamePolicy(left: DmsCrmContractApprovalRoutePolicy, right: DmsCrmContractApprovalRoutePolicy): boolean {
  return JSON.stringify(normalizePolicy(left)) === JSON.stringify(normalizePolicy(right));
}

export function ApprovalRoutePolicySection({
  policy,
  isSavingSettings = false,
  onUpdateSettings,
  anchorIds = {},
}: ApprovalRoutePolicySectionProps) {
  const persistedPolicy = useMemo(() => toPolicyDraft(policy), [policy]);
  const [draft, setDraft] = useState<DmsCrmContractApprovalRoutePolicy>(persistedPolicy);
  const [roleDraft, setRoleDraft] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'failed'>('idle');

  useEffect(() => {
    setDraft(persistedPolicy);
    setRoleDraft('');
    setSaveState('idle');
  }, [persistedPolicy]);

  const validationError = getValidationError(draft);
  const hasChanges = !isSamePolicy(draft, persistedPolicy);

  const updateDraftField = (field: keyof Omit<DmsCrmContractApprovalRoutePolicy, 'requiredRoles'>, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setSaveState('idle');
  };

  const addRole = () => {
    const nextRole = roleDraft.trim();
    if (!nextRole) return;
    setDraft((prev) => ({
      ...prev,
      requiredRoles: normalizeRoles([...prev.requiredRoles, nextRole]),
    }));
    setRoleDraft('');
    setSaveState('idle');
  };

  const removeRole = (role: string) => {
    setDraft((prev) => ({
      ...prev,
      requiredRoles: prev.requiredRoles.filter((item) => item !== role),
    }));
    setSaveState('idle');
  };

  const resetDraft = () => {
    setDraft(persistedPolicy);
    setRoleDraft('');
    setSaveState('idle');
  };

  const resetToDefault = () => {
    setDraft(cloneDefaultPolicy());
    setRoleDraft('');
    setSaveState('idle');
  };

  const savePolicy = async () => {
    if (validationError || !onUpdateSettings) return;
    const nextPolicy = normalizePolicy(draft);
    const partial = {
      system: {
        crmContractApprovalRoute: nextPolicy,
      },
    } as DeepPartialClient<DmsSettingsConfigClient>;
    const success = await onUpdateSettings(partial);
    setSaveState(success ? 'saved' : 'failed');
  };

  return (
    <div className="space-y-3">
      <article
        id={anchorIds.status}
        className="scroll-mt-4 rounded-lg border border-ssoo-content-border bg-card px-4 py-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-badge text-ssoo-primary/70">현재 적용 정책</p>
            <h3 className="mt-1 text-label-strong text-ssoo-primary">{persistedPolicy.routeName}</h3>
            <p className="mt-2 text-body-sm text-ssoo-primary/80">
              CRM 계약 산출 lifecycle은 이 정책으로 승인 route, workflow artifact, 결재선 원장을 생성합니다.
            </p>
          </div>
          <span className="shrink-0 rounded-full border px-2 py-0.5 text-caption ssoo-tone-success-surface">
            {persistedPolicy.requiredRoles.length} roles
          </span>
        </div>
        <dl className="mt-3 grid gap-2 text-caption text-ssoo-primary/75 md:grid-cols-2">
          <div className="rounded-md border border-ssoo-content-border bg-ssoo-content-bg/30 px-3 py-2">
            <dt className="text-badge text-ssoo-primary/60">Route key</dt>
            <dd className="mt-1 truncate text-label-md text-ssoo-primary">{persistedPolicy.routeKey}</dd>
          </div>
          <div className="rounded-md border border-ssoo-content-border bg-ssoo-content-bg/30 px-3 py-2">
            <dt className="text-badge text-ssoo-primary/60">Policy version</dt>
            <dd className="mt-1 truncate text-label-md text-ssoo-primary">{persistedPolicy.policyVersion}</dd>
          </div>
        </dl>
      </article>

      <article
        id={anchorIds.policy}
        className="scroll-mt-4 rounded-lg border border-ssoo-content-border bg-card px-4 py-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-label-strong text-ssoo-primary">정책 식별자</h3>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {saveState === 'saved' && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption ssoo-tone-success-surface">
                <Check className="h-3.5 w-3.5" />
                저장됨
              </span>
            )}
            {saveState === 'failed' && (
              <span className="rounded-full border px-2 py-0.5 text-caption ssoo-tone-danger-surface">저장 실패</span>
            )}
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <label className="min-w-0 space-y-1">
            <span className="text-caption text-ssoo-primary/70">Route key</span>
            <Input
              value={draft.routeKey}
              onChange={(event) => updateDraftField('routeKey', event.target.value)}
              placeholder="dms-crm-contract-standard"
            />
          </label>
          <label className="min-w-0 space-y-1">
            <span className="text-caption text-ssoo-primary/70">Route name</span>
            <Input
              value={draft.routeName}
              onChange={(event) => updateDraftField('routeName', event.target.value)}
              placeholder="DMS CRM contract standard approval route"
            />
          </label>
          <label className="min-w-0 space-y-1">
            <span className="text-caption text-ssoo-primary/70">Policy version</span>
            <Input
              value={draft.policyVersion}
              onChange={(event) => updateDraftField('policyVersion', event.target.value)}
              placeholder="dms-crm-contract-standard@2026-07-09"
            />
          </label>
          <label className="min-w-0 space-y-1">
            <span className="text-caption text-ssoo-primary/70">Organization scope</span>
            <Input
              value={draft.organizationScope}
              onChange={(event) => updateDraftField('organizationScope', event.target.value)}
              placeholder="global"
            />
          </label>
        </div>
      </article>

      <article
        id={anchorIds.roles}
        className="scroll-mt-4 rounded-lg border border-ssoo-content-border bg-card px-4 py-3"
      >
        <h3 className="text-label-strong text-ssoo-primary">승인 역할</h3>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={roleDraft}
            onChange={(event) => setRoleDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addRole();
              }
            }}
            placeholder="legal-reviewer"
          />
          <Button type="button" variant="outline" onClick={addRole} className="shrink-0 gap-1">
            <Plus className="h-4 w-4" />
            역할 추가
          </Button>
        </div>

        <div className="mt-3 space-y-2">
          {normalizeRoles(draft.requiredRoles).map((role, index) => (
            <div
              key={role}
              className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-ssoo-content-border bg-ssoo-content-bg/30 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-label-md text-ssoo-primary">{role}</p>
                <p className="text-caption text-ssoo-primary/60">sequence {index + 1}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeRole(role)}
                className="h-8 w-8 shrink-0 text-ssoo-primary/70 hover:border-destructive/40 hover:text-destructive"
                aria-label={`${role} 역할 삭제`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {validationError && <p className="mt-3 text-caption text-destructive">{validationError}</p>}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={resetDraft}
            disabled={!hasChanges || isSavingSettings}
            className="gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            되돌리기
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={resetToDefault}
            disabled={isSavingSettings}
            className="gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            기본값
          </Button>
          <Button
            type="button"
            onClick={() => {
              void savePolicy();
            }}
            disabled={!hasChanges || Boolean(validationError) || isSavingSettings || !onUpdateSettings}
            className="gap-1"
          >
            {isSavingSettings ? <LoadingSpinner className="text-current" /> : <Save className="h-4 w-4" />}
            {isSavingSettings ? '저장 중' : '저장'}
          </Button>
        </div>
      </article>
    </div>
  );
}
