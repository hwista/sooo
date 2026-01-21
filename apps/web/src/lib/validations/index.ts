/**
 * Validations Module
 *
 * Zod 스키마 중앙 관리
 *
 * 사용 예시:
 * ```tsx
 * import { createProjectSchema, type CreateProjectInput } from '@/lib/validations';
 *
 * const form = useForm<CreateProjectInput>({
 *   resolver: zodResolver(createProjectSchema),
 * });
 * ```
 */

// 공통 필드 스키마
export * from './common';

// 도메인별 스키마
export * from './auth';
export * from './project';

// 추후 추가
// export * from './customer';
// export * from './user';
