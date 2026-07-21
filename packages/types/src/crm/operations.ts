import type {
  CrmQuotePreviewSellerInfoStatus,
  CrmQuoteSellerProfile,
} from './quote.js';

export type CrmOperationsPreviewReadiness = 'ready' | 'partial' | 'planned' | 'external';
export type CrmOperationsPreviewOwner = 'crm' | 'shared-admin' | 'shared-auth' | 'dms' | 'pms';
export type CrmOperationsCodeGroupKey =
  | 'business-type'
  | 'industry-line'
  | 'payment-term'
  | 'region'
  | 'opportunity-status'
  | 'contract-status';

export interface CrmOperationsPreviewQuery {
  year?: number;
}

export interface CrmOperationsCodeOption {
  code: string;
  label: string;
  usageCount: number;
  source: 'ledger' | 'fixed';
}

export interface CrmOperationsCodeGroup {
  key: CrmOperationsCodeGroupKey;
  label: string;
  owner: CrmOperationsPreviewOwner;
  readiness: CrmOperationsPreviewReadiness;
  options: CrmOperationsCodeOption[];
  boundaryNote: string;
  unavailableActions: string[];
}

export interface CrmOperationsBusinessYear {
  year: number;
  opportunityCount: number;
  contractCount: number;
  billingPlanCount: number;
  selected: boolean;
  owner: CrmOperationsPreviewOwner;
  readiness: CrmOperationsPreviewReadiness;
}

export interface CrmOperationsAdminBoundaryItem {
  key: string;
  label: string;
  owner: CrmOperationsPreviewOwner;
  readiness: CrmOperationsPreviewReadiness;
  crmActionAvailable: boolean;
  targetSurface: string;
  boundaryNote: string;
}

export interface CrmOperationsSellerProfileStatus {
  profile: CrmQuoteSellerProfile;
  sellerInfoStatus: CrmQuotePreviewSellerInfoStatus;
  readiness: CrmOperationsPreviewReadiness;
  missingFields: string[];
  owner: CrmOperationsPreviewOwner;
  boundaryNote: string;
}

export interface CrmOperationsPreviewSummary {
  selectedYear: number;
  codeGroupCount: number;
  codeOptionCount: number;
  businessYearCount: number;
  adminBoundaryCount: number;
  crmOwnedCount: number;
  sharedOwnedCount: number;
  dmsOwnedCount: number;
  boundaryNotice: string;
  unavailableActions: string[];
}

export interface CrmOperationsPreviewResponse {
  generatedAt: string;
  summary: CrmOperationsPreviewSummary;
  sellerProfile: CrmOperationsSellerProfileStatus;
  codeGroups: CrmOperationsCodeGroup[];
  businessYears: CrmOperationsBusinessYear[];
  adminBoundaries: CrmOperationsAdminBoundaryItem[];
}
