# 상태와 UI 계약 상세 명세

이 문서는 실제 구현의 `appState` 구조와 화면별 DOM hook을 기준으로 작성한 이식용 명세다. 화면을 다른 프로젝트로 가져갈 때는 HTML 조각만 옮기면 동작하지 않으며, 이 문서의 상태 slice, 이벤트 위임 selector, API 호출, 권한 조건을 함께 옮겨야 한다.

검증 기준 파일:

- `client/app/app-state.js`
- `client/app/app-renderer.js`
- `client/app/bootstrap-loader.js`
- `client/app/navigation.js`
- `client/app/modal-close-guard.js`
- `client/features/*/renderers.js`
- `client/features/*/actions.js`
- `client/features/*/event-bindings.js`
- `shared/app-config.js`

## 1. 전역 상태 루트

`appState`는 클라이언트의 단일 상태 객체다. 렌더러는 이 객체를 읽어 HTML 문자열을 만들고, 액션은 이 객체를 갱신한 뒤 `onStateChange()`를 호출한다.

| 루트 key | 구현 의미 |
|---|---|
| `currentView` | 현재 SPA view id. 기본값은 `schoolManagement`다. |
| `route` | 현재 path, title, view, route params. `shared/app-config.js`의 route match 결과다. |
| `auth` | 로그인/세션 상태. |
| `summary` | 접근 권한, 학교별 count, 최근 템플릿, warning 등 전역 summary. |
| `accounts` | 계정 관리 화면 상태. |
| `schools` | 학교 선택/생성/수정/삭제 상태. |
| `templates` | 양식 목록, 카드 메타 편집, 새 양식 modal 상태. |
| `candidates` | 수험생 목록/table/filter/upload/detail/download 상태. |
| `schoolSettings` | 학교 로고, 표시 학교명, 학년도 설정 상태. |
| `dataDeletion` | 데이터 삭제 카드, modal, 최종 확인, 삭제 진행 상태. |
| `pdfGenerations` | PDF 생성 목록, 생성 modal, 배치 진행, 다운로드/삭제/결과/audit 상태. |
| `pdfGenerationDetail` | PDF 생성 상세 페이지 상태. |
| `templateEditor` | 양식 편집기 로딩, 템플릿 layout, data tag, preview, dirty, runtime session 상태. |
| `ui` | active school/template, busy message, modal close prompt 등 화면 공통 상태. |

## 2. 라우트와 View 계약

라우트 정의는 `shared/app-config.js`가 단일 기준이다.

| View | URL | params | 제목 |
|---|---|---|---|
| `schoolManagement` | `/schools` | 없음 | 학교 선택 |
| `accountManagement` | `/accounts` | 없음 | 계정 관리 |
| `templateManagement` | `/templates` | 없음 | 양식 관리 |
| `templateManagement` | `/schools/:schoolId/templates` | `schoolId` | 양식 관리 |
| `templateEditor` | `/templates/:templateId/edit` | `templateId` | 양식 편집 |
| `templateEditor` | `/schools/:schoolId/templates/:templateId/edit` | `schoolId`, `templateId` | 양식 편집 |
| `candidateLookup` | `/templates/:templateId/candidates` | `templateId` | 수험생 데이터 |
| `candidateLookup` | `/schools/:schoolId/candidates` | `schoolId` | 수험생 데이터 |
| `pdfGenerationHistory` | `/templates/:templateId/pdf-generations` | `templateId` | PDF 생성 |
| `pdfGenerationHistory` | `/schools/:schoolId/pdf-generations` | `schoolId` | PDF 생성 |
| `pdfGenerationDetail` | `/templates/:templateId/pdf-generations/:generationId` | `templateId`, `generationId` | PDF 생성 상세 |
| `pdfGenerationDetail` | `/schools/:schoolId/pdf-generations/:generationId` | `schoolId`, `generationId` | PDF 생성 상세 |
| `pdfHistoryManagement` | `/schools/:schoolId/pdf-history` | `schoolId` | PDF 작업 로그 |
| `dataDeletion` | `/schools/:schoolId/data-deletion` | `schoolId` | 데이터 삭제 |

