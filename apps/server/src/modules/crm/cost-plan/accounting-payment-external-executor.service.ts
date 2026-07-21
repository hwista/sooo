import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  CrmCostPlanAccountingPaymentExecutionArtifact,
  CrmCostPlanAccountingPaymentExecutionStepKey,
  CrmCostPlanAccountingPaymentLine,
  CrmCostPlanPreviewRegion,
} from '@ssoo/types/crm';

const CRM_ACCOUNTING_PAYMENT_EXECUTION_STEP_KEYS = [
  'accounting-voucher',
  'payment-request',
  'payment-execution',
  'external-system-sync',
] as const satisfies readonly CrmCostPlanAccountingPaymentExecutionStepKey[];

export interface AccountingPaymentExternalExecutionPayload {
  handoffId: string;
  executionId: string;
  executedAt: string;
  targetYear: number;
  businessTypeFilter: string;
  industryLineFilter: string;
  regionFilter: CrmCostPlanPreviewRegion;
  searchFilter: string;
  lineCount: number;
  settlementAmountTotal: number;
  lines: CrmCostPlanAccountingPaymentLine[];
  memo?: string;
  requestedBy?: string;
}

export interface AccountingPaymentExternalExecutionResult {
  executionId: string;
  executedAt: string;
  settlementAmountTotal: number;
  providerName: string;
  providerRequestId?: string;
  artifacts: CrmCostPlanAccountingPaymentExecutionArtifact[];
}

interface ExternalExecutionResponseObject {
  executionId?: unknown;
  executedAt?: unknown;
  providerName?: unknown;
  providerRequestId?: unknown;
  requestId?: unknown;
  artifacts?: unknown;
  steps?: unknown;
}

@Injectable()
export class AccountingPaymentExternalExecutorService {
  isConfigured(): boolean {
    return Boolean(this.resolveEndpointUrl());
  }

  async execute(payload: AccountingPaymentExternalExecutionPayload): Promise<AccountingPaymentExternalExecutionResult> {
    const endpointUrl = this.resolveEndpointUrl();
    if (!endpointUrl) {
      throw new ServiceUnavailableException('CRM 외부 회계·지급 API URL이 설정되지 않았습니다.');
    }

    const responsePayload = await this.postExecutionRequest(endpointUrl, payload);
    return this.normalizeExecutionResponse(responsePayload, payload);
  }

