import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { Injectable } from '@nestjs/common';
import type { LaunchReadinessSnapshot } from '@ssoo/types/common';
import { redactSecretsInText, redactUrlCredentials } from '../../../common/security/secret-redaction.js';
import { DatabaseService } from '../../../database/database.service.js';
import { ControlPlaneSyncService } from '../access/control-plane-sync.service.js';
import type { DeepPartial, DmsConfig, RuntimePathBindingInfo } from '../runtime/dms-config.service.js';
import { configService } from '../runtime/dms-config.service.js';
import { personalSettingsService, type DmsPersonalSettings } from '../runtime/personal-settings.service.js';
import { gitService, type GitRepositoryBindingStatus } from '../runtime/git.service.js';
import type { SettingsAccessMode, SettingsProfileKey } from '../runtime/settings.types.js';
import { createDmsLogger } from '../runtime/dms-logger.js';
const logger = createDmsLogger('DmsSettingsService');

export type DmsSystemConfig = Omit<DmsConfig, 'git' | 'm365'> & {
  git: Omit<DmsConfig['git'], 'author'>;
};

export interface SettingsAccessInfo {
  mode: SettingsAccessMode;
  profileKey: SettingsProfileKey;
  canManageSystem: boolean;
  canManagePersonal: boolean;
}

export interface SettingsRuntimePathInfo {
  configuredPath: string;
  effectiveInput: string;
  resolvedPath: string;
  exists: boolean;
  isDirectory: boolean;
  readable: boolean;
  writable: boolean;
  required: boolean;
  status: 'ready' | 'blocked' | 'not-required';
  reason?: string;
  relativeToAppRoot: boolean;
  source: 'config' | 'env';
  envVar?: string;
}

export interface SettingsRuntimePathsSnapshot {
  markdownRoot: SettingsRuntimePathInfo;
  ingestQueue: SettingsRuntimePathInfo;
  storageRoots: {
    local: SettingsRuntimePathInfo;
    nas: SettingsRuntimePathInfo;
  };
  /** 템플릿 경로는 markdownRoot/_templates 에서 파생 (read-only info) */
  templateDir: string;
  template: SettingsRuntimePathInfo;
}

export interface DmsSettingsConfig {
  system?: DmsSystemConfig;
  personal: DmsPersonalSettings;
}

export interface SettingsRuntimeSnapshot {
  git: GitRepositoryBindingStatus;
  paths: SettingsRuntimePathsSnapshot;
  readiness: DmsRuntimeReadiness;
}

export interface DmsRuntimeReadinessCheck {
  key: 'database' | 'settings-persistence' | 'git-binding' | 'control-plane' | 'markdown-root' | 'ingest-queue' | 'storage-local' | 'storage-nas' | 'template-root';
  label: string;
  status: 'ready' | 'degraded' | 'blocked';
  reason: string;
}

export interface DmsRuntimeReadiness extends LaunchReadinessSnapshot {
  owner: 'dms';
  source: 'dms.settings.live-probe';
  checks: DmsRuntimeReadinessCheck[];
}

export interface SettingsSnapshot {
  config: DmsSettingsConfig;
  docDir: string;
  access: SettingsAccessInfo;
  runtime: SettingsRuntimeSnapshot | null;
}

export type SettingsServiceResult =
  | ({ success: true } & SettingsSnapshot)
  | { success: false; error: string };

function redactUrlCredentialsInText(value: string | undefined): string | undefined {
  return value === undefined ? undefined : redactSecretsInText(value);
}

function sanitizeSystemConfig(config: DmsConfig): DmsSystemConfig {
  const { author, ...git } = config.git;
  const { m365, ...system } = config;
  void author;
  void m365;
  const binding = configService.getGitBootstrapBinding();
  return {
    ...system,
    git: {
      ...git,
      bootstrapRemoteUrl: redactUrlCredentials(binding.bootstrapRemoteUrl) ?? '',
      bootstrapBranch: binding.bootstrapBranch ?? '',
    },
  };
}

function sanitizeRuntimeGitStatus(status: GitRepositoryBindingStatus): GitRepositoryBindingStatus {
  return {
    ...status,
    expectedRemoteUrl: redactUrlCredentials(status.expectedRemoteUrl),
    remoteUrl: redactUrlCredentials(status.remoteUrl),
    bootstrapRemoteUrl: redactUrlCredentials(status.bootstrapRemoteUrl),
    reason: redactUrlCredentialsInText(status.reason),
    bindingReason: redactUrlCredentialsInText(status.bindingReason),
    parityStatus: {
      ...status.parityStatus,
      reason: redactUrlCredentialsInText(status.parityStatus.reason),
    },
  };
}

