# Frontend Architecture

Vue 3 + Vuex 프론트엔드 구조 규칙집.  
신규 기능 추가 전 반드시 읽고, 아래 규칙을 따른다.

---

## 1. 폴더 구조

```
src/
├── api/                 # HTTP 호출 전용 함수. axios 직접 호출은 여기서만
│   ├── resourceApi.js       # 범용 CRUD 팩토리 함수
│   ├── adminContentApi.js   # 어드민 콘텐츠(career, experience, portfolio-skills) API
│   ├── kiwoomApi.js         # 키움 자동매매 전략·운영 API
│   ├── sajuApi.js           # 사주 계산·프로필 API
│   └── stockApi.js          # 주식 시세 API
├── assets/              # 정적 파일
│   └── css/             # 전역 스타일, 공통 유틸 CSS (admin-modal.css, thin-scrollbar 등)
├── components/          # 재사용 가능한 UI 단위. 특정 페이지에 종속되지 않는 것
│   ├── admin/           # 어드민 전용 컴포넌트
│   ├── common/          # 도메인 무관 공통 컴포넌트 (MarkdownView 등)
│   ├── dating/          # 연애 다이어리 도메인 컴포넌트
│   ├── diary/           # 일기 도메인 컴포넌트
│   ├── history/         # 히스토리 도메인 컴포넌트
│   ├── home/            # 홈(포트폴리오) 섹션 컴포넌트
│   ├── realestate/      # 부동산 도메인 컴포넌트
│   ├── saju/            # 사주 도메인 컴포넌트
│   ├── stock/           # 주식/포트폴리오 도메인 컴포넌트
│   ├── subscription/    # 구독 도메인 컴포넌트
│   └── travel/          # 여행 도메인 컴포넌트
├── composables/         # 재사용 가능한 상태+로직 훅. `use` 접두사 필수
├── pages/               # 라우터 단위 페이지. 1 URL = 1 파일
│   └── todos/           # 동적 라우트 그룹 (중첩 폴더)
├── store/               # Vuex 4 글로벌 상태
│   └── modules/         # 네임스페이스 모듈 분리
│       ├── auth.js      # 인증 상태, 권한 게터, 로그인/로그아웃 액션
│       ├── menu.js      # 메뉴 정의, 접근 가능 메뉴, 어드민 서브메뉴
│       └── toast/       # 전역 알림 상태
├── utils/               # 순수 함수 유틸리티. 상태/HTTP 없음
│   ├── apiError.js      # API 에러 메시지 추출 헬퍼
│   ├── audit.js         # 감사 이벤트 전송
│   └── logger.js        # 로그 유틸
├── axios.js             # axios 인스턴스 설정, 401 토큰 갱신 인터셉터
├── router.js            # Vue Router 경로 정의
└── main.js              # 앱 진입점
```

---

## 2. 레이어별 책임 경계

### pages/
**해야 하는 것**
- URL 단위 레이아웃 조립 (도메인 컴포넌트 배치)
- 페이지 수준의 데이터 fetch 트리거 (`onMounted`)
- 라우터 파라미터 수신 및 하위 컴포넌트에 props 전달
- `store` 상태 읽기 및 dispatch

**여기 들어가면 안 되는 코드**
- 복잡한 비즈니스 계산 로직 (composable로 분리)
- 여러 페이지에서 재사용될 UI 블록 (components로 분리)
- 직접 axios 호출 (api/ 함수 사용)

---

### components/
**해야 하는 것**
- 단일 UI 책임 (하나의 폼, 하나의 패널, 하나의 모달)
- props로 데이터 수신, emit으로 이벤트 전달
- 도메인 폴더 하위에 위치 (`stock/`, `realestate/` 등)
- 로딩/에러 상태 표시

**여기 들어가면 안 되는 코드**
- 직접 axios 호출 → `api/` 함수 경유 필수
- 글로벌 store 직접 commit (부모 페이지가 담당)
- 다른 도메인 컴포넌트 import (공통 컴포넌트 제외)

---

### api/
**해야 하는 것**
- `axios.js`의 인스턴스를 import해서 HTTP 호출
- 엔드포인트 URL 상수화 (문자열 리터럴 직접 사용 금지)
- 도메인별 파일로 분리 (`stockApi.js`, `realestateApi.js` 등)
- 요청/응답 필드명 명시적 문서화 (JSDoc 또는 인라인 주석)

**여기 들어가면 안 되는 코드**
- 비즈니스 로직, 상태 관리
- Vue 컴포넌트 의존 코드
- `router.push` 등 라우팅 사이드이펙트

---

### composables/
**해야 하는 것**
- `use` 접두사로 시작하는 함수 export
- 여러 컴포넌트에서 재사용되는 상태+로직 캡슐화
- `ref`, `computed`, `watch` 등 Composition API 활용

