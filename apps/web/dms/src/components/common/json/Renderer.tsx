import type { JsonFieldDescriptor } from './types';
import { JsonFieldRow } from './FieldRow';

export function JsonRenderer({
  items,
  localConfig,
  originalConfig,
  validationErrors,
  getValue,
  onChange,
  readOnly = false,
  emptyMessage = '표시할 설정 항목이 없습니다.',
  getItemAnchorId,
  showDescription = false,
}: {
  items: JsonFieldDescriptor[];
  localConfig: Record<string, unknown>;
  originalConfig: Record<string, unknown>;
  validationErrors: Record<string, string>;
  getValue: (obj: Record<string, unknown>, path: string) => unknown;
  onChange?: (key: string, value: unknown) => void;
  readOnly?: boolean;
  emptyMessage?: string;
  getItemAnchorId?: (item: JsonFieldDescriptor) => string;
  showDescription?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-ssoo-content-border bg-ssoo-content-bg/30 px-4 py-6 text-body-sm text-ssoo-primary/70">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-ssoo-content-border bg-card divide-y divide-ssoo-content-border">
      {items.map((item) => (
        <JsonFieldRow
          key={item.key}
          id={getItemAnchorId?.(item)}
          item={item}
          value={getValue(localConfig, item.key)}
          originalValue={getValue(originalConfig, item.key)}
          errorMessage={validationErrors[item.key]}
          onChange={onChange}
          readOnly={readOnly}
          showDescription={showDescription}
        />
      ))}
    </div>
  );
}
