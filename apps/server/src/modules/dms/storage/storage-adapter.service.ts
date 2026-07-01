import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { configService, type StorageProvider } from '../runtime/dms-config.service.js';
import { normalizeDmsFileName } from '../runtime/file-utils.js';
import { normalizeRelativePath } from '../runtime/path-utils.js';

export type StorageOrigin = 'manual' | 'ingest' | 'teams' | 'network_drive';
export type StorageStatus = 'draft' | 'pending_confirm' | 'published';

export interface StorageReference {
  storageUri: string;
  provider: StorageProvider;
  path: string;
  name: string;
  size: number;
  versionId: string;
  etag: string;
  checksum: string;
  origin: StorageOrigin;
  status: StorageStatus;
  webUrl?: string;
}

export interface StorageUploadRequest {
  fileName: string;
  content: string | Buffer;
  provider?: StorageProvider;
  relativePath?: string;
  origin?: StorageOrigin;
  status?: StorageStatus;
}

export interface StorageOpenRequest {
  storageUri?: string;
  provider?: StorageProvider;
  path?: string;
  documentPath?: string;
}

export interface StorageRefreshRequest extends StorageOpenRequest {
  fileName?: string;
  origin?: StorageOrigin;
  status?: StorageStatus;
}

export interface StorageOpenResult {
  provider: StorageProvider;
  path: string;
  storageUri: string;
  openUrl: string;
  webUrl?: string;
}

