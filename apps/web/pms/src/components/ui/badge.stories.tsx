import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';

/**
 * Badge 컴포넌트는 상태, 카테고리, 태그 등을 표시하는 라벨입니다.
 *
 * ## 사용 용도
 * - **default**: 기본 상태/정보 표시
 * - **secondary**: 보조 정보, 카테고리
 * - **destructive**: 오류, 경고, 긴급 상태
 * - **outline**: 최소 강조, 태그
 */
const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
      description: '뱃지 스타일',
    },
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

// ============================================================================
// 기본 스토리
// ============================================================================

/** 기본 뱃지 */
export const Default: Story = {
  args: {
    children: '기본',
    variant: 'default',
  },
};

/** Secondary 뱃지 */
export const Secondary: Story = {
  args: {
    children: '보조',
    variant: 'secondary',
  },
};

/** Destructive 뱃지 */
export const Destructive: Story = {
  args: {
    children: '긴급',
    variant: 'destructive',
  },
};

/** Outline 뱃지 */
export const Outline: Story = {
  args: {
    children: '태그',
    variant: 'outline',
  },
};

// ============================================================================
// 실제 사용 예시
// ============================================================================

/** 모든 Variant 비교 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

/** 상태 표시 */
export const StatusIndicators: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge variant="default">진행중</Badge>
      <Badge variant="secondary">대기</Badge>
      <Badge variant="destructive">지연</Badge>
      <Badge className="border-green-500 bg-green-100 text-green-800">완료</Badge>
    </div>
  ),
};

/** 프로젝트 타입 태그 */
export const ProjectTypes: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge variant="outline">SI</Badge>
      <Badge variant="outline">SM</Badge>
      <Badge variant="outline">컨설팅</Badge>
      <Badge variant="outline">구축</Badge>
    </div>
  ),
};

/** 우선순위 표시 */
export const Priority: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge variant="destructive">긴급</Badge>
      <Badge variant="default">높음</Badge>
      <Badge variant="secondary">보통</Badge>
      <Badge variant="outline">낮음</Badge>
    </div>
  ),
};

/** 카드 내 사용 예시 */
export const InCard: Story = {
  render: () => (
    <div className="w-64 rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <h3 className="font-semibold">프로젝트 A</h3>
        <Badge variant="default">진행중</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">프로젝트 설명입니다...</p>
      <div className="mt-3 flex gap-1">
        <Badge variant="outline">SI</Badge>
        <Badge variant="outline">금융</Badge>
      </div>
    </div>
  ),
};

/** 테이블 셀 내 사용 */
export const InTableCell: Story = {
  render: () => (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b">
          <th className="p-2 text-left">프로젝트명</th>
          <th className="p-2 text-left">상태</th>
          <th className="p-2 text-left">유형</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b">
          <td className="p-2">고객사 ERP 구축</td>
          <td className="p-2">
            <Badge variant="default">진행중</Badge>
          </td>
          <td className="p-2">
            <Badge variant="outline">SI</Badge>
          </td>
        </tr>
        <tr className="border-b">
          <td className="p-2">시스템 유지보수</td>
          <td className="p-2">
            <Badge variant="secondary">대기</Badge>
          </td>
          <td className="p-2">
            <Badge variant="outline">SM</Badge>
          </td>
        </tr>
        <tr>
          <td className="p-2">인프라 점검</td>
          <td className="p-2">
            <Badge variant="destructive">지연</Badge>
          </td>
          <td className="p-2">
            <Badge variant="outline">컨설팅</Badge>
          </td>
        </tr>
      </tbody>
    </table>
  ),
};