`/`와 `/dashboard`는 기본 view인 `/schools`로 해석된다. `getViewRoutePath(view, params)`는 params가 부족하면 가장 가까운 안전한 fallback path를 반환한다.

## 3. 인증과 Summary 상태

### `auth`

| key | 값/역할 |
|---|---|
| `authenticated` | 현재 세션 인증 여부. |
| `enabled` | 인증 사용 여부. 서버 설정에 따라 false일 수 있다. |
| `loading` | 세션 조회 또는 로그인 처리 중 표시. |
| `errorMessage` | 로그인/세션 오류 메시지. |
| `role` | 현재 역할. 기본값은 `super_admin`. |
| `user` | 로그인 사용자 payload. |

### `summary.access`

`summary.access.permissions`는 클라이언트 권한 표시의 기준이다. 서버 권한 검사는 별도로 API route에서 다시 수행한다.

권한 key:

- `deleteProjectData`
- `deleteSchoolsWithoutPassword`
- `deleteTemplates`
- `downloadPdfs`
- `generatePdfs`
- `manageAccounts`
- `manageCandidates`
- `manageTemplates`
- `previewTemplates`
- `viewCandidates`
- `viewDashboard`
- `viewGenerations`
- `viewTemplates`

### 렌더링에서 사용하는 권한

| 권한 | UI 영향 |
|---|---|
| `manageAccounts` | 학교 선택 화면의 `계정관리` 버튼, 계정 관리 view 접근. |
| `manageTemplates` | 학교 생성/수정, 양식 생성/수정, 편집기 contenteditable, 저장 버튼. |
| `deleteSchoolsWithoutPassword` | 학교 생성/삭제 시 삭제 비밀번호 요구 여부. |
| `deleteTemplates` | 양식 카드 삭제 버튼. |
| `manageCandidates` | 수험생 업로드/수정/사진 업로드 버튼. |
| `viewCandidates` | 수험생 목록과 export 접근. |
| `generatePdfs` | PDF 생성 modal, 생성 대상 조회, 배치 취소. |
| `downloadPdfs` | PDF/ZIP/병합 다운로드 버튼. |
| `previewTemplates` | 양식 편집 미리보기, PDF 생성 첫 대상 미리보기. |
| `deleteProjectData` | 데이터 삭제 화면과 삭제 실행. |

## 4. 학교 선택 화면

### 상태

`schools` slice:

| key | 역할 |
|---|---|
| `items` | 학교 목록. row 렌더링 원본. |
| `total` | 목록 총 개수. |
| `limit` | 목록 API limit. 기본 30. |
| `loading` | 목록 로딩 상태. |
| `errorMessage` | 목록/삭제/저장 오류. |
| `filters.keyword` | 학교명, 코드, 캠퍼스명, 캠퍼스 코드 검색어. |
| `detail` | 선택 학교 상세. |
| `modal` | 생성/수정 modal draft. |

`schools.modal`:

| key | 역할 |
|---|---|
| `isOpen` | modal 표시. |
| `mode` | `create` 또는 `edit`. |
| `schoolId` | 수정 대상 id. |
| `name` | 학교명 draft. 입력 UI는 `대학교` suffix를 붙여 표시하고 저장 전 정규화한다. |
| `code` | 학교 코드. |
| `academicYear` | 학년도. 현재 연도 기준 앞뒤 5년 범위 select UI. |
| `campusName` | 학교 설정의 캠퍼스명 draft. |
| `campusCode` | 학교 설정의 캠퍼스 코드 draft. |
| `description` | legacy draft field. 현재 학교 modal renderer와 서버 학교 API payload에서는 사용하지 않는다. |
| `deletionPassword`, `deletionPasswordConfirm` | 생성 시 삭제 비밀번호와 확인값. `deleteSchoolsWithoutPassword`가 없으면 required. |
| `logoDataUrl` | 학교 로고 data URL preview와 저장값. |
| `settingsLoading` | 학교 설정 로딩 중 로고/년도 입력 비활성화. |
| `isSaving` | 생성/수정 저장 중. |
| `errorMessage` | modal 내부 오류. |

### 주요 DOM hook

