# 문서 기준 재테스트 결과

검증일시: 2026-05-23 12:50 KST  
검증 기준: `doc/` 폴더의 시스템/화면/API/DB/편집기 상세 명세  
검증 방식: Node 단위 테스트 + 실제 브라우저 Headless Edge/Chrome CDP 조작 + 화면 회귀 스크린샷 + 드롭다운/페이지네이션 검사  
수정 원칙: 애플리케이션 기능 코드는 수정하지 않았다. 테스트 과정에서 임시 양식을 생성해 편집기 세부 기능을 검증했고, 시나리오 종료 시 삭제 API를 호출했다.

## 1. 기준 문서

이번 테스트는 다음 문서를 기준으로 범위를 잡았다.

| 문서 | 테스트 반영 내용 |
|---|---|
| `doc/01-system-overview.md` | 실행 script, 서버 실행, queue driver, storage 전제 |
| `doc/02-client-shell-routing.md` | SPA route, shell mode, topbar/sidebar, navigation guard |
| `doc/03-auth-permissions.md` | 로그인, 세션, 권한별 버튼/화면 표시 |
| `doc/04-management-pages.md` | 학교/계정/양식 관리 화면과 modal |
| `doc/05-template-editor.md` | 편집기 레이아웃, toolbar, page property, data tag, 저장/미리보기 |
| `doc/06-candidates.md` | 수험생 목록, 업로드 modal, table, pagination |
| `doc/07-pdf-generations.md` | PDF 생성 목록, 생성 modal, 상세, 작업 로그 |
| `doc/08-data-deletion.md` | 삭제 scope, 삭제 modal, template 선택 삭제 |
| `doc/09-api-reference.md`, `doc/15-api-detailed-contracts.md` | route, permission, query/body alias, 파일 응답 |
| `doc/10-database-storage.md` | DB/파일 삭제/저장 service 단위 검증 |
| `doc/12-complete-module-map.md` | 서버/클라이언트 모듈 묶음별 간접 검증 |
| `doc/13-state-ui-contracts.md` | `appState` slice, DOM hook, table/modal 상태 |
| `doc/14-template-layout-editor-deep-dive.md` | layout JSON, page settings, editor runtime, candidate block, table/object 동작 |

## 2. 전체 실행 요약

| 구분 | 명령/방법 | 결과 |
|---|---|---:|
| 단위 테스트 | `npm test` | PASS 249, FAIL 0 |
| UI smoke | `npm run smoke:ui` | PASS |
| 전체 브라우저 회귀 | `node scripts/full-browser-regression.js` | PASS 26, SKIP 1, FAIL 0 |
| 드롭다운/페이지네이션 | `node scripts/check-dropdown-ui.js` | PASS, 컨트롤 22개, 이슈 0 |
| 전체 브라우저 smoke | `npm run smoke:browser` | FAIL 1 |
| 편집기 세부 독립 테스트 | 임시 빈 양식 생성 후 시나리오별 실행 | PASS 8, FAIL 7 |
| BullMQ smoke | `npm run smoke:bullmq` | BLOCKED |

주요 산출물:

- `artifacts/full-browser-regression/2026-05-23T03-42-09-680Z/summary.json`
- `artifacts/dropdown-ui-check/2026-05-23T03-42-37-112Z/summary.json`

BullMQ smoke 차단 사유:

- `REDIS_URL` 또는 `PDF_SMOKE_REDIS_URL`이 설정되어 있지 않아 실행하지 못했다.
- 현재 브라우저/단위 테스트는 `PDF_QUEUE_DRIVER=memory` 경로를 사용했다.

## 3. 문서별 검증 결과

