type PmsDateInput = string | number | Date | null | undefined;
type PmsNumberInput = string | number | null | undefined;

const PMS_LOCALE = 'ko-KR';

const pmsDateFormatter = new Intl.DateTimeFormat(PMS_LOCALE);
const pmsShortDateFormatter = new Intl.DateTimeFormat(PMS_LOCALE, {
  month: '2-digit',
  day: '2-digit',
});
const pmsDateTimeFormatter = new Intl.DateTimeFormat(PMS_LOCALE, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});
const pmsShortDateTimeFormatter = new Intl.DateTimeFormat(PMS_LOCALE, {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});
const pmsNumberFormatter = new Intl.NumberFormat(PMS_LOCALE);

function toValidDate(value: PmsDateInput): Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toValidNumber(value: PmsNumberInput): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function getPmsTime(value: PmsDateInput, fallback = 0): number {
  return toValidDate(value)?.getTime() ?? fallback;
}

export function formatPmsDate(value: PmsDateInput, fallback = '-'): string {
  const date = toValidDate(value);
  return date ? pmsDateFormatter.format(date) : fallback;
}

export function formatPmsShortDate(value: PmsDateInput, fallback = '-'): string {
  const date = toValidDate(value);
  return date ? pmsShortDateFormatter.format(date) : fallback;
}

export function formatPmsDateTime(value: PmsDateInput, fallback = '-'): string {
  const date = toValidDate(value);
  return date ? pmsDateTimeFormatter.format(date) : fallback;
}

export function formatPmsShortDateTime(value: PmsDateInput, fallback = '-'): string {
  const date = toValidDate(value);
  return date ? pmsShortDateTimeFormatter.format(date) : fallback;
}

export function formatPmsNumber(value: PmsNumberInput, fallback = '-'): string {
  const number = toValidNumber(value);
  if (number !== null) {
    return pmsNumberFormatter.format(number);
  }

  const raw = typeof value === 'string' ? value.trim() : '';
  return raw || fallback;
}

export function formatPmsAmount(value: PmsNumberInput, unitCode = '', fallback = '-'): string {
  const amount = formatPmsNumber(value, '');
  if (!amount) {
    return fallback;
  }

  const unit = unitCode.trim();
  return unit ? `${amount} ${unit}` : amount;
}

export function formatPmsCount(value: PmsNumberInput, unit = '건'): string {
  return `${formatPmsNumber(value, '0')}${unit}`;
}
