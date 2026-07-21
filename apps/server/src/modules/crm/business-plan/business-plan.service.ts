import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import type {
  CrmBusinessPlan,
  CrmBusinessPlanCarryForwardRequest,
  CrmBusinessPlanLine,
  CrmBusinessPlanListQuery,
  CrmBusinessPlanListResponse,
  CrmBusinessPlanMonthlyPlanInputRequest,
  CrmBusinessPlanMonthlyPlanInputResult,
  CrmBusinessPlanPerformanceActualInput,
  CrmBusinessPlanPerformanceActualInputRequest,
  CrmBusinessPlanPerformanceActualInputResult,
  CrmBusinessPlanPerformanceMonth,
  CrmBusinessPlanPerformanceQuery,
  CrmBusinessPlanPerformanceResponse,
  CrmBusinessPlanPerformanceRow,
  CrmBusinessPlanPerformanceSource,
  CrmBusinessPlanPreviewQuery,
  CrmBusinessPlanPreviewRegion,
  CrmBusinessPlanPreviewResponse,
  CrmBusinessPlanPreviewRow,
  CrmBusinessPlanPreviewSummary,
  CrmBusinessPlanPreviewYear,
  CrmBusinessPlanSnapshotRequest,
  CrmBusinessPlanStatus,
  CrmContractPerformanceRow,
  CrmOpportunity,
} from '@ssoo/types/crm';
import { DatabaseService } from '../../../database/database.service.js';
import { ContractService } from '../contract/contract.service.js';
import { OpportunityService } from '../opportunity/opportunity.service.js';

const BUSINESS_PLAN_PREVIEW_YEAR_COUNT = 3;
const CRM_BUSINESS_PLAN_PREVIEW_BOUNDARY_NOTICE = 'CRM 사업계획 preview는 영업기회 pipeline과 확정 계약 청구계획/실적을 조합한 계획 후보입니다. 현재 preview를 사업계획 차수 원장으로 저장하고 확정할 수 있습니다.';
const CRM_BUSINESS_PLAN_UNAVAILABLE_ACTIONS = [
  '내부원가/AMS 원가 저장',
];
const CRM_BUSINESS_PLAN_PERFORMANCE_FALLBACK_PLAN_BASIS_LABEL = 'Pipeline 후보 + 확정 계약 청구계획';
const CRM_BUSINESS_PLAN_PERFORMANCE_CONFIRMED_PLAN_BASIS_LABEL = '확정 사업계획 차수 매출 기준';
const CRM_BUSINESS_PLAN_PERFORMANCE_CONTRACT_COST_BASIS_LABEL = '계약 청구실적 원가 기준';
const CRM_BUSINESS_PLAN_PERFORMANCE_CONFIRMED_COST_BASIS_LABEL = '계약 청구실적 + 확정 내부원가/AMS 원가';
const CRM_BUSINESS_PLAN_PERFORMANCE_ADJUSTED_COST_BASIS_LABEL = '계약 청구실적 + 확정 내부원가/AMS 원가(AMS WBS 계약 외부원가 제외)';
const CRM_BUSINESS_PLAN_PERFORMANCE_FALLBACK_BOUNDARY_NOTICE = '사업계획대비실적 Preview는 확정 사업계획 차수가 없을 때 영업기회 pipeline 후보와 확정 계약 월별 계획/실적을 비교하는 읽기용 화면입니다. 확정 AMS 정산 WBS는 계약 외부원가와 중복되지 않도록 계약 성과 외부원가를 제외하고, 확정 내부원가/AMS 원가는 별도 확정원가 행으로 합산합니다.';
const CRM_BUSINESS_PLAN_PERFORMANCE_CONFIRMED_BOUNDARY_NOTICE = '사업계획대비실적 Preview는 확정 사업계획 차수의 월별 직접 입력값을 매출 계획 기준으로 사용합니다. 확정 AMS 정산 WBS는 계약 외부원가와 중복되지 않도록 계약 성과 외부원가를 제외하고, 확정 내부원가/AMS 원가는 별도 확정원가 행으로 합산합니다. 실적 직접 편집과 회계/지급 반영은 후속 slice입니다.';
const CRM_BUSINESS_PLAN_PERFORMANCE_FALLBACK_UNAVAILABLE_ACTIONS = [
  '확정 사업계획 차수 기준 비교',
  '실적 직접 편집',
  '확정 원가 회계/지급 반영',
];
const CRM_BUSINESS_PLAN_PERFORMANCE_CONFIRMED_UNAVAILABLE_ACTIONS = [
  '실적 직접 편집',
  '확정 원가 회계/지급 반영',
];
const CRM_BUSINESS_PLAN_LEDGER_BOUNDARY_NOTICE = 'CRM 사업계획 원장은 preview 후보 저장, 전년도 확정 차수 이월, draft line 월별 직접 입력, 기준년도별 확정 상태를 관리합니다. 내부원가/AMS 배부 저장은 별도 후속 slice입니다.';
const CRM_BUSINESS_PLAN_LEDGER_UNAVAILABLE_ACTIONS = [
  '내부원가/AMS 원가 저장',
];
const CRM_BUSINESS_PLAN_MONTHLY_INPUT_BOUNDARY_NOTICE = 'CRM 사업계획 월별 직접 입력은 draft 차수 line의 계획 매출만 갱신합니다. 확정 차수와 계약 실적, 내부원가/AMS 원가 계획은 여기서 직접 편집하지 않습니다.';
const CRM_BUSINESS_PLAN_PERFORMANCE_ACTUAL_INPUT_BOUNDARY_NOTICE = 'CRM 사업계획대비실적 직접 입력은 계약/원가/회계 정본을 덮어쓰지 않고 별도 manual-actual row로 합산합니다. 회계/지급 반영은 후속 slice입니다.';

interface NormalizedBusinessPlanPreviewQuery extends Required<CrmBusinessPlanPreviewQuery> {
  years: number[];
}

interface NormalizedBusinessPlanPerformanceQuery extends Required<CrmBusinessPlanPerformanceQuery> {}

interface NormalizedBusinessPlanPerformanceActualInput extends CrmBusinessPlanPerformanceActualInputRequest {
  year: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmBusinessPlanPreviewRegion, 'all'>;
  wbsCode: string;
  monthlyRevenueAmounts: number[];
  monthlyCostAmounts: number[];
  memo?: string;
}

interface BusinessPlanGroup {
  key: string;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: CrmBusinessPlanPreviewRegion;
  years: Map<number, CrmBusinessPlanPreviewYear>;
}

interface BusinessPlanPerformanceSlice {
  year: number;
  row: CrmContractPerformanceRow;
}

interface BusinessPlanPerformanceGroup {
  key: string;
  label: string;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmBusinessPlanPreviewRegion, 'all'>;
  source: CrmBusinessPlanPerformanceSource;
  wbsCode?: string;
  months: Map<number, CrmBusinessPlanPerformanceMonth>;
}

interface BusinessPlanPerformanceCostStats {
  total: number;
  internal: number;
  amsExternal: number;
}

interface BusinessPlanPerformanceCostAdjustmentStats {
  amsExternalCostAdjustedWbsCodes: Set<string>;
  amsExternalCostAdjustedPlanAmountTotal: number;
  amsExternalCostAdjustedActualAmountTotal: number;
}

interface BusinessPlanPerformanceDirectActualStats {
  total: number;
  revenueAmountTotal: number;
  costAmountTotal: number;
}

interface RawBusinessPlanWriter {
  $queryRaw<T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  $executeRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<number>;
}

interface CrmBusinessPlanLedgerRow {
  id: bigint;
  code: string;
  planName: string;
  baseYear: number;
  versionNo: number;
  statusCode: string;
  confirmed: boolean;
  confirmedAt: Date | null;
  businessTypeFilter: string | null;
  industryLineFilter: string | null;
  regionFilter: string;
  searchFilter: string | null;
  pipelineAmountTotal: bigint;
  contractPlanAmountTotal: bigint;
  contractActualAmountTotal: bigint;
  planCandidateAmountTotal: bigint;
  actualGapAmountTotal: bigint;
  rowCount: number;
  memo: string | null;
  updatedAt: Date;
}

interface CrmBusinessPlanLineLedgerRow {
  businessPlanId: bigint;
  id: bigint;
  lineCode: string;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  regionCode: string;
  pipelineAmount: bigint;
  contractPlanAmount: bigint;
  contractActualAmount: bigint;
  planCandidateAmount: bigint;
  planMonthlyRevenueAmounts?: unknown;
  actualGapAmount: bigint;
  sortOrder: number;
}

interface CrmBusinessPlanConfirmedCostLedgerRow {
  costSource: string;
  id: bigint;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  regionCode: string;
  wbsCode: string;
  vendorName: string | null;
  monthlyPlanAmounts: unknown;
  monthlyActualAmounts: unknown;
  planAmountTotal: bigint;
  actualAmountTotal: bigint;
  confirmedAt: Date | null;
}

interface CrmBusinessPlanPerformanceActualLedgerRow {
  id: bigint;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  regionCode: string;
  wbsCode: string;
  monthlyRevenueAmounts: unknown;
  monthlyCostAmounts: unknown;
  revenueAmountTotal: bigint;
  costAmountTotal: bigint;
  memo: string | null;
  updatedAt: Date;
}

interface CrmBusinessPlanInsertedRow {
  id: bigint;
  code: string;
}

interface CrmBusinessPlanVersionRow {
  versionNo: number | bigint | null;
}

interface CrmBusinessPlanLineCountRow {
  lineCount: number | bigint;
}

@Injectable()
export class BusinessPlanService {
  constructor(
    private readonly opportunityService: OpportunityService,
    private readonly contractService: ContractService,
    @Optional() private readonly db?: DatabaseService,
  ) {}

