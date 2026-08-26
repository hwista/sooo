'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type ChangeEventHandler,
  type ComponentPropsWithoutRef,
  type CompositionEventHandler,
  type DragEventHandler,
  type FocusEventHandler,
  type ForwardedRef,
  type KeyboardEventHandler,
  type Ref,
  type ClipboardEventHandler,
} from 'react';
import { Input } from '@ssoo/web-ui';
import {
  getSsooSearchInputSignatureError,
  shouldRejectSsooUnexpectedAutofill,
} from './search-input-autofill';

export type SsooSearchInputIntent =
  | 'global-search'
  | 'navigation-search'
  | 'data-filter'
  | 'entity-lookup'
  | 'in-view-search'
  | 'hybrid-input';

type SsooSearchInputBaseProps = Omit<
  ComponentPropsWithoutRef<typeof Input>,
  'id' | 'name' | 'type' | 'autoComplete' | 'aria-label'
>;

export interface SsooSearchInputProps extends SsooSearchInputBaseProps {
  id: string;
  name: string;
  ariaLabel: string;
  intent: SsooSearchInputIntent;
}

const SSOO_TEXT_ENTRY_INTENT_WINDOW_MS = 1_500;
const SSOO_AUTOFILL_RECONCILE_DELAYS_MS = [0, 50, 250, 1_000] as const;
const SSOO_NATIVE_AUTOFILL_SELECTORS = [':autofill', ':-webkit-autofill', ':-moz-autofill'] as const;

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  if (ref) {
    ref.current = value;
  }
}

function normalizeInputValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(',');
  }
  return value == null ? '' : String(value);
}

function isNativeAutofilled(input: HTMLInputElement): boolean {
  return SSOO_NATIVE_AUTOFILL_SELECTORS.some((selector) => {
    try {
      return input.matches(selector);
    } catch {
      return false;
    }
  });
}

function isTextEntryKey(event: React.KeyboardEvent<HTMLInputElement>): boolean {
  return event.key.length === 1 || event.key === 'Backspace' || event.key === 'Delete';
}

