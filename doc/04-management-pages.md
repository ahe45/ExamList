# 관리 페이지 명세

이 문서는 로그인, 공통 상단바/사이드바, 학교 선택, 계정 관리, 양식 관리 페이지를 설명한다.

## 1. 로그인 페이지

### 파일

- `login.html`
- `client/login.js`
- `styles/features/auth.css`

### URL

- `/login`

### 레이아웃

- `body.login-page`
- `main.login-page-shell`
- `section.login-card`
- 브랜드 영역 `auth-login-brand`
  - 로고 `img.brand-badge`
  - `Exam List System`
  - `수험생확인대장`
- 로그인 카드 `login-page-card`
  - kicker: `접근 권한`
  - 제목: `운영자 로그인`
  - 안내문: `수험생확인대장 관리 기능을 사용하려면 로그인하세요.`
  - 아이디 input
    - `name="username"`
    - placeholder: `이름`
  - 비밀번호 input
    - `name="password"`
    - placeholder: `1234`
  - submit button: `로그인`

### 동작

- `/api/auth/session`으로 이미 인증된 사용자인지 확인한다.
- 로그인 성공 시 `/schools`로 이동한다.
- 로그인 실패 시 toast error를 표시한다.

## 2. 공통 상단바

### 파일

- HTML: `index.html`
- 렌더러: `client/features/auth/renderers.js`
- 동작: `client/features/auth/actions.js`

### 요소

- 브랜드 버튼
  - `data-go-view="schoolManagement"`.
  - 클릭 시 학교 목록 이동.
- 현재 학교 카드
  - 학교 작업공간에서 표시.
  - 학교명과 code 또는 식별 정보를 표시.
- 사용자 표시
  - 사용자 이름.
  - 권한 label.
- 학교 목록 버튼
  - 학교 목록 화면 외에서 표시.
- 로그아웃 버튼
  - `/api/auth/logout` 호출 후 로그인 화면 이동.

## 3. 작업공간 사이드바

### 메뉴

| 메뉴 | View | Permission | 조건 |
| --- | --- | --- | --- |
| 양식 관리 | `templateManagement` | `viewTemplates` | 학교 필요 |
| 수험생 데이터 | `candidateLookup` | `viewCandidates` | 학교 필요 |
| PDF 생성 | `pdfGenerationHistory` | `viewGenerations` | 학교 필요 |
| PDF 작업 로그 | `pdfHistoryManagement` | `viewGenerations` | 학교 필요 |
| 데이터 삭제 | `dataDeletion` | `deleteProjectData` | 학교 필요 |

## 4. 학교 선택 페이지

### 파일

- `client/features/schools/renderers.js`
- `client/features/schools/actions.js`
- `styles/features/schools.css`
- `styles/features/school-settings.css`
- `server/http/routes/schools.js`
- `server/modules/schools/service.js`
- `server/http/routes/school-settings.js`
- `server/modules/school-settings/service.js`

### URL

- `/schools`

### 화면 구성

Header:

- 제목: `학교 선택`.
- 계정 관리 버튼
  - `manageAccounts` 권한 필요.
  - `/accounts` 이동.
- 새 학교 버튼
  - `manageTemplates` 권한 필요.

검색 영역:

- 키워드 input.
- 검색 버튼.
- 검색 대상: 학교명, 코드, 캠퍼스명, 캠퍼스 코드.
- API: `GET /api/schools?keyword=&limit=&page=`.

학교 목록 row:

- 학교명.
- 캠퍼스명. 값이 없으면 `캠퍼스 미설정`으로 표시.
- 양식 개수 badge.
- 수험생 건수 badge.
- 최종 수정 일시 badge.
- 생성 계정 badge.
- row 클릭 시 `/schools/:schoolCode/templates`로 이동. route param은 학교 코드가 우선이며, 서버 상세 조회는 id 또는 code를 허용한다.
- 수정 버튼: `manageTemplates` 필요.
- 삭제 버튼: `manageTemplates` 필요.
- `한국대학교`는 기본 보호 학교로 삭제 버튼 비활성 처리.

Empty state:

- 등록된 학교가 없다는 안내 표시.

### 학교 생성/수정 모달

필드:

- 학교명
  - UI는 `대학교` suffix를 붙이는 방식.
  - 저장 시 suffix 포함 이름으로 정규화.
