# 양식 레이아웃과 편집기 런타임 상세 명세

이 문서는 양식 관리 편집기 화면과 서버 템플릿 layout 정규화 규칙을 구현 기준으로 상세화한 문서다. 다른 프로젝트에서 편집기를 가져갈 때는 `client/features/template-editor/**`, `client/template-editor-runtime/**`, `server/modules/pdf-templates/**`, `server/modules/pdf-preview/**`, 관련 CSS를 하나의 묶음으로 옮겨야 한다.

검증 기준 파일:

- `client/features/template-editor/renderers.js`
- `client/features/template-editor/template-editor-state-actions.js`
- `client/features/template-editor/template-editor-persistence-actions.js`
- `client/features/template-editor/document-toolbar-renderer.js`
- `client/features/template-editor/document-toolbar-config.js`
- `client/features/template-editor/page-property-renderers.js`
- `client/features/template-editor/page-number-controls.js`
- `client/features/template-editor/recognition-marks-controls.js`
- `client/features/template-editor/candidate-block-grid-config.js`
- `client/features/template-editor/generated-objects-config.js`
- `client/features/template-editor/data-tags-config.js`
- `server/modules/pdf-templates/layout.js`
- `server/modules/pdf-templates/layout-pages.js`
- `server/modules/pdf-templates/layout-page-settings.js`
- `server/modules/pdf-templates/layout-elements.js`
- `server/modules/pdf-templates/layout-element-config.js`

## 1. 편집기 진입과 권한

URL:

- `/templates/:templateId/edit`
- `/schools/:schoolId/templates/:templateId/edit`

권한:

| 권한 | 동작 |
|---|---|
| `viewTemplates` | 템플릿 상세 조회와 편집기 화면 진입. |
| `manageTemplates` | contenteditable 활성화, toolbar command, page property 수정, 저장. |
| `previewTemplates` | 편집기 미리보기 생성. |

읽기 전용 사용자는 편집기 shell은 볼 수 있지만 다음 제약이 적용된다.

- `templateEditorSurface`에 `contenteditable`이 붙지 않는다.
- toolbar는 `현재 권한은 읽기 전용입니다.` 안내만 표시한다.
- page property fieldset이 disabled 된다.
- 저장 버튼이 표시되지 않는다.

## 2. 템플릿 payload 최상위 구조

편집기에서 다루는 템플릿 payload는 목록 카드 metadata와 layout을 함께 가진다.

| field | 역할 |
|---|---|
| `id` | 템플릿 id. |
| `schoolId` | 소속 학교 id. |
| `name` | 양식명. |
| `description` | 양식 설명. |
| `paperPreset` | `A4`, `A3`, `B4`, `B5`, `Letter`, `Legal`, `Custom`. |
| `orientation` | `portrait` 또는 `landscape`. |
| `generationUnit` | PDF 생성 단위. |
| `coverEnabled` | 표지 활성 summary. |
| `contentEnabled` | 본문 활성 summary. |
| `latestVersionNo` | 마지막 저장 version 번호. |
| `layout` | 실제 편집 layout JSON. |
| `createdAt`, `updatedAt` | 생성/수정 시각. |

저장 API는 `PATCH /api/pdf-templates/:templateId`이며, 저장 성공 시 서버가 layout을 정규화하고 version snapshot을 생성한다.

## 3. Layout JSON 구조

`layout` 정규화 결과:

| field | 역할 |
|---|---|
| `id` | layout id. 입력이 없으면 `template-${uuid}`. |
| `name` | 템플릿명과 동기화. |
| `description` | 템플릿 설명과 동기화. |
| `paper` | 용지 preset, 방향, 크기, margin. |
| `generation` | 생성 단위 config. |
| `pages` | page 배열. 최소 1개 필수. |
| `dataTagSettings` | 태그별 샘플값/빈 값 대체값. |

`dataTagSettings`:

| field | 역할 |
|---|---|
| `sampleData` | `{ [tagKey]: string }`. 값은 문자열로 저장되며 최대 2000자. |
| `emptyValueData` | `{ [tagKey]: string }`. 값은 문자열로 저장되며 최대 2000자. |

`generation`:

| field | 역할 |
|---|---|
| `unit` | 템플릿 `generationUnit`과 동기화. |
| `unitFields` | 사용자 지정 생성 단위에서 사용하는 field 배열. 유효한 field만 정규화된다. |

## 4. 용지와 좌표 단위

모든 서버 layout 좌표는 pt 단위를 기준으로 저장한다. 클라이언트 캔버스 표시 시 pt를 CSS pixel로 변환한다.

