# Route Playground + VROOM Wrapper 통합 가이드

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────┐
│  Route Playground (Docker)                               │
│                                                          │
│  ┌──────────┐   ┌──────────────┐                        │
│  │ Frontend  │──▶│ Backend API  │                        │
│  │ :3030     │   │ :8080        │                        │
│  │ (React)   │   │ (FastAPI)    │                        │
│  └──────────┘   └──────┬───────┘                        │
│                         │                                │
│  ┌──────────────────────┘                                │
│  │  /solve/{server}  ← 프록시 라우팅                      │
│  │  API Key 자동 주입                                     │
│  │  geometry=true 자동 설정                                │
└──┼───────────────────────────────────────────────────────┘
   │
   │  HTTP (host.docker.internal:8000)
   │
┌──▼───────────────────────────────────────────────────────┐
│  VROOM Wrapper v3.0 (Docker)                             │
│                                                          │
│  ┌──────────────┐   ┌──────────┐   ┌──────────┐        │
│  │ Wrapper API  │──▶│ VROOM    │──▶│ OSRM     │        │
│  │ :8000        │   │ (binary) │   │ :5000    │        │
│  │ (FastAPI)    │   │          │   │ 한국 도로망│        │
│  └──────────────┘   └──────────┘   └──────────┘        │
│         │                                                │
│         ▼                                                │
│  ┌──────────┐                                            │
│  │ Redis    │ (캐시)                                      │
│  │ :6379    │                                            │
│  └──────────┘                                            │
└──────────────────────────────────────────────────────────┘
```

---

## 사용 가능한 서버 (엔진)

플레이그라운드 좌측 상단 드롭다운에서 선택 가능:

| 서버명 | 설명 | 인증 | 기능 수준 |
|--------|------|------|-----------|
| **VROOM Direct (OSRM)** | VROOM 직접 호출. 미배정 사유 분석 포함 | 불필요 | 기본 |
| **VROOM Optimize (Full)** | 전처리 + 최적화 + 분석 + 통계 풀 파이프라인 | 자동 | STANDARD |
| **VROOM Optimize (Basic)** | 빠른 최적화, 분석 생략 | 자동 | BASIC |
| **VROOM Optimize (Premium)** | 다중 시나리오 + 2-Pass 최적화 | 자동 | PREMIUM |
| **OR-Tools (Euclidean)** | 로컬 OR-Tools 솔버 (직선거리 기반) | 불필요 | PoC |

> **참고**: API Key(`demo-key-12345`)는 플레이그라운드 백엔드가 자동 주입합니다. 사용자가 직접 입력할 필요 없습니다.

---

## 각 서버별 응답 차이

### VROOM Direct (OSRM) — `/distribute`

기본적인 VROOM 결과 + 미배정 사유 분석.

```json
{
  "code": 0,
  "summary": {
    "cost": 34552,
    "unassigned": 0,
    "routes": 1,
    "delivery": [45],
    "duration": 2136,
    "distance": 34552
  },
  "routes": [
    {
      "vehicle": 1,
      "steps": [...],
      "distance": 34552,
      "duration": 2136,
      "geometry": "encoded_polyline..."
    }
  ],
  "unassigned": [],
  "_wrapper": {
    "version": "3.0.0",
    "engine": "direct",
    "processing_time_ms": 45
  }
}
```

미배정 작업이 있을 경우:
```json
"unassigned": [
  {
    "id": 5,
    "type": "job",
    "reasons": [
      {
        "type": "capacity",
        "description": "차량 적재량 초과",
        "details": {"required": [50], "max_available": [30]}
      }
    ]
  }
]
```

### VROOM Optimize (Full) — `/optimize`

풀 파이프라인 결과. 분석 + 통계 + 메타데이터 포함.

```json
{
  "wrapper_version": "3.0.0",
  "routes": [...],
  "summary": {...},
  "unassigned": [...],

  "analysis": {
    "quality_score": 95.2,
    "suggestions": [
      "차량 2의 적재율이 92%입니다. 추가 차량을 고려하세요."
    ],
    "vehicle_utilization": [
      {"vehicle_id": 1, "utilization": 0.85, "tasks": 5}
    ]
  },

  "statistics": {
    "total_distance_km": 34.5,
    "total_duration_min": 35.6,
    "avg_tasks_per_vehicle": 3.0,
    "service_time_total_min": 15.0,
    "driving_time_total_min": 20.6
  },

  "_metadata": {
    "api_key": "demo-user",
    "control_level": "STANDARD",
    "engine": "direct",
    "processing_time_ms": 120,
    "from_cache": false
  }
}
```

### VROOM Optimize (Basic) — `/optimize/basic`

빠른 결과. 분석/통계 생략.

```json
{
  "wrapper_version": "3.0.0",
  "routes": [...],
  "summary": {...},
  "unassigned": [...],
  "_metadata": {
    "control_level": "BASIC",
    "engine": "direct"
  }
}
```

### VROOM Optimize (Premium) — `/optimize/premium`

다중 시나리오 비교 + 2-Pass 최적화.

```json
{
  "wrapper_version": "3.0.0",
  "routes": [...],
  "summary": {...},
  "unassigned": [...],
  "analysis": {...},
  "statistics": {...},
  "multi_scenario_metadata": {
    "selected_scenario": "standard_balanced",
    "total_scenarios": 4,
    "comparison": {...}
  },
  "_metadata": {
    "control_level": "PREMIUM",
    "two_pass": true,
    "processing_time_ms": 350
  }
}
```

---

## 입력 데이터 형식 (VROOM 표준)

모든 서버가 동일한 VROOM JSON 형식을 입력으로 받습니다.

### 최소 예시 (서울)

```json
{
  "vehicles": [
    {
      "id": 1,
      "start": [126.978, 37.566],
      "end": [126.978, 37.566],
      "capacity": [100]
    }
  ],
  "jobs": [
    {
      "id": 1,
      "location": [127.027, 37.498],
      "service": 300,
      "delivery": [10],
      "description": "강남 배송"
    },
    {
      "id": 2,
      "location": [126.929, 37.524],
      "service": 300,
      "delivery": [20],
      "description": "영등포 배송"
    }
  ]
}
```

### 전체 필드 레퍼런스

#### Vehicle (차량)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | int | O | 차량 고유 ID |
| `start` | [lon, lat] | O | 출발지 좌표 |
| `end` | [lon, lat] | - | 도착지 (없으면 start와 동일) |
| `capacity` | [int] | - | 적재 용량 (예: `[100]`) |
| `skills` | [int] | - | 보유 스킬 (예: `[1, 2]`) |
| `time_window` | [start, end] | - | 근무 시간 (UNIX timestamp) |
| `max_tasks` | int | - | 최대 작업 수 |
| `speed_factor` | float | - | 속도 계수 (0.1~2.0, 기본 1.0) |
| `description` | string | - | 차량 설명 |

#### Job (작업)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | int | O | 작업 고유 ID |
| `location` | [lon, lat] | O | 배송지 좌표 |
| `service` | int | - | 서비스 시간 (초, 기본 300) |
| `delivery` | [int] | - | 배송 물량 (예: `[10]`) |
| `pickup` | [int] | - | 수거 물량 (예: `[5]`) |
| `skills` | [int] | - | 필요 스킬 |
| `priority` | int | - | 우선순위 (0~100, 높을수록 우선) |
| `time_windows` | [[start, end]] | - | 배송 가능 시간대 (UNIX timestamp) |
| `description` | string | - | 작업 설명 |

#### Shipment (수거+배송 쌍)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `pickup` | object | O | 수거지 (`{location: [lon, lat], ...}`) |
| `delivery` | object | O | 배송지 (`{location: [lon, lat], ...}`) |
| `amount` | [int] | O | 물량 |
| `skills` | [int] | - | 필요 스킬 |
| `priority` | int | - | 우선순위 |

> **좌표 순서**: `[경도(longitude), 위도(latitude)]` — VROOM 표준. 서울시청 = `[126.978, 37.566]`

---

## Optimize 전용 필드

`/optimize`, `/optimize/basic`, `/optimize/premium` 엔드포인트에서만 사용 가능한 추가 필드:

```json
{
  "vehicles": [...],
  "jobs": [...],
  "use_cache": true,
  "business_rules": {
    "vip_job_ids": [1, 5],
    "urgent_job_ids": [3],
    "enable_vip": true,
    "enable_urgent": true
  }
}
```

| 필드 | 설명 |
|------|------|
| `use_cache` | Redis 캐시 사용 여부 (기본 true). 동일 입력 재요청 시 즉시 반환 |
| `business_rules.vip_job_ids` | VIP 고객 작업 ID — 배정 우선순위 상향 |
| `business_rules.urgent_job_ids` | 긴급 작업 ID — 배정 우선순위 상향 |

---

## 서버별 기능 비교 요약

| 기능 | Direct | Basic | Standard | Premium |
|------|--------|-------|----------|---------|
| OSRM 도로 경로 | O | O | O | O |
| 미배정 사유 분석 | O | O | O | O |
| 입력 검증/정규화 | - | O | O | O |
| 비즈니스 규칙 (VIP/긴급) | - | O | O | O |
| Redis 캐싱 | - | - | O | O |
| 도달 불가능 사전 필터링 | - | - | O | O |
| 자동 제약 완화 & 재시도 | - | - | O | O |
| 품질 점수 & 개선 제안 | - | - | O | O |
| 상세 통계 | - | - | O | O |
| 2-Pass 최적화 | - | - | - | O |
| 다중 시나리오 비교 | - | - | - | O |
| Map Matching (GPS 보정) | - | - | - | - |

> **참고**: Map Matching은 최적화 파이프라인과 별도의 기능으로, 별도 엔드포인트(`/map-matching/match`)를 통해 제공됩니다.

---

## Map Matching (GPS 궤적 보정)

플레이그라운드 상단 "Map Matching" 탭에서 GPS 궤적을 도로에 보정할 수 있습니다.

### 흐름

1. 프론트엔드 → 플레이그라운드 백엔드 `POST /map-matching/match`
2. 백엔드 → VROOM Wrapper `POST /map-matching/match` (API Key 없이 직접 전달)
3. Wrapper → OSRM Match/Route/Nearest API로 보정 수행
4. 결과 반환: `[[lon, lat, timestamp, flag], ...]`

### 입력 형식

```json
{
  "trajectory": [
    [경도, 위도, 타임스탬프(unix초), 정확도(미터), 속도(m/s)],
    [127.027, 37.498, 1700000000, 10, 5],
    ...
  ]
}
```

### 플래그 의미

| 플래그 | 의미 |
|--------|------|
| 0.5 | 보정된 포인트 (도로에 스냅) |
| 1.0 | 원본 유지 (보정 불필요) |
| 2.0 | 생성된 포인트 (도로 따라가는 중간점) |
| 2.5 | 보간된 포인트 |
| 4.0 | 도로 점프 감지 |

### curl 테스트

```bash
curl -X POST http://localhost:8000/map-matching/match \
  -H "X-API-Key: demo-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "trajectory": [
      [127.027, 37.498, 1700000000, 5, 5],
      [127.028, 37.499, 1700000010, 80, 8],
      [127.030, 37.501, 1700000030, 120, 9],
      [127.032, 37.503, 1700000050, 10, 12]
    ]
  }'
