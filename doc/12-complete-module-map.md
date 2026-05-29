# 전체 구현 모듈 지도

이 문서는 `doc/`의 화면별 명세를 보완하는 구현 단위 색인이다. 다른 프로젝트에서 ExamList의 특정 기능을 가져갈 때 어떤 파일, 상태, API, CSS, 서버 모듈이 함께 움직이는지 확인하기 위한 문서다.

## 1. 실행 진입점

| 파일 | 역할 | 함께 필요한 요소 |
|---|---|---|
| `index.js` | `server.js`를 로드하는 Node 진입점 | `server.js` |
| `server.js` | 앱 컨텍스트 생성, route 등록, 정적 파일/page handler 등록, DB bootstrap, PDF queue 시작, HTTP 서버 listen | `server/create-app-context.js`, `server/http/*`, `server/bootstrap.js` |
| `server/bootstrap.js` | DB 생성, schema 적용, 누락 컬럼/인덱스 보정 | `db/schema.sql`, `server/modules/bootstrap/*` |
| `db.js` | MySQL pool과 query helper 제공 | `.env`, `mysql2/promise` |
| `server/create-app-context.js` | 모든 service와 repository를 조립해 route dependency를 만든다 | `server/modules/*` |
| `server/create-route-deps.js` | route handler가 사용할 `sendJson`, `readJsonBody`, service 함수, 권한 함수를 묶는다 | `server/http/routes/*` |

## 2. 서버 HTTP 계층

| 파일 | 역할 |
|---|---|
| `server/http/request-handler.js` | 모든 요청을 받아 API route, 정적 파일, SPA page handler로 분기한다. |
| `server/http/router.js` | `exactRoute`, `regexRoute` 기반 자체 라우터를 제공한다. |
| `server/http/routes/auth.js` | 로그인, 로그아웃, 세션 조회 API. |
| `server/http/routes/accounts.js` | 관리자 계정 CRUD API. |
| `server/http/routes/schools.js` | 학교 목록/생성/상세/수정/삭제 API. |
| `server/http/routes/school-settings.js` | 학교명, 모집년도, 로고 설정 API. |
| `server/http/routes/pdf-templates.js` | 템플릿 목록, 생성, 상세, 저장, 삭제, 복사 API. |
| `server/http/routes/pdf-data-tags.js` | 데이터 태그 catalog API. |
| `server/http/routes/pdf-preview.js` | 템플릿 HTML/PDF 미리보기 API. |
| `server/http/routes/candidates.js` | 수험생 목록, XLSX, 사진 ZIP, 상세 수정, 사진 조회/저장 API. |
| `server/http/routes/pdf-generations.js` | PDF 생성 대상, 미리보기, 큐 등록, 배치, 다운로드, 병합, ZIP, 재생성 API. |
| `server/http/routes/data-deletion.js` | 데이터 삭제 사전 요약과 범위별 삭제 API. |
| `server/http/body.js` | JSON/binary request body 읽기, route별 body size 제한. |
| `server/http/response.js` | JSON, binary, download 응답 헬퍼. |
| `server/http/route-helpers.js` | route param decode, permission guard, PDF 생성 필터 alias 처리. |
| `server/http/page-handler.js` | `/login`, SPA route, redirect 처리. |

## 3. 서버 도메인 모듈

### 인증과 권한

| 파일 | 역할 |
|---|---|
| `server/modules/auth/service.js` | 로그인, 세션 조회, DB 계정/환경 변수 계정 병합, 마지막 로그인 갱신. |
| `server/modules/auth/accounts.js` | 계정 생성/수정/삭제/list, password hash, 마지막 super admin 보호. |
| `server/modules/auth/session-service.js` | 세션 cookie 생성/검증, TTL 적용. |
| `server/modules/auth/cookies.js` | signed cookie 직렬화/파싱. |
| `server/modules/auth/auth-utils.js` | SHA-256 password hash 검증, salt 처리. |
| `server/modules/permissions/service.js` | role, permission map, legacy role alias, `assertPermission`. |

권한 키는 `deleteProjectData`, `deleteSchoolsWithoutPassword`, `deleteTemplates`, `downloadPdfs`, `generatePdfs`, `manageAccounts`, `manageCandidates`, `manageTemplates`, `previewTemplates`, `viewCandidates`, `viewDashboard`, `viewGenerations`, `viewTemplates`이다.

### 학교와 학교 설정

| 파일 | 역할 |
|---|---|
| `server/modules/schools/service.js` | 학교 CRUD, 삭제 비밀번호, 기본 학교 보호, 학교 삭제 시 관련 데이터 정리. |
| `server/modules/schools/validators.js` | 학교 코드, 이름, 설명, 삭제 비밀번호 검증. |
| `server/modules/school-settings/service.js` | 학교 표시명, 모집년도, 로고 data URL 조회/저장. |

