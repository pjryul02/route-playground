# 원격 서버 설치 가이드

VROOM Wrapper + Route Playground를 새 서버에 배포하는 가이드.

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Host                          │
│                                                         │
│  ┌─── vroom-wrapper (compose) ───────────────────────┐  │
│  │  osrm:5000  ←→  wrapper:8000  ←→  redis:6379     │  │
│  │  (OSRM 엔진)    (API + VROOM)     (캐시)         │  │
│  └───────────────────┬───────────────────────────────┘  │
│                      │ routing-net (공유 네트워크)       │
│  ┌─── route-playground (compose) ────────────────────┐  │
│  │  backend:8080  ←→  frontend:3030                  │  │
│  │  (FastAPI 프록시)   (React UI)                     │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  사용자 접속: http://<서버IP>:3030                       │
└─────────────────────────────────────────────────────────┘
```

**두 프로젝트는 `routing-net` Docker 외부 네트워크로 연결됩니다.**
- Playground backend → `http://vroom-wrapper-v3:8000` (컨테이너 이름으로 통신)
- 별도 포트 바인딩/host 네트워크 불필요

---

## 사전 요구사항

| 항목 | 최소 | 권장 |
|------|------|------|
| OS | Ubuntu 20.04+ / CentOS 8+ | Ubuntu 22.04 |
| Docker | 24.0+ | 최신 |
| Docker Compose | v2 (plugin) | 최신 |
| RAM | 4GB | 8GB+ |
| 디스크 | 20GB | 50GB+ (OSRM 데이터 포함) |
| CPU | 2코어 | 4코어+ |

---

## 1단계: Docker 설치 (건너뛰기 가능)

```bash
# Docker 설치 (Ubuntu)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 확인
docker --version
docker compose version
```

---

## 2단계: VROOM 바이너리 이미지 빌드

Wrapper의 Dockerfile.v3가 `vroom-local:latest` 이미지에서 VROOM 바이너리를 추출합니다.

### 옵션 A: VROOM 소스 빌드 (권장)

```bash
# VROOM 소스 클론
git clone https://github.com/VROOM-Project/vroom.git
cd vroom

# Docker 빌드
docker build -t vroom-local:latest .
cd ..

# 확인
docker images | grep vroom-local
```

### 옵션 B: 기존 이미지에서 태그

이미 `ghcr.io/vroom-project/vroom-docker:v1.14.0`를 사용 중이라면:

```bash
docker pull ghcr.io/vroom-project/vroom-docker:v1.14.0
docker tag ghcr.io/vroom-project/vroom-docker:v1.14.0 vroom-local:latest
```

> **주의**: 옵션 B는 바이너리 경로가 다를 수 있음. Dockerfile.v3의 COPY 경로 확인 필요.

---

## 3단계: OSRM 한국 지도 데이터 준비

```bash
# 데이터 디렉토리 생성
mkdir -p ~/osrm-data && cd ~/osrm-data

# 한국 지도 다운로드 (~150MB)
wget https://download.geofabrik.de/asia/south-korea-latest.osm.pbf

# OSRM 전처리 (3단계, 총 10~20분 소요)
docker run -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend:latest \
  osrm-extract -p /opt/car.lua /data/south-korea-latest.osm.pbf

docker run -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend:latest \
  osrm-partition /data/south-korea-latest.osrm

docker run -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend:latest \
  osrm-customize /data/south-korea-latest.osrm

# 확인 (~1.5GB 생성)
ls -lh *.osrm
```

---

## 4단계: 프로젝트 클론

```bash
cd ~

# 1) VROOM Wrapper
git clone https://github.com/pjryul02/vroom-wrapper.git
cd vroom-wrapper

# 2) Route Playground
cd ~
git clone https://github.com/pjryul02/route-playground.git
cd route-playground
```

---

## 5단계: Docker 공유 네트워크 생성

```bash
docker network create routing-net
```

> **이 네트워크가 두 프로젝트를 연결합니다.** 반드시 compose up 전에 생성해야 합니다.

---

## 6단계: VROOM Wrapper 실행

```bash
cd ~/vroom-wrapper

# docker-compose.v3.yml에서 OSRM 데이터 경로 확인/수정
# 기본값: /home/shawn/osrm-data → 실제 경로로 변경
```

### ⚠️ OSRM 데이터 경로 수정 (중요!)

`docker-compose.v3.yml` 파일에서 osrm 서비스의 volumes를 자신의 경로로 수정:

```yaml
  osrm:
    volumes:
      - /home/<사용자명>/osrm-data:/data    # ← 실제 경로로 수정
```

```bash
# 빌드 + 실행
docker compose -f docker-compose.v3.yml up -d --build

# 헬스 체크 (3개 컨테이너 모두 healthy 확인)
docker compose -f docker-compose.v3.yml ps

# API 테스트
curl http://localhost:8000/health
```

---

## 7단계: Route Playground 실행

```bash
cd ~/route-playground

# 환경변수 설정 (기본값으로 바로 동작함)
cp .env.example .env
# 필요시 .env 수정 (WRAPPER_API_KEY 등)

# 빌드 + 실행
docker compose up -d --build

# 확인
docker compose ps
curl http://localhost:8080/
```

