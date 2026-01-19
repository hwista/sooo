'use client';

import { ListPageTemplate } from '@/components/templates';
import { Plus } from 'lucide-react';
import { useTabStore } from '@/stores';

export default function CustomerRequestListPage() {
  const { openTab } = useTabStore();

  const handleCreate = () => {
    openTab({
      menuCode: 'request.customer.create',
      menuId: 'request.customer.create',
      title: '고객요청 등록',
      path: '/request/customer/create',
    });
  };

  return (
    <ListPageTemplate
      header={{
        title: '고객요청 목록',
        description: '고객사로부터 접수된 프로젝트 요청을 관리합니다',
        breadcrumb: ['요청', '고객요청 관리'],
        actions: [
          {
            label: '등록',
            icon: <Plus className="icon-body" />,
            onClick: handleCreate,
          },
        ],
      }}
      columns={[]}
      data={[]}
      loading={false}
    />
  );
}