학교 삭제는 학교 자체뿐 아니라 템플릿, 페이지, 요소, 버전, 수험생, PDF 이력, 배치, 학교 설정을 함께 정리한다. 실제 파일 삭제는 관련 데이터 삭제 모듈과 파일 저장소 모듈에서 처리된다.

### 템플릿

| 파일 | 역할 |
|---|---|
| `server/modules/pdf-templates/service.js` | 템플릿 생성, 저장, 삭제, 복사. 새 템플릿은 기본 학교 `한국대학교`의 `기본 템플릿`을 원본으로 사용한다. |
| `server/modules/pdf-templates/service-read.js` | 목록, 상세, summary 조회, thumbnail 포함 응답 생성. |
| `server/modules/pdf-templates/defaults.js` | 기본 layout, 기본 cover/content 페이지, paper/generation config 생성. |
| `server/modules/pdf-templates/layout.js` | layout 전체 정규화, data tag settings 정규화. |
| `server/modules/pdf-templates/layout-pages.js` | 페이지 타입, 크기, 활성화, 반복 여부, sort order 정규화. |
| `server/modules/pdf-templates/layout-page-settings.js` | safe area, recognition marks, page number, other room page, candidate block grid 정규화. |
| `server/modules/pdf-templates/layout-elements.js` | 구조화 element 배열 정규화. |
| `server/modules/pdf-templates/layout-element-config.js` | element type별 config 정규화. |
| `server/modules/pdf-templates/snapshot-store.js` | `pdf_template_pages`, `pdf_template_elements`, version row 저장. |
| `server/modules/pdf-templates/candidate-block-grid-sort.js` | 수험생 블록 정렬 key/direction 정규화. |
| `server/modules/pdf-templates/generation-units.js` | 템플릿 생성 단위 상수와 검증. |
| `server/modules/pdf-templates/pagination.js` | 표 pagination 행 수 계산. |
| `server/modules/pdf-templates/duplicate-options.js` | 같은 학교/다른 학교 복사 옵션 정규화. |
| `server/modules/pdf-templates/validation.js` | 템플릿 metadata 검증. |

### 수험생 데이터

| 파일 | 역할 |
|---|---|
| `server/modules/candidates/service.js` | 수험생 목록/상세 수정/사진 저장/필터 옵션/업로드 orchestration. |
| `server/modules/candidates/repository.js` | 읽기/쓰기 repository 조립. |
| `server/modules/candidates/repository-read.js` | 목록 조회, 필터 옵션, 사진 조회, grouping. |
| `server/modules/candidates/repository-write.js` | insert/update/delete, 사진 메타 저장. |
| `server/modules/candidates/workbook.js` | XLSX 템플릿 생성, export, workbook parsing. |
| `server/modules/candidates/import-service.js` | XLSX preview/import 정책 적용. |
| `server/modules/candidates/normalization*.js` | 후보자 입력값, CSV, 날짜/시간 정규화. |
| `server/modules/candidates/field-map.js` | workbook/header와 DB column 매핑. |
| `server/modules/candidates/photo-parser.js` | ZIP entry에서 수험번호와 이미지 파일 추출. |
| `server/modules/candidates/photo-archive-service.js` | 사진 ZIP preview/save 처리. |
| `server/modules/candidates/photo-archive-session-store.js` | 사진 ZIP preview 파일을 실제 반영까지 임시 세션으로 보관. |
| `server/modules/candidates/photo-file-storage.js` | 사진 파일 저장소 처리. |
| `server/modules/candidates/photo-record-service.js` | 사진 DB 참조 반영. |
| `server/modules/candidates/photos.js` | 사진 data URL/file payload 처리. |

수험생 필드 정의의 기준은 `shared/domain/candidate-field-definitions.js`다. 클라이언트 테이블, XLSX 템플릿, 서버 import/export가 이 정의를 공유한다.

### PDF 미리보기와 렌더링

| 파일 | 역할 |
|---|---|
| `server/modules/pdf-preview/service.js` | 템플릿, 학교 설정, 수험생 샘플/실데이터를 조합해 미리보기 payload를 만든다. |
| `server/modules/pdf-preview/renderer.js` | 전체 HTML preview renderer. |
| `server/modules/pdf-preview/renderer-document-page.js` | 페이지 단위 HTML 생성. |
| `server/modules/pdf-preview/renderer-page-settings.js` | page number, recognition marks, other room page 등 page setting 적용. |
| `server/modules/pdf-preview/candidate-block-grid-renderer.js` | 수험생 블록 반복 렌더링, 정렬, 빈 블록, 사진 처리. |
| `server/modules/pdf-preview/candidate-block-grid-css.js` | 수험생 블록 print CSS 생성. |
| `server/modules/pdf-preview/element-*.js` | 구조화 element의 image, shape, table, text 렌더링. |
| `server/modules/pdf-preview/generated-objects.js` | 바코드/QR 생성 object 렌더링. |
| `server/modules/pdf-preview/tokens.js` | 데이터 태그 치환. |
| `server/modules/pdf-preview/token-formatters.js` | 날짜, 시간, 번호, 마스킹 등 token format. |
| `server/modules/pdf-preview/token-expressions.js` | 기본값/조건식/포맷 식 처리. |
| `server/modules/pdf-preview/token-maps.js` | candidate/school/room token mapping. |
| `server/modules/pdf-preview/sample-candidates.js` | 미리보기용 샘플 수험생 데이터. |
| `server/modules/pdf-preview/list-thumbnail.js` | 양식 카드 thumbnail HTML 생성. |
| `server/modules/pdf-preview/thumbnail.js` | thumbnail rendering helper. |
| `server/modules/pdf-preview/styles*.js` | preview/print CSS 생성. |

