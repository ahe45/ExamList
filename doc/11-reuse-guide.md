# 재사용 가이드

다른 프로젝트에서 ExamList의 화면 또는 모듈을 가져갈 때 필요한 최소 파일과 상태 계약을 정리한다.

## 학교 작업공간 shell

필요 파일:

- `index.html`의 topbar, workspaceSidebar, view-panel 구조.
- `shared/app-config.js`.
- `client/app/navigation.js`.
- `client/app/view-shell.js`.
- `client/app/app-renderer.js`.
- `client/app/app-state.js`.
- `styles/base.css`.
- `styles/surfaces.css`.
- `styles/responsive.css`.
- 필요한 feature CSS.

필수 DOM 속성:

- `data-go-view`.
- `data-required-permission`.
- `data-school-required`.
- `data-template-required`.
- `data-view-panel`.

주의:

- `data-go-view`는 route 계산의 핵심이다.
- `data-required-permission`은 클라이언트 메뉴 표시 제어에 사용된다.
- 서버 permission check는 별도로 유지해야 한다.

## 수험생 테이블

필요 파일:

- `client/features/candidates/candidate-table-model.js`.
- `client/features/candidates/candidate-table-renderer.js`.
- `client/features/candidates/candidate-table-header-renderer.js`.
- `client/features/candidates/candidate-table-body-renderer.js`.
- `client/features/candidates/candidate-filter-menu-renderer.js`.
- `client/features/candidates/candidate-table-pagination-renderer.js`.
- `client/features/candidates/candidate-table-events.js`.
- `shared/domain/candidate-field-definitions.js`.
- `shared/domain/candidate-field-columns.js`.

필수 상태:

- `candidates.items`.
- `candidates.loading`.
- `candidates.table.filters`.
- `candidates.table.sortRules`.
- `candidates.table.page`.
- `candidates.table.pageSize`.
- `candidates.table.filterMenuKey`.
- `candidates.table.filterMenuPosition`.
- `candidates.table.filterMenuSearch`.

서버 의존:

- `/api/candidates`.
- `/api/candidates/export.xlsx`.
- `/api/candidates/template.xlsx`.
- import/preview API.
- photo archive API.

## 수험생 업로드

필요 파일:

- `client/features/candidates/candidate-upload-renderer.js`.
- `candidate-upload-actions.js`.
- `candidate-upload-events.js`.
- `candidate-upload-submit-actions.js`.
- `candidate-workbook-preview-actions.js`.
- `candidate-photo-archive-preview-actions.js`.
- `candidate-upload-progress.js`.

필수 상태:

- `candidates.upload.isOpen`.
- `candidates.upload.mode`.
- `candidates.upload.dataFileName`.
- `candidates.upload.photoFileName`.
- `candidates.upload.preview`.
- `candidates.upload.photoPreview`.
- `candidates.upload.existingDataPolicy`.
- `candidates.upload.previewProgress`.
- `candidates.upload.progressOverlay`.

## PDF 생성 모듈

필요 클라이언트:

- `client/features/pdf-generations/`.
- `client/features/template-editor/candidate-block-grid-config.js`.
- `client/app/api-client.js`.
- `client/app/access.js`.
- `client/app/number-format.js`.

필요 서버:

- `server/http/routes/pdf-generations.js`.
- `server/modules/pdf-generations/`.
- `server/modules/pdf-preview/`.
- `server/modules/candidates/` 중 candidate 조회와 group/filter option 기능.
- `server/modules/pdf-templates/` 중 template resolve 기능.
- `db/schema.sql`의 PDF 관련 테이블.

필수 환경:

- PDF 렌더링 가능한 Chrome/Chromium 또는 `PDF_BROWSER_PATH`.
- `EXAMLIST_STORAGE_DIR` 또는 `PDF_STORAGE_DIR`.
- 기본은 `PDF_QUEUE_DRIVER=memory`이며, 외부 큐가 필요하면 `PDF_QUEUE_DRIVER=bullmq`와 `REDIS_URL`을 함께 설정한다.

필수 상태:

- `pdfGenerations.items`.
- `pdfGenerations.table`.
- `pdfGenerations.createModal`.
- `pdfGenerations.activeGeneration`.
- `pdfGenerations.downloadModal`.
- `pdfGenerations.generatedResultModal`.
- `pdfGenerations.deleteConfirm`.
- `pdfGenerations.auditLogs`.
- `pdfGenerationDetail.item`.

## 템플릿 편집기

필요 클라이언트:

- `client/features/template-editor/`.
- `client/template-editor-runtime/`.
- `client/features/templates/`.
- `client/features/school-settings/`.
- `styles/features/template-editor.css`.

필요 서버:

- `server/modules/pdf-templates/`.
- `server/modules/pdf-preview/`.
- `server/modules/pdf-data-tags/`.
- `server/modules/school-settings/`.

새 템플릿 생성 의존:

- `POST /api/pdf-templates`는 기본 학교 `school-default`의 `기본 템플릿`을 원본으로 사용한다.
- 새 프로젝트로 이식할 때는 해당 원본 템플릿을 seed해야 한다. 없으면 `DEFAULT_TEMPLATE_NOT_FOUND`로 생성이 실패한다.
- blank 생성도 완전한 새 A4 레이아웃을 만드는 것이 아니라 원본 layout을 복제한 뒤 캔버스 요소와 문서 HTML만 비운다.

데이터 계약:

- 템플릿은 `layout.pages[]`를 가져야 한다.
- 각 page는 `id`, `type`, `name`, `sortOrder`, `enabled`, `repeatable`, `widthPt`, `heightPt`, `settings`를 가진다.
- 편집 HTML은 `page.settings.documentHtml`에 저장된다.
- 수험생 블록은 `page.settings.candidateBlockGrid`와 DOM 오브젝트 설정을 함께 사용한다.

DOM hook:

- `templateEditorToolbarHost`.
- `templateEditorSurface`.
- `templatePagePropertiesPanel`.
- `templateTagStrip`.

## 데이터 삭제 모듈

필요 클라이언트:

- `client/features/data-deletion/`.
- `client/features/pdf-generations/pdf-generation-flow.js`.

필요 서버:

- `server/http/routes/data-deletion.js`.
- `server/modules/data-deletion/`.
- 삭제 대상 도메인의 count/delete repository.

주의:

- 전체 삭제는 확인 문구 `전체 데이터 삭제`가 필요하다.
- 필터 삭제 시 템플릿 삭제는 제외된다.
- 템플릿 삭제는 별도의 명시 선택이 필요하다.
- 파일 삭제는 DB 삭제 후 별도 수행되므로 missing count 처리가 필요하다.

## 공통 UI 패턴

Table view:

- `table-card result-grid-card`.
- `section-header`.
- `menu-section-copy`.
- `table-header-actions`.
- `table-wrap`.
- `data-table`.
- header sort button.
- header filter button.
- floating filter menu.
- pagination.

Modal:

- `.modal-overlay`.
- `.modal-card`.
- `.modal-header`.
- `.modal-form`.
- `.modal-actions`.

Toast:

- `client/app/toast.js`.
- 성공, 경고, 오류 메시지 표시.

## 운영상 주의

- 서버 권한 검증을 우회하지 않는다.
- 학교 route key는 code처럼 보일 수 있지만 서버 저장은 `school.id` 기준이다.
- 수험생 업로드의 중복 기준은 학교와 수험번호 기반 source id이다.
- PDF 생성 목록은 기본적으로 completed 상태만 조회한다.
- 템플릿 편집 저장 전 화면 이동은 guard 대상이다.
- 기본 memory queue는 서버 프로세스 안에서 순차 처리된다. BullMQ를 사용하면 Redis와 `PDF_QUEUE_PROCESS_IN_WEB`, `PDF_QUEUE_CONCURRENCY` 설정을 함께 검토해야 한다.
- PDF 렌더링은 브라우저 실행 파일에 의존한다.
- `storage/` 하위 파일은 runtime 산출물이며, 신규 사진/PDF 파일은 학교 코드별 하위 디렉터리를 우선 사용한다.
