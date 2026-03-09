# my-vue-project (Vue Frontend)

Vue 3 기반 프론트엔드 프로젝트입니다.

---

## 프로젝트 설정

```bash
npm install
```

## 로컬 개발

### 개발 서버 실행 (Hot-reload)

```bash
npm run serve
```

### 프로덕션 빌드

```bash
npm run build
```

### 린트

```bash
npm run lint
```

---

## CI/CD 배포 (권장)

`main` 브랜치에 **push**하면 GitHub Actions가 자동으로 다음을 수행합니다.

1. **빌드** — `npm ci` → `npm run build`
2. **Docker 이미지** — 빌드 후 **GitHub Container Registry(ghcr.io)** 에 push
3. **NAS 배포** — SSH로 NAS 접속 후 `docker pull` → 컨테이너 재시작

### 필요한 설정 (최초 1회)

| 항목 | 설명 |
|------|------|
| **GitHub Secrets** | 레포 **Settings → Secrets and variables → Actions** 에 아래 시크릿 등록 |
| `NAS_HOST` | NAS IP (예: `125.141.20.218`) |
| `NAS_USER` | NAS SSH 사용자명 |
| `NAS_SSH_PASSWORD` | NAS SSH 비밀번호 |
| `GHCR_PAT` | GitHub **Personal access token** (권한: `read:packages`) — NAS에서 이미지 pull용 |

PAT 발급: GitHub **프로필 우측 상단 → Settings → Developer settings → Personal access tokens**.

---

## 로컬 Docker 실행

```bash
npm run build
docker-compose up -d --build
# http://localhost:3100
```

---

## 설치 패키지

```bash
npm install axios
npm install vue-router
npm install lodash
npm install vuex@next --save
npm install @studio-freight/lenis
```

---

## 풀스택 개발 시 실행 순서

1. **백엔드** — `my-vue-project_backend` 에서 `mvn spring-boot:run`
2. **프론트엔드** — 이 레포에서 `npm run serve`
3. 포트 확인: `netstat -ano | findstr :3100` (Windows)

---


## 설정

[Vue CLI Configuration Reference](https://cli.vuejs.org/config/)
