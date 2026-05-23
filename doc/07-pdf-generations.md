# PDF 생성 명세

## 파일

- 목록 renderer: `client/features/pdf-generations/pdf-generation-history-renderer.js`
- 테이블 모델: `client/features/pdf-generations/pdf-generation-table-model.js`
- 생성 모달: `pdf-generation-create-modal-renderer.js`, `pdf-generation-create-modal-actions.js`
- 진행 오버레이: `pdf-generation-progress-renderer.js`
- 다운로드 모달: `pdf-generation-download-modal-renderer.js`
- 결과 처리 모달: `pdf-generation-generated-result-modal-renderer.js`
- 삭제 확인 모달: `pdf-generation-delete-confirm-renderer.js`
- 서버 route: `server/http/routes/pdf-generations.js`
- 서버 service: `server/modules/pdf-generations/`

## URL

- `/templates/:templateId/pdf-generations`
- `/schools/:schoolId/pdf-generations`

## 접근 조건

- 조회: `viewGenerations`.
- 생성/삭제/재생성/중단: `generatePdfs`.
- 다운로드/인쇄: `downloadPdfs`.
- 미리보기: `previewTemplates`.

## PDF 생성 목록 화면

Header:

- 제목: `PDF 생성`.
- 설명: 생성된 수험생확인대장을 확인하고 다운로드, 인쇄, 재생성을 관리.
- 선택 n건 badge.
- 일괄 다운로드 버튼
  - completed 선택 항목이 있어야 활성.
  - `downloadPdfs` 필요.
- PDF 생성 버튼
  - `generatePdfs` 필요.
- 선택 PDF 삭제 icon 버튼
  - completed 선택 항목이 있어야 활성.
  - `generatePdfs` 필요.
- 새로고침 버튼.

테이블:

- 선택 checkbox 컬럼.
- 데이터 컬럼.
- 인쇄 컬럼.
- 상세 컬럼.

컬럼:

- 순서.
- 캠퍼스.
- 모집시기.
- 전형.
- 계열.
- 모집단위.
- 전공.
- 시험날짜.
- 시작시간.
- 종료시간.
- 교시.
- 고사건물.
- 고사실.
- 조.
- 페이지 수.
- 수험생 수.
- 생성일시.

선택:

- completed row만 checkbox 표시.
- select all은 현재 필터 결과 중 completed rows 기준.

인쇄:

- `downloadPdfs` 권한과 `printUrl`이 있으면 inline PDF 다운로드 URL 사용.
- URL 형태: `/api/pdf-generations/:generationId/download?disposition=inline`.

## PDF 생성 모달

제목: `PDF 생성하기`.

### Step 구성

1. 양식.
2. 캠퍼스.
3. 모집시기.
4. 전형.
5. 계열.
6. 모집단위.
7. 전공.
8. 시험날짜.
9. 시작시간.
10. 종료시간.
11. 교시.
12. 고사건물.
13. 고사실.
14. 조.

항상 요구되는 선택:

- 캠퍼스.
- 모집시기.
- 전형.

### 필터 표시 규칙

- 생성 단위에 따라 필요한 필터까지만 단계적으로 표시한다.
- `series`까지는 생성 단위와 무관하게 최소 확장 범위에 포함된다.
- 캠퍼스, 모집시기, 전형은 독립 선택 key로 관리된다.
- 전형 선택 이후 하위 단계가 순차적으로 열린다.

### 생성 단위와 마지막 주요 필터

| generationUnit | target filter |
| --- | --- |
| `admission`, `admissionCode` | 전형 |
| `seriesCode` | 계열 |
| `unit`, `unitCode` | 모집단위 |
| `exam`, `examDate` | 시험날짜 |
| `periodCode` | 교시 |
| `buildingCode` | 고사건물 |
| `room`, `roomCode` | 고사실 |
| `group` | 조 |
| `all`, `custom` | 전체 또는 사용자 지정 fields |

### 양식 선택 영역

- 템플릿 select.
- 미리보기 icon.
- 메타 badge:
  - 용지 속성.
  - 표지 사용.
  - 수험생 블록 정렬.
  - 생성 단위.
  - 타 고사실 사용.

### 필터 option

- API: `GET /api/candidates/filter-options`.
- option label에 candidateCount 표시.
- 선택하지 않음 placeholder.
- 전체 옵션.

### 요약

- 생성 PDF 수.
- 대상 수험생 수.
- `/api/pdf-generations/targets` 결과로 추정.

### 버튼

- 이전.
- 다음.
- 미리보기.
- 취소.
- PDF 생성.

## PDF 생성 요청 흐름

1. 사용자가 템플릿 선택.
2. 클라이언트가 현재 학교 템플릿 목록 로드.
3. 필터 option 로드.
4. 필터 선택 시 하위 필터 초기화.
5. `/api/pdf-generations/targets`로 target estimate 갱신.
6. 미리보기 클릭 시 `/api/pdf-generations/preview`.
7. PDF 생성 클릭 시 `/api/pdf-generations/batch/jobs`.
8. 서버가 batch row 생성.
9. 각 target 또는 chunk를 PDF generation job으로 enqueue.
10. 클라이언트가 `/api/pdf-generations/batches/:batchId`를 polling.
11. 완료 시 생성 결과 목록 refresh.
12. 새로 생성된 PDF가 2개 이상이면 결과 처리 모달 표시 가능.