**여기 들어가면 안 되는 코드**
- axios 직접 호출 (api/ 함수 경유)
- 특정 컴포넌트에서만 쓰이는 로직 (해당 컴포넌트 내부에 두거나 분리 불필요)

---

### store/
**해야 하는 것**
- 여러 페이지/컴포넌트에서 공유되는 전역 상태
- 인증 상태 (`auth` 모듈), 메뉴 권한 (`menu` 모듈), 알림 (`toast` 모듈)
- 네임스페이스 모듈로 도메인 분리

**여기 들어가면 안 되는 코드**
- UI 관련 로직 (컴포넌트 내부에)
- 특정 페이지에서만 쓰이는 일시적 상태

---

### utils/
**해야 하는 것**
- 상태 없는 순수 함수
- 포맷팅, 날짜 변환, 에러 메시지 추출 등

**여기 들어가면 안 되는 코드**
- axios 호출, Vue 상태, router 접근
- 도메인 비즈니스 로직 (composable에)

---

### assets/css/
**해야 하는 것**
- `teleport` 대상 모달처럼 scoped CSS가 적용 안 되는 경우의 전역 스타일
- `amodal-*` 어드민 모달 공통 클래스
- `thin-scrollbar` 등 유틸 클래스

**여기 들어가면 안 되는 코드**
- 특정 컴포넌트에서만 쓰이는 스타일 (컴포넌트 `<style scoped>`에)

---

## 3. 네이밍 컨벤션

### 파일명

| 위치 | 규칙 | 예시 |
|------|------|------|
| `components/` | PascalCase `.vue` | `PortfolioPanel.vue`, `AddHoldingModal.vue` |
| `pages/` | kebab-case `.vue` | `admin-menu-management.vue`, `change-password.vue` |
| `composables/` | camelCase `use*.js` | `usePortfolioStats.js`, `useStockFormatters.js` |
| `api/` | camelCase `*Api.js` | `stockApi.js`, `realestateApi.js` |
| `store/modules/` | 소문자 도메인명 `.js` | `auth.js`, `menu.js` |
| `utils/` | camelCase `.js` | `apiError.js`, `logger.js` |

### 컴포넌트 내부

| 구분 | 규칙 | 예시 |
|------|------|------|
| `props` 이름 | camelCase | `holdingList`, `isLoading` |
| `emit` 이벤트 | kebab-case | `modal-closed`, `holding-added` |
| `ref` / `reactive` 변수 | camelCase | `loading`, `errorMessage`, `holdings` |
| 로딩 상태 | `loading` 또는 `isLoading` | — |
| 에러 상태 | `error` 또는 `errorMessage` | — |
| 모달 표시 | `show*Modal` | `showAddModal`, `showDeleteModal` |
| 선택된 항목 | `selected*` | `selectedHolding`, `selectedDate` |

### 함수명

| 용도 | 패턴 | 예시 |
|------|------|------|
| 데이터 조회 | `fetch*`, `load*` | `fetchHoldings`, `loadCategories` |
| 저장/제출 | `submit*`, `save*` | `submitForm`, `saveHolding` |
| 삭제 | `delete*`, `remove*` | `deleteHolding` |
| 모달 열기/닫기 | `open*Modal`, `close*Modal` | `openAddModal`, `closeEditModal` |
| 이벤트 핸들러 | `on*`, `handle*` | `onSubmit`, `handleDelete` |
| 포맷팅 | `format*` | `formatPrice`, `formatDate` |

### 템플릿

- `v-if` / `v-for` 디렉티브는 한 요소에 함께 쓰지 않음
- `v-for`에는 반드시 `:key` 지정
- 이벤트 핸들러는 인라인 화살표 함수보다 메서드 참조 우선

---

## 4. 신규 기능 추가 시 파일 생성 체크리스트

```
신규 도메인 "XXX" 추가 시 생성 순서:

[ ] 1. src/api/xxxApi.js
       — axios 인스턴스 import, 엔드포인트 함수 정의
       — 필드명을 JSDoc 주석으로 명시

[ ] 2. src/components/xxx/
       — XxxPanel.vue          (목록/현황 표시)
       — AddXxxModal.vue       (추가 폼 모달)
       — EditXxxModal.vue      (수정 폼 모달, 필요 시)
       — XxxAnalysisModal.vue  (AI 분석 모달, 필요 시)

[ ] 3. src/pages/xxx.vue
       — 컴포넌트 조립, 페이지 수준 데이터 로딩

[ ] 4. src/router.js
       — 신규 경로 추가

[ ] 5. src/composables/useXxxStats.js (계산 로직이 복잡한 경우)

[ ] 6. 백엔드 어드민에서 메뉴 DB 등록 (메뉴 관리 화면)
```

**파일 만들기 전 확인 사항**

