import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from '@/lib/api/auth';

interface User {
  userId: string;
  loginId: string;
  roleCode: string;
  userTypeCode: string;
}

interface AuthState {
  // State
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      accessToken: null,
      refreshToken: null,
      user: null,
      isLoading: false,
      isAuthenticated: false,

      // Actions
      login: async (loginId: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login({ loginId, password });

          if (response.success && response.data) {
            const { accessToken, refreshToken } = response.data;
            set({
              accessToken,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });

            // 사용자 정보 조회
            const meResponse = await authApi.me(accessToken);
            if (meResponse.success && meResponse.data) {
              set({ user: meResponse.data });
            }
          } else {
            throw new Error(response.message || '로그인에 실패했습니다.');
          }
        } catch (error: any) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const { accessToken } = get();
        try {
          if (accessToken) {
            await authApi.logout(accessToken);
          }
        } catch {
          // 로그아웃 API 실패해도 클라이언트는 로그아웃 처리
        } finally {
          get().clearAuth();
        }
      },

      checkAuth: async () => {
        const { accessToken, refreshToken, isAuthenticated } = get();
        
        // 토큰이 없으면 인증되지 않음
        if (!accessToken && !refreshToken) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        // 이미 인증된 상태면 사용자 정보만 확인
        if (isAuthenticated && accessToken) {
          set({ isLoading: true });
          try {
            const meResponse = await authApi.me(accessToken);
            if (meResponse.success && meResponse.data) {
              set({ user: meResponse.data, isLoading: false });
              return;
            }
          } catch {
            // 토큰 만료 시 리프레시 시도
          }
        }

        // 리프레시 토큰으로 재인증 시도
        if (refreshToken) {
          set({ isLoading: true });
          const success = await get().refreshTokens();
          if (success) {
            const newAccessToken = get().accessToken;
            if (newAccessToken) {
              try {
                const meResponse = await authApi.me(newAccessToken);
                if (meResponse.success && meResponse.data) {
                  set({ user: meResponse.data, isLoading: false });
                  return;
                }
              } catch {
                // 사용자 정보 조회 실패
              }
            }
          }
        }

        // 모든 시도 실패
        get().clearAuth();
      },

      refreshTokens: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;

        try {
          const response = await authApi.refresh(refreshToken);
          if (response.success && response.data) {
            set({
              accessToken: response.data.accessToken,
              refreshToken: response.data.refreshToken,
              isAuthenticated: true,
            });
            return true;
          }
          return false;
        } catch {
          get().clearAuth();
          return false;
        }
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken, isAuthenticated: true });
      },

      setUser: (user: User) => {
        set({ user });
      },

      clearAuth: () => {
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },
    }),
    {
      name: 'ssoo-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