## 진행 오버레이

요소:

- spinner.
- label.
- progress percent.
- 중단 버튼.
- progress bar.
- 진행 n개 / 총 n개.
- 경과 시간 / 예상 시간.

상태:

- queuedCount.
- runningCount.
- succeededCount.
- failedCount.
- totalRequested.
- progressPercent.
- canCancel.
- isCancelling.

중단:

- API: `POST /api/pdf-generations/batches/:batchId/cancel`.

## 일괄 다운로드 모달

제목: `일괄 다운로드`.

대상:

- 선택한 completed PDF.

모드:

- 병합 다운로드
  - 선택 PDF를 하나의 PDF로 병합.
  - API: `POST /api/pdf-generations/merge`.
  - 다운로드 URL: `/api/pdf-generations/merged/:mergedId/download`.
- 개별 다운로드
  - PDF 파일들을 ZIP으로 묶음.
  - API: `POST /api/pdf-generations/archive`.
  - 다운로드 URL: `/api/pdf-generations/archives/:archiveId/download`.

## 생성 결과 처리 모달

PDF 생성 완료 후 이번 batch의 생성 PDF들을 바로 다운로드할 수 있는 모달이다.

모드:

- 병합 다운로드.
- 개별 ZIP 다운로드.

조건:

- generationIds가 2개 이상이어야 다운로드 버튼 활성.

## 선택 PDF 삭제 모달

표시 정보:

- 삭제 대상 건수.
- 총 페이지 수.
- 수험생 수.
- 파일 크기.
- 대상 list:
  - targetName 또는 fileName.
  - pageCount.
  - candidateCount.

API:

- `DELETE /api/pdf-generations`
- body: `{ generationIds: [...] }`

## PDF 생성 상세 페이지와 모달

URL:

- `/schools/:schoolId/pdf-generations/:generationId`
- `/templates/:templateId/pdf-generations/:generationId`

Header:

- kicker: `생성 이력 상세`.
- 제목: fileName 또는 `PDF 생성 결과`.
- 목록 버튼.
- 새로고침 버튼.

Toolbar:

- 상태 badge.
- queued/running이면 진행률 badge.
- 생성 단위 badge.
- 대상명 badge.
- PDF 다운로드 버튼.
- 재생성 버튼.
- 템플릿 열기 버튼.

문서 정보 card:

- 생성일시.
- 파일 크기.
- 페이지 수.
- 수험생 수.
- 시도 횟수.

요청 정보 card:

- 생성 단위.
- 대상명.
- 재생성 가능 여부.
- 요청 스냅샷 저장 여부.

템플릿 스냅샷 card:

- 템플릿명.
- 용지.
- 방향.
- 페이지 수.

기타:

- 요청 필터.
- 경고.
- 오류.
- 최근 재생성 summary.

## PDF 작업 로그 페이지

URL:

- `/schools/:schoolId/pdf-history`

Header:

- 제목: `PDF 작업 로그`.
- 설명: PDF 생성, 병합, ZIP 다운로드, 삭제, 재생성 같은 작업 기록을 시간순으로 확인.
- 총 n건 badge.
- 새로고침 버튼.

테이블:

- 순번.
- 작업 내용.
- 대상.
- 상태.
- 처리 내역.
- 일시.

상태 badge:

- completed: active.
- queued/running: neutral.
- 그 외: danger.

필터/정렬/페이지네이션:

- 수험생/PDF 목록과 동일한 UX.
- page size: 10, 30, 50, 100, 500, 1000, 2000, 모두 표시.
- 기본 정렬: createdAt desc.

API:

- `GET /api/pdf-generations/audit-logs?limit=...`

## 서버 내부 흐름

주요 모듈:

- `service.js`: PDF generation service 조립.
- `targets.js`: 생성 단위별 대상 산출 전략.
- `batch-target-resolution.js`: 배치 생성 요청에서 템플릿, 학교, target, generationUnit 해석.
- `batch-orchestrator.js`: 배치 row 생성, chunk plan 생성, job enqueue.
- `generation-runner.js`: 단일 PDF 생성 실행.
- `browser-renderer.js`: HTML을 PDF로 렌더링.
- `queue-service.js`: BullMQ 또는 memory queue 선택.
- `queue-lifecycle.js`: 큐 작업 처리.
- `batch-status-service.js`: 배치 진행률 refresh.
- `history-service.js`: 이력 조회, 삭제, 재생성, 파일 제공.
- `archive-service.js`: ZIP과 merged PDF 생성.
- `snapshots.js`: 생성 요청 snapshot 생성/복원.

생성 대상 strategy:

- `admission`, `admissionCode`: admissionCode로 group.
- `seriesCode`: seriesCode로 group.
- `unit`, `unitCode`: unitCode로 group.
- `exam`, `examDate`: examDate로 group.
- `periodCode`: periodCode로 group.
- `buildingCode`: buildingCode로 group.
- `room`, `roomCode`: roomCode로 group.
- `group`: groupName으로 group.
- `all`, `custom`, 빈 값: 전체 대상.

Chunk:

- target별 candidateCount를 기준으로 chunk 생성.
- 기본 chunk size는 `PDF_GENERATION_CHUNK_SIZE`, 기본 500.
- batch progress는 completed와 failed 합계를 totalRequested로 나눈 값이다.
