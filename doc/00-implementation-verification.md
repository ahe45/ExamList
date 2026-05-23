# 구현 검증 기록

작성 기준일: 2026-05-23

문서 분리 과정에서 기존 명세가 실제 구현된 시스템과 맞는지 핵심 항목을 다시 대조했다. 이 파일은 검증 범위와 근거를 남기는 목적의 문서이다.

## 검증한 구현 파일

| 검증 범위 | 확인 파일 |
| --- | --- |
| SPA route와 view | `shared/app-config.js` |
| 서버 API route | `server/http/routes/*.js` |
| DB 테이블 | `db/schema.sql` |
| 수험생 테이블 컬럼/업로드 정책 | `client/features/candidates/candidate-table-model.js`, `shared/domain/candidate-field-definitions.js`, `server/modules/candidates/workbook.js` |
| PDF 생성 필터와 생성 단위 | `client/features/pdf-generations/pdf-generation-flow.js`, `server/modules/pdf-generations/targets.js` |
| PDF 생성 목록/상세/로그 UI | `client/features/pdf-generations/*renderer.js` |
| 데이터 삭제 scope와 확인 문구 | `client/features/data-deletion/constants.js`, `server/modules/data-deletion/filters.js`, `server/modules/data-deletion/service.js` |
| 템플릿 편집기 DOM hook과 runtime | `client/features/template-editor/renderers.js`, `client/template-editor-runtime/**` |
| 새 양식 생성 모달/서버 생성 방식 | `client/features/templates/template-create-modal-*.js`, `server/modules/pdf-templates/service.js`, `server/modules/pdf-templates/defaults.js` |
| 역할 표시명과 PDF 작업 로그 컬럼 | `server/modules/permissions/service.js`, `client/features/pdf-generations/pdf-generation-audit-log-model.js` |
| 공통 shell 메뉴 | `index.html`, `client/app/view-shell.js` |
| 인증/권한 API | `server/http/routes/auth.js`, `server/http/routes/accounts.js`, `server/modules/permissions/service.js` |

## 검증 결과 요약

- 문서의 SPA route 목록은 `shared/app-config.js`의 `viewRouteDefinitions`와 일치한다.
- 문서의 API 표는 `server/http/routes` 하위 route 파일의 `exactRoute`, `regexRoute` 등록 목록과 일치한다.
- 문서의 DB 테이블 11개는 `db/schema.sql`의 `CREATE TABLE IF NOT EXISTS` 목록과 일치한다.
- 수험생 테이블 컬럼은 `candidateGridColumns`와 일치한다.
- 수험생 상세 필드는 `candidateDetailFields`와 일치한다.
- XLSX 업로드 필수/선택 필드는 `server/modules/candidates/workbook.js`의 정규화 로직과 `optionalTemplateFieldKeys` 기준으로 대조했다.
- PDF 생성 필터 단계는 `pdfGenerationFilterSteps`와 일치한다.
- PDF 생성 필수 선택 조건은 `pdfGenerationCreateRequiredFilterKeys = ["campus", "track", "admission"]`와 일치한다.
- 생성 단위별 마지막 필터는 `pdfGenerationUnitFilterKeyMap`와 일치한다.
- 데이터 삭제 확인 문구는 클라이언트와 서버 모두 `전체 데이터 삭제`를 사용한다.
- 데이터 삭제 기본 generation unit은 `roomCode`이다.
- 템플릿 편집기 주요 DOM id는 실제 렌더러의 `templateEditorToolbarHost`, `templateEditorSurface`, `templatePagePropertiesPanel`과 일치한다.
- 작업공간 메뉴는 `index.html`의 `data-go-view` 항목과 일치한다.
- 새 양식 생성은 클라이언트 요청 기본값과 서버 최종 저장값이 다를 수 있음을 확인했다. 서버는 `school-default`의 `기본 템플릿`을 원본으로 복제하며, blank 모드는 캔버스 내용만 제거한다.
- `guest` 역할 표시명은 실제 구현의 `로그인 필요`와 일치하도록 반영했다.
- PDF 작업 로그 컬럼은 `pdfAuditLogGridColumns`의 `작업 내용`, `대상`, `상태`, `처리 내역`, `일시`와 일치한다.

## 재검증 명령

문서와 구현을 다시 맞춰야 할 때 아래 명령으로 핵심 지점을 빠르게 확인한다.

