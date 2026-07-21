'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw, Save, Search } from 'lucide-react';
import type {
  CrmBusinessPlanPerformanceActualInputRequest,
  CrmBusinessPlanPerformanceActualInputResult,
  CrmBusinessPlanPerformanceMonth,
  CrmBusinessPlanPerformanceQuery,
  CrmBusinessPlanPerformanceResponse,
  CrmBusinessPlanPerformanceRow,
  CrmBusinessPlanPerformanceSource,
  CrmBusinessPlanPreviewRegion,
} from '@ssoo/types/crm';
import { Badge, Button, Input, NativeSelect, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';
import { useAuthStore } from '@/stores/auth.store';

export interface BusinessPlanPerformancePreviewWorkspaceQuery {
  year: number;
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

type PerformanceRowKind = 'plan' | 'actual' | 'gap';

interface DirectActualDraft {
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmBusinessPlanPreviewRegion, 'all'>;
  wbsCode: string;
  monthlyRevenueAmounts: number[];
  monthlyCostAmounts: number[];
  memo: string;
}

const regionLabels: Record<CrmBusinessPlanPreviewRegion, string> = {
  all: '전체',
  domestic: '국내',
  overseas: '해외',
};

const sourceLabels: Record<CrmBusinessPlanPerformanceSource, string> = {
  'confirmed-plan': '확정계획',
  pipeline: 'Pipeline',
  contract: '계약',
  'confirmed-cost': '확정원가',
  'manual-actual': '직접실적',
  mixed: '혼합',
};

const rowKindLabels: Record<PerformanceRowKind, string> = {
  plan: '계획',
  actual: '실적',
  gap: '차이',
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

function buildApiHref(query: BusinessPlanPerformancePreviewWorkspaceQuery) {
  const params = new URLSearchParams();
  params.set('year', String(query.year));
  if (query.businessType) params.set('businessType', query.businessType);
  if (query.industryLine) params.set('industryLine', query.industryLine);
  if (query.region !== 'all') params.set('region', query.region);
  if (query.search) params.set('search', query.search);
  return `/api/crm/business-plan/performance-preview?${params.toString()}`;
}

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null): string {
  if (!responseBody || responseBody.success === true) {
    return '사업계획대비실적 preview 조회 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || '사업계획대비실적 preview 조회 중 오류가 발생했습니다.';
}

function getYearOptions(year: number) {
  const currentYear = new Date().getFullYear();
  return [...new Set([year, currentYear - 1, currentYear, currentYear + 1, currentYear + 2])]
    .sort((left, right) => left - right);
}

function createDirectActualDraft(query: BusinessPlanPerformancePreviewWorkspaceQuery): DirectActualDraft {
  return {
    businessType: query.businessType,
    industryLine: query.industryLine,
    ownerName: '',
    region: query.region === 'overseas' ? 'overseas' : 'domestic',
    wbsCode: '',
    monthlyRevenueAmounts: Array.from({ length: 12 }, () => 0),
    monthlyCostAmounts: Array.from({ length: 12 }, () => 0),
    memo: '',
  };
}

function toInputAmount(value: string): number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

export function BusinessPlanPerformancePreviewWorkspaceClient({
  data,
  query,
}: {
  data: CrmBusinessPlanPerformanceResponse;
  query: BusinessPlanPerformancePreviewWorkspaceQuery;
}) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [currentData, setCurrentData] = useState(data);
  const [isReloading, setIsReloading] = useState(data.rows.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [directActualDraft, setDirectActualDraft] = useState(() => createDirectActualDraft(query));
  const [isDirectActualSaving, setIsDirectActualSaving] = useState(false);
  const [directActualMessage, setDirectActualMessage] = useState<string | null>(null);
  const [directActualError, setDirectActualError] = useState<string | null>(null);
  const apiHref = useMemo(() => buildApiHref(query), [query]);
  const yearOptions = useMemo(() => getYearOptions(query.year), [query.year]);

  useEffect(() => {
    setCurrentData(data);
    if (data.rows.length > 0) {
      setIsReloading(false);
    }
  }, [data]);

  useEffect(() => {
    setDirectActualDraft((current) => ({
      ...current,
      businessType: current.businessType || query.businessType,
      industryLine: current.industryLine || query.industryLine,
      region: query.region === 'overseas' ? 'overseas' : current.region,
    }));
  }, [query.businessType, query.industryLine, query.region]);

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
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmBusinessPlanPerformanceResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setCurrentData(payload.data);
      return payload.data;
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }
      setLoadError(error instanceof Error ? error.message : '사업계획대비실적 preview 조회에 실패했습니다.');
      return null;
    } finally {
      if (!signal?.aborted) {
        setIsReloading(false);
      }
    }
  }, [accessToken, apiHref]);

  const saveDirectActual = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    const payload: CrmBusinessPlanPerformanceActualInputRequest = {
      year: query.year,
      businessType: directActualDraft.businessType.trim(),
      industryLine: directActualDraft.industryLine.trim(),
      ownerName: directActualDraft.ownerName.trim(),
      region: directActualDraft.region,
      wbsCode: directActualDraft.wbsCode.trim() || undefined,
      monthlyRevenueAmounts: directActualDraft.monthlyRevenueAmounts,
      monthlyCostAmounts: directActualDraft.monthlyCostAmounts,
      memo: directActualDraft.memo.trim() || undefined,
    };
    if (!payload.businessType || !payload.industryLine || !payload.ownerName) {
      setDirectActualError('사업구분, 계열/산업, 담당자를 입력해야 합니다.');
      setDirectActualMessage(null);
      return;
    }
    setIsDirectActualSaving(true);
    setDirectActualError(null);
    setDirectActualMessage(null);
    try {
      const response = await fetch('/api/crm/business-plan/performance-actual/monthly', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null) as BackendSuccessResponse<CrmBusinessPlanPerformanceActualInputResult> | BackendErrorResponse | null;
      if (!response.ok || result?.success !== true) {
        throw new Error(getBackendErrorMessage(result));
      }
      setDirectActualMessage(`직접 실적 ${formatWon(result.data.input.revenueAmountTotal)} / 원가 ${formatWon(result.data.input.costAmountTotal)} 저장`);
      await loadPreview();
    } catch (error) {
      setDirectActualError(error instanceof Error ? error.message : '직접 실적 저장에 실패했습니다.');
    } finally {
      setIsDirectActualSaving(false);
    }
  }, [accessToken, directActualDraft, loadPreview, query.year]);

  useEffect(() => {
    const abortController = new AbortController();
    void loadPreview(abortController.signal);
    return () => abortController.abort();
  }, [loadPreview]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-ssoo-content-bg">
      <header className="border-b bg-card px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">CRM Business Plan Performance</p>
            <h1 className="mt-1 text-xl font-semibold text-foreground">사업계획대비실적 Preview</h1>
          </div>
          <Button variant="outline" size="sm" type="button" onClick={() => void loadPreview()} disabled={isReloading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{currentData.summary.boundaryNotice}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary">{currentData.summary.planBasisLabel}</Badge>
          <Badge variant="secondary">{currentData.summary.costBasisLabel}</Badge>
          {currentData.summary.confirmedPlanCode ? (
            <Badge variant="outline">{currentData.summary.confirmedPlanCode} · {currentData.summary.confirmedPlanName}</Badge>
          ) : null}
          {currentData.summary.confirmedCostInputCount > 0 ? (
            <Badge variant="outline">
              확정원가 {currentData.summary.confirmedCostInputCount}개 · 내부 {currentData.summary.confirmedInternalCostInputCount} · AMS {currentData.summary.confirmedAmsExternalCostInputCount}
            </Badge>
          ) : null}
          {currentData.summary.directActualInputCount > 0 ? (
            <Badge variant="outline">
              직접실적 {currentData.summary.directActualInputCount}개 · 매출 {formatWon(currentData.summary.directActualRevenueTotal)}
            </Badge>
          ) : null}
          {currentData.summary.amsExternalCostAdjustedWbsCount > 0 ? (
            <Badge variant="outline">
              AMS 중복조정 {currentData.summary.amsExternalCostAdjustedWbsCount} WBS · 계약 외부원가 제외 {formatWon(currentData.summary.amsExternalCostAdjustedActualAmountTotal)}
            </Badge>
          ) : null}
          {currentData.summary.unavailableActions.map((action) => (
            <Badge key={action} variant="outline">{action}</Badge>
          ))}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-auto p-5">
        <section className="grid gap-3 md:grid-cols-6">
          <Metric label="기준년도" value={`${currentData.summary.year}년`} sub={`${currentData.summary.rowCount}개 후보`} />
          <Metric label="계획 매출" value={formatEok(currentData.summary.planRevenueTotal)} sub={formatWon(currentData.summary.planRevenueTotal)} />
          <Metric label="실적 매출" value={formatEok(currentData.summary.actualRevenueTotal)} sub={formatWon(currentData.summary.actualRevenueTotal)} />
          <Metric label="직접 실적" value={`${currentData.summary.directActualInputCount}개`} sub={`매출 ${formatWon(currentData.summary.directActualRevenueTotal)} · 원가 ${formatWon(currentData.summary.directActualCostTotal)}`} />
          <Metric label="매출 차이" value={formatEok(currentData.summary.revenueGapTotal)} sub={formatWon(currentData.summary.revenueGapTotal)} />
          <Metric label="손익 차이" value={formatEok(currentData.summary.marginGapTotal)} sub={formatWon(currentData.summary.marginGapTotal)} />
        </section>

        <DirectActualInputPanel
          draft={directActualDraft}
          businessTypeOptions={currentData.summary.businessTypeOptions}
          industryLineOptions={currentData.summary.industryLineOptions}
          isSaving={isDirectActualSaving}
          message={directActualMessage}
          error={directActualError}
          onDraftChange={setDirectActualDraft}
          onSave={() => void saveDirectActual()}
        />

        <section className="mt-4 rounded-md border bg-card">
          <form action="/business-plan-performance" className="flex flex-wrap items-end gap-3 border-b p-4">
            <label className="w-[132px] text-sm font-medium text-muted-foreground">
              기준년도
              <NativeSelect name="year" defaultValue={String(query.year)} className="mt-1">
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
            단위: 억원 · 계획은 {currentData.summary.confirmedPlanAvailable ? '확정 사업계획 차수의 월별 입력 우선, 미입력 line은 월 균등 배분' : 'pipeline 후보와 확정 계약 청구계획'} 기준, 원가는 {currentData.summary.costBasisLabel} 기준
            {currentData.summary.amsExternalCostAdjustedWbsCount > 0 ? ` · AMS 확정 WBS ${currentData.summary.amsExternalCostAdjustedWbsCount}개는 계약 외부원가 실적 ${formatWon(currentData.summary.amsExternalCostAdjustedActualAmountTotal)}를 제외` : ''}
          </div>
          <MonthSummary months={currentData.months} />
          <PerformanceTable rows={currentData.rows} months={currentData.months} isLoading={isReloading} />
          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            {currentData.summary.rowCount}개 후보 · 확정원가 {currentData.summary.confirmedCostInputCount}개 · AMS 조정 WBS {currentData.summary.amsExternalCostAdjustedWbsCount}개 · {currentData.summary.confirmedPlanAvailable ? '확정 사업계획 차수 기준 읽기 전용 비교' : '확정 사업계획 차수 없이 읽기 전용 후보 비교'}
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

function DirectActualInputPanel({
  draft,
  businessTypeOptions,
  industryLineOptions,
  isSaving,
  message,
  error,
  onDraftChange,
  onSave,
}: {
  draft: DirectActualDraft;
  businessTypeOptions: string[];
  industryLineOptions: string[];
  isSaving: boolean;
  message: string | null;
  error: string | null;
  onDraftChange: (draft: DirectActualDraft) => void;
  onSave: () => void;
}) {
  const revenueTotal = draft.monthlyRevenueAmounts.reduce((sum, amount) => sum + amount, 0);
  const costTotal = draft.monthlyCostAmounts.reduce((sum, amount) => sum + amount, 0);
  const canSave = Boolean(draft.businessType.trim() && draft.industryLine.trim() && draft.ownerName.trim() && !isSaving);
  const updateField = <K extends keyof DirectActualDraft>(key: K, value: DirectActualDraft[K]) => {
    onDraftChange({ ...draft, [key]: value });
  };
  const updateMonth = (
    key: 'monthlyRevenueAmounts' | 'monthlyCostAmounts',
    index: number,
    value: string,
  ) => {
    const next = [...draft[key]];
    next[index] = toInputAmount(value);
    onDraftChange({ ...draft, [key]: next });
  };

  return (
    <section className="mt-4 rounded-md border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">실적 직접 입력</h2>
          <p className="mt-1 text-xs text-muted-foreground">별도 manual-actual row · 매출 {formatWon(revenueTotal)} · 원가 {formatWon(costTotal)}</p>
        </div>
        <Button type="button" size="sm" onClick={onSave} disabled={!canSave}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? '저장 중' : '직접 실적 저장'}
        </Button>
      </div>
      <div className="grid gap-3 border-b p-4 md:grid-cols-3 xl:grid-cols-6">
        <label className="text-sm font-medium text-muted-foreground">
          사업구분
          <Input
            value={draft.businessType}
            list="crm-business-plan-performance-business-types"
            onChange={(event) => updateField('businessType', event.target.value)}
            className="mt-1"
          />
        </label>
        <label className="text-sm font-medium text-muted-foreground">
          계열/산업
          <Input
            value={draft.industryLine}
            list="crm-business-plan-performance-industry-lines"
            onChange={(event) => updateField('industryLine', event.target.value)}
            className="mt-1"
          />
        </label>
        <label className="text-sm font-medium text-muted-foreground">
          담당자
          <Input value={draft.ownerName} onChange={(event) => updateField('ownerName', event.target.value)} className="mt-1" />
        </label>
        <label className="text-sm font-medium text-muted-foreground">
          국내/해외
          <NativeSelect value={draft.region} onChange={(event) => updateField('region', event.target.value === 'overseas' ? 'overseas' : 'domestic')} className="mt-1">
            <option value="domestic">국내</option>
            <option value="overseas">해외</option>
          </NativeSelect>
        </label>
        <label className="text-sm font-medium text-muted-foreground">
          WBS
          <Input value={draft.wbsCode} onChange={(event) => updateField('wbsCode', event.target.value)} className="mt-1" />
        </label>
        <label className="text-sm font-medium text-muted-foreground">
          메모
          <Input value={draft.memo} onChange={(event) => updateField('memo', event.target.value)} className="mt-1" />
        </label>
        <datalist id="crm-business-plan-performance-business-types">
          {businessTypeOptions.map((option) => <option key={option} value={option} />)}
        </datalist>
        <datalist id="crm-business-plan-performance-industry-lines">
          {industryLineOptions.map((option) => <option key={option} value={option} />)}
        </datalist>
      </div>
      <div className="grid gap-2 p-4 md:grid-cols-3 xl:grid-cols-6">
        {draft.monthlyRevenueAmounts.map((revenueAmount, index) => (
          <div key={index + 1} className="rounded-md border bg-ssoo-content-bg p-2">
            <div className="text-xs font-semibold text-foreground">{index + 1}월</div>
            <label className="mt-2 block text-caption-2xs font-medium text-muted-foreground">
              매출
              <Input
                type="number"
                min={0}
                value={revenueAmount || ''}
                onChange={(event) => updateMonth('monthlyRevenueAmounts', index, event.target.value)}
                className="mt-1"
              />
            </label>
            <label className="mt-2 block text-caption-2xs font-medium text-muted-foreground">
              원가
              <Input
                type="number"
                min={0}
                value={draft.monthlyCostAmounts[index] || ''}
                onChange={(event) => updateMonth('monthlyCostAmounts', index, event.target.value)}
                className="mt-1"
              />
            </label>
          </div>
        ))}
      </div>
      {message ? <div className="border-t px-4 py-3 text-sm text-ssoo-success">{message}</div> : null}
      {error ? (
        <div className="flex items-center gap-2 border-t bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}
    </section>
  );
}

function MonthSummary({ months }: { months: CrmBusinessPlanPerformanceMonth[] }) {
  return (
    <div className="grid gap-2 border-b p-4 md:grid-cols-4 xl:grid-cols-6">
      {months.map((month) => (
        <div key={month.month} className="rounded-md border bg-ssoo-content-bg px-3 py-2">
          <div className="text-xs font-semibold text-foreground">{month.month}월</div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>계획</span>
            <span className="font-medium text-foreground">{formatEok(month.planRevenueAmount)}</span>
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>실적</span>
            <span className="font-medium text-foreground">{formatEok(month.actualRevenueAmount)}</span>
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>차이</span>
            <span className={`font-medium ${month.revenueGapAmount < 0 ? 'text-ssoo-danger' : 'text-ssoo-info'}`}>{formatEok(month.revenueGapAmount)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PerformanceTable({
  rows,
  months,
  isLoading,
}: {
  rows: CrmBusinessPlanPerformanceRow[];
  months: CrmBusinessPlanPerformanceMonth[];
  isLoading: boolean;
}) {
  const columnCount = 5 + ((months.length + 1) * 3);
  return (
    <div className="overflow-auto">
      <Table className="w-full min-w-[2920px] text-xs">
        <TableHeader className="sticky top-0 z-10 bg-ssoo-content-bg text-left text-muted-foreground shadow-sm">
          <TableRow>
            <TableHead className="w-[150px] px-2 py-2" rowSpan={2}>사업구분</TableHead>
            <TableHead className="w-[150px] px-2 py-2" rowSpan={2}>계열/산업</TableHead>
            <TableHead className="w-[220px] px-2 py-2" rowSpan={2}>사업/WBS</TableHead>
            <TableHead className="w-[88px] px-2 py-2" rowSpan={2}>출처</TableHead>
            <TableHead className="w-[56px] px-2 py-2" rowSpan={2}>구분</TableHead>
            {months.map((month) => (
              <TableHead key={month.month} className="px-2 py-2 text-center" colSpan={3}>{month.month}월</TableHead>
            ))}
            <TableHead className="px-2 py-2 text-center" colSpan={3}>합계</TableHead>
          </TableRow>
          <TableRow>
            {[...months, { month: 0 }].map((month) => (
              <AmountHeads key={month.month} />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border">
          {isLoading ? (
            <TableRow>
              <TableCell className="px-3 py-5 text-center text-ssoo-info" colSpan={columnCount}>사업계획대비실적 preview를 불러오는 중입니다.</TableCell>
            </TableRow>
          ) : null}
          {!isLoading && rows.length === 0 ? (
            <TableRow>
              <TableCell className="px-3 py-5 text-center text-muted-foreground" colSpan={columnCount}>조회된 사업계획대비실적 후보가 없습니다.</TableCell>
            </TableRow>
          ) : null}
          {!isLoading ? rows.map((row) => <PerformanceRows key={row.key} row={row} months={months} />) : null}
        </TableBody>
      </Table>
    </div>
  );
}

function AmountHeads() {
  return (
    <>
      <TableHead className="w-[70px] px-2 py-2 text-right">매출</TableHead>
      <TableHead className="w-[70px] px-2 py-2 text-right">원가</TableHead>
      <TableHead className="w-[70px] px-2 py-2 text-right">손익</TableHead>
    </>
  );
}

function PerformanceRows({
  row,
  months,
}: {
  row: CrmBusinessPlanPerformanceRow;
  months: CrmBusinessPlanPerformanceMonth[];
}) {
  const rowKinds: PerformanceRowKind[] = ['plan', 'actual', 'gap'];
  return (
    <>
      {rowKinds.map((kind) => (
        <TableRow key={`${row.key}-${kind}`} className={kind === 'gap' ? 'bg-ssoo-warning-bg' : kind === 'actual' ? 'bg-ssoo-info-bg' : undefined}>
          <TableCell className="px-2 py-2 font-medium text-foreground">{kind === 'plan' ? row.businessType : ''}</TableCell>
          <TableCell className="px-2 py-2 text-muted-foreground">{kind === 'plan' ? row.industryLine : ''}</TableCell>
          <TableCell className="px-2 py-2 text-muted-foreground">
            {kind === 'plan' ? (
              <div>
                <div className="font-medium text-foreground">{row.label}</div>
                <div className="mt-0.5 text-caption-2xs text-muted-foreground">{row.wbsCode || 'WBS 미지정'} · {row.ownerName} · {regionLabels[row.region]}</div>
              </div>
            ) : null}
          </TableCell>
          <TableCell className="px-2 py-2">{kind === 'plan' ? <SourceBadge value={row.source} /> : null}</TableCell>
          <TableCell className="px-2 py-2 font-medium text-muted-foreground">{rowKindLabels[kind]}</TableCell>
          {months.map((month) => <AmountCells key={month.month} month={getMonthForKind(row.months[month.month - 1], kind)} kind={kind} />)}
          <AmountCells month={getMonthForKind(row.total, kind)} kind={kind} isTotal />
        </TableRow>
      ))}
    </>
  );
}

function SourceBadge({ value }: { value: CrmBusinessPlanPerformanceSource }) {
  const variant = value === 'pipeline' ? 'outline' : value === 'contract' || value === 'confirmed-cost' ? 'secondary' : 'default';
  return <Badge variant={variant}>{sourceLabels[value]}</Badge>;
}

function getMonthForKind(month: CrmBusinessPlanPerformanceMonth | undefined, kind: PerformanceRowKind): Pick<CrmBusinessPlanPerformanceMonth, 'planRevenueAmount' | 'planCostAmount' | 'planMarginAmount'> {
  const value = month ?? {
    month: 0,
    planRevenueAmount: 0,
    planCostAmount: 0,
    planMarginAmount: 0,
    actualRevenueAmount: 0,
    actualCostAmount: 0,
    actualMarginAmount: 0,
    revenueGapAmount: 0,
    costGapAmount: 0,
    marginGapAmount: 0,
  };
  if (kind === 'actual') {
    return {
      planRevenueAmount: value.actualRevenueAmount,
      planCostAmount: value.actualCostAmount,
      planMarginAmount: value.actualMarginAmount,
    };
  }
  if (kind === 'gap') {
    return {
      planRevenueAmount: value.revenueGapAmount,
      planCostAmount: value.costGapAmount,
      planMarginAmount: value.marginGapAmount,
    };
  }
  return value;
}

function AmountCells({
  month,
  kind,
  isTotal = false,
}: {
  month: Pick<CrmBusinessPlanPerformanceMonth, 'planRevenueAmount' | 'planCostAmount' | 'planMarginAmount'>;
  kind: PerformanceRowKind;
  isTotal?: boolean;
}) {
  const weight = isTotal ? 'font-semibold' : 'font-normal';
  const tone = kind === 'gap' && month.planRevenueAmount < 0 ? 'text-ssoo-danger' : kind === 'gap' && month.planRevenueAmount > 0 ? 'text-ssoo-info' : 'text-muted-foreground';
  return (
    <>
      <TableCell className={`px-2 py-2 text-right ${tone} ${weight}`}>{formatTableAmount(month.planRevenueAmount)}</TableCell>
      <TableCell className={`px-2 py-2 text-right text-muted-foreground ${weight}`}>{formatTableAmount(month.planCostAmount)}</TableCell>
      <TableCell className={`px-2 py-2 text-right ${tone} ${weight}`}>{formatTableAmount(month.planMarginAmount)}</TableCell>
    </>
  );
}

export function normalizeBusinessPlanPerformancePreviewQuery(path: string): BusinessPlanPerformancePreviewWorkspaceQuery {
  const [, queryString = ''] = path.split('?');
  const searchParams = new URLSearchParams(queryString);
  const year = Number(searchParams.get('year') ?? new Date().getFullYear());
  const region = searchParams.get('region') as CrmBusinessPlanPreviewRegion | null;
  return {
    year: Number.isFinite(year) && year >= 2000 ? Math.trunc(year) : new Date().getFullYear(),
    businessType: (searchParams.get('businessType') ?? '').trim(),
    industryLine: (searchParams.get('industryLine') ?? '').trim(),
    region: region && ['all', 'domestic', 'overseas'].includes(region) ? region : 'all',
    search: (searchParams.get('search') ?? '').trim(),
  };
}

export function toRequiredBusinessPlanPerformancePreviewQuery(
  query: BusinessPlanPerformancePreviewWorkspaceQuery,
): Required<CrmBusinessPlanPerformanceQuery> {
  return {
    year: query.year,
    businessType: query.businessType,
    industryLine: query.industryLine,
    region: query.region,
    search: query.search,
  };
}

export function normalizeBusinessPlanPerformancePreviewQueryRecord(
  query: Record<string, string | string[] | undefined> = {},
): BusinessPlanPerformancePreviewWorkspaceQuery {
  const value = (key: string) => {
    const raw = query[key];
    return Array.isArray(raw) ? raw[0] ?? '' : raw ?? '';
  };
  const year = Number(value('year') || new Date().getFullYear());
  const region = value('region') as CrmBusinessPlanPreviewRegion;
  return {
    year: Number.isFinite(year) && year >= 2000 ? Math.trunc(year) : new Date().getFullYear(),
    businessType: value('businessType').trim(),
    industryLine: value('industryLine').trim(),
    region: ['all', 'domestic', 'overseas'].includes(region) ? region : 'all',
    search: value('search').trim(),
  };
}
