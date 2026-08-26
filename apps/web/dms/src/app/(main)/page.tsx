import { AppLayout } from '@/components/layout';

/**
 * DMS 메인 셸 페이지 (/)
 *
 * - 일반 브라우저 진입점은 `/` 사용
 * - Admin launch-readiness 운영 설정 deep link는 같은 AppLayout으로 handoff
 * - 실제 탭 기반 화면 전환은 AppLayout > ContentArea가 담당
 */
export default function MainPage() {
  return <AppLayout />;
}
