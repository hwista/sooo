import type { PermissionResolutionTrace } from '../common/access';

export interface CrmOpportunityAccessFeatures {
  canViewOpportunity: boolean;
  canCreateOpportunity: boolean;
  canEditOpportunity: boolean;
  canConfirmOpportunity: boolean;
  canAddVersion: boolean;
}

export interface CrmCustomerAccessFeatures {
  canViewCustomer: boolean;
  canCreateCustomer: boolean;
  canEditCustomer: boolean;
  canViewCustomerActivity: boolean;
  canCreateCustomerActivity: boolean;
}

export interface CrmOpportunityAccessRoles {
  isOpportunityOwnerUserMatch: boolean;
  isOpportunityOwnerNameMatch: boolean;
  ownerUserId: string | null;
  ownerName: string | null;
}

export interface CrmCustomerAccessRoles {
  isCustomerOwnerUserMatch: boolean;
  isCustomerOwnerNameMatch: boolean;
  ownerUserId: string | null;
  ownerName: string | null;
}

export interface CrmOpportunityGlobalAccessSnapshot {
  features: CrmOpportunityAccessFeatures;
  policy: PermissionResolutionTrace;
}

export interface CrmCustomerGlobalAccessSnapshot {
  features: CrmCustomerAccessFeatures;
  policy: PermissionResolutionTrace;
}

export interface CrmOpportunityAccessSnapshot extends CrmOpportunityGlobalAccessSnapshot {
  opportunityId: string;
  groupId: string;
  roles: CrmOpportunityAccessRoles;
}

export interface CrmCustomerAccessSnapshot extends CrmCustomerGlobalAccessSnapshot {
  customerId: string;
  customerCode: string;
  roles: CrmCustomerAccessRoles;
}
