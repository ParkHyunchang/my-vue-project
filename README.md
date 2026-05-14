# my-vue-project (Vue Frontend)

Vue 3 기반 프론트엔드 프로젝트입니다.

---

## 기술 스택

- **Framework**: Vue 3
- **Router**: Vue Router 4
- **State**: Vuex 4
- **HTTP**: Axios
- **Build**: Vue CLI 5

---

## 로컬 개발

### 의존성 설치

```bash
npm install
```

### 개발 서버 실행 (Hot-reload)

```bash
npm run serve
# http://localhost:8080
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

## 풀스택 개발 시 실행 순서

1. **백엔드** — `my-vue-project_backend` 에서 `mvn spring-boot:run`
2. **프론트엔드** — 이 레포에서 `npm run serve`

---

## CI/CD 배포

`main` 브랜치에 **push**하면 GitHub Actions가 자동으로 다음을 수행합니다.

1. **빌드** — `npm ci` → `npm run build`
2. **Docker 이미지** — nginx 기반 이미지 빌드 후 **GitHub Container Registry(ghcr.io)** 에 push
3. **NAS 배포** — SSH로 NAS 접속 후 `docker pull` → 컨테이너 재시작

### GitHub Secrets (레포 Settings → Secrets and variables → Actions)

| Secret | 설명 |
|--------|------|
| `NAS_HOST` | NAS IP |
| `NAS_USER` | NAS SSH 사용자명 |
| `NAS_SSH_PASSWORD` | NAS SSH 비밀번호 |
| `GHCR_PAT` | GitHub PAT (`read:packages`) — NAS에서 이미지 pull용 |

### 배포 정보

| 항목 | 값 |
|------|-----|
| 컨테이너명 | `vue_personal_project` |
| NAS 포트 | `3100` |
| 접속 URL | `http://hyunchang.synology.me:3100` |

---

## nginx 구성 메모

컨테이너 내부 nginx([nginx.conf](nginx.conf))는 SPA 정적 호스팅 + 백엔드 리버스 프록시를 담당합니다.

- **HTTPS 오프로드(TLS 처리)** 는 Synology 역방향 프록시에서 수행되므로 컨테이너는 `listen 80` 평문으로 동작합니다. `X-Forwarded-Proto=https` 가 들어오는 환경이라 HSTS는 활성화되어 있습니다.
- **백엔드 업스트림**은 NAS 호스트의 도커 브리지 게이트웨이(`172.17.0.1:3200`)로 잡혀 있습니다. 공인 IP/hairpin NAT에 의존하지 않으므로 외부 3200 포트가 닫혀도 `/api/*` 프록시가 정상 동작합니다.
- **캐시 정책**
  - 해시 붙은 정적 자산(`*.js`, `*.css`, `*.woff2` 등) → `Cache-Control: public, immutable`, 1년
  - `index.html` / SPA 라우팅 → `expires -1` (캐시 금지) — 새 배포가 즉시 반영되도록
- **CSP**: `connect-src`는 same-origin만 허용. 외부 폰트 CDN(`fonts.googleapis.com`, `fonts.gstatic.com`, `websfont.github.io`, `stackpath.bootstrapcdn.com`)은 `style-src` / `font-src` 에 명시되어 있습니다.

---

## 참고

- [Vue CLI Configuration Reference](https://cli.vuejs.org/config/)
