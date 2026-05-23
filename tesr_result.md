# 브라우저 테스트 결과

작성일: 2026-05-23

## 테스트 원칙

- `doc/`에 작성된 명세를 기준으로 페이지, 패널, 모달, 테이블, 필터, 페이지네이션, 편집기 주요 UI를 실제 브라우저로 열어 확인했다.
- 사용자가 요청한 대로 애플리케이션 소스 코드는 수정하지 않았다.
- 삭제 실행, 실제 데이터 저장, 실제 파일 업로드 반영처럼 운영 데이터에 영향을 줄 수 있는 동작은 실행하지 않았다.
- 테스트 산출물은 `artifacts/` 하위에 생성되었다.

## 실행 명령과 결과

| 명령 | 목적 | 결과 |
| --- | --- | --- |
| `node scripts/full-browser-regression.js` | 로그인부터 주요 업무 화면/모달을 브라우저 CDP로 순차 검증 | PASS 26, FAIL 0, SKIP 1 |
| `npm run smoke:ui` | SPA route와 브라우저 렌더링 기본 확인 | PASS |
| `node scripts/check-dropdown-ui.js` | 데스크톱/모바일 레이아웃, 드롭다운, 페이지네이션, read-only route 검증 | PASS, issue 0 |
| `npm run smoke:browser` | 템플릿 편집기 세부 조작 포함 통합 스모크 | FAIL 1 |

## 산출물

- 전체 회귀 요약: `artifacts/full-browser-regression/2026-05-23T02-38-36-830Z/summary.json`
- 전체 회귀 스크린샷: `artifacts/full-browser-regression/2026-05-23T02-38-36-830Z/`
- 드롭다운/반응형 요약: `artifacts/dropdown-ui-check/2026-05-23T02-39-45-620Z/summary.json`
- 드롭다운/반응형 스크린샷: `artifacts/dropdown-ui-check/2026-05-23T02-39-45-620Z/`

## 페이지별 테스트 결과

| 구분 | 테스트 내용 | 결과 | 비고 |
| --- | --- | --- | --- |
| 로그인 | `/login` 렌더링, 로그인 form 표시, 로그인 후 `/schools` 이동 | PASS | `01-login`, `27-logout-login` 스크린샷 생성 |
| 인증/상단바 | 사용자/권한 표시, 학교 목록 버튼, 로그아웃 버튼 유지 | PASS | 로그인 후 작업공간 화면에서 확인 |
| 작업공간 사이드바 | 양식 관리, 수험생 데이터, PDF 생성, PDF 작업 로그, 데이터 삭제 메뉴 활성 상태 | PASS | 각 route 진입 시 active nav 확인 |
| 학교 선택 | 학교 목록, 카드, 현황 badge, 새 학교 모달, 학교 수정 모달 | PASS | `02-school-management`부터 `04-school-edit-modal` |
| 계정 관리 | 데스크톱/모바일 테이블, 컬럼, 계정 추가 모달, 계정 수정 모달 | PASS | `05-account-management-desktop`부터 `08-account-management-mobile` |
| 양식 관리 | 양식 카드, 썸네일, 새 양식 모달, 기본/복사 모드, 다른 학교 양식 목록 | PASS | `09-template-management`부터 `12-template-create-modal-copy-list` |
| 수험생 데이터 | 수험생 테이블, 컬럼 구조, 필터 메뉴, 업로드 모달, 사진 업로드 tab | PASS | `13-candidates`부터 `15-candidate-upload-photo-modal` |
| PDF 생성 | 목록, 생성 모달, completed 선택, 다운로드 모달, 삭제 확인 모달 | PASS | `16-pdf-generations`부터 `19-pdf-generation-delete-modal` |
| PDF 생성 상세 | 존재하지 않는 상세 id 접근 시 상세 화면/empty 상태 렌더링 | PASS | `20-pdf-generation-detail-empty` |
| PDF 작업 로그 | 작업 로그 화면, 테이블, 필터/정렬/페이지네이션 구조 | PASS | `21-pdf-history` |
| 데이터 삭제 | 삭제 카드, 수험생 삭제 설정 모달, 양식 삭제 설정 모달 | PASS | `22-data-deletion`부터 `24-data-deletion-templates-modal` |
| 데이터 삭제 확인 | 최종 확인 모달 표시 | SKIP | 삭제 확인까지 진행할 양식 데이터가 없어 확인 버튼 활성화 조건을 만들지 못함 |
| 양식 편집기 | 편집 화면 진입, toolbar/tag panel/canvas/page properties 표시 | PASS | `26-template-editor` |
| 반응형/드롭다운 | 8개 route, desktop/mobile, 22개 control, 페이지네이션 next/prev | PASS | `check-dropdown-ui.js`, issue 0 |

## 실패 상세

### `npm run smoke:browser`