기본 preset 크기:

| preset | width pt | height pt |
|---|---:|---:|
| `A3` | 841.89 | 1190.55 |
| `A4` | 595.28 | 841.89 |
| `B4` | 728.5 | 1031.81 |
| `B5` | 515.91 | 728.5 |
| `Letter` | 612 | 792 |
| `Legal` | 612 | 1008 |
| `Custom` | 595.28 | 841.89 |

`orientation: "landscape"`이면 width/height를 교환한다. 편집기에서 용지 또는 방향을 변경하면 `layout.paper.widthPt`, `layout.paper.heightPt`, 모든 page의 `widthPt`, `heightPt`가 함께 갱신된다.

기본 safe area/margin:

- top: 28.35 pt
- right: 28.35 pt
- bottom: 28.35 pt
- left: 28.35 pt

입력 clamp:

- margin/safe area: 0-240 pt
- page width/height: 최소 100 pt

## 5. Page 구조

지원 page type:

- `cover`
- `content`
- `static`
- `appendix`

Page 정규화 결과:

| field | 역할 |
|---|---|
| `id` | page id. 입력이 없으면 `page-${uuid}`. |
| `type` | 지원 type 중 하나. 유효하지 않으면 첫 page는 `cover`, 나머지는 `content`. |
| `name` | `cover`는 항상 `표지`, `content`는 항상 `본문`, 나머지는 입력값 또는 `페이지`. |
| `enabled` | 표시 여부. 기본 true. |
| `repeatable` | 반복 출력 여부. 기본은 content page에서 true. |
| `sortOrder` | 페이지 정렬 순서. 기본 index+1, 1-10000. |
| `widthPt`, `heightPt` | page 크기. 용지 설정과 동기화. |
| `settings` | page setting 객체. |
| `elements` | 구조화 element 배열. 현재 편집기는 주로 `settings.documentHtml`을 사용한다. |

Cover page 제약:

- page number는 강제로 disabled.
- candidate block grid는 강제로 disabled.
- other room page는 강제로 disabled.
- 반복 출력 field는 UI에 표시되지 않는다.

## 6. Page settings

### `settings.safeArea`

| field | 단위 | 기본값 | clamp |
|---|---|---:|---|
| `top` | pt | 28.35 | 0-240 |
| `right` | pt | 28.35 | 0-240 |
| `bottom` | pt | 28.35 | 0-240 |
| `left` | pt | 28.35 | 0-240 |

우측 패널의 여백 입력은 `data-editor-page-margin-field="top|right|bottom|left"`로 저장된다.

### `settings.documentHtml`

현재 편집기의 핵심 저장 필드다.

- `templateEditorSurface` contenteditable의 직렬화 결과가 저장된다.
- 저장 전 `sanitizeEditableDocumentHtml`을 통과한다.
- page에는 `settings.editorMode = "document"`가 함께 기록된다.
- 표, 이미지, 바코드, QR, 데이터 태그, 수험생 블록 DOM이 이 HTML에 포함된다.

### `settings.pageNumber`

| field | 역할 |
|---|---|
| `enabled` | 페이지 번호 표시 여부. 기본 false. |
| `preset` | 표시 preset. 기본 `numericCurrentTotal`. |

지원 preset:

| preset | label | template |
|---|---|---|
| `numericCurrentTotal` | `1/1` | `{{page.current}}/{{page.total}}` |
| `pageCurrentTotal` | `페이지 1/1` | `페이지 {{page.current}}/{{page.total}}` |
| `pageCurrentTotalEnglish` | `Page1/1` | `Page{{page.current}}/{{page.total}}` |
| `currentPageKorean` | `1페이지` | `{{page.current}}페이지` |
| `koreanPage` | `1쪽` | `{{page.current}}쪽` |
| `currentPageOfTotalKorean` | `1페이지 중 1페이지` | `{{page.current}}페이지 중 {{page.total}}페이지` |
| `koreanPageOfTotal` | `1쪽 중 1쪽` | `{{page.current}}쪽 중 {{page.total}}쪽` |

Legacy alias:

| legacy | normalized |
|---|---|
| `current` | `currentPageKorean` |
| `currentTotal` | `numericCurrentTotal` |

클라이언트 hook:

- `.examlist-page-number-field`
- `[data-examlist-page-number-setting="enabled"]`
- `[data-examlist-page-number-setting="preset"]`
- `.template-page-number-overlay`

페이지 번호 계산은 enabled이 true이고 cover가 아닌 page만 sortOrder 기준으로 세어 current/total을 만든다.