type MutableSettingsPartial = Omit<DeepPartial<DmsSettingsConfig>, 'system'> & {
  system?: DeepPartial<DmsSystemConfig>;
};

function sanitizeMutableSettingsPartial(
  partial?: DeepPartial<DmsSettingsConfig>,
): MutableSettingsPartial | undefined {
  if (!partial) {
    return undefined;
  }

  const next: MutableSettingsPartial = { ...partial };
  const workspace = next.personal?.workspace as Record<string, unknown> | undefined;
  if (workspace && typeof workspace === 'object') {
    delete workspace.defaultSettingsView;
    delete workspace.showDiffByDefault;
  }

  if (!partial.system) {
    return next;
  }

  const { git: immutableGitSettings, ...mutableSystemSettings } = partial.system;
  void immutableGitSettings;
  const system = { ...mutableSystemSettings };

  // templates config is now derived from markdownRoot — strip entirely.
  // M365/Teams/Auth tenant settings are platform/Admin-owned, not DMS-owned settings.
  delete (system as Record<string, unknown>).templates;
  delete (system as Record<string, unknown>).m365;

  if (Object.keys(system as Record<string, unknown>).length > 0) {
    next.system = system as DeepPartial<DmsSettingsConfig>['system'];
  } else {
    delete next.system;
  }

  return next;
}

interface SettingsRequestAccess {
  canManageSystem: boolean;
  canManagePersonal: boolean;
}

@Injectable()
export class SettingsService {
  private static readonly READINESS_REFRESH_WINDOW_MS = 5_000;
  private static readonly READINESS_MAX_AGE_MS = 30_000;
  private static readonly READINESS_PROBE_TIMEOUT_MS = 10_000;

  private cachedRuntime: { refreshAfter: number; snapshot: SettingsRuntimeSnapshot } | null = null;
  private runtimeInFlight: Promise<SettingsRuntimeSnapshot> | null = null;

  constructor(
    private readonly db: DatabaseService,
    private readonly controlPlaneSyncService: ControlPlaneSyncService,
  ) {}

  private getImmutableGitSettingKeys(partial?: DeepPartial<DmsSettingsConfig>): string[] {
    const git = partial?.system?.git;
    if (!git || typeof git !== 'object') {
      return [];
    }

    return Object.keys(git).map((key) => `system.git.${key}`);
  }

  async getSettings(
    includeRuntime = false,
    userId?: string,
    access: SettingsRequestAccess = { canManageSystem: true, canManagePersonal: true },
  ): Promise<SettingsSnapshot> {
    return this.buildSnapshot(includeRuntime && access.canManageSystem, userId, access);
  }

  private toRuntimePathInfo(binding: RuntimePathBindingInfo, required: boolean): SettingsRuntimePathInfo {
    const base = {
      ...binding,
      required,
    };
    if (!fs.existsSync(binding.resolvedPath)) {
      return {
        ...base,
        exists: false,
        isDirectory: false,
        readable: false,
        writable: false,
        status: required ? 'blocked' : 'not-required',
        reason: required ? '필수 runtime 경로가 존재하지 않습니다.' : '비활성 provider 경로는 readiness 필수 대상이 아닙니다.',
      };
    }

    let isDirectory = false;
    let readable = false;
    let writable = false;
    let reason: string | undefined;
    let probePath: string | null = null;
    try {
      isDirectory = fs.statSync(binding.resolvedPath).isDirectory();
      if (!isDirectory) {
        reason = 'runtime 경로가 디렉터리가 아닙니다.';
      } else {
        fs.readdirSync(binding.resolvedPath);
        readable = true;
        probePath = path.join(binding.resolvedPath, `.dms-readiness-${process.pid}-${crypto.randomUUID()}`);
        fs.writeFileSync(probePath, '', { flag: 'wx' });
        writable = true;
      }
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
    } finally {
      if (probePath && fs.existsSync(probePath)) {
        try {
          fs.unlinkSync(probePath);
        } catch (error) {
          writable = false;
          reason = error instanceof Error ? error.message : String(error);
        }
      }
    }

    const usable = isDirectory && readable && writable;
    return {
      ...base,
      exists: true,
      isDirectory,
      readable,
      writable,
      status: required ? (usable ? 'ready' : 'blocked') : 'not-required',
      reason: required
        ? (usable ? undefined : reason ?? 'runtime 경로 read/write probe에 실패했습니다.')
        : '비활성 provider 경로는 readiness 필수 대상이 아닙니다.',
    };
  }