  async listPlans(query: CrmBusinessPlanListQuery = {}): Promise<CrmBusinessPlanListResponse> {
    const db = this.requireDb();
    const normalized = this.normalizeListQuery(query);
    const [rows, lineRows] = await Promise.all([
      db.$queryRaw<CrmBusinessPlanLedgerRow[]>`
        select business_plan_id as "id",
               business_plan_code as "code",
               plan_name as "planName",
               base_year as "baseYear",
               version_no as "versionNo",
               status_code as "statusCode",
               confirmed,
               confirmed_at as "confirmedAt",
               business_type_filter as "businessTypeFilter",
               industry_line_filter as "industryLineFilter",
               region_filter as "regionFilter",
               search_filter as "searchFilter",
               pipeline_amount_total as "pipelineAmountTotal",
               contract_plan_amount_total as "contractPlanAmountTotal",
               contract_actual_amount_total as "contractActualAmountTotal",
               plan_candidate_amount_total as "planCandidateAmountTotal",
               actual_gap_amount_total as "actualGapAmountTotal",
               row_count as "rowCount",
               memo,
               updated_at as "updatedAt"
          from crm.crm_business_plan_m
         where is_active = true
         order by base_year desc, version_no desc
      `,
      db.$queryRaw<CrmBusinessPlanLineLedgerRow[]>`
        select business_plan_id as "businessPlanId",
               business_plan_line_id as "id",
               line_code as "lineCode",
               target_year as "targetYear",
               business_type as "businessType",
               industry_line as "industryLine",
               owner_name as "ownerName",
               region_code as "regionCode",
               pipeline_amount as "pipelineAmount",
               contract_plan_amount as "contractPlanAmount",
               contract_actual_amount as "contractActualAmount",
               plan_candidate_amount as "planCandidateAmount",
               plan_monthly_revenue_amounts as "planMonthlyRevenueAmounts",
               actual_gap_amount as "actualGapAmount",
               sort_order as "sortOrder"
          from crm.crm_business_plan_line_d
         where is_active = true
         order by business_plan_id, sort_order, target_year
      `,
    ]);
    const linesByPlan = this.groupPlanLines(lineRows);
    const plans = rows.map((row) => this.toBusinessPlan(row, linesByPlan.get(row.id.toString()) ?? []));
    const filtered = this.filterPlans(plans, normalized);

    return {
      summary: this.buildPlanListSummary(filtered, normalized),
      items: filtered,
    };
  }

  async createPlanSnapshot(
    dto: CrmBusinessPlanSnapshotRequest,
    currentUserId?: bigint,
  ): Promise<CrmBusinessPlan> {
    const db = this.requireDb();
    const normalized = this.normalizeQuery(dto);
    const preview = await this.getPreview(dto);
    if (preview.rows.length === 0) {
      throw new BadRequestException('저장할 사업계획 후보가 없습니다.');
    }

    const planName = this.normalizePlanName(dto.planName, normalized.baseYear);
    const memo = this.trimOptional(dto.memo, 1000);
    const inserted = await this.insertBusinessPlanDraft(
      db,
      normalized,
      preview.rows,
      planName,
      memo,
      currentUserId,
      'snapshot',
    );

    return this.getPlan(inserted.code);
  }

  async createCarryForwardSnapshot(
    dto: CrmBusinessPlanCarryForwardRequest,
    currentUserId?: bigint,
  ): Promise<CrmBusinessPlan> {
    const db = this.requireDb();
    const normalized = this.normalizeQuery(dto);
    const sourceBaseYear = this.normalizeCarryForwardSourceBaseYear(dto.sourceBaseYear, normalized.baseYear);
    const sourcePlan = await this.loadConfirmedPlan(sourceBaseYear);
    if (!sourcePlan) {
      throw new BadRequestException(`${sourceBaseYear}년 확정 사업계획이 없어 전년 이월을 만들 수 없습니다.`);
    }

    const preview = await this.getPreview(dto);
    const rows = this.buildCarryForwardRows(sourcePlan, preview.rows, normalized);
    if (rows.length === 0) {
      throw new BadRequestException('이월할 전년도 사업계획 상세가 없습니다.');
    }

    const planName = this.normalizePlanName(dto.planName, normalized.baseYear, '전년 이월');
    const memo = this.trimOptional(
      dto.memo ?? `${sourcePlan.code} 확정 차수에서 이월하고 현재 preview 신규 후보를 보강했습니다.`,
      1000,
    );
    const inserted = await this.insertBusinessPlanDraft(
      db,
      normalized,
      rows,
      planName,
      memo,
      currentUserId,
      'carry-forward',
    );

    return this.getPlan(inserted.code);
  }

  async updateMonthlyPlanLine(
    id: string,
    lineId: string,
    dto: CrmBusinessPlanMonthlyPlanInputRequest,
    currentUserId?: bigint,
  ): Promise<CrmBusinessPlanMonthlyPlanInputResult> {
    const db = this.requireDb();
    const existing = await this.findPlanWriteRow(id);
    if (!existing) {
      throw new NotFoundException('CRM business plan not found');
    }
    if (existing.confirmed) {
      throw new BadRequestException('확정된 사업계획 차수의 월별 계획은 직접 수정할 수 없습니다.');
    }

    const line = await this.findPlanLineWriteRow(existing.id, lineId);
    if (!line) {
      throw new NotFoundException('CRM business plan line not found');
    }

    const monthlyRevenueAmounts = this.normalizeMonthlyRevenueAmounts(dto.monthlyRevenueAmounts);
    const planCandidateAmount = monthlyRevenueAmounts.reduce((sum, amount) => sum + amount, 0);
    const transactionId = randomUUID();
    const memo = this.trimOptional(dto.memo, 1000);

    await db.client.$transaction(async (tx) => {
      const writer = tx as unknown as RawBusinessPlanWriter;
      await writer.$executeRaw`
        update crm.crm_business_plan_line_d
           set plan_monthly_revenue_amounts = ${JSON.stringify(monthlyRevenueAmounts)}::jsonb,
               plan_candidate_amount = ${BigInt(planCandidateAmount)},
               actual_gap_amount = contract_actual_amount - ${BigInt(planCandidateAmount)},
               memo = coalesce(${memo}, memo),
               updated_by = ${currentUserId ?? null},
               updated_at = now(),
               last_source = 'crm.business-plan',
               last_activity = 'monthly-plan-input',
               transaction_id = ${transactionId}::uuid
         where business_plan_id = ${existing.id}
           and business_plan_line_id = ${line.id}
           and is_active = true
      `;
      await writer.$executeRaw`
        update crm.crm_business_plan_m target
           set plan_candidate_amount_total = totals.plan_candidate_amount_total,
               actual_gap_amount_total = totals.actual_gap_amount_total,
               row_count = totals.row_count,
               memo = coalesce(${memo}, target.memo),
               updated_by = ${currentUserId ?? null},
               updated_at = now(),
               last_source = 'crm.business-plan',
               last_activity = 'monthly-plan-input',
               transaction_id = ${transactionId}::uuid
          from (
            select coalesce(sum(plan_candidate_amount), 0)::bigint as plan_candidate_amount_total,
                   coalesce(sum(actual_gap_amount), 0)::bigint as actual_gap_amount_total,
                   count(*)::int as row_count
              from crm.crm_business_plan_line_d
             where business_plan_id = ${existing.id}
               and is_active = true
          ) totals
         where target.business_plan_id = ${existing.id}
           and target.is_active = true
      `;
    });

    const plan = await this.getPlan(existing.code);
    const updatedLine = plan.lines.find((candidate) => candidate.id === line.id.toString());
    if (!updatedLine) {
      throw new NotFoundException('CRM business plan line not found');
    }

    return {
      plan,
      line: updatedLine,
      boundaryNotice: CRM_BUSINESS_PLAN_MONTHLY_INPUT_BOUNDARY_NOTICE,
    };
  }

  async savePerformanceActualInput(
    dto: CrmBusinessPlanPerformanceActualInputRequest,
    currentUserId?: bigint,
  ): Promise<CrmBusinessPlanPerformanceActualInputResult> {
    const db = this.requireDb();
    const normalized = this.normalizePerformanceActualInput(dto);
    const revenueAmountTotal = normalized.monthlyRevenueAmounts.reduce((sum, amount) => sum + amount, 0);
    const costAmountTotal = normalized.monthlyCostAmounts.reduce((sum, amount) => sum + amount, 0);
    const transactionId = randomUUID();
    const rows = await db.$queryRaw<CrmBusinessPlanPerformanceActualLedgerRow[]>`
      insert into crm.crm_business_plan_performance_actual_d (
        target_year, business_type, industry_line, owner_name, region_code, wbs_code,
        monthly_revenue_amounts, monthly_cost_amounts, revenue_amount_total, cost_amount_total,
        memo, created_by, updated_by, last_source, last_activity, transaction_id
      )
      values (
        ${normalized.year}, ${normalized.businessType}, ${normalized.industryLine}, ${normalized.ownerName},
        ${normalized.region}, ${normalized.wbsCode},
        ${JSON.stringify(normalized.monthlyRevenueAmounts)}::jsonb,
        ${JSON.stringify(normalized.monthlyCostAmounts)}::jsonb,
        ${BigInt(revenueAmountTotal)}, ${BigInt(costAmountTotal)},
        ${normalized.memo ?? null}, ${currentUserId ?? null}, ${currentUserId ?? null},
        'crm.business-plan-performance', 'performance-actual-input', ${transactionId}::uuid
      )
      on conflict (target_year, business_type, industry_line, owner_name, region_code, wbs_code)
      do update set
        monthly_revenue_amounts = excluded.monthly_revenue_amounts,
        monthly_cost_amounts = excluded.monthly_cost_amounts,
        revenue_amount_total = excluded.revenue_amount_total,
        cost_amount_total = excluded.cost_amount_total,
        memo = excluded.memo,
        is_active = true,
        updated_by = excluded.updated_by,
        updated_at = now(),
        last_source = excluded.last_source,
        last_activity = excluded.last_activity,
        transaction_id = excluded.transaction_id
      returning
        business_plan_performance_actual_id as "id",
        target_year as "targetYear",
        business_type as "businessType",
        industry_line as "industryLine",
        owner_name as "ownerName",
        region_code as "regionCode",
        wbs_code as "wbsCode",
        monthly_revenue_amounts as "monthlyRevenueAmounts",
        monthly_cost_amounts as "monthlyCostAmounts",
        revenue_amount_total as "revenueAmountTotal",
        cost_amount_total as "costAmountTotal",
        memo,
        updated_at as "updatedAt"
    `;
    const row = rows[0];
    if (!row) {
      throw new BadRequestException('사업계획대비실적 직접 입력 저장에 실패했습니다.');
    }
    return {
      input: this.toPerformanceActualInput(row),
      boundaryNotice: CRM_BUSINESS_PLAN_PERFORMANCE_ACTUAL_INPUT_BOUNDARY_NOTICE,
    };
  }

  async confirmPlan(id: string, currentUserId?: bigint): Promise<CrmBusinessPlan> {
    const db = this.requireDb();
    const existing = await this.findPlanWriteRow(id);
    if (!existing) {
      throw new NotFoundException('CRM business plan not found');
    }
    if (existing.confirmed) {
      return this.getPlan(existing.code);
    }
    await this.assertPlanHasLines(existing.id);
    await db.client.$transaction(async (tx) => {
      const writer = tx as unknown as RawBusinessPlanWriter;
      await writer.$executeRaw`
        update crm.crm_business_plan_m
           set confirmed = false,
               status_code = 'draft',
               confirmed_at = null,
               updated_by = ${currentUserId ?? null},
               updated_at = now(),
               last_source = 'crm.business-plan',
               last_activity = 'supersede'
         where base_year = ${existing.baseYear}
           and business_plan_id <> ${existing.id}
           and confirmed = true
           and is_active = true
      `;
      await writer.$executeRaw`
        update crm.crm_business_plan_m
           set confirmed = true,
               status_code = 'confirmed',
               confirmed_at = now(),
               updated_by = ${currentUserId ?? null},
               updated_at = now(),
               last_source = 'crm.business-plan',
               last_activity = 'confirm'
         where business_plan_id = ${existing.id}
           and is_active = true
      `;
    });

    return this.getPlan(existing.code);
  }

