'use client';

import { fetchWithSharedAuth } from '@/lib/api/sharedAuth';
import { hasUsableSummaryContent } from '@/lib/summaryFileStatus';
import type { InlineSummaryFileItem } from './Picker';

const SUMMARY_FILE_EXTRACTION_TIMEOUT_MS = 30_000;

function buildInlineSummaryFileId(file: Pick<File, 'name' | 'lastModified' | 'size'>): string {
  return `${file.name}-${file.lastModified}-${file.size}`;
}

export function createPendingSummaryFile(file: File): InlineSummaryFileItem {
  return {
    id: buildInlineSummaryFileId(file),
    name: file.name,
    type: file.type || undefined,
    size: file.size,
    textContent: '',
    rawFile: file,
    extractionState: 'extracting',
  };
}

export async function extractSummaryFile(
  file: File,
  options?: { signal?: AbortSignal },
): Promise<InlineSummaryFileItem> {
  const pending = createPendingSummaryFile(file);
  let textContent = '';
  let images: InlineSummaryFileItem['images'];
  let warningReason: string | undefined;
  let unsupportedReason: string | undefined;
  let protectedMarkerDetected: boolean | undefined;
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
  let removeAbortListener: (() => void) | undefined;

  try {
    const formData = new FormData();
    formData.append('file', file);
    const controller = new AbortController();
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = globalThis.setTimeout(() => {
        controller.abort();
        reject(new DOMException('Timed out', 'AbortError'));
      }, SUMMARY_FILE_EXTRACTION_TIMEOUT_MS);
    });
    const abortPromise = options?.signal
      ? new Promise<never>((_, reject) => {
        if (options.signal?.aborted) {
          controller.abort();
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }

        const onAbort = () => {
          controller.abort();
          reject(new DOMException('Aborted', 'AbortError'));
        };
        options.signal?.addEventListener('abort', onAbort, { once: true });
        removeAbortListener = () => options.signal?.removeEventListener('abort', onAbort);
      })
      : null;
    const res = await Promise.race([
      fetchWithSharedAuth('/api/file/extract-text', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      }),
      timeoutPromise,
      ...(abortPromise ? [abortPromise] : []),
    ]);
    const data = await res.json().catch(() => null);

    if (res.ok) {
      textContent = typeof data?.textContent === 'string' ? data.textContent : '';
      images = Array.isArray(data?.images) ? data.images : undefined;
      warningReason = typeof data?.warningReason === 'string' ? data.warningReason : undefined;
      unsupportedReason = typeof data?.unsupportedReason === 'string' ? data.unsupportedReason : undefined;
      protectedMarkerDetected = typeof data?.protectedMarkerDetected === 'boolean'
        ? data.protectedMarkerDetected
        : undefined;
    } else {
      unsupportedReason = 'extraction-error';
    }
  } catch (error) {
    if (options?.signal?.aborted) {
      throw error;
    }
    unsupportedReason = 'extraction-error';
  } finally {
    if (timeoutId !== undefined) {
      globalThis.clearTimeout(timeoutId);
    }
    removeAbortListener?.();
  }

  const candidate: InlineSummaryFileItem = {
    ...pending,
    textContent,
    images,
    warningReason,
    unsupportedReason,
    protectedMarkerDetected,
    extractionState: 'ready',
  };

  const normalizedUnsupportedReason = candidate.unsupportedReason
    ?? (hasUsableSummaryContent(candidate) ? undefined : 'empty-content');

  return {
    ...candidate,
    unsupportedReason: normalizedUnsupportedReason,
    extractionState: normalizedUnsupportedReason ? 'failed' : 'ready',
  };
}
