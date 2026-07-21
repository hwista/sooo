'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  FileCheck2,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Trash2,
  UnlockKeyhole,
  X,
} from 'lucide-react';
import Link from 'next/link';
import type {
  CrmOpportunity,
  CrmOpportunityAccessSnapshot,
  CrmOpportunityContractConversionResponse,
  CrmDashboardResponse,
  CrmOpportunityDiscountType,
  CrmOpportunityGlobalAccessSnapshot,
  CrmOpportunityHistoryListResponse,
  CrmOpportunityLineCategory,
  CrmOpportunityLine,
  CrmOpportunityListResponse,
  CrmOpportunityOwnerLookupItem,
  CrmOpportunityPriority,
  CrmOpportunityQuotePreview,
  CrmOpportunityServiceType,
  CrmOpportunitySort,
  CrmOpportunityStatus,
  CrmQuotePreviewLine,
  CrmQuoteDmsDocumentDraft,
  CrmQuoteDmsDocumentLifecycleExecutionResult,
  CrmQuoteDmsDocumentPreview,
  CrmQuotePreviewOwnerContactStatus,
  CrmQuotePreviewSellerInfoStatus,
  CrmQuoteWorkflowStatus,
  CrmQuoteWorkflowUpdateRequest,
  CrmOpportunityUpsertLine,
  CrmOpportunityUpsertRequest,
  CrmOpportunityVersionListResponse,
} from '@ssoo/types/crm';
import { useAuthStore } from '@/stores/auth.store';
import { Button, Checkbox, Input, NativeSelect, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@ssoo/web-ui';

export interface OpportunityWorkspaceQuery {
  search: string;
  status: CrmOpportunityStatus | 'all';
  sort: CrmOpportunitySort;
  selected: string;
}

const statusLabels: Record<CrmOpportunityStatus, string> = {
  draft: '초안',
  qualified: '검증',
  proposal: '제안',
  won: '수주',
  lost: '실주',
  hold: '보류',
};

const statusTone: Record<CrmOpportunityStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  qualified: 'bg-ssoo-info-bg text-ssoo-info',
  proposal: 'bg-ssoo-accent-bg text-ssoo-accent',
  won: 'bg-ssoo-success-bg text-ssoo-success',
  lost: 'bg-ssoo-danger-bg text-ssoo-danger',
  hold: 'bg-ssoo-warning-bg text-ssoo-warning',
};

const priorityLabels: Record<CrmOpportunity['priority'], string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

const regionLabels: Record<CrmOpportunity['region'], string> = {
  domestic: '국내',
  overseas: '해외',
};

const paymentTermLabels: Record<string, string> = {
  계약즉시: '계약 즉시',
  NET30: '계약 후 30일 이내',
  NET60: '계약 후 60일 이내',
  분할납부: '분할 납부 (협의)',
  납품후: '납품 완료 후 30일',
};

const discountTypeLabels: Record<CrmOpportunityDiscountType, string> = {
  amount: '금액',
  rate: '비율',
};

const lineCategoryLabels: Record<CrmOpportunityLineCategory, string> = {
  product: '상품',
  service: '용역',
  'internal-cost': '내부원가',
  'external-cost': '외부원가',
};

const serviceTypeLabels: Record<CrmOpportunityServiceType, string> = {
  internal: '내부',
  external: '외부',
};

const sortLabels: Record<CrmOpportunitySort, string> = {
  'updated-desc': '최근 수정순',
  'revenue-desc': '매출 높은순',
  'margin-desc': '손익률 높은순',
};

const historyEventLabels: Record<string, string> = {
  create: '생성',
  update: '변경',
  delete: '삭제',
};

const quoteWorkflowLabels: Record<CrmQuoteWorkflowStatus, string> = {
  draft: '초안',
  review: '검토중',
  approved: '승인',
  sent: '발송',
  accepted: '수락',
  rejected: '거절',
  void: '무효',
};

const quoteWorkflowOptions = Object.entries(quoteWorkflowLabels) as Array<[CrmQuoteWorkflowStatus, string]>;

const sellerInfoStatusLabels: Record<CrmQuotePreviewSellerInfoStatus, string> = {
  'not-configured': '회사 정보 미설정',
  'dms-ci-planned': 'CI DMS 연결 예정',
  configured: '설정됨',
};

const ownerContactStatusLabels: Record<CrmQuotePreviewOwnerContactStatus, string> = {
  'opportunity-owner-profile': '영업기회 담당자 프로필',
  'opportunity-owner-profile-missing': '영업기회 담당자 미확인',
  'session-user-profile': '현재 세션 공용 프로필',
  'session-user-profile-missing': '공용 프로필 미확인',
};

const formatCurrency = (value: number) => `${Math.round(value / 100000000).toLocaleString('ko-KR')}억`;
const formatWon = (value: number) => `${Math.round(value).toLocaleString('ko-KR')}원`;
const formatSellerInfoStatus = (value: CrmQuotePreviewSellerInfoStatus) => sellerInfoStatusLabels[value] ?? value;
const formatOwnerContactStatus = (value: CrmQuotePreviewOwnerContactStatus) => ownerContactStatusLabels[value] ?? value;
const OWNER_LOOKUP_EMPTY_VALUE = '__none';
const getOwnerLookupDisplayName = (item: CrmOpportunityOwnerLookupItem) => item.displayName || item.userName;
const formatOwnerLookupLabel = (item: CrmOpportunityOwnerLookupItem) => [
  getOwnerLookupDisplayName(item),
  item.loginId ? `@${item.loginId}` : null,
  item.email,
  item.primaryOrganizationName ?? item.departmentCode,
].filter(Boolean).join(' · ');
const formatDate = (value: string) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('ko-KR');
};
const formatDateTime = (value: string) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

type OpportunityEditorMode = 'create' | 'edit';
type OpportunityDraftLineKind = 'revenueLines' | 'costLines';
type OpportunityDraftLineField = keyof Omit<OpportunityDraftLine, 'id'>;
type OpportunityDraftTextField =
  | 'customerName'
  | 'opportunityName'
  | 'ownerName'
  | 'ownerUserId'
  | 'clientContactName'
  | 'businessType'
  | 'industryLine'
  | 'specialDiscountValue'
  | 'expectedStartDate'
  | 'expectedEndDate'
  | 'nextAction';
type OpportunityDraftSelectField = 'region' | 'status' | 'priority' | 'paymentTermCode' | 'specialDiscountType';

interface OpportunityDraftLine {
  id: string;
  category: CrmOpportunityLineCategory;
  label: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  marginRate: string;
  truncUnit: string;
  department: string;
  memberName: string;
  grade: string;
  serviceType: CrmOpportunityServiceType;
  revenueLinked: boolean;
  linkedCostLineId: string;
  revenueUnitPrice: string;
}

interface OpportunityDraft {
  id?: string;
  customerName: string;
  opportunityName: string;
  ownerName: string;
  ownerUserId: string;
  clientContactName: string;
  businessType: string;
  industryLine: string;
  region: CrmOpportunity['region'];
  status: CrmOpportunityStatus;
  priority: CrmOpportunityPriority;
  paymentTermCode: string;
  specialDiscountType: CrmOpportunityDiscountType;
  specialDiscountValue: string;
  expectedStartDate: string;
  expectedEndDate: string;
  nextAction: string;
  revenueLines: OpportunityDraftLine[];
  costLines: OpportunityDraftLine[];
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

function buildHref(query: OpportunityWorkspaceQuery, patch: Partial<Record<'search' | 'status' | 'sort' | 'selected', string>>) {
  const params = new URLSearchParams();
  const next = { ...query, ...patch };
  if (next.search) params.set('search', next.search);
  if (next.status && next.status !== 'all') params.set('status', next.status);
  if (next.sort && next.sort !== 'updated-desc') params.set('sort', next.sort);
  if (next.selected) params.set('selected', next.selected);
  const suffix = params.toString();
  return suffix ? `/?${suffix}` : '/';
}

function buildApiHref(query: OpportunityWorkspaceQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.status && query.status !== 'all') params.set('status', query.status);
  if (query.sort && query.sort !== 'updated-desc') params.set('sort', query.sort);
  const suffix = params.toString();
  return suffix ? `/api/crm/opportunities?${suffix}` : '/api/crm/opportunities';
}

