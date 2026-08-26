import { AppLayout } from '@/components/layout';

/**
 * Admin launch-readiness에서 DMS Git/runtime 운영 상태로 진입하는 공식 deep link.
 *
 * 실제 설정 화면은 AppLayout이 현재 pathname을 기존 MDI settings tab으로 handoff해
 * ContentArea에서 렌더링한다. 별도 설정 구현이나 권한 우회는 두지 않는다.
 */
export default function OperationsGitSettingsEntryPage() {
  return <AppLayout />;
}
