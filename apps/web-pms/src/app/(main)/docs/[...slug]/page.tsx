import { notFound } from 'next/navigation';
import { loadDocBySlug } from '@/lib/docs/loader';

interface DocPageProps {
  params: {
    slug?: string[];
  };
}

export default async function DocPage({ params }: DocPageProps) {
  const doc = await loadDocBySlug(params.slug ?? []);

  if (!doc) {
    notFound();
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <p className="text-xs text-muted-foreground">/docs/{doc.relativePath}</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">{doc.title}</h1>
      </div>
      <div
        className="doc-content"
        dangerouslySetInnerHTML={{ __html: doc.html }}
      />
    </div>
  );
}
