'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormPageTemplate } from '@/components/templates';
import { FormField } from '@/components/common';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useTabStore } from '@/stores';
import { useCreateProject, useUpsertRequestDetail } from '@/hooks/queries/useProjects';
import { useCustomerList } from '@/hooks/queries/useCustomers';
import { usePlantSites, useSystemInstances } from '@/hooks/queries/usePmsMaster';
import { formatCustomerLookupCaption } from '@/lib/project-display';

const REQUEST_SOURCE_OPTIONS = [
  { value: 'RFP', label: 'RFP' },
  { value: 'RFI', label: 'RFI' },
  { value: 'RFQ', label: 'RFQ' },
  { value: 'verbal', label: '구두 요청' },
  { value: 'internal', label: '내부 발굴' },
] as const;

const REQUEST_CHANNEL_OPTIONS = [
  { value: 'email', label: '이메일' },
  { value: 'phone', label: '전화' },
  { value: 'meeting', label: '미팅' },
  { value: 'portal', label: '포털' },
  { value: 'other', label: '기타' },
] as const;

const REQUEST_PRIORITY_OPTIONS = [
  { value: 'urgent', label: '긴급' },
  { value: 'high', label: '높음' },
  { value: 'normal', label: '보통' },
  { value: 'low', label: '낮음' },
] as const;

