import { apiClient } from '../client';
import type { ApiResponse } from '../types';

export type TemplateGroupApprovalStatusCode = 'draft' | 'approved' | 'archived';

export interface DeliverableTemplateGroupItem {
  deliverableCode: string;
  deliverableName: string;
  description?: string | null;
  sortOrder: number;
  memo?: string | null;
  isActive: boolean;
}

export interface DeliverableTemplateGroup {
  groupCode: string;
  groupName: string;
  description?: string | null;
  sortOrder: number;
  approvalStatusCode: TemplateGroupApprovalStatusCode;
  versionNo: number;
  approvedBy?: string | null;
  approvedAt?: string | null;
  isActive: boolean;
  items: DeliverableTemplateGroupItem[];
}

export interface UpsertDeliverableTemplateGroupRequest {
  groupCode: string;
  groupName: string;
  description?: string | null;
  sortOrder?: number;
  items: Array<{
    deliverableCode: string;
    deliverableName: string;
    description?: string | null;
    sortOrder?: number;
    memo?: string | null;
  }>;
}

export interface CloseConditionTemplateGroupItem {
  conditionCode: string;
  requiresDeliverable: boolean;
  sortOrder: number;
  memo?: string | null;
  isActive: boolean;
}

export interface CloseConditionTemplateGroup {
  groupCode: string;
  groupName: string;
  description?: string | null;
  sortOrder: number;
  approvalStatusCode: TemplateGroupApprovalStatusCode;
  versionNo: number;
  approvedBy?: string | null;
  approvedAt?: string | null;
  isActive: boolean;
  items: CloseConditionTemplateGroupItem[];
}

export interface UpsertCloseConditionTemplateGroupRequest {
  groupCode: string;
  groupName: string;
  description?: string | null;
  sortOrder?: number;
  items: Array<{
    conditionCode: string;
    requiresDeliverable: boolean;
    sortOrder?: number;
    memo?: string | null;
  }>;
}

export interface TemplateGroupHistory {
  historySeq: string;
  eventType: string;
  eventAt: string;
  groupCode: string;
  groupName: string;
  description?: string | null;
  sortOrder: number;
  approvalStatusCode?: TemplateGroupApprovalStatusCode | null;
  versionNo?: number | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  isActive: boolean;
}

export interface UpdateTemplateGroupApprovalRequest {
  approvalStatusCode: TemplateGroupApprovalStatusCode;
}

const TEMPLATE_GROUP_BASE_PATH = '/pms/template-groups';

function encodePath(value: string): string {
  return encodeURIComponent(value);
}

export const pmsTemplatesApi = {
  deliverableGroups: async (): Promise<ApiResponse<DeliverableTemplateGroup[]>> => {
    const response = await apiClient.get<ApiResponse<DeliverableTemplateGroup[]>>(
      `${TEMPLATE_GROUP_BASE_PATH}/deliverables`,
    );
    return response.data;
  },

  saveDeliverableGroup: async (
    data: UpsertDeliverableTemplateGroupRequest,
  ): Promise<ApiResponse<DeliverableTemplateGroup>> => {
    const response = await apiClient.post<ApiResponse<DeliverableTemplateGroup>>(
      `${TEMPLATE_GROUP_BASE_PATH}/deliverables`,
      data,
    );
    return response.data;
  },

  deliverableGroupHistory: async (groupCode: string): Promise<ApiResponse<TemplateGroupHistory[]>> => {
    const response = await apiClient.get<ApiResponse<TemplateGroupHistory[]>>(
      `${TEMPLATE_GROUP_BASE_PATH}/deliverables/${encodePath(groupCode)}/history`,
    );
    return response.data;
  },

  updateDeliverableApproval: async (
    groupCode: string,
    data: UpdateTemplateGroupApprovalRequest,
  ): Promise<ApiResponse<DeliverableTemplateGroup>> => {
    const response = await apiClient.patch<ApiResponse<DeliverableTemplateGroup>>(
      `${TEMPLATE_GROUP_BASE_PATH}/deliverables/${encodePath(groupCode)}/approval`,
      data,
    );
    return response.data;
  },

  restoreDeliverableGroup: async (
    groupCode: string,
    historySeq: string,
  ): Promise<ApiResponse<DeliverableTemplateGroup>> => {
    const response = await apiClient.post<ApiResponse<DeliverableTemplateGroup>>(
      `${TEMPLATE_GROUP_BASE_PATH}/deliverables/${encodePath(groupCode)}/restore/${encodePath(historySeq)}`,
    );
    return response.data;
  },

  deactivateDeliverableGroup: async (groupCode: string): Promise<ApiResponse<DeliverableTemplateGroup>> => {
    const response = await apiClient.delete<ApiResponse<DeliverableTemplateGroup>>(
      `${TEMPLATE_GROUP_BASE_PATH}/deliverables/${encodePath(groupCode)}`,
    );
    return response.data;
  },

  closeConditionGroups: async (): Promise<ApiResponse<CloseConditionTemplateGroup[]>> => {
    const response = await apiClient.get<ApiResponse<CloseConditionTemplateGroup[]>>(
      `${TEMPLATE_GROUP_BASE_PATH}/close-conditions`,
    );
    return response.data;
  },

  saveCloseConditionGroup: async (
    data: UpsertCloseConditionTemplateGroupRequest,
  ): Promise<ApiResponse<CloseConditionTemplateGroup>> => {
    const response = await apiClient.post<ApiResponse<CloseConditionTemplateGroup>>(
      `${TEMPLATE_GROUP_BASE_PATH}/close-conditions`,
      data,
    );
    return response.data;
  },

  closeConditionGroupHistory: async (groupCode: string): Promise<ApiResponse<TemplateGroupHistory[]>> => {
    const response = await apiClient.get<ApiResponse<TemplateGroupHistory[]>>(
      `${TEMPLATE_GROUP_BASE_PATH}/close-conditions/${encodePath(groupCode)}/history`,
    );
    return response.data;
  },

  updateCloseConditionApproval: async (
    groupCode: string,
    data: UpdateTemplateGroupApprovalRequest,
  ): Promise<ApiResponse<CloseConditionTemplateGroup>> => {
    const response = await apiClient.patch<ApiResponse<CloseConditionTemplateGroup>>(
      `${TEMPLATE_GROUP_BASE_PATH}/close-conditions/${encodePath(groupCode)}/approval`,
      data,
    );
    return response.data;
  },

  restoreCloseConditionGroup: async (
    groupCode: string,
    historySeq: string,
  ): Promise<ApiResponse<CloseConditionTemplateGroup>> => {
    const response = await apiClient.post<ApiResponse<CloseConditionTemplateGroup>>(
      `${TEMPLATE_GROUP_BASE_PATH}/close-conditions/${encodePath(groupCode)}/restore/${encodePath(historySeq)}`,
    );
    return response.data;
  },

  deactivateCloseConditionGroup: async (
    groupCode: string,
  ): Promise<ApiResponse<CloseConditionTemplateGroup>> => {
    const response = await apiClient.delete<ApiResponse<CloseConditionTemplateGroup>>(
      `${TEMPLATE_GROUP_BASE_PATH}/close-conditions/${encodePath(groupCode)}`,
    );
    return response.data;
  },
};
