# 헬스체크 API (Health)

서버 상태 확인용 API 명세입니다.

## 엔드포인트

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|----------|
| GET | `/health` | 서버 상태 확인 | ❌ |

---

## GET /health

서버 상태 확인

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-01-21T00:00:00.000Z",
    "service": "ssoo-server",
    "version": "0.0.1"
  }
}
```

### 응답 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `status` | string | 상태 값 (`ok`) |
| `timestamp` | string | 서버 시간 (ISO 8601) |
| `service` | string | 서비스 식별자 |
| `version` | string | 서비스 버전 |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-21 | Health API 문서 신규 작성 |