  async reopenPlan(id: string, currentUserId?: bigint): Promise<CrmBusinessPlan> {
    const db = this.requireDb();
    const existing = await this.findPlanWriteRow(id);
    if (!existing) {
      throw new NotFoundException('CRM business plan not found');
    }
    if (!existing.confirmed) {
      throw new BadRequestException('미확정 사업계획은 확정 해제할 수 없습니다.');
    }

    await db.$executeRaw`
      update crm.crm_business_plan_m
         set confirmed = false,
             status_code = 'draft',
             confirmed_at = null,
             updated_by = ${currentUserId ?? null},
             updated_at = now(),
             last_source = 'crm.business-plan',
             last_activity = 'reopen'
       where business_plan_id = ${existing.id}
         and is_active = true
    `;

    return this.getPlan(existing.code);
  }

  async getPlan(id: string): Promise<CrmBusinessPlan> {
    const response = await this.listPlans();
    const plan = response.items.find((candidate) => candidate.id === id || candidate.code === id);
    if (!plan) {
      throw new NotFoundException('CRM business plan not found');
    }
    return plan;
  }

  async getPreview(query: CrmBusinessPlanPreviewQuery = {}): Promise<CrmBusinessPlanPreviewResponse> {
    const normalized = this.normalizeQuery(query);
    const [opportunityResponse, performanceResponses] = await Promise.all([
      this.opportunityService.listResponse({ sort: 'updated-desc' }),
      Promise.all(normalized.years.map((year) => this.contractService.getMonthlyPerformance({
        year,
        businessType: normalized.businessType || undefined,
        industryLine: normalized.industryLine || undefined,
        region: normalized.region,
        search: normalized.search || undefined,
      }))),
    ]);
    const opportunities = this.filterOpportunities(opportunityResponse.items, normalized);
    const performanceRows = performanceResponses.flatMap((response, index) => (
      response.items.map((row): BusinessPlanPerformanceSlice => ({
        year: normalized.years[index] ?? normalized.baseYear,
        row,
      }))
    ));
    const businessTypeOptions = this.toSortedUniqueOptions([
      ...opportunityResponse.items.map((item) => item.businessType),
      ...performanceRows.map((item) => item.row.businessType),
    ]);
    const industryLineOptions = this.toSortedUniqueOptions([
      ...opportunityResponse.items.map((item) => item.industryLine),
      ...performanceRows.map((item) => item.row.industryLine),
    ]);
    const groups = new Map<string, BusinessPlanGroup>();

    opportunities.forEach((opportunity) => {
      const year = this.toYear(opportunity.expectedStartDate);
      if (!year || !normalized.years.includes(year)) {
        return;
      }
      const group = this.getOrCreateGroup(groups, {
        businessType: opportunity.businessType,
        industryLine: opportunity.industryLine,
        ownerName: opportunity.ownerName,
        region: opportunity.region,
      }, normalized.years);
      const yearItem = group.years.get(year);
      if (!yearItem) {
        return;
      }
      yearItem.pipelineAmount += opportunity.revenueTotal;
      yearItem.planCandidateAmount += opportunity.revenueTotal;
      yearItem.actualGapAmount = yearItem.contractActualAmount - yearItem.planCandidateAmount;
    });

    performanceRows.forEach(({ year, row: performanceRow }) => {
      if (!normalized.years.includes(year)) {
        return;
      }
      const group = this.getOrCreateGroup(groups, {
        businessType: performanceRow.businessType,
        industryLine: performanceRow.industryLine,
        ownerName: performanceRow.ownerName,
        region: performanceRow.region,
      }, normalized.years);
      const yearItem = group.years.get(year);
      if (!yearItem) {
        return;
      }
      yearItem.contractPlanAmount += performanceRow.total.planRevenueAmount;
      yearItem.contractActualAmount += performanceRow.total.actualRevenueAmount;
      yearItem.planCandidateAmount += performanceRow.total.planRevenueAmount;
      yearItem.actualGapAmount = yearItem.contractActualAmount - yearItem.planCandidateAmount;
    });

    const rows = [...groups.values()]
      .map((group) => this.toResponseRow(group, normalized.years))
      .filter((row) => row.planCandidateAmount > 0 || row.contractActualAmount > 0)
      .sort((left, right) => right.planCandidateAmount - left.planCandidateAmount);
    const years = normalized.years.map((year) => this.sumYear(rows, year));

    return {
      summary: this.buildSummary(rows, years, normalized, businessTypeOptions, industryLineOptions),
      years,
      rows,
    };
  }

  async getPerformancePreview(query: CrmBusinessPlanPerformanceQuery = {}): Promise<CrmBusinessPlanPerformanceResponse> {
    const normalized = this.normalizePerformanceQuery(query);
    const [opportunityResponse, performanceResponse, confirmedPlan] = await Promise.all([
      this.opportunityService.listResponse({ sort: 'updated-desc' }),
      this.contractService.getMonthlyPerformance({
        year: normalized.year,
        businessType: normalized.businessType || undefined,
        industryLine: normalized.industryLine || undefined,
        region: normalized.region,
        search: normalized.search || undefined,
      }),
      this.loadConfirmedPlan(normalized.year),
    ]);
    const groups = new Map<string, BusinessPlanPerformanceGroup>();
    const opportunities = this.filterPerformanceOpportunities(opportunityResponse.items, normalized);
    const confirmedPlanLines = confirmedPlan
      ? this.filterConfirmedPlanPerformanceLines(confirmedPlan.lines, normalized)
      : [];
    const [confirmedCostRows, directActualRows] = await Promise.all([
      this.loadConfirmedCostPerformanceRows(normalized),
      this.loadPerformanceActualRows(normalized),
    ]);
    const confirmedCostStats = this.countConfirmedCostRows(confirmedCostRows);
    const directActualStats = this.countDirectActualRows(directActualRows);
    const confirmedAmsExternalWbsCodes = this.toConfirmedAmsExternalWbsCodes(confirmedCostRows);
    const costAdjustmentStats = this.createCostAdjustmentStats();
    const businessTypeOptions = this.toSortedUniqueOptions([
      ...opportunityResponse.items.map((item) => item.businessType),
      ...performanceResponse.summary.businessTypeOptions,
      ...confirmedPlanLines.map((line) => line.businessType),
      ...confirmedCostRows.map((row) => row.businessType),
      ...directActualRows.map((row) => row.businessType),
    ]);
    const industryLineOptions = this.toSortedUniqueOptions([
      ...opportunityResponse.items.map((item) => item.industryLine),
      ...performanceResponse.summary.industryLineOptions,
      ...confirmedPlanLines.map((line) => line.industryLine),
      ...confirmedCostRows.map((row) => row.industryLine),
      ...directActualRows.map((row) => row.industryLine),
    ]);

    if (confirmedPlan) {
      confirmedPlanLines.forEach((line) => this.addConfirmedPlanPerformanceGroup(groups, confirmedPlan, line));
      performanceResponse.items.forEach((row) => this.addContractPerformanceGroup(groups, row, {
        includePlan: false,
        confirmedAmsExternalWbsCodes,
        costAdjustmentStats,
      }));
    } else {
      performanceResponse.items.forEach((row) => this.addContractPerformanceGroup(groups, row, {
        includePlan: true,
        confirmedAmsExternalWbsCodes,
        costAdjustmentStats,
      }));
      opportunities.forEach((opportunity) => this.addPipelinePerformanceGroup(groups, opportunity, normalized.year));
    }
    confirmedCostRows.forEach((row) => this.addConfirmedCostPerformanceGroup(groups, row));
    directActualRows.forEach((row) => this.addManualActualPerformanceGroup(groups, row));

    const rows = [...groups.values()]
      .map((group) => this.toPerformanceRow(group))
      .filter((row) => this.hasPerformanceAmount(row.total))
      .sort((left, right) => right.total.planRevenueAmount - left.total.planRevenueAmount);
    const months = this.sumPerformanceMonths(rows);

    return {
      summary: this.buildPerformanceSummary(
        rows,
        months,
        normalized,
        businessTypeOptions,
        industryLineOptions,
        confirmedPlan,
        confirmedCostStats,
        directActualStats,
        costAdjustmentStats,
      ),
      months,
      rows,
    };
  }

  private filterOpportunities(
    opportunities: CrmOpportunity[],
    query: NormalizedBusinessPlanPreviewQuery,
  ): CrmOpportunity[] {
    const search = query.search.toLowerCase();
    return opportunities.filter((opportunity) => {
      if (opportunity.status === 'lost' || opportunity.status === 'hold') {
        return false;
      }
      if (query.businessType && opportunity.businessType !== query.businessType) {
        return false;
      }
      if (query.industryLine && opportunity.industryLine !== query.industryLine) {
        return false;
      }
      if (query.region !== 'all' && opportunity.region !== query.region) {
        return false;
      }
      if (!search) {
        return true;
      }
      return [
        opportunity.customerName,
        opportunity.opportunityName,
        opportunity.ownerName,
        opportunity.businessType,
        opportunity.industryLine,
        opportunity.contractCode ?? '',
      ].some((value) => value.toLowerCase().includes(search));
    });
  }

  private filterPerformanceOpportunities(
    opportunities: CrmOpportunity[],
    query: NormalizedBusinessPlanPerformanceQuery,
  ): CrmOpportunity[] {
    const search = query.search.toLowerCase();
    return opportunities.filter((opportunity) => {
      if (opportunity.status === 'lost' || opportunity.status === 'hold') {
        return false;
      }
      if (query.businessType && opportunity.businessType !== query.businessType) {
        return false;
      }
      if (query.industryLine && opportunity.industryLine !== query.industryLine) {
        return false;
      }
      if (query.region !== 'all' && opportunity.region !== query.region) {
        return false;
      }
      if (this.toYear(opportunity.expectedStartDate) !== query.year) {
        return false;
      }
      if (!search) {
        return true;
      }
      return [
        opportunity.customerName,
        opportunity.opportunityName,
        opportunity.ownerName,
        opportunity.businessType,
        opportunity.industryLine,
        opportunity.contractCode ?? '',
      ].some((value) => value.toLowerCase().includes(search));
    });
  }

