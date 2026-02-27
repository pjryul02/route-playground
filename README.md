# Route Playground

차량 경로 문제(VRP, Vehicle Routing Problem)를 해결하고 **지도 위에 시각화**하는 풀스택 웹 애플리케이션입니다.

여러 경로 최적화 엔진(VROOM, OR-Tools, Jsprit, Timefold 등)의 엔드포인트를 자유롭게 추가하고, 드롭다운에서 골라 사용할 수 있습니다.

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| **다중 엔진 지원** | VROOM, OR-Tools 등 다양한 경로 엔진을 한 화면에서 전환하며 비교 |
| **인터랙티브 지도** | Leaflet 기반 지도에서 경로, 마커, 경유지 순서를 시각적으로 확인 |
| **JSON 기반 입력** | VROOM 표준 JSON 형식으로 직접 요청을 작성하거나 샘플 데이터 로드 |
| **스프레드시트 뷰** | 결과를 표 형태로 확인하고, Excel(XLSX)로 내보내기 |
| **비동기 요청** | 대규모 문제도 비동기로 처리하고 진행 상태를 폴링 |
| **Map Matching** | GPS 궤적 보정(Map Matching) 결과를 시각화하는 별도 탭 제공 |

---

## 사전 요구 사항 (Prerequisites)

| 항목 | 설명 |
|---|---|
| **VROOM Wrapper v3.0** | OSRM, VROOM 바이너리, Redis를 포함하는 별도 프로젝트. 먼저 실행되어 있어야 합니다. |
| **Docker 네트워크** | `docker network create routing-net` 으로 공유 네트워크를 생성합니다. |

> 자세한 설정 방법은 `INTEGRATION_GUIDE.md`를 참고하세요.

---

## 빠른 시작 (Quick Start)

### Docker 사용 (권장)

```bash
docker-compose up
```

| 서비스 | URL | 설명 |
|---|---|---|
| 프론트엔드 | http://localhost:3030 | 웹 UI |
| 백엔드 API | http://localhost:8080 | FastAPI 서버 |

> **참고**: 이 프로젝트는 자체 VROOM을 포함하지 않습니다. `routing-net` Docker 네트워크를 통해 VROOM Wrapper v3.0에 연결됩니다. Wrapper가 별도로 실행 중이어야 합니다 (`INTEGRATION_GUIDE.md` 참고).

### 로컬 개발 환경

#### 백엔드

```bash
# Python 의존성 설치
pip install -r requirements.txt

# 개발 서버 실행
python main.py
```

#### 프론트엔드

```bash
cd frontend

# Node.js 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:3030)
npm start
```

---

## 프로젝트 구조

```
RoutePlayground/
│
├── main.py                          # 백엔드 진입점 (uvicorn 서버 실행)
├── docker-compose.yml               # Docker 전체 서비스 구성
├── requirements.txt                 # Python 의존성
│
├── src/                             # 백엔드 (Python / FastAPI)
│   ├── api/
│   │   └── routes.py                #   API 엔드포인트 정의
│   ├── engines/
│   │   ├── base.py                  #   엔진 추상 클래스 (인터페이스)
│   │   ├── vroom_client.py          #   VROOM 엔진 연동
│   │   └── ortools_client.py        #   OR-Tools 엔진 연동
│   ├── models/
│   │   ├── request.py               #   요청 데이터 모델 (Pydantic)
│   │   ├── response.py              #   응답 데이터 모델
│   │   ├── job.py                   #   비동기 작업 모델
│   │   └── map_matching.py          #   Map Matching 모델
│   ├── services/
│   │   └── job_manager.py           #   비동기 작업 관리자
│   └── utils/
│       └── config.py                #   환경변수 기반 설정 (서버 URL 등)
│
└── frontend/                        # 프론트엔드 (React / TypeScript)
    ├── src/
    │   ├── config/
    │   │   └── servers.json         #   서버 목록 설정 (여기만 수정!)
    │   ├── components/
    │   │   ├── MapComponent.tsx      #   Leaflet 지도 + 경로 시각화
    │   │   ├── panels/
    │   │   │   └── InputPanel.tsx    #   입력 패널 (비동기 처리 포함)
    │   │   ├── JsonPanel.tsx         #   JSON 입력/출력 패널
    │   │   ├── RouteList.tsx         #   경로 목록 + 상세 정보
    │   │   ├── MapMatchingPanel.tsx  #   Map Matching 탭
    │   │   └── SpreadsheetEditor.tsx #   스프레드시트 뷰
    │   ├── hooks/                   #   Custom React Hooks (useRouting 등)
    │   ├── services/
    │   │   └── api.ts               #   백엔드/엔진 API 호출
    │   ├── utils/
    │   │   ├── serverHelpers.ts     #   서버 설정 헬퍼 (servers.json 기반)
    │   │   ├── excelExport.ts       #   Excel 내보내기
    │   │   └── formatters.ts        #   시간/날짜 포맷터
    │   ├── constants/
    │   │   └── index.ts             #   상수 정의
    │   └── types.ts                 #   TypeScript 타입 정의
    └── package.json
```

