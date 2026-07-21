'use client';

import { QuoteSellerProfileWorkspaceClient } from './QuoteSellerProfileWorkspaceClient';
import { quoteSellerProfileFallback } from './quoteSellerProfileFallback';

export function QuoteSellerProfileWorkspaceMdiPage() {
  return <QuoteSellerProfileWorkspaceClient initialProfile={quoteSellerProfileFallback} />;
}
