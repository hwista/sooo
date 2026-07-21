export type CrmCostPlanPreviewRegion = 'all' | 'domestic' | 'overseas';
export type CrmCostPlanAmsReadiness = 'ready' | 'blocked' | 'planned';
export type CrmCostPlanAmsMappingStatus = 'mapped' | 'unmapped' | 'not-required';
export type CrmCostPlanInternalInputMode = 'candidate' | 'manual';
export type CrmCostPlanInternalInputStatus = 'candidate' | 'draft' | 'confirmed';
export type CrmCostPlanAmsExternalInputStatus = 'candidate' | 'draft' | 'confirmed';
export type CrmCostPlanAccountingPaymentReadiness = 'ready' | 'blocked';
export type CrmCostPlanAccountingPaymentLineSource = 'internal-cost' | 'ams-external-cost';
export type CrmCostPlanAccountingPaymentHandoffStatus = 'snapshot-created' | 'execution-evidence-updated' | 'replaced';
export type CrmCostPlanAccountingPaymentExecutionStepKey =
  | 'accounting-voucher'
  | 'payment-request'
  | 'payment-execution'
  | 'external-system-sync';
export type CrmCostPlanAccountingPaymentExecutionMode = 'demo' | 'external-api';
export type CrmCostPlanPreviewSource =
  | 'opportunity-cost'
  | 'contract-cost'
  | 'contract-billing-actual'
  | 'internal-cost-input'
  | 'ams-vendor-mapping'
  | 'ams-external-cost-input'
  | 'ams-readiness';

export interface CrmCostPlanPreviewQuery {
  year?: number;
  businessType?: string;
  industryLine?: string;
  region?: CrmCostPlanPreviewRegion;
  search?: string;
}

export interface CrmCostPlanPreviewMonth {
  month: number;
  pipelineInternalCostAmount: number;
  pipelineExternalCostAmount: number;
  contractInternalCostAmount: number;
  internalCostPlanInputAmount: number;
  internalCostActualInputAmount: number;
  internalCostGapAmount: number;
  contractExternalPlanAmount: number;
  contractExternalActualAmount: number;
  amsExternalCostPlanInputAmount: number;
  amsExternalCostActualInputAmount: number;
  amsExternalCostGapAmount: number;
  externalCostPlanCandidateAmount: number;
  externalCostGapAmount: number;
}

export interface CrmCostPlanPreviewRow {
  key: string;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: CrmCostPlanPreviewRegion;
  wbsCode?: string;
  pipelineInternalCostAmount: number;
  pipelineExternalCostAmount: number;
  contractInternalCostAmount: number;
  contractExternalPlanAmount: number;
  contractExternalActualAmount: number;
  internalCostCandidateAmount: number;
  internalCostPlanInputAmount: number;
  internalCostActualInputAmount: number;
  internalCostGapAmount: number;
  internalCostInputMode: CrmCostPlanInternalInputMode;
  internalCostInputStatus: CrmCostPlanInternalInputStatus;
  internalCostInputId?: string;
  internalCostConfirmedAt?: string;
  externalCostPlanCandidateAmount: number;
  externalCostGapAmount: number;
  amsExternalCostInputMode: CrmCostPlanInternalInputMode;
  amsExternalCostInputId?: string;
  amsExternalCostInputStatus: CrmCostPlanAmsExternalInputStatus;
  amsExternalCostConfirmedAt?: string;
  amsExternalCostPlanInputAmount: number;
  amsExternalCostActualInputAmount: number;
  amsExternalCostGapAmount: number;
  amsMappingStatus: CrmCostPlanAmsMappingStatus;
  amsMappingId?: string;
  amsVendorName?: string;
  amsVendorContractNo?: string;
  amsReadiness: CrmCostPlanAmsReadiness;
  amsReadyCount: number;
  amsBlockedCount: number;
  blockedReasons: string[];
  months: CrmCostPlanPreviewMonth[];
}