### PDF 생성

| 파일 | 역할 |
|---|---|
| `server/modules/pdf-generations/service.js` | PDF 생성 기능 전체 service 조립. |
| `server/modules/pdf-generations/targets.js` | generation unit별 target 산출. |
| `server/modules/pdf-generations/filters.js` | 요청 필터 alias/정규화. |
| `server/modules/pdf-generations/generation-unit-fields.js` | custom generation unit field 목록 정규화. |
| `server/modules/pdf-generations/batch-target-resolution.js` | 배치 요청에서 템플릿, 학교, 필터, 대상 해석. |
| `server/modules/pdf-generations/batch-orchestrator.js` | 배치 row 생성, chunk 계획, job enqueue. |
| `server/modules/pdf-generations/chunks.js` | target별 chunk 분할. |
| `server/modules/pdf-generations/queue-service.js` | 기본 memory queue driver 선택과 job 등록. |
| `server/modules/pdf-generations/queue-enqueuer.js` | 단일/배치 job 등록. |
| `server/modules/pdf-generations/queue-job-processor.js` | queue job 실행 진입. |
| `server/modules/pdf-generations/queue-lifecycle.js` | worker 시작, event 처리, memory queue 처리. |
| `server/modules/pdf-generations/queue-recovery.js` | 서버 재시작 시 queued/running 복구. |
| `server/modules/pdf-generations/generation-runner.js` | 단일 PDF 생성 실행. |
| `server/modules/pdf-generations/browser-renderer.js` | browser executable로 HTML을 PDF 파일로 출력. |
| `server/modules/pdf-generations/repository.js` | history/batch DB 저장. |
| `server/modules/pdf-generations/batch-status-service.js` | 배치 상태 집계와 polling 응답. |
| `server/modules/pdf-generations/history-service.js` | 이력 목록, 상세, 삭제, 재생성. |
| `server/modules/pdf-generations/history-read-service.js` | 이력 조회 전용. |
| `server/modules/pdf-generations/history-rerun-service.js` | 재생성 payload 복원. |
| `server/modules/pdf-generations/history-file-service.js` | 파일 제공, 만료/삭제 처리. |
| `server/modules/pdf-generations/archive-service.js` | ZIP archive와 병합 PDF 생성. |
| `server/modules/pdf-generations/archives.js` | archive 파일 경로와 메타 처리. |
| `server/modules/pdf-generations/file-name.js` | PDF 파일명 생성. |
| `server/modules/pdf-generations/snapshots.js` | 요청 snapshot 생성/복원. |
| `server/modules/pdf-generations/batch-cancel-service.js` | 배치 취소. |
| `server/modules/pdf-generations/batch-status.js` | 상태 집계 순수 로직. |
| `server/modules/pdf-generations/batch-rows.js` | batch row mapping. |
| `server/modules/pdf-generations/candidate-sort.js` | 생성 대상 후보자 정렬. |
| `server/modules/pdf-generations/cancellation.js` | 취소 상태 판정. |
| `server/modules/pdf-generations/queue-history-store.js` | queue 작업과 history row 연결. |
| `server/modules/pdf-generations/queue-options.js` | queue retry/concurrency/retention 옵션. |

### 데이터 삭제

| 파일 | 역할 |
|---|---|
| `server/modules/data-deletion/service.js` | 삭제 scope, 필터, 확인 문구, summary, delete orchestration. |
| `server/modules/data-deletion/summary.js` | scope별 사전 건수와 템플릿 선택 요약. |
| `server/modules/data-deletion/counts.js` | 삭제 대상 count 계산. |
| `server/modules/data-deletion/candidate-deletion.js` | 수험생 row 삭제. |
| `server/modules/data-deletion/candidate-photos.js` | 수험생 사진 파일 삭제. |
| `server/modules/data-deletion/pdf-generation-deletion.js` | PDF 이력과 배치 삭제. |
| `server/modules/data-deletion/pdf-generation-delete-service.js` | PDF 파일 삭제와 이력 삭제 결합. |
| `server/modules/data-deletion/template-deletion.js` | 템플릿 scope 삭제. |
| `server/modules/data-deletion/file-delete.js` | 파일 시스템 삭제, missing 집계. |
| `server/modules/data-deletion/filters.js` | 삭제 필터 라벨. |
| `server/modules/data-deletion/utils.js` | placeholder, unique list, JSON parsing helper. |