  private async postExecutionRequest(
    endpointUrl: string,
    payload: AccountingPaymentExternalExecutionPayload,
  ): Promise<unknown> {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), this.resolveTimeoutMs());
    if (typeof timeout === 'object' && 'unref' in timeout && typeof timeout.unref === 'function') {
      timeout.unref();
    }
    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });
      const responseText = await response.text();
      if (!response.ok) {
        throw new ServiceUnavailableException(`외부 회계·지급 API 호출 실패: ${response.status}`);
      }
      if (!responseText.trim()) {
        throw new ServiceUnavailableException('외부 회계·지급 API 응답이 비어 있습니다.');
      }
      try {
        return JSON.parse(responseText) as unknown;
      } catch {
        throw new ServiceUnavailableException('외부 회계·지급 API 응답 JSON을 해석할 수 없습니다.');
      }
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException('외부 회계·지급 API 호출 중 오류가 발생했습니다.');
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'application/json',
    };
    const token = process.env.CRM_ACCOUNTING_PAYMENT_API_TOKEN?.trim();
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }
    const tenant = process.env.CRM_ACCOUNTING_PAYMENT_API_TENANT?.trim();
    if (tenant) {
      headers['x-ssoo-tenant'] = tenant;
    }
    return headers;
  }

  private normalizeExecutionResponse(
    value: unknown,
    payload: AccountingPaymentExternalExecutionPayload,
  ): AccountingPaymentExternalExecutionResult {
    if (!this.isObject(value)) {
      throw new ServiceUnavailableException('외부 회계·지급 API 응답 형식이 올바르지 않습니다.');
    }
    const response = value as ExternalExecutionResponseObject;
    const executedAt = this.normalizeOptionalText(response.executedAt) ?? new Date().toISOString();
    const executionId = this.normalizeOptionalText(response.executionId) ?? payload.executionId;
    const providerName = this.normalizeOptionalText(response.providerName) ?? 'external-accounting-payment-api';
    const providerRequestId = this.normalizeOptionalText(response.providerRequestId)
      ?? this.normalizeOptionalText(response.requestId);
    const artifactsValue = Array.isArray(response.artifacts) ? response.artifacts : response.steps;
    const artifacts = this.normalizeArtifacts(artifactsValue, payload, executionId, executedAt);

    return {
      executionId,
      executedAt,
      settlementAmountTotal: payload.settlementAmountTotal,
      providerName,
      providerRequestId,
      artifacts,
    };
  }

  private normalizeArtifacts(
    value: unknown,
    payload: AccountingPaymentExternalExecutionPayload,
    executionId: string,
    executedAt: string,
  ): CrmCostPlanAccountingPaymentExecutionArtifact[] {
    if (!Array.isArray(value)) {
      throw new ServiceUnavailableException('외부 회계·지급 API 응답에 evidence 단계가 없습니다.');
    }
    const artifacts = value.map((item) => this.normalizeArtifact(item, payload, executionId, executedAt));
    const keys = new Set(artifacts.map((artifact) => artifact.key));
    const missingKeys = CRM_ACCOUNTING_PAYMENT_EXECUTION_STEP_KEYS.filter((key) => !keys.has(key));
    if (missingKeys.length > 0) {
      throw new ServiceUnavailableException(`외부 회계·지급 API 응답에 필수 evidence 단계가 없습니다: ${missingKeys.join(', ')}`);
    }
    return artifacts;
  }

  private normalizeArtifact(
    value: unknown,
    payload: AccountingPaymentExternalExecutionPayload,
    executionId: string,
    executedAt: string,
  ): CrmCostPlanAccountingPaymentExecutionArtifact {
    if (!this.isObject(value)) {
      throw new ServiceUnavailableException('외부 회계·지급 API evidence 단계 형식이 올바르지 않습니다.');
    }
    const candidate = value as Record<string, unknown>;
    const key = this.normalizeStepKey(candidate.key);
    const evidencePath = this.normalizeRequiredText(candidate.evidencePath, '외부 회계·지급 evidence path');
    const label = this.normalizeOptionalText(candidate.label)
      ?? this.normalizeOptionalText(candidate.evidenceLabel)
      ?? this.toDefaultEvidenceLabel(key);
    const referenceNo = this.normalizeOptionalText(candidate.referenceNo) ?? `${executionId}:${key}`;
    const amount = this.normalizeOptionalNumber(candidate.amount) ?? payload.settlementAmountTotal;

    return {
      key,
      label,
      evidencePath,
      referenceNo,
      amount,
      executedAt,
    };
  }

  private normalizeStepKey(value: unknown): CrmCostPlanAccountingPaymentExecutionStepKey {
    const key = this.normalizeRequiredText(value, '외부 회계·지급 evidence 단계');
    if (!CRM_ACCOUNTING_PAYMENT_EXECUTION_STEP_KEYS.includes(key as CrmCostPlanAccountingPaymentExecutionStepKey)) {
      throw new ServiceUnavailableException(`외부 회계·지급 API evidence 단계가 올바르지 않습니다: ${key}`);
    }
    return key as CrmCostPlanAccountingPaymentExecutionStepKey;
  }

  private normalizeRequiredText(value: unknown, label: string): string {
    const text = this.normalizeOptionalText(value);
    if (!text) {
      throw new ServiceUnavailableException(`${label} 값이 필요합니다.`);
    }
    return text;
  }

  private normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const text = value.trim();
    return text.length > 0 ? text : undefined;
  }

  private normalizeOptionalNumber(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return undefined;
    }
    return Math.round(value);
  }

  private resolveEndpointUrl(): string | undefined {
    const directUrl = process.env.CRM_ACCOUNTING_PAYMENT_API_URL?.trim();
    if (directUrl) {
      return directUrl;
    }
    const baseUrl = process.env.CRM_ACCOUNTING_PAYMENT_API_BASE_URL?.trim();
    if (!baseUrl) {
      return undefined;
    }
    const path = process.env.CRM_ACCOUNTING_PAYMENT_API_EXECUTION_PATH?.trim() || '/crm/accounting-payment/executions';
    return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  }

  private resolveTimeoutMs(): number {
    const raw = Number(process.env.CRM_ACCOUNTING_PAYMENT_API_TIMEOUT_MS ?? 10000);
    if (!Number.isFinite(raw)) {
      return 10000;
    }
    return Math.min(Math.max(Math.round(raw), 1000), 60000);
  }

  private toDefaultEvidenceLabel(key: CrmCostPlanAccountingPaymentExecutionStepKey): string {
    switch (key) {
      case 'accounting-voucher':
        return 'External accounting voucher';
      case 'payment-request':
        return 'External payment request';
      case 'payment-execution':
        return 'External payment execution';
      case 'external-system-sync':
        return 'External system sync';
    }
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