function createDraftLine(kind: OpportunityDraftLineKind, seed?: Partial<OpportunityDraftLine>): OpportunityDraftLine {
  const fallbackCategory: CrmOpportunityLineCategory = kind === 'revenueLines' ? 'service' : 'internal-cost';
  const seedCategory = seed?.category;
  const category = kind === 'revenueLines'
    ? seedCategory === 'product' ? 'product' : 'service'
    : seedCategory === 'product' || seedCategory === 'external-cost' ? seedCategory : 'internal-cost';
  const amount = seed?.amount ?? '';
  const quantity = seed?.quantity ?? (amount ? '1' : '');
  return {
    id: seed?.id ?? `draft-line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category: category ?? fallbackCategory,
    label: seed?.label ?? '',
    quantity,
    unitPrice: seed?.unitPrice ?? amount,
    amount,
    marginRate: seed?.marginRate ?? '',
    truncUnit: seed?.truncUnit ?? '',
    department: seed?.department ?? '',
    memberName: seed?.memberName ?? '',
    grade: seed?.grade ?? '',
    serviceType: seed?.serviceType ?? (category === 'external-cost' ? 'external' : 'internal'),
    revenueLinked: seed?.revenueLinked ?? false,
    linkedCostLineId: seed?.linkedCostLineId ?? '',
    revenueUnitPrice: seed?.revenueUnitPrice ?? '',
  };
}

function createEmptyDraft(): OpportunityDraft {
  return {
    customerName: '',
    opportunityName: '',
    ownerName: '',
    ownerUserId: '',
    clientContactName: '',
    businessType: '',
    industryLine: '',
    region: 'domestic',
    status: 'draft',
    priority: 'medium',
    paymentTermCode: '',
    specialDiscountType: 'amount',
    specialDiscountValue: '',
    expectedStartDate: '',
    expectedEndDate: '',
    nextAction: '',
    revenueLines: [createDraftLine('revenueLines')],
    costLines: [createDraftLine('costLines')],
  };
}

function createDraftFromOpportunity(item: CrmOpportunity): OpportunityDraft {
  return {
    id: item.id,
    customerName: item.customerName,
    opportunityName: item.opportunityName,
    ownerName: item.ownerName,
    ownerUserId: item.ownerUserId ?? '',
    clientContactName: item.clientContactName ?? '',
    businessType: item.businessType,
    industryLine: item.industryLine,
    region: item.region,
    status: item.status,
    priority: item.priority,
    paymentTermCode: item.paymentTermCode ?? '',
    specialDiscountType: item.specialDiscountType,
    specialDiscountValue: item.specialDiscountValue > 0 ? String(item.specialDiscountValue) : '',
    expectedStartDate: item.expectedStartDate,
    expectedEndDate: item.expectedEndDate,
    nextAction: item.nextAction,
    revenueLines: item.revenueLines.length > 0
      ? item.revenueLines.map((line) => createDraftLine('revenueLines', {
        id: line.id,
        category: line.category,
        label: line.label,
        quantity: line.quantity === undefined ? undefined : String(line.quantity),
        unitPrice: line.unitPrice === undefined ? undefined : String(line.unitPrice),
        amount: String(line.amount),
        marginRate: line.marginRate === undefined ? undefined : String(line.marginRate),
        truncUnit: line.truncUnit === undefined ? undefined : String(line.truncUnit),
        department: line.department,
        memberName: line.memberName,
        grade: line.grade,
        serviceType: line.serviceType,
        revenueLinked: line.revenueLinked,
        linkedCostLineId: line.linkedCostLineId,
        revenueUnitPrice: line.revenueUnitPrice === undefined ? undefined : String(line.revenueUnitPrice),
      }))
      : [createDraftLine('revenueLines')],
    costLines: item.costLines.length > 0
      ? item.costLines.map((line) => createDraftLine('costLines', {
        id: line.id,
        category: line.category,
        label: line.label,
        quantity: line.quantity === undefined ? undefined : String(line.quantity),
        unitPrice: line.unitPrice === undefined ? undefined : String(line.unitPrice),
        amount: String(line.amount),
        marginRate: line.marginRate === undefined ? undefined : String(line.marginRate),
        truncUnit: line.truncUnit === undefined ? undefined : String(line.truncUnit),
        department: line.department,
        memberName: line.memberName,
        grade: line.grade,
        serviceType: line.serviceType,
        revenueLinked: line.revenueLinked,
        linkedCostLineId: line.linkedCostLineId,
        revenueUnitPrice: line.revenueUnitPrice === undefined ? undefined : String(line.revenueUnitPrice),
      }))
      : [createDraftLine('costLines')],
  };
}

function parseDraftNumber(value: string): number {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) {
    return 0;
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function parseDraftAmount(value: string): number {
  return Math.round(parseDraftNumber(value));
}

function getDraftLineAmount(line: OpportunityDraftLine): number {
  const quantity = parseDraftNumber(line.quantity);
  const unitPrice = parseDraftAmount(line.unitPrice);
  if (quantity > 0 && unitPrice > 0) {
    const rawAmount = Math.round(quantity * unitPrice);
    const truncUnit = parseDraftAmount(line.truncUnit);
    return truncUnit > 0 ? Math.floor(rawAmount / truncUnit) * truncUnit : rawAmount;
  }

  return parseDraftAmount(line.amount);
}

function sumDraftLines(lines: OpportunityDraftLine[]): number {
  return lines.reduce((sum, line) => sum + getDraftLineAmount(line), 0);
}

function getMarginRate(costUnitPrice: string, revenueUnitPrice: string): string {
  const cost = parseDraftAmount(costUnitPrice);
  const revenue = parseDraftAmount(revenueUnitPrice);
  if (cost <= 0 || revenue <= 0) {
    return '';
  }

  return String(Math.round((1 - cost / revenue) * 10000) / 100);
}

function getLinkedRevenueCategory(category: CrmOpportunityLineCategory): CrmOpportunityLineCategory {
  return category === 'product' ? 'product' : 'service';
}

function createLinkedRevenueLine(costLine: OpportunityDraftLine): OpportunityDraftLine {
  const revenueUnitPrice = costLine.revenueUnitPrice || costLine.unitPrice;
  return createDraftLine('revenueLines', {
    id: costLine.linkedCostLineId
      ? `linked-revenue-${costLine.linkedCostLineId}`
      : `linked-revenue-${costLine.id}`,
    category: getLinkedRevenueCategory(costLine.category),
    label: costLine.label,
    quantity: costLine.quantity,
    unitPrice: revenueUnitPrice,
    amount: '',
    marginRate: getMarginRate(costLine.unitPrice, revenueUnitPrice),
    truncUnit: costLine.truncUnit,
    department: costLine.department,
    memberName: costLine.memberName,
    grade: costLine.grade,
    serviceType: costLine.category === 'external-cost' ? 'external' : 'internal',
    revenueLinked: true,
    linkedCostLineId: costLine.id,
  });
}

function syncLinkedRevenueLines(draft: OpportunityDraft): OpportunityDraft {
  const linkedCostLines = draft.costLines.filter((line) => line.revenueLinked);
  const linkedCostIds = new Set(linkedCostLines.map((line) => line.id));
  const manualRevenueLines = draft.revenueLines.filter((line) => (
    !line.linkedCostLineId || linkedCostIds.has(line.linkedCostLineId)
  ));
  const syncedLines = linkedCostLines.map((costLine) => {
    const existing = manualRevenueLines.find((line) => line.linkedCostLineId === costLine.id);
    return {
      ...createLinkedRevenueLine(costLine),
      id: existing?.id ?? `linked-revenue-${costLine.id}`,
    };
  });
  const nextRevenueLines = [
    ...manualRevenueLines.filter((line) => !line.linkedCostLineId),
    ...syncedLines,
  ];

  return {
    ...draft,
    revenueLines: nextRevenueLines.length > 0 ? nextRevenueLines : [createDraftLine('revenueLines')],
  };
}

function getDraftDiscountAmount(revenueSubtotal: number, discountType: CrmOpportunityDiscountType, discountValue: string): number {
  const value = parseDraftNumber(discountValue);
  if (revenueSubtotal <= 0 || value <= 0) {
    return 0;
  }

  const discountAmount = discountType === 'rate'
    ? Math.round(revenueSubtotal * value / 100)
    : parseDraftAmount(discountValue);
  return Math.min(revenueSubtotal, Math.max(0, discountAmount));
}

function formatPaymentTerm(value?: string) {
  if (!value) {
    return '-';
  }

  return paymentTermLabels[value] ?? value;
}

function formatDiscount(item: Pick<CrmOpportunity, 'specialDiscountType' | 'specialDiscountValue' | 'specialDiscountAmount'>) {
  if (item.specialDiscountAmount <= 0) {
    return '0원';
  }

  const suffix = item.specialDiscountType === 'rate' ? ` (${item.specialDiscountValue}%)` : '';
  return `-${formatWon(item.specialDiscountAmount)}${suffix}`;
}

function toUpsertPayload(draft: OpportunityDraft): CrmOpportunityUpsertRequest {
  const normalizeLines = (lines: OpportunityDraftLine[], kind: OpportunityDraftLineKind): CrmOpportunityUpsertLine[] => lines
    .filter((line) => line.label.trim() || getDraftLineAmount(line) > 0)
    .map((line) => ({
      id: line.id,
      category: line.category,
      label: line.label.trim(),
      quantity: parseDraftNumber(line.quantity) || undefined,
      unitPrice: parseDraftAmount(line.unitPrice) || undefined,
      amount: getDraftLineAmount(line),
      marginRate: line.marginRate ? Number(line.marginRate) : undefined,
      truncUnit: parseDraftAmount(line.truncUnit) || undefined,
      department: line.department.trim() || undefined,
      memberName: line.memberName.trim() || undefined,
      grade: line.grade.trim() || undefined,
      serviceType: line.category === 'product' ? undefined : line.serviceType,
      revenueLinked: line.revenueLinked || undefined,
      linkedCostLineId: kind === 'revenueLines' ? line.linkedCostLineId.trim() || undefined : undefined,
      revenueUnitPrice: kind === 'costLines' && line.revenueLinked
        ? parseDraftAmount(line.revenueUnitPrice) || undefined
        : undefined,
    }));

  return {
    customerName: draft.customerName.trim(),
    opportunityName: draft.opportunityName.trim(),
    ownerName: draft.ownerName.trim(),
    ownerUserId: draft.ownerUserId.trim() || undefined,
    clientContactName: draft.clientContactName.trim() || undefined,
    businessType: draft.businessType.trim(),
    industryLine: draft.industryLine.trim(),
    region: draft.region,
    status: draft.status,
    priority: draft.priority,
    paymentTermCode: draft.paymentTermCode || undefined,
    specialDiscountType: draft.specialDiscountType,
    specialDiscountValue: parseDraftNumber(draft.specialDiscountValue) || undefined,
    expectedStartDate: draft.expectedStartDate || undefined,
    expectedEndDate: draft.expectedEndDate || undefined,
    nextAction: draft.nextAction.trim(),
    revenueLines: normalizeLines(draft.revenueLines, 'revenueLines'),
    costLines: normalizeLines(draft.costLines, 'costLines'),
  };
}

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null): string {
  if (!responseBody || responseBody.success === true) {
    return 'CRM 영업기회 저장 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || 'CRM 영업기회 저장 중 오류가 발생했습니다.';
}

export function OpportunityWorkspaceClient({
  data,
  dashboard,
  query,
}: {
  data: CrmOpportunityListResponse;
  dashboard: CrmDashboardResponse;
  query: OpportunityWorkspaceQuery;
}) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [currentData, setCurrentData] = useState(data);
  const [dashboardData, setDashboardData] = useState(dashboard);
  const [isDashboardLoading, setIsDashboardLoading] = useState(!dashboard.generatedAt);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [isReloading, setIsReloading] = useState(data.items.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editorMode, setEditorMode] = useState<OpportunityEditorMode | null>(null);
  const [draft, setDraft] = useState<OpportunityDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isWorkflowSaving, setIsWorkflowSaving] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<CrmOpportunity | null>(null);
  const [selectedDetailError, setSelectedDetailError] = useState<string | null>(null);
  const [versionData, setVersionData] = useState<CrmOpportunityVersionListResponse | null>(null);
  const [isVersionLoading, setIsVersionLoading] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<CrmOpportunityHistoryListResponse | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [quotePreview, setQuotePreview] = useState<CrmOpportunityQuotePreview | null>(null);
  const [isQuotePreviewLoading, setIsQuotePreviewLoading] = useState(false);
  const [quotePreviewError, setQuotePreviewError] = useState<string | null>(null);
  const [isQuoteWorkflowSaving, setIsQuoteWorkflowSaving] = useState(false);
  const [isQuoteDmsDraftSaving, setIsQuoteDmsDraftSaving] = useState(false);
  const [isQuoteDmsLifecycleExecuting, setIsQuoteDmsLifecycleExecuting] = useState(false);
  const [globalAccess, setGlobalAccess] = useState<CrmOpportunityGlobalAccessSnapshot | null>(null);
  const [opportunityAccess, setOpportunityAccess] = useState<CrmOpportunityAccessSnapshot | null>(null);
  const [isGlobalAccessLoading, setIsGlobalAccessLoading] = useState(false);
  const [isAccessLoading, setIsAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [ownerLookupItems, setOwnerLookupItems] = useState<CrmOpportunityOwnerLookupItem[]>([]);
  const [ownerLookupSearch, setOwnerLookupSearch] = useState('');
  const [isOwnerLookupLoading, setIsOwnerLookupLoading] = useState(false);
  const [ownerLookupError, setOwnerLookupError] = useState<string | null>(null);
  const { search, sort, status } = query;
  const router = useRouter();
  const apiHref = useMemo(
    () => buildApiHref({ search, sort, status, selected: '' }),
    [search, sort, status],
  );

  useEffect(() => {
    setCurrentData(data);
    if (data.items.length > 0) {
      setIsReloading(false);
    }
  }, [data]);

  useEffect(() => {
    setDashboardData(dashboard);
    setIsDashboardLoading(!dashboard.generatedAt);
  }, [dashboard]);

  const loadDashboard = useCallback(async (signal?: AbortSignal) => {
    if (!accessToken) {
      return null;
    }

    setIsDashboardLoading(true);
    setDashboardError(null);
    try {
      const response = await fetch('/api/crm/dashboard', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmDashboardResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setDashboardData(payload.data);
      return payload.data;
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }
      setDashboardError(error instanceof Error ? error.message : 'CRM 홈 요약 조회에 실패했습니다.');
      return null;
    } finally {
      if (!signal?.aborted) {
        setIsDashboardLoading(false);
      }
    }
  }, [accessToken]);

  const loadOpportunities = useCallback(async (signal?: AbortSignal) => {
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
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunityListResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setCurrentData(payload.data);
      return payload.data;
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }
      setLoadError(error instanceof Error ? error.message : 'CRM 영업기회 조회에 실패했습니다.');
      return null;
    } finally {
      if (!signal?.aborted) {
        setIsReloading(false);
      }
    }
  }, [accessToken, apiHref]);

  useEffect(() => {
    if (!accessToken) {
      setDashboardError(null);
      setIsDashboardLoading(false);
      return undefined;
    }

    const abortController = new AbortController();
    void loadDashboard(abortController.signal);
    return () => abortController.abort();
  }, [accessToken, loadDashboard]);

  const loadOwnerLookup = useCallback(async (searchText: string, signal?: AbortSignal) => {
    if (!accessToken) {
      return;
    }

    const params = new URLSearchParams({ limit: '50' });
    const normalizedSearch = searchText.trim();
    if (normalizedSearch) {
      params.set('search', normalizedSearch);
    }

    setIsOwnerLookupLoading(true);
    setOwnerLookupError(null);
    try {
      const response = await fetch(`/api/crm/opportunities/owners/lookup?${params.toString()}`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunityOwnerLookupItem[]> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.success === false
          ? payload.error?.message || payload.message || 'CRM 담당자 후보 조회에 실패했습니다.'
          : 'CRM 담당자 후보 조회에 실패했습니다.');
      }
      setOwnerLookupItems(payload.data);
    } catch (error) {
      if (signal?.aborted) {
        return;
      }
      setOwnerLookupError(error instanceof Error ? error.message : 'CRM 담당자 후보 조회에 실패했습니다.');
    } finally {
      if (!signal?.aborted) {
        setIsOwnerLookupLoading(false);
      }
    }
  }, [accessToken]);

  useEffect(() => {
    const abortController = new AbortController();
    void loadOpportunities(abortController.signal);
    return () => abortController.abort();
  }, [loadOpportunities]);

  useEffect(() => {
    if (!accessToken) {
      setGlobalAccess(null);
      setAccessError(null);
      setIsGlobalAccessLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsGlobalAccessLoading(true);
    setAccessError(null);
    void (async () => {
      try {
        const response = await fetch('/api/crm/opportunities/access', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: abortController.signal,
        });
        const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunityGlobalAccessSnapshot> | BackendErrorResponse | null;
        if (!response.ok || payload?.success !== true) {
          throw new Error(getBackendErrorMessage(payload));
        }
        setGlobalAccess(payload.data);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }
        setGlobalAccess(null);
        setAccessError(error instanceof Error ? error.message : 'CRM 영업기회 권한 조회에 실패했습니다.');
      } finally {
        if (!abortController.signal.aborted) {
          setIsGlobalAccessLoading(false);
        }
      }
    })();

    return () => abortController.abort();
  }, [accessToken]);

  const selectedFromList = query.selected
    ? currentData.items.find((item) => item.id === query.selected) ?? null
    : currentData.items[0] ?? null;
  const selected = selectedFromList ?? (query.selected && selectedDetail?.id === query.selected ? selectedDetail : null);
  const totalPages = Math.max(1, Math.ceil(currentData.items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedItems = useMemo(
    () => currentData.items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [currentData.items, pageSize, safePage]
  );
  const isInitialLedgerLoading = isReloading && currentData.items.length === 0 && !loadError;

  useEffect(() => {
    if (!query.selected || selectedFromList || !accessToken) {
      setSelectedDetail(null);
      setSelectedDetailError(null);
      return;
    }

    const abortController = new AbortController();
    setSelectedDetail(null);
    setSelectedDetailError(null);
    void (async () => {
      try {
        const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(query.selected)}`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: abortController.signal,
        });
        const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunity> | BackendErrorResponse | null;
        if (!response.ok || payload?.success !== true) {
          throw new Error(getBackendErrorMessage(payload));
        }
        setSelectedDetail(payload.data);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }
        setSelectedDetailError(error instanceof Error ? error.message : 'CRM 영업기회 상세 조회에 실패했습니다.');
      }
    })();

    return () => abortController.abort();
  }, [accessToken, query.selected, selectedFromList]);

  useEffect(() => {
    if (!selected || !accessToken) {
      setOpportunityAccess(null);
      setAccessError(null);
      setIsAccessLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsAccessLoading(true);
    setAccessError(null);
    void (async () => {
      try {
        const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(selected.id)}/access`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: abortController.signal,
        });
        const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunityAccessSnapshot> | BackendErrorResponse | null;
        if (!response.ok || payload?.success !== true) {
          throw new Error(getBackendErrorMessage(payload));
        }
        setOpportunityAccess(payload.data);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }
        setOpportunityAccess(null);
        setAccessError(error instanceof Error ? error.message : 'CRM 영업기회 권한 조회에 실패했습니다.');
      } finally {
        if (!abortController.signal.aborted) {
          setIsAccessLoading(false);
        }
      }
    })();

    return () => abortController.abort();
  }, [accessToken, selected]);

  useEffect(() => {
    if (!selected || !accessToken) {
      setVersionData(null);
      setVersionError(null);
      setIsVersionLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsVersionLoading(true);
    setVersionError(null);
    void (async () => {
      try {
        const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(selected.id)}/versions`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: abortController.signal,
        });
        const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunityVersionListResponse> | BackendErrorResponse | null;
        if (!response.ok || payload?.success !== true) {
          throw new Error(getBackendErrorMessage(payload));
        }
        setVersionData(payload.data);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }
        setVersionError(error instanceof Error ? error.message : 'CRM 영업기회 차수 조회에 실패했습니다.');
      } finally {
        if (!abortController.signal.aborted) {
          setIsVersionLoading(false);
        }
      }
    })();

    return () => abortController.abort();
  }, [accessToken, selected]);

  useEffect(() => {
    if (!selected || !accessToken) {
      setHistoryData(null);
      setHistoryError(null);
      setIsHistoryLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsHistoryLoading(true);
    setHistoryError(null);
    void (async () => {
      try {
        const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(selected.id)}/history`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: abortController.signal,
        });
        const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunityHistoryListResponse> | BackendErrorResponse | null;
        if (!response.ok || payload?.success !== true) {
          throw new Error(getBackendErrorMessage(payload));
        }
        setHistoryData(payload.data);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }
        setHistoryError(error instanceof Error ? error.message : 'CRM 영업기회 변경 이력 조회에 실패했습니다.');
      } finally {
        if (!abortController.signal.aborted) {
          setIsHistoryLoading(false);
        }
      }
    })();

    return () => abortController.abort();
  }, [accessToken, selected]);

  useEffect(() => {
    if (!selected || !accessToken) {
      setQuotePreview(null);
      setQuotePreviewError(null);
      setIsQuotePreviewLoading(false);
      return;
    }

    const abortController = new AbortController();
    setQuotePreview(null);
    setIsQuotePreviewLoading(true);
    setQuotePreviewError(null);
    void (async () => {
      try {
        const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(selected.id)}/quote-preview`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: abortController.signal,
        });
        const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunityQuotePreview> | BackendErrorResponse | null;
        if (!response.ok || payload?.success !== true) {
          throw new Error(getBackendErrorMessage(payload));
        }
        setQuotePreview(payload.data);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }
        setQuotePreview(null);
        setQuotePreviewError(error instanceof Error ? error.message : 'CRM 견적 후보 조회에 실패했습니다.');
      } finally {
        if (!abortController.signal.aborted) {
          setIsQuotePreviewLoading(false);
        }
      }
    })();

    return () => abortController.abort();
  }, [accessToken, selected]);

  const openCreateEditor = () => {
    if (!globalAccess?.features.canCreateOpportunity) {
      setWorkflowError('CRM 영업기회 등록 권한이 없습니다.');
      return;
    }
    setDraft(createEmptyDraft());
    setEditorMode('create');
    setSaveError(null);
    setWorkflowError(null);
    setVersionError(null);
    setHistoryError(null);
    setOwnerLookupSearch('');
    setOwnerLookupItems([]);
    setOwnerLookupError(null);
    void loadOwnerLookup('');
  };
  const openEditEditor = (item: CrmOpportunity) => {
    if (opportunityAccess?.opportunityId !== item.id || !opportunityAccess.features.canEditOpportunity) {
      setWorkflowError('CRM 영업기회 수정 권한이 없습니다.');
      return;
    }
    setDraft(createDraftFromOpportunity(item));
    setEditorMode('edit');
    setSaveError(null);
    setWorkflowError(null);
    setVersionError(null);
    setHistoryError(null);
    setOwnerLookupSearch(item.ownerName);
    setOwnerLookupItems(item.ownerUserId ? [{
      userId: item.ownerUserId,
      userName: item.ownerName,
      displayName: item.ownerName,
    }] : []);
    setOwnerLookupError(null);
    void loadOwnerLookup(item.ownerName);
  };
  const closeEditor = () => {
    setDraft(null);
    setEditorMode(null);
    setSaveError(null);
    setOwnerLookupSearch('');
    setOwnerLookupItems([]);
    setOwnerLookupError(null);
  };
  const updateDraftTextField = (field: OpportunityDraftTextField, value: string) => {
    setDraft((current) => current ? { ...current, [field]: value } : current);
  };
  const updateDraftSelectField = (field: OpportunityDraftSelectField, value: string) => {
    setDraft((current) => current ? { ...current, [field]: value } as OpportunityDraft : current);
  };
  const updateDraftOwnerUserId = (ownerUserId: string) => {
    const selectedOwner = ownerLookupItems.find((item) => item.userId === ownerUserId);
    setDraft((current) => current ? {
      ...current,
      ownerUserId,
      ownerName: selectedOwner ? getOwnerLookupDisplayName(selectedOwner) : current.ownerName,
    } : current);
  };
  const updateDraftLine = (
    kind: OpportunityDraftLineKind,
    index: number,
    patch: Partial<Pick<OpportunityDraftLine, OpportunityDraftLineField>>,
  ) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const nextDraft = {
        ...current,
        [kind]: current[kind].map((line, lineIndex) => {
          if (lineIndex !== index) {
            return line;
          }

          const nextLine = { ...line, ...patch };
          if (kind === 'costLines' && patch.revenueLinked === true && !nextLine.revenueUnitPrice) {
            nextLine.revenueUnitPrice = nextLine.unitPrice;
          }
          if (kind === 'costLines' && patch.revenueLinked === false) {
            nextLine.revenueUnitPrice = '';
          }
          return nextLine;
        }),
      };
      return kind === 'costLines' ? syncLinkedRevenueLines(nextDraft) : nextDraft;
    });
  };
  const addDraftLine = (kind: OpportunityDraftLineKind, category?: CrmOpportunityLineCategory) => {
    setDraft((current) => current ? { ...current, [kind]: [...current[kind], createDraftLine(kind, { category })] } : current);
  };
  const removeDraftLine = (kind: OpportunityDraftLineKind, index: number) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const nextDraft = {
        ...current,
        [kind]: current[kind].filter((_, lineIndex) => lineIndex !== index),
      };
      const syncedDraft = kind === 'costLines' ? syncLinkedRevenueLines(nextDraft) : nextDraft;
      const nextLines = syncedDraft[kind];
      return {
        ...syncedDraft,
        [kind]: nextLines.length > 0 ? nextLines : [createDraftLine(kind)],
      };
    });
  };
  const saveDraft = async () => {
    if (!draft || !editorMode) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const targetPath = editorMode === 'edit' && draft.id
        ? `/api/crm/opportunities/${encodeURIComponent(draft.id)}`
        : '/api/crm/opportunities';
      const response = await fetch(targetPath, {
        method: editorMode === 'edit' ? 'PUT' : 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(toUpsertPayload(draft)),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunity> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }

      closeEditor();
      await loadOpportunities();
      void loadDashboard();
      router.push(buildHref(query, { selected: payload.data.id }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'CRM 영업기회 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };
  const runWorkflowAction = async (item: CrmOpportunity, action: 'confirm' | 'reopen') => {
    setIsWorkflowSaving(true);
    setWorkflowError(null);
    try {
      const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(item.id)}/${action}`, {
        method: 'POST',
        cache: 'no-store',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunity> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }

      const refreshed = await loadOpportunities();
      void loadDashboard();
      const selectedId = refreshed?.items.some((candidate) => candidate.id === payload.data.id)
        ? payload.data.id
        : item.id;
      router.push(buildHref(query, { selected: selectedId }));
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : 'CRM 영업기회 상태 변경 중 오류가 발생했습니다.');
    } finally {
      setIsWorkflowSaving(false);
    }
  };
  const addVersion = async (item: CrmOpportunity) => {
    setIsWorkflowSaving(true);
    setWorkflowError(null);
    try {
      const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(item.id)}/versions`, {
        method: 'POST',
        cache: 'no-store',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunity> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }

      await loadOpportunities();
      void loadDashboard();
      setSelectedDetail(payload.data);
      router.push(buildHref(query, { selected: payload.data.id }));
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : 'CRM 영업기회 차수 추가 중 오류가 발생했습니다.');
    } finally {
      setIsWorkflowSaving(false);
    }
  };
  const convertToContract = async (item: CrmOpportunity) => {
    setIsWorkflowSaving(true);
    setWorkflowError(null);
    try {
      const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(item.id)}/convert-contract`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunityContractConversionResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }

      await loadOpportunities();
      void loadDashboard();
      setSelectedDetail(payload.data.opportunity);
      router.push(buildHref(query, { selected: payload.data.opportunity.id }));
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : 'CRM 영업기회 계약 전환 중 오류가 발생했습니다.');
    } finally {
      setIsWorkflowSaving(false);
    }
  };
  const saveQuoteWorkflow = async (item: CrmOpportunity, request: CrmQuoteWorkflowUpdateRequest) => {
    setIsQuoteWorkflowSaving(true);
    setQuotePreviewError(null);
    try {
      const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(item.id)}/quote-workflow`, {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(request),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunityQuotePreview> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }

      setQuotePreview(payload.data);
      await loadOpportunities();
      void loadDashboard();
    } catch (error) {
      setQuotePreviewError(error instanceof Error ? error.message : 'CRM 견적 상태 저장 중 오류가 발생했습니다.');
    } finally {
      setIsQuoteWorkflowSaving(false);
    }
  };

  const createQuoteDmsDraft = async (item: CrmOpportunity) => {
    setIsQuoteDmsDraftSaving(true);
    setQuotePreviewError(null);
    try {
      const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(item.id)}/quote-dms-document-draft`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ memo: 'CRM 견적 후보 기반 DMS markdown 초안 저장' }),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmQuoteDmsDocumentDraft> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }

      setQuotePreview((current) => {
        if (!current || current.workflow.sourceOpportunityId !== item.id) {
          return current;
        }
        return {
          ...current,
          dmsDocument: payload.data.preview,
        };
      });
      await loadOpportunities();
      void loadDashboard();
    } catch (error) {
      setQuotePreviewError(error instanceof Error ? error.message : 'CRM 견적 DMS 초안 저장 중 오류가 발생했습니다.');
    } finally {
      setIsQuoteDmsDraftSaving(false);
    }
  };

  const executeQuoteDmsLifecycle = async (item: CrmOpportunity) => {
    setIsQuoteDmsLifecycleExecuting(true);
    setQuotePreviewError(null);
    try {
      const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(item.id)}/quote-dms-document-lifecycle-execution`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ memo: 'CRM 견적 handoff 기반 DMS artifact 실행' }),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmQuoteDmsDocumentLifecycleExecutionResult> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }

      setQuotePreview((current) => {
        if (!current || current.workflow.sourceOpportunityId !== item.id) {
          return current;
        }
        return {
          ...current,
          dmsDocument: payload.data.preview,
        };
      });
      await loadOpportunities();
      void loadDashboard();
    } catch (error) {
      setQuotePreviewError(error instanceof Error ? error.message : 'CRM 견적 DMS 산출 실행 중 오류가 발생했습니다.');
    } finally {
      setIsQuoteDmsLifecycleExecuting(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <Breadcrumb items={['CRM', '영업기회 목록']} />
      {loadError ? (
        <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{loadError}</div>
      ) : null}
      {workflowError ? (
        <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{workflowError}</div>
      ) : null}
      {selectedDetailError ? (
        <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{selectedDetailError}</div>
      ) : null}
      {versionError ? (
        <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{versionError}</div>
      ) : null}
      {historyError ? (
        <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{historyError}</div>
      ) : null}
      {quotePreviewError ? (
        <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{quotePreviewError}</div>
      ) : null}
      {accessError ? (
        <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{accessError}</div>
      ) : null}
      {isReloading ? (
        <div className="rounded-md border border-ssoo-info-border bg-ssoo-info-bg px-3 py-2 text-sm text-ssoo-info">인증된 CRM 원장 데이터를 조회하는 중입니다.</div>
      ) : null}
      {dashboardError ? (
        <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{dashboardError}</div>
      ) : null}
      <DashboardOverview
        data={dashboardData}
        isLoading={isDashboardLoading}
        onRefresh={() => void loadDashboard()}
      />
      <PageHeader
        query={query}
        isOpen={filtersOpen}
        canCreate={globalAccess?.features.canCreateOpportunity === true}
        isAccessLoading={isGlobalAccessLoading}
        onOpenChange={setFiltersOpen}
        onCreate={openCreateEditor}
      />

      <section className="flex-1 min-h-0 bg-card border border-border rounded-lg overflow-hidden">
        <div className="grid h-full min-h-[560px] grid-rows-[1fr_52px] xl:grid-cols-[1fr_420px] xl:grid-rows-[1fr_52px]">
          <div className="min-w-0 overflow-hidden border-b border-ssoo-content-border xl:border-b-0 xl:border-r">
            <OpportunityTable
              items={pagedItems}
              pageSize={pageSize}
              selectedId={selected?.id ?? null}
              query={query}
              isLoading={isInitialLedgerLoading}
            />
          </div>
          {editorMode && draft ? (
            <OpportunityEditor
              mode={editorMode}
              draft={draft}
              saveError={saveError}
              isSaving={isSaving}
              ownerLookupItems={ownerLookupItems}
              ownerLookupSearch={ownerLookupSearch}
              ownerLookupError={ownerLookupError}
              isOwnerLookupLoading={isOwnerLookupLoading}
              onCancel={closeEditor}
              onSave={saveDraft}
              onTextFieldChange={updateDraftTextField}
              onSelectFieldChange={updateDraftSelectField}
              onOwnerUserIdChange={updateDraftOwnerUserId}
              onOwnerLookupSearchChange={setOwnerLookupSearch}
              onOwnerLookupReload={() => void loadOwnerLookup(ownerLookupSearch)}
              onLineChange={updateDraftLine}
              onAddLine={addDraftLine}
              onRemoveLine={removeDraftLine}
            />
          ) : (
            <OpportunityDetail
              item={selected}
              query={query}
              versionData={versionData}
              isVersionLoading={isVersionLoading}
              historyData={historyData}
              isHistoryLoading={isHistoryLoading}
              quotePreview={quotePreview}
              isQuotePreviewLoading={isQuotePreviewLoading}
              opportunityAccess={opportunityAccess}
              isAccessLoading={isAccessLoading}
              isWorkflowSaving={isWorkflowSaving}
              isQuoteWorkflowSaving={isQuoteWorkflowSaving}
              isQuoteDmsDraftSaving={isQuoteDmsDraftSaving}
              isQuoteDmsLifecycleExecuting={isQuoteDmsLifecycleExecuting}
              onEdit={openEditEditor}
              onConfirm={(item) => runWorkflowAction(item, 'confirm')}
              onReopen={(item) => runWorkflowAction(item, 'reopen')}
              onConvertToContract={convertToContract}
              onAddVersion={addVersion}
              onSaveQuoteWorkflow={saveQuoteWorkflow}
              onCreateQuoteDmsDraft={createQuoteDmsDraft}
              onExecuteQuoteDmsLifecycle={executeQuoteDmsLifecycle}
            />
          )}
          <TableFooter
            page={safePage}
            pageSize={pageSize}
            total={currentData.summary.filteredCount}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        </div>
      </section>
    </div>
  );
}

