'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw, Search } from 'lucide-react';
import type {
  CrmContractPerformanceMonth,
  CrmContractPerformanceQuery,
  CrmContractPerformanceRegion,
  CrmContractPerformanceResponse,
  CrmContractPerformanceRow,
} from '@ssoo/types/crm';
import { Button, Input, NativeSelect, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';
import { useAuthStore } from '@/stores/auth.store';

export interface ContractPerformanceWorkspaceQuery {
  year: number;
  businessType: string;
  industryLine: string;
  region: CrmContractPerformanceRegion;
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

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

const regionLabels: Record<CrmContractPerformanceRegion, string> = {
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

function formatDate(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ko-KR');
}

function buildApiHref(query: ContractPerformanceWorkspaceQuery) {
  const params = new URLSearchParams();
  params.set('year', String(query.year));
  if (query.businessType) params.set('businessType', query.businessType);
  if (query.industryLine) params.set('industryLine', query.industryLine);
  if (query.region !== 'all') params.set('region', query.region);
  if (query.search) params.set('search', query.search);
  return `/api/crm/contracts/monthly-performance?${params.toString()}`;
}

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null): string {
  if (!responseBody || responseBody.success === true) {
    return '계약대비실적 조회 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || '계약대비실적 조회 중 오류가 발생했습니다.';
}

function getYearOptions(year: number) {
  const currentYear = new Date().getFullYear();
  return [...new Set([year, currentYear - 1, currentYear, currentYear + 1, currentYear + 2])]
    .sort((left, right) => left - right);
}

export function ContractPerformanceWorkspaceClient({
  data,
  query,
}: {
  data: CrmContractPerformanceResponse;
  query: ContractPerformanceWorkspaceQuery;
}) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [currentData, setCurrentData] = useState(data);
  const [isReloading, setIsReloading] = useState(data.items.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const apiHref = useMemo(() => buildApiHref(query), [query]);
  const yearOptions = useMemo(() => getYearOptions(query.year), [query.year]);

  useEffect(() => {
    setCurrentData(data);
    if (data.items.length > 0) {
      setIsReloading(false);
    }
  }, [data]);

  const loadPerformance = useCallback(async (signal?: AbortSignal) => {
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
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmContractPerformanceResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setCurrentData(payload.data);
      return payload.data;
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }
      setLoadError(error instanceof Error ? error.message : '계약대비실적 조회에 실패했습니다.');
      return null;
    } finally {
      if (!signal?.aborted) {
        setIsReloading(false);
      }
    }
  }, [accessToken, apiHref]);

  useEffect(() => {
    const abortController = new AbortController();
    void loadPerformance(abortController.signal);
    return () => abortController.abort();
  }, [loadPerformance]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-ssoo-content-bg">
      <header className="border-b bg-card px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">CRM Contract Performance</p>
            <h1 className="mt-1 text-xl font-semibold text-foreground">계약대비실적</h1>
          </div>
          <Button variant="outline" size="sm" type="button" onClick={() => void loadPerformance()} disabled={isReloading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{currentData.summary.boundaryNotice}</p>
      </header>

      <main className="min-h-0 flex-1 overflow-auto p-5">
        <section className="grid gap-3 md:grid-cols-5">
          <Metric label="확정 계약" value={`${currentData.summary.contractCount}건`} sub={`${currentData.summary.year}년 계획/실적`} />
          <Metric label="계획 매출" value={formatEok(currentData.summary.planRevenueTotal)} sub={formatWon(currentData.summary.planRevenueTotal)} />
          <Metric label="실적 매출" value={formatEok(currentData.summary.actualRevenueTotal)} sub={`달성률 ${currentData.summary.revenueAchievementRate}%`} />
          <Metric label="매출 차이" value={formatEok(currentData.summary.revenueDelta)} sub={formatWon(currentData.summary.revenueDelta)} />
          <Metric label="손익 차이" value={formatEok(currentData.summary.marginDelta)} sub={formatWon(currentData.summary.marginDelta)} />
        </section>

        <section className="mt-4 rounded-md border bg-card">
          <form action="/contract-performance" className="flex flex-wrap items-end gap-3 border-b p-4">
            <label className="w-[132px] text-sm font-medium text-muted-foreground">
              사업년도
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
              <Input name="search" defaultValue={query.search} placeholder="계약명, 고객사, WBS" className="mt-1" />
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

          <div className="border-b px-4 py-2 text-xs text-muted-foreground">단위: 억원</div>
          <PerformanceTable items={currentData.items} isLoading={isReloading} />
          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            {currentData.summary.contractCount}건 조회 · {currentData.summary.year}년 확정 계약 청구계획/실적 기준
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

function PerformanceTable({ items, isLoading }: { items: CrmContractPerformanceRow[]; isLoading: boolean }) {
  return (
    <div className="overflow-auto">
      <Table className="w-full min-w-[2920px] text-xs">
        <TableHeader className="sticky top-0 z-10 bg-ssoo-content-bg text-left text-muted-foreground shadow-sm">
          <TableRow>
            <TableHead className="w-[260px] px-2 py-2" rowSpan={2}>계약명</TableHead>
            <TableHead className="w-[170px] px-2 py-2" rowSpan={2}>고객/구분</TableHead>
            <TableHead className="w-[120px] px-2 py-2" rowSpan={2}>WBS</TableHead>
            <TableHead className="w-[138px] px-2 py-2" rowSpan={2}>계약기간</TableHead>
            <TableHead className="w-[58px] px-2 py-2 text-center" rowSpan={2}>구분</TableHead>
            {MONTHS.map((month) => (
              <TableHead key={month} className="px-2 py-2 text-center" colSpan={3}>{month}월</TableHead>
            ))}
            <TableHead className="px-2 py-2 text-center" colSpan={3}>합계</TableHead>
          </TableRow>
          <TableRow>
            {[...MONTHS, 0].map((month) => (
              <MonthAmountHeads key={month} />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border">
          {isLoading ? (
            <TableRow>
              <TableCell className="px-3 py-5 text-center text-ssoo-info" colSpan={44}>계약대비실적을 불러오는 중입니다.</TableCell>
            </TableRow>
          ) : null}
          {!isLoading && items.length === 0 ? (
            <TableRow>
              <TableCell className="px-3 py-5 text-center text-muted-foreground" colSpan={44}>조회된 계약대비실적이 없습니다.</TableCell>
            </TableRow>
          ) : null}
          {!isLoading ? items.map((item) => <PerformanceRowGroup key={item.contractId} item={item} />) : null}
        </TableBody>
      </Table>
    </div>
  );
}

function MonthAmountHeads() {
  return (
    <>
      <TableHead className="w-[62px] px-2 py-2 text-right">매출</TableHead>
      <TableHead className="w-[62px] px-2 py-2 text-right">외부원가</TableHead>
      <TableHead className="w-[62px] px-2 py-2 text-right">손익</TableHead>
    </>
  );
}

function PerformanceRowGroup({ item }: { item: CrmContractPerformanceRow }) {
  const rows = [
    { key: 'plan', label: '계획', className: 'bg-card', values: item.months.map(toPlanValues), total: toPlanValues(item.total) },
    { key: 'actual', label: '실적', className: 'bg-ssoo-info-bg', values: item.months.map(toActualValues), total: toActualValues(item.total) },
    { key: 'delta', label: '차이', className: 'bg-ssoo-warning-bg', values: item.months.map(toDeltaValues), total: toDeltaValues(item.total) },
  ];

  return (
    <>
      {rows.map((row, index) => (
        <TableRow key={row.key} className={row.className}>
          {index === 0 ? (
            <>
              <TableCell className="px-2 py-2 align-top font-medium text-foreground" rowSpan={3}>
                <div className="truncate" title={item.contractName}>{item.contractName}</div>
                <div className="mt-1 text-caption-2xs font-normal text-muted-foreground">{item.contractCode} · {item.ownerName}</div>
              </TableCell>
              <TableCell className="px-2 py-2 align-top text-muted-foreground" rowSpan={3}>
                <div className="truncate" title={item.customerName}>{item.customerName}</div>
                <div className="mt-1 text-caption-2xs text-muted-foreground">{item.businessType} · {item.industryLine}</div>
              </TableCell>
              <TableCell className="px-2 py-2 align-top text-muted-foreground" rowSpan={3}>{item.wbsCode ?? '-'}</TableCell>
              <TableCell className="px-2 py-2 align-top text-muted-foreground" rowSpan={3}>{formatDate(item.contractStartDate)} - {formatDate(item.contractEndDate)}</TableCell>
            </>
          ) : null}
          <TableCell className="px-2 py-2 text-center font-medium text-muted-foreground">{row.label}</TableCell>
          {row.values.map((valueSet, monthIndex) => (
            <AmountCells key={`${row.key}-${monthIndex}`} values={valueSet} isDelta={row.key === 'delta'} />
          ))}
          <AmountCells values={row.total} isDelta={row.key === 'delta'} isTotal />
        </TableRow>
      ))}
    </>
  );
}

function toPlanValues(month: CrmContractPerformanceMonth) {
  return [month.planRevenueAmount, month.planExternalCostAmount, month.planMarginAmount];
}

function toActualValues(month: CrmContractPerformanceMonth) {
  return [month.actualRevenueAmount, month.actualExternalCostAmount, month.actualMarginAmount];
}

function toDeltaValues(month: CrmContractPerformanceMonth) {
  return [month.revenueDelta, month.externalCostDelta, month.marginDelta];
}

function AmountCells({ values, isDelta, isTotal = false }: { values: number[]; isDelta: boolean; isTotal?: boolean }) {
  return (
    <>
      {values.map((value, index) => {
        const tone = isDelta && value < 0 ? 'text-ssoo-danger' : isDelta && value > 0 ? 'text-ssoo-info' : 'text-muted-foreground';
        const weight = isTotal ? 'font-semibold' : 'font-normal';
        return (
          <TableCell key={index} className={`px-2 py-2 text-right ${tone} ${weight}`}>
            {formatTableAmount(value)}
          </TableCell>
        );
      })}
    </>
  );
}

export function normalizeContractPerformanceQuery(path: string): ContractPerformanceWorkspaceQuery {
  const [, queryString = ''] = path.split('?');
  const searchParams = new URLSearchParams(queryString);
  const year = Number(searchParams.get('year') ?? new Date().getFullYear());
  const region = searchParams.get('region') as CrmContractPerformanceRegion | null;
  return {
    year: Number.isFinite(year) && year >= 2000 ? Math.trunc(year) : new Date().getFullYear(),
    businessType: (searchParams.get('businessType') ?? '').trim(),
    industryLine: (searchParams.get('industryLine') ?? '').trim(),
    region: region && ['all', 'domestic', 'overseas'].includes(region) ? region : 'all',
    search: (searchParams.get('search') ?? '').trim(),
  };
}

export function toRequiredPerformanceQuery(query: ContractPerformanceWorkspaceQuery): Required<CrmContractPerformanceQuery> {
  return {
    year: query.year,
    businessType: query.businessType,
    industryLine: query.industryLine,
    region: query.region,
    search: query.search,
  };
}

export function normalizeContractPerformanceQueryRecord(
  query: Record<string, string | string[] | undefined> = {},
): ContractPerformanceWorkspaceQuery {
  const value = (key: string) => {
    const raw = query[key];
    return Array.isArray(raw) ? raw[0] ?? '' : raw ?? '';
  };
  const year = Number(value('year') || new Date().getFullYear());
  const region = value('region') as CrmContractPerformanceRegion;
  return {
    year: Number.isFinite(year) && year >= 2000 ? Math.trunc(year) : new Date().getFullYear(),
    businessType: value('businessType').trim(),
    industryLine: value('industryLine').trim(),
    region: ['all', 'domestic', 'overseas'].includes(region) ? region : 'all',
    search: value('search').trim(),
  };
}
