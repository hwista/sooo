import { QuoteSellerProfileWorkspaceClient } from './QuoteSellerProfileWorkspaceClient';
import { quoteSellerProfileFallback } from './quoteSellerProfileFallback';

export function QuoteSellerProfileWorkspace() {
  return <QuoteSellerProfileWorkspaceClient initialProfile={quoteSellerProfileFallback} />;
}