export interface CrmCostPlanPreviewSummary {
  year: number;
  rowCount: number;
  pipelineInternalCostTotal: number;
  pipelineExternalCostTotal: number;
  contractInternalCostTotal: number;
  contractExternalPlanTotal: number;
  contractExternalActualTotal: number;
  internalCostCandidateTotal: number;
  internalCostPlanInputTotal: number;
  internalCostActualInputTotal: number;
  internalCostGapTotal: number;
  internalCostInputRowCount: number;
  internalCostConfirmedRowCount: number;
  externalCostPlanCandidateTotal: number;
  externalCostGapTotal: number;
  amsExternalCostPlanInputTotal: number;
  amsExternalCostActualInputTotal: number;
  amsExternalCostGapTotal: number;
  amsExternalCostInputRowCount: number;
  amsExternalCostConfirmedRowCount: number;
  amsMappedCount: number;
  amsReadyCount: number;
  amsBlockedCount: number;
  activeFilters: Required<CrmCostPlanPreviewQuery>;
  businessTypeOptions: string[];
  industryLineOptions: string[];
  sourceTypes: CrmCostPlanPreviewSource[];
  boundaryNotice: string;
  unavailableActions: string[];
}

export interface CrmCostPlanPreviewResponse {
  summary: CrmCostPlanPreviewSummary;
  months: CrmCostPlanPreviewMonth[];
  rows: CrmCostPlanPreviewRow[];
}

export interface CrmCostPlanInternalMonthlyInput {
  id: string;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmCostPlanPreviewRegion, 'all'>;
  wbsCode?: string;
  monthlyPlanAmounts: number[];
  monthlyActualAmounts: number[];
  planAmountTotal: number;
  actualAmountTotal: number;
  gapAmountTotal: number;
  status: CrmCostPlanInternalInputStatus;
  confirmed: boolean;
  confirmedAt?: string;
  memo?: string;
  updatedAt: string;
}

export interface CrmCostPlanInternalMonthlyInputRequest {
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmCostPlanPreviewRegion, 'all'>;
  wbsCode?: string;
  monthlyPlanAmounts: number[];
  monthlyActualAmounts: number[];
  memo?: string;
}

export interface CrmCostPlanInternalMonthlyInputResult {
  input: CrmCostPlanInternalMonthlyInput;
  boundaryNotice: string;
}

export interface CrmCostPlanInternalMonthlyWorkflowResult {
  input: CrmCostPlanInternalMonthlyInput;
  boundaryNotice: string;
}

export interface CrmCostPlanAmsVendorWbsMapping {
  id: string;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmCostPlanPreviewRegion, 'all'>;
  wbsCode: string;
  vendorName: string;
  vendorContractNo?: string;
  memo?: string;
  updatedAt: string;
}

export interface CrmCostPlanAmsVendorWbsMappingRequest {
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmCostPlanPreviewRegion, 'all'>;
  wbsCode: string;
  vendorName: string;
  vendorContractNo?: string;
  memo?: string;
}

export interface CrmCostPlanAmsVendorWbsMappingResult {
  mapping: CrmCostPlanAmsVendorWbsMapping;
  boundaryNotice: string;
}

export interface CrmCostPlanAmsExternalMonthlyInput {
  id: string;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmCostPlanPreviewRegion, 'all'>;
  wbsCode: string;
  vendorName: string;
  vendorContractNo?: string;
  monthlyPlanAmounts: number[];
  monthlyActualAmounts: number[];
  planAmountTotal: number;
  actualAmountTotal: number;
  gapAmountTotal: number;
  status: CrmCostPlanAmsExternalInputStatus;
  confirmed: boolean;
  confirmedAt?: string;
  memo?: string;
  updatedAt: string;
}

export interface CrmCostPlanAmsExternalMonthlyInputRequest {
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmCostPlanPreviewRegion, 'all'>;
  wbsCode: string;
  vendorName: string;
  vendorContractNo?: string;
  monthlyPlanAmounts: number[];
  monthlyActualAmounts: number[];
  memo?: string;
}

export interface CrmCostPlanAmsExternalMonthlyInputResult {
  input: CrmCostPlanAmsExternalMonthlyInput;
  boundaryNotice: string;
}

export interface CrmCostPlanAmsExternalMonthlyWorkflowResult {
  input: CrmCostPlanAmsExternalMonthlyInput;
  boundaryNotice: string;
}