| Hook | 위치/역할 |
|---|---|
| `[data-school-filter-form]` | 학교 검색 submit. |
| `[data-action="open-school-modal"]` | 새 학교 modal open. |
| `[data-action="open-school-edit-modal"][data-school-id]` | 학교 수정 modal open. |
| `[data-action="delete-school"][data-school-id]` | 학교 삭제. 기본 학교 `한국대학교`는 disabled. |
| `[data-action="open-school-workspace"][data-school-id][data-school-code]` | 학교 workspace 진입. |
| `[data-school-form]` | 학교 생성/수정 submit. |
| `[data-school-modal-field]` | modal input 상태 갱신. |
| `[data-school-modal-logo-file]` | 로고 파일 선택. accept는 PNG/JPEG/WebP. |
| `[data-action="clear-school-modal-logo"]` | 로고 삭제. |
| `[data-action="close-school-modal"]` | modal close. |

### 화면 요소

- 상단 제목: `학교 선택`.
- 우측 action:
  - `계정관리`: `manageAccounts`가 있을 때만 표시.
  - `새 학교`: `manageTemplates`가 있을 때만 표시.
- 검색 form:
  - label `학교 검색`
  - placeholder `학교명, 코드, 캠퍼스명`
- 학교 row:
  - 학교명.
  - 캠퍼스명 또는 `캠퍼스 미설정`.
  - `양식 N개`.
  - `수험생 N건`.
  - `최종수정일시 : YYYY년 MM월 DD일 HH시 mm분`.
  - 생성 계정 badge.
  - 설정 icon.
  - 삭제 icon.
- 빈 상태:
  - `등록된 학교가 없습니다.`
  - `학교를 먼저 등록한 뒤 양식과 수험생 데이터를 관리하세요.`

## 5. 계정 관리 화면

### 상태

`accounts` slice:

| key | 역할 |
|---|---|
| `items` | 계정 목록. |
| `total` | 계정 수. |
| `loading` | 계정 목록 로딩. |
| `errorMessage` | 목록/저장/삭제 오류. |
| `modal` | 생성/수정 modal 상태. |
| `uploadModal` | 계정 XLSX 업로드 modal 상태. |

`accounts.modal`:

| key | 역할 |
|---|---|
| `isOpen` | modal 표시. |
| `mode` | `create` 또는 `edit`. |
| `accountId` | 수정 대상 id. |
| `userId` | 로그인 ID. 수정 모드에서는 disabled. |
| `userName` | 표시명. |
| `role` | `super_admin`, `admin`, `user`. |
| `password` | 생성 시 required, 수정 시 입력할 때만 변경. |
| `isSaving` | 저장 중. |
| `errorMessage` | modal 내부 오류. |

`accounts.uploadModal`:

| key | 역할 |
|---|---|
| `isOpen` | 계정 엑셀 업로드 modal 표시. |
| `file` | 선택된 XLSX 파일 객체. |
| `fileName` | 선택된 파일명. |
| `isUploading` | 업로드 API 처리 중. |
| `result` | 추가/수정/실패 건수와 오류 목록. |
| `errorMessage` | 업로드 오류. |

### 주요 DOM hook

| Hook | 역할 |
|---|---|
| `[data-action="open-account-create-modal"]` | 계정 추가 modal open. |
| `[data-action="open-account-upload-modal"]` | 계정 엑셀 업로드 modal open. |
| `[data-action="close-account-upload-modal"]` | 계정 엑셀 업로드 modal close. |
| `[data-action="download-account-template"]` | 계정 업로드 양식 다운로드. |
| `[data-action="open-account-edit-modal"][data-account-id]` | 계정 수정 modal open. |
| `[data-action="delete-account"][data-account-id]` | 계정 삭제. |
| `[data-action="refresh-accounts"]` | 계정 목록 reload. |
| `[data-action="close-account-modal"]` | modal close. |
| `[data-account-form]` | 생성/수정 submit. |
| `[data-account-upload-form]` | 계정 XLSX 업로드 submit. |
| `[data-account-upload-file]` | 계정 XLSX 파일 선택. |
| `[data-account-modal-field="userId"]` | 아이디 draft. |
| `[data-account-modal-field="userName"]` | 이름 draft. |
| `[data-account-modal-field="role"]` | 역할 draft. |
| `[data-account-modal-field="password"]` | 비밀번호 draft. |