## 4. 클라이언트 앱 shell

| 파일 | 역할 |
|---|---|
| `client/core.js` | 앱 부트스트랩, action 조립, route 이동, 인증 처리, unsaved guard, 이벤트 위임. |
| `client/app/app-state.js` | 전역 상태 단일 객체. 모든 화면은 이 state slice를 기준으로 렌더링된다. |
| `client/app/app-renderer.js` | 모든 view panel과 global modal host를 상태에 맞춰 다시 렌더링한다. |
| `client/app/bootstrap-loader.js` | route 진입 시 필요한 데이터를 view별로 로드한다. |
| `client/app/navigation.js` | `data-go-view`, `data-go-route`, 브라우저 history 이동 처리. |
| `client/app/view-shell.js` | shell mode, sidebar, active nav, 권한별 nav 활성/숨김 처리. |
| `client/app/dom-elements.js` | index.html의 주요 DOM 참조와 view panel map. |
| `client/app/access.js` | `summary.access.permissions` 기반 권한 판정. |
| `client/app/api-client.js` | JSON API fetch helper, error handling. |
| `client/app/modal-close-guard.js` | 모달 닫기 전 저장/취소 prompt. |
| `client/app/modal-guard-registrations.js` | 기능별 modal close guard 등록. |
| `client/app/protected-state-reset.js` | 로그아웃/권한 변경 시 보호 상태 초기화. |
| `client/app/school-context.js` | route school key와 active school id/code 계산. |
| `client/app/grid-state-reset.js` | route 변경 시 table filter/sort/page state 초기화. |
| `client/app/grid-tooltip.js` | table cell overflow tooltip. |
| `client/app/toast.js` | 공통 toast 표시. |
| `client/app/html-utils.js` | HTML escape. |
| `client/app/number-format.js` | 한국어 숫자 포맷. |
| `client/app/generation-units.js` | generation unit option과 label. |

## 5. 클라이언트 화면 모듈

### 로그인

| 파일 | 역할 |
|---|---|
| `login.html` | 로그인 전용 HTML. |
| `client/login.js` | session 조회, login submit, 실패 메시지, 성공 redirect. |
| `styles/features/auth.css` | 로그인 화면과 auth 상태 CSS. |

### 학교 관리

| 파일 | 역할 |
|---|---|
| `client/features/schools/renderers.js` | 학교 목록, 검색, 학교 생성/수정 모달, 학교 row action 렌더링. |
| `client/features/schools/actions.js` | 학교 목록 load, 생성/수정/삭제, workspace 이동. |
| `client/features/schools/modal-actions.js` | 학교 모달 open/close/input/logo/year step/submit. |
| `client/features/schools/data-actions.js` | API 호출과 상태 반영. |
| `client/features/schools/event-bindings.js` | click/input/change/submit 이벤트 바인딩. |
| `client/features/schools/utils.js` | 학교명 suffix, 모집년도 정규화. |

### 계정 관리

| 파일 | 역할 |
|---|---|
| `client/features/accounts/renderers.js` | 계정 테이블, 계정 추가/수정 모달. |
| `client/features/accounts/actions.js` | 목록 load, modal open/close, submit, delete. |

### 양식 관리 목록

| 파일 | 역할 |
|---|---|
| `client/features/templates/renderers.js` | 양식 카드, 썸네일, inline 이름/설명 편집, 카드 action. |
| `client/features/templates/actions.js` | 목록 load, inline edit, 삭제, 복사, 편집 진입. |
| `client/features/templates/template-create-modal-state.js` | 새 양식 modal 초기 상태. |
| `client/features/templates/template-create-modal-renderer.js` | 빈 템플릿/기본 템플릿/다른 학교 복사 modal. |
| `client/features/templates/template-create-modal-actions.js` | 생성 모드, 학교/원본 템플릿 로드, submit. |
| `client/features/templates/thumbnail.js` | 카드 thumbnail markup. |

### 수험생 데이터