> **참고**: 기존 `ControlPanel.tsx`는 `panels/InputPanel.tsx`로 리팩토링되었습니다.

---

## 서버(엔진) 관리

### 프론트엔드에서 직접 호출하는 서버 추가/수정

**`frontend/src/config/servers.json`** 파일 하나만 수정하면 됩니다:

```json
{
  "name": "my-new-engine",
  "description": "My New Engine (8090)",
  "url": "http://192.168.0.20:8090/distribute",
  "type": "direct"
}
```

- `type: "direct"` -- 프론트엔드에서 엔진 서버로 직접 HTTP 요청
- `type: "proxy"` -- 백엔드(`/solve/{name}`)를 경유하여 요청

> **코드 변경 없이 JSON 파일만 수정하면 드롭다운에 자동 반영**됩니다.

### 백엔드 프록시 서버 URL 변경

`.env` 파일을 생성하여 환경변수로 오버라이드할 수 있습니다:

```env
# 서버 URL 오버라이드
ROOUTY_URL=https://my-custom-vroom.com/distribute
VROOM_LOCAL_URL=http://my-vroom:3000/
MAP_MATCHING_URL=http://my-matcher:8100/map-matching/match
WRAPPER_BASE_URL=http://vroom-wrapper:8100

# API 서버 설정
API_HOST=0.0.0.0
API_PORT=8080
DEBUG=false
```

> 백엔드 URL은 `src/utils/config.py`에서 `WRAPPER_BASE_URL` 등의 환경변수로 오버라이드할 수 있습니다.

---

## API 엔드포인트

| Method | Endpoint | 설명 |
|---|---|---|
| `GET` | `/` | API 헬스 체크 |
| `POST` | `/solve/{server}` | 지정된 서버로 경로 최적화 요청 |
| `GET` | `/servers` | 사용 가능한 백엔드 서버 목록 조회 |
| `GET` | `/job/{job_id}` | 비동기 작업 상태 조회 |
| `POST` | `/map-matching/match` | GPS 궤적 Map Matching |

### 요청 예시

```bash
# VROOM 로컬 서버로 경로 최적화
curl -X POST http://localhost:8080/solve/vroom-local \
  -H "Content-Type: application/json" \
  -d '{"vehicles": [...], "jobs": [...]}'

# 비동기 요청 (대규모 문제)
curl -X POST "http://localhost:8080/solve/roouty?timeout=600&async=true" \
  -H "Content-Type: application/json" \
  -d '{"vehicles": [...], "jobs": [...]}'
```

---

## 사용 방법

1. **서버 선택**: 좌측 패널 상단 드롭다운에서 사용할 엔진 서버를 선택합니다.
2. **데이터 입력**: JSON 에디터에 차량(`vehicles`)과 작업(`jobs`) 데이터를 입력하거나, "Load Sample" 버튼으로 샘플을 로드합니다.
3. **경로 계산**: "Solve" 버튼을 클릭하면 선택된 엔진이 최적 경로를 계산합니다.
4. **결과 확인**:
   - **지도**: 우측 지도에 경로가 색상별로 표시됩니다.
   - **경로 목록**: 중간 패널에서 차량별 경로 상세 정보를 확인합니다.
   - **Output JSON**: 원본 응답 JSON을 확인하고 Excel로 내보낼 수 있습니다.
5. **Map Matching** (선택): 상단 탭을 "Map Matching"으로 전환하면 GPS 궤적 보정 기능을 사용할 수 있습니다.

---

## 개발 가이드

### 코드 품질 도구

```bash
# Python 린트 및 포맷
ruff check src/
black src/

# TypeScript 빌드 확인
cd frontend && npm run build
```

### 주요 수정 포인트

| 수정 목적 | 파일 |
|---|---|
| 새 엔진 서버 추가 | `frontend/src/config/servers.json` |
| 경로 최적화 알고리즘 변경 | `src/engines/ortools_client.py` 또는 `src/engines/vroom_client.py` |
| API 엔드포인트 추가 | `src/api/routes.py` |
| 지도 시각화 수정 | `frontend/src/components/MapComponent.tsx` |
| UI 레이아웃 변경 | `frontend/src/App.tsx` |
| 환경변수/포트 설정 | `src/utils/config.py` 및 `.env` |

---

## 기술 스택

### 백엔드
- **Python 3.x** + **FastAPI** (비동기 웹 프레임워크)
- **Pydantic** (데이터 검증)
- **httpx** (비동기 HTTP 클라이언트)
- **OR-Tools** (Google 경로 최적화 라이브러리)

### 프론트엔드
- **React 18** + **TypeScript**
- **Leaflet** / **react-leaflet** (지도)
- **Axios** (HTTP 통신)
- **xlsx** (Excel 내보내기)

### 인프라
- **Docker** + **Docker Compose**
- **VROOM Wrapper v3.0** (OSRM, VROOM 바이너리, Redis를 포함하는 외부 프로젝트)