### `settings.recognitionMarks`

| field | 단위 | 기본값 | clamp |
|---|---|---:|---|
| `enabled` | boolean | false | boolean |
| `offsetXPt` | pt | 14.17 | 0-240 |
| `offsetYPt` | pt | 14.17 | 0-240 |
| `sizePt` | pt | 11.34 | 2-72 |

UI 입력은 mm 단위처럼 보이지만 내부 저장은 pt다.

클라이언트 hook:

- `.examlist-recognition-marks-field`
- `[data-examlist-recognition-setting="enabled"]`
- `[data-examlist-recognition-setting="offsetX"]`
- `[data-examlist-recognition-setting="offsetY"]`
- `.template-recognition-marks-overlay`
- `.template-recognition-mark.top-left`
- `.template-recognition-mark.top-right`
- `.template-recognition-mark.bottom-left`
- `.template-recognition-mark.bottom-right`

### `settings.otherRoomPage`

| field | 역할 |
|---|---|
| `enabled` | 타 고사실 페이지 사용 여부. 기본 false. |

본문 page에서만 사용 가능하다. cover에서는 강제로 false다.

### `settings.candidateBlockGrid`

수험생 데이터 블록은 본문 page에서만 사용한다.

| field | 단위 | 기본값 | clamp/값 |
|---|---|---:|---|
| `enabled` | boolean | false | boolean |
| `variant` | string | `photo` | 항상 `photo` |
| `blockTemplateHtml` | HTML | `<p><br></p>` | 빈 값이면 기본값 |
| `columns` | count | 2 | 1-4, 정수 |
| `rows` | count | 10 | 1-30, 정수 |
| `gapXPt` | pt | 4 | 0-48 |
| `gapYPt` | pt | 4 | 0-48 |
| `sortKey` | string | `examineeNo` | 지원 key만 허용 |
| `sortDirection` | string | `asc` | `asc` 또는 `desc` |
| `fillEmptyBlocks` | boolean | true | boolean |
| `xPt` | pt | 0 | 0-2000 |
| `yPt` | pt | 0 | 0-2000 |
| `widthPt` | pt | 0 | 0-2000 |
| `heightPt` | pt | 0 | 0-2000 |

Smoke 테스트 잔재 문자열인 `공통 블록`만 들어 있는 HTML은 저장 정규화에서 `<p><br></p>`로 되돌린다.

UI hook:

- `.examlist-candidate-block-grid-field`
- `[data-examlist-block-grid-setting="columns"]`
- `[data-examlist-block-grid-setting="rows"]`
- `[data-examlist-block-grid-setting="gapXPt"]`
- `[data-examlist-block-grid-setting="gapYPt"]`
- `[data-examlist-block-grid-setting="sortKey"]`
- `[data-examlist-block-grid-setting="sortDirection"]`
- `[data-examlist-block-grid-setting="fillEmptyBlocks"]`
- `[data-examlist-block-grid-create]`

지원 sort key:

- `designatedSort`
- `track`
- `admission`, `admissionCode`
- `series`, `seriesCode`
- `unit`, `unitCode`
- `major`, `majorCode`
- `date`
- `time`
- `endTime`
- `period`, `periodCode`
- `building`, `buildingCode`
- `room`, `roomCode`
- `examineeNo`
- `temporaryNo`
- `name`
- `birth`
- `group`
- `opt1`, `opt2`, `opt3`, `opt4`, `opt5`, `opt6`, `opt7`, `opt8`, `opt9`, `opt10`

지원 alias 예:

| alias | normalized |
|---|---|
| `candidate.examNo` | `examineeNo` |
| `candidate.name` | `name` |
| `candidate.birthDate` | `birth` |
| `candidate.examDate` | `date` |
| `candidate.examStartTime` | `time` |
| `candidate.examEndTime` | `endTime` |
| `candidate.roomName` | `room` |
| `candidate.roomCode` | `roomCode` |
| `candidate.departmentName` | `unit` |
| `candidate.departmentCode` | `unitCode` |

좌표 변환:

- CSS pixel per pt: `96 / 72`
- 최소 grid width: 120px
- 최소 grid height: 80px
- 일반 오브젝트 hit slop: 8px
- 수험생 블록 focus table outer hit slop: 24px

Resize handle:

- `bottom-right`
- `bottom`
- `bottom-left`
- `left`
- `top-left`
- `top`
- `top-right`
- `right`

## 7. 구조화 Element 모델