```

### 헬스 체크

```bash
curl http://localhost:8000/map-matching/health
```

---

## Docker 실행 방법

### 0. Docker 네트워크 생성 (최초 1회)

```bash
# 네트워크 생성 (최초 1회)
docker network create routing-net
```

### 1. VROOM Wrapper 실행 (먼저)

```bash
# VROOM Wrapper 실행
cd ~/vroom-wrapper-project
docker compose -f docker-compose.v3.yml up -d
```

서비스: OSRM(:5000) + Redis(:6379) + Wrapper(:8000)

헬스 체크:
```bash
curl http://localhost:8000/health
```

### 2. Route Playground 실행

```bash
# Route Playground 실행
cd /path/to/RoutePlayground
docker-compose up -d
```

서비스: Frontend(:3030) + Backend(:8080)

### 3. 접속

- **플레이그라운드 UI**: http://localhost:3030
- **Wrapper Swagger 문서**: http://localhost:8000/docs

---

## curl로 직접 테스트

### /distribute (인증 불필요)

```bash
curl -X POST http://localhost:8000/distribute \
  -H "Content-Type: application/json" \
  -d '{
    "vehicles": [{"id": 1, "start": [126.978, 37.566], "end": [126.978, 37.566], "capacity": [100]}],
    "jobs": [
      {"id": 1, "location": [127.027, 37.498], "service": 300, "delivery": [10]},
      {"id": 2, "location": [126.929, 37.524], "service": 300, "delivery": [20]}
    ],
    "options": {"g": true}
  }'