### 화면 요소

- 권한 없을 때:
  - 제목 `계정 관리`.
  - 안내 `슈퍼 관리자만 접근할 수 있습니다.`
- 권한 있을 때:
  - 총 계정 badge `총 N개`.
  - `계정 추가`, `엑셀 업로드`, `새로고침`, `학교 목록`.
  - table column: 아이디, 이름, 권한, 마지막 로그인, 관리, 삭제.
  - 마지막 로그인은 `YYYY-MM-DD HH:mm`, 값이 없으면 `-`.

## 6. 양식 관리 화면

### 상태

`templates` slice:

| key | 역할 |
|---|---|
| `items` | 양식 카드 목록. |
| `total` | 양식 총 개수. |
| `limit` | 목록 limit. 기본 100. |
| `loading` | 목록 로딩. |
| `errorMessage` | 목록/생성/삭제 오류. |
| `filters.keyword` | 양식명/설명 검색어. |
| `filters.generationUnit` | 생성 단위 filter. |
| `filters.orientation` | 용지 방향 filter. |
| `filters.paperPreset` | 용지 preset filter. |
| `cardEditor` | 카드에서 양식명/설명 inline 수정 상태. |
| `createModal` | 새 양식 modal 상태. |

`templates.cardEditor`:

| key | 역할 |
|---|---|
| `activeTemplateId` | 현재 inline 수정 중인 양식 id. |
| `field` | `name` 또는 `description`. |
| `draftValue` | 수정 draft. |
| `isSaving` | inline 저장 중. |

`templates.createModal`:

| key | 역할 |
|---|---|
| `isOpen` | modal 표시. |
| `mode` | `blank`, `default`, `copy`. 기본 `default`. |
| `schools` | copy mode에서 선택 가능한 다른 학교 목록. 현재 학교는 제외된다. |
| `selectedSchoolId` | copy mode 원본 학교 id. |
| `sourceTemplates` | 원본 학교의 양식 목록. |
| `selectedTemplateId` | 복사할 양식 id. |
| `isLoadingSchools` | 학교 목록 로딩. |
| `isLoadingTemplates` | 원본 양식 목록 로딩. |
| `isSubmitting` | 생성/복사 요청 중. |
| `errorMessage` | modal 내부 오류. |

### 주요 DOM hook

| Hook | 역할 |
|---|---|
| `[data-action="create-template"]` | 새 양식 modal open. |
| `[data-action="close-template-create-modal"]` | 새 양식 modal close. |
| `[data-template-create-form]` | 새 양식 생성/복사 submit. |
| `[data-template-create-mode]` | 생성 방식 radio. |
| `[data-template-create-school]` | 복사 원본 학교 select. |
| `[data-template-create-source-template]` | 복사 원본 양식 radio. |
| `[data-action="edit-template"][data-template-id]` | 편집기 route 이동. |
| `[data-action="duplicate-template"][data-template-id]` | 같은 학교로 양식 복사. |
| `[data-action="delete-template"][data-template-id]` | 양식 삭제 confirm 후 API 호출. |
| `[data-action="edit-template-card-meta"][data-template-id][data-template-field]` | 카드 metadata inline 수정 시작. |
| `[data-template-card-input][data-template-field]` | inline 수정 draft 갱신. |
| `[data-action="save-template-card-meta"]` | inline 수정 저장. |
| `[data-action="cancel-template-card-meta"]` | inline 수정 취소. |

### 새 양식 생성 모드

| Mode | UI label | 서버 요청 |
|---|---|---|
| `blank` | 빈 템플릿 | `POST /api/pdf-templates`, `creationMode: "blank"` |
| `default` | 기본 템플릿 | `POST /api/pdf-templates`, `creationMode: "default"` |
| `copy` | 다른 학교 양식 복사 | `POST /api/pdf-templates/:selectedTemplateId/duplicate`, `sourceSchoolId`, `targetSchoolId` |

`blank`/`default` 생성 시 기본 payload는 `name: "새 양식"`, `description: ""`, `generationUnit: "roomCode"`, `orientation: "portrait"`, `paperPreset: "A4"`, `schoolId: 현재 학교`다.

## 7. 수험생 데이터 화면

### 상태

