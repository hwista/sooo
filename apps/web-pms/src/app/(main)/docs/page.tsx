import Link from 'next/link';
import { loadDocsIndex } from '@/lib/docs/loader';

export default async function DocsPage() {
  const docsIndex = await loadDocsIndex();

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">문서 허브</h1>
        <p className="mt-2 text-sm text-gray-500">
          운영/개발 문서를 한 곳에서 확인합니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/docs/api-reference"
          className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300"
        >
          <h2 className="text-lg font-semibold text-gray-900">API Reference (ReDoc)</h2>
          <p className="mt-2 text-sm text-gray-500">
            OpenAPI 스펙 기반의 API 레퍼런스를 확인합니다.
          </p>
        </Link>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">기본 문서</h2>
          <p className="mt-1 text-sm text-gray-500">
            docs/ 루트의 파일을 자동으로 정리했습니다.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {docsIndex.root.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-gray-200 bg-white p-4 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300"
            >
              {item.title}
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">문서 섹션</h2>
          <p className="mt-1 text-sm text-gray-500">
            각 폴더의 README와 문서를 1단계 깊이로 표시합니다.
          </p>
        </div>
        <div className="space-y-6">
          {docsIndex.sections.map((section) => (
            <div key={section.title} className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                {section.href && (
                  <Link href={section.href} className="text-sm text-blue-600 underline">
                    섹션 보기
                  </Link>
                )}
              </div>
              {section.items.length > 0 ? (
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700 transition hover:border-gray-200"
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-500">
                  README에서 섹션 개요를 확인하세요.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