- 학교 코드
  - uppercase.
  - 서버 검증: `[A-Z0-9_-]{2,80}`.
  - 캠퍼스 코드가 있으면 `<학교코드>-<캠퍼스코드>`로 저장한다.
  - 조합된 코드가 unique.
- 학년도
  - 현재 연도 기준 앞뒤 5년 범위 select.
  - UI는 `학년도` suffix를 표시하고 서버는 4자리 연도 문자열로 저장한다.
- 삭제 비밀번호
  - 학교 생성 시 입력.
  - `deleteSchoolsWithoutPassword` 권한이 없으면 필수.
- 삭제 비밀번호 확인
  - 생성 시 비밀번호와 일치해야 함.

양식 공통 설정:

- 학교 표시명.
- 학년도.
- 캠퍼스명.
- 캠퍼스 코드.
- 로고 이미지.
  - PNG/JPEG/WebP.
  - 클라이언트 1MB 이하 제한.
  - 서버 data URL 형식과 길이 검증.
- 로고 삭제 버튼.

API:

- 학교 생성: `POST /api/schools`.
- 학교 수정: `PATCH /api/schools/:schoolId`.
- 공통 설정 조회: `GET /api/school-settings?schoolId=...`.
- 공통 설정 저장: `PATCH /api/school-settings`.

### 학교 삭제

- API: `DELETE /api/schools/:schoolId`.
- body: `{ deletionPassword }`.
- `deleteSchoolsWithoutPassword` 권한이 있으면 비밀번호 우회 가능.
- 삭제 시 연결 데이터가 함께 정리된다.
  - 템플릿.
  - 페이지.
  - 요소.
  - 버전.
  - 수험생.
  - 사진 참조.
  - PDF 이력.
  - PDF 배치.
  - 감사 로그.
  - 학교 설정.

## 5. 계정 관리 페이지

### 파일

- `client/features/accounts/renderers.js`
- `client/features/accounts/actions.js`
- `server/http/routes/accounts.js`
- `server/modules/auth/service.js`

### URL

- `/accounts`

### 접근 조건

- `manageAccounts`.
- 권한이 없으면 `슈퍼 관리자만 접근할 수 있습니다.` 안내 패널 표시.

### 화면 구성

Header:

- 계정 관리 제목.
- 총 계정 수 badge.
- 계정 추가 버튼.
- 엑셀 업로드 버튼.
- 새로고침 버튼.
- 학교 목록 버튼.

테이블 컬럼:

- 아이디.
- 이름.
- 권한.
- 마지막 로그인.
- 관리.
- 삭제.

행 액션:

- 설정.
- 삭제.

### 계정 엑셀 업로드 모달

필드:

- XLSX 파일 선택.
- 업로드 양식 다운로드 버튼.

업로드 양식 컬럼:

- 아이디.
- 이름.
- 비밀번호.
- 권한.

동작:

- `GET /api/accounts/template.xlsx`로 업로드 양식을 다운로드한다.
- `POST /api/accounts/import`로 XLSX 파일의 base64 payload를 전송한다.
- 같은 아이디의 기존 계정은 이름, 권한, 비밀번호를 수정한다.
- 기존 계정의 비밀번호 칸이 비어 있으면 기존 비밀번호를 유지한다.
- 신규 계정은 비밀번호가 필요하다.
- 업로드 결과는 추가/수정/실패 건수와 최대 5개 오류를 모달에 표시한다.

### 계정 추가/수정 모달

필드:

- 아이디
  - 생성 시 입력 가능.
  - 수정 시 비활성.
- 이름.
- 권한 select
  - `super_admin`: 슈퍼 관리자.
  - `admin`: 관리자.
  - `user`: 사용자.
- 비밀번호
  - 생성 시 필수.
  - 수정 시 입력한 경우에만 변경.

API:

- `GET /api/accounts`
- `GET /api/accounts/template.xlsx`
- `POST /api/accounts`
- `POST /api/accounts/import`
- `PATCH /api/accounts/:accountId`
- `DELETE /api/accounts/:accountId`

제약:

- 현재 로그인 계정 삭제 불가.
- 마지막 활성 super admin 삭제/강등 불가.

## 6. 양식 관리 페이지

### 파일

- `client/features/templates/renderers.js`
- `client/features/templates/template-create-modal-*`
- `client/features/templates/actions.js`
- `server/http/routes/pdf-templates.js`
- `server/modules/pdf-templates/service.js`
- `server/modules/pdf-preview/list-thumbnail.js`

