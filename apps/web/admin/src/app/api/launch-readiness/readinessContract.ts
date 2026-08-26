import type {
  LaunchReadinessOwner,
  LaunchReadinessSnapshot,
} from '@ssoo/types/common';

export function unavailableReadiness(owner: LaunchReadinessOwner, message: string): LaunchReadinessSnapshot {
  return {
    owner,
    snapshotId: null,
    checkedAt: null,
    expiresAt: null,
    refreshWindowSeconds: 5,
    source: 'admin.bridge.unavailable',
    status: 'unknown',
    reason: message,
    blockerCount: null,
    degradedCount: null,
    totalCount: null,
    ownerHref: owner === 'crm' ? '/operations' : '/settings/operations/git',
  };
}

export function normalizeOwnerSnapshot(
  owner: LaunchReadinessOwner,
  value: LaunchReadinessSnapshot,
  now = Date.now(),
): LaunchReadinessSnapshot {
  if (value.owner !== owner || !value.snapshotId || !value.checkedAt || !value.expiresAt
    || !Number.isFinite(Date.parse(value.checkedAt)) || !Number.isFinite(Date.parse(value.expiresAt))) {
    return unavailableReadiness(owner, `${owner.toUpperCase()} owner readiness 응답의 snapshot identity가 유효하지 않습니다.`);
  }
  if (Date.parse(value.expiresAt) <= now) {
    return {
      ...value,
      source: 'admin.bridge.stale',
      status: 'unknown',
      reason: `${owner.toUpperCase()} owner snapshot 유효 시간이 지났습니다. owner 화면과 Admin에서 다시 조회하세요.`,
      blockerCount: null,
      degradedCount: null,
      totalCount: null,
    };
  }
  if (value.status === 'unknown') {
    return {
      ...value,
      blockerCount: null,
      degradedCount: null,
      totalCount: null,
    };
  }
  if (value.blockerCount === null || value.degradedCount === null || value.totalCount === null) {
    return unavailableReadiness(owner, `${owner.toUpperCase()} owner readiness 응답의 count 계약이 유효하지 않습니다.`);
  }
  return value;
}
