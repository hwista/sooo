'use client';

import * as React from 'react';
import { Home } from 'lucide-react';

import { cn } from './cn';
import {
  SSOO_CONTENT_PAGE_METRICS,
  SsooContentPageTemplate,
  type SsooContentPageTone,
} from './content-page-template';
import {
  SsooPageBreadcrumb,
  type SsooPageBreadcrumbItem,
} from './page-breadcrumb';

export const SSOO_WORKSPACE_PAGE_CONTENT_WIDTH_PX =
  SSOO_CONTENT_PAGE_METRICS.subContentWidthPx
  + SSOO_CONTENT_PAGE_METRICS.mainContentWidthPx
  + 10;

export type SsooWorkspaceContentWidth = 'platform' | 'standard' | 'fluid';

export type SsooWorkspacePageDataAttributes = Partial<
  Record<`data-${string}`, string | number | boolean | undefined>
>;

export interface SsooWorkspacePageProps {
  breadcrumb?: Array<string | SsooPageBreadcrumbItem>;
  breadcrumbItems?: SsooPageBreadcrumbItem[];
  breadcrumbRootIconSlot?: React.ReactNode;
  breadcrumbAriaLabel?: string;
  headerSlot?: React.ReactNode;
  children?: React.ReactNode;
  contentWidth?: SsooWorkspaceContentWidth;
  pageTone?: SsooContentPageTone;
  className?: string;
  contentClassName?: string;
  contentDataAttributes?: SsooWorkspacePageDataAttributes;
}

function toBreadcrumbItem(item: string | SsooPageBreadcrumbItem, index: number): SsooPageBreadcrumbItem {
  if (typeof item !== 'string') {
    return item;
  }

  return {
    id: `${index}-${item}`,
    label: item,
    path: item,
  };
}

function createWorkspaceBreadcrumbSlot({
  breadcrumb,
  breadcrumbItems,
  breadcrumbRootIconSlot,
  breadcrumbAriaLabel,
}: Pick<
  SsooWorkspacePageProps,
  'breadcrumb' | 'breadcrumbItems' | 'breadcrumbRootIconSlot' | 'breadcrumbAriaLabel'
>) {
  const items = breadcrumbItems ?? breadcrumb?.map(toBreadcrumbItem) ?? [];

  return (
    <SsooPageBreadcrumb
      items={items}
      rootIconSlot={breadcrumbRootIconSlot === undefined ? <Home className="h-3.5 w-3.5" /> : breadcrumbRootIconSlot}
      ariaLabel={breadcrumbAriaLabel ?? '업무 화면 경로'}
    />
  );
}

function getWorkspaceContentWidthStyle(width: SsooWorkspaceContentWidth): React.CSSProperties | undefined {
  if (width === 'fluid') {
    return undefined;
  }

  const maxWidth = width === 'standard'
    ? SSOO_CONTENT_PAGE_METRICS.mainContentWidthPx
    : SSOO_WORKSPACE_PAGE_CONTENT_WIDTH_PX;

  return { maxWidth };
}

export function SsooWorkspacePage({
  breadcrumb,
  breadcrumbItems,
  breadcrumbRootIconSlot,
  breadcrumbAriaLabel,
  headerSlot,
  children,
  contentWidth = 'platform',
  pageTone = 'neutral',
  className,
  contentClassName,
  contentDataAttributes,
}: SsooWorkspacePageProps) {
  const mainContentSlot = (
    <div className={cn('flex h-full min-h-0 justify-center overflow-hidden px-3', className)} data-ssoo-workspace-page>
      <div
        {...contentDataAttributes}
        className={cn('flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden', contentClassName)}
        style={getWorkspaceContentWidthStyle(contentWidth)}
        data-ssoo-workspace-content-lane
      >
        {children}
      </div>
    </div>
  );

  return (
    <SsooContentPageTemplate
      breadcrumbSlot={createWorkspaceBreadcrumbSlot({
        breadcrumb,
        breadcrumbItems,
        breadcrumbRootIconSlot,
        breadcrumbAriaLabel,
      })}
      headerSlot={headerSlot ?? null}
      mainContentSlot={mainContentSlot}
      pageTone={pageTone}
      pageVariant="fluid"
      contentSurface="plain"
      sidecarMode="hidden"
    />
  );
}