`candidates` slice:

| key | 역할 |
|---|---|
| `items` | 현재 로드된 수험생 row 목록. |
| `total` | 서버 총 건수. |
| `limit` | 서버 조회 limit. 기본 12. |
| `loading` | 목록 로딩. |
| `errorMessage` | 목록/업로드/수정 오류. |
| `successMessage` | 업로드/수정 성공 메시지. |
| `filters` | 서버 조회용 기본 filter. |
| `table` | 클라이언트 table filter/sort/page 상태. |
| `upload` | XLSX/사진 ZIP 업로드 modal 상태. |
| `detail` | 수험생 상세 수정 modal 상태. |
| `downloadConfirm` | XLSX 다운로드 확인 modal 상태. |

`candidates.filters` key:

- `admission`
- `building`
- `date`
- `examineeName`
- `examineeNo`
- `major`
- `room`
- `series`
- `time`
- `endTime`
- `track`
- `unit`

`candidates.table`:

| key | 역할 |
|---|---|
| `page` | 클라이언트 현재 페이지. |
| `pageSize` | page size. 기본 30. |
| `pageSizeMenuOpen` | page size menu 표시. |
| `filterMenuKey` | 열 filter menu가 열린 column key. |
| `filterMenuPosition` | filter menu 위치. |
| `filterMenuSearch` | filter option 검색어. |
| `filters` | column key별 선택된 값 배열. |
| `sortRules` | sort rule 배열. 현재 첫 rule만 사용. |

Page size option:

- 10
- 30
- 50
- 100
- 500
- 1000
- 2000
- 0: 전체 표시

### 수험생 table column

모든 column은 filterable/sortable이다.

| key | label |
|---|---|
| `designatedSort` | 지정정렬 |
| `track` | 모집시기 |
| `admission` | 전형명 |
| `admissionCode` | 전형코드 |
| `series` | 계열명 |
| `seriesCode` | 계열코드 |
| `unit` | 모집단위명 |
| `unitCode` | 모집단위코드 |
| `major` | 전공명 |
| `majorCode` | 전공코드 |
| `date` | 시험날짜 |
| `time` | 시작시간 |
| `endTime` | 종료시간 |
| `period` | 교시명 |
| `periodCode` | 교시코드 |
| `building` | 고사건물명 |
| `buildingCode` | 고사건물코드 |
| `room` | 고사실명 |
| `roomCode` | 고사실코드 |
| `examineeNo` | 수험번호 |
| `temporaryNo` | 가번호 |
| `name` | 이름 |
| `birth` | 생년월일 |
| `group` | 조 |
| `opt1` | OPT1 |
| `opt2` | OPT2 |
| `opt3` | OPT3 |
| `opt4` | OPT4 |
| `opt5` | OPT5 |

### 업로드 상태

`candidates.upload`:

| key | 역할 |
|---|---|
| `isOpen` | 업로드 modal 표시. |
| `mode` | `workbook` 또는 사진 업로드 모드. 기본 `workbook`. |
| `dataFile`, `dataFileName` | XLSX 파일 객체와 표시명. |
| `photoFile`, `photoFileName` | ZIP 파일 객체와 표시명. |
| `existingDataPolicy` | `insert-only`, `insert-update`, `all`. 기본 `insert-update`. |
| `preview` | XLSX preview 결과. |
| `photoPreview` | 사진 ZIP preview 결과. |
| `photoPreviewToken` | 사진 ZIP preview 후 실제 반영에 사용하는 서버 임시 업로드 세션 token. |
| `isUploading` | 업로드 반영 중. |
| `errorMessage` | 업로드 오류. |
| `successMessage` | 업로드 성공 메시지. |
| `previewProgress` | preview 단계 진행률 표시. |
| `progressOverlay` | 업로드 반영 단계 진행 overlay. |

업로드 정책:

| value | label | description |
|---|---|---|
| `insert-only` | 신규만 반영 | 기존 데이터 수정건과 동일 데이터는 건너뛴다. |
| `insert-update` | 신규 + 수정 반영 | 동일 데이터는 건너뛰고 신규와 수정건만 반영한다. |
| `all` | 전체 반영 | 동일 데이터까지 포함해 업로드 파일 전체를 다시 반영한다. |

