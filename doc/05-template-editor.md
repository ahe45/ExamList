# 양식 편집기 명세

이 문서는 화면 중심 명세다. 실제 layout JSON, runtime module, page setting 정규화, toolbar command, 수험생 블록 내부 동작까지 포함한 구현 수준 세부 명세는 [양식 레이아웃과 편집기 런타임 상세 명세](14-template-layout-editor-deep-dive.md)를 함께 본다.

## 파일

- View renderer: `client/features/template-editor/renderers.js`
- Actions: `client/features/template-editor/actions.js`
- Runtime adapter: `client/features/template-editor/editor-runtime-adapter.js`
- Runtime loader: `client/template-editor-runtime/loader.js`
- CSS: `styles/features/template-editor.css`
- 서버 템플릿: `server/modules/pdf-templates/`
- 서버 미리보기: `server/modules/pdf-preview/`
- 서버 데이터 태그: `server/modules/pdf-data-tags/`

## URL

- `/templates/:templateId/edit`
- `/schools/:schoolId/templates/:templateId/edit`

## 접근 조건

- 조회: `viewTemplates`.
- 편집/저장: `manageTemplates`.
- 미리보기: `previewTemplates`.

## 전체 레이아웃

`template-editor-shell`은 3열 구조이다.

### 좌측 도구 열

- DOM id: `templateEditorToolbarHost`.
- 편집 도구 toolbar를 렌더링.
- 권한이 없으면 읽기 전용 안내를 표시.

### 데이터 태그 패널

- 제목: `데이터 태그`.
- 설정 gear 버튼.
- 검색 input.
- 그룹 accordion.
- 태그 버튼.
- 표시 옵션:
  - 아이콘 표시.
  - 샘플데이터로 표시.

### 중앙 문서 표면

- DOM id: `templateEditorSurface`.
- class: `template-editor-surface editor-paper editor-document-surface`.
- `contenteditable` 기반 편집 영역.
- placeholder: `용지 위에 제목, 본문, 표, 이미지, 데이터 태그를 자유롭게 배치하세요.`
- 실제 저장 데이터는 주로 `page.settings.documentHtml`.

### 우측 속성 패널

- DOM id: `templatePagePropertiesPanel`.
- 페이지 목록과 페이지 설정.
- 저장 버튼.
- 미리보기 버튼.
- overflow warning.

### 전역 모달

- 템플릿 PDF 미리보기 모달.
- 데이터 태그 샘플/빈 값 설정 모달.
- 생성 단위 설정 모달.
- 바코드/QR 데이터 소스 선택 모달.

## 편집 toolbar

### 서식 그룹

- 글꼴 select
  - 기본: `'Noto Sans KR', sans-serif`.
  - 맑은 고딕.
  - 나눔고딕.
  - 나눔명조.
  - 바탕.
- 크기 input.
- 크기 preset menu
  - 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 48, 56, 64, 72 pt.
- Bold.
- Italic.
- Underline.
- 글머리 목록.
- 정렬
  - 왼쪽.
  - 가운데.
  - 오른쪽.
  - 양쪽.
  - 배분정렬.
- 글자색.
- 음영색.
- 색상 preset
  - 기본 검정 `#152033`.
  - 차콜 `#334155`.
  - 파랑 `#1d4ed8`.
  - 청록 `#0f766e`.
  - 초록 `#15803d`.
  - 마젠타 `#ff00ff`.
  - 주황 `#c2410c`.
  - 빨강 `#b91c1c`.
  - 보라 `#7c3aed`.
  - 흰색 `#ffffff`.

### 표 그룹

- 표 삽입 popover
  - 행 1에서 20.
  - 열 1에서 8.
  - 기본 3행 2열.
- 행 추가
  - 위.
  - 아래.
- 열 추가
  - 왼쪽.
  - 오른쪽.
- 행 삭제.
- 열 삭제.
- 선택 셀 병합.
- 셀 분할
  - 방향: 행 또는 열.
  - 개수: 최소 2.
- 열 너비 균등.
- 행 높이 균등.
- 셀 세로 정렬
  - 위.
  - 가운데.
  - 아래.
- 셀 음영색.

### 삽입 그룹

- 이미지 삽입.
- 바코드 삽입.
- QR 삽입.
- 구분선 삽입.

### 오브젝트 toolbar

이미지, 바코드, QR, 테이블, 수험생 블록 선택 시 활성화된다.

- width/height px 입력.
- 정렬
  - 좌측.
  - 중앙 X.
  - 우측.
  - 상단.
  - 중앙 Y.
  - 하단.
  - 가로 분배.
  - 세로 분배.
- 정렬 기준
  - canvas.
  - 선택 오브젝트 묶음.

## 페이지 속성 패널

### 페이지 목록

- 표지.
- 본문.
- 부록.
- 고정 페이지.
- `sortOrder` 기준 정렬.

### 용지 설정

- paper preset
  - A4: 595.28 x 841.89 pt.
  - A3.
  - B4.
  - B5.
  - Letter.
  - Legal.
  - Custom.
- orientation
  - 세로.
  - 가로.
- margin
  - top, right, bottom, left.
  - 0에서 240 pt.
- safeArea
  - 실제 내용 안전 영역.

