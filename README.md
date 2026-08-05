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

## API 타입 동기화 (OpenAPI → JSDoc)

백엔드 DTO 구조가 바뀌면 아래 절차로 프론트 타입 힌트를 갱신한다.  
JS 프로젝트이므로 빌드 오류는 없고 VSCode 자동완성에만 반영됨.

### 최초 1회: 패키지 설치

```bash
npm install
```

### DTO 변경 후 타입 재생성

```bash
# 1. 백엔드 실행 확인 (http://localhost:3200 기준)
#    my-vue-project_backend 에서: mvn spring-boot:run

# 2. 스펙 생성 확인 (브라우저 또는 curl)
curl http://localhost:3200/v3/api-docs | head -5

# 3. 프론트 타입 파일 재생성
npm run gen:api
# → src/generated/api.d.ts 생성됨 (git 제외 파일)

# 4. VSCode에서 @typedef 선언 파일의 자동완성 확인
```

### 타입 참조 방법 (JS 파일에서)

```js
// 1단계: api 파일 상단에 @typedef 선언
/** @typedef {import('@/generated/api').components['schemas']['Career']} Career */

// 2단계: 호출 측에서 @type 으로 응답에 붙임
const res = await adminCareerApi.list()
/** @type {Career[]} */ const careers = res.data
```

`src/api/adminContentApi.js`에 Career / Experience / PortfolioSkill 샘플이 있으며,  
새 도메인 추가 시 같은 패턴으로 `@typedef`를 해당 api 파일 상단에 선언한다.

### 한계

| 항목 | 내용 |
|------|------|
| 빌드 타임 검사 없음 | JS 프로젝트이므로 타입 오류는 에디터 힌트만 제공 |
| 수동 동기화 | `npm run gen:api`를 직접 실행해야 함 |
| Entity 직접 반환 컨트롤러 | OpenAPI 스펙이 JPA 연관관계까지 포함할 수 있어 실제 응답과 다를 수 있음 |

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
- **백엔드 업스트림**은 프론트·백엔드 전용 Docker 네트워크(`my-vue-project-internal`)의 백엔드 컨테이너 이름으로 잡혀 있습니다. 백엔드의 3200 포트는 NAS 호스트나 외부에 공개하지 않으며, `/api/*` 요청은 내부망에서만 전달됩니다.
- **캐시 정책**
  - 해시 붙은 정적 자산(`*.js`, `*.css`, `*.woff2` 등) → `Cache-Control: public, immutable`, 1년
  - `index.html` / SPA 라우팅 → `expires -1` (캐시 금지) — 새 배포가 즉시 반영되도록
- **CSP**: `connect-src`는 same-origin만 허용. 외부 폰트 CDN(`fonts.googleapis.com`, `fonts.gstatic.com`, `websfont.github.io`, `stackpath.bootstrapcdn.com`)은 `style-src` / `font-src` 에 명시되어 있습니다.

---

## 참고

- [Vue CLI Configuration Reference](https://cli.vuejs.org/config/)