```powershell
rg "viewRouteDefinitions|pageTitles|defaultView" shared/app-config.js -n
rg "exactRoute|regexRoute" server/http/routes -n
rg "CREATE TABLE IF NOT EXISTS" db/schema.sql -n
rg "candidateGridColumns|uploadPolicyOptions|candidateDetailFields" client/features/candidates/candidate-table-model.js -n
rg "pdfGenerationFilterSteps|pdfGenerationUnitFilterKeyMap|pdfGenerationCreateRequiredFilterKeys" client/features/pdf-generations/pdf-generation-flow.js -n
rg "dataDeletionItems|DATA_DELETION_CONFIRMATION_PHRASE|dataDeletionGenerationUnit" client/features/data-deletion -n
rg "templateEditorToolbarHost|templatePagePropertiesPanel|templateEditorSurface|데이터 태그" client/features/template-editor client/template-editor-runtime -n
rg "creationMode|DEFAULT_TEMPLATE_NOT_FOUND|preserveLayoutSettings|clearSnapshotCanvasContent" client/features/templates server/modules/pdf-templates -n
```

## 문서화 기준

- 화면 명세는 실제 renderer 파일의 DOM 구조와 표시 문구를 우선했다.
- API 권한은 route 파일의 permission guard 기준으로 적었다.
- DB 명세는 `db/schema.sql` 기준이며, bootstrap migration이 보정하는 컬럼은 별도 구현 세부로 본다.
- 클라이언트에서 숨기는 버튼도 서버 API 권한을 기준으로 최종 접근 가능 여부를 표기했다.
- PDF 생성과 데이터 삭제처럼 클라이언트와 서버가 같은 필터 모델을 공유하는 기능은 클라이언트 flow와 서버 target/filter service를 함께 대조했다.

## 2026-05-23 상세 보강 검증

사용자 요청에 따라 기존 문서가 화면 요약에 치우친 부분을 다시 검토했고, 다음 문서를 추가로 작성했다.

- [상태와 UI 계약 상세 명세](13-state-ui-contracts.md): `client/app/app-state.js`, 화면별 renderer/action/event binding을 기준으로 전역 상태 slice, DOM hook, modal/table/submit 조건을 정리했다.
- [양식 레이아웃과 편집기 런타임 상세 명세](14-template-layout-editor-deep-dive.md): `server/modules/pdf-templates/layout*.js`, `client/features/template-editor/*`, `client/template-editor-runtime/*`를 기준으로 layout JSON, page settings, element config, toolbar, data tag, generated object, candidate block grid를 정리했다.
- [API 상세 계약](15-api-detailed-contracts.md): `server/http/routes/*.js`, `server/http/route-helpers.js`를 기준으로 endpoint별 권한, query, body, status code, 파일 응답, 공통 filter alias를 정리했다.

이번 보강에서 추가로 확인한 구현 파일:

- `client/app/app-state.js`
- `client/features/schools/renderers.js`
- `client/features/accounts/renderers.js`
- `client/features/templates/actions.js`
- `client/features/templates/template-create-modal-actions.js`
- `client/features/templates/template-create-modal-renderer.js`
- `client/features/candidates/candidate-table-model.js`
- `client/features/pdf-generations/pdf-generation-flow.js`
- `client/features/data-deletion/constants.js`
- `client/features/data-deletion/modal-renderer.js`
- `client/features/template-editor/page-property-renderers.js`
- `client/features/template-editor/page-number-controls.js`
- `client/features/template-editor/recognition-marks-controls.js`
- `client/features/template-editor/candidate-block-grid-config.js`
- `client/features/template-editor/generated-objects-config.js`
- `client/features/template-editor/data-tags-config.js`
- `client/features/template-editor/editor-text-control-config.js`
- `client/features/template-editor/editor-line-height-control.js`
- `server/http/routes/candidates.js`
- `server/http/routes/pdf-generations.js`
- `server/http/routes/pdf-templates.js`
- `server/http/routes/data-deletion.js`
- `server/http/routes/schools.js`
- `server/http/route-helpers.js`
- `server/modules/pdf-templates/layout.js`
- `server/modules/pdf-templates/layout-pages.js`
- `server/modules/pdf-templates/layout-page-settings.js`
- `server/modules/pdf-templates/layout-elements.js`
- `server/modules/pdf-templates/layout-element-config.js`