| 파일 | 역할 |
|---|---|
| `client/features/candidates/renderers.js` | 전체 수험생 view 조립. |
| `candidate-table-model.js` | table column, sort/filter/page 모델. |
| `candidate-table-renderer.js` | table shell. |
| `candidate-table-header-renderer.js` | sort/filter header. |
| `candidate-table-body-renderer.js` | row/cell 렌더링. |
| `candidate-table-pagination-renderer.js` | page size, 이전/다음, page picker. |
| `candidate-filter-menu-renderer.js` | column filter menu. |
| `candidate-table-events.js` | table sort/filter/page/click 이벤트. |
| `candidate-list-actions.js` | 목록 조회와 filter 적용. |
| `candidate-upload-renderer.js` | XLSX/사진 ZIP 업로드 modal과 progress UI. |
| `candidate-upload-actions.js` | modal open/close, 파일 선택, preview, import. |
| `candidate-workbook-preview-actions.js` | XLSX preview API 처리. |
| `candidate-upload-submit-actions.js` | XLSX import 실행. |
| `candidate-photo-archive-preview-actions.js` | 사진 ZIP preview. |
| `candidate-upload-progress.js` | progress percent/detail 생성. |
| `candidate-detail-renderer.js` | 수험생 상세 수정 modal. |
| `candidate-detail-events.js` | 상세 modal input/photo 이벤트. |
| `candidate-download-confirm-renderer.js` | XLSX 다운로드 확인 modal. |
| `candidate-action-utils.js` | 공통 row/field helper. |

### PDF 생성과 작업 로그

| 파일 | 역할 |
|---|---|
| `client/features/pdf-generations/actions.js` | PDF 생성 feature action 조립. |
| `pdf-generation-state.js` | 생성 modal, progress, download, delete, result modal 상태 기본값. |
| `pdf-generation-flow.js` | 생성 단계, 필터 단계 표시 규칙, generation unit별 target filter. |
| `pdf-generation-create-modal-renderer.js` | 생성 마법사 modal. |
| `pdf-generation-create-modal-actions.js` | 템플릿/필터 option 로드, target estimate, preview, batch job 등록. |
| `pdf-generation-create-modal-events.js` | modal 이벤트. |
| `pdf-generation-active-runner.js` | batch polling과 active progress state 갱신. |
| `pdf-generation-active-progress.js` | 경과/예상 시간과 progress view model. |
| `pdf-generation-progress-renderer.js` | active generation overlay. |
| `pdf-generation-list-actions.js` | 생성 목록 load. |
| `pdf-generation-table-model.js` | 생성 목록 table column/filter/sort. |
| `pdf-generation-table-renderer.js` | table shell. |
| `pdf-generation-rows-renderer.js` | row, checkbox, print/detail action. |
| `pdf-generation-selection-actions.js` | completed row 선택, shift range, 전체 선택. |
| `pdf-generation-download-modal-renderer.js` | 병합/ZIP 선택 modal. |
| `pdf-generation-download-actions.js` | merge/archive 생성과 다운로드 시작. |
| `pdf-generation-download-progress-renderer.js` | archive 준비 중 overlay. |
| `pdf-generation-generated-result-modal-renderer.js` | batch 완료 후 결과 다운로드 modal. |
| `pdf-generation-delete-confirm-renderer.js` | 선택 PDF 삭제 확인 modal. |
| `pdf-generation-delete-actions.js` | 삭제 요청/상태 반영. |
| `pdf-generation-detail-renderer.js` | 상세 page. |
| `pdf-generation-detail-modal-renderer.js` | 상세 modal. |
| `pdf-generation-audit-log-model.js` | 감사 로그 table 모델. |
| `pdf-generation-audit-log-renderer.js` | 감사 로그 table. |
| `pdf-generation-audit-actions.js` | 감사 로그 load. |
| `pdf-generation-history-renderer.js` | PDF 작업 로그 page. |
| `pdf-generation-auto-download.js` | 생성 결과 자동 다운로드 helper. |

### 데이터 삭제

| 파일 | 역할 |
|---|---|
| `client/features/data-deletion/renderers.js` | 삭제 view와 modal 조립. |
| `constants.js` | 삭제 scope, 라벨, 확인 문구. |
| `state.js` | modal 기본 상태, scope별 상태 helper. |
| `actions.js` | 삭제 feature action 조립. |
| `modal-actions.js` | modal open/close, scope 변경, filter/template 선택. |
| `summary-actions.js` | summary 로드. |
| `delete-actions.js` | DELETE 요청, 후속 상태 갱신. |
| `event-bindings.js` | 이벤트 바인딩. |
| `summary-card-renderer.js` | 삭제 scope 카드와 count. |
| `filter-step-renderer.js` | 캠퍼스/전형/고사실 등 삭제 필터 단계. |
| `template-selection-renderer.js` | 템플릿 scope의 삭제 대상 템플릿 선택. |
| `target-count-renderer.js` | 선택 대상 count 표시. |
| `confirmation-renderer.js` | 최종 확인 문구 입력 UI. |

## 6. 양식 편집기 클라이언트 모듈

양식 편집기는 `client/features/template-editor/`와 `client/template-editor-runtime/`가 함께 구성한다. 상세 동작은 [양식 편집기 명세](05-template-editor.md)를 기준으로 한다.