현재 편집기는 document HTML 중심이지만, 서버는 legacy/구조화 element를 계속 정규화한다.

지원 type:

- `text`
- `dataText`
- `image`
- `candidatePhoto`
- `table`
- `line`
- `rect`
- `ellipse`
- `checkbox`
- `signatureBox`
- `pageNumber`

Element 공통 field:

| field | 역할 |
|---|---|
| `id` | element id. 입력이 없으면 `element-${uuid}`. |
| `pageId` | 소속 page id. |
| `type` | element type. 유효하지 않으면 `text`. |
| `name` | 이름. 기본 `${type}-${index+1}`. |
| `x`, `y` | 좌표. 기본 x 40, y `40 + index * 12`. |
| `width`, `height` | 크기. type별 기본값과 최소값 적용. |
| `zIndex` | 쌓임 순서. 기본 `(index+1)*10`, 0-100000. |
| `locked` | 잠금 여부. 기본 false. |
| `visible` | 표시 여부. 기본 true. |
| `config` | type별 config. |

기본 크기:

| type | width | height | min width | min height |
|---|---:|---:|---:|---:|
| `candidatePhoto` | 96 | 128 | 48 | 48 |
| `checkbox` | 88 | 28 | 40 | 24 |
| `ellipse` | 120 | 72 | 24 | 24 |
| `image` | 140 | 120 | 40 | 40 |
| `line` | 180 | 8 | 24 | 2 |
| `pageNumber` | 100 | 28 | 48 | 24 |
| `rect` | 160 | 96 | 24 | 24 |
| `signatureBox` | 180 | 72 | 60 | 36 |
| `table` | 420 | 320 | 120 | 48 |
| `text` | 160 | 48 | 40 | 24 |

### Text config

`text`, `dataText`, `pageNumber`:

| field | 기본값 |
|---|---|
| `content` | 일반 text는 빈 문자열, pageNumber는 `{{page.current}} / {{page.total}}` |
| `style.color` | `#102445` |
| `style.fontFamily` | `Noto Sans KR` |
| `style.fontSize` | 일반 16, pageNumber 12 |
| `style.fontWeight` | 일반 500, pageNumber 600 |
| `style.lineHeight` | 1 |
| `style.textAlign` | 일반 left, pageNumber center |

### Table config

| field | 기본값 |
|---|---|
| `dataSource` | `candidates` |
| `repeat` | true |
| `columns` | 입력 columns 또는 수험번호 기본 1열 |
| `pagination.enabled` | true |
| `pagination.fillEmptyRows` | true |
| `pagination.headerHeight` | 32 |
| `pagination.repeatHeader` | true |
| `pagination.rowHeight` | 42 |
| `rowsPerPage` | tableHeight, headerHeight, rowHeight 기준 계산 |

Table column:

| field | 기본/허용 |
|---|---|
| `key` | 입력값 또는 `column_${index+1}` |
| `label` | 입력값 또는 `컬럼 N` |
| `type` | `text`, `photo`, `checkbox`; 기본 `text` |
| `align` | `left`, `center`, `right`; 기본 `center` |
| `format` | 문자열 |
| `width` | 기본 80, 20-1000 |

### Image config

`image`와 `candidatePhoto`:

| field | `image` 기본 | `candidatePhoto` 기본 |
|---|---|---|
| `alt` | 이미지 | 수험생 사진 |
| `src` | 입력값 | 항상 빈 문자열 |
| `fit` | contain | contain |
| `opacity` | 1 | 1 |
| `borderRadius` | 0 | 0 |
| `placeholderText` | 이미지 없음 | 사진 미등록 |

지원 fit:

- `contain`
- `cover`
- `fill`

### Shape/line config

Line:

- `direction`: `horizontal`, `vertical`, `diagonal-down`, `diagonal-up`
- `style.strokeColor`: `#516585`
- `style.strokeStyle`: `solid`, `dashed`, `dotted`
- `style.strokeWidth`: 기본 1.5, 0.5-24

Rect/Ellipse:

- `label`: 문자열
- `style.backgroundColor`: `transparent`
- `style.borderColor`: `#516585`
- `style.borderStyle`: `solid`
- `style.borderWidth`: 1.2
- `style.radius`: rect 기본 8, ellipse 기본 999

Checkbox:

- `checked`: 기본 false
- `label`: `확인`
- text align 기본 left

SignatureBox:

- `label`: `서명`
- `placeholderText`: `서명란`
- border style 기본 dashed

## 8. 편집기 화면 DOM 구조

최상위:

- `.template-editor-shell`
- `.template-editor-modal-sheet.examlist-template-editor-sheet`
- `#templateEditorRuntimeHost.template-editor-runtime-shell`

좌측 toolbar:

- `aside.editor-toolbar-column`
- `#templateEditorToolbarHost.editor-toolbar[role="toolbar"]`

데이터 태그 패널:

- `aside.template-tag-panel[aria-label="데이터 태그"]`
- `.template-tag-panel-heading`
- `[data-action="open-data-tag-sample-modal"]`
- `#templateTagStrip.editor-tag-catalog`

중앙 문서 surface:

- `section.template-editor-page.editor-canvas-column`
- `#templateEditorSurface.template-editor-surface.editor-paper.editor-document-surface`
- `data-page-id`
- `data-placeholder`
- `contenteditable="true"`는 `manageTemplates` 권한이 있을 때만 부여
- `#templateEditorOverflowStatus`

우측 속성:

- `aside.template-page-properties-column`
- `#templatePagePropertiesPanel.template-page-properties-panel`
- footer `.editor-sidebar-footer`
- `[data-action="save-template-layout"]`
- `[data-action="open-template-preview"]`

Modal:

- `.editor-preview-modal`
- `[data-action="close-template-preview"]`
- `.editor-preview-frame[src]`
- 데이터 태그 샘플/빈 값 modal
- 생성 단위 설정 modal
- 바코드/QR 소스 선택 modal

## 9. Toolbar 명세

Toolbar는 `renderDocumentToolbar(access)`로 생성된다.

### 서식 group

글꼴 select:

- id: `templateEditorFontFamily`
- selector: `[data-editor-document-command-select="fontName"]`
- 기본: `'Noto Sans KR', sans-serif`
- option은 `renderFontFamilyOptions`에서 생성한다.

글꼴 크기:

- input id: `templateEditorFontSize`
- 직접 입력은 numeric text.
- toggle: `[data-action="toggle-document-font-size-menu"][data-font-size-input="templateEditorFontSize"]`
- menu id: `templateEditorFontSizeMenu`
- preset: 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 48, 56, 64, 72
- clamp: 1-72

줄 간격:

- section class: `.examlist-line-height-control`
- input class: `.template-toolbar-line-height-input`
- 기본: 1
- min: 0
- max: 5
- step: 0.1
- 적용 값: 0이면 `line-height: 1`, 그 외 `line-height: calc(1em + Npt)`
- block tag에는 `margin-top: 0`, `margin-bottom: Npt`도 함께 적용한다.

스타일 command:

| 버튼 | action | command |
|---|---|---|
| 굵게 | `apply-document-command` | `bold` |
| 기울임 | `apply-document-command` | `italic` |
| 밑줄 | `apply-document-command` | `underline` |
| 목록 | `apply-document-command` | `insertUnorderedList` |

정렬 command:

| 버튼 | command |
|---|---|
| 왼쪽 정렬 | `justifyLeft` |
| 가운데 정렬 | `justifyCenter` |
| 오른쪽 정렬 | `justifyRight` |
| 배분정렬 | `justifyFull` |

색상 preset:

| label | value |
|---|---|
| 기본 검정 | `#000000` |
| 차콜 | `#334155` |
| 파랑 | `#1d4ed8` |
| 청록 | `#0f766e` |
| 초록 | `#15803d` |
| 마젠타 | `#ff00ff` |
| 주황 | `#c2410c` |
| 빨강 | `#b91c1c` |
| 보라 | `#7c3aed` |
| 흰색 | `#ffffff` |

색상 입력:

- 글자색 input id: `templateEditorTextColor`, command `foreColor`, fallback `#000000`
- 음영 input id: `templateEditorTextShading`, command `hiliteColor`, fallback `#fff59d`
- 셀 음영 input id: `templateEditorCellShading`, table action `apply-cell-shading`, fallback `#ffffff`

### 표 group

삽입:

- 표 삽입 popover
- 행 기본 3, 열 기본 2
- row UI는 1-20
- column UI는 1-8

Table action:

| action | `data-table-action` |
|---|---|
| 위에 행 추가 | `insert-row-before` |
| 아래에 행 추가 | `insert-row-after` |
| 왼쪽에 열 추가 | `insert-column-before` |
| 오른쪽에 열 추가 | `insert-column-after` |
| 행 삭제 | `delete-row` |
| 열 삭제 | `delete-column` |
| 선택 셀 병합 | `merge-selection` |
| 셀 분할 | cell split popover |
| 열 너비 맞춤 | `equalize-column-widths` |
| 행 높이 맞춤 | `equalize-row-heights` |
| 셀 위쪽 정렬 | `cell-vertical-align-top` |
| 셀 가운데 정렬 | `cell-vertical-align-middle` |
| 셀 아래쪽 정렬 | `cell-vertical-align-bottom` |