```

### /optimize (인증 필요)

```bash
curl -X POST http://localhost:8000/optimize \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-key-12345" \
  -d '{
    "vehicles": [{"id": 1, "start": [126.978, 37.566], "end": [126.978, 37.566], "capacity": [100]}],
    "jobs": [
      {"id": 1, "location": [127.027, 37.498], "service": 300, "delivery": [10]},
      {"id": 2, "location": [126.929, 37.524], "service": 300, "delivery": [20]}
    ],
    "use_cache": false,
    "business_rules": {"vip_job_ids": [1]}
  }'
```

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| 직선 경로만 표시됨 | OSRM 미연결 또는 geometry 미요청 | Wrapper 먼저 실행 확인, `/health`에서 `vroom_binary: healthy` 확인 |
| Network Error | Wrapper가 꺼져있거나 Docker 네트워크 문제 | `docker ps`로 wrapper 컨테이너 확인, `host.docker.internal` 접근 가능 여부 확인 |
| 401 Unauthorized | API Key 누락 (직접 curl 호출 시) | `/optimize` 계열은 `X-API-Key: demo-key-12345` 헤더 필요. 플레이그라운드에서는 자동 주입 |
| distance: null | VROOM이 OSRM 없이 실행됨 | OSRM 컨테이너 상태 확인: `curl http://localhost:5000/health` |
| 503 Service Unavailable | OSRM 데이터 로딩 중 | OSRM 시작 후 30초~1분 대기 (한국 전체 도로망 로딩) |
| Map Matching 404 | Wrapper에 맵매칭 모듈 없음 | Wrapper v3.0 최신 버전으로 업데이트 (dc1f72f 이후) |
| Map Matching 타임아웃 | 궤적 포인트가 너무 많음 | 1000개 이하로 분할하여 요청 |

---

## 변경 이력

- 2025-02-25: 초기 작성 — VROOM Wrapper v3.0 통합 구조, 서버별 응답 차이, curl 예시
- 2025-02-27: Map Matching 섹션 추가, 트러블슈팅 보강