- axios 호출이 `src/api/xxxApi.js`를 경유하는가? (컴포넌트 내 직접 호출 금지)
- 모달 CSS가 `teleport` 대상이면 `assets/css/admin-modal.css`의 `amodal-*` 클래스를 재사용하는가?
- AI 분석 결과는 `MarkdownView.vue`로 렌더링하는가?
- 에러 메시지는 `apiErrorMessage(err, 'fallback')` 유틸을 통하는가?
- 로딩 상태 try/finally 패턴이 일관하게 적용되었는가?

---

## 5. 백엔드 DTO 동기화 규칙

백엔드 DTO(또는 Entity 반환 구조)가 바뀌면 아래를 반드시 확인한다.  
JavaScript는 타입 오류 없이 조용히 `undefined`를 반환하므로, 필드명 불일치가 런타임까지 드러나지 않는다.

```
백엔드 변경 → 프론트 확인 체크리스트:

[ ] 필드 추가     — 기존 동작 유지. 필요 시 프론트 표시 코드 추가
[ ] 필드 삭제     — grep으로 프론트 접근 코드 찾아서 제거 또는 대체
[ ] 필드명 변경   — 프론트 전체 검색 필수. 조용히 undefined 됨
[ ] boolean 필드  — 백엔드 isXxx 필드는 Jackson이 xxx로 직렬화할 수 있음
                    예: isRequired → required, isAdminSubMenu → adminSubMenu
                    프론트 접근 코드 확인 후 일치시킬 것
[ ] 중첩 구조 변경 — PortfolioAnalysisResponse 등 중첩 DTO는 파싱 코드 함께 수정
[ ] 새 엔드포인트  — src/api/ 에 함수 추가 후 컴포넌트에서 import
[ ] 엔드포인트 삭제/변경 — grep으로 URL 문자열 전수 조사
```

**확인 명령어 (프로젝트 루트에서)**

```bash
# 특정 필드명 프론트 전체 검색
grep -r "fieldName" src/ --include="*.vue" --include="*.js" -n

# 특정 API 경로 사용처 검색
grep -r "/api/xxx" src/ --include="*.vue" --include="*.js" -n
```

---

## 현재 예외사항 (즉시 수정 대상 아님, 추후 개선)

아래 항목은 현재 코드에서 위 규칙을 따르지 않고 있다.  
새 코드에서는 예외사항 패턴을 따르지 않는다.

### API 서비스 레이어 미사용 (다수 파일 직접 axios 호출)

현재 `src/api/`는 어드민 CRUD · 주식 시세 · 사주 · 키움 전략 도메인만 커버한다.  
나머지 파일이 컴포넌트/페이지 내에서 axios를 직접 호출 중이다.  
**신규 파일은 이 예외를 따르지 않는다** — 새 엔드포인트는 반드시 `src/api/xxxApi.js`를 먼저 만들고 경유한다.

주요 위반 파일:

| 파일 | 직접 호출 엔드포인트 수 |
|------|---------------------|
| `src/components/stock/PortfolioPanel.vue` | 7개 |
| `src/components/realestate/AddPropertyModal.vue` | 5개 |
| `src/components/realestate/PropertyPanel.vue` | 4개 |
| `src/pages/admin-menu-management.vue` | 4개 |
| `src/components/travel/ItineraryModal.vue` | 3개 |
| `src/components/TodoForm.vue` | 3개 |

### 컴포넌트 내 비즈니스 로직 과부하

아래 파일은 계산/워크플로 로직이 컴포넌트 내에 포함되어 있다.

| 파일 | 라인 수 | 과부하 내용 |
|------|--------|----------|
| `src/components/stock/PortfolioPanel.vue` | 820+ | PnL 계산, 환율, 무한매수법 상태 |
| `src/components/realestate/AddPropertyModal.vue` | 600+ | 주소 검색, 토지/아파트 전환, 공시지가 |
| `src/pages/admin-menu-management.vue` | 620+ | 권한 매트릭스 diff, 정렬 |

### 로딩 패턴 중복 (60+ 반복)

아래 패턴이 60개 이상의 파일에 중복되어 있다.  
향후 `useAsyncOperation()` 컴포저블로 추출 예정.

```javascript
loading.value = true;
try {
  // API 호출
} catch (err) {
  showToast(apiErrorMessage(err, '...'), 'error');
} finally {
  loading.value = false;
}
```

### apiErrorMessage 유틸 미사용

`utils/apiError.js`의 `apiErrorMessage()` 헬퍼가 존재하지만  
전체 파일의 약 60%가 직접 `.response?.data?.message || 'fallback'` 패턴을 사용 중.

### 도메인 데이터 Vuex 미관리

`stock`, `realestate`, `travel`, `todo`, `subscription` 등 도메인 데이터가  
Vuex store 없이 컴포넌트 로컬 state로만 관리된다.  
동일 데이터를 여러 컴포넌트가 독립적으로 fetch하는 중복 호출이 발생함.