### 삽입 group

| 버튼 | action |
|---|---|
| 이미지 삽입 | `insert-document-image` |
| 바코드 삽입 | `insert-document-barcode` |
| QR코드 삽입 | `insert-document-qrcode` |
| 구분선 | `insert-document-divider` |

파일 input:

- id: `templateEditorImageInput`
- class: `.upload-file-input`
- accept: `image/*`

## 10. 데이터 태그 명세

API:

- `GET /api/pdf-data-tags?schoolId=...`

클라이언트는 서버 catalog를 받은 뒤 fallback definition과 합쳐 6개 accordion group으로 재배치한다.

숨김 태그:

- `school.academicYear`
- `candidate.designatedSort`
- label이 `학년도`인 태그

Group:

| group id | label | keys |
|---|---|---|
| `school` | 학교 정보 | `school.name`, `school.code`, `candidate.campusName`, `candidate.campusCode` |
| `exam` | 시험 정보 | `candidate.admissionYear`, `candidate.admissionRoundName`, `candidate.admissionTypeName`, `candidate.admissionTypeCode`, `candidate.seriesName`, `candidate.seriesCode`, `candidate.departmentName`, `candidate.departmentCode`, `candidate.majorName`, `candidate.majorCode` |
| `schedule` | 시험 일정 | `candidate.examDate`, `candidate.examStartTime`, `candidate.examEndTime`, `candidate.periodName`, `candidate.periodCode` |
| `site` | 고사장 정보 | `candidate.buildingName`, `candidate.buildingCode`, `candidate.roomName`, `candidate.roomCode`, `room.assignedCount`, `room.otherRoom` |
| `candidate` | 수험생 정보 | `candidate.examNo`, `candidate.name`, `candidate.birthDate`, `candidate.temporaryNo`, `candidate.groupName`, `candidate.photo` |
| `etc` | 기타 | `candidate.opt1`, `candidate.opt2`, `candidate.opt3`, `candidate.opt4`, `candidate.opt5`, `candidate.opt6`, `candidate.opt7`, `candidate.opt8`, `candidate.opt9`, `candidate.opt10` |

Tag button:

- class: `.editor-tag-button.template-tag-button`
- action: `[data-action="insert-data-tag"]`
- key: `data-tag-key`
- label: `data-tag-label`
- disabled: `manageTemplates` 권한이 없을 때

삽입된 token DOM:

- `.template-token[data-template-tag-value]`
- `contenteditable=false`
- 아이콘/라벨 또는 샘플 표시 설정에 따라 표시 텍스트가 달라진다.

LocalStorage key:

- `examlist.templateEditor.dataTagSampleValues.v1`
- `examlist.templateEditor.dataTagEmptyValueData.v1`
- `examlist.templateEditor.dataTagViewOptions`

저장 시 `layout.dataTagSettings.sampleData`와 `layout.dataTagSettings.emptyValueData`에 반영된다.

## 11. 바코드와 QR 생성 개체

지원 type:

- `barcode`
- `qrcode`

기본값:

| type | class | label | width | height |
|---|---|---|---:|---:|
| `barcode` | `template-generated-object-barcode` | 수험번호 바코드 | 240 | 72 |
| `qrcode` | `template-generated-object-qrcode` | 수험번호 QR코드 | 112 | 112 |

기본 source:

- `candidate.examNo`

Source alias 예:

| source | aliases |
|---|---|
| `candidate.examNo` | `candidate.examNo`, `examNo`, `examineeNo` |
| `candidate.temporaryNo` | `candidate.temporaryNo`, `temporaryNo` |
| `candidate.name` | `candidate.name`, `name` |
| `candidate.birthDate` | `candidate.birthDate`, `birth` |
| `candidate.examStartTime` | `candidate.examStartTime`, `time`, `session` |
| `candidate.examEndTime` | `candidate.examEndTime`, `endTime`, `examEndTime` |
| `candidate.admissionRoundName` | `candidate.admissionRoundName`, `candidate.examName`, `exam`, `track` |
| `candidate.admissionTypeCode` | `candidate.admissionTypeCode`, `candidate.applicationNo`, `admissionCode` |
| `candidate.roomCode` | `candidate.roomCode`, `candidate.roomId`, `roomCode` |
| `room.assignedCount` | `room.assignedCount`, `assignedCount`, `room.count` |
| `candidate.photo` | `candidate.photo`, `photo`, `photoUrl`, `photoFileId` |

