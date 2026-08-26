export function formatHomeDate(value?: string): string {
  if (!value) return '시각 정보 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '시각 정보 없음';
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