| 문서 범위 | 테스트 내용 | 결과 |
|---|---|---:|
| 시스템 실행 | 서버 자동 기동, 정적 페이지, API route, memory queue 기동 | PASS |
| 인증/권한 | `/login`, 인증 redirect, 로그인, 로그아웃, 권한별 계정관리/편집 버튼 표시 | PASS |
| Shell/routing | `/schools`, `/accounts`, `/schools/:schoolId/templates`, 후보자/PDF/삭제/편집 route 진입 | PASS |
| 학교 관리 | 학교 목록, 새 학교 modal, 수정 modal, 기본 학교 삭제 버튼 disabled | PASS |
| 계정 관리 | 목록, 추가 modal, 수정 modal, table column, 모바일/데스크톱 레이아웃 | PASS |
| 양식 관리 | 카드 목록, 생성 modal 기본/복사 mode, 카드 action, 편집 진입 | PASS |
| 수험생 데이터 | 목록, workbook 업로드 modal, 사진 업로드 modal, page size, page 이동 | PASS |
| PDF 생성 | 목록, 생성 modal, 다운로드 modal, 삭제 modal, 상세 빈 상태 | PASS |
| PDF 작업 로그 | audit log grid, page size, pagination | PASS |
| 데이터 삭제 | 삭제 카드, 수험생 scope modal, 템플릿 scope modal | PASS |
| 데이터 삭제 최종 확인 | 실제 삭제 대상 부족으로 확인 modal까지 진행하지 않음 | SKIP |
| API 상세 계약 | route helper alias, body size, auth/account/template/candidate/pdf/deletion service 테스트 | PASS |
| DB/저장소 | 템플릿 저장, 삭제, 수험생 import/export, PDF 이력/삭제, data deletion service | PASS |
| 양식 편집기 기본 레이아웃 | 4열 레이아웃, toolbar/tag/canvas/page property/footer, 표지/본문 tab | PASS |
| 양식 편집기 toolbar/page property | 글꼴, 크기, 줄간격 control, page number, recognition marks, generation unit | PASS |
| 양식 편집기 data tag | 삽입, 샘플 표시, 서식 일부 | PARTIAL FAIL |
| 양식 편집기 candidate block | 생성/선택/일부 조작, 내부 table/object 일부 | PARTIAL FAIL |
| 양식 편집기 table/object | 기본 표 편집, 열 resize, 구조 편집은 통과. 행 resize/object resize 일부 실패 | PARTIAL FAIL |
| 양식 편집기 저장/복원 | 저장 버튼 최신 편집 내용 반영 검증 실패 | FAIL |

## 4. 편집기 세부 독립 테스트 결과

각 시나리오는 새 임시 빈 양식을 만든 뒤 실행했다. 이는 기존 첫 번째 양식이 이전 테스트로 오염되어 결과가 왜곡되는 것을 줄이기 위한 방식이다.

| 시나리오 | 결과 |
|---|---:|
| `editor-layout` | PASS |
| `document-input` | FAIL |
| `candidate-block-grid` | FAIL |
| `toolbar-and-page-properties` | PASS |
| `generated-objects` | PASS |
| `image-object` | PASS |
| `data-tags-formatting` | FAIL |
| `document-overflow` | PASS |
| `table-basic-editing` | PASS |
| `table-column-resize` | PASS |
| `table-row-resize` | FAIL |
| `table-format-save` | FAIL |
| `table-structure-editing` | PASS |
| `table-object-selection` | FAIL |
| `save-restore` | FAIL |

## 5. 실패 상세와 수정 제안

### F-01. 전체 브라우저 smoke 중 수험생 블록 내부 바코드 리사이즈 실패

- 테스트: `npm run smoke:browser`
- 실패 위치: `candidate-block-grid` 시나리오
- 실패 내용: 수험생 데이터 블록 표 셀 내부 바코드가 논리 좌표 기준으로 리사이즈되는지 검증하는 조건을 만족하지 못했다.
- 영향: 수험생 블록 안에 바코드/QR을 넣고 크기 조절할 때, 표시 좌표와 저장 좌표가 어긋날 가능성이 있다.
- 제안: candidate block focus editor 내부 generated object resize 경로에서 CSS pixel과 pt/논리 좌표 변환을 한 번만 적용하도록 정리한다. 일반 문서 surface와 candidate block surface의 scale 기준을 분리하고, 저장 HTML에 반영되는 width/height/left/top을 같은 좌표계로 검증한다.

### F-02. 페이지 전환 전 저장 확인 prompt 미표시

- 테스트: `document-input`
- 실패 내용: 편집기에서 문서를 변경한 뒤 표지/본문 page tab 전환 시 `페이지를 전환하기 전에 저장하지 않은 변경사항이 있습니다.` 확인창이 표시되어야 하지만 표시되지 않았다.
- 관찰값: surface에는 `enterSplitSmoke` 문단 변경 결과가 남아 있었지만 page 전환 guard가 작동하지 않았다.
- 영향: 사용자가 페이지를 전환할 때 현재 page의 변경 내용이 저장/취소 확인 없이 사라지거나 다른 page 상태와 섞일 수 있다.
- 제안: page tab click 처리 전에 runtime HTML을 state로 강제 sync하고, 현재 page `settings.documentHtml`이 `savedTemplateSnapshot`과 다르면 `templateEditor.isDirty`를 true로 보정한다. programmatic runtime 변경 후 실제 키 입력이 발생한 경우도 dirty guard에 포함해야 한다.