  private filterConfirmedPlanPerformanceLines(
    lines: CrmBusinessPlanLine[],
    query: NormalizedBusinessPlanPerformanceQuery,
  ): CrmBusinessPlanLine[] {
    const search = query.search.toLowerCase();
    return lines.filter((line) => {
      if (line.targetYear !== query.year) {
        return false;
      }
      if (query.businessType && line.businessType !== query.businessType) {
        return false;
      }
      if (query.industryLine && line.industryLine !== query.industryLine) {
        return false;
      }
      if (query.region !== 'all' && line.region !== query.region) {
        return false;
      }
      if (!search) {
        return true;
      }
      return [
        line.lineCode,
        line.businessType,
        line.industryLine,
        line.ownerName,
      ].some((value) => value.toLowerCase().includes(search));
    });
  }

  private getOrCreateGroup(
    groups: Map<string, BusinessPlanGroup>,
    seed: {
      businessType: string;
      industryLine: string;
      ownerName: string;
      region: Exclude<CrmBusinessPlanPreviewRegion, 'all'>;
    },
    years: number[],
  ): BusinessPlanGroup {
    const key = this.createBusinessPlanGroupKey(seed);
    const existing = groups.get(key);
    if (existing) {
      return existing;
    }
    const group: BusinessPlanGroup = {
      key,
      businessType: seed.businessType.trim() || '미분류 사업',
      industryLine: seed.industryLine.trim() || '미분류 계열',
      ownerName: seed.ownerName.trim() || '담당 미지정',
      region: seed.region,
      years: new Map(years.map((year) => [year, this.createEmptyYear(year)])),
    };
    groups.set(key, group);
    return group;
  }

  private toResponseRow(group: BusinessPlanGroup, years: number[]): CrmBusinessPlanPreviewRow {
    const yearItems = years.map((year) => group.years.get(year) ?? this.createEmptyYear(year));
    const totals = yearItems.reduce((sum, item) => ({
      pipelineAmount: sum.pipelineAmount + item.pipelineAmount,
      contractPlanAmount: sum.contractPlanAmount + item.contractPlanAmount,
      contractActualAmount: sum.contractActualAmount + item.contractActualAmount,
      planCandidateAmount: sum.planCandidateAmount + item.planCandidateAmount,
      actualGapAmount: sum.actualGapAmount + item.actualGapAmount,
    }), {
      pipelineAmount: 0,
      contractPlanAmount: 0,
      contractActualAmount: 0,
      planCandidateAmount: 0,
      actualGapAmount: 0,
    });

    return {
      key: group.key,
      businessType: group.businessType,
      industryLine: group.industryLine,
      ownerName: group.ownerName,
      region: group.region,
      ...totals,
      years: yearItems,
    };
  }

  private sumYear(rows: CrmBusinessPlanPreviewRow[], year: number): CrmBusinessPlanPreviewYear {
    const totals = rows
      .map((row) => row.years.find((item) => item.year === year) ?? this.createEmptyYear(year))
      .reduce((sum, item) => ({
        pipelineAmount: sum.pipelineAmount + item.pipelineAmount,
        contractPlanAmount: sum.contractPlanAmount + item.contractPlanAmount,
        contractActualAmount: sum.contractActualAmount + item.contractActualAmount,
        planCandidateAmount: sum.planCandidateAmount + item.planCandidateAmount,
        actualGapAmount: sum.actualGapAmount + item.actualGapAmount,
      }), {
        pipelineAmount: 0,
        contractPlanAmount: 0,
        contractActualAmount: 0,
        planCandidateAmount: 0,
        actualGapAmount: 0,
      });
    return { year, ...totals };
  }

  private addContractPerformanceGroup(
    groups: Map<string, BusinessPlanPerformanceGroup>,
    row: CrmContractPerformanceRow,
    options: {
      includePlan: boolean;
      confirmedAmsExternalWbsCodes: Set<string>;
      costAdjustmentStats: BusinessPlanPerformanceCostAdjustmentStats;
    },
  ): void {
    const wbsKey = this.toWbsKey(row.wbsCode);
    const excludeExternalCost = wbsKey ? options.confirmedAmsExternalWbsCodes.has(wbsKey) : false;
    const group = this.getOrCreatePerformanceGroup(groups, {
      key: `contract:${row.wbsCode?.trim() || row.contractId}`,
      label: row.contractName,
      businessType: row.businessType,
      industryLine: row.industryLine,
      ownerName: row.ownerName,
      region: row.region,
      source: 'contract',
      wbsCode: row.wbsCode,
    });
    row.months.forEach((month) => {
      const target = group.months.get(month.month);
      if (!target) {
        return;
      }
      if (options.includePlan) {
        target.planRevenueAmount += month.planRevenueAmount;
        if (excludeExternalCost) {
          options.costAdjustmentStats.amsExternalCostAdjustedPlanAmountTotal += month.planExternalCostAmount;
        } else {
          target.planCostAmount += month.planExternalCostAmount;
        }
      }
      target.actualRevenueAmount += month.actualRevenueAmount;
      if (excludeExternalCost) {
        options.costAdjustmentStats.amsExternalCostAdjustedActualAmountTotal += month.actualExternalCostAmount;
        if ((options.includePlan && month.planExternalCostAmount > 0) || month.actualExternalCostAmount > 0) {
          options.costAdjustmentStats.amsExternalCostAdjustedWbsCodes.add(wbsKey);
        }
      } else {
        target.actualCostAmount += month.actualExternalCostAmount;
      }
    });
  }

  private addConfirmedPlanPerformanceGroup(
    groups: Map<string, BusinessPlanPerformanceGroup>,
    plan: CrmBusinessPlan,
    line: CrmBusinessPlanLine,
  ): void {
    const group = this.getOrCreatePerformanceGroup(groups, {
      key: `confirmed-plan:${line.id}`,
      label: `${plan.code} · ${line.businessType} · ${line.ownerName}`,
      businessType: line.businessType,
      industryLine: line.industryLine,
      ownerName: line.ownerName,
      region: line.region,
      source: 'confirmed-plan',
    });
    const monthlyRevenueAmounts = line.monthlyPlanRevenueAmounts.length === 12
      ? line.monthlyPlanRevenueAmounts
      : this.distributeAnnualAmount(line.planCandidateAmount);
    monthlyRevenueAmounts.forEach((amount, index) => {
      const target = group.months.get(index + 1);
      if (!target) {
        return;
      }
      target.planRevenueAmount += amount;
    });
  }

  private addConfirmedCostPerformanceGroup(
    groups: Map<string, BusinessPlanPerformanceGroup>,
    row: CrmBusinessPlanConfirmedCostLedgerRow,
  ): void {
    const isAms = row.costSource === 'ams-external';
    const vendorName = row.vendorName?.trim();
    const wbsCode = row.wbsCode.trim();
    const sourceLabel = isAms ? 'AMS 정산 확정' : '내부원가 확정';
    const label = vendorName
      ? `${sourceLabel} · ${vendorName}`
      : `${sourceLabel} · ${wbsCode || row.businessType}`;
    const group = this.getOrCreatePerformanceGroup(groups, {
      key: `confirmed-cost:${row.costSource}:${row.id.toString()}`,
      label,
      businessType: row.businessType,
      industryLine: row.industryLine,
      ownerName: row.ownerName,
      region: this.toLineRegion(row.regionCode),
      source: 'confirmed-cost',
      wbsCode: wbsCode || undefined,
    });
    const monthlyPlanAmounts = this.normalizeMonthlyAmounts(row.monthlyPlanAmounts, row.planAmountTotal);
    const monthlyActualAmounts = this.normalizeMonthlyAmounts(row.monthlyActualAmounts, row.actualAmountTotal);
    monthlyPlanAmounts.forEach((amount, index) => {
      const target = group.months.get(index + 1);
      if (!target) {
        return;
      }
      target.planCostAmount += amount;
    });
    monthlyActualAmounts.forEach((amount, index) => {
      const target = group.months.get(index + 1);
      if (!target) {
        return;
      }
      target.actualCostAmount += amount;
    });
  }

  private addManualActualPerformanceGroup(
    groups: Map<string, BusinessPlanPerformanceGroup>,
    row: CrmBusinessPlanPerformanceActualLedgerRow,
  ): void {
    const wbsCode = row.wbsCode.trim();
    const group = this.getOrCreatePerformanceGroup(groups, {
      key: `manual-actual:${row.id.toString()}`,
      label: wbsCode ? `직접 실적 입력 · ${wbsCode}` : `직접 실적 입력 · ${row.businessType}`,
      businessType: row.businessType,
      industryLine: row.industryLine,
      ownerName: row.ownerName,
      region: this.toLineRegion(row.regionCode),
      source: 'manual-actual',
      wbsCode: wbsCode || undefined,
    });
    const monthlyRevenueAmounts = this.normalizeMonthlyAmounts(row.monthlyRevenueAmounts, row.revenueAmountTotal);
    const monthlyCostAmounts = this.normalizeMonthlyAmounts(row.monthlyCostAmounts, row.costAmountTotal);
    monthlyRevenueAmounts.forEach((amount, index) => {
      const target = group.months.get(index + 1);
      if (!target) {
        return;
      }
      target.actualRevenueAmount += amount;
    });
    monthlyCostAmounts.forEach((amount, index) => {
      const target = group.months.get(index + 1);
      if (!target) {
        return;
      }
      target.actualCostAmount += amount;
    });
  }

  private addPipelinePerformanceGroup(
    groups: Map<string, BusinessPlanPerformanceGroup>,
    opportunity: CrmOpportunity,
    year: number,
  ): void {
    const month = this.toMonthInYear(opportunity.expectedStartDate, year);
    if (!month) {
      return;
    }
    const group = this.getOrCreatePerformanceGroup(groups, {
      key: `pipeline:${opportunity.id}`,
      label: opportunity.opportunityName,
      businessType: opportunity.businessType,
      industryLine: opportunity.industryLine,
      ownerName: opportunity.ownerName,
      region: opportunity.region,
      source: 'pipeline',
    });
    const target = group.months.get(month);
    if (!target) {
      return;
    }
    target.planRevenueAmount += opportunity.revenueTotal;
    target.planCostAmount += opportunity.costTotal;
  }

  private getOrCreatePerformanceGroup(
    groups: Map<string, BusinessPlanPerformanceGroup>,
    seed: {
      key: string;
      label: string;
      businessType: string;
      industryLine: string;
      ownerName: string;
      region: Exclude<CrmBusinessPlanPreviewRegion, 'all'>;
      source: CrmBusinessPlanPerformanceSource;
      wbsCode?: string;
    },
  ): BusinessPlanPerformanceGroup {
    const existing = groups.get(seed.key);
    if (existing) {
      existing.source = existing.source === seed.source ? existing.source : 'mixed';
      return existing;
    }
    const group: BusinessPlanPerformanceGroup = {
      key: seed.key,
      label: seed.label.trim() || '사업계획 후보',
      businessType: seed.businessType.trim() || '미분류 사업',
      industryLine: seed.industryLine.trim() || '미분류 계열',
      ownerName: seed.ownerName.trim() || '담당 미지정',
      region: seed.region,
      source: seed.source,
      wbsCode: seed.wbsCode?.trim() || undefined,
      months: new Map(Array.from({ length: 12 }, (_, index) => [index + 1, this.createPerformanceMonth(index + 1)])),
    };
    groups.set(seed.key, group);
    return group;
  }

