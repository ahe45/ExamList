# 데이터 삭제 명세

## 파일

- 카드 renderer: `client/features/data-deletion/summary-card-renderer.js`
- 모달 renderer: `client/features/data-deletion/modal-renderer.js`
- 필터 renderer: `client/features/data-deletion/filter-step-renderer.js`
- 템플릿 선택 renderer: `client/features/data-deletion/template-selection-renderer.js`
- 확인 모달: `client/features/data-deletion/confirmation-renderer.js`
- 액션: `client/features/data-deletion/actions.js`
- 서버 route: `server/http/routes/data-deletion.js`
- 서버 service: `server/modules/data-deletion/`

## URL

- `/schools/:schoolId/data-deletion`

## 접근 조건

- `deleteProjectData`.
- 학교 선택 필요.

## 화면 구성

Header:

- 제목: `데이터 삭제`.
- 설명: 현재 학교의 운영 데이터를 범위별로 삭제. 삭제된 데이터는 복구 불가.

삭제 카드:

1. 전체 데이터
   - 현재 학교는 유지.
   - 수험생, 사진, 생성 PDF, 작업 로그, 양식 데이터 삭제.
2. 수험생 데이터
   - 수험생 기본 정보와 연결 사진 삭제.
   - 양식과 생성 PDF 이력 유지.
3. 사진 데이터
   - 수험생 기본 정보 유지.
   - 사진 파일과 사진 참조만 삭제.
4. 생성 PDF 데이터
   - PDF 생성 이력, 일괄 생성 결과, PDF/ZIP 파일, 작업 로그 삭제.
5. 양식 데이터
   - 양식 목록, 페이지/요소 구성, 버전 스냅샷 삭제.
   - 수험생 데이터 유지.

각 카드:

- 제목.
- 설명.
- 삭제 대상 summary list.
- 삭제 icon 버튼.

상태 메시지:

- 권한 없음.
- 학교 미선택.
- 삭제 성공/경고 메시지.

## 데이터 삭제 설정 모달

좌측 section:

- 삭제 대상 title.
- 삭제 단위.
- 양식 scope면 템플릿 선택 목록.
- 그 외 scope면 필터 select list.

우측 section:

- 삭제 대상 건수 총합.
- 항목별 count list.
- summary error message.

## 필터 기반 삭제

데이터 삭제 필터는 PDF 생성 필터 흐름을 재사용한다.

- 기본 generation unit: `roomCode`.
- 표시 단계:
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

필터 option:

- 전체 옵션.
- 선택 placeholder.
- candidateCount 표시.

삭제 단위 완료 조건:

- 양식 scope가 아니면 모집시기와 전형까지 선택되어야 한다.
- 양식 scope면 1개 이상의 templateId가 선택되어야 한다.

## 양식 scope 선택 UI

- 전체 선택 checkbox.
- 템플릿별 checkbox.
- 선택 개수 표시.
- 템플릿별 표시 정보:
  - 이름.
  - 설명.
  - 용지 속성.
  - 표지 사용.
  - 수험생 블록 정렬.
  - 생성 단위.
  - 타 고사실 사용.

## 삭제 대상 건수

요약 API:

- `GET /api/data-deletion/summary?schoolId=&templateIds=&...filters`.

count 항목:

- 수험생 기본 정보.
- 사진 데이터.
- PDF 생성 이력.
- 일괄 생성 결과.
- PDF/ZIP 파일.
- PDF 작업 로그.
- 양식.
- 페이지.
- 요소.
- 버전 스냅샷.

## Submit 조건

- `deleteProjectData` 권한 있음.
- 학교 선택됨.
- 삭제 scope 유효.
- 삭제 단위 선택 완료.
- 삭제 대상 건수 1건 이상.
- summary/options loading 중 아님.
- 삭제 진행 중 아님.

## 최종 확인 모달

- 선택 scope와 총 삭제 건수 표시.
- 실행 후 복구 불가 안내.
- 전체 데이터 삭제일 때 확인 문구 필요.
- 확인 문구: `전체 데이터 삭제`.

## 삭제 API

- `DELETE /api/data-deletion/:scope`.

Scope:

- `all`.
- `candidates`.
- `photos`.
- `candidate-photos`는 서버에서 `photos` alias.
- `pdf-generations`.
- `templates`.

요청 body:

- `schoolId` 또는 `schoolCode`.
- `filters` 또는 `targetFilters`.
- `templateIds`.
- `confirmationPhrase`.

## 서버 삭제 동작

공통:

- 학교 식별자 필수.
- scope 정규화.
- 전체 삭제는 확인 문구 필수.
- DB 삭제는 transaction으로 수행.
- 파일 삭제는 DB transaction 이후 별도 수행.
- 학교 `updated_at` 갱신.

Scope별:

- `all`
  - PDF 생성 데이터 삭제.
  - 수험생 record와 사진 삭제.
  - 필터 삭제가 아닌 경우 템플릿 삭제.
- `candidates`
  - 수험생 record 삭제.
  - 연결 사진 삭제.
- `photos`
  - 수험생 record 유지.
  - 사진 파일과 사진 참조 삭제.
- `pdf-generations`
  - PDF 생성 이력 삭제.
  - 배치 row 삭제.
  - PDF 감사 로그 삭제.
  - PDF/ZIP/병합 파일 삭제.
- `templates`
  - 명시 선택된 템플릿 또는 전체 템플릿 삭제.
  - 수험생 데이터는 유지.

## 삭제 후 클라이언트 상태 갱신

삭제 결과에 따라 영향을 받은 state를 초기화한다.

- candidates 또는 photos:
  - 수험생 목록.
  - 상세 모달.
  - 메시지.
- pdf-generations:
  - PDF 목록.
  - 상세.
  - 작업 로그.
  - 선택 상태.
- templates:
  - 템플릿 목록.
  - 편집기 template.
  - activeTemplateId.

그 후 현재 view에 맞춰 필요한 목록을 다시 로드한다.
