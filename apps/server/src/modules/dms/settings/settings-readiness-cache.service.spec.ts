import type { DatabaseService } from '../../../database/database.service.js';
import type { ControlPlaneSyncService } from '../access/control-plane-sync.service.js';
import {
  SettingsService,
  type SettingsRuntimeSnapshot,
} from './settings.service.js';

function createRuntimeSnapshot(snapshotId: string): SettingsRuntimeSnapshot {
  return {
    git: {} as SettingsRuntimeSnapshot['git'],
    paths: {} as SettingsRuntimeSnapshot['paths'],
    readiness: {
      owner: 'dms',
      snapshotId,
      checkedAt: '2026-08-19T00:00:00.000Z',
      expiresAt: '2026-08-19T00:00:30.000Z',
      refreshWindowSeconds: 5,
      source: 'dms.settings.live-probe',
      status: 'ready',
      reason: 'ready',
      blockerCount: 0,
      degradedCount: 0,
      totalCount: 9,
      ownerHref: '/settings/operations/git',
      checks: [],
    },
  };
}

describe('SettingsService readiness cache', () => {
  it('shares the runtime snapshot inside the refresh window and invalidates explicitly', async () => {
    const service = new SettingsService({} as DatabaseService, {} as ControlPlaneSyncService);
    let probes = 0;
    Object.assign(service, {
      probeRuntimeSnapshot: async () => createRuntimeSnapshot(`dms-${++probes}`),
    });
    const internal = service as unknown as { buildRuntimeSnapshot(): Promise<SettingsRuntimeSnapshot> };

    const [first, concurrent] = await Promise.all([internal.buildRuntimeSnapshot(), internal.buildRuntimeSnapshot()]);
    const cached = await internal.buildRuntimeSnapshot();

    expect(first.readiness.snapshotId).toBe('dms-1');
    expect(concurrent.readiness.snapshotId).toBe('dms-1');
    expect(cached.readiness.snapshotId).toBe('dms-1');
    expect(probes).toBe(1);

    service.invalidateReadiness();
    const refreshed = await internal.buildRuntimeSnapshot();
    expect(refreshed.readiness.snapshotId).toBe('dms-2');
    expect(probes).toBe(2);
  });

  it('does not turn a fatal owner probe failure into ready or 0/0', async () => {
    const service = new SettingsService({} as DatabaseService, {} as ControlPlaneSyncService);
    Object.assign(service, {
      probeRuntimeSnapshot: async () => { throw new Error('probe failed'); },
    });

    const result = await service.getReadiness();

    expect(result.status).toBe('unknown');
    expect(result.blockerCount).toBeNull();
    expect(result.degradedCount).toBeNull();
    expect(result.totalCount).toBeNull();
  });
});
