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

## 참고

- [Vue CLI Configuration Reference](https://cli.vuejs.org/config/)
