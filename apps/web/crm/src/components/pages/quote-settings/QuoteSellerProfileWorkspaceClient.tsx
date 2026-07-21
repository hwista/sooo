'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, FileText, RefreshCw, Save } from 'lucide-react';
import type {
  CrmQuoteSellerCiStatus,
  CrmQuoteSellerProfile,
  CrmQuoteSellerProfileUpsertRequest,
} from '@ssoo/types/crm';
import { Button, Input, NativeSelect, Textarea } from '@ssoo/web-ui';
import { useAuthStore } from '@/stores/auth.store';

interface BackendSuccessResponse<T> {
  success: true;
  data: T;
}

interface BackendErrorResponse {
  success: false;
  error?: {
    message?: string;
  };
}

interface DraftProfile {
  companyName: string;
  ceoName: string;
  businessRegistrationNo: string;
  address: string;
  tel: string;
  fax: string;
  website: string;
  email: string;
  ciStatus: CrmQuoteSellerCiStatus;
  ciStorageRef: string;
  memo: string;
}

const ciStatusLabels: Record<CrmQuoteSellerCiStatus, string> = {
  'not-configured': '미설정',
  'dms-planned': 'DMS 연결 예정',
  configured: '설정됨',
};

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null): string {
  if (responseBody?.success === false && responseBody.error?.message) {
    return responseBody.error.message;
  }
  return '요청 처리 중 오류가 발생했습니다.';
}

function valueOrEmpty(value: string | undefined): string {
  return value ?? '';
}

function toDraft(profile: CrmQuoteSellerProfile): DraftProfile {
  return {
    companyName: profile.id ? profile.companyName : '',
    ceoName: valueOrEmpty(profile.ceoName),
    businessRegistrationNo: valueOrEmpty(profile.businessRegistrationNo),
    address: valueOrEmpty(profile.address),
    tel: valueOrEmpty(profile.tel),
    fax: valueOrEmpty(profile.fax),
    website: valueOrEmpty(profile.website),
    email: valueOrEmpty(profile.email),
    ciStatus: profile.ciStatus,
    ciStorageRef: valueOrEmpty(profile.ciStorageRef),
    memo: valueOrEmpty(profile.memo),
  };
}

function toPayload(draft: DraftProfile): CrmQuoteSellerProfileUpsertRequest {
  return {
    companyName: draft.companyName.trim(),
    ceoName: draft.ceoName.trim() || undefined,
    businessRegistrationNo: draft.businessRegistrationNo.trim() || undefined,
    address: draft.address.trim() || undefined,
    tel: draft.tel.trim() || undefined,
    fax: draft.fax.trim() || undefined,
    website: draft.website.trim() || undefined,
    email: draft.email.trim() || undefined,
    ciStatus: draft.ciStatus,
    ciStorageRef: draft.ciStorageRef.trim() || undefined,
    memo: draft.memo.trim() || undefined,
  };
}