const createRequestSchema = z.object({
  projectName: z
    .string()
    .min(2, '프로젝트명은 2자 이상이어야 합니다')
    .max(100, '프로젝트명은 100자 이하여야 합니다'),
  customerId: z.string().optional(),
  plantId: z.string().optional(),
  systemInstanceId: z.string().optional(),
  requestSourceCode: z.string().optional(),
  requestChannelCode: z.string().optional(),
  requestPriorityCode: z.string().optional(),
  requestSummary: z.string().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof createRequestSchema>;

const EMPTY_SELECT_VALUE = '__none__';

export function RequestCreatePage() {
  const { openTab } = useTabStore();
  const createProject = useCreateProject();
  const upsertRequestDetail = useUpsertRequestDetail();
  const { data: customersData } = useCustomerList({ page: 1, pageSize: 100 });
  const customers = customersData?.data?.items ?? [];
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      projectName: '',
      customerId: '',
      plantId: '',
      systemInstanceId: '',
      requestSourceCode: '',
      requestChannelCode: '',
      requestPriorityCode: 'normal',
      requestSummary: '',
      description: '',
    },
    mode: 'onChange',
  });

  const selectedCustomerId = form.watch('customerId');
  const selectedPlantId = form.watch('plantId');
  const siteFilters = useMemo(() => ({
    page: 1,
    pageSize: 100,
    ...(selectedCustomerId && { customerId: selectedCustomerId }),
  }), [selectedCustomerId]);
  const instanceFilters = useMemo(() => ({
    page: 1,
    pageSize: 100,
    ...(selectedCustomerId && { customerId: selectedCustomerId }),
    ...(selectedPlantId && { siteId: selectedPlantId }),
  }), [selectedCustomerId, selectedPlantId]);
  const siteQuery = usePlantSites(siteFilters);
  const instanceQuery = useSystemInstances(instanceFilters);
  const sites = useMemo(() => siteQuery.data?.data?.items ?? [], [siteQuery.data]);
  const instances = useMemo(() => instanceQuery.data?.data?.items ?? [], [instanceQuery.data]);

  useEffect(() => {
    const selectedSite = form.getValues('plantId');
    if (!selectedSite || siteQuery.isLoading) return;
    if (!sites.some((site) => site.siteId === selectedSite)) {
      form.setValue('plantId', '');
      form.setValue('systemInstanceId', '');
    }
  }, [form, siteQuery.isLoading, sites]);

  useEffect(() => {
    const selectedInstance = form.getValues('systemInstanceId');
    if (!selectedInstance || instanceQuery.isLoading) return;
    if (!instances.some((instance) => instance.systemInstanceId === selectedInstance)) {
      form.setValue('systemInstanceId', '');
    }
  }, [form, instanceQuery.isLoading, instances]);

  const loading = createProject.isPending || upsertRequestDetail.isPending;

  const navigateToList = () => {
    openTab({
      menuCode: 'request.list',
      menuId: 'request.list',
      title: '요청 목록',
      path: '/request',
    });
  };

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);

    try {
      const projectResult = await createProject.mutateAsync({
        projectName: data.projectName,
        statusCode: 'request',
        stageCode: 'waiting',
        customerId: data.customerId || undefined,
        plantId: data.plantId || undefined,
        systemInstanceId: data.systemInstanceId || undefined,
        description: data.description || undefined,
      });

      if (!projectResult.success || !projectResult.data) {
        setSubmitError(projectResult.message || '프로젝트 등록에 실패했습니다');
        return;
      }

      const projectId = projectResult.data.id;

      const hasRequestDetail =
        data.requestSourceCode ||
        data.requestChannelCode ||
        data.requestPriorityCode ||
        data.requestSummary;

      if (hasRequestDetail) {
        await upsertRequestDetail.mutateAsync({
          id: projectId,
          data: {
            requestSourceCode: data.requestSourceCode || undefined,
            requestChannelCode: data.requestChannelCode || undefined,
            requestPriorityCode: data.requestPriorityCode || undefined,
            requestSummary: data.requestSummary || undefined,
          },
        });
      }

      navigateToList();
    } catch {
      setSubmitError('서버 오류가 발생했습니다');
    }
  };

  return (
    <FormPageTemplate
      header={{
        title: '요청 등록',
        description: '고객사로부터 접수된 새로운 요청을 등록합니다',
        breadcrumb: ['요청', '요청 목록', '등록'],
      }}
      sections={[
        {
          key: 'basic',
          title: '기본 정보',
          description: '프로젝트의 기본 정보를 입력합니다',
          children: (
            <>
              <FormField
                label="프로젝트명"
                required
                error={form.formState.errors.projectName?.message}
                hint="고객사로부터 접수된 요청의 프로젝트명을 입력하세요"
              >
                <Input
                  {...form.register('projectName')}
                  placeholder="예: ○○사 ERP 고도화 요청"
                />
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="고객사">
                  <Controller
                    name="customerId"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        value={field.value || EMPTY_SELECT_VALUE}
                        onValueChange={(v) =>
                          field.onChange(v === EMPTY_SELECT_VALUE ? '' : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="고객사를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={EMPTY_SELECT_VALUE}>
                            선택 안함
                          </SelectItem>
                          {customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.customerName} · {formatCustomerLookupCaption(c)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>

                <FormField label="우선순위">
                  <Controller
                    name="requestPriorityCode"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        value={field.value || EMPTY_SELECT_VALUE}
                        onValueChange={(v) =>
                          field.onChange(v === EMPTY_SELECT_VALUE ? '' : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="우선순위를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={EMPTY_SELECT_VALUE}>
                            선택 안함
                          </SelectItem>
                          {REQUEST_PRIORITY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="플랜트/사이트">
                  <Controller
                    name="plantId"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        value={field.value || EMPTY_SELECT_VALUE}
                        onValueChange={(v) =>
                          field.onChange(v === EMPTY_SELECT_VALUE ? '' : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="플랜트/사이트를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={EMPTY_SELECT_VALUE}>
                            선택 안함
                          </SelectItem>
                          {sites.map((site) => (
                            <SelectItem key={site.siteId} value={site.siteId}>
                              {site.siteName} · {site.siteCode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>

                <FormField label="시스템 인스턴스">
                  <Controller
                    name="systemInstanceId"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        value={field.value || EMPTY_SELECT_VALUE}
                        onValueChange={(v) =>
                          field.onChange(v === EMPTY_SELECT_VALUE ? '' : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="시스템 인스턴스를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={EMPTY_SELECT_VALUE}>
                            선택 안함
                          </SelectItem>
                          {instances.map((instance) => (
                            <SelectItem key={instance.systemInstanceId} value={instance.systemInstanceId}>
                              {instance.instanceName} · {instance.instanceCode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="요청 출처">
                  <Controller
                    name="requestSourceCode"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        value={field.value || EMPTY_SELECT_VALUE}
                        onValueChange={(v) =>
                          field.onChange(v === EMPTY_SELECT_VALUE ? '' : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="요청 출처를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={EMPTY_SELECT_VALUE}>
                            선택 안함
                          </SelectItem>
                          {REQUEST_SOURCE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>

                <FormField label="요청 채널">
                  <Controller
                    name="requestChannelCode"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        value={field.value || EMPTY_SELECT_VALUE}
                        onValueChange={(v) =>
                          field.onChange(v === EMPTY_SELECT_VALUE ? '' : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="요청 채널을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={EMPTY_SELECT_VALUE}>
                            선택 안함
                          </SelectItem>
                          {REQUEST_CHANNEL_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
              </div>
            </>
          ),
        },
        {
          key: 'detail',
          title: '상세 정보',
          description: '요청 상세 내용을 입력합니다',
          children: (
            <>
              <FormField
                label="요청 요약"
                hint="고객 요청의 핵심 내용을 간략히 요약하세요"
              >
                <Textarea
                  {...form.register('requestSummary')}
                  rows={3}
                  placeholder="요청 내용을 간략히 요약하세요"
                />
              </FormField>

              <FormField
                label="상세 설명"
                hint="고객 요청 사항을 자세히 입력하세요"
              >
                <Textarea
                  {...form.register('description')}
                  rows={5}
                  placeholder="고객 요청 사항의 상세 내용을 입력하세요"
                />
              </FormField>

              {submitError && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                  <p className="text-sm text-destructive">{submitError}</p>
                </div>
              )}

              <div className="bg-ssoo-info-bg border border-ssoo-info-border rounded-lg p-4">
                <p className="text-sm font-medium text-ssoo-info mb-2">
                  📌 등록 시 자동 설정되는 값
                </p>
                <ul className="text-sm text-ssoo-info space-y-1">
                  <li>• 상태: <strong>요청 (Request)</strong></li>
                  <li>• 단계: <strong>대기 (Waiting)</strong></li>
                </ul>
              </div>
            </>
          ),
        },
      ]}
      onFormSubmit={form.handleSubmit(onSubmit)}
      onCancel={navigateToList}
      submitLabel="등록"
      cancelLabel="취소"
      loading={loading}
      submitDisabled={!form.formState.isValid}
    />
  );
}