  private async buildRuntimeSnapshot(): Promise<SettingsRuntimeSnapshot> {
    const now = Date.now();
    if (this.cachedRuntime && now < this.cachedRuntime.refreshAfter) {
      return this.cachedRuntime.snapshot;
    }
    if (this.runtimeInFlight) {
      return this.runtimeInFlight;
    }
    this.runtimeInFlight = this.probeRuntimeSnapshot().then((snapshot) => {
      this.cachedRuntime = {
        refreshAfter: Date.now() + SettingsService.READINESS_REFRESH_WINDOW_MS,
        snapshot,
      };
      return snapshot;
    }).finally(() => {
      this.runtimeInFlight = null;
    });
    return this.runtimeInFlight;
  }

  private async probeRuntimeSnapshot(): Promise<SettingsRuntimeSnapshot> {
    const checkedAtDate = new Date();
    const docRootBinding = configService.getDocumentRootBinding();
    const resolvedDocDir = docRootBinding.resolvedPath;
    let gitProbeFailureReason: string | undefined;
    const runtimeGit = await this.withTimeout(
      gitService.getRepositoryBindingStatus(),
      SettingsService.READINESS_PROBE_TIMEOUT_MS,
    ).catch((error) => {
      gitProbeFailureReason = error instanceof Error ? error.message : 'Git readiness probe timeout';
      return { success: false as const, error: gitProbeFailureReason };
    });
    const gitBinding = configService.getGitBootstrapBinding();
    const storageConfig = configService.getConfig().storage;
    const templateDir = configService.getTemplateDir();
    const runtimePaths: SettingsRuntimePathsSnapshot = {
      markdownRoot: this.toRuntimePathInfo(docRootBinding, true),
      ingestQueue: this.toRuntimePathInfo(configService.getIngestQueueBinding(), true),
      storageRoots: {
        local: this.toRuntimePathInfo(
          configService.getStorageRootBinding('local'),
          storageConfig.local.enabled || storageConfig.defaultProvider === 'local',
        ),
        nas: this.toRuntimePathInfo(
          configService.getStorageRootBinding('nas'),
          storageConfig.nas.enabled || storageConfig.defaultProvider === 'nas',
        ),
      },
      templateDir,
      template: this.toRuntimePathInfo({
        ...docRootBinding,
        configuredPath: templateDir,
        effectiveInput: templateDir,
        resolvedPath: templateDir,
        relativeToAppRoot: false,
      }, true),
    };
    const git = runtimeGit.success
      ? sanitizeRuntimeGitStatus(runtimeGit.data)
      : sanitizeRuntimeGitStatus({
        instanceEnv: gitBinding.instanceEnv,
        expectedRemoteUrl: gitBinding.bootstrapRemoteUrl,
        appRoot: docRootBinding.appRoot,
        configuredRootInput: docRootBinding.effectiveInput,
        configuredRoot: resolvedDocDir,
        configuredRootExists: fs.existsSync(resolvedDocDir),
        configuredRootRelativeToAppRoot: docRootBinding.relativeToAppRoot,
        actualGitRoot: undefined,
        rootRelation: 'not-inside-repository',
        rootMismatch: false,
        state: 'git-unavailable',
        reason: runtimeGit.error,
        bindingSeverity: 'ok',
        bindingReason: undefined,
        actualRemoteMatchesExpected: null,
        gitAvailable: false,
        isRepository: false,
        hasGitMetadata: false,
        visibleEntryCount: 0,
        branch: undefined,
        remoteName: 'origin',
        remoteUrl: undefined,
        syncState: 'unavailable',
        syncStatus: undefined,
        parityStatus: {
          remote: 'origin',
          verified: false,
          canTreatLocalAsCanonical: false,
          reason: runtimeGit.error,
        },
        bootstrapRemoteUrl: gitBinding.bootstrapRemoteUrl,
        bootstrapBranch: gitBinding.bootstrapBranch,
        autoInit: configService.getAutoInit(),
        reconcileRequired: false,
      });
    return {
      git,
      paths: runtimePaths,
      readiness: await this.buildReadiness(git, runtimePaths, checkedAtDate, gitProbeFailureReason),
    };
  }