### URL

- `/templates`
- `/schools/:schoolId/templates`

### 화면 구성

Header:

- 제목: `양식 관리`.
- 설명: 수험생확인대장 양식을 만들고 수정, 복사, 삭제.
- 총 n건 badge.
- 새 양식 버튼
  - `manageTemplates` 권한 필요.

템플릿 카드:

- 썸네일 preview.
- 템플릿명.
- 설명.
- 마지막 수정 일시.
- 수정 버튼.
- 복사 버튼
  - `manageTemplates` 권한 필요.
- 삭제 버튼
  - `deleteTemplates` 권한 필요.

Inline 편집:

- `manageTemplates` 권한이 있으면 카드에서 이름과 설명을 직접 수정 가능.
- 편집 icon 클릭.
- input 또는 textarea로 값 변경.
- 저장 check 버튼.
- 취소 x 버튼.
- 저장 API: `PATCH /api/pdf-templates/:templateId`.

Empty state:

- 등록된 양식이 없다는 안내 카드.

### 새 양식 모달

모드:

- 빈 템플릿
  - UI 설명: `빈 A4 양식`.
  - 클라이언트 요청값: `creationMode: "blank"`, `paperPreset: "A4"`, `orientation: "portrait"`, `generationUnit: "roomCode"`.
  - 서버 실제 생성 방식: 기본 학교 `한국대학교`의 `기본 템플릿`을 원본으로 복제한 뒤 캔버스 내용만 비운다.
  - 새 ID를 부여하고 원본의 용지, 방향, 생성 단위, 페이지 구성, page setting, 데이터 태그 설정은 보존한다.
  - 비우는 항목:
    - `page.elements` 제거.
    - `page.settings.documentHtml` 제거.
    - `page.settings.candidateBlockGrid.enabled`를 false로 변경.
    - `page.settings.candidateBlockGrid.blockTemplateHtml`을 `<p><br></p>`로 초기화.
  - 따라서 실제 저장 결과는 원본 `기본 템플릿`의 설정에 따라 A4/세로 또는 표지+본문 구성이 아닐 수 있다.
- 기본 템플릿
  - 기본 학교 `한국대학교`, `school-default`의 `기본 템플릿`을 내용까지 복제한다.
- 다른 학교 양식 복사
  - 현재 학교 외 학교 목록 로드.
  - 선택 학교의 템플릿 목록 로드.
  - 원본 템플릿 radio 선택 후 복사.

생성 요청 기본값:

- name: `새 양식`.
- generationUnit: `roomCode`.
- paperPreset: `A4`.
- orientation: `portrait`.
- schoolId: 현재 학교.

서버 최종 저장값:

- name과 description은 요청값을 사용한다.
- `paperPreset`, `orientation`, `generationUnit`은 원본 `기본 템플릿`에 값이 있으면 원본 값을 우선한다.
- 원본 `기본 템플릿`이 없으면 `DEFAULT_TEMPLATE_NOT_FOUND` 오류가 발생한다.

API:

- 생성: `POST /api/pdf-templates`.
- 복사: `POST /api/pdf-templates/:templateId/duplicate`.

### 템플릿 데이터 모델

대표 필드:

- `id`.
- `schoolId`.
- `name`.
- `description`.
- `paperPreset`: `A4`, `A3`, `B4`, `B5`, `Letter`, `Legal`, `Custom`.
- `orientation`: `portrait`, `landscape`.
- `generationUnit`: `all`, `admission`, `admissionCode`, `exam`, `examDate`, `seriesCode`, `periodCode`, `room`, `roomCode`, `group`, `unit`, `unitCode`, `buildingCode`, `custom`.
- `layout.pages[]`.
- `latestVersionNo`.

페이지 모델:

- 표지 페이지
  - type: `cover`.
  - repeatable: false.
  - enabled: true.
- 본문 페이지
  - type: `content`.
  - repeatable: true.
  - enabled: true.

비고:

- `buildBlankTemplateSnapshot()`은 cover/content 기본 페이지를 만들 수 있지만, 새 양식 모달의 생성 API는 현재 기본 템플릿 원본을 복제한다.
- 새 양식 생성 시 페이지 수와 페이지 type 구성은 원본 `기본 템플릿`의 layout에 의해 결정된다.