### 상세 수정 상태

`candidates.detail`:

| key | 역할 |
|---|---|
| `isOpen` | 상세 modal 표시. |
| `originalRecord` | 원본 row. |
| `draftRecord` | 수정 draft. |
| `isSaving` | 정보 저장 중. |
| `isPhotoUploading` | 사진 업로드 중. |
| `statusMessage`, `statusType` | 상세 modal 상태 메시지. |

상세 수정 field는 table column과 동일하며 `date`, `birth`는 date, `time`, `endTime`은 time input으로 취급한다.

## 8. PDF 생성 화면

### 목록 상태

`pdfGenerations` 주요 key:

| key | 역할 |
|---|---|
| `items` | PDF 생성 이력 목록. |
| `total` | 이력 총 개수. |
| `limit` | 서버 목록 limit. 기본 20. |
| `loading` | 목록 로딩. |
| `errorMessage` | 목록 오류. |
| `filters.generationUnit` | 생성 단위 filter. |
| `filters.keyword` | 검색어. |
| `filters.status` | 상태 filter. |
| `table` | 생성 결과 table filter/sort/page/selection 상태. |
| `selectedGenerationIds` | 선택된 생성 이력 id 배열. |
| `selectionAnchorGenerationId` | shift 선택 기준 id. |

`pdfGenerations.table` 기본 sort:

- `sequenceNumber` ascending.

### 생성 modal 상태

`pdfGenerations.createModal`:

| key | 역할 |
|---|---|
| `isOpen` | modal 표시. |
| `activeStepIndex` | 현재 step index. |
| `templates` | 생성 가능한 양식 목록. |
| `selectedTemplateId` | 선택 양식 id. |
| `filters` | 생성 target filter draft. |
| `selectedFilterKeys` | 실제 생성 단위로 확정한 filter key. |
| `options` | step별 filter option. |
| `isLoadingOptions` | option 로딩. |
| `isSubmitting` | 생성 요청 중. |
| `errorMessage` | modal 오류. |
| `templatePreview` | 첫 대상 미리보기 modal 상태. |

생성 step 순서:

1. `template`: 양식
2. `track`: 모집시기
3. `admission`: 전형
4. `series`: 계열
5. `unit`: 모집단위
6. `major`: 전공
7. `examDate`: 시험날짜
8. `time`: 시작시간
9. `endTime`: 종료시간
10. `period`: 교시
11. `building`: 고사건물
12. `room`: 고사실
13. `group`: 조

필수 선택 filter:

- `track`
- `admission`

생성 단위별 마지막 filter:

| generationUnit | 마지막 filter |
|---|---|
| `admission`, `admissionCode` | `admission` |
| `seriesCode` | `series` |
| `unit`, `unitCode` | `unit` |
| `exam`, `examDate` | `examDate` |
| `periodCode` | `period` |
| `buildingCode` | `building` |
| `room`, `roomCode` | `room` |
| `group` | `group` |
| 기타 | `group`까지 |

단, `series` 단계는 최소 표시 범위로 유지되므로 생성 단위가 전형이어도 UI는 계열 단계까지 표시된다.

### 진행 overlay 상태

`pdfGenerations.activeGeneration`:

| key | 역할 |
|---|---|
| `isOpen` | 진행 overlay 표시. |
| `batchId` | 진행 중인 batch id. |
| `label` | 표시 label. |
| `statusText` | 상태 텍스트. |
| `totalRequested` | 요청 총 개수. |
| `queuedCount` | 대기 수. |
| `runningCount` | 실행 중 수. |
| `succeededCount` | 성공 수. |
| `failedCount` | 실패 수. |
| `completedCount` | 완료 수. |
| `progressPercent` | 진행률. |
| `elapsedSeconds` | 경과 시간. |
| `estimatedSeconds` | 예상 잔여/총 시간. |
| `canCancel` | 취소 가능 여부. |
| `isCancelling` | 취소 요청 중. |
| `errorMessage` | 진행 오류. |

### 다운로드/결과/삭제 상태

