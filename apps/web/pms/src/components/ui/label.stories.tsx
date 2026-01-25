import type { Meta, StoryObj } from '@storybook/react';
import { Label } from './label';
import { Input } from './input';
import { Checkbox } from './checkbox';

/**
 * Label 컴포넌트는 폼 요소에 대한 설명을 제공합니다.
 *
 * ## 접근성
 * - htmlFor로 연결된 Input과 함께 사용
 * - 클릭 시 연결된 Input에 포커스
 *
 * ## 사용 지침
 * - 모든 폼 요소에 Label 필수
 * - 필수 항목은 * 표시 (text-ls-red)
 */
const meta: Meta<typeof Label> = {
  title: 'UI/Label',
  component: Label,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Label>;

// ============================================================================
// 기본 스토리
// ============================================================================

/** 기본 Label */
export const Default: Story = {
  args: {
    children: '라벨 텍스트',
  },
};

// ============================================================================
// Input과 함께
// ============================================================================

/** Input + Label */
export const WithInput: Story = {
  render: () => (
    <div className="grid w-64 gap-1.5">
      <Label htmlFor="email">이메일</Label>
      <Input id="email" type="email" placeholder="example@company.com" />
    </div>
  ),
};

/** 필수 입력 표시 */
export const Required: Story = {
  render: () => (
    <div className="grid w-64 gap-1.5">
      <Label htmlFor="name">
        이름 <span className="text-ls-red">*</span>
      </Label>
      <Input id="name" placeholder="홍길동" required />
    </div>
  ),
};

// ============================================================================
// Checkbox와 함께
// ============================================================================

/** Checkbox + Label */
export const WithCheckbox: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">이용약관에 동의합니다</Label>
    </div>
  ),
};

// ============================================================================
// 비활성화 상태
// ============================================================================

/** 비활성화된 Label */
export const Disabled: Story = {
  render: () => (
    <div className="grid w-64 gap-1.5">
      <Label htmlFor="disabled" className="opacity-50">
        비활성화된 필드
      </Label>
      <Input id="disabled" disabled placeholder="입력 불가" />
    </div>
  ),
};

// ============================================================================
// 폼 예시
// ============================================================================

/** 폼 레이아웃 */
export const FormLayout: Story = {
  render: () => (
    <div className="w-80 space-y-4">
      <div className="grid gap-1.5">
        <Label htmlFor="form-name">
          이름 <span className="text-ls-red">*</span>
        </Label>
        <Input id="form-name" placeholder="이름을 입력하세요" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="form-email">
          이메일 <span className="text-ls-red">*</span>
        </Label>
        <Input id="form-email" type="email" placeholder="example@company.com" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="form-phone">연락처</Label>
        <Input id="form-phone" placeholder="010-0000-0000" />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="form-agree" />
        <Label htmlFor="form-agree">개인정보 수집에 동의합니다</Label>
      </div>
    </div>
  ),
};