### F-03. 수험생 블록 표 과대 크기 정규화 실패

- 테스트: `candidate-block-grid`
- 실패 내용: 수험생 블록 내부 표를 과도하게 키운 뒤 입력 이벤트를 발생시키면 source block 표가 블록 높이를 넘어섰다.
- 관찰값: source block 높이는 약 127px인데 내부 table 높이는 약 2701px로 남았다. preview block은 별도 정규화를 받을 수 있으나 source/master block 정규화가 충분하지 않다.
- 영향: 수험생 블록 확대 편집 중 과도한 표 크기를 만들면 원본 블록이 페이지 영역을 침범하고, 저장/미리보기/PDF 출력이 달라질 수 있다.
- 제안: `candidate-block-grid-table-normalizer`를 source block과 preview block 모두에 적용한다. focus editor 입력, source block hydrate, mirror sync 직후 같은 clamp 함수를 통과하도록 보강한다.

### F-04. 데이터 태그와 일반 텍스트의 같은 행 높이 정렬 실패

- 테스트: `data-tags-formatting`
- 실패 내용: 18pt bold line-height 1 문단에서 데이터 태그 token과 일반 텍스트가 같은 행 높이/기준선 정렬 조건을 만족하지 못했다.
- 영향: 양식에서 `수험번호 #수험번호`처럼 일반 텍스트와 태그를 섞어 쓰면 PDF와 편집 화면에서 baseline이 어긋날 수 있다.
- 제안: `.template-token`과 내부 SVG가 부모의 `font-size`, `font-weight`, `line-height`를 더 엄격히 상속하도록 조정한다. token root는 inline-flex 사용 시 `vertical-align: baseline` 또는 텍스트 기준 보정값을 적용하고, 아이콘 높이는 `1em` 기준으로 제한한다.

### F-05. 표 행 Shift 리사이즈 시 전체 높이 유지 실패

- 테스트: `table-row-resize`
- 실패 내용: rowspan이 포함된 표에서 단일 셀을 Shift로 미세 확대할 때 표 전체 높이를 유지하고 인접 행에 보정값을 분배해야 하지만 조건을 만족하지 못했다.
- 관찰값: table height 121px 상태에서 rowspan cell의 height/min-height가 61px로 반영되며 전체 행 합산 조건이 어긋났다.
- 영향: 표 행 높이 정밀 조정 시 전체 표 높이가 의도와 다르게 바뀌거나 rowspan 셀과 실제 행 높이가 불일치할 수 있다.
- 제안: Shift 행 리사이즈 경로에서 `oldTableHeight`를 고정하고, delta를 rowspan 영향 범위 밖의 보정 행에 분배한다. `tbody`, `tr`, `td`의 height/min-height를 같은 계산 결과로 동기화해야 한다.

### F-06. 표 셀 줄 간격 적용/저장 실패

- 테스트: `table-format-save`
- 실패 내용: toolbar 줄 간격 control을 표 셀에 적용하는 조건을 만족하지 못했다.
- 영향: 표 셀 안의 줄 간격을 조정해도 저장 HTML 또는 runtime 표시가 기대와 다를 수 있다.
- 제안: line-height control에서 선택된 table cell을 target으로 잡는 경로를 보강한다. toolbar 조작 직전 selection restore가 일반 surface가 아닌 table cell range를 복구하는지 확인하고, 적용 후 `input` 이벤트와 runtime sync를 보장한다.

### F-07. 일반 표 개체 상단 핸들 리사이즈 실패

- 테스트: `table-object-selection`
- 실패 내용: 절대 배치된 일반 표 개체의 상단 핸들을 드래그할 때 하단 기준점을 고정하고 top/height만 갱신해야 하지만 조건을 만족하지 못했다.
- 영향: 표 개체를 위쪽에서 줄이거나 늘릴 때 표가 의도하지 않은 위치로 밀리거나 저장 좌표가 어긋날 수 있다.
- 제안: top/north resize handle 처리에서 `oldBottom = top + height`를 고정하고 `newTop = oldBottom - newHeight`로 계산한다. 오버레이 좌표, scroll offset, canvas scale을 동일 좌표계로 맞춰야 한다.

### F-08. 저장 버튼 최신 편집 내용 반영 실패