---

## 8단계: 접속 확인

```
브라우저: http://<서버IP>:3030
```

1. Input Data 탭에서 서버 선택 (vroom-optimize 등)
2. Sample Data 로드 또는 직접 JSON 입력
3. Solve 클릭
4. 지도에서 경로 확인, Analysis 탭에서 분석 결과 확인

---

## 전체 실행 스크립트 (한번에)

```bash
#!/bin/bash
# setup.sh - 원격 서버 원클릭 배포

set -e

echo "=== 1. Docker 네트워크 생성 ==="
docker network create routing-net 2>/dev/null || echo "routing-net already exists"

echo "=== 2. VROOM Wrapper 실행 ==="
cd ~/vroom-wrapper
docker compose -f docker-compose.v3.yml up -d --build

echo "=== 3. Wrapper 헬스 체크 대기 ==="
echo "OSRM 시작까지 대기 중..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    echo "Wrapper ready!"
    break
  fi
  sleep 5
  echo "  대기 중... ($i/30)"
done

echo "=== 4. Route Playground 실행 ==="
cd ~/route-playground
cp -n .env.example .env 2>/dev/null || true
docker compose up -d --build

echo "=== 완료 ==="
echo "접속: http://$(hostname -I | awk '{print $1}'):3030"
```

---

## 유의사항

### 1. 컨테이너 시작 순서

**반드시 Wrapper를 먼저 시작** → OSRM healthy 확인 후 → Playground 시작.
Playground의 backend가 시작할 때 wrapper에 연결을 시도하진 않지만,
Solve 시 wrapper가 없으면 에러 발생.

### 2. 방화벽/포트

| 포트 | 서비스 | 외부 접근 |
|------|--------|-----------|
| 3030 | Playground Frontend | **필요** (사용자 접속) |
| 8080 | Playground Backend | 선택 (API 직접 호출 시) |
| 8000 | Wrapper API | 선택 (외부에서 직접 호출 시) |
| 5000 | OSRM | 불필요 (내부 전용) |
| 6379 | Redis | 불필요 (내부 전용) |

```bash
# UFW 사용 시
sudo ufw allow 3030
sudo ufw allow 8080  # 선택
```

### 3. OSRM 데이터 경로

`docker-compose.v3.yml`의 OSRM 볼륨 마운트 경로가 **반드시 실제 OSRM 데이터 위치**와 일치해야 합니다.
기본값 `/home/shawn/osrm-data`는 개발 환경 기준이므로, 원격 서버에서는 수정 필요:

```yaml
# docker-compose.v3.yml
osrm:
  volumes:
    - /home/<사용자>/osrm-data:/data  # ← 수정!
```

### 4. API Key

현재 기본 키: `demo-key-12345`
운영 환경에서는 Wrapper와 Playground 양쪽의 .env에서 동일한 키로 변경:

```bash
# vroom-wrapper 쪽: src/main_v3.py의 API_KEYS에 추가
# route-playground 쪽: .env의 WRAPPER_API_KEY 변경
```

### 5. host.docker.internal vs 컨테이너 네트워크

| 환경 | WRAPPER_BASE_URL |
|------|------------------|
| Docker 배포 (routing-net) | `http://vroom-wrapper-v3:8000` (기본값) |
| WSL2 로컬 개발 | `http://host.docker.internal:8000` |
| Linux 호스트 직접 | `http://localhost:8000` |

Playground의 `.env` 또는 `docker-compose.yml`에서 `WRAPPER_BASE_URL` 환경변수로 전환.

### 6. 재시작/업데이트

```bash
# Wrapper 업데이트
cd ~/vroom-wrapper
git pull
docker compose -f docker-compose.v3.yml up -d --build

# Playground 업데이트
cd ~/route-playground
git pull
docker compose up -d --build
```

### 7. 로그 확인

```bash
# Wrapper 로그
docker logs vroom-wrapper-v3 --tail 50 -f

# Playground 로그
cd ~/route-playground
docker compose logs backend --tail 50 -f
docker compose logs frontend --tail 50 -f
```

### 8. 전체 중지/삭제

```bash
# 중지만
cd ~/route-playground && docker compose down
cd ~/vroom-wrapper && docker compose -f docker-compose.v3.yml down

# 네트워크도 삭제
docker network rm routing-net
```

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `routing-net not found` | 네트워크 미생성 | `docker network create routing-net` |
| Solve 시 Connection refused | Wrapper 미실행 또는 네트워크 분리 | Wrapper 상태 확인, routing-net 확인 |
| OSRM 시작 실패 | 데이터 경로 불일치 또는 전처리 미완료 | volumes 경로 확인, 3단계 재실행 |
| `vroom-local:latest` 빌드 실패 | VROOM 이미지 없음 | 2단계 참고 |
| 401 Unauthorized (optimize) | API Key 불일치 | 양쪽 .env의 키 동일한지 확인 |
| 지도에 직선만 표시 | geometry 미적용 | 정상 - 직접 수정 불필요 (자동 처리됨) |