### 화면/상태/저장

| 파일 | 역할 |
|---|---|
| `renderers.js` | 편집기 shell, 좌측 toolbar host, 데이터 태그 panel, canvas, 우측 properties panel. |
| `actions.js` | 편집기 action 조립. |
| `state.js` | 선택 page, template page helper. |
| `template-api.js` | 템플릿 상세/저장/미리보기 API. |
| `template-editor-state-actions.js` | state 변경, dirty 처리. |
| `template-editor-persistence-actions.js` | 저장, 미리보기, data tag settings 저장. |
| `template-editor-page-selection.js` | 페이지 탭 전환과 unsaved guard. |
| `template-editor-document-sync.js` | runtime HTML과 selected page settings 동기화. |
| `template-editor-document-refresh.js` | 페이지 변경/설정 변경 후 surface refresh. |
| `template-editor-reset-runtime.js` | runtime 초기화. |
| `template-editor-return-actions.js` | 목록으로 돌아가기. |
| `template-editor-event-bindings.js` | 편집기 click/change/input/pointer/key 이벤트 연결. |
| `template-editor-click-events.js` | 버튼 click action 처리. |
| `template-editor-form-events.js` | page/template field input 처리. |
| `template-editor-pointer-key-events.js` | pointer/key 기반 selection/delete/resize 처리. |

### 문서 surface와 런타임 어댑터

| 파일 | 역할 |
|---|---|
| `editor-runtime-loader.js` | runtime script/css 동적 로드. |
| `editor-runtime-adapter.js` | 앱 state와 runtime API 연결, 페이지 컨트롤/오버레이/toolbar 바인딩. |
| `editor-runtime-control-bindings.js` | runtime control cleanup 관리. |
| `editor-runtime-document-state.js` | surface HTML 읽기/쓰기. |
| `document-editor.js` | contenteditable surface 생성과 기본 문서 HTML. |
| `document-editor-root.js` | `.template-doc` wrapper 보장. |
| `document-editor-sanitizer.js` | 저장 전 HTML sanitize. |
| `document-editor-tokens.js` | 데이터 태그 token DOM 생성. |
| `document-composition-runtime.js` | IME 조합 입력 처리. |
| `document-history-runtime.js` | undo/redo용 selection/history snapshot. |
| `document-overflow.js` | 페이지 영역 overflow 계산. |
| `document-overflow-runtime.js` | 입력 후 overflow guard. |
| `document-surface-runtime.js` | surface event와 lifecycle. |

### 툴바/텍스트/표/개체

| 파일 | 역할 |
|---|---|
| `document-toolbar-renderer.js` | toolbar 전체 markup. |
| `document-toolbar-controls-renderer.js` | text/table/object control markup. |
| `document-toolbar-config.js` | font size option, color preset, icon markup. |
| `document-toolbar-actions.js` | command 실행. |
| `editor-font-size-control.js` | font size input/preset. |
| `editor-line-height-control.js` | line height input. |
| `editor-text-controls.js` | font family, color, shading, bold/italic/underline. |
| `editor-text-selection.js` | selection에서 text style 읽기. |
| `editor-text-toolbar-layout.js` | text toolbar 배치. |
| `document-table-actions.js` | 표 삽입, 행/열/셀 command. |
| `document-generated-objects.js` | 바코드/QR/구분선/생성 개체 삽입. |
| `document-image-runtime.js` | 이미지 삽입/선택/삭제 entry. |
| `document-image-selection-runtime.js` | 이미지 selection overlay. |
| `document-image-resize-runtime.js` | 이미지 resize. |
| `document-image-move-runtime.js` | 이미지 drag 이동. |
| `document-image-positioning-runtime.js` | 이미지 절대 위치 변환. |
| `document-image-utils.js` | 이미지 크기/좌표 helper. |

### 페이지 속성

| 파일 | 역할 |
|---|---|
| `page-property-renderers.js` | 페이지 선택, 용지, 여백, 페이지명, 반복 출력, 생성 단위 기본 렌더링. |
| `editor-runtime-page-controls.js` | 레거시 runtime page controls. |
| `page-settings-adapter.js` | pt/mm 변환과 page setting adapter. |
| `layout-settings.js` | 용지/방향/safe area 계산. |
| `page-number-controls.js` | 페이지 번호 설정과 overlay. |
| `recognition-marks-controls.js` | 인식 기준값 설정과 overlay. |
| `other-room-page-controls.js` | 타 고사실 페이지 설정. |
| `generation-unit-settings*.js` | custom generation unit field 설정 modal/action/renderer. |

### 데이터 태그

