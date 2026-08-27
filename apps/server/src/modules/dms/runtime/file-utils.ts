const MARKDOWN_EXTENSIONS = ['.md', '.markdown'];
const FILE_NAME_RESERVED_CHARACTERS = /[<>:"/\\|?*]/g;
const FILE_NAME_MAX_UTF8_BYTES = 255;

export function isMarkdownFile(fileName: string): boolean {
  if (!fileName || typeof fileName !== 'string') {
    return false;
  }

  const normalizedName = fileName.toLowerCase();
  return MARKDOWN_EXTENSIONS.some((extension) => normalizedName.endsWith(extension));
}

export function removeFileExtension(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    return '';
  }

  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return fileName;
  }

  return fileName.substring(0, lastDotIndex);
}

export function normalizeMarkdownFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    return '';
  }

  return `${removeFileExtension(fileName).toLowerCase()}.md`;
}

function containsOnlyLatin1CodePoints(value: string): boolean {
  for (const character of value) {
    if ((character.codePointAt(0) ?? 0) > 0xFF) {
      return false;
    }
  }
  return true;
}

function containsOnlyAsciiCodePoints(value: string): boolean {
  for (const character of value) {
    if ((character.codePointAt(0) ?? 0) > 0x7F) {
      return false;
    }
  }
  return true;
}

function replaceFileNameControlCharacters(value: string): string {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1F || codePoint === 0x7F ? ' ' : character;
  }).join('');
}

function decodePossibleLatin1Utf8Mojibake(value: string): string {
  if (!value || containsOnlyAsciiCodePoints(value) || !containsOnlyLatin1CodePoints(value)) {
    return value;
  }

  const decoded = Buffer.from(value, 'latin1').toString('utf8');
  if (!decoded || decoded.includes('\uFFFD')) {
    return value;
  }

  return Buffer.from(decoded, 'utf8').toString('latin1') === value ? decoded : value;
}

function trimUtf8StringToBytes(value: string, maxBytes: number): string {
  let currentBytes = 0;
  let result = '';

  for (const character of Array.from(value)) {
    const nextBytes = Buffer.byteLength(character, 'utf8');
    if (currentBytes + nextBytes > maxBytes) {
      break;
    }

    result += character;
    currentBytes += nextBytes;
  }

  return result;
}

export function normalizeDmsFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    return 'attachment';
  }

  const trimmed = fileName.trim();
  const decoded = decodePossibleLatin1Utf8Mojibake(trimmed);
  const sanitized = replaceFileNameControlCharacters(decoded.normalize('NFC'))
    .replace(/\s+/g, ' ')
    .replace(FILE_NAME_RESERVED_CHARACTERS, '_')
    .trim();

  const safeName = sanitized && sanitized !== '.' && sanitized !== '..'
    ? sanitized
    : 'attachment';
  const lastDotIndex = safeName.lastIndexOf('.');
  const hasExtension = lastDotIndex > 0 && lastDotIndex < safeName.length - 1;
  const extension = hasExtension ? safeName.slice(lastDotIndex) : '';
  const baseName = hasExtension ? safeName.slice(0, lastDotIndex) : safeName;
  const maxBaseBytes = Math.max(1, FILE_NAME_MAX_UTF8_BYTES - Buffer.byteLength(extension, 'utf8'));
  const trimmedBaseName = trimUtf8StringToBytes(baseName, maxBaseBytes).trim() || 'attachment';

  return `${trimmedBaseName}${extension}`;
}
