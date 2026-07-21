/**
 * React Query Hooks
 *
 * 데이터 페칭 및 캐싱을 위한 커스텀 훅
 */

// Codes
export {
  codeKeys,
  useCodeGroups,
  useCodesByGroup,
  useCreateCode,
  useUpdateCode,
  useDeactivateCode,
} from './useCodes';

// Customers
export {
  customerKeys,
  useCustomerList,
  useCustomerDetail,
} from './useCustomers';

// PMS Master
export {
  pmsMasterKeys,
  useCreatePmsMasterImportProfile,
  useCreatePlantSite,
  useCreateSystemCatalog,
  useCreateSystemInstance,
  useCreateSystemIntegration,
  useDeactivatePmsMasterImportProfile,
  useDeactivatePlantSite,
  useDeactivateSystemCatalog,
  useDeactivateSystemInstance,
  useDeactivateSystemIntegration,
  useImportPmsMaster,
  usePmsMasterImportProfileHistory,
  usePmsMasterImportProfiles,
  usePmsMasterSummary,
  usePlantSites,
  useRestorePmsMasterImportProfile,
  useSystemCatalogs,
  useSystemInstances,
  useSystemIntegrations,
  useUpdatePmsMasterImportProfile,
  useUpdatePlantSite,
  useUpdateSystemCatalog,
  useUpdateSystemInstance,
  useUpdateSystemIntegration,
} from './usePmsMaster';

// PMS Templates
export {
  pmsTemplateKeys,
  useDeactivatePmsCloseConditionTemplateGroup,
  useDeactivatePmsDeliverableTemplateGroup,
  usePmsCloseConditionTemplateGroupHistory,
  usePmsCloseConditionTemplateGroups,
  usePmsDeliverableTemplateGroupHistory,
  usePmsDeliverableTemplateGroups,
  useRestorePmsCloseConditionTemplateGroup,
  useRestorePmsDeliverableTemplateGroup,
  useSavePmsCloseConditionTemplateGroup,
  useSavePmsDeliverableTemplateGroup,
  useUpdatePmsCloseConditionTemplateGroupApproval,
  useUpdatePmsDeliverableTemplateGroupApproval,
} from './usePmsTemplates';

// Menus
export {
  menuKeys,
  useMyMenus,
  useAddFavorite,
  useRemoveFavorite,
} from './useMenus';

// Home
export {
  homeSummaryKeys,
  useHomeSummary,
} from './useHomeSummary';

// CRM Handoff
export {
  crmHandoffKeys,
  useCrmContractHandoffCandidates,
  useCrmContractPmsHandoffPreview,
} from './useCrmHandoff';

// Projects
export {
  projectKeys,
  projectDashboardKeys,
  taskEffortLogKeys,
  useProjectList,
  useProjectDetail,
  useProjectAccess,
  useProjectDashboardSummary,
  useProjectMembers,
  useProjectMemberUserLookup,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useCreateProjectOrg,
  useRemoveProjectOrg,
  useProjectOrgLookup,
  useProjectOrgs,
  useCreateProjectRelation,
  useRemoveProjectRelation,
  useProjectRelations,
  useProjectControlIssues,
  useCreateProjectIssue,
  useUpdateProjectIssue,
  useDeleteProjectIssue,
  useProjectRequirements,
  useCreateRequirement,
  useUpdateRequirement,
  useDeleteRequirement,
  useProjectRisks,
  useCreateRisk,
  useUpdateRisk,
  useDeleteRisk,
  useProjectChangeRequests,
  useCreateChangeRequest,
  useUpdateChangeRequest,
  useDeleteChangeRequest,
  useProjectEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useUpsertRequestDetail,
  useUpsertProposalDetail,
  useUpsertExecutionDetail,
  useUpsertTransitionDetail,
  useTransitionReadiness,
  useProjectHandoffs,
  useCreateProjectHandoff,
  useUpdateProjectHandoff,
  useProjectContracts,
  useApplyCrmContractHandoffSnapshot,
  useProjectTaskEffortLogs,
  useCreateTaskEffortLog,
  useUpdateTaskEffortLog,
  useDeleteTaskEffortLog,
  useReplaceDeliverableApprovalRoute,
  useDecideDeliverableApprovalStep,
  useReplaceCloseConditionApprovalRoute,
  useDecideCloseConditionApprovalStep,
} from './useProjects';

// Roles
export {
  roleKeys,
  useRoleList,
  useRoleMenuPermissions,
  useUpdateRolePermissions,
} from './useRoles';
