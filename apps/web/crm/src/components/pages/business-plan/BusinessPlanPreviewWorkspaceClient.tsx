'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, RefreshCw, RotateCcw, Save, Search } from 'lucide-react';
import type {
  CrmBusinessPlan,
  CrmBusinessPlanLine,
  CrmBusinessPlanListResponse,
  CrmBusinessPlanMonthlyPlanInputResult,
  CrmBusinessPlanPreviewQuery,
  CrmBusinessPlanPreviewRegion,
  CrmBusinessPlanPreviewResponse,
  CrmBusinessPlanPreviewRow,
  CrmBusinessPlanPreviewYear,
} from '@ssoo/types/crm';
import { Badge, Button, Input, NativeSelect, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';
import { useAuthStore } from '@/stores/auth.store';

export interface BusinessPlanPreviewWorkspaceQuery {
  baseYear: number;
  businessType: string;
  industryLine: string;
  region: CrmBusinessPlanPreviewRegion;
  search: string;
}

interface BackendSuccessResponse<T> {
  success: true;
  data: T;
}

interface BackendErrorResponse {
  success?: false;
  error?: {
    message?: string;
  };
  message?: string;
}

const regionLabels: Record<CrmBusinessPlanPreviewRegion, string> = {
  all: '전체',
  domestic: '국내',
  overseas: '해외',
};

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

function formatEok(value: number) {
  return `${(Math.round(value / 1000000) / 100).toLocaleString('ko-KR')}억`;
}

function formatTableAmount(value: number) {
  if (Math.round(value) === 0) {
    return '-';
  }
  return (value / 100000000).toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildApiHref(query: BusinessPlanPreviewWorkspaceQuery) {
  const params = new URLSearchParams();
  params.set('baseYear', String(query.baseYear));
  if (query.businessType) params.set('businessType', query.businessType);
  if (query.industryLine) params.set('industryLine', query.industryLine);
  if (query.region !== 'all') params.set('region', query.region);
  if (query.search) params.set('search', query.search);
  return `/api/crm/business-plan/preview?${params.toString()}`;
}

function buildPlansApiHref(query: BusinessPlanPreviewWorkspaceQuery) {
  const params = new URLSearchParams();
  params.set('baseYear', String(query.baseYear));
  return `/api/crm/business-plan/plans?${params.toString()}`;
}

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null): string {
  if (!responseBody || responseBody.success === true) {
    return '사업계획 preview 조회 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || '사업계획 preview 조회 중 오류가 발생했습니다.';
}

function getYearOptions(baseYear: number) {
  const currentYear = new Date().getFullYear();
  return [...new Set([baseYear, currentYear - 1, currentYear, currentYear + 1, currentYear + 2])]
    .sort((left, right) => left - right);
}

export function BusinessPlanPreviewWorkspaceClient({
  data,
  query,
}: {
  data: CrmBusinessPlanPreviewResponse;
  query: BusinessPlanPreviewWorkspaceQuery;
}) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [currentData, setCurrentData] = useState(data);
  const [planData, setPlanData] = useState<CrmBusinessPlanListResponse | null>(null);
  const [isReloading, setIsReloading] = useState(data.rows.length === 0);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [isSnapshotSaving, setIsSnapshotSaving] = useState(false);
  const [isCarryForwardSaving, setIsCarryForwardSaving] = useState(false);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [busyMonthlyLineId, setBusyMonthlyLineId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const apiHref = useMemo(() => buildApiHref(query), [query]);
  const plansApiHref = useMemo(() => buildPlansApiHref(query), [query]);
  const yearOptions = useMemo(() => getYearOptions(query.baseYear), [query.baseYear]);

  useEffect(() => {
    setCurrentData(data);
    if (data.rows.length > 0) {
      setIsReloading(false);
    }
  }, [data]);

  const loadPreview = useCallback(async (signal?: AbortSignal) => {
    if (!accessToken) {
      return null;
    }

    setIsReloading(true);
    setLoadError(null);
    try {
      const response = await fetch(apiHref, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmBusinessPlanPreviewResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setCurrentData(payload.data);
      return payload.data;
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }
      setLoadError(error instanceof Error ? error.message : '사업계획 preview 조회에 실패했습니다.');
      return null;
    } finally {
      if (!signal?.aborted) {
        setIsReloading(false);
      }
    }
  }, [accessToken, apiHref]);

  const loadPlans = useCallback(async (signal?: AbortSignal) => {
    if (!accessToken) {
      return null;
    }

    setIsPlanLoading(true);
    setPlanError(null);
    try {
      const response = await fetch(plansApiHref, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmBusinessPlanListResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setPlanData(payload.data);
      return payload.data;
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }
      setPlanError(error instanceof Error ? error.message : '사업계획 차수 조회에 실패했습니다.');
      return null;
    } finally {
      if (!signal?.aborted) {
        setIsPlanLoading(false);
      }
    }
  }, [accessToken, plansApiHref]);

  const saveSnapshot = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setIsSnapshotSaving(true);
    setPlanError(null);
    try {
      const response = await fetch('/api/crm/business-plan/plans/snapshot', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...toRequiredBusinessPlanPreviewQuery(query),
          planName: `${query.baseYear} CRM 사업계획 Snapshot`,
          memo: 'CRM preview에서 저장한 사업계획 차수입니다.',
        }),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmBusinessPlan> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      await loadPlans();
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : '사업계획 차수 저장에 실패했습니다.');
    } finally {
      setIsSnapshotSaving(false);
    }
  }, [accessToken, loadPlans, query]);

  const carryForwardSnapshot = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setIsCarryForwardSaving(true);
    setPlanError(null);
    try {
      const response = await fetch('/api/crm/business-plan/plans/carry-forward', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...toRequiredBusinessPlanPreviewQuery(query),
          sourceBaseYear: query.baseYear - 1,
          planName: `${query.baseYear} CRM 사업계획 전년 이월`,
          memo: `${query.baseYear - 1}년 확정 사업계획을 ${query.baseYear}년 draft 차수로 이월했습니다.`,
        }),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmBusinessPlan> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      await loadPlans();
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : '전년 사업계획 이월에 실패했습니다.');
    } finally {
      setIsCarryForwardSaving(false);
    }
  }, [accessToken, loadPlans, query]);

  const runPlanWorkflow = useCallback(async (plan: CrmBusinessPlan, action: 'confirm' | 'reopen') => {
    if (!accessToken) {
      return;
    }
    setBusyPlanId(plan.id);
    setPlanError(null);
    try {
      const response = await fetch(`/api/crm/business-plan/plans/${encodeURIComponent(plan.id)}/${action}`, {
        method: 'POST',
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmBusinessPlan> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      await loadPlans();
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : '사업계획 차수 상태 변경에 실패했습니다.');
    } finally {
      setBusyPlanId(null);
    }
  }, [accessToken, loadPlans]);

  const saveMonthlyPlan = useCallback(async (
    plan: CrmBusinessPlan,
    line: CrmBusinessPlanLine,
    monthlyRevenueAmounts: number[],
  ) => {
    if (!accessToken) {
      return;
    }
    setBusyMonthlyLineId(line.id);
    setPlanError(null);
    try {
      const response = await fetch(`/api/crm/business-plan/plans/${encodeURIComponent(plan.id)}/lines/${encodeURIComponent(line.id)}/monthly-plan`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monthlyRevenueAmounts,
          memo: `${line.targetYear}년 월별 계획 매출 직접 입력`,
        }),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmBusinessPlanMonthlyPlanInputResult> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      await loadPlans();
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : '월별 계획 입력 저장에 실패했습니다.');
    } finally {
      setBusyMonthlyLineId(null);
    }
  }, [accessToken, loadPlans]);

  useEffect(() => {
    const abortController = new AbortController();
    void loadPreview(abortController.signal);
    void loadPlans(abortController.signal);
    return () => abortController.abort();
  }, [loadPlans, loadPreview]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-ssoo-content-bg">
      <header className="border-b bg-card px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">CRM Business Plan Preview</p>
            <h1 className="mt-1 text-xl font-semibold text-foreground">사업계획 Preview</h1>
          </div>
          <Button variant="outline" size="sm" type="button" onClick={() => void loadPreview()} disabled={isReloading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{currentData.summary.boundaryNotice}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {currentData.summary.unavailableActions.map((action) => (
            <Badge key={action} variant="outline">{action}</Badge>
          ))}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-auto p-5">
        <section className="grid gap-3 md:grid-cols-5">
          <Metric label="Preview 범위" value={`${currentData.summary.baseYear}~${currentData.summary.baseYear + currentData.summary.yearCount - 1}`} sub={`${currentData.summary.rowCount}개 사업/계열 후보`} />
          <Metric label="Pipeline 후보" value={formatEok(currentData.summary.pipelineAmountTotal)} sub={formatWon(currentData.summary.pipelineAmountTotal)} />
          <Metric label="계약 계획" value={formatEok(currentData.summary.contractPlanAmountTotal)} sub={formatWon(currentData.summary.contractPlanAmountTotal)} />
          <Metric label="계약 실적" value={formatEok(currentData.summary.contractActualAmountTotal)} sub={formatWon(currentData.summary.contractActualAmountTotal)} />
          <Metric label="실적 Gap" value={formatEok(currentData.summary.actualGapAmountTotal)} sub={formatWon(currentData.summary.actualGapAmountTotal)} />
        </section>

        <BusinessPlanLedgerPanel
          planData={planData}
          isLoading={isPlanLoading}
          isSnapshotSaving={isSnapshotSaving}
          isCarryForwardSaving={isCarryForwardSaving}
          busyPlanId={busyPlanId}
          busyMonthlyLineId={busyMonthlyLineId}
          error={planError}
          previewRowCount={currentData.rows.length}
          onReload={() => void loadPlans()}
          onSaveSnapshot={() => void saveSnapshot()}
          onCarryForward={() => void carryForwardSnapshot()}
          onSaveMonthlyPlan={(plan, line, monthlyRevenueAmounts) => void saveMonthlyPlan(plan, line, monthlyRevenueAmounts)}
          onConfirm={(plan) => void runPlanWorkflow(plan, 'confirm')}
          onReopen={(plan) => void runPlanWorkflow(plan, 'reopen')}
        />

        <section className="mt-4 rounded-md border bg-card">
          <form action="/business-plan" className="flex flex-wrap items-end gap-3 border-b p-4">
            <label className="w-[132px] text-sm font-medium text-muted-foreground">
              기준년도
              <NativeSelect name="baseYear" defaultValue={String(query.baseYear)} className="mt-1">
                {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
              </NativeSelect>
            </label>
            <label className="w-[172px] text-sm font-medium text-muted-foreground">
              사업구분
              <NativeSelect name="businessType" defaultValue={query.businessType} className="mt-1">
                <option value="">전체</option>
                {currentData.summary.businessTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </NativeSelect>
            </label>
            <label className="w-[172px] text-sm font-medium text-muted-foreground">
              계열/산업
              <NativeSelect name="industryLine" defaultValue={query.industryLine} className="mt-1">
                <option value="">전체</option>
                {currentData.summary.industryLineOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </NativeSelect>
            </label>
            <label className="w-[132px] text-sm font-medium text-muted-foreground">
              국내/해외
              <NativeSelect name="region" defaultValue={query.region} className="mt-1">
                {Object.entries(regionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </NativeSelect>
            </label>
            <label className="min-w-[220px] flex-1 text-sm font-medium text-muted-foreground">
              검색
              <Input name="search" defaultValue={query.search} placeholder="고객, 건명, 담당자, WBS" className="mt-1" />
            </label>
            <Button type="submit">
              <Search className="mr-2 h-4 w-4" />
              조회
            </Button>
          </form>

          {loadError ? (
            <div className="flex items-center gap-2 border-b bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">
              <AlertCircle className="h-4 w-4" />
              {loadError}
            </div>
          ) : null}

          <div className="border-b px-4 py-2 text-xs text-muted-foreground">
            단위: 억원 · Pipeline은 실주/보류 제외 영업기회, 계약 계획/실적은 확정 계약 청구 read model 기준
          </div>
          <YearSummary years={currentData.years} />
          <BusinessPlanTable rows={currentData.rows} years={currentData.years} isLoading={isReloading} />
          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            {currentData.summary.rowCount}개 후보 · 현재 preview 저장과 전년도 확정 차수 이월을 지원하며 원가 배부 저장은 후속입니다.
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  const valueTone = value.startsWith('-') ? 'text-ssoo-danger' : 'text-foreground';
  return (
    <div className="rounded-md border bg-card px-4 py-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${valueTone}`}>{value}</div>
      <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function BusinessPlanLedgerPanel({
  planData,
  isLoading,
  isSnapshotSaving,
  isCarryForwardSaving,
  busyPlanId,
  busyMonthlyLineId,
  error,
  previewRowCount,
  onReload,
  onSaveSnapshot,
  onCarryForward,
  onSaveMonthlyPlan,
  onConfirm,
  onReopen,
}: {
  planData: CrmBusinessPlanListResponse | null;
  isLoading: boolean;
  isSnapshotSaving: boolean;
  isCarryForwardSaving: boolean;
  busyPlanId: string | null;
  busyMonthlyLineId: string | null;
  error: string | null;
  previewRowCount: number;
  onReload: () => void;
  onSaveSnapshot: () => void;
  onCarryForward: () => void;
  onSaveMonthlyPlan: (plan: CrmBusinessPlan, line: CrmBusinessPlanLine, monthlyRevenueAmounts: number[]) => void;
  onConfirm: (plan: CrmBusinessPlan) => void;
  onReopen: (plan: CrmBusinessPlan) => void;
}) {
  const plans = planData?.items ?? [];
  const latestPlan = plans[0];
  const confirmedPlan = plans.find((plan) => plan.confirmed);
  const editablePlan = plans.find((plan) => !plan.confirmed && plan.lines.length > 0) ?? null;
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const selectedLine = editablePlan?.lines.find((line) => line.id === selectedLineId) ?? editablePlan?.lines[0] ?? null;
  const [monthlyDraft, setMonthlyDraft] = useState<string[]>(() => (
    Array.from({ length: 12 }, (_, index) => String(selectedLine?.monthlyPlanRevenueAmounts[index] ?? 0))
  ));
  useEffect(() => {
    if (!editablePlan) {
      setSelectedLineId('');
      setMonthlyDraft(Array.from({ length: 12 }, () => '0'));
      return;
    }
    if (!selectedLineId || !editablePlan.lines.some((line) => line.id === selectedLineId)) {
      setSelectedLineId(editablePlan.lines[0]?.id ?? '');
    }
  }, [editablePlan, selectedLineId]);
  useEffect(() => {
    setMonthlyDraft(Array.from({ length: 12 }, (_, index) => String(selectedLine?.monthlyPlanRevenueAmounts[index] ?? 0)));
  }, [selectedLine]);
  const canSave = previewRowCount > 0 && !isSnapshotSaving;
  const canCarryForward = !isCarryForwardSaving && !isSnapshotSaving;
  const monthlyAmounts = monthlyDraft.map((value) => Number(value));
  const monthlyInputInvalid = monthlyAmounts.length !== 12 || monthlyAmounts.some((value) => !Number.isFinite(value) || value < 0);
  const monthlyTotal = monthlyInputInvalid ? 0 : monthlyAmounts.reduce((sum, value) => sum + Math.round(value), 0);
  const monthlySaveDisabled = !editablePlan || !selectedLine || monthlyInputInvalid || busyMonthlyLineId === selectedLine.id;

  return (
    <section className="mt-4 rounded-md border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-foreground">사업계획 차수 원장</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {planData?.summary.boundaryNotice ?? '현재 preview를 기준년도별 draft 차수로 저장하고 확정 상태를 관리합니다.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" type="button" onClick={onReload} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            차수 새로고침
          </Button>
          <Button variant="outline" size="sm" type="button" onClick={onCarryForward} disabled={!canCarryForward}>
            <Copy className="mr-2 h-4 w-4" />
            전년 이월
          </Button>
          <Button size="sm" type="button" onClick={onSaveSnapshot} disabled={!canSave}>
            <Save className="mr-2 h-4 w-4" />
            Preview 저장
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 border-b bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 p-4 md:grid-cols-3">
        <LedgerMetric label="저장 차수" value={`${planData?.summary.rowCount ?? 0}개`} sub={`draft ${planData?.summary.draftCount ?? 0} · confirmed ${planData?.summary.confirmedCount ?? 0}`} />
        <LedgerMetric label="최신 차수" value={latestPlan ? `v${latestPlan.version}` : '-'} sub={latestPlan?.planName ?? '저장된 차수가 없습니다.'} />
        <LedgerMetric label="확정 차수" value={confirmedPlan ? `v${confirmedPlan.version}` : '-'} sub={confirmedPlan?.planName ?? '확정된 차수가 없습니다.'} />
      </div>

      <div className="border-t px-4 py-3">
        {isLoading ? (
          <div className="text-sm text-ssoo-info">사업계획 차수를 불러오는 중입니다.</div>
        ) : plans.length === 0 ? (
          <div className="text-sm text-muted-foreground">현재 기준년도에 저장된 사업계획 차수가 없습니다.</div>
        ) : (
          <div className="grid gap-2">
            {plans.slice(0, 3).map((plan) => (
              <div key={plan.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-ssoo-content-bg px-3 py-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{plan.planName}</span>
                    <Badge variant={plan.confirmed ? 'default' : 'outline'}>{plan.confirmed ? '확정' : 'draft'}</Badge>
                    <span className="text-xs text-muted-foreground">{plan.code}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    v{plan.version} · {plan.baseYear} 기준 · 계획 {formatEok(plan.planCandidateAmountTotal)} · 저장 {formatDateTime(plan.updatedAt)}
                  </div>
                </div>
                <div className="flex gap-2">
                  {plan.confirmed ? (
                    <Button variant="outline" size="sm" type="button" onClick={() => onReopen(plan)} disabled={busyPlanId === plan.id}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      확정 해제
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" type="button" onClick={() => onConfirm(plan)} disabled={busyPlanId === plan.id}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      확정
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editablePlan && selectedLine ? (
        <div className="border-t px-4 py-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[280px] text-sm font-medium text-muted-foreground">
              월별 입력 대상
              <NativeSelect
                value={selectedLine.id}
                onChange={(event) => setSelectedLineId(event.target.value)}
                className="mt-1"
              >
                {editablePlan.lines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.targetYear} · {line.businessType} · {line.industryLine} · {line.ownerName}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <LedgerMetric
              label="월별 계획 합계"
              value={monthlyInputInvalid ? '-' : formatEok(monthlyTotal)}
              sub={selectedLine.monthlyPlanInputMode === 'manual' ? 'manual' : 'distributed'}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => onSaveMonthlyPlan(editablePlan, selectedLine, monthlyAmounts.map((value) => Math.round(value)))}
              disabled={monthlySaveDisabled}
            >
              <Save className="mr-2 h-4 w-4" />
              월별 계획 저장
            </Button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-6 xl:grid-cols-12">
            {monthlyDraft.map((value, index) => (
              <label key={index} className="text-xs font-medium text-muted-foreground">
                {index + 1}월
                <Input
                  type="number"
                  min={0}
                  step={1000000}
                  value={value}
                  onChange={(event) => {
                    const next = [...monthlyDraft];
                    next[index] = event.target.value;
                    setMonthlyDraft(next);
                  }}
                  className="mt-1"
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function LedgerMetric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border bg-ssoo-content-bg px-4 py-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
      <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function YearSummary({ years }: { years: CrmBusinessPlanPreviewYear[] }) {
  return (
    <div className="grid gap-3 border-b p-4 md:grid-cols-3">
      {years.map((year) => (
        <div key={year.year} className="rounded-md border bg-ssoo-content-bg px-4 py-3">
          <div className="text-sm font-semibold text-foreground">{year.year}년 후보</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span>Pipeline</span>
            <span className="text-right font-medium text-foreground">{formatEok(year.pipelineAmount)}</span>
            <span>계약 계획</span>
            <span className="text-right font-medium text-foreground">{formatEok(year.contractPlanAmount)}</span>
            <span>계약 실적</span>
            <span className="text-right font-medium text-foreground">{formatEok(year.contractActualAmount)}</span>
            <span>실적 Gap</span>
            <span className={`text-right font-medium ${year.actualGapAmount < 0 ? 'text-ssoo-danger' : 'text-ssoo-info'}`}>{formatEok(year.actualGapAmount)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function BusinessPlanTable({
  rows,
  years,
  isLoading,
}: {
  rows: CrmBusinessPlanPreviewRow[];
  years: CrmBusinessPlanPreviewYear[];
  isLoading: boolean;
}) {
  const columnCount = 4 + (years.length * 4) + 4;
  return (
    <div className="overflow-auto">
      <Table className="w-full min-w-[1840px] text-xs">
        <TableHeader className="sticky top-0 z-10 bg-ssoo-content-bg text-left text-muted-foreground shadow-sm">
          <TableRow>
            <TableHead className="w-[190px] px-2 py-2" rowSpan={2}>사업구분</TableHead>
            <TableHead className="w-[170px] px-2 py-2" rowSpan={2}>계열/산업</TableHead>
            <TableHead className="w-[120px] px-2 py-2" rowSpan={2}>담당자</TableHead>
            <TableHead className="w-[82px] px-2 py-2" rowSpan={2}>지역</TableHead>
            {years.map((year) => (
              <TableHead key={year.year} className="px-2 py-2 text-center" colSpan={4}>{year.year}</TableHead>
            ))}
            <TableHead className="px-2 py-2 text-center" colSpan={4}>합계</TableHead>
          </TableRow>
          <TableRow>
            {[...years, { year: 0 }].map((year) => (
              <AmountHeads key={year.year} />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border">
          {isLoading ? (
            <TableRow>
              <TableCell className="px-3 py-5 text-center text-ssoo-info" colSpan={columnCount}>사업계획 preview를 불러오는 중입니다.</TableCell>
            </TableRow>
          ) : null}
          {!isLoading && rows.length === 0 ? (
            <TableRow>
              <TableCell className="px-3 py-5 text-center text-muted-foreground" colSpan={columnCount}>조회된 사업계획 후보가 없습니다.</TableCell>
            </TableRow>
          ) : null}
          {!isLoading ? rows.map((row) => <BusinessPlanRow key={row.key} row={row} years={years} />) : null}
        </TableBody>
      </Table>
    </div>
  );
}

function AmountHeads() {
  return (
    <>
      <TableHead className="w-[70px] px-2 py-2 text-right">Pipeline</TableHead>
      <TableHead className="w-[70px] px-2 py-2 text-right">계획</TableHead>
      <TableHead className="w-[70px] px-2 py-2 text-right">실적</TableHead>
      <TableHead className="w-[70px] px-2 py-2 text-right">Gap</TableHead>
    </>
  );
}

function BusinessPlanRow({
  row,
  years,
}: {
  row: CrmBusinessPlanPreviewRow;
  years: CrmBusinessPlanPreviewYear[];
}) {
  return (
    <TableRow>
      <TableCell className="px-2 py-2 font-medium text-foreground">{row.businessType}</TableCell>
      <TableCell className="px-2 py-2 text-muted-foreground">{row.industryLine}</TableCell>
      <TableCell className="px-2 py-2 text-muted-foreground">{row.ownerName}</TableCell>
      <TableCell className="px-2 py-2 text-muted-foreground">{regionLabels[row.region]}</TableCell>
      {years.map((year) => {
        const value = row.years.find((item) => item.year === year.year) ?? {
          year: year.year,
          pipelineAmount: 0,
          contractPlanAmount: 0,
          contractActualAmount: 0,
          planCandidateAmount: 0,
          actualGapAmount: 0,
        };
        return <AmountCells key={year.year} value={value} />;
      })}
      <AmountCells value={{
        year: 0,
        pipelineAmount: row.pipelineAmount,
        contractPlanAmount: row.contractPlanAmount,
        contractActualAmount: row.contractActualAmount,
        planCandidateAmount: row.planCandidateAmount,
        actualGapAmount: row.actualGapAmount,
      }} isTotal />
    </TableRow>
  );
}

function AmountCells({ value, isTotal = false }: { value: CrmBusinessPlanPreviewYear; isTotal?: boolean }) {
  const weight = isTotal ? 'font-semibold' : 'font-normal';
  const gapTone = value.actualGapAmount < 0 ? 'text-ssoo-danger' : value.actualGapAmount > 0 ? 'text-ssoo-info' : 'text-muted-foreground';
  return (
    <>
      <TableCell className={`px-2 py-2 text-right text-muted-foreground ${weight}`}>{formatTableAmount(value.pipelineAmount)}</TableCell>
      <TableCell className={`px-2 py-2 text-right text-muted-foreground ${weight}`}>{formatTableAmount(value.contractPlanAmount)}</TableCell>
      <TableCell className={`px-2 py-2 text-right text-muted-foreground ${weight}`}>{formatTableAmount(value.contractActualAmount)}</TableCell>
      <TableCell className={`px-2 py-2 text-right ${gapTone} ${weight}`}>{formatTableAmount(value.actualGapAmount)}</TableCell>
    </>
  );
}

export function normalizeBusinessPlanPreviewQuery(path: string): BusinessPlanPreviewWorkspaceQuery {
  const [, queryString = ''] = path.split('?');
  const searchParams = new URLSearchParams(queryString);
  const baseYear = Number(searchParams.get('baseYear') ?? new Date().getFullYear());
  const region = searchParams.get('region') as CrmBusinessPlanPreviewRegion | null;
  return {
    baseYear: Number.isFinite(baseYear) && baseYear >= 2000 ? Math.trunc(baseYear) : new Date().getFullYear(),
    businessType: (searchParams.get('businessType') ?? '').trim(),
    industryLine: (searchParams.get('industryLine') ?? '').trim(),
    region: region && ['all', 'domestic', 'overseas'].includes(region) ? region : 'all',
    search: (searchParams.get('search') ?? '').trim(),
  };
}

export function toRequiredBusinessPlanPreviewQuery(query: BusinessPlanPreviewWorkspaceQuery): Required<CrmBusinessPlanPreviewQuery> {
  return {
    baseYear: query.baseYear,
    businessType: query.businessType,
    industryLine: query.industryLine,
    region: query.region,
    search: query.search,
  };
}

export function normalizeBusinessPlanPreviewQueryRecord(
  query: Record<string, string | string[] | undefined> = {},
): BusinessPlanPreviewWorkspaceQuery {
  const value = (key: string) => {
    const raw = query[key];
    return Array.isArray(raw) ? raw[0] ?? '' : raw ?? '';
  };
  const baseYear = Number(value('baseYear') || new Date().getFullYear());
  const region = value('region') as CrmBusinessPlanPreviewRegion;
  return {
    baseYear: Number.isFinite(baseYear) && baseYear >= 2000 ? Math.trunc(baseYear) : new Date().getFullYear(),
    businessType: value('businessType').trim(),
    industryLine: value('industryLine').trim(),
    region: ['all', 'domestic', 'overseas'].includes(region) ? region : 'all',
    search: value('search').trim(),
  };
}