| Slice | 역할 |
|---|---|
| `downloadModal` | 선택 PDF 다운로드 방식. `mode`는 `merge` 기본. |
| `generatedResultModal` | 생성 완료 후 병합/ZIP 다운로드 안내. |
| `deleteConfirm` | 선택 PDF 삭제 전 건수, 용량, 페이지 수 요약. |
| `detailModal` | 목록 위 상세 modal로 열 generation id. |
| `auditLogs`, `auditTable`, `totalAuditLogs` | PDF 작업 로그 화면 상태. |

`auditTable` 기본 sort:

- `createdAt` descending.

## 9. 데이터 삭제 화면

### 상태

`dataDeletion`:

| key | 역할 |
|---|---|
| `activeScope` | 카드에서 선택 중인 scope. |
| `isDeleting` | 삭제 API 실행 중. |
| `statusMessage`, `statusType` | 삭제 결과 메시지. |
| `modal` | 삭제 설정 modal 상태. |

`dataDeletion.modal`:

| key | 역할 |
|---|---|
| `isOpen` | 설정 modal 표시. |
| `selectedScope` | 삭제 범위. |
| `filters` | 삭제 단위 filter. PDF 생성 filter와 같은 단계 구조. |
| `selectedFilterKeys` | 선택 완료한 filter key. |
| `selectedTemplateIds` | 템플릿 scope에서 삭제할 양식 id 배열. |
| `options` | filter option. |
| `summary` | 사전 대상 건수 payload. |
| `summaryErrorMessage` | 건수 조회 오류. |
| `isLoadingOptions` | filter option 로딩. |
| `isLoadingSummary` | summary 로딩. |
| `confirmationOpen` | 최종 확인 modal 표시. |
| `confirmationPhrase` | 전체 삭제 확인 문구 입력값. |
| `errorMessage` | modal 오류. |

삭제 scope:

| scope | title | 영향 |
|---|---|---|
| `all` | 전체 데이터 | 수험생, 사진, PDF 생성 결과/파일/작업 로그, 양식 데이터를 모두 삭제하고 학교는 유지한다. |
| `candidates` | 수험생 데이터 | 수험생 기본 정보와 연결 사진을 삭제한다. |
| `photos` | 사진 데이터 | 수험생 기본 정보는 유지하고 사진 파일과 사진 참조만 삭제한다. |
| `pdf-generations` | 생성 PDF 데이터 | PDF 생성 이력, 배치, PDF/ZIP 파일, 작업 로그를 삭제한다. |
| `templates` | 양식 데이터 | 양식 목록, 페이지/요소 구성, 버전 스냅샷을 삭제한다. |

최종 확인 문구:

- `전체 데이터 삭제`

Submit 가능 조건:

- `deleteProjectData` 권한이 있다.
- 현재 학교가 있다.
- 삭제 scope가 유효하다.
- 템플릿 scope면 `selectedTemplateIds`가 1개 이상이다.
- 템플릿 외 scope면 `track`, `admission` 선택 조건이 완료되어 있다.
- summary가 있고 삭제 대상 총 건수가 1건 이상이다.
- option/summary 로딩 중이 아니고 삭제 중이 아니다.

## 10. 양식 편집기 상태

`templateEditor`:

| key | 역할 |
|---|---|
| `loading` | 템플릿 상세/data tag catalog 로딩. |
| `template` | 현재 편집 중인 템플릿 payload. |
| `lastLoadedTemplateId` | 마지막 load 완료 template id. race condition 방지에 사용. |
| `selectedPageId` | 선택 page id. |
| `dataTags.groups` | 데이터 태그 catalog group. |
| `dataTagSampleValues` | 태그별 샘플값. localStorage와 layout dataTagSettings를 반영. |
| `dataTagEmptyValueData` | 태그별 빈 값 대체값. |
| `dataTagSampleModal` | 샘플/빈 값 설정 modal draft. |
| `generationUnitModal` | 사용자 지정 생성 단위 modal 표시 상태. |
| `isDirty` | 저장되지 않은 layout 변경 여부. |
| `savedTemplateSnapshot` | 마지막 저장/로드 상태 deep clone. 변경 취소에 사용. |
| `isSaving` | layout 저장 중. |
| `isSavingDataTagSettings` | data tag 설정만 저장 중. |
| `isPreviewOpen` | 미리보기 modal 표시. |
| `isPreviewLoading` | 미리보기 생성 중. |
| `previewHtml` | legacy HTML preview 값. 편집기 PDF preview 성공 시 빈 문자열로 유지된다. |
| `previewPdfUrl` | 편집기 미리보기 PDF iframe `src` URL. |
| `previewPageCount` | 미리보기 page 수. |
| `previewCandidateCount` | 미리보기 candidate 수. |
| `previewWarnings` | 미리보기 경고 배열. |
| `previewErrorMessage` | 미리보기 오류. |
| `hasDocumentOverflow` | 문서 또는 데이터 블록 overflow 여부. |
| `documentOverflowMessage` | 저장 차단/경고 메시지. |
| `imageMoveSession` | 이미지 drag session. |
| `imageResizeSession` | 이미지 resize session. |
| `selectedImageElement` | 현재 선택 이미지/개체. |
| `errorMessage` | load/save 오류. |

