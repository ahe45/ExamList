# 수험생 데이터 명세

## 파일

- `client/features/candidates/renderers.js`
- `client/features/candidates/candidate-table-*`
- `client/features/candidates/candidate-upload-*`
- `client/features/candidates/candidate-detail-*`
- `server/http/routes/candidates.js`
- `server/modules/candidates/`
- `shared/domain/candidate-field-definitions.js`

## URL

- `/templates/:templateId/candidates`
- `/schools/:schoolId/candidates`

## 접근 조건

- 조회: `viewCandidates`.
- 업로드/수정/사진 변경: `manageCandidates`.

## 화면 구성

Panel: `candidateLookup`.

Header:

- 제목: `수험생 데이터`.
- 설명: 업로드된 수험생 데이터를 확인하고, 개별 정보를 수정하거나 사진을 보완.
- 다운로드 버튼.
- 데이터 업로드 버튼
  - `manageCandidates` 권한 필요.

## 테이블

- 첫 컬럼: 순번.
- 나머지 컬럼은 `candidateGridColumns`.
- 모든 데이터 컬럼은 정렬과 필터 가능.
- `examineeNo`는 강조 표시.
- `manageCandidates` 권한이 있으면 row 클릭 시 상세 수정 모달을 연다.

### 컬럼

| Key | Label |
| --- | --- |
| `designatedSort` | 지정정렬 |
| `track` | 모집시기 |
| `campus` | 캠퍼스명 |
| `campusCode` | 캠퍼스코드 |
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

### 정렬

- 헤더 sort 버튼 클릭.
- asc, desc, none 순환.
- `localeCompare("ko", { numeric: true, sensitivity: "base" })` 기준.

### 필터

- 헤더 filter 버튼 클릭.
- 필터 메뉴 위치는 클릭 위치 기준.
- 검색 input.
- 전체 선택 checkbox.
- 옵션 checkbox list.
- 초기화 버튼.
- 적용 버튼.
- 필터 option은 현재 로드된 rows에서 추출한다.

### 페이지네이션

- 표시 개수: 10, 30, 50, 100, 500, 1000, 2000, 모두 표시.
- 이전/다음.
- 페이지 번호.
- ellipsis.
- page picker select.
- 현재 범위와 총 건수 표시.

## 업로드 모달

Tabs:

- 수험생 데이터.
- 수험생 사진.

### 수험생 데이터 tab

- XLSX 파일 선택.
- 업로드 양식 다운로드.
- 미리보기 영역.
  - 신규.
  - 수정.
  - 동일.
- 기존 데이터 처리 radio:
  - 신규만 반영: 기존 수정건과 동일 데이터 skip.
  - 신규 + 수정 반영: 동일 데이터 skip, 신규/수정 반영.
  - 전체 반영: 동일 데이터까지 재반영.
- 업로드 실행 버튼.

### 수험생 사진 tab

- ZIP 파일 선택.
- 미리보기 영역.
  - 매칭 가능.
  - 건너뜀.
  - 중복.
- 기존 데이터 처리 radio.
- 업로드 실행 버튼.

### 진행 오버레이

- 단계 label.
- 제목.
- 메시지.
- 상세.
- progress bar.
- percentage 또는 처리 중 표시.

## XLSX 업로드 규칙

업로드 양식 다운로드:

- `GET /api/candidates/template.xlsx`.

미리보기:

- `POST /api/candidates/import/preview`.

반영:

- `POST /api/candidates/import`.

### 필수 필드

- 모집시기.
- 캠퍼스명.
- 전형명.
- 계열명.
- 모집단위명.
- 시험날짜.
- 시작시간.
- 교시명.
- 고사건물명.
- 고사실명.
- 수험번호.
- 이름.
- 생년월일.

### 선택 필드

- 지정정렬.
- 캠퍼스코드.
- 전형코드.
- 계열코드.
- 모집단위코드.
- 전공명.
- 전공코드.
- 종료시간.
- 교시코드.
- 고사건물코드.
- 고사실코드.
- 가번호.
- 조.
- OPT1에서 OPT5.

### 형식 검증

