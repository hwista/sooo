export type CrmBusinessPlanPreviewRegion = 'all' | 'domestic' | 'overseas';
export type CrmBusinessPlanPreviewSource = 'pipeline' | 'contract-plan' | 'contract-actual';
export type CrmBusinessPlanPerformanceSource = 'confirmed-plan' | 'pipeline' | 'contract' | 'confirmed-cost' | 'manual-actual' | 'mixed';
export type CrmBusinessPlanStatus = 'draft' | 'confirmed';
export type CrmBusinessPlanMonthlyPlanInputMode = 'distributed' | 'manual';

export interface CrmBusinessPlanPreviewQuery {
  baseYear?: number;
  businessType?: string;
  industryLine?: string;
  region?: CrmBusinessPlanPreviewRegion;
  search?: string;
}

export interface CrmBusinessPlanPreviewYear {
  year: number;
  pipelineAmount: number;
  contractPlanAmount: number;
  contractActualAmount: number;
  planCandidateAmount: number;
  actualGapAmount: number;
}

export interface CrmBusinessPlanPreviewRow {
  key: string;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: CrmBusinessPlanPreviewRegion;
  pipelineAmount: number;
  contractPlanAmount: number;
  contractActualAmount: number;
  planCandidateAmount: number;
  actualGapAmount: number;
  years: CrmBusinessPlanPreviewYear[];
}

export interface CrmBusinessPlanPreviewSummary {
  baseYear: number;
  yearCount: number;
  rowCount: number;
  pipelineAmountTotal: number;
  contractPlanAmountTotal: number;
  contractActualAmountTotal: number;
  planCandidateAmountTotal: number;
  actualGapAmountTotal: number;
  activeFilters: Required<CrmBusinessPlanPreviewQuery>;
  businessTypeOptions: string[];
  industryLineOptions: string[];
  sourceTypes: CrmBusinessPlanPreviewSource[];
  boundaryNotice: string;
  unavailableActions: string[];
}

export interface CrmBusinessPlanPreviewResponse {
  summary: CrmBusinessPlanPreviewSummary;
  years: CrmBusinessPlanPreviewYear[];
  rows: CrmBusinessPlanPreviewRow[];
}

export interface CrmBusinessPlanLine {
  id: string;
  lineCode: string;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmBusinessPlanPreviewRegion, 'all'>;
  pipelineAmount: number;
  contractPlanAmount: number;
  contractActualAmount: number;
  planCandidateAmount: number;
  monthlyPlanRevenueAmounts: number[];
  monthlyPlanInputMode: CrmBusinessPlanMonthlyPlanInputMode;
  actualGapAmount: number;
}

export interface CrmBusinessPlan {
  id: string;
  code: string;
  planName: string;
  baseYear: number;
  version: number;
  status: CrmBusinessPlanStatus;
  confirmed: boolean;
  confirmedAt?: string;
  filters: Required<CrmBusinessPlanPreviewQuery>;
  pipelineAmountTotal: number;
  contractPlanAmountTotal: number;
  contractActualAmountTotal: number;
  planCandidateAmountTotal: number;
  actualGapAmountTotal: number;
  rowCount: number;
  lines: CrmBusinessPlanLine[];
  memo?: string;
  updatedAt: string;
}

export interface CrmBusinessPlanListQuery {
  baseYear?: number;
  status?: CrmBusinessPlanStatus | 'all';
  search?: string;
}

export interface CrmBusinessPlanListSummary {
  baseYear?: number;
  rowCount: number;
  draftCount: number;
  confirmedCount: number;
  latestVersion?: number;
  confirmedPlanId?: string;
  activeFilters: Required<CrmBusinessPlanListQuery>;
  boundaryNotice: string;
  unavailableActions: string[];
}

export interface CrmBusinessPlanListResponse {
  summary: CrmBusinessPlanListSummary;
  items: CrmBusinessPlan[];
}

export interface CrmBusinessPlanSnapshotRequest extends CrmBusinessPlanPreviewQuery {
  planName?: string;
  memo?: string;
}

export interface CrmBusinessPlanCarryForwardRequest extends CrmBusinessPlanSnapshotRequest {
  sourceBaseYear?: number;
}

export interface CrmBusinessPlanMonthlyPlanInputRequest {
  monthlyRevenueAmounts: number[];
  memo?: string;
}

export interface CrmBusinessPlanMonthlyPlanInputResult {
  plan: CrmBusinessPlan;
  line: CrmBusinessPlanLine;
  boundaryNotice: string;
}

export interface CrmBusinessPlanPerformanceQuery {
  year?: number;
  businessType?: string;
  industryLine?: string;
  region?: CrmBusinessPlanPreviewRegion;
  search?: string;
}

export interface CrmBusinessPlanPerformanceMonth {
  month: number;
  planRevenueAmount: number;
  planCostAmount: number;
  planMarginAmount: number;
  actualRevenueAmount: number;
  actualCostAmount: number;
  actualMarginAmount: number;
  revenueGapAmount: number;
  costGapAmount: number;
  marginGapAmount: number;
}

export interface CrmBusinessPlanPerformanceRow {
  key: string;
  label: string;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmBusinessPlanPreviewRegion, 'all'>;
  source: CrmBusinessPlanPerformanceSource;
  wbsCode?: string;
  months: CrmBusinessPlanPerformanceMonth[];
  total: CrmBusinessPlanPerformanceMonth;
}

export interface CrmBusinessPlanPerformanceSummary {
  year: number;
  rowCount: number;
  planRevenueTotal: number;
  planCostTotal: number;
  planMarginTotal: number;
  actualRevenueTotal: number;
  actualCostTotal: number;
  actualMarginTotal: number;
  revenueGapTotal: number;
  costGapTotal: number;
  marginGapTotal: number;
  activeFilters: Required<CrmBusinessPlanPerformanceQuery>;
  businessTypeOptions: string[];
  industryLineOptions: string[];
  planBasisLabel: string;
  costBasisLabel: string;
  confirmedCostInputCount: number;
  confirmedInternalCostInputCount: number;
  confirmedAmsExternalCostInputCount: number;
  directActualInputCount: number;
  directActualRevenueTotal: number;
  directActualCostTotal: number;
  amsExternalCostAdjustedWbsCount: number;
  amsExternalCostAdjustedPlanAmountTotal: number;
  amsExternalCostAdjustedActualAmountTotal: number;
  confirmedPlanAvailable: boolean;
  confirmedPlanId?: string;
  confirmedPlanCode?: string;
  confirmedPlanName?: string;
  boundaryNotice: string;
  unavailableActions: string[];
}

export interface CrmBusinessPlanPerformanceResponse {
  summary: CrmBusinessPlanPerformanceSummary;
  months: CrmBusinessPlanPerformanceMonth[];
  rows: CrmBusinessPlanPerformanceRow[];
}

export interface CrmBusinessPlanPerformanceActualInput {
  id: string;
  year: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmBusinessPlanPreviewRegion, 'all'>;
  wbsCode?: string;
  monthlyRevenueAmounts: number[];
  monthlyCostAmounts: number[];
  revenueAmountTotal: number;
  costAmountTotal: number;
  memo?: string;
  updatedAt: string;
}

export interface CrmBusinessPlanPerformanceActualInputRequest {
  year: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmBusinessPlanPreviewRegion, 'all'>;
  wbsCode?: string;
  monthlyRevenueAmounts: number[];
  monthlyCostAmounts: number[];
  memo?: string;
}

export interface CrmBusinessPlanPerformanceActualInputResult {
  input: CrmBusinessPlanPerformanceActualInput;
  boundaryNotice: string;
}
