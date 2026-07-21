import type { Project } from '@/lib/api/endpoints/projects';

function cleanText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

type CustomerOrganizationAnchor = {
  customerCode?: string | null;
  customerName?: string | null;
  organizationId?: string | number | null;
  organizationCode?: string | null;
  organizationName?: string | null;
};

export function formatProjectCustomerName(project: Project): string {
  const customerName = cleanText(project.customerName);
  const customerCode = cleanText(project.customerCode);

  if (customerName && customerCode) {
    return `${customerName} · ${customerCode}`;
  }

  return customerName ?? customerCode ?? '-';
}

export function formatProjectCustomerOrganizationLabel(project: Project): string {
  const organizationName = cleanText(project.customerOrganizationName);
  const organizationCode = cleanText(project.customerOrganizationCode);

  if (organizationName && organizationCode && organizationName !== organizationCode) {
    return `${organizationName} · ${organizationCode}`;
  }

  if (organizationName || organizationCode) {
    return organizationName ?? organizationCode ?? '';
  }

  if (project.customerOrganizationId) {
    return '공용 조직 정보 조회 필요';
  }

  return '공용 조직 미연결';
}

export function formatProjectCustomerLabel(project: Project): string {
  const customerLabel = formatProjectCustomerName(project);
  if (customerLabel === '-') {
    return customerLabel;
  }

  const organizationLabel = formatProjectCustomerOrganizationLabel(project);
  return organizationLabel === '공용 조직 미연결'
    ? customerLabel
    : `${customerLabel} · ${organizationLabel}`;
}

export function formatCustomerOrganizationAnchorLabel(customer: CustomerOrganizationAnchor): string {
  const organizationName = cleanText(customer.organizationName);
  const organizationCode = cleanText(customer.organizationCode);

  if (organizationName && organizationCode && organizationName !== organizationCode) {
    return `${organizationName} · ${organizationCode}`;
  }

  if (organizationName || organizationCode) {
    return organizationName ?? organizationCode ?? '';
  }

  if (customer.organizationId) {
    return '공용 조직 정보 조회 필요';
  }

  return '공용 조직 미연결';
}

export function formatCustomerLookupCaption(customer: CustomerOrganizationAnchor): string {
  const customerCode = cleanText(customer.customerCode);
  const organizationLabel = formatCustomerOrganizationAnchorLabel(customer);

  if (customerCode && organizationLabel !== '공용 조직 미연결') {
    return `${customerCode} · ${organizationLabel}`;
  }

  return customerCode ?? organizationLabel;
}

export function formatCustomerLookupLabel(customer: CustomerOrganizationAnchor): string {
  const customerName = cleanText(customer.customerName);
  const customerCode = cleanText(customer.customerCode);
  const customerLabel = customerName && customerCode
    ? `${customerName} · ${customerCode}`
    : customerName ?? customerCode ?? '고객사 이름 없음';
  const organizationLabel = formatCustomerOrganizationAnchorLabel(customer);

  return organizationLabel === '공용 조직 미연결'
    ? customerLabel
    : `${customerLabel} · ${organizationLabel}`;
}

export function formatProjectPlantSiteLabel(project: Project): string {
  const siteName = cleanText(project.plantSiteName);
  const siteCode = cleanText(project.plantSiteCode);
  if (siteName && siteCode) {
    return `${siteName} · ${siteCode}`;
  }

  return siteName ?? siteCode ?? (project.plantId ? '플랜트/사이트 정보 조회 필요' : '-');
}

export function formatProjectSystemInstanceLabel(project: Project): string {
  const instanceName = cleanText(project.systemInstanceName);
  const instanceCode = cleanText(project.systemInstanceCode);

  if (instanceName && instanceCode) {
    return `${instanceName} · ${instanceCode}`;
  }

  return instanceName ?? instanceCode ?? (project.systemInstanceId ? '시스템 인스턴스 정보 조회 필요' : '-');
}

export function formatProjectExecutionAssetLabel(project: Project): string {
  const plantSiteLabel = formatProjectPlantSiteLabel(project);
  const systemInstanceLabel = formatProjectSystemInstanceLabel(project);

  if (plantSiteLabel === '-' && systemInstanceLabel === '-') {
    return '-';
  }

  if (plantSiteLabel !== '-' && systemInstanceLabel !== '-') {
    return `${plantSiteLabel} / ${systemInstanceLabel}`;
  }

  return plantSiteLabel !== '-' ? plantSiteLabel : systemInstanceLabel;
}
