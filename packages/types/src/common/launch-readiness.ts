export type LaunchReadinessOwner = 'crm' | 'dms';

export type LaunchReadinessStatus = 'ready' | 'degraded' | 'blocked' | 'unknown';

export type LaunchReadinessSource =
  | 'crm.operations.live-probe'
  | 'dms.settings.live-probe'
  | 'admin.bridge.unavailable'
  | 'admin.bridge.stale';

/**
 * Owner 앱이 생성하고 Admin bridge가 그대로 전달하는 런칭 준비도 스냅샷입니다.
 * `unknown`일 때 count는 0으로 대체하지 않고 null로 유지합니다.
 */
export interface LaunchReadinessSnapshot {
  owner: LaunchReadinessOwner;
  snapshotId: string | null;
  checkedAt: string | null;
  expiresAt: string | null;
  refreshWindowSeconds: number;
  source: LaunchReadinessSource;
  status: LaunchReadinessStatus;
  reason: string;
  blockerCount: number | null;
  degradedCount: number | null;
  totalCount: number | null;
  ownerHref: string;
}
