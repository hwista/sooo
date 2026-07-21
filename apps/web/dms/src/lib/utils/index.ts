/**
 * Utility Functions
 */

export { cn } from '@ssoo/web-ui';

// 파일 처리
export {
  isMarkdownFile,
  isTextFile,
  isImageFile,
  getFileExtension,
  removeFileExtension,
  ensureFileExtension,
  normalizeMarkdownFileName,
  getMimeType,
  sanitizeFileName,
  formatFileSize,
} from './fileUtils';

// 파일명 생성
export { generateUniqueFilename } from './generateFilename';

// 에러 처리
export {
  LogLevel,
  setLogConfig,
  extractErrorMessage,
  logger,
  safeSync,
  handleError,
  handleApiError,
  handleFileError,
  handleValidationError,
  debugOnly,
  PerformanceTimer,
  getErrorInfo,
} from './errorUtils';
export type { ErrorContext } from './errorUtils';

// 마크다운 링크 추출
export { extractMarkdownLinks } from './extractMarkdownLinks';
export type { BodyLink } from './extractMarkdownLinks';

// 링크/이미지 경로
export {
  isExternalUrl,
  joinDocumentPath,
  normalizeDocumentPath,
  resolveDocPath,
  resolveExternalHref,
  resolveRelativePath,
  resolveImageSrc,
} from './linkUtils';

// 파일 트리 필터
export { filterFileTree } from './fileTree';

// JSON / Object Path
export { getNestedValue, setNestedValue } from './objectPath';
export { deepMergeRecords, isPlainObject, parseJsonObject, stringifyJson } from './json';
