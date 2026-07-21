'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, FilePlus2, PencilLine, Plus, Save, Trash2, Wand2 } from 'lucide-react';
import type {
  CrmBillingSplitPreviewResponse,
  CrmBillingSplitTarget,
  CrmContract,
  CrmContractStatus,
  CrmContractUpsertLine,
  CrmContractUpsertRequest,
  CrmOpportunityDiscountType,
  CrmOpportunityLineCategory,
  CrmOpportunityServiceType,
} from '@ssoo/types/crm';
import {
  Button,
  Checkbox,
  Input,
  NativeSelect,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@ssoo/web-ui';

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

type RevenueCategory = Extract<CrmOpportunityLineCategory, 'product' | 'service'>;
type CostCategory = Extract<CrmOpportunityLineCategory, 'product' | 'internal-cost' | 'external-cost'>;

interface ContractHeaderDraft {
  sourceOpportunityCode: string;
  customerName: string;
  contractName: string;
  ownerName: string;
  businessType: string;
  industryLine: string;
  region: 'domestic' | 'overseas';
  status: CrmContractStatus;
  contractStartDate: string;
  contractEndDate: string;
  wbsCode: string;
  paymentTermCode: string;
  specialDiscountType: CrmOpportunityDiscountType;
  specialDiscountValue: string;
  nextAction: string;
}

interface RevenueLineDraft {
  id: string;
  category: RevenueCategory;
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
}

interface CostLineDraft {
  id: string;
  category: CostCategory;
  label: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  department: string;
  memberName: string;
  grade: string;
  serviceType: CrmOpportunityServiceType;
}

interface BillingLineDraft {
  id: string;
  billingYm: string;
  revenueAmount: string;
  externalCostAmount: string;
}

interface SplitOptions {
  target: CrmBillingSplitTarget;
  periodMonths: string;
  truncUnit: string;
  includeLastMonth: boolean;
}

export interface ContractUpsertPanelProps {
  selected: CrmContract | null;
  accessToken: string | null;
  onSaved: (contract: CrmContract) => void | Promise<void>;
  onDeleted: (contractId: string) => void | Promise<void>;
}

let draftSequence = 0;

function createDraftId(prefix: string) {
  draftSequence += 1;
  return `${prefix}-${Date.now()}-${draftSequence}`;
}

function createBlankHeader(): ContractHeaderDraft {
  return {
    sourceOpportunityCode: '',
    customerName: '',
    contractName: '',
    ownerName: '',
    businessType: '',
    industryLine: '',
    region: 'domestic',
    status: 'review',
    contractStartDate: '',
    contractEndDate: '',
    wbsCode: '',
    paymentTermCode: '',
    specialDiscountType: 'amount',
    specialDiscountValue: '',
    nextAction: '계약 조건과 청구계획 검토',
  };
}

function createBlankRevenueLine(patch: Partial<RevenueLineDraft> = {}): RevenueLineDraft {
  return {
    id: createDraftId('rev'),
    category: 'service',
    label: '',
    quantity: '',
    unitPrice: '',
    amount: '',
    marginRate: '',
    truncUnit: '',
    department: '',
    memberName: '',
    grade: '',
    serviceType: 'internal',
    ...patch,
  };
}

function createBlankCostLine(patch: Partial<CostLineDraft> = {}): CostLineDraft {
  return {
    id: createDraftId('cost'),
    category: 'external-cost',
    label: '',
    quantity: '',
    unitPrice: '',
    amount: '',
    department: '',
    memberName: '',
    grade: '',
    serviceType: 'external',
    ...patch,
  };
}

function createBlankBillingLine(patch: Partial<BillingLineDraft> = {}): BillingLineDraft {
  return {
    id: createDraftId('bill'),
    billingYm: '',
    revenueAmount: '',
    externalCostAmount: '',
    ...patch,
  };
}

function normalizeNumericText(value: string, allowDecimal = false) {
  const normalized = allowDecimal ? value.replace(/[^0-9.]/g, '') : value.replace(/[^0-9]/g, '');
  if (!allowDecimal) {
    return normalized;
  }
  const [head, ...tail] = normalized.split('.');
  return tail.length > 0 ? `${head}.${tail.join('')}` : head;
}

function normalizeBillingYm(value: string) {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 6);
  return digits.length > 4 ? `${digits.slice(0, 4)}/${digits.slice(4)}` : digits;
}