function formatDateTime(value: string): string {
  if (value === '1970-01-01T00:00:00.000Z') {
    return '-';
  }
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function QuoteSellerProfileWorkspaceClient({ initialProfile }: { initialProfile: CrmQuoteSellerProfile }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [profile, setProfile] = useState(initialProfile);
  const [draft, setDraft] = useState(() => toDraft(initialProfile));
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setNoticeMessage(null);
    try {
      const response = await fetch('/api/crm/quote-seller-profile', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmQuoteSellerProfile> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setProfile(payload.data);
      setDraft(toDraft(payload.data));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '견적 공급자 정보를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const isDirty = useMemo(() => {
    const source = toPayload(toDraft(profile));
    const current = toPayload(draft);
    return JSON.stringify(source) !== JSON.stringify(current);
  }, [draft, profile]);

  const canSave = Boolean(accessToken && draft.companyName.trim() && !isSaving && isDirty);

  const saveProfile = async () => {
    if (!accessToken) {
      setErrorMessage('인증 세션을 확인할 수 없습니다.');
      return;
    }
    if (!draft.companyName.trim()) {
      setErrorMessage('회사명은 필수입니다.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setNoticeMessage(null);
    try {
      const response = await fetch('/api/crm/quote-seller-profile', {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(toPayload(draft)),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmQuoteSellerProfile> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setProfile(payload.data);
      setDraft(toDraft(payload.data));
      setNoticeMessage('견적서 공급자 정보가 저장되었습니다.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '견적 공급자 정보 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateDraft = <K extends keyof DraftProfile>(field: K, value: DraftProfile[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="min-h-full bg-muted">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">견적 설정</h1>
              <p className="mt-1 text-sm text-muted-foreground">견적서에 표시할 공급자 회사 정보</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => void loadProfile()} disabled={!accessToken || isLoading || isSaving}>
              <RefreshCw className="h-4 w-4" /> 새로고침
            </Button>
            <Button size="sm" type="button" onClick={() => void saveProfile()} disabled={!canSave}>
              <Save className="h-4 w-4" /> {isSaving ? '저장 중' : '저장'}
            </Button>
          </div>
        </div>

        {errorMessage ? (
          <div className="flex items-center gap-2 rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMessage}</span>
          </div>
        ) : null}
        {noticeMessage ? (
          <div className="rounded-md border border-ssoo-success-border bg-ssoo-success-bg px-3 py-2 text-sm text-ssoo-success">{noticeMessage}</div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-md border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <div className="text-sm font-semibold text-foreground">회사 정보</div>
            </div>
            <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
              <label className="space-y-1.5 text-sm text-muted-foreground">
                <span className="font-medium text-muted-foreground">회사명</span>
                <Input
                  required
                  value={draft.companyName}
                  maxLength={200}
                  placeholder="회사명 입력"
                  onChange={(event) => updateDraft('companyName', event.target.value)}
                />
              </label>
              <label className="space-y-1.5 text-sm text-muted-foreground">
                <span className="font-medium text-muted-foreground">대표이사</span>
                <Input
                  value={draft.ceoName}
                  maxLength={120}
                  placeholder="대표이사명"
                  onChange={(event) => updateDraft('ceoName', event.target.value)}
                />
              </label>
              <label className="space-y-1.5 text-sm text-muted-foreground">
                <span className="font-medium text-muted-foreground">사업자번호</span>
                <Input
                  value={draft.businessRegistrationNo}
                  maxLength={80}
                  placeholder="000-00-00000"
                  onChange={(event) => updateDraft('businessRegistrationNo', event.target.value)}
                />
              </label>
              <label className="space-y-1.5 text-sm text-muted-foreground">
                <span className="font-medium text-muted-foreground">대표 전화</span>
                <Input
                  value={draft.tel}
                  maxLength={80}
                  placeholder="02-0000-0000"
                  onChange={(event) => updateDraft('tel', event.target.value)}
                />
              </label>
              <label className="space-y-1.5 text-sm text-muted-foreground">
                <span className="font-medium text-muted-foreground">팩스</span>
                <Input
                  value={draft.fax}
                  maxLength={80}
                  placeholder="02-0000-0000"
                  onChange={(event) => updateDraft('fax', event.target.value)}
                />
              </label>
              <label className="space-y-1.5 text-sm text-muted-foreground">
                <span className="font-medium text-muted-foreground">대표 이메일</span>
                <Input
                  value={draft.email}
                  maxLength={200}
                  placeholder="sales@example.com"
                  onChange={(event) => updateDraft('email', event.target.value)}
                />
              </label>
              <label className="space-y-1.5 text-sm text-muted-foreground md:col-span-2">
                <span className="font-medium text-muted-foreground">회사 주소</span>
                <Input
                  value={draft.address}
                  maxLength={500}
                  placeholder="회사 주소"
                  onChange={(event) => updateDraft('address', event.target.value)}
                />
              </label>
              <label className="space-y-1.5 text-sm text-muted-foreground md:col-span-2">
                <span className="font-medium text-muted-foreground">웹사이트</span>
                <Input
                  value={draft.website}
                  maxLength={200}
                  placeholder="https://www.company.com"
                  onChange={(event) => updateDraft('website', event.target.value)}
                />
              </label>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-md border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-semibold text-foreground">CI 연결</div>
              </div>
              <div className="space-y-4 px-4 py-4">
                <label className="space-y-1.5 text-sm text-muted-foreground">
                  <span className="font-medium text-muted-foreground">CI 상태</span>
                  <NativeSelect
                    value={draft.ciStatus}
                    onChange={(event) => updateDraft('ciStatus', event.target.value as CrmQuoteSellerCiStatus)}
                  >
                    {Object.entries(ciStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </NativeSelect>
                </label>
                <label className="space-y-1.5 text-sm text-muted-foreground">
                  <span className="font-medium text-muted-foreground">CI 저장소 참조</span>
                  <Input
                    value={draft.ciStorageRef}
                    maxLength={300}
                    placeholder="DMS 연결 예정"
                    onChange={(event) => updateDraft('ciStorageRef', event.target.value)}
                  />
                </label>
                <div className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                  현재 상태: {ciStatusLabels[draft.ciStatus]}
                </div>
              </div>
            </section>

            <section className="rounded-md border border-border bg-card">
              <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">상태</div>
              <div className="space-y-2 px-4 py-4 text-sm text-muted-foreground">
                <StatusRow label="프로필 코드" value={profile.profileCode} />
                <StatusRow label="마지막 저장" value={formatDateTime(profile.updatedAt)} />
                <StatusRow label="저장 상태" value={isDirty ? '변경 있음' : '저장됨'} />
              </div>
            </section>
          </aside>
        </div>

        <section className="rounded-md border border-border bg-card">
          <div className="border-b border-border px-5 py-4 text-sm font-semibold text-foreground">관리 메모</div>
          <div className="px-5 py-5">
            <Textarea
              value={draft.memo}
              rows={4}
              placeholder="견적서 표시 정보 관리 메모"
              onChange={(event) => updateDraft('memo', event.target.value)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