- 결과: FAIL.
- 실패 위치: `scripts/smoke/template-editor/editor-layout-grid.js`
- 실패 메시지: `양식 관리 중앙 4열 편집기 레이아웃 표시 조건을 만족하지 못했습니다.`
- 실패한 세부 조건:
  - `coverPageHasCoverUseSwitch=false`
  - `coverPageUseSwitchAtTop=false`
  - `coverPageHidesBlockGrid=false`
  - `coverPageHidesPageNumber=false`

원인 분석:

- 실패 시점의 실제 화면은 양식 편집기 자체는 로드되었고, grid, toolbar, tag panel, canvas, page properties, 데이터 태그, 테이블 도구, 삽입 도구 대부분은 true였다.
- 실패 조건은 표지 페이지 전용 속성 검증이다.
- 현재 테스트 스크립트는 `.template-page-switcher`와 `[data-examlist-cover-page-setting="enabled"]` 같은 selector를 기준으로 표지 스위치를 찾는다.
- 실제 구현은 `client/features/template-editor/page-property-renderers.js` 기준으로 페이지 tab은 `.editor-page-tabs`, 표지 사용 스위치는 `.examlist-cover-page-field [data-editor-page-field="enabled"]` 형태다.
- 실패 로그의 `editorSurfaceHtml`에는 수험생 블록이 포함되어 있어, 테스트가 표지 페이지가 아니라 본문/수험생 블록 상태에서 표지 전용 조건을 검사한 것으로 보인다.

수정 제안:

- 테스트 스크립트 수정안:
  - `scripts/smoke/template-editor/editor-layout-grid.js`에서 표지 검증 전에 실제 page tab selector인 `.editor-page-tabs [data-action="select-editor-page"]`로 표지 페이지를 명시 선택한다.
  - 표지 스위치 selector를 `.examlist-cover-page-field [data-editor-page-field="enabled"]`로 변경한다.
  - 현재 구현의 page properties DOM 순서에 맞게 block grid/page number 숨김 조건을 표지 선택 이후에만 검사한다.
- 구현 안정성 강화안:
  - 장기적으로 smoke test 안정성을 위해 `client/features/template-editor/page-property-renderers.js`의 표지 스위치에 `data-examlist-cover-page-setting="enabled"` 같은 전용 테스트 hook을 추가할 수 있다.
  - 단, 이번 요청에서는 시스템 수정 금지 조건이 있어 코드는 변경하지 않았다.

## Skip 상세

### 데이터 삭제 최종 확인 모달

- 결과: SKIP.
- 사유: 테스트 대상 학교에서 양식 삭제 확인까지 진행할 충분한 삭제 대상 조건을 확보하지 못했다.
- 현재 테스트는 실제 삭제 실행을 하지 않는 방향으로 제한했다.

수정 제안:

- 별도 테스트 DB 또는 disposable fixture를 준비한다.
- 테스트 전용 학교와 템플릿을 생성한 뒤, 최종 확인 모달까지만 열고 삭제 실행은 하지 않는 시나리오를 추가한다.
- 실제 삭제 실행까지 검증하려면 운영 DB가 아닌 격리 DB에서만 수행해야 한다.

## 비파괴 원칙 때문에 실행하지 않은 항목

| 항목 | 미실행 이유 | 제안 |
| --- | --- | --- |
| 수험생 XLSX 실제 반영 | DB 변경 발생 | fixture XLSX와 격리 DB에서 import/preview/commit 분리 검증 |
| 사진 ZIP 실제 반영 | 파일 저장소와 DB 변경 발생 | 임시 storage와 테스트 DB에서만 실행 |
| 수험생 상세 저장 | DB 변경 발생 | 테스트 전용 수험생 row 생성 후 저장/롤백 |
| PDF 실제 배치 생성 | PDF 파일과 이력 생성 | memory queue와 임시 storage를 쓰는 별도 테스트 DB에서 수행 |
| ZIP/병합 파일 실제 생성 | 파일 생성 발생 | 임시 storage에서 다운로드 API까지 검증 |
| 데이터 삭제 실행 | 파괴적 작업 | disposable school fixture에서만 실행 |

## 종합 판단

- 문서에 작성된 주요 화면, 패널, 모달, 테이블, 필터, 페이지네이션, 반응형 레이아웃은 브라우저에서 정상 렌더링되었다.
- 전체 회귀 테스트 기준 기능 실패는 없었다.
- `smoke:browser` 실패는 실제 화면 로딩 실패보다는 테스트 스크립트 selector와 표지 페이지 선택 전제 불일치가 원인이다.
- 운영 데이터 변경이 필요한 액션은 이번 조건상 실행하지 않았으므로, 완전한 end-to-end 검증은 격리 DB와 임시 storage를 준비한 뒤 추가 수행하는 것이 적절하다.