export interface CrmCostPlanAccountingPaymentLine {
  key: string;
  source: CrmCostPlanAccountingPaymentLineSource;
  sourceId: string;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmCostPlanPreviewRegion, 'all'>;
  wbsCode?: string;
  vendorName?: string;
  vendorContractNo?: string;
  planAmountTotal: number;
  actualAmountTotal: number;
  gapAmountTotal: number;
  settlementAmount: number;
  confirmedAt?: string;
  memo?: string;
}

export interface CrmCostPlanAccountingPaymentExecutionEvidenceStep {
  key: CrmCostPlanAccountingPaymentExecutionStepKey;
  evidencePath: string;
  evidenceLabel?: string;
  note?: string;
  recordedAt?: string;
}

export interface CrmCostPlanAccountingPaymentHandoffSummary {
  id: string;
  status: CrmCostPlanAccountingPaymentHandoffStatus;
  targetYear: number;
  lineCount: number;
  settlementAmountTotal: number;
  savedAt: string;
  savedBy?: string;
  memo?: string;
  executionEvidence: CrmCostPlanAccountingPaymentExecutionEvidenceStep[];
  executionEvidenceUpdatedAt?: string;
}

export interface CrmCostPlanAccountingPaymentPreview {
  targetYear: number;
  readiness: CrmCostPlanAccountingPaymentReadiness;
  blockedReasons: string[];
  lineCount: number;
  internalLineCount: number;
  amsExternalLineCount: number;
  settlementAmountTotal: number;
  lines: CrmCostPlanAccountingPaymentLine[];
  latestHandoff: CrmCostPlanAccountingPaymentHandoffSummary | null;
  boundaryNotice: string;
  unavailableActions: string[];
  nextAction: string;
}

export interface CrmCostPlanAccountingPaymentHandoff extends CrmCostPlanAccountingPaymentHandoffSummary {
  previewSnapshot: Omit<CrmCostPlanAccountingPaymentPreview, 'latestHandoff'>;
  linesSnapshot: CrmCostPlanAccountingPaymentLine[];
  boundaryNotice: string;
  nextAction: string;
}

export interface CrmCostPlanAccountingPaymentHandoffRequest extends CrmCostPlanPreviewQuery {
  memo?: string;
}

export interface CrmCostPlanAccountingPaymentHandoffResult {
  handoff: CrmCostPlanAccountingPaymentHandoff;
  preview: CrmCostPlanAccountingPaymentPreview;
  boundaryNotice: string;
  nextAction: string;
}

export interface CrmCostPlanAccountingPaymentExecutionEvidenceRequest {
  steps: CrmCostPlanAccountingPaymentExecutionEvidenceStep[];
  memo?: string;
}

export interface CrmCostPlanAccountingPaymentExecutionEvidenceResult {
  handoffId: string;
  appliedStepKeys: CrmCostPlanAccountingPaymentExecutionStepKey[];
  recordedAt: string;
  handoff: CrmCostPlanAccountingPaymentHandoff;
  preview: CrmCostPlanAccountingPaymentPreview;
  boundaryNotice: string;
  nextAction: string;
}

export interface CrmCostPlanAccountingPaymentExecutionRequest {
  mode?: CrmCostPlanAccountingPaymentExecutionMode;
  memo?: string;
}

export interface CrmCostPlanAccountingPaymentExecutionArtifact {
  key: CrmCostPlanAccountingPaymentExecutionStepKey;
  label: string;
  evidencePath: string;
  referenceNo: string;
  amount: number;
  executedAt: string;
}

export interface CrmCostPlanAccountingPaymentExecutionResult extends CrmCostPlanAccountingPaymentExecutionEvidenceResult {
  externalExecution: {
    providerMode: CrmCostPlanAccountingPaymentExecutionMode;
    providerName?: string;
    providerRequestId?: string;
    executedAt: string;
    executionId: string;
    settlementAmountTotal: number;
    artifacts: CrmCostPlanAccountingPaymentExecutionArtifact[];
    boundaryNotice: string;
    nextAction: string;
  };
}
