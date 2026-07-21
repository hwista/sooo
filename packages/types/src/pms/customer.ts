/**
 * PMS customer lookup projection.
 *
 * Customer/account master editing is owned by CRM/Admin/common organization
 * surfaces. PMS keeps this read-only shape for project execution selection and
 * compatibility lookups only.
 */
export interface Customer {
  id: string;
  customerCode: string;
  customerName: string;
  customerType?: string | null;
  organizationId?: string | null;
  organizationCode?: string | null;
  organizationName?: string | null;
  organizationType?: string | null;
  organizationScope?: string | null;
  industry?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  isActive: boolean;
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
}