| 파일 | 역할 |
|---|---|
| `data-tags-config.js` | 클라이언트 accordion group과 숨김 태그 설정. |
| `data-tags-definitions.js` | 서버 catalog + fallback definition 정규화. |
| `data-tags-panel.js` | 검색, accordion, 버튼 렌더링. |
| `data-tags-adapter.js` | runtime 삽입용 tag adapter. |
| `data-tag-samples.js` | sample/empty value 저장과 localStorage key. |
| `data-tag-samples-renderer.js` | sample/empty value 설정 modal. |
| `data-tag-sample-actions.js` | modal open/save/reset. |
| `data-tags-view-options.js` | 아이콘 표시, 샘플 표시 옵션. |

### 바코드/QR/이미지/오브젝트

| 파일 | 역할 |
|---|---|
| `generated-objects-config.js` | barcode/qrcode 기본 크기, source alias, preview values. |
| `generated-objects-source.js` | source key 해석. |
| `generated-object-source-control.js` | 데이터 소스 선택 UI. |
| `generated-object-source-control.test.js` | source picker 렌더링 테스트. |
| `generated-objects-svg.js` | barcode/qrcode SVG 생성. |
| `generated-objects-markup.js` | 생성 개체 DOM markup. |
| `generated-objects-adapter.js` | runtime과 앱 state 연결. |
| `generated-object-controller-patch.js` | runtime object controller 보정. |
| `object-toolbar-*.js` | 개체 toolbar, size, alignment, selection, overlay. |
| `object-flow-reflow.js` | 절대 배치 오브젝트와 flow content 재배치. |
| `object-multi-selection-overlays.js` | 다중 선택 overlay. |

### 수험생 데이터 블록

| 파일 | 역할 |
|---|---|
| `candidate-block-grid-config.js` | 기본값, 정렬 옵션, sort key alias, pt/px 변환, 정규화. |
| `candidate-block-grid-controls.js` | 우측 패널의 열/행/간격/정렬/빈 블록/생성 UI. |
| `candidate-block-grid-renderer.js` | grid와 반복 block DOM 생성. |
| `candidate-block-grid-dom.js` | DOM selector/helper. |
| `candidate-block-grid-adapter.js` | 앱 state와 runtime 연결. |
| `candidate-block-grid-interactions.js` | 선택/더블클릭/확대 편집 이벤트. |
| `candidate-block-grid-selection.js` | grid 선택 상태. |
| `candidate-block-grid-sessions.js` | 이동/리사이즈 session 상태. |
| `candidate-block-grid-object-controls.js` | block grid 오브젝트 resize handle. |
| `candidate-block-grid-focus-editor.js` | source block 확대 편집 layer. |
| `candidate-block-grid-surface.js` | block 내부 contenteditable surface. |
| `candidate-block-grid-block-roles.js` | source/preview block role. |
| `candidate-block-grid-table-layout.js` | block 내부 table layout 계산. |
| `candidate-block-grid-table-normalizer.js` | block 내부 table 크기 정규화. |
| `candidate-block-grid-pixels.js` | pt/px 좌표 변환. |

## 7. Template Editor Runtime 패키지

`client/template-editor-runtime/`는 독립 runtime처럼 구성되어 있으며 앱에서 동적으로 로드된다.

| 파일/디렉터리 | 역할 |
|---|---|
| `loader.js` | runtime entry 로드. |
| `client/template-editor-runtime/manifest.js` | runtime asset manifest. |
| `template-editor-runtime.js` | runtime public entry. |
| `template-editor-runtime-api.js` | `setHtml`, `getHtml`, `sync`, `applyCommand` 등 외부 API. |
| `template-editor-runtime-core.js` | runtime core state와 초기화. |
| `template-editor-runtime-factory.js` | runtime instance 생성. |
| `template-editor-runtime-wiring.js` | toolbar, events, selection, keyboard 연결. |
| `template-editor-events.js` | toolbar/input/change/pointer event controller. |
| `template-editor-runtime-composition.js` | IME composition 이벤트. |
| `template-editor-runtime-context.js` | runtime context와 options. |
| `template-editor-runtime-helpers.js` | 공통 helper. |
| `template-editor-runtime.css` | runtime 전용 CSS. |
| `client/editor-toolbar.js` | toolbar entry. |
| `client/features/editor/*` | toolbar UI, shared command, table utility, color/border UI. |
| `client/features/template-editor/*` | command, keyboard, selection, token, table, object, image, preview runtime. |

이 runtime은 contenteditable DOM을 직접 다루며, 앱의 `templateEditor` state는 runtime API를 통해 HTML과 선택 상태를 동기화한다.

## 8. 공유 도메인

| 파일 | 역할 |
|---|---|
| `shared/app-config.js` | 서버와 클라이언트가 공유하는 SPA route, view title, path builder. |
| `shared/domain/candidate-field-definitions.js` | 수험생 필드 key, label, input type, XLSX/export width, sample. |
| `shared/domain/candidate-field-columns.js` | grid columns, detail fields, template workbook columns, export columns 생성. |
| `shared/domain/candidate-fields.js` | 수험생 필드 공통 export. |