- 테스트: `save-restore`
- 실패 내용: 저장 버튼 클릭 시 직전 편집 내용이 저장 요청 payload에 반영되는 조건을 만족하지 못했다.
- 관찰값: surface에는 token과 한글 문단 등 최신 내용이 있었지만 저장 완료 검증 조건을 통과하지 못했다.
- 영향: 사용자가 저장 직전에 입력한 내용이 layout JSON의 `page.settings.documentHtml`에 누락될 가능성이 있다.
- 제안: 저장 버튼 handler 첫 단계에서 active runtime editor와 모든 document surface를 강제 sync한다. `syncTemplateEditorRuntimeToState`가 true를 반환해도 실제 selected page HTML이 최신인지 비교하고, 다르면 `syncSelectedPageDocumentHtml({ forceHistory: true })`를 추가 호출한다.

## 6. 통과 항목 상세

### 관리/목록 화면

- 로그인 전 `/`와 보호 route 접근 시 `/login`으로 이동.
- 로그인 후 `/schools` 진입.
- 학교 선택 화면에서 workspace sidebar 숨김 상태 확인.
- 학교 workspace 진입 후 sidebar 표시와 active menu 확인.
- 계정 관리 table column `아이디`, `이름`, `권한`, `마지막 로그인`, `관리` 확인.
- 학교 생성/수정 modal과 로고/모집년도 입력 영역 확인.
- 양식 생성 modal의 `빈 템플릿`, `기본 템플릿`, `다른 학교 양식 복사` mode 확인.
- 수험생 workbook/photo upload modal 확인.
- PDF 생성 modal, 다운로드 modal, 삭제 modal 확인.
- 데이터 삭제 수험생/템플릿 scope modal 확인.

### API/도메인 로직

- 인증 session cookie, DB 계정 CRUD, 마지막 super admin 보호.
- route param decode와 생성 target filter alias.
- request body size limit과 413 처리.
- 수험생 workbook parsing/export, 사진 ZIP parsing/save.
- PDF 생성 filter, target grouping, queue chunk, rerun snapshot.
- preview renderer의 token 치환, other room page, candidate block grid rendering.
- 템플릿 layout 정규화, page number, recognition marks, candidate block grid settings.
- 데이터 삭제 scope별 count/delete, 파일 누락 집계.

### 편집기 통과 시나리오

- 편집기 4열 layout과 도구/태그/캔버스/속성 패널 표시.
- 표지 사용 switch와 표지/본문 page property 기본 표시.
- page number, recognition marks, generation unit control 표시.
- barcode/QR 일반 생성 개체 삽입과 source picker.
- 일반 이미지 삽입/선택/리사이즈 기본 조작.
- 일반 문서 overflow 방지 시나리오.
- 일반 표 기본 삽입/선택/병합/분할 기본 조작.
- 표 열 resize.
- 표 구조 편집.

## 7. 보류/제외 항목

| 항목 | 상태 | 사유 |
|---|---|---|
| BullMQ 실제 Redis queue | BLOCKED | `REDIS_URL` 또는 `PDF_SMOKE_REDIS_URL` 미설정 |
| 데이터 삭제 최종 실행 | SKIP | 실제 삭제 대상이 부족했고, 운영 데이터 삭제를 동반하므로 확인 modal까지만 검증 |
| 실제 PDF 파일 생성/다운로드 전체 플로우 | PARTIAL | 브라우저 회귀에서는 modal/목록/상세 중심 검증. queue는 memory smoke 범위에서만 간접 확인 |

## 8. 결론

문서에 적힌 일반 관리 화면, 라우팅, 권한, API/DB 도메인 로직, 수험생/PDF/데이터 삭제 기본 화면은 현재 구현과 대체로 일치하며 자동 테스트도 통과했다.

가장 중요한 양식 관리 편집기는 기본 layout과 다수 기능은 동작하지만, 문서에 명시한 고급 편집 기능 중 다음 영역은 실제 브라우저 테스트에서 실패했다.

- 수험생 블록 내부 table/object 정규화와 좌표 리사이즈.
- 데이터 태그 inline 높이 정렬.
- table row Shift resize.
- table cell line-height 적용/저장.
- table object top handle resize.
- page 전환 dirty guard.
- 저장 직전 최신 HTML sync.

따라서 현재 문서는 구현 범위를 충분히 설명하지만, 위 실패 항목은 실제 구현이 문서의 의도와 완전히 일치하지 않는 부분이다. 수정 우선순위는 `저장 최신화/dirty guard`, `수험생 블록 정규화`, `표 리사이즈/줄간격`, `데이터 태그 정렬` 순서가 적절하다.