Preview value는 `generatedObjectPreviewValues`의 샘플값을 사용한다. 예를 들어 `candidate.examNo`는 `123100001`, `school.name`은 `한국대학교`, `room.assignedCount`는 `24`다.

## 12. 수험생 데이터 블록 런타임

수험생 데이터 블록은 page당 하나의 grid object로 취급된다.

주요 구성:

- source block: 사용자가 편집하는 원본 블록.
- preview/mirror block: source block HTML을 복제해 grid 내 다른 칸에 표시.
- focus editor: 더블클릭/확대 편집 layer에서 source block 내용을 편집.
- table normalizer: 블록 내부 table의 크기와 overflow를 계산하고 정규화.
- selection/resize session: grid object 선택, drag, resize 상태를 관리.

동작:

- 생성 버튼은 본문 page에서만 활성화된다.
- 생성 시 `candidateBlockGrid.enabled`가 true가 되고, object DOM이 문서에 삽입된다.
- 사용자가 source block을 편집하면 `blockTemplateHtml`에 반영되고 mirror block이 동기화된다.
- Delete/Backspace는 선택된 grid object 또는 선택된 이미지/개체 삭제에 사용된다.
- 저장 시 active focus editor가 열려 있으면 먼저 overflow 검증과 sync를 수행한다.
- 데이터 블록 영역을 초과하면 저장이 차단되고 `documentOverflowMessage`가 표시된다.

저장 차단 메시지:

- `데이터 블록 영역을 초과한 상태에서는 저장할 수 없습니다. 저장 전 내용이나 개체 크기를 조정하세요.`

## 13. 편집기 저장 흐름

`saveTemplateLayout()` 단계:

1. `manageTemplates` 권한과 현재 템플릿 존재 여부 확인.
2. 수험생 블록 focus editor가 열려 있으면 active editor를 sync하고 overflow를 검증.
3. runtime HTML을 appState로 동기화한다.
4. runtime sync가 실패하면 현재 page surface를 직접 `settings.documentHtml`로 동기화한다.
5. `hasDocumentOverflow`가 true이면 저장을 중단하고 overflow 메시지를 표시한다.
6. data tag sample/empty value를 `layout.dataTagSettings`에 적용한다.
7. `isSaving`을 true로 바꾸고 `PATCH /api/pdf-templates/:templateId` 호출.
8. 성공 시 `isDirty=false`, `savedTemplateSnapshot` 갱신, 선택 page 보정, 양식 목록/summary reload.
9. 실패 시 toast error 표시.
10. 완료 후 runtime refresh.

일반 문서 overflow 저장 차단 메시지:

- `A4 용지 영역을 초과한 상태에서는 저장할 수 없습니다. 저장 전 내용 길이를 줄이세요.`

## 14. 미리보기 흐름

`openTemplatePreview()` 단계:

1. `previewTemplates` 권한 확인.
2. runtime HTML을 appState로 동기화.
3. `isPreviewOpen=true`, `isPreviewLoading=true`.
4. data tag sample/empty value payload 생성.
5. `POST /api/pdf-preview/pdf` 호출.
6. 성공 시 `previewPdfUrl`, `previewPageCount`, `previewCandidateCount` 저장.
7. 실패 시 `previewErrorMessage` 저장, `previewHtml`과 `previewPdfUrl` 초기화, error toast 표시.
8. modal iframe `src`에 `previewPdfUrl` 표시.

미리보기 sample limit:

- 60

## 15. 편집기 페이지 속성 패널

Page tab:

- container: `.editor-page-tabs.editor-page-tabs-segmented`
- button: `.editor-page-tab`
- action: `[data-action="select-editor-page"]`
- page id: `data-page-id`
- label: page name
- small: page type label

Template field:

- `[data-editor-template-field="paperPreset"]`
- `[data-editor-template-field="orientation"]`
- `[data-editor-template-field="generationUnit"]`

Page field:

- `[data-editor-page-field="enabled"]`: cover page 사용 switch
- `[data-editor-page-field="name"]`: page name
- `[data-editor-page-field="repeatable"]`: 반복 출력

Margin field:

- `[data-editor-page-margin-field="top"]`
- `[data-editor-page-margin-field="right"]`
- `[data-editor-page-margin-field="bottom"]`
- `[data-editor-page-margin-field="left"]`

생성 단위 option:

| value | label |
|---|---|
| `admissionCode` | 전형 |
| `seriesCode` | 계열 |
| `examDate` | 시험날짜 |
| `periodCode` | 교시 |
| `unitCode` | 모집단위 |
| `buildingCode` | 고사건물 |
| `roomCode` | 고사실 |
| `group` | 조 |
| `custom` | 사용자 지정 |

Legacy alias:

| legacy | normalized |
|---|---|
| `admission` | `admissionCode` |
| `exam` | `examDate` |
| `room` | `roomCode` |
| `unit` | `unitCode` |

## 16. Runtime 패키지 역할

`client/template-editor-runtime/`는 앱과 분리된 독립 runtime처럼 동작한다.

핵심 파일:

| 파일 | 역할 |
|---|---|
| `loader.js` | runtime asset 로드. |
| `template-editor-runtime.js` | public entry. |
| `template-editor-runtime-api.js` | 외부 API. |
| `template-editor-runtime-core.js` | core dependency 확인과 초기화. |
| `template-editor-runtime-factory.js` | runtime instance 생성. |
| `template-editor-runtime-wiring.js` | toolbar/event/selection 연결. |
| `template-editor-events.js` | click/input/change/pointer/keyboard event controller. |
| `template-editor-runtime-context.js` | state/context/options 생성. |
| `template-editor-runtime-composition.js` | IME composition handling. |

앱과 runtime 사이의 핵심 계약:

- 앱은 `#templateEditorSurface`와 `#templateEditorToolbarHost`를 제공한다.
- runtime은 contenteditable HTML, selection, command, table, image, generated object, candidate block 상태를 관리한다.
- 앱은 저장/미리보기/페이지 전환 전에 runtime의 HTML을 state로 동기화한다.
- runtime은 overflow 상태를 앱의 `templateEditor.hasDocumentOverflow`, `documentOverflowMessage`에 반영한다.

## 17. 입력 이벤트와 IME 처리

Form event 처리:

- `selectionchange`: 문서 selection 기억, toolbar 상태 refresh.
- `compositionstart`: surface composition state true.
- `compositionend`: composition sync 예약.
- `input`: 문서 surface 입력 시 page HTML sync. IME composing 중이면 지연.
- `focusout`: surface를 벗어날 때 page HTML sync.
- `change`: font family, font size, color picker, template/page/page margin field 적용.

수험생 블록 focus editor 내부 이벤트는 일반 문서 surface 이벤트에서 제외한다.

## 18. Unsaved guard

`templateEditor.isDirty`가 true일 때 guard 대상:

- route 이동.
- browser history 이동.
- browser unload.
- page tab 변경.
- 편집 화면 이탈.

변경 취소는 `savedTemplateSnapshot` deep clone을 현재 template로 되돌리고 runtime/history/session 상태를 초기화한다.

## 19. 서버 preview/render 연동

편집기의 HTML은 PDF preview/render 단계에서 다음 모듈을 거친다.

| 모듈 | 역할 |
|---|---|
| `server/modules/pdf-preview/renderer.js` | 전체 preview HTML 생성. |
| `renderer-document-page.js` | page 단위 HTML 생성. |
| `renderer-page-settings.js` | page number, recognition marks, other room page 적용. |
| `candidate-block-grid-renderer.js` | 수험생 블록 반복 렌더링. |
| `generated-objects.js` | barcode/QR 렌더링. |
| `tokens.js` | 데이터 태그 치환. |
| `token-formatters.js` | 날짜/시간/번호 등 포맷. |
| `token-expressions.js` | 기본값/조건식/포맷 식 처리. |
| `token-maps.js` | school/candidate/room token mapping. |

## 20. 이식 체크리스트

- 편집기 view renderer, actions, runtime adapter를 함께 옮긴다.
- `client/template-editor-runtime/**` 전체와 runtime CSS를 함께 옮긴다.
- `server/modules/pdf-templates/layout*.js` 정규화 규칙을 유지한다.
- `server/modules/pdf-preview/**`와 PDF 생성 preview 저장소를 함께 옮겨야 저장된 HTML을 실제 PDF preview로 볼 수 있다.
- data tag catalog와 token mapping을 같이 옮긴다.
- `appState.templateEditor` slice를 그대로 준비한다.
- `manageTemplates`, `previewTemplates`, `viewTemplates` 권한 key를 유지한다.
- 저장 전 runtime sync와 overflow guard를 반드시 호출한다.
- page settings는 cover page에서 일부 기능이 강제로 false가 되는 서버 정규화 규칙을 유지한다.