## 9. CSS 구조

| 경로 | 역할 |
|---|---|
| `styles.css` | 전체 CSS import entry. |
| `styles/base.css` | 기본 token, reset, 공통 typography. |
| `styles/surfaces.css` | panel/card/table surface. |
| `styles/responsive.css` | 반응형 shell 보정. |
| `styles/features/auth.css` | 로그인/auth UI. |
| `styles/features/schools.css` | 학교 목록/모달. |
| `styles/features/school-settings.css` | 학교 로고/모집년도 설정. |
| `styles/features/templates.css` | 양식 카드/생성 modal/thumbnail. |
| `styles/features/candidates.css`와 하위 파일 | 수험생 table, filter, upload, detail. |
| `styles/features/pdf-generations.css` | PDF 생성 목록, modal, progress, detail, audit log. |
| `styles/features/data-deletion.css` | 삭제 카드, modal, 확인 입력. |
| `styles/features/grids*.css` | 공통 grid/table/action 스타일. |
| `styles/features/template-editor.css`와 하위 파일 | 편집기 shell, toolbar, data tags, document surface, candidate block, responsive. |

## 10. 스크립트와 검증 도구

| 파일 | 역할 |
|---|---|
| `scripts/setup-db.js` | DB bootstrap 실행. |
| `scripts/create-db-user.js` | DB 사용자 생성. |
| `scripts/pdf-worker.js` | 독립 PDF queue worker. |
| `scripts/smoke-ui.js` | UI smoke. |
| `scripts/smoke-browser.js` | 로그인부터 주요 화면과 편집기 기본 동작까지 브라우저 smoke. |
| `scripts/full-browser-regression.js` | 주요 화면 screenshot/checkpoint 회귀 테스트. |
| `scripts/check-dropdown-ui.js` | route별 드롭다운, 페이지네이션, 반응형 UI 점검. |
| `scripts/smoke/*` | 브라우저 CDP helper와 시나리오. |
| `scripts/smoke/template-editor/*` | 편집기 상세 브라우저 시나리오. |

## 11. 저장소 구조

| 경로 | 저장 내용 |
|---|---|
| `storage/pdf-generations/files` | 개별 생성 PDF. |
| `storage/pdf-generations/archives` | ZIP archive. |
| `storage/pdf-generations/merged` | 병합 PDF. |
| `storage/pdf-generations/previews` | 미리보기 PDF. |
| `storage/pdf-generations/tmp` | PDF 렌더링 임시 작업물. |
| `storage/candidate-photos` | 수험생 사진 파일. |
| `storage/tmp/candidate-photo-archives` | 사진 ZIP preview 후 실제 반영까지 유지하는 임시 업로드 세션 파일. |

## 12. 이식 단위별 필수 묶음

### 학교/계정 관리만 이식

- 클라이언트: `client/app/*`, `client/core.js`, `client/features/auth/*`, `client/features/schools/*`, `client/features/accounts/*`
- 서버: `server/http/*`, `server/http/routes/auth.js`, `accounts.js`, `schools.js`, `school-settings.js`, `server/modules/auth/*`, `permissions/*`, `schools/*`, `school-settings/*`, `database/*`
- DB: `schools`, `admin_accounts`, `school_settings`
- CSS: `styles/base.css`, `surfaces.css`, `responsive.css`, `features/auth.css`, `features/schools.css`, `features/school-settings.css`, `features/grids*.css`

### 양식 관리/편집기까지 이식

- 위 묶음 전체.
- 클라이언트: `client/features/templates/*`, `client/features/template-editor/*`, `client/template-editor-runtime/*`
- 서버: `server/http/routes/pdf-templates.js`, `pdf-data-tags.js`, `pdf-preview.js`, `server/modules/pdf-templates/*`, `pdf-data-tags/*`, `pdf-preview/*`
- DB: `pdf_templates`, `pdf_template_versions`, `pdf_template_pages`, `pdf_template_elements`
- CSS: `styles/features/templates.css`, `styles/features/template-editor.css`, `styles/features/template-editor/**`

### 수험생/PDF 생성까지 이식

- 위 묶음 전체.
- 클라이언트: `client/features/candidates/*`, `client/features/pdf-generations/*`, `client/features/data-deletion/*`
- 서버: `server/http/routes/candidates.js`, `pdf-generations.js`, `data-deletion.js`, `server/modules/candidates/*`, `pdf-generations/*`, `data-deletion/*`
- DB: `candidate_records`, `pdf_generation_histories`, `pdf_generation_batches`, `pdf_audit_logs`
- 저장소: `storage/candidate-photos`, `storage/pdf-generations`
- 외부 실행 파일: PDF 렌더링용 Chrome/Edge 경로 또는 `PDF_BROWSER_PATH`