  private async buildReadiness(
    git: GitRepositoryBindingStatus,
    paths: SettingsRuntimePathsSnapshot,
    checkedAtDate: Date,
    probeFailureReason?: string,
  ): Promise<DmsRuntimeReadiness> {
    const checks: DmsRuntimeReadinessCheck[] = [];
    try {
      await this.db.client.$queryRawUnsafe('SELECT 1');
      checks.push({ key: 'database', label: 'Database', status: 'ready', reason: 'DB query probe가 성공했습니다.' });
    } catch {
      checks.push({ key: 'database', label: 'Database', status: 'blocked', reason: 'DB query probe에 실패했습니다.' });
    }

    const systemPersistence = configService.getPersistenceStatus();
    const personalPersistence = personalSettingsService.getPersistenceStatus();
    const persistenceReady = systemPersistence.initialized
      && systemPersistence.ready
      && personalPersistence.initialized
      && personalPersistence.ready;
    checks.push({
      key: 'settings-persistence',
      label: '설정 영속성',
      status: persistenceReady ? 'ready' : 'blocked',
      reason: persistenceReady
        ? '시스템/개인 설정 DB persistence가 준비되었습니다.'
        : '시스템 또는 개인 설정 DB persistence가 준비되지 않았습니다.',
    });

    const gitReady = git.bindingSeverity === 'ok'
      && git.state === 'ready'
      && git.gitAvailable
      && git.isRepository
      && git.parityStatus.verified
      && git.parityStatus.canTreatLocalAsCanonical;
    checks.push({
      key: 'git-binding',
      label: 'Git binding/parity',
      status: gitReady ? 'ready' : 'blocked',
      reason: gitReady
        ? 'Git working tree binding과 publish parity가 확인되었습니다.'
        : git.bindingReason ?? git.reason ?? git.parityStatus.reason ?? 'Git binding 또는 parity가 준비되지 않았습니다.',
    });

    const controlPlane = this.controlPlaneSyncService.getStatus();
    checks.push({
      key: 'control-plane',
      label: '문서 control-plane',
      status: controlPlane.state === 'ready'
        ? 'ready'
        : controlPlane.state === 'degraded' ? 'degraded' : 'blocked',
      reason: controlPlane.state === 'ready'
        ? `최근 동기화가 완료되었습니다${controlPlane.lastSuccessAt ? ` (${controlPlane.lastSuccessAt})` : ''}.`
        : controlPlane.reason ?? '초기 control-plane 동기화가 완료되지 않았습니다.',
    });

    const pathChecks: Array<{
      key: DmsRuntimeReadinessCheck['key'];
      label: string;
      path: SettingsRuntimePathInfo;
    }> = [
      { key: 'markdown-root', label: 'Markdown root', path: paths.markdownRoot },
      { key: 'ingest-queue', label: 'Ingest queue', path: paths.ingestQueue },
      { key: 'storage-local', label: 'Local storage', path: paths.storageRoots.local },
      { key: 'storage-nas', label: 'NAS storage', path: paths.storageRoots.nas },
      { key: 'template-root', label: 'Template root', path: paths.template },
    ];
    pathChecks.forEach((entry) => {
      checks.push({
        key: entry.key,
        label: entry.label,
        status: entry.path.status === 'blocked' ? 'blocked' : 'ready',
        reason: entry.path.status === 'ready'
          ? `read/write probe 통과: ${entry.path.resolvedPath}`
          : entry.path.reason ?? `readiness 확인 제외: ${entry.path.resolvedPath}`,
      });
    });

    const status = probeFailureReason
      ? 'unknown'
      : checks.some((check) => check.status === 'blocked')
      ? 'blocked'
      : checks.some((check) => check.status === 'degraded') ? 'degraded' : 'ready';
    const blockerCount = checks.filter((check) => check.status === 'blocked').length;
    const degradedCount = checks.filter((check) => check.status === 'degraded').length;
    return {
      owner: 'dms',
      snapshotId: `dms-${crypto.randomUUID()}`,
      checkedAt: checkedAtDate.toISOString(),
      expiresAt: new Date(checkedAtDate.getTime() + SettingsService.READINESS_MAX_AGE_MS).toISOString(),
      refreshWindowSeconds: SettingsService.READINESS_REFRESH_WINDOW_MS / 1_000,
      source: 'dms.settings.live-probe',
      status,
      reason: status === 'unknown'
        ? `DMS readiness probe를 제한 시간 안에 완료하지 못했습니다: ${probeFailureReason}`
        : status === 'ready'
        ? 'DMS DB, 설정, Git, control-plane, runtime path live probe가 모두 준비 상태입니다.'
        : `DMS live probe에서 차단 ${blockerCount}건, 주의 ${degradedCount}건을 확인했습니다.`,
      blockerCount: status === 'unknown' ? null : blockerCount,
      degradedCount: status === 'unknown' ? null : degradedCount,
      totalCount: status === 'unknown' ? null : checks.length,
      ownerHref: '/settings/operations/git',
      checks,
    };
  }

