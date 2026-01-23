import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request Interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 클라이언트 사이드에서만 토큰 추가
    if (typeof window !== 'undefined') {
      const authStorage = localStorage.getItem('ssoo-auth');
      if (authStorage) {
        try {
          const { state } = JSON.parse(authStorage);
          if (state?.accessToken && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${state.accessToken}`;
          }
        } catch {
          // 파싱 실패 무시
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 401 에러 & 재시도 안한 경우 -> 토큰 갱신 시도
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (typeof window !== 'undefined') {
        const authStorage = localStorage.getItem('ssoo-auth');
        if (authStorage) {
          try {
            const { state } = JSON.parse(authStorage);
            if (state?.refreshToken) {
              // 토큰 갱신 요청
              const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                refreshToken: state.refreshToken,
              });

              if (refreshResponse.data?.success && refreshResponse.data?.data) {
                const { accessToken, refreshToken } = refreshResponse.data.data;

                // 스토어 업데이트
                const newState = {
                  ...state,
                  accessToken,
                  refreshToken,
                };
                localStorage.setItem('ssoo-auth', JSON.stringify({ state: newState }));

                // 원래 요청 재시도
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return apiClient(originalRequest);
              }
            }
          } catch {
            // 토큰 갱신 실패 - 로그아웃 처리 후 홈으로 이동
            localStorage.removeItem('ssoo-auth');
            window.location.href = '/';
          }
        }
      }
    }

    // 에러 메시지 추출
    const errorData = error.response?.data as { message?: string } | undefined;
    const message =
      errorData?.message ||
      error.message ||
      '요청 처리 중 오류가 발생했습니다.';

    return Promise.reject(new Error(message));
  },
);