function parseNumber(value: string) {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) {
    return 0;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumber(value: string) {
  const parsed = parseNumber(value);
  return parsed > 0 ? parsed : undefined;
}

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

function calculateLineAmount(line: { quantity: string; unitPrice: string; amount: string; truncUnit?: string }) {
  const quantity = parseNumber(line.quantity);
  const unitPrice = parseNumber(line.unitPrice);
  const directAmount = parseNumber(line.amount);
  const truncUnit = parseNumber(line.truncUnit ?? '');
  const rawAmount = quantity > 0 && unitPrice > 0 ? quantity * unitPrice : directAmount;
  if (truncUnit > 0) {
    return Math.floor(rawAmount / truncUnit) * truncUnit;
  }
  return Math.round(rawAmount);
}

function calculateDiscountAmount(subtotal: number, type: CrmOpportunityDiscountType, valueText: string) {
  const value = parseNumber(valueText);
  if (value <= 0 || subtotal <= 0) {
    return 0;
  }
  const discount = type === 'rate' ? Math.round(subtotal * value / 100) : Math.round(value);
  return Math.min(Math.max(discount, 0), subtotal);
}

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null): string {
  if (!responseBody || responseBody.success === true) {
    return 'CRM 계약 처리 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || 'CRM 계약 처리 중 오류가 발생했습니다.';
}

function createHeaderFromContract(contract: CrmContract): ContractHeaderDraft {
  return {
    sourceOpportunityCode: contract.sourceOpportunityCode ?? '',
    customerName: contract.customerName,
    contractName: contract.contractName,
    ownerName: contract.ownerName,
    businessType: contract.businessType,
    industryLine: contract.industryLine,
    region: contract.region,
    status: contract.status,
    contractStartDate: contract.contractStartDate,
    contractEndDate: contract.contractEndDate,
    wbsCode: contract.wbsCode ?? '',
    paymentTermCode: contract.paymentTermCode ?? '',
    specialDiscountType: contract.specialDiscountType,
    specialDiscountValue: contract.specialDiscountValue > 0 ? String(contract.specialDiscountValue) : '',
    nextAction: contract.nextAction,
  };
}

function createRevenueLineFromContractLine(line: CrmContract['revenueLines'][number]): RevenueLineDraft {
  return createBlankRevenueLine({
    id: line.id,
    category: line.category === 'product' ? 'product' : 'service',
    label: line.label,
    quantity: line.quantity === undefined ? '' : String(line.quantity),
    unitPrice: line.unitPrice === undefined ? '' : String(line.unitPrice),
    amount: line.quantity !== undefined && line.unitPrice !== undefined ? '' : String(line.amount),
    marginRate: line.marginRate === undefined ? '' : String(line.marginRate),
    truncUnit: line.truncUnit === undefined || line.truncUnit === 0 ? '' : String(line.truncUnit),
    department: line.department ?? '',
    memberName: line.memberName ?? '',
    grade: line.grade ?? '',
    serviceType: line.serviceType ?? 'internal',
  });
}

function createCostLineFromContractLine(line: CrmContract['costLines'][number]): CostLineDraft {
  const category: CostCategory = line.category === 'product'
    ? 'product'
    : line.category === 'external-cost'
      ? 'external-cost'
      : 'internal-cost';
  return createBlankCostLine({
    id: line.id,
    category,
    label: line.label,
    quantity: line.quantity === undefined ? '' : String(line.quantity),
    unitPrice: line.unitPrice === undefined ? '' : String(line.unitPrice),
    amount: line.quantity !== undefined && line.unitPrice !== undefined ? '' : String(line.amount),
    department: line.department ?? '',
    memberName: line.memberName ?? '',
    grade: line.grade ?? '',
    serviceType: line.serviceType ?? (category === 'external-cost' ? 'external' : 'internal'),
  });
}

function toUpsertLine(line: RevenueLineDraft | CostLineDraft): CrmContractUpsertLine {
  const amount = calculateLineAmount(line);
  const base: CrmContractUpsertLine = {
    id: line.id,
    category: line.category,
    label: line.label.trim(),
    quantity: optionalNumber(line.quantity),
    unitPrice: optionalNumber(line.unitPrice),
    amount,
    department: line.department.trim() || undefined,
    memberName: line.memberName.trim() || undefined,
    grade: line.grade.trim() || undefined,
    serviceType: line.category === 'product' ? undefined : line.serviceType,
  };

  if ('marginRate' in line) {
    base.marginRate = optionalNumber(line.marginRate);
    base.truncUnit = optionalNumber(line.truncUnit);
  }

  return base;
}

export function ContractUpsertPanel({ selected, accessToken, onSaved, onDeleted }: ContractUpsertPanelProps) {
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [header, setHeader] = useState<ContractHeaderDraft>(() => createBlankHeader());
  const [revenueLines, setRevenueLines] = useState<RevenueLineDraft[]>(() => [createBlankRevenueLine()]);
  const [costLines, setCostLines] = useState<CostLineDraft[]>(() => [createBlankCostLine()]);
  const [billingLines, setBillingLines] = useState<BillingLineDraft[]>([]);
  const [splitOptions, setSplitOptions] = useState<SplitOptions>({
    target: 'both',
    periodMonths: '1',
    truncUnit: '1000',
    includeLastMonth: true,
  });
  const [splitPreview, setSplitPreview] = useState<CrmBillingSplitPreviewResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const totals = useMemo(() => {
    const revenueSubtotal = revenueLines.reduce((sum, line) => sum + calculateLineAmount(line), 0);
    const specialDiscountAmount = calculateDiscountAmount(revenueSubtotal, header.specialDiscountType, header.specialDiscountValue);
    const revenueTotal = Math.max(revenueSubtotal - specialDiscountAmount, 0);
    const costTotal = costLines.reduce((sum, line) => sum + calculateLineAmount(line), 0);
    const externalCostTotal = costLines.reduce((sum, line) => {
      if (line.category === 'product' || line.category === 'external-cost' || line.serviceType === 'external') {
        return sum + calculateLineAmount(line);
      }
      return sum;
    }, 0);
    const billingRevenueTotal = billingLines.reduce((sum, line) => sum + parseNumber(line.revenueAmount), 0);
    const billingExternalCostTotal = billingLines.reduce((sum, line) => sum + parseNumber(line.externalCostAmount), 0);
    const marginTotal = revenueTotal - costTotal;

    return {
      revenueSubtotal,
      specialDiscountAmount,
      revenueTotal,
      costTotal,
      externalCostTotal,
      billingRevenueTotal,
      billingExternalCostTotal,
      revenueDelta: billingRevenueTotal - revenueTotal,
      externalCostDelta: billingExternalCostTotal - externalCostTotal,
      marginRate: revenueTotal > 0 ? Math.round((marginTotal / revenueTotal) * 10000) / 100 : 0,
    };
  }, [billingLines, costLines, header.specialDiscountType, header.specialDiscountValue, revenueLines]);

  const loadSelected = useCallback(() => {
    if (!selected) {
      return;
    }

    setMode('edit');
    setEditingId(selected.id);
    setHeader(createHeaderFromContract(selected));
    setRevenueLines(selected.revenueLines.length > 0 ? selected.revenueLines.map(createRevenueLineFromContractLine) : [createBlankRevenueLine()]);
    setCostLines(selected.costLines.length > 0 ? selected.costLines.map(createCostLineFromContractLine) : [createBlankCostLine()]);
    setBillingLines(selected.billingPlan.map((line) => createBlankBillingLine({
      id: line.id,
      billingYm: line.billingYm,
      revenueAmount: String(line.revenueAmount),
      externalCostAmount: String(line.externalCostAmount),
    })));
    setSplitPreview(null);
    setFormError(null);
    setFormMessage(null);
  }, [selected]);

  useEffect(() => {
    if (selected && mode === 'edit' && editingId === selected.id) {
      loadSelected();
    }
  }, [editingId, loadSelected, mode, selected]);

  const resetCreate = useCallback(() => {
    setMode('create');
    setEditingId(null);
    setHeader(createBlankHeader());
    setRevenueLines([createBlankRevenueLine()]);
    setCostLines([createBlankCostLine()]);
    setBillingLines([]);
    setSplitPreview(null);
    setFormError(null);
    setFormMessage(null);
  }, []);

  const setHeaderField = useCallback(<K extends keyof ContractHeaderDraft>(key: K, value: ContractHeaderDraft[K]) => {
    setHeader((current) => ({ ...current, [key]: value }));
    setFormError(null);
    setFormMessage(null);
  }, []);

  const updateRevenueLine = useCallback((id: string, patch: Partial<RevenueLineDraft>) => {
    setRevenueLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
    setFormError(null);
    setFormMessage(null);
  }, []);

  const updateCostLine = useCallback((id: string, patch: Partial<CostLineDraft>) => {
    setCostLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
    setFormError(null);
    setFormMessage(null);
  }, []);

  const updateBillingLine = useCallback((id: string, patch: Partial<BillingLineDraft>) => {
    setBillingLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
    setFormError(null);
    setFormMessage(null);
  }, []);

  const validateForm = useCallback(() => {
    if (!accessToken) {
      return '로그인 세션을 확인해 주세요.';
    }
    if (mode === 'edit' && selected?.confirmed) {
      return '확정된 계약은 수정할 수 없습니다. 확정 해제 후 수정해 주세요.';
    }
    if (!header.customerName.trim() || !header.contractName.trim()) {
      return '고객사명과 계약명은 필수입니다.';
    }
    if (!header.ownerName.trim()) {
      return '담당자명은 필수입니다.';
    }
    if (!header.businessType.trim() || !header.industryLine.trim()) {
      return '사업구분과 계열/산업 구분은 필수입니다.';
    }
    if (!header.contractStartDate || !header.contractEndDate) {
      return '계약 시작일과 종료일은 필수입니다.';
    }
    if (new Date(header.contractEndDate).getTime() < new Date(header.contractStartDate).getTime()) {
      return '계약 종료일은 시작일 이후여야 합니다.';
    }

    const normalizedRevenueLines = revenueLines
      .filter((line) => line.label.trim() || calculateLineAmount(line) > 0);
    if (normalizedRevenueLines.length === 0) {
      return '매출 라인을 1건 이상 입력해 주세요.';
    }
    if (normalizedRevenueLines.some((line) => !line.label.trim() || calculateLineAmount(line) <= 0)) {
      return '매출 라인은 항목명과 금액이 모두 필요합니다.';
    }
    const invalidCostLine = costLines
      .filter((line) => line.label.trim() || calculateLineAmount(line) > 0)
      .some((line) => !line.label.trim() || calculateLineAmount(line) <= 0);
    if (invalidCostLine) {
      return '원가 라인은 항목명과 금액이 모두 필요합니다.';
    }

    const activeBillingLines = billingLines
      .filter((line) => line.billingYm.trim() || parseNumber(line.revenueAmount) > 0 || parseNumber(line.externalCostAmount) > 0);
    const seenBillingYm = new Set<string>();
    for (const line of activeBillingLines) {
      if (!/^\d{4}\/(0[1-9]|1[0-2])$/.test(line.billingYm)) {
        return '청구 예정월은 YYYY/MM 형식이어야 합니다.';
      }
      if (seenBillingYm.has(line.billingYm)) {
        return `청구 예정월이 중복되었습니다: ${line.billingYm}`;
      }
      seenBillingYm.add(line.billingYm);
    }
    if (activeBillingLines.length > 0 && (totals.revenueDelta !== 0 || totals.externalCostDelta !== 0)) {
      return `청구계획 합계가 계약금액과 일치하지 않습니다. 매출 차이 ${formatWon(Math.abs(totals.revenueDelta))}, 외부원가 차이 ${formatWon(Math.abs(totals.externalCostDelta))}`;
    }

    return null;
  }, [accessToken, billingLines, costLines, header, mode, revenueLines, selected?.confirmed, totals.externalCostDelta, totals.revenueDelta]);

  const buildPayload = useCallback((): CrmContractUpsertRequest => {
    return {
      sourceOpportunityCode: header.sourceOpportunityCode.trim() || undefined,
      customerName: header.customerName.trim(),
      contractName: header.contractName.trim(),
      ownerName: header.ownerName.trim(),
      businessType: header.businessType.trim(),
      industryLine: header.industryLine.trim(),
      region: header.region,
      status: header.status,
      contractStartDate: header.contractStartDate,
      contractEndDate: header.contractEndDate,
      wbsCode: header.wbsCode.trim() || undefined,
      paymentTermCode: header.paymentTermCode.trim() || undefined,
      specialDiscountType: header.specialDiscountType,
      specialDiscountValue: optionalNumber(header.specialDiscountValue),
      revenueLines: revenueLines
        .filter((line) => line.label.trim() || calculateLineAmount(line) > 0)
        .map(toUpsertLine),
      costLines: costLines
        .filter((line) => line.label.trim() || calculateLineAmount(line) > 0)
        .map(toUpsertLine),
      billingPlan: billingLines
        .filter((line) => line.billingYm.trim() || parseNumber(line.revenueAmount) > 0 || parseNumber(line.externalCostAmount) > 0)
        .map((line) => ({
          billingYm: line.billingYm,
          revenueAmount: parseNumber(line.revenueAmount),
          externalCostAmount: parseNumber(line.externalCostAmount),
        })),
      nextAction: header.nextAction.trim() || undefined,
    };
  }, [billingLines, costLines, header, revenueLines]);

  const previewSplit = useCallback(async () => {
    const baseError = !accessToken
      ? '로그인 세션을 확인해 주세요.'
      : !header.contractStartDate || !header.contractEndDate
        ? '계약 시작일과 종료일을 먼저 입력해 주세요.'
        : null;
    if (baseError) {
      setFormError(baseError);
      return;
    }

    setIsPreviewLoading(true);
    setFormError(null);
    setFormMessage(null);
    try {
      const response = await fetch('/api/crm/contracts/billing-split-preview', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: header.contractStartDate,
          endDate: header.contractEndDate,
          totalRevenue: totals.revenueTotal,
          totalExternalCost: totals.externalCostTotal,
          target: splitOptions.target,
          periodMonths: optionalNumber(splitOptions.periodMonths) ?? 1,
          truncUnit: optionalNumber(splitOptions.truncUnit) ?? 1,
          includeLastMonth: splitOptions.includeLastMonth,
        }),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmBillingSplitPreviewResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setSplitPreview(payload.data);
    } catch (error) {
      setSplitPreview(null);
      setFormError(error instanceof Error ? error.message : '청구계획 자동분할 미리보기에 실패했습니다.');
    } finally {
      setIsPreviewLoading(false);
    }
  }, [accessToken, header.contractEndDate, header.contractStartDate, splitOptions, totals.externalCostTotal, totals.revenueTotal]);

  const applySplitPreview = useCallback(() => {
    if (!splitPreview) {
      return;
    }
    setBillingLines(splitPreview.lines.map((line) => createBlankBillingLine({
      billingYm: line.billingYm,
      revenueAmount: line.revenueAmount > 0 ? String(line.revenueAmount) : '',
      externalCostAmount: line.externalCostAmount > 0 ? String(line.externalCostAmount) : '',
    })));
    setFormError(null);
    setFormMessage(`${splitPreview.lines.length}건의 청구계획을 적용했습니다.`);
  }, [splitPreview]);

  const saveContract = useCallback(async () => {
    const validationMessage = validateForm();
    if (validationMessage) {
      setFormError(validationMessage);
      setFormMessage(null);
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setFormMessage(null);
    try {
      const payload = buildPayload();
      const endpoint = mode === 'edit' && editingId
        ? `/api/crm/contracts/${encodeURIComponent(editingId)}`
        : '/api/crm/contracts';
      const response = await fetch(endpoint, {
        method: mode === 'edit' && editingId ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const responseBody = await response.json().catch(() => null) as BackendSuccessResponse<CrmContract> | BackendErrorResponse | null;
      if (!response.ok || responseBody?.success !== true) {
        throw new Error(getBackendErrorMessage(responseBody));
      }
      setMode('edit');
      setEditingId(responseBody.data.id);
      setFormMessage('계약이 저장되었습니다.');
      await onSaved(responseBody.data);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '계약 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [accessToken, buildPayload, editingId, mode, onSaved, validateForm]);

  const deleteContract = useCallback(async () => {
    if (!accessToken || mode !== 'edit' || !editingId) {
      setFormError('삭제할 계약을 먼저 불러와 주세요.');
      return;
    }
    if (selected?.confirmed) {
      setFormError('확정된 계약은 삭제할 수 없습니다. 확정 해제 후 삭제해 주세요.');
      return;
    }
    if (!window.confirm('이 계약을 삭제하시겠습니까?')) {
      return;
    }

    setIsDeleting(true);
    setFormError(null);
    setFormMessage(null);
    try {
      const response = await fetch(`/api/crm/contracts/${encodeURIComponent(editingId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const responseBody = await response.json().catch(() => null) as BackendSuccessResponse<{ id: string; deleted: true }> | BackendErrorResponse | null;
      if (!response.ok || responseBody?.success !== true) {
        throw new Error(getBackendErrorMessage(responseBody));
      }
      const deletedId = editingId;
      resetCreate();
      await onDeleted(deletedId);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '계약 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  }, [accessToken, editingId, mode, onDeleted, resetCreate, selected?.confirmed]);

  const isReadOnly = mode === 'edit' && selected?.id === editingId && selected.confirmed;

  return (
    <section className="rounded-md border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{mode === 'edit' ? '계약 수정' : '계약 등록'}</h2>
          <p className="mt-1 text-sm text-muted-foreground">계약 기본정보, 매출/원가 라인, 청구계획을 한 번에 저장합니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" type="button" onClick={resetCreate}>
            <FilePlus2 className="mr-2 h-4 w-4" />
            신규
          </Button>
          <Button variant="outline" size="sm" type="button" onClick={loadSelected} disabled={!selected}>
            <PencilLine className="mr-2 h-4 w-4" />
            선택 계약 불러오기
          </Button>
          <Button size="sm" type="button" onClick={() => void saveContract()} disabled={isSaving || isReadOnly}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? '저장 중' : '저장'}
          </Button>
          <Button variant="outline" size="sm" type="button" onClick={() => void deleteContract()} disabled={mode !== 'edit' || isReadOnly || isDeleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? '삭제 중' : '삭제'}
          </Button>
        </div>
      </div>

      {isReadOnly ? (
        <div className="flex items-center gap-2 border-b bg-ssoo-warning-bg px-4 py-3 text-sm text-ssoo-warning">
          <AlertCircle className="h-4 w-4" />
          확정된 계약입니다. 수정하려면 먼저 확정 해제를 진행하세요.
        </div>
      ) : null}

      {formError ? (
        <div className="flex items-center gap-2 border-b bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">
          <AlertCircle className="h-4 w-4" />
          {formError}
        </div>
      ) : null}
      {formMessage ? (
        <div className="flex items-center gap-2 border-b bg-ssoo-success-bg px-4 py-3 text-sm text-ssoo-success">
          <CheckCircle2 className="h-4 w-4" />
          {formMessage}
        </div>
      ) : null}

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <HeaderFields header={header} isReadOnly={isReadOnly} onChange={setHeaderField} />
          <RevenueLineEditor lines={revenueLines} isReadOnly={isReadOnly} onAdd={() => setRevenueLines((current) => [...current, createBlankRevenueLine()])} onRemove={(id) => setRevenueLines((current) => current.filter((line) => line.id !== id))} onUpdate={updateRevenueLine} />
          <CostLineEditor lines={costLines} isReadOnly={isReadOnly} onAdd={() => setCostLines((current) => [...current, createBlankCostLine()])} onRemove={(id) => setCostLines((current) => current.filter((line) => line.id !== id))} onUpdate={updateCostLine} />
          <BillingLineEditor lines={billingLines} isReadOnly={isReadOnly} onAdd={() => setBillingLines((current) => [...current, createBlankBillingLine()])} onRemove={(id) => setBillingLines((current) => current.filter((line) => line.id !== id))} onUpdate={updateBillingLine} />
        </div>

        <aside className="space-y-4">
          <TotalsPanel totals={totals} billingCount={billingLines.length} />
          <SplitPanel
            options={splitOptions}
            preview={splitPreview}
            isLoading={isPreviewLoading}
            isReadOnly={isReadOnly}
            onOptionsChange={setSplitOptions}
            onPreview={() => void previewSplit()}
            onApply={applySplitPreview}
          />
        </aside>
      </div>
    </section>
  );
}

function HeaderFields({
  header,
  isReadOnly,
  onChange,
}: {
  header: ContractHeaderDraft;
  isReadOnly: boolean;
  onChange: <K extends keyof ContractHeaderDraft>(key: K, value: ContractHeaderDraft[K]) => void;
}) {
  return (
    <div className="rounded-md border p-4">
      <h3 className="text-sm font-semibold text-foreground">기본 정보</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="고객사명">
          <Input value={header.customerName} disabled={isReadOnly} onChange={(event) => onChange('customerName', event.currentTarget.value)} />
        </Field>
        <Field label="계약명">
          <Input value={header.contractName} disabled={isReadOnly} onChange={(event) => onChange('contractName', event.currentTarget.value)} />
        </Field>
        <Field label="담당자">
          <Input value={header.ownerName} disabled={isReadOnly} onChange={(event) => onChange('ownerName', event.currentTarget.value)} />
        </Field>
        <Field label="원천 영업기회">
          <Input value={header.sourceOpportunityCode} disabled={isReadOnly} placeholder="crm-opp-..." onChange={(event) => onChange('sourceOpportunityCode', event.currentTarget.value)} />
        </Field>
        <Field label="사업구분">
          <Input value={header.businessType} disabled={isReadOnly} onChange={(event) => onChange('businessType', event.currentTarget.value)} />
        </Field>
        <Field label="계열/산업">
          <Input value={header.industryLine} disabled={isReadOnly} onChange={(event) => onChange('industryLine', event.currentTarget.value)} />
        </Field>
        <Field label="국내/해외">
          <NativeSelect value={header.region} disabled={isReadOnly} onChange={(event) => onChange('region', event.currentTarget.value as ContractHeaderDraft['region'])}>
            <option value="domestic">국내</option>
            <option value="overseas">해외</option>
          </NativeSelect>
        </Field>
        <Field label="상태">
          <NativeSelect value={header.status} disabled={isReadOnly} onChange={(event) => onChange('status', event.currentTarget.value as CrmContractStatus)}>
            <option value="review">검토</option>
            <option value="active">계약중</option>
            <option value="completed">계약완료</option>
            <option value="terminated">해지</option>
          </NativeSelect>
        </Field>
        <Field label="시작일">
          <Input type="date" value={header.contractStartDate} disabled={isReadOnly} onChange={(event) => onChange('contractStartDate', event.currentTarget.value)} />
        </Field>
        <Field label="종료일">
          <Input type="date" value={header.contractEndDate} disabled={isReadOnly} onChange={(event) => onChange('contractEndDate', event.currentTarget.value)} />
        </Field>
        <Field label="WBS">
          <Input value={header.wbsCode} disabled={isReadOnly} onChange={(event) => onChange('wbsCode', event.currentTarget.value)} />
        </Field>
        <Field label="수금조건">
          <Input value={header.paymentTermCode} disabled={isReadOnly} placeholder="NET30" onChange={(event) => onChange('paymentTermCode', event.currentTarget.value)} />
        </Field>
        <Field label="Special DC 유형">
          <NativeSelect value={header.specialDiscountType} disabled={isReadOnly} onChange={(event) => onChange('specialDiscountType', event.currentTarget.value as CrmOpportunityDiscountType)}>
            <option value="amount">금액</option>
            <option value="rate">율</option>
          </NativeSelect>
        </Field>
        <Field label={header.specialDiscountType === 'rate' ? 'Special DC (%)' : 'Special DC 금액'}>
          <Input value={header.specialDiscountValue} disabled={isReadOnly} onChange={(event) => onChange('specialDiscountValue', normalizeNumericText(event.currentTarget.value, header.specialDiscountType === 'rate'))} />
        </Field>
        <div className="md:col-span-2">
          <Field label="다음 행동">
            <Textarea value={header.nextAction} disabled={isReadOnly} onChange={(event) => onChange('nextAction', event.currentTarget.value)} />
          </Field>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-muted-foreground">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function RevenueLineEditor({
  lines,
  isReadOnly,
  onAdd,
  onRemove,
  onUpdate,
}: {
  lines: RevenueLineDraft[];
  isReadOnly: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<RevenueLineDraft>) => void;
}) {
  return (
    <LineSection title="매출 라인" onAdd={onAdd} isReadOnly={isReadOnly}>
      <Table className="min-w-[1180px] text-sm">
        <TableHeader className="bg-ssoo-content-bg text-left text-muted-foreground">
          <TableRow>
            <TableHead className="w-[104px] px-2 py-2">구분</TableHead>
            <TableHead className="w-[220px] px-2 py-2">항목</TableHead>
            <TableHead className="w-[92px] px-2 py-2">수량</TableHead>
            <TableHead className="w-[128px] px-2 py-2">단가</TableHead>
            <TableHead className="w-[128px] px-2 py-2">직접금액</TableHead>
            <TableHead className="w-[92px] px-2 py-2">마진율</TableHead>
            <TableHead className="w-[104px] px-2 py-2">절사</TableHead>
            <TableHead className="w-[120px] px-2 py-2">소속</TableHead>
            <TableHead className="w-[120px] px-2 py-2">성명/그룹</TableHead>
            <TableHead className="w-[120px] px-2 py-2 text-right">금액</TableHead>
            <TableHead className="w-[64px] px-2 py-2"><span className="sr-only">삭제</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell className="px-2 py-2">
                <NativeSelect value={line.category} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { category: event.currentTarget.value as RevenueCategory })}>
                  <option value="product">상품</option>
                  <option value="service">용역</option>
                </NativeSelect>
              </TableCell>
              <TableCell className="px-2 py-2"><Input value={line.label} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { label: event.currentTarget.value })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.quantity} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { quantity: normalizeNumericText(event.currentTarget.value, true) })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.unitPrice} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { unitPrice: normalizeNumericText(event.currentTarget.value) })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.amount} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { amount: normalizeNumericText(event.currentTarget.value) })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.marginRate} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { marginRate: normalizeNumericText(event.currentTarget.value, true) })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.truncUnit} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { truncUnit: normalizeNumericText(event.currentTarget.value) })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.department} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { department: event.currentTarget.value })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.memberName} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { memberName: event.currentTarget.value })} /></TableCell>
              <TableCell className="px-2 py-2 text-right font-medium text-foreground">{formatWon(calculateLineAmount(line))}</TableCell>
              <TableCell className="px-2 py-2">
                <Button variant="ghost" size="icon" type="button" onClick={() => onRemove(line.id)} disabled={isReadOnly || lines.length <= 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </LineSection>
  );
}

function CostLineEditor({
  lines,
  isReadOnly,
  onAdd,
  onRemove,
  onUpdate,
}: {
  lines: CostLineDraft[];
  isReadOnly: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<CostLineDraft>) => void;
}) {
  return (
    <LineSection title="원가 라인" onAdd={onAdd} isReadOnly={isReadOnly}>
      <Table className="min-w-[1060px] text-sm">
        <TableHeader className="bg-ssoo-content-bg text-left text-muted-foreground">
          <TableRow>
            <TableHead className="w-[132px] px-2 py-2">구분</TableHead>
            <TableHead className="w-[220px] px-2 py-2">항목</TableHead>
            <TableHead className="w-[92px] px-2 py-2">수량</TableHead>
            <TableHead className="w-[128px] px-2 py-2">단가</TableHead>
            <TableHead className="w-[128px] px-2 py-2">직접금액</TableHead>
            <TableHead className="w-[120px] px-2 py-2">소속</TableHead>
            <TableHead className="w-[120px] px-2 py-2">성명/그룹</TableHead>
            <TableHead className="w-[120px] px-2 py-2 text-right">금액</TableHead>
            <TableHead className="w-[64px] px-2 py-2"><span className="sr-only">삭제</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell className="px-2 py-2">
                <NativeSelect
                  value={line.category}
                  disabled={isReadOnly}
                  onChange={(event) => {
                    const category = event.currentTarget.value as CostCategory;
                    onUpdate(line.id, {
                      category,
                      serviceType: category === 'external-cost' ? 'external' : 'internal',
                    });
                  }}
                >
                  <option value="product">상품원가</option>
                  <option value="internal-cost">내부용역</option>
                  <option value="external-cost">외부용역</option>
                </NativeSelect>
              </TableCell>
              <TableCell className="px-2 py-2"><Input value={line.label} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { label: event.currentTarget.value })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.quantity} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { quantity: normalizeNumericText(event.currentTarget.value, true) })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.unitPrice} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { unitPrice: normalizeNumericText(event.currentTarget.value) })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.amount} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { amount: normalizeNumericText(event.currentTarget.value) })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.department} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { department: event.currentTarget.value })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.memberName} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { memberName: event.currentTarget.value })} /></TableCell>
              <TableCell className="px-2 py-2 text-right font-medium text-foreground">{formatWon(calculateLineAmount(line))}</TableCell>
              <TableCell className="px-2 py-2">
                <Button variant="ghost" size="icon" type="button" onClick={() => onRemove(line.id)} disabled={isReadOnly || lines.length <= 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </LineSection>
  );
}

function BillingLineEditor({
  lines,
  isReadOnly,
  onAdd,
  onRemove,
  onUpdate,
}: {
  lines: BillingLineDraft[];
  isReadOnly: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<BillingLineDraft>) => void;
}) {
  return (
    <LineSection title="청구계획" onAdd={onAdd} isReadOnly={isReadOnly}>
      <Table className="min-w-[680px] text-sm">
        <TableHeader className="bg-ssoo-content-bg text-left text-muted-foreground">
          <TableRow>
            <TableHead className="w-[140px] px-2 py-2">예정월</TableHead>
            <TableHead className="w-[180px] px-2 py-2">매출</TableHead>
            <TableHead className="w-[180px] px-2 py-2">외부원가</TableHead>
            <TableHead className="w-[64px] px-2 py-2"><span className="sr-only">삭제</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.length === 0 ? (
            <TableRow>
              <TableCell className="px-2 py-4 text-center text-muted-foreground" colSpan={4}>청구계획을 추가하거나 자동분할을 적용하세요.</TableCell>
            </TableRow>
          ) : null}
          {lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell className="px-2 py-2"><Input value={line.billingYm} disabled={isReadOnly} placeholder="YYYY/MM" onChange={(event) => onUpdate(line.id, { billingYm: normalizeBillingYm(event.currentTarget.value) })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.revenueAmount} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { revenueAmount: normalizeNumericText(event.currentTarget.value) })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.externalCostAmount} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { externalCostAmount: normalizeNumericText(event.currentTarget.value) })} /></TableCell>
              <TableCell className="px-2 py-2">
                <Button variant="ghost" size="icon" type="button" onClick={() => onRemove(line.id)} disabled={isReadOnly}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </LineSection>
  );
}

function LineSection({
  title,
  children,
  onAdd,
  isReadOnly,
}: {
  title: string;
  children: ReactNode;
  onAdd: () => void;
  isReadOnly: boolean;
}) {
  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Button variant="outline" size="sm" type="button" onClick={onAdd} disabled={isReadOnly}>
          <Plus className="mr-2 h-4 w-4" />
          행 추가
        </Button>
      </div>
      <div className="overflow-auto">{children}</div>
    </div>
  );
}

function TotalsPanel({
  totals,
  billingCount,
}: {
  totals: {
    revenueSubtotal: number;
    specialDiscountAmount: number;
    revenueTotal: number;
    costTotal: number;
    externalCostTotal: number;
    billingRevenueTotal: number;
    billingExternalCostTotal: number;
    revenueDelta: number;
    externalCostDelta: number;
    marginRate: number;
  };
  billingCount: number;
}) {
  const matched = billingCount > 0 && totals.revenueDelta === 0 && totals.externalCostDelta === 0;
  return (
    <div className="rounded-md border p-4">
      <h3 className="text-sm font-semibold text-foreground">계약 합계</h3>
      <dl className="mt-3 space-y-2 text-sm">
        <TotalRow label="매출 subtotal" value={formatWon(totals.revenueSubtotal)} />
        <TotalRow label="Special DC" value={`-${formatWon(totals.specialDiscountAmount)}`} />
        <TotalRow label="최종 매출" value={formatWon(totals.revenueTotal)} strong />
        <TotalRow label="원가" value={formatWon(totals.costTotal)} />
        <TotalRow label="외부원가" value={formatWon(totals.externalCostTotal)} />
        <TotalRow label="손익률" value={`${totals.marginRate}%`} strong />
      </dl>
      <div className={`mt-4 rounded-md px-3 py-2 text-xs ${matched ? 'bg-ssoo-success-bg text-ssoo-success' : 'bg-ssoo-warning-bg text-ssoo-warning'}`}>
        {billingCount === 0
          ? '청구계획은 저장 전 선택 입력이며, 확정 전에는 1건 이상 필요합니다.'
          : matched
            ? '청구계획 합계가 계약금액과 일치합니다.'
            : `청구계획 차이: 매출 ${formatWon(Math.abs(totals.revenueDelta))}, 외부원가 ${formatWon(Math.abs(totals.externalCostDelta))}`}
      </div>
    </div>
  );
}

function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? 'font-semibold text-foreground' : 'font-medium text-foreground'}>{value}</dd>
    </div>
  );
}

function SplitPanel({
  options,
  preview,
  isLoading,
  isReadOnly,
  onOptionsChange,
  onPreview,
  onApply,
}: {
  options: SplitOptions;
  preview: CrmBillingSplitPreviewResponse | null;
  isLoading: boolean;
  isReadOnly: boolean;
  onOptionsChange: (options: SplitOptions) => void;
  onPreview: () => void;
  onApply: () => void;
}) {
  return (
    <div className="rounded-md border p-4">
      <h3 className="text-sm font-semibold text-foreground">청구 자동분할</h3>
      <div className="mt-3 grid gap-3">
        <Field label="분할 대상">
          <NativeSelect value={options.target} disabled={isReadOnly} onChange={(event) => onOptionsChange({ ...options, target: event.currentTarget.value as CrmBillingSplitTarget })}>
            <option value="both">매출+외부원가</option>
            <option value="revenue">매출만</option>
            <option value="external-cost">외부원가만</option>
          </NativeSelect>
        </Field>
        <Field label="분할 주기(개월)">
          <Input value={options.periodMonths} disabled={isReadOnly} onChange={(event) => onOptionsChange({ ...options, periodMonths: normalizeNumericText(event.currentTarget.value) })} />
        </Field>
        <Field label="절사 단위">
          <NativeSelect value={options.truncUnit} disabled={isReadOnly} onChange={(event) => onOptionsChange({ ...options, truncUnit: event.currentTarget.value })}>
            <option value="1">절사 없음</option>
            <option value="1000">1,000</option>
            <option value="10000">10,000</option>
            <option value="100000">100,000</option>
          </NativeSelect>
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Checkbox checked={options.includeLastMonth} disabled={isReadOnly} onCheckedChange={(checked) => onOptionsChange({ ...options, includeLastMonth: checked === true })} />
          종료월 포함
        </label>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" type="button" onClick={onPreview} disabled={isLoading || isReadOnly}>
            <Wand2 className="mr-2 h-4 w-4" />
            {isLoading ? '계산 중' : '미리보기'}
          </Button>
          <Button size="sm" type="button" onClick={onApply} disabled={!preview || isReadOnly}>
            적용
          </Button>
        </div>
      </div>

      {preview ? (
        <div className="mt-4 overflow-auto rounded-md border">
          <Table className="w-full text-xs">
            <TableHeader className="bg-ssoo-content-bg text-left text-muted-foreground">
              <TableRow>
                <TableHead className="px-2 py-2">예정월</TableHead>
                <TableHead className="px-2 py-2 text-right">매출</TableHead>
                <TableHead className="px-2 py-2 text-right">외부원가</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.lines.map((line) => (
                <TableRow key={line.billingYm}>
                  <TableCell className="px-2 py-2 font-medium text-foreground">{line.billingYm}</TableCell>
                  <TableCell className="px-2 py-2 text-right text-muted-foreground">{formatWon(line.revenueAmount)}</TableCell>
                  <TableCell className="px-2 py-2 text-right text-muted-foreground">{formatWon(line.externalCostAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
