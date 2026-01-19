import { z } from 'zod';
import {
  requiredString,
  requiredStringMax,
  optionalString,
  optionalStringMax,
  optionalId,
  amountField,
  dateField,
  optionalSelect,
  requiredSelect,
} from './common';

/**
 * 프로젝트 유효성 검증 스키마
 */

// ========================================
// 코드 타입 스키마
// ========================================

/** 프로젝트 상태 코드 */
export const projectStatusCodeSchema = z.enum(['opportunity', 'execution'], {
  errorMap: () => ({ message: '유효한 상태를 선택하세요.' }),
});

/** 프로젝트 단계 코드 */
export const projectStageCodeSchema = z.enum(['waiting', 'in_progress', 'done'], {
  errorMap: () => ({ message: '유효한 단계를 선택하세요.' }),
});

/** 프로젝트 소스 코드 */
export const projectSourceCodeSchema = z.enum(['request', 'referral', 'direct', 'tender', 'etc'], {
  errorMap: () => ({ message: '유효한 유입경로를 선택하세요.' }),
});

/** 프로젝트 완료 결과 코드 */
export const projectDoneResultCodeSchema = z.enum(['won', 'lost', 'hold'], {
  errorMap: () => ({ message: '유효한 결과를 선택하세요.' }),
});

// ========================================
// 프로젝트 스키마
// ========================================

/** 프로젝트 생성 스키마 */
export const createProjectSchema = z.object({
  projectName: requiredStringMax(200).describe('프로젝트명'),
  statusCode: projectStatusCodeSchema.optional().default('opportunity'),
  stageCode: projectStageCodeSchema.optional().default('waiting'),
  projectSourceCode: projectSourceCodeSchema.optional(),
  customerId: optionalId.describe('고객사'),
  description: optionalStringMax(2000).describe('설명'),
  startDate: dateField.describe('시작일'),
  endDate: dateField.describe('종료일'),
  contractAmount: amountField.describe('계약금액'),
});

/** 프로젝트 수정 스키마 */
export const updateProjectSchema = createProjectSchema.partial().extend({
  doneResultCode: projectDoneResultCodeSchema.optional(),
});

/** 고객요청 등록 스키마 (프로젝트의 특수 케이스) */
export const createCustomerRequestSchema = z.object({
  // 기본 정보
  projectName: requiredStringMax(200).describe('요청 제목'),
  description: optionalStringMax(2000).describe('요청 내용'),

  // 고객 정보
  customerId: optionalId.describe('고객사'),
  customerContactName: optionalStringMax(100).describe('담당자명'),
  customerContactPhone: optionalStringMax(20).describe('담당자 연락처'),
  customerContactEmail: optionalStringMax(100).describe('담당자 이메일'),

  // 일정
  requestDate: dateField.describe('요청일'),
  expectedStartDate: dateField.describe('희망 시작일'),
  expectedEndDate: dateField.describe('희망 종료일'),

  // 비용
  expectedBudget: amountField.describe('예상 예산'),

  // 기타
  priority: optionalSelect.describe('우선순위'),
  attachments: z.array(z.string()).optional().describe('첨부파일'),
});

// ========================================
// 타입 추론
// ========================================

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateCustomerRequestInput = z.infer<typeof createCustomerRequestSchema>;