function Breadcrumb({ items }: { items: string[] }) {
  return (
    <nav className="flex items-center gap-2 text-xs text-muted-foreground">
      {items.map((item, index) => (
        <span key={item} className={index === items.length - 1 ? 'font-semibold text-ssoo-primary' : ''}>
          {item}{index < items.length - 1 ? <span className="mx-2 text-muted-foreground">/</span> : null}
        </span>
      ))}
    </nav>
  );
}

function DashboardOverview({
  data,
  isLoading,
  onRefresh,
}: {
  data: CrmDashboardResponse;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const activePipeline = data.pipeline.filter((stage) => stage.status !== 'lost' && stage.status !== 'hold');
  const topActions = data.nextActions.slice(0, 4);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-3 border-b border-border bg-muted px-4 py-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">영업관리 홈</h2>
          <p className="mt-1 text-xs text-muted-foreground">{data.boundaryNotice}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {isLoading ? '조회 중' : data.generatedAt ? `기준 ${formatDateTime(data.generatedAt)}` : '요약 대기'}
          </span>
          <Button variant="outline" size="sm" type="button" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className="h-4 w-4" />
            갱신
          </Button>
        </div>
      </div>

      <div className="grid gap-0 divide-y divide-border xl:grid-cols-[minmax(0,1fr)_360px] xl:divide-x xl:divide-y-0">
        <div className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <DashboardMetric label="영업기회" value={`${data.opportunitySummary.totalCount}건`} sub={formatWon(data.opportunitySummary.totalRevenue)} />
            <DashboardMetric label="제안/수주" value={`${data.opportunitySummary.proposalCount}/${data.opportunitySummary.wonCount}건`} sub={`손익률 ${data.opportunitySummary.grossMarginRate}%`} />
            <DashboardMetric label="계약 원장" value={`${data.contractSummary.totalCount}건`} sub={formatWon(data.contractSummary.totalRevenue)} />
            <DashboardMetric label="계약 손익" value={`${data.contractSummary.grossMarginRate}%`} sub={formatWon(data.contractSummary.totalMargin)} />
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>파이프라인</span>
                <span>활성 단계 {activePipeline.reduce((sum, stage) => sum + stage.count, 0)}건</span>
              </div>
              <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                {data.pipeline.map((stage) => (
                  <div key={stage.status} className="rounded-md border border-border px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">{stage.label}</span>
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${getPipelineStatusClass(stage.status)}`}>{stage.count}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-foreground">{formatCurrency(stage.revenueTotal)}</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">손익 {formatCurrency(stage.marginTotal)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs text-muted-foreground">준비 큐</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.queues.map((queue) => (
                  <Link key={queue.key} href={queue.href} className="rounded-md border border-border px-3 py-2 transition-colors hover:bg-ssoo-content-bg">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">{queue.label}</span>
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${getQueueStateClass(queue.state)}`}>{getQueueStateLabel(queue.state)}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-foreground">{queue.readyCount}/{queue.count}건</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{queue.description}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>다음 액션</span>
            <span>{topActions.length}건</span>
          </div>
          <div className="space-y-2">
            {topActions.map((action) => (
              <Link key={`${action.kind}-${action.id}`} href={action.href} className="block rounded-md border border-border px-3 py-2 transition-colors hover:bg-ssoo-content-bg">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-semibold text-foreground">{action.title}</span>
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">{action.statusLabel}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="min-w-0 truncate">{action.customerName} · {action.ownerName}</span>
                  <span className="shrink-0">{formatCurrency(action.amount)}</span>
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">{action.nextAction}</div>
              </Link>
            ))}
            {topActions.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">표시할 다음 액션이 없습니다.</div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardMetric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold text-foreground">{value}</div>
      <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function getPipelineStatusClass(status: CrmOpportunityStatus) {
  return statusTone[status] ?? 'bg-muted text-muted-foreground';
}

function getQueueStateLabel(state: CrmDashboardResponse['queues'][number]['state']) {
  if (state === 'ready') {
    return '준비';
  }
  if (state === 'watch') {
    return '확인';
  }
  return '차단';
}

function getQueueStateClass(state: CrmDashboardResponse['queues'][number]['state']) {
  if (state === 'ready') {
    return 'bg-ssoo-success-bg text-ssoo-success';
  }
  if (state === 'watch') {
    return 'bg-ssoo-info-bg text-ssoo-info';
  }
  return 'bg-ssoo-warning-bg text-ssoo-warning';
}

function PageHeader({
  query,
  isOpen,
  canCreate,
  isAccessLoading,
  onOpenChange,
  onCreate,
}: {
  query: OpportunityWorkspaceQuery;
  isOpen: boolean;
  canCreate: boolean;
  isAccessLoading: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreate: () => void;
}) {
  return (
    <section className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 min-h-[52px] border-b border-border bg-muted">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            disabled={!canCreate || isAccessLoading}
            onClick={onCreate}
            title={isAccessLoading ? 'CRM 영업기회 권한 확인 중입니다.' : canCreate ? '영업기회 등록 패널 열기' : 'CRM 영업기회 등록 권한이 없습니다.'}
          >
            <Plus className="h-4 w-4" /> 새 영업기회
          </Button>
          <Button
            variant="destructive"
            type="button"
            disabled
            className="cursor-not-allowed opacity-70"
            title="삭제 API 연결 후 활성화됩니다."
          >
            <Trash2 className="h-4 w-4" /> 삭제 준비 중
          </Button>
        </div>
        <Button variant="plain" size="plain"
          type="button"
          className="inline-flex h-8 items-center justify-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-ssoo-content-bg"
          aria-expanded={isOpen}
          onClick={() => onOpenChange(!isOpen)}
        >
          {isOpen ? '접기' : '펼치기'} {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {isOpen && (
        <form className="flex min-h-[52px] items-center gap-3 bg-muted px-4 py-2" method="get">
          <div className="w-[200px]">
            <Input name="search" defaultValue={query.search} placeholder="고객사, 건명, 담당자" />
          </div>
          <div className="w-[150px]">
            <NativeSelect name="status" defaultValue={query.status}>
              <option value="all">전체</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </NativeSelect>
          </div>
          <div className="w-[150px]">
            <NativeSelect name="sort" defaultValue={query.sort}>
              {Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </NativeSelect>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button type="submit">
              <Search className="h-4 w-4" /> 검색
            </Button>
            <Link href="/" className="inline-flex h-control-h items-center justify-center gap-2 rounded-md border border-ssoo-content-border bg-card px-4 py-2 text-sm font-medium text-ssoo-primary shadow-sm transition-colors hover:bg-ssoo-sitemap-bg">
              <RotateCcw className="h-4 w-4" /> 초기화
            </Link>
          </div>
        </form>
      )}
    </section>
  );
}

function OpportunityTable({
  items,
  pageSize,
  selectedId,
  query,
  isLoading,
}: {
  items: CrmOpportunity[];
  pageSize: number;
  selectedId: string | null;
  query: OpportunityWorkspaceQuery;
  isLoading: boolean;
}) {
  const reservedStateRows = isLoading || items.length === 0 ? 1 : 0;
  const fillerRows = Math.max(0, pageSize - items.length - reservedStateRows);

  return (
    <div className="flex h-full flex-col rounded-md border">
      <div className="min-h-0 flex-1 overflow-auto">
        <Table className="w-full min-w-[1180px] caption-bottom text-sm">
          <TableHeader className="sticky top-0 z-10 bg-ssoo-content-bg text-left text-sm font-medium text-muted-foreground shadow-sm [&_tr]:border-b">
            <TableRow className="h-9">
              <TableHead className="w-[120px] px-2 py-2">기회번호</TableHead>
              <TableHead className="w-[260px] px-2 py-2">영업기회명</TableHead>
              <TableHead className="w-[180px] px-2 py-2">고객사</TableHead>
              <TableHead className="w-[100px] px-2 py-2">상태</TableHead>
              <TableHead className="w-[90px] px-2 py-2">차수</TableHead>
              <TableHead className="w-[90px] px-2 py-2">우선순위</TableHead>
              <TableHead className="w-[120px] px-2 py-2 text-right">최종 매출</TableHead>
              <TableHead className="w-[120px] px-2 py-2 text-right">원가</TableHead>
              <TableHead className="w-[100px] px-2 py-2 text-right">손익률</TableHead>
              <TableHead className="w-[120px] px-2 py-2">수정일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {items.map((item) => <OpportunityRow key={item.id} item={item} selected={item.id === selectedId} href={buildHref(query, { selected: item.id })} />)}
            {isLoading ? (
              <TableRow>
                <TableCell className="h-9 px-2 py-2 text-center text-ssoo-info" colSpan={10}>
                  인증된 CRM 원장 데이터를 조회하는 중입니다.
                </TableCell>
              </TableRow>
            ) : null}
            {!isLoading && items.length === 0 ? <TableRow><TableCell className="h-9 px-2 py-2 text-center text-muted-foreground" colSpan={10}>조회된 영업기회가 없습니다.</TableCell></TableRow> : null}
            {Array.from({ length: fillerRows }).map((_, index) => (
              <TableRow key={`empty-${index}`} className="h-9 border-b bg-card" aria-hidden="true">
                <TableCell colSpan={10}>&nbsp;</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function OpportunityRow({ item, selected, href }: { item: CrmOpportunity; selected: boolean; href: string }) {
  const router = useRouter();
  const openRow = () => router.push(href);
  const linkClass = 'block h-full w-full px-2 py-2 text-inherit no-underline';

  return (
    <TableRow
      tabIndex={0}
      onClick={openRow}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openRow();
        }
      }}
      data-active={selected ? 'true' : undefined}
      className={selected ? 'h-9 cursor-pointer border-b bg-ssoo-content-border transition-colors' : 'h-9 cursor-pointer border-b bg-card transition-colors hover:bg-ssoo-sitemap-bg'}
    >
      <TableCell className="whitespace-nowrap p-0">
        <Link className={`${linkClass} font-medium text-ssoo-primary hover:underline`} href={href}>OPP-{item.id}</Link>
      </TableCell>
      <TableCell className="whitespace-nowrap p-0">
        <Link className={linkClass} href={href}><span className="block max-w-[244px] truncate font-medium text-foreground">{item.opportunityName}</span></Link>
      </TableCell>
      <TableCell className="whitespace-nowrap p-0 text-muted-foreground"><Link className={linkClass} href={href}>{item.customerName}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0"><Link className={linkClass} href={href}><span className={`rounded px-2 py-1 text-xs font-medium ${statusTone[item.status]}`}>{statusLabels[item.status]}</span></Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-muted-foreground"><Link className={linkClass} href={href}>{item.versionCount > 1 ? `${item.version}차/${item.versionCount}` : `${item.version}차`}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-muted-foreground"><Link className={linkClass} href={href}>{priorityLabels[item.priority]}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-right font-medium text-foreground"><Link className={linkClass} href={href}>{formatCurrency(item.revenueTotal)}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-right text-muted-foreground"><Link className={linkClass} href={href}>{formatCurrency(item.costTotal)}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-right font-medium text-ssoo-secondary"><Link className={linkClass} href={href}>{item.marginRate}%</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-muted-foreground"><Link className={linkClass} href={href}>{formatDate(item.updatedAt)}</Link></TableCell>
    </TableRow>
  );
}

function OpportunityDetail({
  item,
  query,
  versionData,
  isVersionLoading,
  historyData,
  isHistoryLoading,
  quotePreview,
  isQuotePreviewLoading,
  opportunityAccess,
  isAccessLoading,
  isWorkflowSaving,
  isQuoteWorkflowSaving,
  isQuoteDmsDraftSaving,
  isQuoteDmsLifecycleExecuting,
  onEdit,
  onConfirm,
  onReopen,
  onConvertToContract,
  onAddVersion,
  onSaveQuoteWorkflow,
  onCreateQuoteDmsDraft,
  onExecuteQuoteDmsLifecycle,
}: {
  item: CrmOpportunity | null;
  query: OpportunityWorkspaceQuery;
  versionData: CrmOpportunityVersionListResponse | null;
  isVersionLoading: boolean;
  historyData: CrmOpportunityHistoryListResponse | null;
  isHistoryLoading: boolean;
  quotePreview: CrmOpportunityQuotePreview | null;
  isQuotePreviewLoading: boolean;
  opportunityAccess: CrmOpportunityAccessSnapshot | null;
  isAccessLoading: boolean;
  isWorkflowSaving: boolean;
  isQuoteWorkflowSaving: boolean;
  isQuoteDmsDraftSaving: boolean;
  isQuoteDmsLifecycleExecuting: boolean;
  onEdit: (item: CrmOpportunity) => void;
  onConfirm: (item: CrmOpportunity) => void;
  onReopen: (item: CrmOpportunity) => void;
  onConvertToContract: (item: CrmOpportunity) => void;
  onAddVersion: (item: CrmOpportunity) => void;
  onSaveQuoteWorkflow: (item: CrmOpportunity, request: CrmQuoteWorkflowUpdateRequest) => void;
  onCreateQuoteDmsDraft: (item: CrmOpportunity) => void;
  onExecuteQuoteDmsLifecycle: (item: CrmOpportunity) => void;
}) {
  const accessFeatures = item && opportunityAccess?.opportunityId === item.id ? opportunityAccess.features : null;
  const canConfirm = item ? Boolean(accessFeatures?.canConfirmOpportunity) && item.isLatest && !item.confirmed && item.status !== 'lost' && item.status !== 'hold' && item.revenueTotal > 0 : false;
  const canReopen = item ? Boolean(accessFeatures?.canConfirmOpportunity) && item.isLatest && item.confirmed && !item.contractCreated : false;
  const canConvertToContract = item ? Boolean(accessFeatures?.canConfirmOpportunity) && item.isLatest && item.confirmed && !item.contractCreated && item.revenueTotal > 0 : false;
  const canAddVersion = item ? Boolean(accessFeatures?.canAddVersion) && item.isLatest && item.confirmed && !item.contractCreated : false;
  const canEdit = item ? Boolean(accessFeatures?.canEditOpportunity) && !item.confirmed && item.isLatest : false;
  const canEditQuote = item ? Boolean(accessFeatures?.canEditOpportunity) && item.isLatest && !item.contractCreated : false;
  const accessPendingTitle = isAccessLoading ? 'CRM 영업기회 권한 확인 중입니다.' : 'CRM 영업기회 권한이 없습니다.';

  return (
    <aside className="min-h-0 overflow-auto bg-card">
      <div className="flex h-9 items-center justify-between border-b border-ssoo-content-border bg-ssoo-content-bg px-2 shadow-sm">
        <h2 className="text-sm font-medium text-muted-foreground">상세 정보</h2>
        {item ? (
          <div className="flex items-center gap-1">
            {item.confirmed ? (
              <Button
                variant="plain"
                size="plain"
                type="button"
                disabled={isWorkflowSaving || !canReopen}
                className="inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
                title={canReopen ? '확정 해제' : !accessFeatures?.canConfirmOpportunity ? accessPendingTitle : item.contractCreated ? '계약으로 전환된 영업기회는 확정 해제할 수 없습니다.' : '이전 차수는 확정 해제할 수 없습니다.'}
                onClick={() => onReopen(item)}
              >
                <UnlockKeyhole className="h-3.5 w-3.5" /> 확정 해제
              </Button>
            ) : (
              <Button
                variant="plain"
                size="plain"
                type="button"
                disabled={isWorkflowSaving || !canConfirm}
                className="inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
                title={canConfirm ? '영업기회 확정' : !accessFeatures?.canConfirmOpportunity ? accessPendingTitle : '최신 차수이며 매출이 있는 활성 상태만 확정할 수 있습니다.'}
                onClick={() => onConfirm(item)}
              >
                <LockKeyhole className="h-3.5 w-3.5" /> 확정
              </Button>
            )}
            {item.confirmed ? (
              <Button
                variant="plain"
                size="plain"
                type="button"
                disabled={isWorkflowSaving || !canConvertToContract}
                className="inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
                title={canConvertToContract ? '영업기회 기준 계약 생성' : !accessFeatures?.canConfirmOpportunity ? accessPendingTitle : item.contractCreated ? `계약 ${item.contractCode ?? ''}로 전환되었습니다.` : '최신 확정 영업기회만 계약으로 전환할 수 있습니다.'}
                onClick={() => onConvertToContract(item)}
              >
                <FileCheck2 className="h-3.5 w-3.5" /> 계약 전환
              </Button>
            ) : null}
            <Button
              variant="plain"
              size="plain"
              type="button"
              disabled={isWorkflowSaving || !canAddVersion}
              className="inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
              title={canAddVersion ? '현재 확정 차수를 복사해 새 차수 생성' : !accessFeatures?.canAddVersion ? accessPendingTitle : item.contractCreated ? '계약으로 전환된 영업기회는 차수를 추가할 수 없습니다.' : '최신 확정 차수에서만 차수를 추가할 수 있습니다.'}
              onClick={() => onAddVersion(item)}
            >
              <Plus className="h-3.5 w-3.5" /> 차수 추가
            </Button>
            <Button
              variant="plain"
              size="plain"
              type="button"
              disabled={isWorkflowSaving || !canEdit}
              className="inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
              title={canEdit ? '영업기회 수정' : !accessFeatures?.canEditOpportunity ? accessPendingTitle : item.confirmed ? '확정된 영업기회는 수정할 수 없습니다.' : '이전 차수는 조회만 가능합니다.'}
              onClick={() => onEdit(item)}
            >
              <Pencil className="h-3.5 w-3.5" /> 수정
            </Button>
          </div>
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      {!item ? (
        <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-muted-foreground">행을 선택하세요.</div>
      ) : (
        <div className="space-y-4 p-4">
          <div>
            <div className="text-xs text-muted-foreground">OPP-{item.id}</div>
            <h3 className="mt-1 text-base font-bold text-foreground">{item.opportunityName}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.customerName}</p>
            {item.contractCreated ? (
              <div className="mt-3 flex min-h-9 items-center justify-between gap-3 rounded-md border border-ssoo-success-border bg-ssoo-success-bg px-3 py-2 text-xs text-ssoo-success">
                <span className="font-medium">계약 전환 완료</span>
                {item.contractCode ? (
                  <Link className="font-semibold text-ssoo-success underline-offset-2 hover:underline" href={`/contracts?selected=${encodeURIComponent(item.contractCode)}`}>
                    {item.contractCode}
                  </Link>
                ) : (
                  <span className="font-semibold">계약 코드 확인 필요</span>
                )}
              </div>
            ) : null}
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Field label="담당자" value={item.ownerName} />
            <Field label="담당 사용자" value={item.ownerUserId ? `#${item.ownerUserId}` : '-'} />
            <Field label="수신 담당자" value={item.clientContactName ?? '-'} />
            <Field label="상태" value={statusLabels[item.status]} />
            <Field label="지역" value={regionLabels[item.region]} />
            <Field label="차수/확정" value={`${item.version}차/${item.versionCount} · ${item.confirmed ? '확정' : '미확정'}`} />
            <Field label="계약 전환" value={item.contractCreated ? item.contractCode ?? '전환 완료' : '미전환'} />
            <Field label="수금조건" value={formatPaymentTerm(item.paymentTermCode)} />
            <Field label="예상 시작" value={formatDate(item.expectedStartDate)} />
            <Field label="예상 종료" value={formatDate(item.expectedEndDate)} />
            <Field label="매출 원금" value={formatCurrency(item.revenueSubtotal)} />
            <Field label="Special DC" value={formatDiscount(item)} />
            <Field label="최종 매출" value={formatCurrency(item.revenueTotal)} strong />
            <Field label="원가" value={formatCurrency(item.costTotal)} />
            <Field label="손익" value={formatCurrency(item.marginTotal)} strong />
            <Field label="손익률" value={`${item.marginRate}%`} strong />
          </dl>

          <DetailSection title="다음 행동">
            <div className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">{item.nextAction}</div>
          </DetailSection>

          <DetailSection title="견적 후보">
            <QuotePreviewSection
              preview={quotePreview?.workflow.sourceOpportunityId === item.id ? quotePreview : null}
              isLoading={isQuotePreviewLoading}
              canEdit={canEditQuote}
              isSaving={isQuoteWorkflowSaving}
              isDmsDraftSaving={isQuoteDmsDraftSaving}
              isDmsLifecycleExecuting={isQuoteDmsLifecycleExecuting}
              onSave={(request) => onSaveQuoteWorkflow(item, request)}
              onCreateDmsDraft={() => onCreateQuoteDmsDraft(item)}
              onExecuteDmsLifecycle={() => onExecuteQuoteDmsLifecycle(item)}
            />
          </DetailSection>

          <DetailSection title="권한">
            {isAccessLoading ? (
              <div className="rounded-md border border-ssoo-info-border bg-ssoo-info-bg px-3 py-2 text-xs text-ssoo-info">권한을 확인하는 중입니다.</div>
            ) : (
              <div className="space-y-2 text-xs text-muted-foreground">
                <BoundaryRow label="조회" value={accessFeatures?.canViewOpportunity ? '허용' : '권한 없음'} />
                <BoundaryRow label="수정" value={accessFeatures?.canEditOpportunity ? '허용' : '권한 없음'} />
                <BoundaryRow label="확정" value={accessFeatures?.canConfirmOpportunity ? '허용' : '권한 없음'} />
                <BoundaryRow label="차수 추가" value={accessFeatures?.canAddVersion ? '허용' : '권한 없음'} />
              </div>
            )}
          </DetailSection>

          <DetailSection title="차수 이력">
            {isVersionLoading ? (
              <div className="rounded-md border border-ssoo-info-border bg-ssoo-info-bg px-3 py-2 text-xs text-ssoo-info">차수 목록을 조회하는 중입니다.</div>
            ) : (
              <div className="space-y-1">
                {(versionData?.versions ?? []).map((version) => (
                  <Link
                    key={version.id}
                    href={buildHref(query, { selected: version.id })}
                    className={`flex min-h-8 items-center justify-between rounded-md border px-2 py-1 text-xs transition-colors ${version.id === item.id ? 'border-ssoo-primary bg-ssoo-sitemap-bg text-ssoo-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
                  >
                    <span className="font-medium">{version.version}차 {version.isLatest ? '최신' : '이전'}</span>
                    <span>{version.confirmed ? '확정' : '미확정'} · {formatCurrency(version.revenueTotal)} · {formatDate(version.updatedAt)}</span>
                  </Link>
                ))}
                {versionData && versionData.versions.length === 0 ? (
                  <div className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">등록된 차수가 없습니다.</div>
                ) : null}
              </div>
            )}
          </DetailSection>

          <DetailSection title="변경 이력">
            {isHistoryLoading ? (
              <div className="rounded-md border border-ssoo-info-border bg-ssoo-info-bg px-3 py-2 text-xs text-ssoo-info">변경 이력을 조회하는 중입니다.</div>
            ) : (
              <div className="space-y-1">
                {(historyData?.items ?? []).map((history) => (
                  <div key={history.historySeq} className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{historyEventLabels[history.eventType] ?? history.eventType} · {history.activity ?? 'ledger'}</span>
                      <span>{formatDateTime(history.eventAt)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span>{history.version}차 · {statusLabels[history.status]} · {history.confirmed ? '확정' : '미확정'}</span>
                      <span className="font-medium text-foreground">{formatCurrency(history.revenueTotal)} / {history.marginRate}%</span>
                    </div>
                  </div>
                ))}
                {historyData && historyData.items.length === 0 ? (
                  <div className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">등록된 변경 이력이 없습니다.</div>
                ) : null}
              </div>
            )}
          </DetailSection>

          <DetailSection title="매출 라인">
            <LineTable lines={item.revenueLines} />
          </DetailSection>

          <DetailSection title="원가 라인">
            <LineTable lines={item.costLines} />
          </DetailSection>

          <DetailSection title="업무 경계">
            <div className="space-y-2 text-xs text-muted-foreground">
              <BoundaryRow label="확정" value={!item.isLatest ? '이전 차수 조회 전용' : item.confirmed ? '현재 차수 잠금' : '현재 차수 미확정'} />
              <BoundaryRow label="계약" value={item.contractCreated ? `전환 완료${item.contractCode ? ` · ${item.contractCode}` : ''}` : '확정 후 전환 가능'} />
              <BoundaryRow label="DMS" value={item.dmsLinkStatus === 'draft-created' ? '견적 초안 저장' : item.dmsLinkStatus === 'planned' ? '문서 연결 예정' : '미연결'} />
              <BoundaryRow label="PMS" value={item.pmsHandoffStatus === 'planned' ? '수행 인계 예정' : '미연결'} />
              <BoundaryRow label="Admin" value="계정/권한/법인/조직 참조" />
            </div>
          </DetailSection>
        </div>
      )}
    </aside>
  );
}

function QuotePreviewSection({
  preview,
  isLoading,
  canEdit,
  isSaving,
  isDmsDraftSaving,
  isDmsLifecycleExecuting,
  onSave,
  onCreateDmsDraft,
  onExecuteDmsLifecycle,
}: {
  preview: CrmOpportunityQuotePreview | null;
  isLoading: boolean;
  canEdit: boolean;
  isSaving: boolean;
  isDmsDraftSaving: boolean;
  isDmsLifecycleExecuting: boolean;
  onSave: (request: CrmQuoteWorkflowUpdateRequest) => void;
  onCreateDmsDraft: () => void;
  onExecuteDmsLifecycle: () => void;
}) {
  const [workflowStatus, setWorkflowStatus] = useState<CrmQuoteWorkflowStatus>('draft');
  const [clientContactName, setClientContactName] = useState('');
  const [issuedAt, setIssuedAt] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [quoteMemo, setQuoteMemo] = useState('');

  useEffect(() => {
    if (!preview) {
      setWorkflowStatus('draft');
      setClientContactName('');
      setIssuedAt('');
      setValidUntil('');
      setQuoteMemo('');
      return;
    }

    setWorkflowStatus(preview.workflow.workflowStatus);
    setClientContactName(preview.party.clientContactName ?? '');
    setIssuedAt(preview.workflow.issuedAt.slice(0, 10));
    setValidUntil(preview.workflow.validUntil);
    setQuoteMemo(preview.workflow.quoteMemo ?? '');
  }, [preview]);

  if (isLoading) {
    return (
      <div className="rounded-md border border-ssoo-info-border bg-ssoo-info-bg px-3 py-2 text-xs text-ssoo-info">
        견적 후보를 구성하는 중입니다.
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
        견적 후보 데이터가 없습니다.
      </div>
    );
  }

  const statusLabel = preview.workflow.previewStatus === 'candidate' ? '후보' : '보류';
  const hasWorkflowChanges = workflowStatus !== preview.workflow.workflowStatus
    || clientContactName.trim() !== (preview.party.clientContactName ?? '')
    || issuedAt !== preview.workflow.issuedAt.slice(0, 10)
    || validUntil !== preview.workflow.validUntil
    || quoteMemo.trim() !== (preview.workflow.quoteMemo ?? '');
  const dmsDocument = preview.dmsDocument;
  const dmsDraftDisabled = !canEdit || isDmsDraftSaving || dmsDocument.readiness !== 'ready';
  const dmsLifecycleBlockedReason = dmsDocument.lifecycle.find((step) => step.owner === 'dms' && step.status === 'blocked')?.blockingReasons?.[0];
  const dmsLifecycleDisabled = !canEdit
    || isDmsLifecycleExecuting
    || isDmsDraftSaving
    || !dmsDocument.latestHandoff
    || Boolean(dmsLifecycleBlockedReason);

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div>
            <div className="text-caption-2xs font-semibold uppercase tracking-normal text-muted-foreground">Quotation</div>
            <div className="text-sm font-semibold text-foreground">{preview.workflow.quoteNumber}</div>
          </div>
          <span className="rounded-sm border border-border bg-muted px-2 py-1 text-caption-2xs font-medium text-muted-foreground">
            {statusLabel}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-3 py-3 text-xs text-muted-foreground">
          <BoundaryRow label="수신" value={`${preview.party.customerName} 귀중`} />
          <BoundaryRow label="참조" value={preview.party.clientContactName ?? '-'} />
          <BoundaryRow label="담당" value={preview.party.ownerName} />
          <BoundaryRow label="담당 연락처" value={formatOwnerContactStatus(preview.party.ownerContactStatus)} />
          {preview.party.ownerContact?.displayName && preview.party.ownerContact.displayName !== preview.party.ownerName ? (
            <BoundaryRow label="담당 프로필" value={preview.party.ownerContact.displayName} />
          ) : null}
          {preview.party.ownerContact?.departmentName ? (
            <BoundaryRow label="담당 부서" value={preview.party.ownerContact.departmentName} />
          ) : null}
          {preview.party.ownerContact?.phone ? (
            <BoundaryRow label="담당 Tel" value={preview.party.ownerContact.phone} />
          ) : null}
          {preview.party.ownerContact?.email ? (
            <BoundaryRow label="담당 e-Mail" value={preview.party.ownerContact.email} />
          ) : null}
          <BoundaryRow label="일자" value={formatDate(preview.workflow.issuedAt)} />
          <BoundaryRow label="유효기한" value={formatDate(preview.workflow.validUntil)} />
          <BoundaryRow label="견적 상태" value={quoteWorkflowLabels[preview.workflow.workflowStatus]} />
          <BoundaryRow label="수금조건" value={preview.workflow.paymentTermLabel} />
          <BoundaryRow label="VAT" value={preview.summary.vatNotice} />
          <BoundaryRow label="공급자" value={preview.party.sellerName} />
          <BoundaryRow label="공급자 상태" value={formatSellerInfoStatus(preview.party.sellerInfoStatus)} />
          {preview.party.sellerProfile?.ceoName ? (
            <BoundaryRow label="대표이사" value={preview.party.sellerProfile.ceoName} />
          ) : null}
          {preview.party.sellerProfile?.tel ? (
            <BoundaryRow label="공급자 Tel" value={preview.party.sellerProfile.tel} />
          ) : null}
          {preview.party.sellerProfile?.email ? (
            <BoundaryRow label="공급자 e-Mail" value={preview.party.sellerProfile.email} />
          ) : null}
          {preview.party.sellerProfile?.address ? (
            <BoundaryRow label="공급자 주소" value={preview.party.sellerProfile.address} />
          ) : null}
        </div>
      </div>

      <div className="space-y-2 rounded-md border border-border bg-muted px-3 py-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="font-medium">견적 상태</span>
            <NativeSelect
              value={workflowStatus}
              disabled={!canEdit || isSaving}
              onChange={(event) => setWorkflowStatus(event.target.value as CrmQuoteWorkflowStatus)}
            >
              {quoteWorkflowOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </NativeSelect>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="font-medium">수신 담당자</span>
            <Input
              value={clientContactName}
              disabled={!canEdit || isSaving}
              maxLength={120}
              onChange={(event) => setClientContactName(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="font-medium">발행 기준일</span>
            <Input
              type="date"
              value={issuedAt}
              disabled={!canEdit || isSaving}
              onChange={(event) => setIssuedAt(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="font-medium">유효기한</span>
            <Input
              type="date"
              value={validUntil}
              disabled={!canEdit || isSaving}
              onChange={(event) => setValidUntil(event.target.value)}
            />
          </label>
        </div>
        <label className="space-y-1 text-xs text-muted-foreground">
          <span className="font-medium">견적 메모</span>
          <Textarea
            value={quoteMemo}
            disabled={!canEdit || isSaving}
            maxLength={1000}
            rows={3}
            onChange={(event) => setQuoteMemo(event.target.value)}
          />
        </label>
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={!canEdit || isSaving || !hasWorkflowChanges}
            onClick={() => onSave({
              status: workflowStatus,
              clientContactName: clientContactName.trim() || undefined,
              issuedAt: issuedAt || undefined,
              validUntil: validUntil || undefined,
              quoteMemo: quoteMemo.trim() || undefined,
            })}
          >
            <Save className="h-3.5 w-3.5" /> {isSaving ? '저장 중' : '견적 상태 저장'}
          </Button>
        </div>
      </div>

      <QuotePreviewLineTable
        title="상품 공급 내역"
        emptyLabel="상품 매출 라인이 없습니다."
        lines={preview.productLines}
      />
      <QuotePreviewLineTable
        title="용역 제공 내역"
        emptyLabel="용역 매출 라인이 없습니다."
        lines={preview.serviceLines}
      />

      <div className="space-y-2 rounded-md border border-border bg-muted px-3 py-3 text-xs text-muted-foreground">
        <BoundaryRow label="상품 소계" value={formatWon(preview.summary.productSubtotal)} />
        <BoundaryRow label="용역 소계" value={formatWon(preview.summary.serviceSubtotal)} />
        <BoundaryRow
          label="Special DC"
          value={
            preview.summary.specialDiscountAmount > 0
              ? `-${formatWon(preview.summary.specialDiscountAmount)}`
              : '0원'
          }
        />
        <BoundaryRow label="견적 금액" value={`${formatWon(preview.summary.quoteTotal)} (${preview.summary.vatNotice})`} />
      </div>

      <div className="space-y-3 rounded-md border border-border px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-foreground">DMS 견적 초안</div>
            <div className="mt-1 text-caption-2xs text-muted-foreground">{dmsDocument.templateKey}</div>
          </div>
          <span className="rounded-sm border border-border bg-muted px-2 py-1 text-caption-2xs font-medium text-muted-foreground">
            {dmsDocument.readiness === 'ready' ? '저장 가능' : '준비 필요'}
          </span>
        </div>
        <div className="space-y-2 text-xs text-muted-foreground">
          <BoundaryRow label="템플릿" value={formatQuoteTemplateEvidence(dmsDocument.templateEvidence)} />
          <BoundaryRow label="템플릿 경로" value={dmsDocument.templateEvidence.sourcePath ?? dmsDocument.templateEvidence.reason ?? 'DMS registry 확인 필요'} />
          <BoundaryRow label="문서 제목" value={dmsDocument.documentTitle} />
          <BoundaryRow label="초안 경로" value={dmsDocument.savedDraftPath ?? dmsDocument.draftPathHint} />
          <BoundaryRow label="Handoff" value={dmsDocument.latestHandoff ? `${dmsDocument.latestHandoff.status} · #${dmsDocument.latestHandoff.id}` : '미생성'} />
          <BoundaryRow label="문서 변수" value={`${dmsDocument.variables.length}개`} />
          <BoundaryRow label="경계" value={dmsDocument.boundaryNotice} />
        </div>
        <div className="overflow-hidden rounded-md border border-border">
          <div className="border-b border-border bg-ssoo-content-bg px-3 py-2 text-caption-2xs font-semibold text-muted-foreground">DMS 견적 lifecycle</div>
          <div className="divide-y divide-border text-xs">
            {dmsDocument.lifecycle.map((step) => (
              <div key={step.key} className="grid grid-cols-1 gap-1 px-3 py-2 sm:grid-cols-[120px_84px_1fr] sm:gap-2">
                <div className="font-medium text-foreground">{step.label}</div>
                <div className="text-muted-foreground">{formatQuoteLifecycleStatus(step.status)}</div>
                <div className="min-w-0 text-muted-foreground">
                  <div className="truncate">{step.evidencePath ?? step.evidenceLabel}</div>
                  <div className="mt-0.5 text-caption-2xs">{step.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {dmsDocument.blockedReasons.length > 0 ? (
          <div className="space-y-1 rounded-md border border-ssoo-warning-border bg-ssoo-warning-bg px-3 py-2 text-xs text-ssoo-warning">
            {dmsDocument.blockedReasons.map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            size="sm"
            disabled={dmsDraftDisabled}
            title={dmsDraftDisabled ? dmsDocument.blockedReasons[0] ?? '견적 DMS 초안 저장 권한 또는 준비 상태를 확인하세요.' : '견적 markdown 초안 저장'}
            onClick={onCreateDmsDraft}
          >
            <FileCheck2 className="h-3.5 w-3.5" /> {isDmsDraftSaving ? '저장 중' : dmsDocument.latestHandoff ? 'DMS 초안 갱신' : 'DMS 초안 저장'}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={dmsLifecycleDisabled}
            title={dmsLifecycleDisabled ? dmsLifecycleBlockedReason ?? '견적 DMS 초안 handoff 생성 후 실행할 수 있습니다.' : 'DMS 견적 artifact 산출 실행'}
            onClick={onExecuteDmsLifecycle}
          >
            <RefreshCw className="h-3.5 w-3.5" /> {isDmsLifecycleExecuting ? '실행 중' : 'DMS 산출 실행'}
          </Button>
        </div>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        {preview.notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        {dmsDocument.unavailableActions.map((action) => (
          <BoundaryRow key={action} label={action} value="미구현" />
        ))}
      </div>
    </div>
  );
}

function formatQuoteTemplateEvidence(templateEvidence: CrmQuoteDmsDocumentPreview['templateEvidence']): string {
  if (templateEvidence.state === 'available') {
    return `${templateEvidence.templateName ?? templateEvidence.templateKey} · ${templateEvidence.status ?? '상태 미확인'}`;
  }
  return `${templateEvidence.templateKey} · ${templateEvidence.state}`;
}

function formatQuoteLifecycleStatus(status: CrmQuoteDmsDocumentPreview['lifecycle'][number]['status']): string {
  if (status === 'completed') {
    return '완료';
  }
  if (status === 'ready') {
    return '준비';
  }
  if (status === 'blocked') {
    return '차단';
  }
  return '대기';
}

function QuotePreviewLineTable({
  title,
  emptyLabel,
  lines,
}: {
  title: string;
  emptyLabel: string;
  lines: CrmQuotePreviewLine[];
}) {
  return (
    <div className="rounded-md border border-border">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold text-muted-foreground">{title}</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-2 py-2 text-left text-caption-2xs">항목</TableHead>
            <TableHead className="w-[64px] px-2 py-2 text-right text-caption-2xs">수량</TableHead>
            <TableHead className="w-[92px] px-2 py-2 text-right text-caption-2xs">단가</TableHead>
            <TableHead className="w-[92px] px-2 py-2 text-right text-caption-2xs">금액</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="px-2 py-3 text-center text-xs text-muted-foreground">{emptyLabel}</TableCell>
            </TableRow>
          ) : lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell className="px-2 py-2 text-xs text-muted-foreground">
                <div className="font-medium text-foreground">{line.label}</div>
                {line.section === 'service' ? (
                  <div className="mt-1 text-caption-2xs text-muted-foreground">
                    {[line.department, line.memberName, line.grade].filter(Boolean).join(' / ') || '-'}
                  </div>
                ) : null}
              </TableCell>
              <TableCell className="px-2 py-2 text-right text-xs text-muted-foreground">{line.quantity ?? '-'}</TableCell>
              <TableCell className="px-2 py-2 text-right text-xs text-muted-foreground">{line.unitPrice ? formatWon(line.unitPrice) : '-'}</TableCell>
              <TableCell className="px-2 py-2 text-right text-xs font-medium text-foreground">{formatWon(line.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function OpportunityEditor({
  mode,
  draft,
  saveError,
  isSaving,
  ownerLookupItems,
  ownerLookupSearch,
  ownerLookupError,
  isOwnerLookupLoading,
  onCancel,
  onSave,
  onTextFieldChange,
  onSelectFieldChange,
  onOwnerUserIdChange,
  onOwnerLookupSearchChange,
  onOwnerLookupReload,
  onLineChange,
  onAddLine,
  onRemoveLine,
}: {
  mode: OpportunityEditorMode;
  draft: OpportunityDraft;
  saveError: string | null;
  isSaving: boolean;
  ownerLookupItems: CrmOpportunityOwnerLookupItem[];
  ownerLookupSearch: string;
  ownerLookupError: string | null;
  isOwnerLookupLoading: boolean;
  onCancel: () => void;
  onSave: () => Promise<void>;
  onTextFieldChange: (field: OpportunityDraftTextField, value: string) => void;
  onSelectFieldChange: (field: OpportunityDraftSelectField, value: string) => void;
  onOwnerUserIdChange: (ownerUserId: string) => void;
  onOwnerLookupSearchChange: (value: string) => void;
  onOwnerLookupReload: () => void;
  onLineChange: (
    kind: OpportunityDraftLineKind,
    index: number,
    patch: Partial<Pick<OpportunityDraftLine, OpportunityDraftLineField>>,
  ) => void;
  onAddLine: (kind: OpportunityDraftLineKind, category?: CrmOpportunityLineCategory) => void;
  onRemoveLine: (kind: OpportunityDraftLineKind, index: number) => void;
}) {
  const revenueSubtotal = sumDraftLines(draft.revenueLines);
  const specialDiscountAmount = getDraftDiscountAmount(
    revenueSubtotal,
    draft.specialDiscountType,
    draft.specialDiscountValue,
  );
  const revenueTotal = revenueSubtotal - specialDiscountAmount;
  const costTotal = sumDraftLines(draft.costLines);
  const marginTotal = revenueTotal - costTotal;
  const marginRate = revenueTotal > 0 ? Math.round((marginTotal / revenueTotal) * 1000) / 10 : 0;
  const selectedOwnerInLookup = Boolean(draft.ownerUserId && ownerLookupItems.some((item) => item.userId === draft.ownerUserId));
  const ownerLookupStateText = isOwnerLookupLoading
    ? '조회 중'
    : `${ownerLookupItems.length.toLocaleString('ko-KR')}명`;

  return (
    <aside className="min-h-0 overflow-auto bg-card">
      <form
        className="flex min-h-full flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave();
        }}
      >
        <div className="flex h-9 items-center justify-between border-b border-ssoo-content-border bg-ssoo-content-bg px-2 shadow-sm">
          <h2 className="text-sm font-medium text-muted-foreground">{mode === 'create' ? '영업기회 등록' : '영업기회 수정'}</h2>
          <div className="flex items-center gap-1">
            <Button variant="plain" size="plain" type="button" className="h-7 px-2 text-xs" onClick={onCancel}>
              <X className="h-3.5 w-3.5" /> 취소
            </Button>
            <Button size="sm" type="submit" disabled={isSaving}>
              <Save className="h-3.5 w-3.5" /> {isSaving ? '저장 중' : '저장'}
            </Button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {saveError ? (
            <div className="flex items-start gap-2 rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          ) : null}

          <EditorSection title="기본 정보">
            <div className="grid grid-cols-2 gap-2">
              <EditorField label="고객사">
                <Input required value={draft.customerName} onChange={(event) => onTextFieldChange('customerName', event.target.value)} />
              </EditorField>
              <EditorField label="담당자">
                <Input required value={draft.ownerName} onChange={(event) => onTextFieldChange('ownerName', event.target.value)} />
              </EditorField>
              <EditorField label="수신 담당자">
                <Input value={draft.clientContactName} onChange={(event) => onTextFieldChange('clientContactName', event.target.value)} />
              </EditorField>
              <div className="col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">담당 사용자</span>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input
                    value={ownerLookupSearch}
                    placeholder="이름, 계정, 이메일"
                    onChange={(event) => onOwnerLookupSearchChange(event.target.value)}
                  />
                  <Button variant="outline" type="button" disabled={isOwnerLookupLoading} onClick={onOwnerLookupReload}>
                    <Search className="h-3.5 w-3.5" /> 조회
                  </Button>
                </div>
                <NativeSelect
                  className="mt-2"
                  value={draft.ownerUserId || OWNER_LOOKUP_EMPTY_VALUE}
                  onChange={(event) => onOwnerUserIdChange(event.target.value === OWNER_LOOKUP_EMPTY_VALUE ? '' : event.target.value)}
                >
                  <option value={OWNER_LOOKUP_EMPTY_VALUE}>선택 안함</option>
                  {draft.ownerUserId && !selectedOwnerInLookup ? (
                    <option value={draft.ownerUserId}>{draft.ownerName ? `${draft.ownerName} · #${draft.ownerUserId}` : `#${draft.ownerUserId}`}</option>
                  ) : null}
                  {ownerLookupItems.map((item) => (
                    <option key={item.userId} value={item.userId}>{formatOwnerLookupLabel(item)}</option>
                  ))}
                </NativeSelect>
                {ownerLookupError ? (
                  <p className="mt-1 text-xs text-ssoo-danger">{ownerLookupError}</p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">{ownerLookupStateText}</p>
                )}
              </div>
              <EditorField label="영업기회명" className="col-span-2">
                <Input required value={draft.opportunityName} onChange={(event) => onTextFieldChange('opportunityName', event.target.value)} />
              </EditorField>
              <EditorField label="사업구분">
                <Input required value={draft.businessType} onChange={(event) => onTextFieldChange('businessType', event.target.value)} />
              </EditorField>
              <EditorField label="계열/산업">
                <Input required value={draft.industryLine} onChange={(event) => onTextFieldChange('industryLine', event.target.value)} />
              </EditorField>
              <EditorField label="지역">
                <NativeSelect value={draft.region} onChange={(event) => onSelectFieldChange('region', event.target.value)}>
                  {Object.entries(regionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </NativeSelect>
              </EditorField>
              <EditorField label="상태">
                <NativeSelect value={draft.status} onChange={(event) => onSelectFieldChange('status', event.target.value)}>
                  {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </NativeSelect>
              </EditorField>
              <EditorField label="우선순위">
                <NativeSelect value={draft.priority} onChange={(event) => onSelectFieldChange('priority', event.target.value)}>
                  {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </NativeSelect>
              </EditorField>
              <EditorField label="수금조건">
                <NativeSelect value={draft.paymentTermCode} onChange={(event) => onSelectFieldChange('paymentTermCode', event.target.value)}>
                  <option value="">선택</option>
                  {Object.entries(paymentTermLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </NativeSelect>
              </EditorField>
              <EditorField label="Special DC 방식">
                <NativeSelect value={draft.specialDiscountType} onChange={(event) => onSelectFieldChange('specialDiscountType', event.target.value)}>
                  {Object.entries(discountTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </NativeSelect>
              </EditorField>
              <EditorField label={draft.specialDiscountType === 'rate' ? 'Special DC (%)' : 'Special DC (원)'}>
                <Input
                  type="number"
                  min="0"
                  max={draft.specialDiscountType === 'rate' ? 100 : undefined}
                  step={draft.specialDiscountType === 'rate' ? 0.01 : 1}
                  value={draft.specialDiscountValue}
                  className="text-right"
                  placeholder="0"
                  onChange={(event) => onTextFieldChange('specialDiscountValue', event.target.value)}
                />
              </EditorField>
              <EditorField label="예상 시작">
                <Input type="date" value={draft.expectedStartDate} onChange={(event) => onTextFieldChange('expectedStartDate', event.target.value)} />
              </EditorField>
              <EditorField label="예상 종료">
                <Input type="date" value={draft.expectedEndDate} onChange={(event) => onTextFieldChange('expectedEndDate', event.target.value)} />
              </EditorField>
              <EditorField label="다음 행동" className="col-span-2">
                <Textarea required value={draft.nextAction} onChange={(event) => onTextFieldChange('nextAction', event.target.value)} />
              </EditorField>
            </div>
          </EditorSection>

          <LineEditorGroups
            title="매출 라인"
            kind="revenueLines"
            lines={draft.revenueLines}
            groups={[
              { category: 'product', label: '상품 매출' },
              { category: 'service', label: '용역 매출' },
            ]}
            onAddLine={onAddLine}
            onLineChange={onLineChange}
            onRemoveLine={onRemoveLine}
          />

          <LineEditorGroups
            title="원가 라인"
            kind="costLines"
            lines={draft.costLines}
            groups={[
              { category: 'product', label: '상품 원가' },
              { category: 'internal-cost', label: '내부용역 원가' },
              { category: 'external-cost', label: '외부용역 원가' },
            ]}
            onAddLine={onAddLine}
            onLineChange={onLineChange}
            onRemoveLine={onRemoveLine}
          />

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Field label="매출 원금" value={formatWon(revenueSubtotal)} />
            <Field label="Special DC" value={specialDiscountAmount > 0 ? `-${formatWon(specialDiscountAmount)}` : '0원'} />
            <Field label="최종 매출" value={formatWon(revenueTotal)} strong />
            <Field label="원가 합계" value={formatWon(costTotal)} />
            <Field label="손익" value={formatWon(marginTotal)} strong />
            <Field label="손익률" value={`${marginRate}%`} strong />
          </div>
        </div>
      </form>
    </aside>
  );
}

function EditorSection({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-card">
      <div className="flex min-h-10 items-center justify-between border-b border-border bg-muted px-3 py-2">
        <h3 className="text-xs font-semibold text-muted-foreground">{title}</h3>
        {action}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

function EditorField({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function LineEditorGroups({
  title,
  kind,
  lines,
  groups,
  onAddLine,
  onLineChange,
  onRemoveLine,
}: {
  title: string;
  kind: OpportunityDraftLineKind;
  lines: OpportunityDraftLine[];
  groups: Array<{ category: CrmOpportunityLineCategory; label: string }>;
  onAddLine: (kind: OpportunityDraftLineKind, category?: CrmOpportunityLineCategory) => void;
  onLineChange: (
    kind: OpportunityDraftLineKind,
    index: number,
    patch: Partial<Pick<OpportunityDraftLine, OpportunityDraftLineField>>,
  ) => void;
  onRemoveLine: (kind: OpportunityDraftLineKind, index: number) => void;
}) {
  return (
    <EditorSection title={title}>
      <div className="space-y-3">
        {groups.map((group) => (
          <LineEditorGroup
            key={group.category}
            kind={kind}
            category={group.category}
            label={group.label}
            lines={lines}
            onAddLine={onAddLine}
            onLineChange={onLineChange}
            onRemoveLine={onRemoveLine}
          />
        ))}
      </div>
    </EditorSection>
  );
}

function LineEditorGroup({
  kind,
  category,
  label,
  lines,
  onAddLine,
  onLineChange,
  onRemoveLine,
}: {
  kind: OpportunityDraftLineKind;
  category: CrmOpportunityLineCategory;
  label: string;
  lines: OpportunityDraftLine[];
  onAddLine: (kind: OpportunityDraftLineKind, category?: CrmOpportunityLineCategory) => void;
  onLineChange: (
    kind: OpportunityDraftLineKind,
    index: number,
    patch: Partial<Pick<OpportunityDraftLine, OpportunityDraftLineField>>,
  ) => void;
  onRemoveLine: (kind: OpportunityDraftLineKind, index: number) => void;
}) {
  const indexedLines = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.category === category);
  const isServiceLike = category !== 'product';
  const isCost = kind === 'costLines';
  const emptyColSpan = isServiceLike ? isCost ? 12 : 11 : isCost ? 8 : 7;

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex min-h-9 items-center justify-between border-b border-border bg-ssoo-content-bg px-2">
        <div className="text-xs font-semibold text-muted-foreground">{label}</div>
        <Button variant="outline" size="sm" type="button" onClick={() => onAddLine(kind, category)}>
          <Plus className="h-3.5 w-3.5" /> 추가
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table className="w-full min-w-[860px] text-xs">
          <TableHeader className="bg-card text-left text-muted-foreground">
            <TableRow>
              <TableHead className="w-[160px] px-2 py-2">항목</TableHead>
              {isServiceLike ? <TableHead className="w-[100px] px-2 py-2">소속</TableHead> : null}
              {isServiceLike ? <TableHead className="w-[100px] px-2 py-2">성명/그룹</TableHead> : null}
              {isServiceLike ? <TableHead className="w-[82px] px-2 py-2">등급</TableHead> : null}
              {isServiceLike ? <TableHead className="w-[74px] px-2 py-2">구분</TableHead> : null}
              <TableHead className="w-[82px] px-2 py-2 text-right">수량</TableHead>
              <TableHead className="w-[110px] px-2 py-2 text-right">단가</TableHead>
              <TableHead className="w-[86px] px-2 py-2 text-right">절사</TableHead>
              {kind === 'revenueLines' ? <TableHead className="w-[72px] px-2 py-2 text-right">이익률</TableHead> : null}
              {isCost ? <TableHead className="w-[72px] px-2 py-2 text-center">매출</TableHead> : null}
              {isCost ? <TableHead className="w-[112px] px-2 py-2 text-right">매출단가</TableHead> : null}
              <TableHead className="w-[120px] px-2 py-2 text-right">금액</TableHead>
              <TableHead className="w-[44px] px-2 py-2"><span className="sr-only">삭제</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {indexedLines.map(({ line, index }) => (
              <TableRow key={line.id}>
                <TableCell className="px-2 py-2">
                  <Input disabled={kind === 'revenueLines' && Boolean(line.linkedCostLineId)} value={line.label} placeholder={category === 'product' ? '상품명' : '업무/역할'} onChange={(event) => onLineChange(kind, index, { label: event.target.value })} />
                </TableCell>
                {isServiceLike ? (
                  <TableCell className="px-2 py-2">
                    <Input disabled={kind === 'revenueLines' && Boolean(line.linkedCostLineId)} value={line.department} placeholder="소속" onChange={(event) => onLineChange(kind, index, { department: event.target.value })} />
                  </TableCell>
                ) : null}
                {isServiceLike ? (
                  <TableCell className="px-2 py-2">
                    <Input disabled={kind === 'revenueLines' && Boolean(line.linkedCostLineId)} value={line.memberName} placeholder="성명/그룹" onChange={(event) => onLineChange(kind, index, { memberName: event.target.value })} />
                  </TableCell>
                ) : null}
                {isServiceLike ? (
                  <TableCell className="px-2 py-2">
                    <Input disabled={kind === 'revenueLines' && Boolean(line.linkedCostLineId)} value={line.grade} placeholder="등급" onChange={(event) => onLineChange(kind, index, { grade: event.target.value })} />
                  </TableCell>
                ) : null}
                {isServiceLike ? (
                  <TableCell className="px-2 py-2">
                    <NativeSelect disabled={kind === 'revenueLines' && Boolean(line.linkedCostLineId)} value={line.serviceType} onChange={(event) => onLineChange(kind, index, { serviceType: event.target.value as CrmOpportunityServiceType })}>
                      {Object.entries(serviceTypeLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                    </NativeSelect>
                  </TableCell>
                ) : null}
                <TableCell className="px-2 py-2">
                  <Input disabled={kind === 'revenueLines' && Boolean(line.linkedCostLineId)} type="number" min="0" step="0.01" value={line.quantity} className="text-right" placeholder="0" onChange={(event) => onLineChange(kind, index, { quantity: event.target.value })} />
                </TableCell>
                <TableCell className="px-2 py-2">
                  <Input disabled={kind === 'revenueLines' && Boolean(line.linkedCostLineId)} type="number" min="0" value={line.unitPrice} className="text-right" placeholder="0" onChange={(event) => onLineChange(kind, index, { unitPrice: event.target.value })} />
                </TableCell>
                <TableCell className="px-2 py-2">
                  <Input disabled={kind === 'revenueLines' && Boolean(line.linkedCostLineId)} type="number" min="0" value={line.truncUnit} className="text-right" placeholder="0" onChange={(event) => onLineChange(kind, index, { truncUnit: event.target.value })} />
                </TableCell>
                {kind === 'revenueLines' ? (
                  <TableCell className="px-2 py-2">
                    <Input disabled={Boolean(line.linkedCostLineId)} type="number" value={line.marginRate} className="text-right" placeholder="-" onChange={(event) => onLineChange(kind, index, { marginRate: event.target.value })} />
                  </TableCell>
                ) : null}
                {isCost ? (
                  <TableCell className="px-2 py-2 text-center">
                    <Checkbox
                      checked={line.revenueLinked}
                      onCheckedChange={(checked) => onLineChange(kind, index, {
                        revenueLinked: checked === true,
                        revenueUnitPrice: checked === true && !line.revenueUnitPrice ? line.unitPrice : checked === true ? line.revenueUnitPrice : '',
                      })}
                      aria-label="매출 연동"
                    />
                  </TableCell>
                ) : null}
                {isCost ? (
                  <TableCell className="px-2 py-2">
                    <Input disabled={!line.revenueLinked} type="number" min="0" value={line.revenueUnitPrice} className="text-right" placeholder="0" onChange={(event) => onLineChange(kind, index, { revenueUnitPrice: event.target.value })} />
                  </TableCell>
                ) : null}
                <TableCell className="px-2 py-2 text-right font-medium text-foreground">{formatWon(getDraftLineAmount(line))}</TableCell>
                <TableCell className="px-2 py-2">
                  <Button variant="ghost" size="icon" type="button" disabled={kind === 'revenueLines' && Boolean(line.linkedCostLineId)} title={line.linkedCostLineId ? '원가 연동 행' : '라인 삭제'} onClick={() => onRemoveLine(kind, index)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">라인 삭제</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {indexedLines.length === 0 ? (
              <TableRow>
                <TableCell className="px-3 py-4 text-center text-muted-foreground" colSpan={emptyColSpan}>{lineCategoryLabels[category]} 내역 없음</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Field({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={strong ? 'mt-1 font-semibold text-foreground' : 'mt-1 text-muted-foreground'}>{value}</dd>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold text-muted-foreground">{title}</h4>
      {children}
    </section>
  );
}

function LineTable({ lines }: { lines: CrmOpportunityLine[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table className="w-full text-xs">
        <TableHeader className="bg-ssoo-content-bg text-left text-muted-foreground">
          <TableRow>
            <TableHead className="px-3 py-2">구분/항목</TableHead>
            <TableHead className="w-[96px] px-3 py-2 text-right">수량</TableHead>
            <TableHead className="w-[112px] px-3 py-2 text-right">단가</TableHead>
            <TableHead className="w-[112px] px-3 py-2 text-right">금액</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border">
          {lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell className="px-3 py-2 text-muted-foreground">
                <div className="font-medium text-foreground">{lineCategoryLabels[line.category]} · {line.label}</div>
                {line.department || line.memberName || line.grade || line.serviceType ? (
                  <div className="mt-0.5 text-caption-2xs text-muted-foreground">
                    {[line.department, line.memberName, line.grade, line.serviceType ? serviceTypeLabels[line.serviceType] : undefined].filter(Boolean).join(' / ')}
                  </div>
                ) : null}
              </TableCell>
              <TableCell className="px-3 py-2 text-right text-muted-foreground">{line.quantity ?? '-'}</TableCell>
              <TableCell className="px-3 py-2 text-right text-muted-foreground">{line.unitPrice ? formatWon(line.unitPrice) : '-'}</TableCell>
              <TableCell className="px-3 py-2 text-right font-medium text-foreground">{formatCurrency(line.amount)}</TableCell>
            </TableRow>
          ))}
          {lines.length === 0 ? <TableRow><TableCell className="px-3 py-4 text-center text-muted-foreground" colSpan={4}>내역 없음</TableCell></TableRow> : null}
        </TableBody>
      </Table>
    </div>
  );
}

function BoundaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function TableFooter({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, total);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className="col-span-full flex min-h-[52px] items-center justify-between border-t border-border bg-muted px-4 py-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span>페이지당</span>
          <NativeSelect
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="w-[70px] bg-card px-2"
          >
            {[10, 20, 30, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </NativeSelect>
          <span>개</span>
        </div>
        <span>{startItem}-{endItem} / 총 {total.toLocaleString()}개</span>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" type="button" onClick={() => onPageChange(1)} disabled={!canGoPrevious}>
          <ChevronsLeft className="h-4 w-4" /><span className="sr-only">첫 페이지</span>
        </Button>
        <Button variant="outline" size="icon" type="button" onClick={() => onPageChange(page - 1)} disabled={!canGoPrevious}>
          <ChevronLeft className="h-4 w-4" /><span className="sr-only">이전 페이지</span>
        </Button>
        <div className="flex items-center gap-1 px-2">
          <span className="text-sm font-medium text-foreground">{page}</span>
          <span>/</span>
          <span>{totalPages}</span>
        </div>
        <Button variant="outline" size="icon" type="button" onClick={() => onPageChange(page + 1)} disabled={!canGoNext}>
          <ChevronRight className="h-4 w-4" /><span className="sr-only">다음 페이지</span>
        </Button>
        <Button variant="outline" size="icon" type="button" onClick={() => onPageChange(totalPages)} disabled={!canGoNext}>
          <ChevronsRight className="h-4 w-4" /><span className="sr-only">마지막 페이지</span>
        </Button>
      </div>
    </div>
  );
}