- 시험날짜와 생년월일은 필수값이며 입력한 문자열을 그대로 저장한다.
- 시험날짜와 생년월일에는 별도 날짜 형식 제한을 적용하지 않는다.
- 시작시간: `HH:MM`.
- 종료시간: 빈 값 또는 `HH:MM`.
- 수험번호는 필수이며 중복 기준으로 사용.
- XLSX 내부 수험번호 중복은 reject.
- XLSX에는 header와 최소 1개 이상의 데이터 행이 필요하다.

### 서버 저장 기준

- `candidate_records.id`는 schoolId, sourceType, sourceId 기반 deterministic hash.
- XLSX 업로드의 sourceType은 `xlsx`.
- sourceId는 수험번호 중심.

## 사진 ZIP 업로드 규칙

API:

- 미리보기: `POST /api/candidates/photo-archive/preview`, binary ZIP을 전송하고 서버 임시 업로드 세션 token을 받는다.
- 저장: `POST /api/candidates/photo-archive`, JSON body의 `previewToken`으로 미리보기 때 전송한 ZIP을 다시 사용한다.
- 호환용으로 저장 API는 기존 binary ZIP body도 처리할 수 있지만, 화면에서는 `previewToken` 방식을 사용한다.

규칙:

- 미리보기 단계에서만 binary body로 ZIP을 업로드한다.
- 저장 단계는 ZIP을 재전송하지 않고 서버 임시 저장소의 preview ZIP을 반영한다.
- 임시 업로드 세션 유지 시간은 `EXAMLIST_PHOTO_ARCHIVE_SESSION_TTL_MINUTES`, 기본 30분이다.
- 파일명에서 수험번호를 추출해 기존 수험생과 매칭.
- 지원 확장자: JPG, JPEG, PNG.
- 중복 파일은 duplicate로 집계.
- 매칭 실패 또는 invalid entry는 skip.
- 최대 크기는 `EXAMLIST_PHOTO_ARCHIVE_MAX_MB`, 기본 2048MB, 최대 4096MB.

## 수험생 상세 수정 모달

필드:

- 테이블 컬럼과 동일한 데이터 필드.
- `date`, `birth`: date input.
- `time`, `endTime`: time input.
- 나머지 text input.

사진 panel:

- 기존 사진 표시.
- 사진 없음 placeholder.
- hidden file input.
- 사진 업로드 버튼.
- accept: `image/jpeg,image/png`.

API:

- 정보 수정: `PATCH /api/candidates/:candidateId`.
- 사진 조회: `GET /api/candidates/:candidateId/photo`.
- 사진 저장: `PUT /api/candidates/:candidateId/photo`.

## 다운로드

- 다운로드 확인 모달 표시.
- 현재 표시 대상 rows를 XLSX로 다운로드.
- API: `POST /api/candidates/export.xlsx`.
- 파일명: `수험생 데이터.xlsx`.

## 수험생 필드와 DB 매핑

| 클라이언트 key | DB column | 의미 |
| --- | --- | --- |
| `designatedSort` | `designated_sort` | 지정정렬 |
| `track` | `track` | 모집시기 |
| `campus` | `campus` | 캠퍼스명 |
| `campusCode` | `campus_code` | 캠퍼스코드 |
| `admission` | `admission` | 전형명 |
| `admissionCode` | `admission_code` | 전형코드 |
| `series` | `series` | 계열명 |
| `seriesCode` | `series_code` | 계열코드 |
| `unit` | `unit` | 모집단위명 |
| `unitCode` | `unit_code` | 모집단위코드 |
| `major` | `major` | 전공명 |
| `majorCode` | `major_code` | 전공코드 |
| `date` | `exam_date` | 시험날짜 |
| `time` | `time` | 시작시간 |
| `endTime` | `end_time` | 종료시간 |
| `period` | `period` | 교시명 |
| `periodCode` | `period_code` | 교시코드 |
| `building` | `building` | 고사건물명 |
| `buildingCode` | `building_code` | 고사건물코드 |
| `room` | `room` | 고사실명 |
| `roomCode` | `room_code` | 고사실코드 |
| `examineeNo` | `examinee_no` | 수험번호 |
| `temporaryNo` | `temporary_no` | 가번호 |
| `name` | `name` | 이름 |
| `birth` | `birth_date` | 생년월일 |
| `group` | `group_name` | 조 |
| `opt1`에서 `opt5` | `opt1`에서 `opt5` | 사용자 옵션 |