### 표지 설정

- 표지 사용 switch.
- 표지가 disabled이면 표지 편집 surface와 세부 컨트롤이 비활성화된다.

### 본문 설정

- 반복 출력 여부.
- 페이지 번호 표시.
- 페이지 번호 preset
  - `1/1`
  - `페이지 1/1`
  - `Page1/1`
  - `1페이지`
  - `1쪽`
  - `1페이지 중 1페이지`
  - `1쪽 중 1쪽`
- 타 고사실 페이지 사용 switch.
- 인식 기준값 switch.
  - X/Y margin 기본 5mm 수준.
  - 네 모서리 기준 mark overlay 표시.

## 수험생 데이터 블록

본문 페이지에서 사용한다.

### 컨트롤

- columns: 1에서 4.
- rows: 1에서 30.
- gapX/gapY: 0에서 48 pt.
- sort key.
- sort direction: asc 또는 desc.
- 빈 블록까지 표시.
- 생성 버튼.

### 정렬 key

- 지정정렬.
- 모집시기.
- 전형/전형코드.
- 계열/계열코드.
- 모집단위/모집단위코드.
- 전공/전공코드.
- 시험날짜.
- 시작시간.
- 종료시간.
- 교시/교시코드.
- 고사건물/고사건물코드.
- 고사실/고사실코드.
- 수험번호.
- 가번호.
- 이름.
- 생년월일.
- 조.
- OPT1에서 OPT5.

### 동작

- 페이지당 하나의 수험생 블록 grid를 생성한다.
- `contenteditable=false` 오브젝트로 문서에 삽입된다.
- 이동과 크기 조절이 가능하다.
- 첫 번째 source block을 편집하면 mirror block이 동기화된다.
- Delete 키로 선택 오브젝트를 삭제한다.

## 데이터 태그

API:

- `GET /api/pdf-data-tags?schoolId=...`

서버 catalog 원본 그룹:

- `학교 설정`: `school.name`, `school.code`.
- `수험생 데이터 컬럼`: 수험생 관련 `candidate.*` 태그.
- `고사장 정보`: `room.assignedCount`, `room.otherRoom`.

클라이언트는 서버 catalog를 평탄화한 뒤 `dataTagAccordionGroups` 설정으로 아래 6개 accordion 그룹에 다시 배치한다. 서버 응답에 일부 태그가 없으면 fallback definition으로 보강한다.

### 그룹과 태그

학교 정보:

- `school.name`
- `school.code`
- `candidate.campusName`
- `candidate.campusCode`

시험 정보:

- `candidate.admissionYear`
- `candidate.admissionRoundName`
- `candidate.admissionTypeName`
- `candidate.admissionTypeCode`
- `candidate.seriesName`
- `candidate.seriesCode`
- `candidate.departmentName`
- `candidate.departmentCode`
- `candidate.majorName`
- `candidate.majorCode`

시험 일정:

- `candidate.examDate`
- `candidate.examStartTime`
- `candidate.examEndTime`
- `candidate.periodName`
- `candidate.periodCode`

고사장 정보:

- `candidate.buildingName`
- `candidate.buildingCode`
- `candidate.roomName`
- `candidate.roomCode`
- `room.assignedCount`
- `room.otherRoom`

수험생 정보:

- `candidate.examNo`
- `candidate.name`
- `candidate.birthDate`
- `candidate.temporaryNo`
- `candidate.groupName`
- `candidate.photo`

기타:

- `candidate.opt1`
- `candidate.opt2`
- `candidate.opt3`
- `candidate.opt4`
- `candidate.opt5`

클라이언트에서 숨기는 태그:

- `school.academicYear`.
- `candidate.designatedSort`.

### 태그 DOM

- `.template-token[data-template-tag-value]`.
- `contenteditable=false`.
- 아이콘과 label 또는 샘플 데이터 표시.

### 데이터 태그 설정 모달

- 각 태그별 샘플 데이터.
- 각 태그별 빈 값 데이터.
- 기본값 복원.
- 저장.
- localStorage key:
  - `examlist.templateEditor.dataTagSampleValues.v1`
  - `examlist.templateEditor.dataTagEmptyValueData.v1`
  - `examlist.templateEditor.dataTagViewOptions`

## 저장과 미리보기

### 저장

- Runtime HTML을 `page.settings.documentHtml`로 동기화.
- API: `PATCH /api/pdf-templates/:templateId`.
- 저장 시 version snapshot 생성.

### 미리보기

- 편집기 PDF 미리보기: `POST /api/pdf-preview/pdf`.
- 템플릿 HTML 미리보기 API: `POST /api/pdf-preview`. PDF 생성 모달의 템플릿 preview와 서버 내부 HTML 렌더링 검증에 사용한다.
- PDF 생성 첫 대상 미리보기: `POST /api/pdf-generations/preview`.
- 편집기 미리보기 결과는 응답의 `pdfUrl`을 iframe `src`로 표시한다.

## Unsaved guard

편집 화면에서 `templateEditor.isDirty`가 true이면 다음 동작 전 prompt가 뜬다.

- 다른 화면 이동.
- browser 뒤로/앞으로 이동.
- 편집기 페이지 전환.
- browser unload.