  private toPerformanceRow(group: BusinessPlanPerformanceGroup): CrmBusinessPlanPerformanceRow {
    const months = Array.from({ length: 12 }, (_, index) => (
      this.finalizePerformanceMonth(group.months.get(index + 1) ?? this.createPerformanceMonth(index + 1))
    ));
    const total = this.finalizePerformanceMonth(months.reduce((sum, month) => {
      sum.planRevenueAmount += month.planRevenueAmount;
      sum.planCostAmount += month.planCostAmount;
      sum.actualRevenueAmount += month.actualRevenueAmount;
      sum.actualCostAmount += month.actualCostAmount;
      return sum;
    }, this.createPerformanceMonth(0)));

    return {
      key: group.key,
      label: group.label,
      businessType: group.businessType,
      industryLine: group.industryLine,
      ownerName: group.ownerName,
      region: group.region,
      source: group.source,
      wbsCode: group.wbsCode,
      months,
      total,
    };
  }

  private sumPerformanceMonths(rows: CrmBusinessPlanPerformanceRow[]): CrmBusinessPlanPerformanceMonth[] {
    const months = Array.from({ length: 12 }, (_, index) => this.createPerformanceMonth(index + 1));
    rows.forEach((row) => {
      row.months.forEach((month) => {
        const target = months[month.month - 1];
        if (!target) {
          return;
        }
        target.planRevenueAmount += month.planRevenueAmount;
        target.planCostAmount += month.planCostAmount;
        target.actualRevenueAmount += month.actualRevenueAmount;
        target.actualCostAmount += month.actualCostAmount;
      });
    });
    return months.map((month) => this.finalizePerformanceMonth(month));
  }

  private groupPlanLines(rows: CrmBusinessPlanLineLedgerRow[]): Map<string, CrmBusinessPlanLineLedgerRow[]> {
    const map = new Map<string, CrmBusinessPlanLineLedgerRow[]>();
    rows.forEach((row) => {
      const key = row.businessPlanId.toString();
      const current = map.get(key) ?? [];
      current.push(row);
      map.set(key, current);
    });
    return map;
  }

  private filterPlans(
    plans: CrmBusinessPlan[],
    query: Required<CrmBusinessPlanListQuery>,
  ): CrmBusinessPlan[] {
    const search = query.search.toLowerCase();
    return plans.filter((plan) => {
      if (query.baseYear > 0 && plan.baseYear !== query.baseYear) {
        return false;
      }
      if (query.status !== 'all' && plan.status !== query.status) {
        return false;
      }
      if (!search) {
        return true;
      }
      return [
        plan.code,
        plan.planName,
        plan.memo ?? '',
        plan.filters.businessType,
        plan.filters.industryLine,
        plan.filters.search,
      ].some((value) => value.toLowerCase().includes(search));
    });
  }

  private buildPlanListSummary(
    plans: CrmBusinessPlan[],
    query: Required<CrmBusinessPlanListQuery>,
  ): CrmBusinessPlanListResponse['summary'] {
    const confirmedPlan = plans.find((plan) => plan.confirmed);
    const latestVersion = plans.reduce<number | undefined>((latest, plan) => (
      latest === undefined || plan.version > latest ? plan.version : latest
    ), undefined);
    return {
      baseYear: query.baseYear > 0 ? query.baseYear : undefined,
      rowCount: plans.length,
      draftCount: plans.filter((plan) => plan.status === 'draft').length,
      confirmedCount: plans.filter((plan) => plan.status === 'confirmed').length,
      latestVersion,
      confirmedPlanId: confirmedPlan?.id,
      activeFilters: query,
      boundaryNotice: CRM_BUSINESS_PLAN_LEDGER_BOUNDARY_NOTICE,
      unavailableActions: CRM_BUSINESS_PLAN_LEDGER_UNAVAILABLE_ACTIONS,
    };
  }

