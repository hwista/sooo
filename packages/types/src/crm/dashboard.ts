import type {
  CrmContractSummary,
} from './contract.js';
import type {
  CrmOpportunityStatus,
  CrmOpportunitySummary,
} from './opportunity.js';
import type {
  CrmQuotePreviewSellerInfoStatus,
} from './quote.js';

export type CrmDashboardQueueKey =
  | 'quote'
  | 'contract-conversion'
  | 'pms-handoff'
  | 'dms-document';

export type CrmDashboardQueueState = 'ready' | 'blocked' | 'watch';

export type CrmDashboardNextActionKind = 'opportunity' | 'contract';

export interface CrmDashboardPipelineStage {
  status: CrmOpportunityStatus;
  label: string;
  count: number;
  revenueTotal: number;
  marginTotal: number;
}

export interface CrmDashboardQueue {
  key: CrmDashboardQueueKey;
  label: string;
  count: number;
  readyCount: number;
  blockedCount: number;
  amountTotal: number;
  href: string;
  state: CrmDashboardQueueState;
  description: string;
}

export interface CrmDashboardNextAction {
  id: string;
  kind: CrmDashboardNextActionKind;
  title: string;
  customerName: string;
  ownerName: string;
  statusLabel: string;
  nextAction: string;
  amount: number;
  href: string;
  updatedAt: string;
}

export interface CrmDashboardResponse {
  generatedAt: string;
  boundaryNotice: string;
  sellerInfoStatus: CrmQuotePreviewSellerInfoStatus;
  opportunitySummary: CrmOpportunitySummary;
  contractSummary: CrmContractSummary;
  pipeline: CrmDashboardPipelineStage[];
  queues: CrmDashboardQueue[];
  nextActions: CrmDashboardNextAction[];
  unimplementedIntegrations: string[];
}