편집기 상세 구현은 [양식 레이아웃과 편집기 런타임 상세 명세](14-template-layout-editor-deep-dive.md)를 따른다.

## 11. 공통 UI 상태

`ui`:

| key | 역할 |
|---|---|
| `activeSchoolId` | 현재 학교 id. route, API query, sidebar 표시 기준. |
| `activeTemplateId` | 현재 템플릿 id. 편집기/후속 화면 이동 기준. |
| `busyMessage` | 전역 busy 메시지. |
| `modalClosePrompt` | 저장되지 않은 modal을 닫기 전 확인 prompt 상태. |

`ui.modalClosePrompt`:

| key | 역할 |
|---|---|
| `isOpen` | prompt 표시. |
| `modalId` | 닫으려는 modal 식별자. |
| `message` | 사용자에게 표시할 확인 문구. |
| `isSaving` | prompt에서 저장을 진행 중인지 여부. |

## 12. 전역 렌더링과 Event 위임

`client/app/app-renderer.js`는 현재 view만 렌더링하는 것이 아니라 모든 view panel을 상태에 맞춰 갱신한다. `currentView === "templateEditor"`일 때만 편집기 runtime을 mount하고, 다른 view로 이동하면 runtime을 unmount한다.

이벤트 처리 방식:

- 화면별 action module이 `document.addEventListener`로 click/input/change/submit/keydown을 위임한다.
- 버튼은 대부분 `data-action`을 사용한다.
- route 이동은 `data-go-view`, `data-go-route`를 사용한다.
- form submit은 화면별 `data-*-form` selector를 사용한다.
- table filter, pagination, modal field는 `data-*-field`, `data-*-input`, `data-*-setting` selector를 사용한다.

## 13. Navigation guard

편집기 또는 modal의 변경 상태가 있을 때 다음 동작은 guard 대상이다.

- 다른 view/path 이동.
- 브라우저 뒤로/앞으로 이동.
- 브라우저 unload.
- 편집기 page tab 변경.
- 저장되지 않은 modal 닫기.

양식 편집기 guard 기준은 `templateEditor.isDirty`이며, modal guard는 `client/app/modal-guard-registrations.js`의 등록 조건을 따른다.

## 14. 이식 시 누락되기 쉬운 계약

- DOM class는 스타일용이고, 동작은 `data-*` selector가 기준이다.
- 화면 action은 대부분 전역 document 이벤트 위임이므로, DOM 조각만 독립 삽입하면 클릭이 동작하지 않는다.
- 권한이 없으면 클라이언트에서 버튼을 숨기거나 fieldset을 disabled 처리하지만, 서버 API 권한 검사가 최종 기준이다.
- `schoolId`는 route param에서 학교 code가 들어올 수 있고, API에는 실제 DB id를 넘겨야 하므로 `client/app/school-context.js`가 필요하다.
- 수험생 table filter/sort는 서버 조회 filter와 클라이언트 column filter가 분리되어 있다.
- PDF 생성 filter와 데이터 삭제 filter는 같은 step 정의를 공유하지만, 데이터 삭제는 생성 단위를 `roomCode`로 고정한다.
- 양식 편집기는 runtime이 contenteditable DOM을 직접 관리하므로 저장 전 runtime HTML을 `template.layout.pages[].settings.documentHtml`로 동기화해야 한다.