export const SsooSearchInput = forwardRef<HTMLInputElement, SsooSearchInputProps>(
  function SsooSearchInput({
    id,
    name,
    ariaLabel,
    intent,
    value,
    defaultValue,
    onChange,
    onFocus,
    onKeyDown,
    onPaste,
    onDrop,
    onCompositionStart,
    disabled,
    readOnly,
    ...props
  }, forwardedRef: ForwardedRef<HTMLInputElement>) {
    const signatureError = getSsooSearchInputSignatureError({ id, name, ariaLabel });
    if (signatureError) {
      throw new Error(`[SsooSearchInput] ${signatureError}`);
    }

    const inputRef = useRef<HTMLInputElement | null>(null);
    const expectedValueRef = useRef(normalizeInputValue(value ?? defaultValue));
    const lastTextEntryIntentAtRef = useRef(Number.NEGATIVE_INFINITY);
    const reconcileTimersRef = useRef<Set<number>>(new Set());
    const isControlled = value !== undefined;

    if (isControlled) {
      expectedValueRef.current = normalizeInputValue(value);
    }

    const setInputRef = useCallback((input: HTMLInputElement | null) => {
      inputRef.current = input;
      assignRef(forwardedRef, input);
    }, [forwardedRef]);

    const markTextEntryIntent = useCallback(() => {
      lastTextEntryIntentAtRef.current = Date.now();
    }, []);

    const hasRecentTextEntryIntent = useCallback(() => (
      Date.now() - lastTextEntryIntentAtRef.current <= SSOO_TEXT_ENTRY_INTENT_WINDOW_MS
    ), []);

    useEffect(() => {
      if (isControlled) {
        return;
      }

      const nextDefaultValue = normalizeInputValue(defaultValue);
      expectedValueRef.current = nextDefaultValue;

      const input = inputRef.current;
      if (input && input.value !== nextDefaultValue) {
        input.value = nextDefaultValue;
      }
    }, [defaultValue, isControlled]);

    const restoreExpectedValue = useCallback((input: HTMLInputElement) => {
      const expectedValue = expectedValueRef.current;
      if (input.value === expectedValue) {
        return;
      }

      input.value = expectedValue;
      input.dispatchEvent(new CustomEvent('ssoo:unexpected-autofill-rejected', {
        bubbles: true,
        detail: { intent, inputId: id },
      }));
    }, [id, intent]);

    const reconcileUnexpectedAutofill = useCallback(() => {
      const input = inputRef.current;
      if (!input || disabled || readOnly) {
        return;
      }

      if (shouldRejectSsooUnexpectedAutofill({
        expectedValue: expectedValueRef.current,
        candidateValue: input.value,
        nativeAutofilled: isNativeAutofilled(input),
        hasRecentTextEntryIntent: hasRecentTextEntryIntent(),
      })) {
        restoreExpectedValue(input);
      }
    }, [disabled, hasRecentTextEntryIntent, readOnly, restoreExpectedValue]);

    const scheduleAutofillReconciliation = useCallback(() => {
      for (const timer of reconcileTimersRef.current) {
        window.clearTimeout(timer);
      }
      reconcileTimersRef.current.clear();

      for (const delay of SSOO_AUTOFILL_RECONCILE_DELAYS_MS) {
        const timer = window.setTimeout(() => {
          reconcileTimersRef.current.delete(timer);
          reconcileUnexpectedAutofill();
        }, delay);
        reconcileTimersRef.current.add(timer);
      }
    }, [reconcileUnexpectedAutofill]);

    useEffect(() => {
      scheduleAutofillReconciliation();

      const handlePageShow = () => scheduleAutofillReconciliation();
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          scheduleAutofillReconciliation();
        }
      };

      window.addEventListener('pageshow', handlePageShow);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        window.removeEventListener('pageshow', handlePageShow);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        for (const timer of reconcileTimersRef.current) {
          window.clearTimeout(timer);
        }
        reconcileTimersRef.current.clear();
      };
    }, [scheduleAutofillReconciliation]);

    const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
      const candidateValue = event.currentTarget.value;
      if (shouldRejectSsooUnexpectedAutofill({
        expectedValue: expectedValueRef.current,
        candidateValue,
        nativeAutofilled: isNativeAutofilled(event.currentTarget),
        hasRecentTextEntryIntent: hasRecentTextEntryIntent(),
      })) {
        restoreExpectedValue(event.currentTarget);
        return;
      }

      if (!isControlled) {
        expectedValueRef.current = candidateValue;
      }
      onChange?.(event);
    };

    const handleFocus: FocusEventHandler<HTMLInputElement> = (event) => {
      scheduleAutofillReconciliation();
      onFocus?.(event);
    };

    const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
      if (isTextEntryKey(event)) {
        markTextEntryIntent();
      }
      onKeyDown?.(event);
    };

    const handlePaste: ClipboardEventHandler<HTMLInputElement> = (event) => {
      markTextEntryIntent();
      onPaste?.(event);
    };

    const handleDrop: DragEventHandler<HTMLInputElement> = (event) => {
      markTextEntryIntent();
      onDrop?.(event);
    };

    const handleCompositionStart: CompositionEventHandler<HTMLInputElement> = (event) => {
      markTextEntryIntent();
      onCompositionStart?.(event);
    };

    return (
      <Input
        {...props}
        ref={setInputRef}
        id={id}
        name={name}
        type="search"
        role="searchbox"
        aria-label={ariaLabel}
        autoComplete="off"
        data-ssoo-input-intent={intent}
        data-form-type="other"
        data-1p-ignore="true"
        data-lpignore="true"
        data-bwignore="true"
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        readOnly={readOnly}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onCompositionStart={handleCompositionStart}
      />
    );
  },
);

SsooSearchInput.displayName = 'SsooSearchInput';