  private toBusinessPlan(
    row: CrmBusinessPlanLedgerRow,
    lineRows: CrmBusinessPlanLineLedgerRow[],
  ): CrmBusinessPlan {
    return {
      id: row.id.toString(),
      code: row.code,
      planName: row.planName,
      baseYear: row.baseYear,
      version: row.versionNo,
      status: this.toBusinessPlanStatus(row.statusCode, row.confirmed),
      confirmed: row.confirmed,
      confirmedAt: row.confirmedAt?.toISOString(),
      filters: {
        baseYear: row.baseYear,
        businessType: row.businessTypeFilter ?? '',
        industryLine: row.industryLineFilter ?? '',
        region: this.toPreviewRegion(row.regionFilter),
        search: row.searchFilter ?? '',
      },
      pipelineAmountTotal: this.toNumber(row.pipelineAmountTotal),
      contractPlanAmountTotal: this.toNumber(row.contractPlanAmountTotal),
      contractActualAmountTotal: this.toNumber(row.contractActualAmountTotal),
      planCandidateAmountTotal: this.toNumber(row.planCandidateAmountTotal),
      actualGapAmountTotal: this.toNumber(row.actualGapAmountTotal),
      rowCount: row.rowCount,
      lines: lineRows.map((line) => this.toBusinessPlanLine(line)),
      memo: row.memo ?? undefined,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toBusinessPlanLine(row: CrmBusinessPlanLineLedgerRow): CrmBusinessPlanLine {
    const monthlyPlanRevenueAmounts = this.resolveMonthlyPlanRevenueAmounts(row);
    return {
      id: row.id.toString(),
      lineCode: row.lineCode,
      targetYear: row.targetYear,
      businessType: row.businessType,
      industryLine: row.industryLine,
      ownerName: row.ownerName,
      region: this.toLineRegion(row.regionCode),
      pipelineAmount: this.toNumber(row.pipelineAmount),
      contractPlanAmount: this.toNumber(row.contractPlanAmount),
      contractActualAmount: this.toNumber(row.contractActualAmount),
      planCandidateAmount: this.toNumber(row.planCandidateAmount),
      monthlyPlanRevenueAmounts: monthlyPlanRevenueAmounts.amounts,
      monthlyPlanInputMode: monthlyPlanRevenueAmounts.mode,
      actualGapAmount: this.toNumber(row.actualGapAmount),
    };
  }

  private toPerformanceActualInput(row: CrmBusinessPlanPerformanceActualLedgerRow): CrmBusinessPlanPerformanceActualInput {
    const monthlyRevenueAmounts = this.normalizeMonthlyAmounts(row.monthlyRevenueAmounts, row.revenueAmountTotal);
    const monthlyCostAmounts = this.normalizeMonthlyAmounts(row.monthlyCostAmounts, row.costAmountTotal);
    return {
      id: row.id.toString(),
      year: row.targetYear,
      businessType: row.businessType,
      industryLine: row.industryLine,
      ownerName: row.ownerName,
      region: this.toLineRegion(row.regionCode),
      ...(row.wbsCode.trim() ? { wbsCode: row.wbsCode.trim() } : {}),
      monthlyRevenueAmounts,
      monthlyCostAmounts,
      revenueAmountTotal: monthlyRevenueAmounts.reduce((sum, amount) => sum + amount, 0),
      costAmountTotal: monthlyCostAmounts.reduce((sum, amount) => sum + amount, 0),
      ...(row.memo?.trim() ? { memo: row.memo.trim() } : {}),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async findPlanWriteRow(id: string): Promise<CrmBusinessPlanLedgerRow | null> {
    const db = this.requireDb();
    const rows = await db.$queryRaw<CrmBusinessPlanLedgerRow[]>`
      select business_plan_id as "id",
             business_plan_code as "code",
             plan_name as "planName",
             base_year as "baseYear",
             version_no as "versionNo",
             status_code as "statusCode",
             confirmed,
             confirmed_at as "confirmedAt",
             business_type_filter as "businessTypeFilter",
             industry_line_filter as "industryLineFilter",
             region_filter as "regionFilter",
             search_filter as "searchFilter",
             pipeline_amount_total as "pipelineAmountTotal",
             contract_plan_amount_total as "contractPlanAmountTotal",
             contract_actual_amount_total as "contractActualAmountTotal",
             plan_candidate_amount_total as "planCandidateAmountTotal",
             actual_gap_amount_total as "actualGapAmountTotal",
             row_count as "rowCount",
             memo,
             updated_at as "updatedAt"
        from crm.crm_business_plan_m
       where is_active = true
         and (business_plan_code = ${id} or business_plan_id::text = ${id})
       limit 1
    `;
    return rows[0] ?? null;
  }

  private async loadConfirmedPlan(baseYear: number): Promise<CrmBusinessPlan | null> {
    if (!this.db) {
      return null;
    }
    const response = await this.listPlans({ baseYear, status: 'confirmed' });
    return response.items.find((plan) => plan.baseYear === baseYear && plan.confirmed) ?? null;
  }

  private async loadConfirmedCostPerformanceRows(
    query: NormalizedBusinessPlanPerformanceQuery,
  ): Promise<CrmBusinessPlanConfirmedCostLedgerRow[]> {
    if (!this.db) {
      return [];
    }
    const rows = await this.db.$queryRaw<CrmBusinessPlanConfirmedCostLedgerRow[]>`
      select 'internal' as "costSource",
             cost_plan_internal_monthly_id as "id",
             target_year as "targetYear",
             business_type as "businessType",
             industry_line as "industryLine",
             owner_name as "ownerName",
             region_code as "regionCode",
             wbs_code as "wbsCode",
             null::text as "vendorName",
             monthly_plan_amounts as "monthlyPlanAmounts",
             monthly_actual_amounts as "monthlyActualAmounts",
             plan_amount_total as "planAmountTotal",
             actual_amount_total as "actualAmountTotal",
             confirmed_at as "confirmedAt"
        from crm.crm_cost_plan_internal_monthly_d
       where target_year = ${query.year}
         and is_active = true
         and confirmed = true
         and status_code = 'confirmed'
      union all
      select 'ams-external' as "costSource",
             cost_plan_ams_external_monthly_id as "id",
             target_year as "targetYear",
             business_type as "businessType",
             industry_line as "industryLine",
             owner_name as "ownerName",
             region_code as "regionCode",
             wbs_code as "wbsCode",
             vendor_name as "vendorName",
             monthly_plan_amounts as "monthlyPlanAmounts",
             monthly_actual_amounts as "monthlyActualAmounts",
             plan_amount_total as "planAmountTotal",
             actual_amount_total as "actualAmountTotal",
             confirmed_at as "confirmedAt"
        from crm.crm_cost_plan_ams_external_monthly_d
       where target_year = ${query.year}
         and is_active = true
         and confirmed = true
         and status_code = 'confirmed'
       order by "costSource", "businessType", "industryLine", "ownerName", "wbsCode", "vendorName"
    `;
    return (rows ?? []).filter((row) => this.matchesConfirmedCostPerformanceRow(row, query));
  }

  private async loadPerformanceActualRows(
    query: NormalizedBusinessPlanPerformanceQuery,
  ): Promise<CrmBusinessPlanPerformanceActualLedgerRow[]> {
    if (!this.db) {
      return [];
    }
    const rows = await this.db.$queryRaw<CrmBusinessPlanPerformanceActualLedgerRow[]>`
      select business_plan_performance_actual_id as "id",
             target_year as "targetYear",
             business_type as "businessType",
             industry_line as "industryLine",
             owner_name as "ownerName",
             region_code as "regionCode",
             wbs_code as "wbsCode",
             monthly_revenue_amounts as "monthlyRevenueAmounts",
             monthly_cost_amounts as "monthlyCostAmounts",
             revenue_amount_total as "revenueAmountTotal",
             cost_amount_total as "costAmountTotal",
             memo,
             updated_at as "updatedAt"
        from crm.crm_business_plan_performance_actual_d
       where target_year = ${query.year}
         and is_active = true
       order by business_type, industry_line, owner_name, wbs_code, business_plan_performance_actual_id
    `;
    return (rows ?? []).filter((row) => this.matchesPerformanceActualRow(row, query));
  }

  private matchesConfirmedCostPerformanceRow(
    row: CrmBusinessPlanConfirmedCostLedgerRow,
    query: NormalizedBusinessPlanPerformanceQuery,
  ): boolean {
    if (query.businessType && row.businessType !== query.businessType) {
      return false;
    }
    if (query.industryLine && row.industryLine !== query.industryLine) {
      return false;
    }
    if (query.region !== 'all' && this.toLineRegion(row.regionCode) !== query.region) {
      return false;
    }
    if (!query.search) {
      return true;
    }
    const search = query.search.toLowerCase();
    return [
      row.businessType,
      row.industryLine,
      row.ownerName,
      row.wbsCode,
      row.vendorName ?? '',
      row.costSource === 'ams-external' ? 'AMS 정산 확정' : '내부원가 확정',
    ].some((value) => value.toLowerCase().includes(search));
  }

  private matchesPerformanceActualRow(
    row: CrmBusinessPlanPerformanceActualLedgerRow,
    query: NormalizedBusinessPlanPerformanceQuery,
  ): boolean {
    if (query.businessType && row.businessType !== query.businessType) {
      return false;
    }
    if (query.industryLine && row.industryLine !== query.industryLine) {
      return false;
    }
    if (query.region !== 'all' && this.toLineRegion(row.regionCode) !== query.region) {
      return false;
    }
    if (!query.search) {
      return true;
    }
    const search = query.search.toLowerCase();
    return [
      row.businessType,
      row.industryLine,
      row.ownerName,
      row.wbsCode,
      row.memo ?? '',
      '직접 실적 입력',
    ].some((value) => value.toLowerCase().includes(search));
  }

  private countConfirmedCostRows(rows: CrmBusinessPlanConfirmedCostLedgerRow[]): BusinessPlanPerformanceCostStats {
    return {
      total: rows.length,
      internal: rows.filter((row) => row.costSource === 'internal').length,
      amsExternal: rows.filter((row) => row.costSource === 'ams-external').length,
    };
  }

  private countDirectActualRows(rows: CrmBusinessPlanPerformanceActualLedgerRow[]): BusinessPlanPerformanceDirectActualStats {
    return {
      total: rows.length,
      revenueAmountTotal: rows.reduce((sum, row) => sum + this.toNumber(row.revenueAmountTotal), 0),
      costAmountTotal: rows.reduce((sum, row) => sum + this.toNumber(row.costAmountTotal), 0),
    };
  }

  private toConfirmedAmsExternalWbsCodes(rows: CrmBusinessPlanConfirmedCostLedgerRow[]): Set<string> {
    return new Set(rows
      .filter((row) => row.costSource === 'ams-external')
      .map((row) => this.toWbsKey(row.wbsCode))
      .filter((value) => value.length > 0));
  }

  private createCostAdjustmentStats(): BusinessPlanPerformanceCostAdjustmentStats {
    return {
      amsExternalCostAdjustedWbsCodes: new Set<string>(),
      amsExternalCostAdjustedPlanAmountTotal: 0,
      amsExternalCostAdjustedActualAmountTotal: 0,
    };
  }

  private toWbsKey(value: string | null | undefined): string {
    return value?.trim().toUpperCase() ?? '';
  }

  private async findPlanLineWriteRow(planId: bigint, lineId: string): Promise<CrmBusinessPlanLineLedgerRow | null> {
    const db = this.requireDb();
    const rows = await db.$queryRaw<CrmBusinessPlanLineLedgerRow[]>`
      select business_plan_id as "businessPlanId",
             business_plan_line_id as "id",
             line_code as "lineCode",
             target_year as "targetYear",
             business_type as "businessType",
             industry_line as "industryLine",
             owner_name as "ownerName",
             region_code as "regionCode",
             pipeline_amount as "pipelineAmount",
             contract_plan_amount as "contractPlanAmount",
             contract_actual_amount as "contractActualAmount",
             plan_candidate_amount as "planCandidateAmount",
             plan_monthly_revenue_amounts as "planMonthlyRevenueAmounts",
             actual_gap_amount as "actualGapAmount",
             sort_order as "sortOrder"
        from crm.crm_business_plan_line_d
       where business_plan_id = ${planId}
         and is_active = true
         and (business_plan_line_id::text = ${lineId} or line_code = ${lineId})
       limit 1
    `;
    return rows[0] ?? null;
  }

  private async assertPlanHasLines(planId: bigint): Promise<void> {
    const db = this.requireDb();
    const rows = await db.$queryRaw<CrmBusinessPlanLineCountRow[]>`
      select count(*) as "lineCount"
        from crm.crm_business_plan_line_d
       where business_plan_id = ${planId}
         and is_active = true
    `;
    if (this.toNumber(rows[0]?.lineCount ?? 0) === 0) {
      throw new BadRequestException('사업계획 상세가 없는 차수는 확정할 수 없습니다.');
    }
  }

  private async resolveNextVersion(writer: RawBusinessPlanWriter, baseYear: number): Promise<number> {
    const rows = await writer.$queryRaw<CrmBusinessPlanVersionRow[]>`
      select coalesce(max(version_no), 0) + 1 as "versionNo"
        from crm.crm_business_plan_m
       where base_year = ${baseYear}
         and is_active = true
    `;
    return this.toNumber(rows[0]?.versionNo ?? 1);
  }

  private async insertBusinessPlanDraft(
    db: DatabaseService,
    normalized: NormalizedBusinessPlanPreviewQuery,
    rows: CrmBusinessPlanPreviewRow[],
    planName: string,
    memo: string | null,
    currentUserId: bigint | undefined,
    activity: 'snapshot' | 'carry-forward',
  ): Promise<CrmBusinessPlanInsertedRow> {
    const years = normalized.years.map((year) => this.sumYear(rows, year));
    const totals = years.reduce((sum, year) => ({
      pipelineAmount: sum.pipelineAmount + year.pipelineAmount,
      contractPlanAmount: sum.contractPlanAmount + year.contractPlanAmount,
      contractActualAmount: sum.contractActualAmount + year.contractActualAmount,
      planCandidateAmount: sum.planCandidateAmount + year.planCandidateAmount,
      actualGapAmount: sum.actualGapAmount + year.actualGapAmount,
    }), {
      pipelineAmount: 0,
      contractPlanAmount: 0,
      contractActualAmount: 0,
      planCandidateAmount: 0,
      actualGapAmount: 0,
    });
    const transactionId = randomUUID();
    return db.client.$transaction(async (tx) => {
      const writer = tx as unknown as RawBusinessPlanWriter;
      const nextVersion = await this.resolveNextVersion(writer, normalized.baseYear);
      const planCode = this.createBusinessPlanCode(normalized.baseYear, nextVersion);
      const insertedRows = await writer.$queryRaw<CrmBusinessPlanInsertedRow[]>`
        insert into crm.crm_business_plan_m (
          business_plan_code, plan_name, base_year, version_no, status_code, confirmed,
          business_type_filter, industry_line_filter, region_filter, search_filter,
          pipeline_amount_total, contract_plan_amount_total, contract_actual_amount_total,
          plan_candidate_amount_total, actual_gap_amount_total, row_count,
          memo, created_by, updated_by, last_source, last_activity, transaction_id
        )
        values (
          ${planCode}, ${planName}, ${normalized.baseYear}, ${nextVersion}, 'draft', false,
          ${normalized.businessType || null}, ${normalized.industryLine || null}, ${normalized.region}, ${normalized.search || null},
          ${BigInt(Math.round(totals.pipelineAmount))},
          ${BigInt(Math.round(totals.contractPlanAmount))},
          ${BigInt(Math.round(totals.contractActualAmount))},
          ${BigInt(Math.round(totals.planCandidateAmount))},
          ${BigInt(Math.round(totals.actualGapAmount))},
          ${rows.reduce((sum, row) => sum + row.years.length, 0)},
          ${memo}, ${currentUserId ?? null}, ${currentUserId ?? null}, 'crm.business-plan', ${activity}, ${transactionId}
        )
        returning business_plan_id as "id", business_plan_code as "code"
      `;
      const created = insertedRows[0];
      if (!created) {
        throw new BadRequestException('사업계획 원장 생성에 실패했습니다.');
      }
      await this.insertPlanLines(writer, created.id, rows, currentUserId, transactionId, activity);
      return created;
    });
  }

  private buildCarryForwardRows(
    sourcePlan: CrmBusinessPlan,
    previewRows: CrmBusinessPlanPreviewRow[],
    query: NormalizedBusinessPlanPreviewQuery,
  ): CrmBusinessPlanPreviewRow[] {
    const rowsByKey = new Map<string, CrmBusinessPlanPreviewRow>();
    previewRows.forEach((row) => {
      rowsByKey.set(row.key, this.cloneBusinessPlanPreviewRow(row, query.years));
    });

    let carriedLineCount = 0;
    this.filterCarryForwardSourceLines(sourcePlan.lines, query).forEach((line) => {
      const row = this.getOrCreateCarryForwardRow(rowsByKey, line, query.years);
      const yearItem = row.years.find((item) => item.year === line.targetYear);
      if (!yearItem) {
        return;
      }
      yearItem.pipelineAmount = line.pipelineAmount;
      yearItem.contractPlanAmount = line.contractPlanAmount;
      yearItem.contractActualAmount = line.contractActualAmount;
      yearItem.planCandidateAmount = line.planCandidateAmount;
      yearItem.actualGapAmount = line.actualGapAmount;
      carriedLineCount += 1;
    });

    if (carriedLineCount === 0) {
      return [];
    }

    return [...rowsByKey.values()]
      .map((row) => this.finalizeBusinessPlanPreviewRow(row, query.years))
      .filter((row) => row.planCandidateAmount > 0 || row.contractActualAmount > 0)
      .sort((left, right) => right.planCandidateAmount - left.planCandidateAmount);
  }

  private filterCarryForwardSourceLines(
    lines: CrmBusinessPlanLine[],
    query: NormalizedBusinessPlanPreviewQuery,
  ): CrmBusinessPlanLine[] {
    const search = query.search.toLowerCase();
    return lines.filter((line) => {
      if (!query.years.includes(line.targetYear)) {
        return false;
      }
      if (query.businessType && line.businessType !== query.businessType) {
        return false;
      }
      if (query.industryLine && line.industryLine !== query.industryLine) {
        return false;
      }
      if (query.region !== 'all' && line.region !== query.region) {
        return false;
      }
      if (!search) {
        return true;
      }
      return [
        line.lineCode,
        line.businessType,
        line.industryLine,
        line.ownerName,
      ].some((value) => value.toLowerCase().includes(search));
    });
  }

  private cloneBusinessPlanPreviewRow(
    row: CrmBusinessPlanPreviewRow,
    years: number[],
  ): CrmBusinessPlanPreviewRow {
    const yearsByValue = new Map(row.years.map((year) => [year.year, { ...year }]));
    return {
      ...row,
      years: years.map((year) => yearsByValue.get(year) ?? this.createEmptyYear(year)),
    };
  }

  private getOrCreateCarryForwardRow(
    rowsByKey: Map<string, CrmBusinessPlanPreviewRow>,
    line: CrmBusinessPlanLine,
    years: number[],
  ): CrmBusinessPlanPreviewRow {
    const key = this.createBusinessPlanGroupKey(line);
    const existing = rowsByKey.get(key);
    if (existing) {
      return existing;
    }
    const row: CrmBusinessPlanPreviewRow = {
      key,
      businessType: line.businessType.trim() || '미분류 사업',
      industryLine: line.industryLine.trim() || '미분류 계열',
      ownerName: line.ownerName.trim() || '담당 미지정',
      region: line.region,
      pipelineAmount: 0,
      contractPlanAmount: 0,
      contractActualAmount: 0,
      planCandidateAmount: 0,
      actualGapAmount: 0,
      years: years.map((year) => this.createEmptyYear(year)),
    };
    rowsByKey.set(key, row);
    return row;
  }

  private finalizeBusinessPlanPreviewRow(
    row: CrmBusinessPlanPreviewRow,
    years: number[],
  ): CrmBusinessPlanPreviewRow {
    const yearItems = years.map((year) => (
      row.years.find((item) => item.year === year) ?? this.createEmptyYear(year)
    ));
    const totals = yearItems.reduce((sum, item) => ({
      pipelineAmount: sum.pipelineAmount + item.pipelineAmount,
      contractPlanAmount: sum.contractPlanAmount + item.contractPlanAmount,
      contractActualAmount: sum.contractActualAmount + item.contractActualAmount,
      planCandidateAmount: sum.planCandidateAmount + item.planCandidateAmount,
      actualGapAmount: sum.actualGapAmount + item.actualGapAmount,
    }), {
      pipelineAmount: 0,
      contractPlanAmount: 0,
      contractActualAmount: 0,
      planCandidateAmount: 0,
      actualGapAmount: 0,
    });
    return {
      ...row,
      ...totals,
      years: yearItems,
    };
  }

  private async insertPlanLines(
    writer: RawBusinessPlanWriter,
    planId: bigint,
    rows: CrmBusinessPlanPreviewRow[],
    currentUserId: bigint | undefined,
    transactionId: string,
    activity: 'snapshot' | 'carry-forward' = 'snapshot',
  ): Promise<void> {
    let sortOrder = 0;
    for (const row of rows) {
      for (const year of row.years) {
        sortOrder += 10;
        const lineCode = this.createBusinessPlanLineCode(row.key, year.year);
        await writer.$executeRaw`
          insert into crm.crm_business_plan_line_d (
            business_plan_id, line_code, target_year, business_type, industry_line, owner_name, region_code,
            pipeline_amount, contract_plan_amount, contract_actual_amount, plan_candidate_amount, actual_gap_amount,
            sort_order, created_by, updated_by, last_source, last_activity, transaction_id
          )
          values (
            ${planId}, ${lineCode}, ${year.year}, ${row.businessType}, ${row.industryLine}, ${row.ownerName}, ${row.region},
            ${BigInt(Math.round(year.pipelineAmount))},
            ${BigInt(Math.round(year.contractPlanAmount))},
            ${BigInt(Math.round(year.contractActualAmount))},
            ${BigInt(Math.round(year.planCandidateAmount))},
            ${BigInt(Math.round(year.actualGapAmount))},
            ${sortOrder}, ${currentUserId ?? null}, ${currentUserId ?? null}, 'crm.business-plan', ${activity}, ${transactionId}
          )
        `;
      }
    }
  }

  private requireDb(): DatabaseService {
    if (!this.db) {
      throw new BadRequestException('CRM business plan ledger is not available in this runtime.');
    }
    return this.db;
  }

  private buildPerformanceSummary(
    rows: CrmBusinessPlanPerformanceRow[],
    months: CrmBusinessPlanPerformanceMonth[],
    query: NormalizedBusinessPlanPerformanceQuery,
    businessTypeOptions: string[],
    industryLineOptions: string[],
    confirmedPlan: CrmBusinessPlan | null,
    confirmedCostStats: BusinessPlanPerformanceCostStats,
    directActualStats: BusinessPlanPerformanceDirectActualStats,
    costAdjustmentStats: BusinessPlanPerformanceCostAdjustmentStats,
  ): CrmBusinessPlanPerformanceResponse['summary'] {
    const total = this.finalizePerformanceMonth(months.reduce((sum, month) => {
      sum.planRevenueAmount += month.planRevenueAmount;
      sum.planCostAmount += month.planCostAmount;
      sum.actualRevenueAmount += month.actualRevenueAmount;
      sum.actualCostAmount += month.actualCostAmount;
      return sum;
    }, this.createPerformanceMonth(0)));

    return {
      year: query.year,
      rowCount: rows.length,
      planRevenueTotal: total.planRevenueAmount,
      planCostTotal: total.planCostAmount,
      planMarginTotal: total.planMarginAmount,
      actualRevenueTotal: total.actualRevenueAmount,
      actualCostTotal: total.actualCostAmount,
      actualMarginTotal: total.actualMarginAmount,
      revenueGapTotal: total.revenueGapAmount,
      costGapTotal: total.costGapAmount,
      marginGapTotal: total.marginGapAmount,
      activeFilters: {
        year: query.year,
        businessType: query.businessType,
        industryLine: query.industryLine,
        region: query.region,
        search: query.search,
      },
      businessTypeOptions,
      industryLineOptions,
      planBasisLabel: confirmedPlan
        ? CRM_BUSINESS_PLAN_PERFORMANCE_CONFIRMED_PLAN_BASIS_LABEL
        : CRM_BUSINESS_PLAN_PERFORMANCE_FALLBACK_PLAN_BASIS_LABEL,
      costBasisLabel: costAdjustmentStats.amsExternalCostAdjustedWbsCodes.size > 0
        ? CRM_BUSINESS_PLAN_PERFORMANCE_ADJUSTED_COST_BASIS_LABEL
        : confirmedCostStats.total > 0
        ? CRM_BUSINESS_PLAN_PERFORMANCE_CONFIRMED_COST_BASIS_LABEL
        : CRM_BUSINESS_PLAN_PERFORMANCE_CONTRACT_COST_BASIS_LABEL,
      confirmedCostInputCount: confirmedCostStats.total,
      confirmedInternalCostInputCount: confirmedCostStats.internal,
      confirmedAmsExternalCostInputCount: confirmedCostStats.amsExternal,
      directActualInputCount: directActualStats.total,
      directActualRevenueTotal: directActualStats.revenueAmountTotal,
      directActualCostTotal: directActualStats.costAmountTotal,
      amsExternalCostAdjustedWbsCount: costAdjustmentStats.amsExternalCostAdjustedWbsCodes.size,
      amsExternalCostAdjustedPlanAmountTotal: costAdjustmentStats.amsExternalCostAdjustedPlanAmountTotal,
      amsExternalCostAdjustedActualAmountTotal: costAdjustmentStats.amsExternalCostAdjustedActualAmountTotal,
      confirmedPlanAvailable: Boolean(confirmedPlan),
      confirmedPlanId: confirmedPlan?.id,
      confirmedPlanCode: confirmedPlan?.code,
      confirmedPlanName: confirmedPlan?.planName,
      boundaryNotice: confirmedPlan
        ? CRM_BUSINESS_PLAN_PERFORMANCE_CONFIRMED_BOUNDARY_NOTICE
        : CRM_BUSINESS_PLAN_PERFORMANCE_FALLBACK_BOUNDARY_NOTICE,
      unavailableActions: confirmedPlan
        ? CRM_BUSINESS_PLAN_PERFORMANCE_CONFIRMED_UNAVAILABLE_ACTIONS
        : CRM_BUSINESS_PLAN_PERFORMANCE_FALLBACK_UNAVAILABLE_ACTIONS,
    };
  }

  private hasPerformanceAmount(month: CrmBusinessPlanPerformanceMonth): boolean {
    return month.planRevenueAmount > 0
      || month.planCostAmount > 0
      || month.actualRevenueAmount > 0
      || month.actualCostAmount > 0;
  }

  private buildSummary(
    rows: CrmBusinessPlanPreviewRow[],
    years: CrmBusinessPlanPreviewYear[],
    query: NormalizedBusinessPlanPreviewQuery,
    businessTypeOptions: string[],
    industryLineOptions: string[],
  ): CrmBusinessPlanPreviewSummary {
    return {
      baseYear: query.baseYear,
      yearCount: query.years.length,
      rowCount: rows.length,
      pipelineAmountTotal: years.reduce((sum, item) => sum + item.pipelineAmount, 0),
      contractPlanAmountTotal: years.reduce((sum, item) => sum + item.contractPlanAmount, 0),
      contractActualAmountTotal: years.reduce((sum, item) => sum + item.contractActualAmount, 0),
      planCandidateAmountTotal: years.reduce((sum, item) => sum + item.planCandidateAmount, 0),
      actualGapAmountTotal: years.reduce((sum, item) => sum + item.actualGapAmount, 0),
      activeFilters: {
        baseYear: query.baseYear,
        businessType: query.businessType,
        industryLine: query.industryLine,
        region: query.region,
        search: query.search,
      },
      businessTypeOptions,
      industryLineOptions,
      sourceTypes: ['pipeline', 'contract-plan', 'contract-actual'],
      boundaryNotice: CRM_BUSINESS_PLAN_PREVIEW_BOUNDARY_NOTICE,
      unavailableActions: CRM_BUSINESS_PLAN_UNAVAILABLE_ACTIONS,
    };
  }

  private normalizeQuery(query: CrmBusinessPlanPreviewQuery): NormalizedBusinessPlanPreviewQuery {
    const rawYear = Number(query.baseYear ?? new Date().getFullYear());
    const baseYear = Number.isFinite(rawYear) && rawYear >= 2000 ? Math.trunc(rawYear) : new Date().getFullYear();
    const region = query.region && ['all', 'domestic', 'overseas'].includes(query.region) ? query.region : 'all';
    return {
      baseYear,
      businessType: query.businessType?.trim() ?? '',
      industryLine: query.industryLine?.trim() ?? '',
      region,
      search: query.search?.trim() ?? '',
      years: Array.from({ length: BUSINESS_PLAN_PREVIEW_YEAR_COUNT }, (_, index) => baseYear + index),
    };
  }

  private normalizePerformanceQuery(query: CrmBusinessPlanPerformanceQuery): NormalizedBusinessPlanPerformanceQuery {
    const rawYear = Number(query.year ?? new Date().getFullYear());
    const year = Number.isFinite(rawYear) && rawYear >= 2000 ? Math.trunc(rawYear) : new Date().getFullYear();
    const region = query.region && ['all', 'domestic', 'overseas'].includes(query.region) ? query.region : 'all';
    return {
      year,
      businessType: query.businessType?.trim() ?? '',
      industryLine: query.industryLine?.trim() ?? '',
      region,
      search: query.search?.trim() ?? '',
    };
  }

  private normalizePerformanceActualInput(
    dto: CrmBusinessPlanPerformanceActualInputRequest,
  ): NormalizedBusinessPlanPerformanceActualInput {
    const rawYear = Number(dto.year);
    const year = Number.isFinite(rawYear) && rawYear >= 2000 ? Math.trunc(rawYear) : new Date().getFullYear();
    const businessType = this.normalizeRequiredText(dto.businessType, '사업구분', 120);
    const industryLine = this.normalizeRequiredText(dto.industryLine, '계열/산업', 120);
    const ownerName = this.normalizeRequiredText(dto.ownerName, '담당자', 120);
    const region = dto.region === 'overseas' ? 'overseas' : 'domestic';
    const wbsCode = this.trimOptional(dto.wbsCode, 120) ?? '';
    return {
      year,
      businessType,
      industryLine,
      ownerName,
      region,
      wbsCode,
      monthlyRevenueAmounts: this.normalizeMonthlyInputAmounts(dto.monthlyRevenueAmounts, '월별 실적 매출'),
      monthlyCostAmounts: this.normalizeMonthlyInputAmounts(dto.monthlyCostAmounts, '월별 실적 원가'),
      memo: this.trimOptional(dto.memo, 1000) ?? undefined,
    };
  }

  private normalizeListQuery(query: CrmBusinessPlanListQuery): Required<CrmBusinessPlanListQuery> {
    const rawYear = Number(query.baseYear ?? 0);
    const baseYear = Number.isFinite(rawYear) && rawYear >= 2000 ? Math.trunc(rawYear) : 0;
    const rawStatus = query.status ?? 'all';
    const status = rawStatus === 'draft' || rawStatus === 'confirmed' ? rawStatus : 'all';
    return {
      baseYear,
      status,
      search: query.search?.trim() ?? '',
    };
  }

  private normalizeCarryForwardSourceBaseYear(value: number | undefined, targetBaseYear: number): number {
    const fallback = targetBaseYear - 1;
    const rawYear = Number(value ?? fallback);
    const sourceBaseYear = Number.isFinite(rawYear) && rawYear >= 2000 ? Math.trunc(rawYear) : fallback;
    if (sourceBaseYear >= targetBaseYear) {
      throw new BadRequestException('전년 이월 원천 기준년도는 새 기준년도보다 이전이어야 합니다.');
    }
    return sourceBaseYear;
  }

  private normalizePlanName(value: string | undefined, baseYear: number, suffix = 'Snapshot'): string {
    const normalized = value?.trim();
    if (normalized) {
      return normalized.slice(0, 200);
    }
    return `${baseYear} CRM 사업계획 ${suffix}`;
  }

  private trimOptional(value: string | undefined, maxLength: number): string | null {
    const normalized = value?.trim();
    return normalized ? normalized.slice(0, maxLength) : null;
  }

  private normalizeRequiredText(value: string | undefined, label: string, maxLength: number): string {
    const normalized = value?.trim();
    if (!normalized) {
      throw new BadRequestException(`${label}을 입력해야 합니다.`);
    }
    return normalized.slice(0, maxLength);
  }

  private createBusinessPlanCode(baseYear: number, version: number): string {
    const suffix = randomUUID().slice(0, 8).toUpperCase();
    return `BP-${baseYear}-V${String(version).padStart(3, '0')}-${suffix}`;
  }

  private createBusinessPlanLineCode(key: string, year: number): string {
    const normalized = key
      .replace(/[^a-zA-Z0-9가-힣]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 44);
    return `${normalized || 'line'}-${year}-${randomUUID().slice(0, 8)}`;
  }

  private createBusinessPlanGroupKey(seed: {
    businessType: string;
    industryLine: string;
    ownerName: string;
    region: Exclude<CrmBusinessPlanPreviewRegion, 'all'>;
  }): string {
    return [
      seed.businessType.trim() || '미분류 사업',
      seed.industryLine.trim() || '미분류 계열',
      seed.ownerName.trim() || '담당 미지정',
      seed.region,
    ].join('::');
  }

  private toBusinessPlanStatus(value: string, confirmed: boolean): CrmBusinessPlanStatus {
    if (confirmed || value === 'confirmed') {
      return 'confirmed';
    }
    return 'draft';
  }

  private toPreviewRegion(value: string): CrmBusinessPlanPreviewRegion {
    return value === 'domestic' || value === 'overseas' ? value : 'all';
  }

  private toLineRegion(value: string): Exclude<CrmBusinessPlanPreviewRegion, 'all'> {
    return value === 'overseas' ? 'overseas' : 'domestic';
  }

  private toNumber(value: bigint | number | null | undefined): number {
    if (typeof value === 'bigint') {
      return Number(value);
    }
    return Number(value ?? 0);
  }

  private normalizeMonthlyRevenueAmounts(value: unknown): number[] {
    if (!Array.isArray(value) || value.length !== 12) {
      throw new BadRequestException('월별 계획 매출은 1월부터 12월까지 12개 숫자로 입력해야 합니다.');
    }
    return value.map((item) => {
      const amount = Number(item);
      if (!Number.isFinite(amount) || amount < 0) {
        throw new BadRequestException('월별 계획 매출은 0 이상의 숫자만 입력할 수 있습니다.');
      }
      return Math.round(amount);
    });
  }

  private normalizeMonthlyInputAmounts(value: unknown, label: string): number[] {
    if (!Array.isArray(value) || value.length !== 12) {
      throw new BadRequestException(`${label}은 1월부터 12월까지 12개 숫자로 입력해야 합니다.`);
    }
    return value.map((item) => {
      const amount = Number(item);
      if (!Number.isFinite(amount) || amount < 0) {
        throw new BadRequestException(`${label}은 0 이상의 숫자만 입력할 수 있습니다.`);
      }
      return Math.round(amount);
    });
  }

  private normalizeMonthlyAmounts(value: unknown, fallbackTotal: bigint | number): number[] {
    const amounts = this.tryParseMonthlyAmounts(value);
    return amounts ?? this.distributeAnnualAmount(this.toNumber(fallbackTotal));
  }

  private resolveMonthlyPlanRevenueAmounts(row: CrmBusinessPlanLineLedgerRow): {
    amounts: number[];
    mode: CrmBusinessPlanLine['monthlyPlanInputMode'];
  } {
    const manual = this.tryParseMonthlyRevenueAmounts(row.planMonthlyRevenueAmounts);
    if (manual) {
      return {
        amounts: manual,
        mode: 'manual',
      };
    }
    return {
      amounts: this.distributeAnnualAmount(this.toNumber(row.planCandidateAmount)),
      mode: 'distributed',
    };
  }

  private tryParseMonthlyRevenueAmounts(value: unknown): number[] | null {
    return this.tryParseMonthlyAmounts(value);
  }

  private tryParseMonthlyAmounts(value: unknown): number[] | null {
    if (!Array.isArray(value) || value.length !== 12) {
      return null;
    }
    const amounts = value.map((item) => Number(item));
    if (amounts.some((amount) => !Number.isFinite(amount) || amount < 0)) {
      return null;
    }
    return amounts.map((amount) => Math.round(amount));
  }

  private createEmptyYear(year: number): CrmBusinessPlanPreviewYear {
    return {
      year,
      pipelineAmount: 0,
      contractPlanAmount: 0,
      contractActualAmount: 0,
      planCandidateAmount: 0,
      actualGapAmount: 0,
    };
  }

  private createPerformanceMonth(month: number): CrmBusinessPlanPerformanceMonth {
    return {
      month,
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
  }

  private finalizePerformanceMonth(month: CrmBusinessPlanPerformanceMonth): CrmBusinessPlanPerformanceMonth {
    const planMarginAmount = month.planRevenueAmount - month.planCostAmount;
    const actualMarginAmount = month.actualRevenueAmount - month.actualCostAmount;
    return {
      ...month,
      planMarginAmount,
      actualMarginAmount,
      revenueGapAmount: month.actualRevenueAmount - month.planRevenueAmount,
      costGapAmount: month.actualCostAmount - month.planCostAmount,
      marginGapAmount: actualMarginAmount - planMarginAmount,
    };
  }

  private distributeAnnualAmount(amount: number): number[] {
    const roundedAmount = Math.round(amount);
    const baseAmount = Math.trunc(roundedAmount / 12);
    let remainder = roundedAmount - (baseAmount * 12);

    return Array.from({ length: 12 }, () => {
      const adjustment = remainder > 0 ? 1 : remainder < 0 ? -1 : 0;
      remainder -= adjustment;
      return baseAmount + adjustment;
    });
  }

  private toYear(value: string): number | null {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.getFullYear();
  }

  private toMonthInYear(value: string, year: number): number | null {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) {
      return null;
    }
    return date.getMonth() + 1;
  }

  private toSortedUniqueOptions(values: string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, 'ko-KR'));
  }
}