  async getReadiness(): Promise<DmsRuntimeReadiness> {
    try {
      return (await this.buildRuntimeSnapshot()).readiness;
    } catch {
      const checkedAtDate = new Date();
      return {
        owner: 'dms',
        snapshotId: `dms-${crypto.randomUUID()}`,
        checkedAt: checkedAtDate.toISOString(),
        expiresAt: new Date(checkedAtDate.getTime() + SettingsService.READINESS_MAX_AGE_MS).toISOString(),
        refreshWindowSeconds: SettingsService.READINESS_REFRESH_WINDOW_MS / 1_000,
        source: 'dms.settings.live-probe',
        status: 'unknown',
        reason: 'DMS readiness 구성 probe를 완료하지 못했습니다. owner 설정 화면에서 runtime 연결을 확인하세요.',
        blockerCount: null,
        degradedCount: null,
        totalCount: null,
        ownerHref: '/settings/operations/git',
        checks: [],
      };
    }
  }

  invalidateReadiness(): void {
    this.cachedRuntime = null;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Git readiness probe timeout')), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async buildSnapshot(
    includeRuntime = false,
    userId?: string,
    access: SettingsRequestAccess = { canManageSystem: true, canManagePersonal: true },
  ): Promise<SettingsSnapshot> {
    const docRootBinding = configService.getDocumentRootBinding();
    const resolvedDocDir = docRootBinding.resolvedPath;
    const runtime = includeRuntime && access.canManageSystem ? await this.buildRuntimeSnapshot() : null;

    const personal = userId
      ? await personalSettingsService.loadSettingsForUser(userId)
      : personalSettingsService.getSettings();

    return {
      config: {
        ...(access.canManageSystem ? { system: sanitizeSystemConfig(configService.getConfig()) } : {}),
        personal,
      },
      docDir: access.canManageSystem ? resolvedDocDir : '',
      access: {
        mode: personalSettingsService.getAccessMode(),
        profileKey: userId || personalSettingsService.getProfileKey(),
        canManageSystem: access.canManageSystem,
        canManagePersonal: access.canManagePersonal,
      },
      runtime,
    };
  }

  async updateSettings(
    partial?: DeepPartial<DmsSettingsConfig>,
    userId?: string,
    access: SettingsRequestAccess = { canManageSystem: true, canManagePersonal: true },
  ): Promise<SettingsServiceResult> {
    if (!partial) {
      return { success: true, ...(await this.buildSnapshot(false, userId, access)) };
    }

    if (partial.system && !access.canManageSystem) {
      return {
        success: false,
        error: 'DMS 시스템 설정은 admin 계정만 변경할 수 있습니다.',
      };
    }

    if (partial.personal && !access.canManagePersonal) {
      return {
        success: false,
        error: '내 DMS 설정을 변경할 권한이 없습니다.',
      };
    }

    const immutableGitSettingKeys = this.getImmutableGitSettingKeys(partial);
    if (immutableGitSettingKeys.length > 0) {
      return {
        success: false,
        error: `Git binding settings are runtime-managed and read-only. Remove these keys: ${immutableGitSettingKeys.join(', ')}`,
      };
    }

    const sanitizedPartial = sanitizeMutableSettingsPartial(partial);
    const previousDocDir = sanitizedPartial?.system ? configService.getDocDir() : null;

    if (sanitizedPartial?.system) {
      await configService.updateConfig(sanitizedPartial.system);
      const nextDocDir = configService.getDocDir();
      if (previousDocDir !== nextDocDir) {
        gitService.reconfigure(nextDocDir);
        logger.info('문서 Git working tree binding 갱신', {
          from: previousDocDir,
          to: nextDocDir,
        });
      }
      this.invalidateReadiness();
    }
    if (sanitizedPartial?.personal) {
      if (userId) {
        await personalSettingsService.updateSettingsForUser(userId, sanitizedPartial.personal);
      } else {
        personalSettingsService.updateSettings(sanitizedPartial.personal);
      }
    }

    return {
      success: true,
      ...(await this.buildSnapshot(true, userId, access)),
    };
  }

}
