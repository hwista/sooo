'use client';

import { useEffect, useMemo, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores';
import { fileTreeKeys } from '@/hooks/queries/useFileTree';
import { normalizeDocumentPath } from '@/lib/utils/linkUtils';
import {
  DMS_COLLABORATION_CHANGED_EVENT,
  DMS_COLLABORATION_SUBSCRIBE_DOCUMENT_EVENT,
  DMS_COLLABORATION_UNSUBSCRIBE_DOCUMENT_EVENT,
  DMS_LOCK_TAKEOVER_REQUESTED_EVENT,
  DMS_LOCK_TAKEOVER_RESPONDED_EVENT,
  isDmsCollaborationDocumentSubscriptionEventDetail,
} from '@/lib/notification-events';
import {
  collaborationApi,
  type DocumentCollaborationSnapshotClient,
  type SoftLockTakeoverRequestClient,
  type SoftLockTakeoverResponseClient,
} from '@/lib/api/collaborationApi';

// ============================================================================
// Types
// ============================================================================

export interface DmsFileChangedEvent {
  action: 'create' | 'update' | 'rename' | 'delete' | 'metadata';
  path: string;
  paths: string[];
  userId: string;
  userName?: string;
  revisionSeq?: number;
}

interface DmsTreeChangedEvent {
  action: 'create' | 'rename' | 'delete' | 'sync';
}

interface DmsPublishStatusEvent {
  path: string;
  status: string;
  commitHash?: string;
  error?: string;
}

interface DmsCollaborationChangedSocketEvent {
  path: string;
  reason: 'join' | 'mode' | 'leave' | 'lock' | 'takeover' | 'publish' | 'refresh';
  snapshot: DocumentCollaborationSnapshotClient;
}

interface DmsSubscriptionAck {
  success: boolean;
  error?: string;
}

interface UseDmsSocketOptions {
  /** 인증/권한 부트스트랩 완료 후에만 실시간 연결을 시작한다. */
  enabled?: boolean;
  /** 현재 보고 있는 문서 경로 */
  activeDocumentPath?: string;
  /** 열린 문서 탭들의 경로. 협업 이벤트는 열린 문서 전체에 대해 즉시 수신한다. */
  documentPaths?: string[];
  /** 파일 변경 시 추가 콜백 */
  onFileChanged?: (event: DmsFileChangedEvent) => void;
  /** 트리 변경 시 추가 콜백 */
  onTreeChanged?: (event: DmsTreeChangedEvent) => void;
  /** publish 상태 변경 시 추가 콜백 */
  onPublishStatus?: (event: DmsPublishStatusEvent) => void;
}

// ============================================================================
// WebSocket URL resolution
// ============================================================================

export interface ResolveDmsWebSocketUrlOptions {
  explicitWebSocketUrl?: string;
  apiBaseUrl?: string;
  locationOrigin: string;
  locationHostname: string;
  locationProtocol: string;
}

export function resolveDmsWebSocketUrl({
  explicitWebSocketUrl,
  apiBaseUrl,
  locationOrigin,
  locationHostname,
  locationProtocol,
}: ResolveDmsWebSocketUrlOptions): string {
  const explicitUrl = explicitWebSocketUrl?.trim();
  if (explicitUrl) return explicitUrl;

  const normalizedApiBaseUrl = apiBaseUrl?.trim();
  if (normalizedApiBaseUrl && !normalizedApiBaseUrl.startsWith('/')) {
    try {
      return new URL(normalizedApiBaseUrl, locationOrigin).origin;
    } catch {
      // Invalid public API configuration falls through to the local default.
    }
  }

  const socketProtocol = locationProtocol === 'https:' ? 'https:' : 'http:';
  return `${socketProtocol}//${locationHostname}:4000`;
}

function getWsUrl(): string {
  if (typeof window === 'undefined') return '';

  return resolveDmsWebSocketUrl({
    explicitWebSocketUrl: process.env.NEXT_PUBLIC_WS_URL,
    apiBaseUrl: process.env.NEXT_PUBLIC_API_URL,
    locationOrigin: window.location.origin,
    locationHostname: window.location.hostname,
    locationProtocol: window.location.protocol,
  });
}

// ============================================================================
// Hook
// ============================================================================

export function useDmsSocket(options: UseDmsSocketOptions = {}) {
  const {
    enabled = true,
    activeDocumentPath,
    documentPaths,
    onFileChanged,
    onTreeChanged,
    onPublishStatus,
  } = options;
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const onFileChangedRef = useRef(onFileChanged);
  const onTreeChangedRef = useRef(onTreeChanged);
  const onPublishStatusRef = useRef(onPublishStatus);

  // Socket lifecycle 은 인증 단위로만 유지하되, 이벤트 콜백은 최신 closure 를 참조한다.
  useEffect(() => {
    onFileChangedRef.current = onFileChanged;
  }, [onFileChanged]);
  useEffect(() => {
    onTreeChangedRef.current = onTreeChanged;
  }, [onTreeChanged]);
  useEffect(() => {
    onPublishStatusRef.current = onPublishStatus;
  }, [onPublishStatus]);
  const subscribedDocumentPaths = useMemo(() => {
    const paths = new Set<string>();
    for (const path of documentPaths ?? []) {
      const normalized = normalizeDocumentPath(path);
      if (normalized) paths.add(normalized);
    }
    const normalizedActivePath = normalizeDocumentPath(activeDocumentPath ?? '');
    if (normalizedActivePath) paths.add(normalizedActivePath);
    return Array.from(paths).sort();
  }, [activeDocumentPath, documentPaths]);
  const subscribedDocumentPathKey = subscribedDocumentPaths.join('\n');
  const socketAccessToken = accessToken?.trim() || null;
  const prevDocPaths = useRef<Set<string>>(new Set());
  const readySocketRef = useRef<Socket | null>(null);
  const subscribedDocumentPathsRef = useRef(subscribedDocumentPaths);
  const directDocumentSubscriptionCountsRef = useRef<Map<string, number>>(new Map());
  const directDocumentSubscriptionIdsRef = useRef<Map<string, Set<string>>>(new Map());
  subscribedDocumentPathsRef.current = subscribedDocumentPaths;

  // Invalidate file tree query
  const invalidateFileTree = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: fileTreeKeys.tree() });
  }, [queryClient]);

  const dispatchCollaborationSnapshot = useCallback(async (documentPath: string) => {
    const normalizedPath = normalizeDocumentPath(documentPath);
    if (!normalizedPath) return;

    const response = await collaborationApi.getSnapshot(normalizedPath);
    if (!response.success || !response.data) return;

    if (
      !subscribedDocumentPathsRef.current.includes(normalizedPath)
      && !directDocumentSubscriptionCountsRef.current.has(normalizedPath)
    ) {
      return;
    }

    window.dispatchEvent(new CustomEvent<DmsCollaborationChangedSocketEvent>(DMS_COLLABORATION_CHANGED_EVENT, {
      detail: {
        path: response.data.path,
        reason: 'refresh',
        snapshot: response.data,
      },
    }));
  }, []);

  const subscribeDocument = useCallback((socket: Socket, documentPath: string) => {
    const normalizedPath = normalizeDocumentPath(documentPath);
    if (!normalizedPath) return;

    socket.emit('subscribe:document', { path: normalizedPath }, (ack: DmsSubscriptionAck) => {
      if (ack?.success) {
        void dispatchCollaborationSnapshot(normalizedPath);
      }
    });
  }, [dispatchCollaborationSnapshot]);

  // Connect/disconnect based on auth state
  useEffect(() => {
    if (!enabled || !isAuthenticated || !socketAccessToken || typeof window === 'undefined') return;

    const wsUrl = getWsUrl();
    if (!wsUrl) return;

    const socket = io(`${wsUrl}/dms`, {
      auth: { token: socketAccessToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    let authRefreshInFlight = false;
    let lastAuthRefreshRequestedAt = 0;
    const refreshAuthSession = () => {
      const now = Date.now();
      if (authRefreshInFlight || now - lastAuthRefreshRequestedAt < 3_000) {
        return;
      }

      authRefreshInFlight = true;
      lastAuthRefreshRequestedAt = now;
      void useAuthStore.getState().refreshTokens()
        .finally(() => {
          authRefreshInFlight = false;
        });
    };

    socket.on('connect', () => {
      readySocketRef.current = null;
      prevDocPaths.current = new Set();
    });

    socket.on('dms:ready', () => {
      readySocketRef.current = socket;

      // 서버의 비동기 인증·권한 검증이 끝난 뒤 트리와 문서를 구독한다.
      socket.emit('subscribe:tree');

      // 열린 문서가 있으면 구독.
      // ready handler 는 socket lifecycle 동안 유지되므로 최신 경로는 ref 에서 읽는다.
      const latestDocumentPaths = Array.from(new Set([
        ...subscribedDocumentPathsRef.current,
        ...directDocumentSubscriptionCountsRef.current.keys(),
      ])).sort();
      for (const documentPath of latestDocumentPaths) {
        subscribeDocument(socket, documentPath);
      }
      prevDocPaths.current = new Set(latestDocumentPaths);
    });

    // 파일 변경 이벤트
    socket.on('dms:file-changed', (event: DmsFileChangedEvent) => {
      onFileChangedRef.current?.(event);

      // create/rename/delete는 트리도 갱신
      if (event.action !== 'update' && event.action !== 'metadata') {
        invalidateFileTree();
      }
    });

    // 트리 변경 이벤트
    socket.on('dms:tree-changed', (event: DmsTreeChangedEvent) => {
      onTreeChangedRef.current?.(event);
      invalidateFileTree();
    });

    // publish 상태 이벤트
    socket.on('dms:publish-status', (event: DmsPublishStatusEvent) => {
      onPublishStatusRef.current?.(event);
    });

    socket.on('dms:collaboration-changed', (event: DmsCollaborationChangedSocketEvent) => {
      window.dispatchEvent(new CustomEvent(DMS_COLLABORATION_CHANGED_EVENT, { detail: event }));
    });

    socket.on('dms:lock-takeover-requested', (event: SoftLockTakeoverRequestClient) => {
      window.dispatchEvent(new CustomEvent(DMS_LOCK_TAKEOVER_REQUESTED_EVENT, { detail: event }));
    });

    socket.on('dms:lock-takeover-responded', (event: SoftLockTakeoverResponseClient) => {
      window.dispatchEvent(new CustomEvent(DMS_LOCK_TAKEOVER_RESPONDED_EVENT, { detail: event }));
    });

    socket.on('connect_error', refreshAuthSession);
    socket.on('disconnect', (reason) => {
      if (readySocketRef.current === socket) {
        readySocketRef.current = null;
      }
      if (reason === 'io server disconnect') {
        refreshAuthSession();
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      if (readySocketRef.current === socket) {
        readySocketRef.current = null;
      }
      prevDocPaths.current = new Set();
    };
  }, [enabled, invalidateFileTree, isAuthenticated, socketAccessToken, subscribeDocument]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSubscribeDocument = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isDmsCollaborationDocumentSubscriptionEventDetail(detail)) {
        return;
      }

      const normalizedPath = normalizeDocumentPath(detail.path);
      if (!normalizedPath) {
        return;
      }

      const subscriptionId = typeof detail.subscriptionId === 'string' ? detail.subscriptionId.trim() : '';
      if (subscriptionId) {
        const idsByPath = directDocumentSubscriptionIdsRef.current;
        const ids = idsByPath.get(normalizedPath) ?? new Set<string>();
        if (ids.has(subscriptionId)) {
          return;
        }
        ids.add(subscriptionId);
        idsByPath.set(normalizedPath, ids);
      }

      const counts = directDocumentSubscriptionCountsRef.current;
      counts.set(normalizedPath, (counts.get(normalizedPath) ?? 0) + 1);
      const socket = socketRef.current;
      if (socket?.connected && readySocketRef.current === socket) {
        subscribeDocument(socket, normalizedPath);
      }
    };

    const handleUnsubscribeDocument = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isDmsCollaborationDocumentSubscriptionEventDetail(detail)) {
        return;
      }

      const normalizedPath = normalizeDocumentPath(detail.path);
      if (!normalizedPath) {
        return;
      }

      const subscriptionId = typeof detail.subscriptionId === 'string' ? detail.subscriptionId.trim() : '';
      if (subscriptionId) {
        const idsByPath = directDocumentSubscriptionIdsRef.current;
        const ids = idsByPath.get(normalizedPath);
        if (!ids?.has(subscriptionId)) {
          return;
        }
        ids.delete(subscriptionId);
        if (ids.size === 0) {
          idsByPath.delete(normalizedPath);
        }
      }

      const counts = directDocumentSubscriptionCountsRef.current;
      const nextCount = (counts.get(normalizedPath) ?? 0) - 1;
      if (nextCount > 0) {
        counts.set(normalizedPath, nextCount);
        return;
      }

      counts.delete(normalizedPath);
      if (subscribedDocumentPathsRef.current.includes(normalizedPath)) {
        return;
      }

      const socket = socketRef.current;
      if (socket?.connected && readySocketRef.current === socket) {
        socket.emit('unsubscribe:document', { path: normalizedPath });
      }
    };

    window.addEventListener(DMS_COLLABORATION_SUBSCRIBE_DOCUMENT_EVENT, handleSubscribeDocument);
    window.addEventListener(DMS_COLLABORATION_UNSUBSCRIBE_DOCUMENT_EVENT, handleUnsubscribeDocument);
    return () => {
      window.removeEventListener(DMS_COLLABORATION_SUBSCRIBE_DOCUMENT_EVENT, handleSubscribeDocument);
      window.removeEventListener(DMS_COLLABORATION_UNSUBSCRIBE_DOCUMENT_EVENT, handleUnsubscribeDocument);
    };
  }, [subscribeDocument]);

  // Document path subscription management
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected || readySocketRef.current !== socket) return;

    const nextPaths = new Set([
      ...subscribedDocumentPathsRef.current,
      ...directDocumentSubscriptionCountsRef.current.keys(),
    ]);

    // 닫힌 문서 구독 해제
    for (const previousPath of prevDocPaths.current) {
      if (!nextPaths.has(previousPath)) {
        if (!directDocumentSubscriptionCountsRef.current.has(previousPath)) {
          socket.emit('unsubscribe:document', { path: previousPath });
        }
      }
    }

    // 새로 열린 문서 구독
    for (const nextPath of nextPaths) {
      if (!prevDocPaths.current.has(nextPath)) {
        subscribeDocument(socket, nextPath);
      }
    }

    prevDocPaths.current = nextPaths;
  }, [subscribeDocument, subscribedDocumentPathKey]);
}