function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function hashValue(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

class StorageAdapterService {
  private readonly supportedProviders = new Set<StorageProvider>(['local', 'sharepoint', 'nas']);

  private resolveProvider(provider?: StorageProvider): StorageProvider {
    if (!provider) {
      return configService.getConfig().storage.defaultProvider;
    }

    if (this.supportedProviders.has(provider)) {
      return provider;
    }

    throw new Error('지원하지 않는 저장소 provider 입니다.');
  }

  private getProviderConfig(provider: StorageProvider) {
    return configService.getConfig().storage[provider];
  }

  private parseStorageUri(storageUri: string): { provider: StorageProvider; path: string } {
    const match = storageUri.match(/^(local|sharepoint|nas):\/\/(.+)$/);
    if (!match) {
      throw new Error('유효하지 않은 storageUri 형식입니다.');
    }

    return {
      provider: match[1] as StorageProvider,
      path: decodeURIComponent(match[2]),
    };
  }

  private toStorageUri(provider: StorageProvider, targetPath: string): string {
    return `${provider}://${encodeURIComponent(targetPath.replace(/\\/g, '/'))}`;
  }

  private buildExternalWebUrl(targetPath: string, webBaseUrl?: string): string | null {
    const trimmedBaseUrl = webBaseUrl?.trim();
    if (!trimmedBaseUrl) {
      return null;
    }

    let baseUrl: URL;
    try {
      baseUrl = new URL(trimmedBaseUrl);
    } catch {
      return null;
    }

    if (baseUrl.protocol !== 'http:' && baseUrl.protocol !== 'https:') {
      return null;
    }

    const normalizedPath = targetPath.replace(/\\/g, '/').replace(/^\/+/, '');
    const encodedPath = normalizedPath
      .split('/')
      .filter((segment) => segment.length > 0)
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    const basePathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    baseUrl.pathname = encodedPath ? `${basePathname}${encodedPath}` : basePathname;
    return baseUrl.toString();
  }

  private buildOpenUrl(provider: StorageProvider, targetPath: string, webBaseUrl?: string): string {
    const externalUrl = this.buildExternalWebUrl(targetPath, webBaseUrl);
    if (externalUrl) {
      return externalUrl;
    }

    const encodedPath = encodeURIComponent(targetPath.replace(/\\/g, '/'));
    return `/api/storage/open?provider=${provider}&path=${encodedPath}`;
  }

  private getStorageRoot(provider: StorageProvider): string {
    return configService.getStorageRootBinding(provider).resolvedPath;
  }

  resolveContainedPath(provider: StorageProvider, relativePath: string): { fullPath: string; relativePath: string } {
    const absoluteRoot = this.getStorageRoot(provider);
    const normalizedRelative = normalizeRelativePath(relativePath);
    const fullPath = path.resolve(absoluteRoot, normalizedRelative);
    const relative = path.relative(absoluteRoot, fullPath);

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('허용되지 않은 경로입니다.');
    }

    return { fullPath, relativePath: relative.replace(/\\/g, '/') };
  }

  private resolveDestination(provider: StorageProvider, relativePath: string, fileName: string): { fullPath: string; relativePath: string } {
    const normalizedRelative = normalizeRelativePath(relativePath);
    const safeName = normalizeDmsFileName(fileName);
    const relativeTarget = normalizedRelative ? `${normalizedRelative}/${safeName}` : safeName;
    return this.resolveContainedPath(provider, relativeTarget);
  }

  upload(request: StorageUploadRequest): StorageReference {
    const provider = this.resolveProvider(request.provider);
    const providerConfig = this.getProviderConfig(provider);
    if (!providerConfig.enabled) {
      throw new Error(`${provider} 저장소가 비활성화되어 있습니다.`);
    }

    const normalizedFileName = normalizeDmsFileName(request.fileName);
    const destination = this.resolveDestination(provider, request.relativePath ?? '', normalizedFileName);
    ensureDirectory(path.dirname(destination.fullPath));
    fs.writeFileSync(destination.fullPath, request.content);

    const stats = fs.statSync(destination.fullPath);
    const checksum = hashValue(request.content);
    const versionId = String(stats.mtimeMs);
    const etag = hashValue(`${destination.relativePath}:${stats.size}:${versionId}`).slice(0, 16);

    return {
      storageUri: this.toStorageUri(provider, destination.relativePath),
      provider,
      path: destination.relativePath,
      name: normalizedFileName,
      size: stats.size,
      versionId,
      etag,
      checksum,
      origin: request.origin ?? 'manual',
      status: request.status ?? 'published',
      webUrl: this.buildExternalWebUrl(destination.relativePath, providerConfig.webBaseUrl) ?? undefined,
    };
  }

  open(request: StorageOpenRequest): StorageOpenResult {
    const parsed = request.storageUri ? this.parseStorageUri(request.storageUri) : null;
    const provider = parsed?.provider ?? this.resolveProvider(request.provider);
    const targetPath = parsed?.path ?? normalizeRelativePath(request.path ?? '');
    if (!targetPath) {
      throw new Error('열기 대상 경로가 필요합니다.');
    }

    const providerConfig = this.getProviderConfig(provider);
    if (!providerConfig.enabled) {
      throw new Error(`${provider} 저장소가 비활성화되어 있습니다.`);
    }
    const contained = this.resolveContainedPath(provider, targetPath);
    if (provider === 'local' && !fs.existsSync(contained.fullPath)) {
      throw new Error('대상 파일을 찾을 수 없습니다.');
    }

    return {
      provider,
      path: contained.relativePath,
      storageUri: this.toStorageUri(provider, contained.relativePath),
      openUrl: this.buildOpenUrl(provider, contained.relativePath, providerConfig.webBaseUrl),
      webUrl: this.buildExternalWebUrl(contained.relativePath, providerConfig.webBaseUrl) ?? undefined,
    };
  }

  refresh(request: StorageRefreshRequest): StorageReference {
    const parsed = request.storageUri ? this.parseStorageUri(request.storageUri) : null;
    const provider = parsed?.provider ?? this.resolveProvider(request.provider);
    const targetPath = parsed?.path ?? normalizeRelativePath(request.path ?? '');
    if (!targetPath) {
      throw new Error('resync 대상 경로가 필요합니다.');
    }

    const providerConfig = this.getProviderConfig(provider);
    if (!providerConfig.enabled) {
      throw new Error(`${provider} 저장소가 비활성화되어 있습니다.`);
    }

    const contained = this.resolveContainedPath(provider, targetPath);
    if (!fs.existsSync(contained.fullPath)) {
      throw new Error('대상 파일을 찾을 수 없습니다.');
    }

    const fileBuffer = fs.readFileSync(contained.fullPath);
    const stats = fs.statSync(contained.fullPath);
    const checksum = hashValue(fileBuffer);
    const versionId = String(stats.mtimeMs);
    const etag = hashValue(`${contained.relativePath}:${stats.size}:${versionId}`).slice(0, 16);
    const fileName = normalizeDmsFileName(request.fileName?.trim() || path.basename(contained.fullPath));

    return {
      storageUri: this.toStorageUri(provider, contained.relativePath),
      provider,
      path: contained.relativePath,
      name: fileName,
      size: stats.size,
      versionId,
      etag,
      checksum,
      origin: request.origin ?? 'manual',
      status: request.status ?? 'published',
      webUrl: this.buildExternalWebUrl(contained.relativePath, providerConfig.webBaseUrl) ?? undefined,
    };
  }
}

export const storageAdapterService = new StorageAdapterService();
