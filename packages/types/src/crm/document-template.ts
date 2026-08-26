export type CrmDmsDocumentTemplateTaskKey =
  | 'crm-quote-document'
  | 'crm-contract-document'
  | 'crm-opportunity-contract-document';

export interface CrmDmsDocumentTemplateOption {
  templateKey: string;
  templateName: string;
  taskKey: CrmDmsDocumentTemplateTaskKey;
  sourcePath?: string;
  status: 'active' | 'archived';
  docxFileName?: string;
  docxOrigin?: 'generated' | 'uploaded';
  reviewStatus?: 'pending' | 'confirmed';
  selectable: boolean;
  unavailableReason?: string;
}
