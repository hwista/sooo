'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleHelp, CircleSlash2, HeartPulse } from 'lucide-react';
import type { DmsRuntimeReadinessClient } from '@/lib/api/endpoints/settings';

function getReadinessPresentation(status: DmsRuntimeReadinessClient['status']) {
  switch (status) {
    case 'ready':
      return {
        label: '런칭 준비됨',
        className: 'ssoo-tone-success-surface',
        icon: <CheckCircle2 className="h-4 w-4" />,
      };
    case 'degraded':
      return {
        label: '확인 필요',
        className: 'ssoo-tone-warning-surface',
        icon: <AlertTriangle className="h-4 w-4" />,
      };
    case 'blocked':
      return {
        label: '런칭 차단',
        className: 'ssoo-tone-danger-surface',
        icon: <CircleSlash2 className="h-4 w-4" />,
      };
    case 'unknown':
      return {
        label: '확인 불가',
        className: 'ssoo-tone-warning-surface',
        icon: <CircleHelp className="h-4 w-4" />,
      };
  }
}

function getCheckTone(status: DmsRuntimeReadinessClient['checks'][number]['status']) {
  switch (status) {
    case 'ready':
      return 'ssoo-tone-success-surface';
    case 'degraded':
      return 'ssoo-tone-warning-surface';
    case 'blocked':
      return 'ssoo-tone-danger-surface';
  }
}

export function RuntimeReadinessSurface({ readiness }: { readiness: DmsRuntimeReadinessClient | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!readiness) {
    return null;
  }

  const isStale = !readiness.expiresAt || Date.parse(readiness.expiresAt) <= now;
  const effectiveStatus = isStale ? 'unknown' : readiness.status;
  const presentation = getReadinessPresentation(effectiveStatus);
  return (
    <section className="mb-3 space-y-3">
      <article className="rounded-lg border border-ssoo-content-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-badge text-ssoo-primary/70">
              <HeartPulse className="h-4 w-4" />
              DMS 운영 readiness
            </div>
            <h3 className="mt-1 text-label-strong text-ssoo-primary">DB · 설정 영속성 · Git · control-plane · runtime path</h3>
            <p className="mt-2 text-body-sm text-ssoo-primary/80">
              단순 프로세스 생존이 아니라 실제 문서 운영에 필요한 의존성을 현재 런타임에서 검사합니다.
            </p>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-badge ${presentation.className}`}>
            {presentation.icon}
            {presentation.label}
          </span>
        </div>
        <p className="mt-3 text-caption text-ssoo-primary/60">
          마지막 확인 {readiness.checkedAt ? new Date(readiness.checkedAt).toLocaleString('ko-KR') : '없음'} · snapshot {readiness.snapshotId ?? '없음'}
        </p>
        <p className="mt-1 text-caption text-ssoo-primary/60">
          {isStale ? '스냅샷 유효 시간이 지나 상태를 확인 불가로 전환했습니다. 새로고침하세요.' : readiness.reason}
        </p>
      </article>

      {!isStale ? <div className="grid gap-2 lg:grid-cols-2">
        {readiness.checks.map((check) => (
          <article key={check.key} className="rounded-lg border border-ssoo-content-border bg-card px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-label-strong text-ssoo-primary">{check.label}</p>
              <span className={`rounded-full border px-2 py-0.5 text-badge ${getCheckTone(check.status)}`}>
                {check.status === 'ready' ? 'Ready' : check.status === 'degraded' ? 'Degraded' : 'Blocked'}
              </span>
            </div>
            <p className="mt-2 break-all text-caption text-ssoo-primary/75">{check.reason}</p>
          </article>
        ))}
      </div> : null}
    </section>
  );
}
