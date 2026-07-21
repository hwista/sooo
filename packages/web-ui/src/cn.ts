import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

export const SSOO_TEXT_SIZE_CLASS_PARTS = [
  'h1',
  'h2',
  'h3',
  'title-page',
  'title-section',
  'title-subsection',
  'title-card',
  'body',
  'body-md',
  'body-sm',
  'body-xs',
  'action-md',
  'control-lg',
  'label-md',
  'label-sm',
  'label-strong',
  'caption',
  'caption-2xs',
  'caption-xs',
  'badge',
  'code-inline',
  'code-block',
  'code-line-number',
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: SSOO_TEXT_SIZE_CLASS_PARTS }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
