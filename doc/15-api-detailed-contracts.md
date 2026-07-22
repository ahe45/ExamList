# API 상세 계약

이 문서는 `server/http/routes/*.js`를 기준으로 endpoint별 query, body, permission, status code, 응답 의미를 정리한 상세 명세다. 기존 [서버 API 명세](09-api-reference.md)는 빠른 표이며, 이 문서는 구현 이식과 테스트 작성용 상세 계약이다.

공통 규칙:

- 모든 JSON API는 `Content-Type: application/json` 응답을 기본으로 한다.
- 파일 다운로드 API는 `sendBinary` 또는 `sendDownload`를 사용한다.
- 클라이언트에서 버튼을 숨기더라도 서버 route의 `assertPermission` 또는 `withPermission`이 최종 권한 기준이다.
- route param은 `decodeURIComponent`로 decode한다.
- body는 `readJsonBody` 또는 `readBinaryBody`로 읽는다.
- 권한 실패, validation 실패, not found는 route service가 status code와 error message를 포함한 JSON 오류로 변환한다.

## 1. 인증 API

### `GET /api/auth/session`

Permission: 없음.

동작:

- 현재 request cookie/session을 조회한다.
- 인증 사용 여부, 인증 상태, 사용자, access summary를 반환한다.

응답:

- status 200
- session/access payload

### `POST /api/auth/login`

Permission: 없음.

Body:

| field | required | 설명 |
|---|---|---|
| `username` | 조건부 | 클라이언트 로그인 form이 보내는 로그인 ID. `username`, `userId`, `user_id` 중 하나가 필요하다. |
| `userId` | 조건부 | 서버가 함께 허용하는 로그인 ID alias. |
| `user_id` | 조건부 | 서버가 함께 허용하는 로그인 ID alias. |
| `password` | yes | 비밀번호. |

동작:

- DB 계정과 환경 변수 기반 계정 설정을 기준으로 credential을 확인한다.
- 성공 시 session cookie를 발급한다.
- 마지막 로그인 시각을 갱신한다.
- `EXAMLIST_AUTH_ENABLED=false`이면 로그인 API는 비활성화 오류를 반환한다.
- DB 계정 저장소가 없고 `EXAMLIST_USERS_JSON` 설정도 없으면 계정 미설정 오류를 반환한다.

응답:

- status 200
- 로그인 사용자와 access summary

### `POST /api/auth/logout`

Permission: 없음.

동작:

- session cookie를 제거한다.

응답:

- status 200
- 로그아웃 결과

## 2. 시스템 Summary API

### `GET /api/system/summary`

Permission: 세션 기반.

Query:

| field | required | 설명 |
|---|---|---|
| `schoolId` | no | 특정 학교 기준 summary. 없으면 전체 또는 접근 가능한 범위. |

응답 의미:

| field | 설명 |
|---|---|
| `access` | 현재 역할, 역할 표시명, permission map. |
| `admissions` | admission summary 배열. |
| `recentTemplates` | 최근 양식 목록. |
| `totalCandidates` | 수험생 총 건수. |
| `totalRooms` | 고사실 총 수. |
| `totalTemplates` | 양식 총 개수. |
| `warnings` | 운영 warning 배열. |

## 3. 계정 API

모든 계정 API는 `manageAccounts` 권한이 필요하다.

### `GET /api/accounts`

응답:

| field | 설명 |
|---|---|
| `items` | 계정 목록. |
| `total` | 총 개수. |

계정 row 주요 field:

- `id`
- `userId`
- `userName`
- `role`
- `roleLabel`
- `lastLoginAt`
- `isActive`
- `createdAt`
- `updatedAt`

### `GET /api/accounts/template.xlsx`

응답:

- status 200
- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename="계정 업로드 양식.xlsx"`
- body: XLSX binary

업로드 양식 컬럼:

- 아이디.
- 이름.
- 비밀번호.
- 권한.

### `POST /api/accounts`

Body:

| field | required | 설명 |
|---|---|---|
| `userId` | yes | 로그인 ID. unique. |
| `userName` | no | 표시명. 비어 있으면 `userId`를 사용한다. |
| `password` | yes | 초기 비밀번호. |
| `role` | no | `super_admin`, `admin`, `user`. 비어 있으면 `user`. |

응답:

- status 201
- 생성된 계정 payload

### `POST /api/accounts/import`

Body:

| field | required | 설명 |
|---|---|---|
| `fileContentBase64` | yes | XLSX 파일 base64 payload. |
| `fileName` | no | 클라이언트 표시용 파일명. 서버 저장 로직에는 사용하지 않는다. |

업로드 규칙:

- 같은 아이디의 기존 계정은 이름, 권한, 비밀번호를 수정한다.
- 기존 계정의 비밀번호 칸이 비어 있으면 기존 비밀번호를 유지한다.
- 신규 계정은 비밀번호가 필요하다.
- 권한은 `슈퍼 관리자`, `관리자`, `사용자` 또는 `super_admin`, `admin`, `user` 계열 alias를 허용한다.

응답:

- status 200
- `created`, `updated`, `skipped`, `processed`, `total`, `errors`

### `PATCH /api/accounts/:accountId`

Body:

| field | required | 설명 |
|---|---|---|
| `userName` | no | 표시명 변경. |
| `password` | no | 입력된 경우에만 비밀번호 변경. |
| `role` | no | 역할 변경. |
| `isActive` | no | 활성 여부. |

제약:

- 현재 사용자 정보가 service로 전달된다.
- 마지막 super admin 보호 등 계정 보호 규칙은 service에서 처리한다.

응답:

- status 200
- 수정된 계정 payload

### `DELETE /api/accounts/:accountId`

제약:

- 현재 사용자 정보가 service로 전달된다.
- 자기 자신/마지막 super admin 삭제 보호는 service에서 처리한다.

응답:

- status 200
- 삭제 결과

## 4. 학교 API

### `GET /api/schools`

Permission: `viewTemplates`.

Query:

| field | required | 설명 |
|---|---|---|
| `keyword` | no | 학교명, 코드, 캠퍼스명, 캠퍼스 코드 검색. |
| `limit` | no | 페이지 크기. |
| `page` | no | 페이지 번호. |

응답:

| field | 설명 |
|---|---|
| `items` | 학교 목록. |
| `total` | 총 개수. |

학교 row 주요 field:

- `id`
- `code`
- `name`
- `description`: legacy 호환용 빈 문자열.
- `campusName`
- `campusCode`
- `createdAccount`
- `canManage`
- `templateCount`
- `candidateCount`
- `updatedAt`

### `POST /api/schools`

Permission: `manageTemplates`.

Body:

| field | required | 설명 |
|---|---|---|
| `name` | yes | 학교명. 클라이언트는 `대학교` suffix 입력 UI를 정규화한다. |
| `code` | no | 기본 학교 코드. 비어 있으면 서버가 `SCHOOL-...` 형식으로 생성한다. |
| `campusCode` | no | 캠퍼스 코드. 입력하면 `schools.code`는 `<학교코드>-<캠퍼스코드>`로 저장한다. |
| `deletionPassword` | 조건부 | `deleteSchoolsWithoutPassword` 권한이 없으면 필요. |
| `deletionPasswordConfirm` | no | 삭제 비밀번호 확인. 입력된 경우 `deletionPassword`와 일치해야 한다. |

Route 옵션:

- `requireDeletionPassword`는 현재 request에 `deleteSchoolsWithoutPassword` 권한이 없을 때 true다.
- `createdAccount`는 현재 로그인 계정 ID, 인증 비활성 상태에서는 `system`으로 저장된다.

응답:

- status 201
- 생성된 학교 payload

### `GET /api/schools/:schoolId`

Permission: `viewTemplates`.

Param:

- `schoolId`: 학교 id 또는 service가 허용하는 route key.

응답:

- status 200
- 학교 상세 payload

### `PATCH /api/schools/:schoolId`

Permission: `manageTemplates`.

Body:

| field | 설명 |
|---|---|
| `name` | 학교명. |
| `code` | 기본 학교 코드. |
| `campusCode` | 캠퍼스 코드. 입력하면 `schools.code`는 `<학교코드>-<캠퍼스코드>`로 갱신한다. |

응답:

- status 200
- 수정된 학교 payload

비고:

- 학년도, 캠퍼스, 로고는 학교 기본 정보 API가 아니라 `PATCH /api/school-settings`로 저장한다.

### `DELETE /api/schools/:schoolId`

Permission: `manageTemplates`.

Body:

| field | required | 설명 |
|---|---|---|
| `deletionPassword` | 조건부 | 삭제 비밀번호. `deleteSchoolsWithoutPassword` 권한이 있으면 우회 가능. |

Route 옵션:

- `canBypassDeletionPassword`: 현재 request에 `deleteSchoolsWithoutPassword` 권한이 있으면 true.

동작:

- 학교와 관련된 템플릿, 페이지, 요소, 버전, 수험생, PDF 이력, 배치, 설정을 정리한다.
- 기본 학교 보호 규칙은 service에서 처리한다.

응답:

- status 200
- 삭제 결과

## 5. 학교 설정 API

### `GET /api/school-settings`

Permission: `viewTemplates`.

Query:

| field | required | 설명 |
|---|---|---|
| `schoolId` | no | 설정 조회 학교 id. 비어 있으면 기본 학교를 사용한다. |

응답:

- `schoolId`
- `schoolCode`
- `schoolName`
- `academicYear`
- `campusName`
- `campusCode`
- `logoDataUrl`
- `updatedAt`

### `PATCH /api/school-settings`

Permission: `manageTemplates`.

Body:

| field | required | 설명 |
|---|---|---|
| `schoolId` | yes | 설정 저장 학교 id. |
| `schoolName` | no | 양식에 표시할 학교명. |
| `academicYear` | no | 학년도. UI는 `YYYY학년도`를 보낼 수 있고 서버는 4자리 연도 문자열로 정규화한다. |
| `campusName` | no | 양식에 표시할 캠퍼스명. |
| `campusCode` | no | 양식에 표시할 캠퍼스 코드. |
| `logoDataUrl` | no | 로고 data URL. 빈 값이면 제거. |

응답:

- status 200
- 저장된 설정 payload

## 6. 템플릿 API

### `GET /api/pdf-templates`

Permission: `viewTemplates`.

Query:

| field | 설명 |
|---|---|
| `schoolId` | 학교 filter. |
| `keyword` | 양식명/설명 검색. |
| `generationUnit` | 생성 단위 filter. |
| `orientation` | `portrait`/`landscape` filter. |
| `paperPreset` | A4 등 용지 filter. |
| `limit` | 페이지 크기. |
| `page` | 페이지 번호. |

응답:

| field | 설명 |
|---|---|
| `items` | 양식 카드 목록. |
| `total` | 총 개수. |

카드 row 주요 field:

- `id`
- `schoolId`
- `name`
- `description`
- `paperPreset`
- `orientation`
- `generationUnit`
- `coverEnabled`
- `contentEnabled`
- `latestVersionNo`
- `thumbnailHtml`
- `updatedAt`

### `POST /api/pdf-templates`

Permission: `manageTemplates`.

Body:

| field | required | 설명 |
|---|---|---|
| `schoolId` | yes | 생성 학교 id. |
| `creationMode` | no | `blank` 또는 `default`. |
| `name` | yes | 양식명. |
| `description` | no | 설명. |
| `paperPreset` | no | 기본 `A4`. |
| `orientation` | no | 기본 `portrait`. |
| `generationUnit` | no | 기본 `roomCode`. |
| `layout` | no | 직접 layout을 넘길 경우 서버가 정규화한다. |

동작:

- `blank`는 빈 A4 양식.
- `default`는 기본 수험생확인대장 양식.
- service 구현상 기본 템플릿 복제 흐름도 지원한다.

응답:

- status 201
- 생성된 템플릿 payload

### `GET /api/pdf-templates/:templateId`

Permission: `viewTemplates`.

Query:

| field | 설명 |
|---|---|
| `schoolId` | 현재 학교 context 검증/조회용. |

응답:

- status 200
- 편집기에서 사용하는 템플릿 상세 payload
- `layout.pages`와 `layout.dataTagSettings` 포함

### `PATCH /api/pdf-templates/:templateId`

Permission: `manageTemplates`.

Body:

| field | 설명 |
|---|---|
| `schoolId` | 현재 학교 context. |
| `name` | 양식명. |
| `description` | 설명. |
| `paperPreset` | 용지. |
| `orientation` | 방향. |
| `generationUnit` | 생성 단위. |
| `layout` | 전체 layout JSON. |

동작:

- 서버가 `normalizeTemplateLayout`으로 layout을 정규화한다.
- `pdf_templates.layout_json`을 갱신한다.
- `pdf_template_versions`에 version snapshot을 생성한다.
- page/element snapshot table도 갱신한다.

응답:

- status 200
- 저장 후 정규화된 템플릿 payload

### `DELETE /api/pdf-templates/:templateId`

Permission: `deleteTemplates`.

Query:

| field | 설명 |
|---|---|
| `schoolId` | 현재 학교 context. |

응답:

- status 200
- 삭제 결과

### `POST /api/pdf-templates/:templateId/duplicate`

Permission: `manageTemplates`.

Body:

| field | 설명 |
|---|---|
| `schoolId` | legacy/current school id. 같은 학교 복사에서 사용. |
| `sourceSchoolId` | 다른 학교 양식 복사 시 원본 학교 id. |
| `targetSchoolId` | 다른 학교 양식 복사 시 대상 학교 id. |

정규화:

- `lookupSchoolId = sourceSchoolId || schoolId`
- `targetSchoolId = targetSchoolId || schoolId`

응답:

- status 201
- 복제된 템플릿 payload

## 7. 데이터 태그와 미리보기 API

### `GET /api/pdf-data-tags`

Permission: `viewTemplates`.

Query:

| field | 설명 |
|---|---|
| `schoolId` | 학교별 태그/설정 조회. |

응답:

- `groups`: 서버 catalog group 배열
- 각 tag는 `key`, `label`, `type`, `example`, `aliases` 등을 포함할 수 있다.

클라이언트는 이 응답을 다시 6개 accordion group으로 재배치한다.

### `POST /api/pdf-preview`

Permission: `previewTemplates`.

Body:

| field | 설명 |
|---|---|
| `schoolId` | 미리보기 학교 id. |
| `template` | 현재 편집 중인 템플릿 payload. |
| `sampleData` | 태그별 샘플 데이터. |
| `emptyValueData` | 태그별 빈 값 대체 데이터. |
| `sampleLimit` | 샘플 수험생 제한. |

응답:

| field | 설명 |
|---|---|
| `previewHtml` | iframe `srcdoc`에 넣는 HTML. |
| `pageCount` | 미리보기 page 수. |
| `candidateCount` | 샘플/대상 수험생 수. |
| `warnings` | 경고 배열. |

### `POST /api/pdf-preview/pdf`

Permission: `previewTemplates`.

Body:

| field | 설명 |
|---|---|
| `schoolId` | 미리보기 학교 id. |
| `templateId` | 저장된 템플릿 id. |
| `template` | 현재 편집 중인 템플릿 payload. |
| `sampleData` | 태그별 샘플 데이터. |
| `emptyValueData` | 태그별 빈 값 대체 데이터. |
| `sampleLimit` | 샘플 수험생 제한. 편집기는 60을 사용한다. |
| `previewMode` | 편집기는 `template`을 보낸다. |
| `renderActualCandidates` | 편집기는 false를 보낸다. |

응답:

| field | 설명 |
|---|---|
| `id` | `pdf-generation-preview-...` 형식 preview id. |
| `pdfUrl` | iframe `src`와 inline 다운로드에 사용할 preview PDF URL. |
| `fileName` | preview PDF 파일명. |
| `fileSizeBytes` | PDF byte 크기. |
| `pageCount` | preview PDF page 수. |
| `candidateCount` | 샘플/대상 수험생 수. |
| `templateId` | 미리보기 대상 템플릿 id. |
| `templateName` | 미리보기 대상 템플릿명. |
| `createdAt` | preview 생성 시각. |

## 8. 수험생 API

### `GET /api/candidates/template.xlsx`

Permission: `manageCandidates`.

응답:

- status 200
- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename="수험생 데이터 업로드 양식.xlsx"`
- body: XLSX binary

### `POST /api/candidates/export.xlsx`

Permission: `viewCandidates`.

Body:

| field | 설명 |
|---|---|
| `rows` | export할 수험생 row 배열. 없거나 배열이 아니면 빈 배열. |

응답:

- status 200
- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename="수험생 데이터.xlsx"`
- body: XLSX binary

### `POST /api/candidates/import/preview`

Permission: `manageCandidates`.

Body:

| field | 설명 |
|---|---|
| `schoolId` | 업로드 대상 학교 id. |
| `fileName` | 표시 파일명. |
| `fileContentBase64` | XLSX 파일 base64 payload. |

응답:

- status 200
- `fileName`
- `totalRows`
- `insertCount`
- `updateCount`
- `unchangedCount`
- `previewRows`

### `POST /api/candidates/import`

Permission: `manageCandidates`.

Body:

| field | 설명 |
|---|---|
| `schoolId` | 업로드 대상 학교 id. |
| `fileName` | 표시 파일명. |
| `fileContentBase64` | XLSX 파일 base64 payload. |
| `existingDataPolicy` | 업로드 정책. |

응답:

- status 200
- `processed`: 저장 처리된 row 수.

### `POST /api/candidates/photo-archive/preview`

Permission: `manageCandidates`.

Query:

| field | 설명 |
|---|---|
| `schoolId` | 업로드 대상 학교 id. |

Body:

- binary body
- route body size 제한: `EXAMLIST_PHOTO_ARCHIVE_MAX_MB`
- 기본값 2048MB
- 최소 1MB
- 최대 4096MB

응답:

- status 200
- ZIP entry 분석 결과
- 매칭/미매칭/오류 집계
- `previewToken`: 실제 반영 요청에서 사용할 임시 업로드 세션 token
- `previewExpiresAt`: 임시 업로드 세션 만료 시각
- `previewFileSize`: 미리보기 때 저장한 ZIP byte 크기

### `POST /api/candidates/photo-archive`

Permission: `manageCandidates`.

Body:

- 기본 요청: JSON body

| field | 설명 |
|---|---|
| `schoolId` | 업로드 대상 학교 id. |
| `previewToken` | `photo-archive/preview` 응답에서 받은 임시 업로드 세션 token. |

- 호환 요청: binary body
- 호환 binary 요청은 preview와 같은 size 제한 적용
- 호환 binary 요청에서는 `schoolId`를 query string으로 전달한다.

응답:

- status 200
- 사진 저장 결과와 집계

### `GET /api/candidates/filter-options`

Permission: `generatePdfs`.

Query:

| field | aliases | 설명 |
|---|---|---|
| `schoolId` |  | 학교 id. |
| `fields` |  | 필요한 option field 목록. |
| `admission` |  | 전형명 filter. |
| `admissionCode` | `admission_code` | 전형코드 filter. |
| `building` |  | 고사건물 filter. |
| `buildingCode` | `building_code` | 고사건물코드 filter. |
| `examDate` | `date` | 시험날짜 filter. |
| `group` |  | 조 filter. |
| `major` |  | 전공 filter. |
| `period` |  | 교시 filter. |
| `periodCode` | `period_code` | 교시코드 filter. |
| `room` |  | 고사실 filter. |
| `roomCode` | `room_code` | 고사실코드 filter. |
| `series` |  | 계열 filter. |
| `seriesCode` | `series_code` | 계열코드 filter. |
| `time` |  | 시작시간 filter. |
| `endTime` |  | 종료시간 filter. |
| `track` |  | 모집시기 filter. |
| `unit` |  | 모집단위 filter. |
| `unitCode` | `unit_code` | 모집단위코드 filter. |

응답:

| field | 설명 |
|---|---|
| `filters` | 서버가 읽은 filter echo. |
| `options` | 요청 field별 option 배열. |

### `GET /api/candidates`

Permission: `viewCandidates`.

Query:

| field | aliases | 설명 |
|---|---|---|
| `schoolId` |  | 학교 id. |
| `admission` |  | 전형명. |
| `admissionCode` | `admission_code` | 전형코드. |
| `examDate` |  | 시험날짜. |
| `group` |  | 조. |
| `keyword` |  | 검색어. |
| `limit` |  | 서버 limit. |
| `page` |  | 서버 page. |
| `room` |  | 고사실명. |
| `roomCode` | `room_code` | 고사실코드. |
| `track` |  | 모집시기. |

응답:

| field | 설명 |
|---|---|
| `items` | 수험생 row 배열. |
| `total` | 총 건수. |
| `page`, `limit` | paging 정보. |

수험생 row 주요 field:

- `id`
- `schoolId`
- `designatedSort`
- `admissionYear`
- `track`
- `campus`, `campusCode`: legacy 호환 field. 현재 수험생 목록 SELECT와 XLSX 템플릿에서는 빈 값이다. 양식 태그의 캠퍼스 값은 `school_settings`를 우선 사용한다.
- `admission`, `admissionCode`
- `series`, `seriesCode`
- `unit`, `unitCode`
- `major`, `majorCode`
- `date` 또는 `examDate`
- `time` 또는 `examStartTime`
- `endTime` 또는 `examEndTime`
- `period`, `periodCode`
- `building`, `buildingCode`
- `room`, `roomCode`
- `examineeNo`
- `temporaryNo`
- `name`
- `birth` 또는 `birthDate`
- `group` 또는 `groupName`
- `opt1`-`opt5`
- `hasPhoto`, `photoName`, `photoMime`

### `GET /api/candidates/:candidateId/photo`

Permission: `viewCandidates`.

응답:

- status 200
- `Content-Disposition: inline`
- `Content-Type`: 저장된 `photoMime` 또는 `application/octet-stream`
- body: 사진 binary

### `PUT /api/candidates/:candidateId/photo`

Permission: `manageCandidates`.

Body:

| field | 설명 |
|---|---|
| `schoolId` | 학교 context. |
| `photoName` 또는 `fileName` | 사진 파일명. |
| `photoMime` 또는 `mimeType` | MIME. |
| `photoDataUrl` 또는 `dataUrl` | 이미지 data URL. |

응답:

- status 200
- 저장된 사진 참조 payload

### `PATCH /api/candidates/:candidateId`

Permission: `manageCandidates`.

Body:

| field | 설명 |
|---|---|
| `schoolId` | 학교 context. service 호출 옵션에도 전달된다. |
| 수험생 field | 수정할 수험생 값. |

수정 가능 field는 수험생 상세 field와 DB column 매핑을 따른다.

응답:

- status 200
- 수정된 수험생 payload

## 9. PDF 생성 API

### `GET /api/pdf-generations/targets`

Permission: `generatePdfs`.

Query:

| field | 설명 |
|---|---|
| `schoolId` | 학교 id. |
| `templateId` | 템플릿 id. |
| `generationUnit` | 생성 단위. |
| 생성 target filter | `readGenerationTargetFilters`의 모든 filter와 alias. |

응답:

- 생성 대상 목록/건수
- generation unit별 target name과 candidate count

### `POST /api/pdf-generations/preview`

Permission:

- route permission: `generatePdfs`
- 추가 검사: `previewTemplates`

Body:

| field | 설명 |
|---|---|
| `schoolId` | 학교 id. |
| `templateId` 또는 `template` | 미리보기 대상. |
| `generationUnit` | 생성 단위. |
| `filters` | 대상 filter. |
| `target` | 첫 대상 또는 지정 대상 정보. |

응답:

- status 201
- preview id, preview URL 또는 PDF metadata

Preview 파일 다운로드는 `GET /api/pdf-generations/previews/:previewId`를 사용한다.

### `GET /api/pdf-generations`

Permission: `viewGenerations`.

Query:

| field | 설명 |
|---|---|
| `schoolId` | 학교 filter. |
| `templateId` | 템플릿 filter. |
| `generationUnit` | 생성 단위 filter. |
| `keyword` | 검색어. |
| `status` | 상태 filter. |
| `limit` | 페이지 크기. |
| `page` | 페이지 번호. |

응답:

| field | 설명 |
|---|---|
| `items` | PDF 생성 이력 row. |
| `total` | 총 개수. |

이력 row 주요 field:

- `id`
- `schoolId`
- `templateId`
- `templateName`
- `fileName`
- `generationUnit`
- `targetName`
- `candidateCount`
- `pageCount`
- `fileSizeBytes`
- `status`
- `progressPercent`
- `jobId`
- `batchId`
- `attemptCount`
- `maxAttempts`
- `warningJson` 또는 `warnings`
- `errorMessage`
- `expiresAt`
- `purgedAt`
- `startedAt`
- `completedAt`
- `createdAt`
- `updatedAt`

### `DELETE /api/pdf-generations`

Permission: `generatePdfs`.

Body:

| field | 설명 |
|---|---|
| `generationIds` | 삭제할 생성 이력 id 배열. |
| `schoolId` | 학교 context. |

응답:

- status 200
- 삭제 row 수와 파일 삭제/누락 집계

### `GET /api/pdf-generations/audit-logs`

Permission: `viewGenerations`.

Query:

| field | 설명 |
|---|---|
| `limit` | 조회 개수. |

응답:

- audit log 배열과 총 개수

Audit row field:

- `id`
- `action`
- `entityType`
- `entityId`
- `status`
- `metadata`
- `createdAt`

### `GET /api/pdf-generations/batches/:batchId`

Permission: `viewGenerations`.

응답:

- batch 상태
- queued/running/succeeded/failed/progress 집계
- DB의 `created_at`과 현재 DB 시각으로 계산한 `elapsedSeconds`
- archive 정보

### `POST /api/pdf-generations/batches/:batchId/cancel`

Permission: `generatePdfs`.

응답:

- status 200
- 취소 요청 결과

### `GET /api/pdf-generations/:generationId`

Permission: `viewGenerations`.

응답:

- status 200
- 단일 생성 상세 payload

### `POST /api/pdf-generations/jobs`

Permission: `generatePdfs`.

Body:

| field | 설명 |
|---|---|
| `schoolId` | 학교 id. |
| `templateId` | 템플릿 id. |
| `generationUnit` | 생성 단위. |
| `filters` | 대상 filter. |
| `target` | 단일 생성 target. |

응답:

- status 202
- queue job 등록 결과

### `POST /api/pdf-generations/batch/jobs`

Permission: `generatePdfs`.

Body:

| field | 설명 |
|---|---|
| `schoolId` | 학교 id. |
| `templateId` | 템플릿 id. |
| `generationUnit` | 생성 단위. |
| `filters` | 대상 filter. |
| `targets` | 생성 target 배열 또는 서버에서 산출할 조건. |

응답:

- status 202
- batch queue 등록 결과

### `POST /api/pdf-generations`

Permission: `generatePdfs`.

동작:

- 큐가 아닌 즉시 단일 PDF 생성 service를 호출한다.

응답:

- status 201
- 생성된 PDF 이력 payload

### `POST /api/pdf-generations/batch`

Permission: `generatePdfs`.

동작:

- 큐가 아닌 즉시 배치 생성 service를 호출한다.

응답:

- status 201
- batch 생성 결과

### `POST /api/pdf-generations/retention/cleanup`

Permission: `generatePdfs`.

Body:

| field | 설명 |
|---|---|
| `schoolId` | 선택적 학교 범위. |
| `now` 또는 기준값 | service가 허용하는 cleanup 기준. |

응답:

- status 200
- 만료 파일/이력 정리 결과

### `POST /api/pdf-generations/archive`

Permission: `downloadPdfs`.

Body:

| field | 설명 |
|---|---|
| `generationIds` | ZIP에 포함할 생성 이력 id 배열. |
| `schoolId` | 학교 context. |
| `fileName` | 선택적 archive 파일명. |

응답:

- status 201
- `archiveId`, `archiveFileName`, download URL 등 archive payload

### `POST /api/pdf-generations/merge`

Permission: `downloadPdfs`.

Body:

| field | 설명 |
|---|---|
| `generationIds` | 병합할 생성 이력 id 배열. |
| `schoolId` | 학교 context. |
| `fileName` | 선택적 병합 PDF 파일명. |

응답:

- status 201
- `mergedId`, `fileName`, download URL 등 payload

### `POST /api/pdf-generations/rerun-batch`

Permission: `generatePdfs`.

Body:

| field | 설명 |
|---|---|
| `batchId` | 재생성할 batch id. |
| `schoolId` | 학교 context. |

응답:

- status 201
- 재생성 batch payload

### `POST /api/pdf-generations/:generationId/retry`

Permission: `generatePdfs`.

동작:

- 실패한 queue 작업을 재시도한다.

응답:

- status 202
- 재시도 job 등록 결과

### `POST /api/pdf-generations/:generationId/rerun`

Permission: `generatePdfs`.

동작:

- 기존 생성 이력의 `request_json` snapshot을 기준으로 단일 재생성을 수행한다.

응답:

- status 201
- 새 생성 이력 payload

### `GET /api/pdf-generations/previews/:previewId`

Permission: `previewTemplates`.

Query:

| field | 설명 |
|---|---|
| `name` | 다운로드/inline 파일명 override. |

응답:

- PDF file
- `Content-Disposition: inline`

### `GET /api/pdf-generations/archives/:archiveId/download`

Permission: `downloadPdfs`.

Query:

| field | 설명 |
|---|---|
| `name` | 다운로드 파일명 override. |

응답:

- ZIP file download

### `GET /api/pdf-generations/merged/:mergedId/download`

Permission: `downloadPdfs`.

Query:

| field | 설명 |
|---|---|
| `name` | 다운로드 파일명 override. |

응답:

- 병합 PDF file download

### `GET /api/pdf-generations/:generationId/download`

Permission: `downloadPdfs`.

Query:

| field | 설명 |
|---|---|
| `disposition` | `inline`이면 인쇄/브라우저 표시용 inline disposition. 그 외 attachment. |

응답:

- 단일 생성 PDF file

## 10. 데이터 삭제 API

### `GET /api/data-deletion/summary`

Permission: `deleteProjectData`.

Query:

| field | aliases | 설명 |
|---|---|---|
| `schoolId` | `school_id` | 삭제 대상 학교 id. |
| `templateIds` | 반복 또는 comma string | 템플릿 scope에서 선택 양식 id. |
| 생성 target filter | `readGenerationTargetFilters` alias | 수험생/PDF 삭제 범위 filter. |

`templateIds` 파싱:

- `?templateIds=a&templateIds=b`
- `?templateIds=a,b`
- 둘 다 trim 후 빈 값 제거.

응답:

- status 200
- scope별 삭제 대상 count summary
- 템플릿 선택 summary
- 파일 삭제 예상 집계

### `DELETE /api/data-deletion/:scope`

Permission: `deleteProjectData`.

Scope:

- `all`
- `candidates`
- `photos`
- `candidate-photos`
- `pdf-generations`
- `templates`

Body:

| field | 설명 |
|---|---|
| `schoolId` | 삭제 대상 학교 id. |
| `filters` | 삭제 범위 filter. |
| `templateIds` | 템플릿 scope에서 삭제할 양식 id 배열. |
| `confirmationPhrase` | 전체 삭제 확인 문구. 클라이언트 기준 `전체 데이터 삭제`. |

동작:

- scope별 DB row 삭제.
- PDF/사진 파일 시스템 삭제.
- 이미 없는 파일은 missing count로 집계.

응답:

- status 200
- 삭제 결과 summary
- 삭제 row 수
- 삭제 파일 수
- 누락 파일 수

## 11. 생성 Target Filter 공통 계약

다음 API는 같은 filter reader를 공유한다.

- `GET /api/pdf-generations/targets`
- `GET /api/candidates/filter-options`
- `GET /api/data-deletion/summary`

공통 filter:

| canonical | alias/비고 |
|---|---|
| `admission` | 없음 |
| `admissionCode` | `admission_code` |
| `building` | 없음 |
| `buildingCode` | `building_code` |
| `campus` | legacy reader만 보존. 현재 UI step, 후보자 option, 데이터 삭제 SQL filter에는 포함되지 않는다. |
| `examDate` | `date` |
| `group` | 없음 |
| `major` | 없음 |
| `period` | 없음 |
| `periodCode` | `period_code` |
| `room` | 없음 |
| `roomCode` | `room_code` |
| `series` | 없음 |
| `seriesCode` | `series_code` |
| `time` | 없음 |
| `endTime` | 없음 |
| `track` | 없음 |
| `unit` | 없음 |
| `unitCode` | `unit_code` |

비어 있는 값은 빈 문자열로 처리한다.

## 12. 파일 응답 계약

| API | 파일명 기본값 | Content-Disposition |
|---|---|---|
| `GET /api/accounts/template.xlsx` | `계정 업로드 양식.xlsx` | attachment |
| `GET /api/candidates/template.xlsx` | `수험생 데이터 업로드 양식.xlsx` | attachment |
| `POST /api/candidates/export.xlsx` | `수험생 데이터.xlsx` | attachment |
| `GET /api/candidates/:candidateId/photo` | 저장된 사진명 또는 `candidate-photo.jpg` | inline |
| `GET /api/pdf-generations/previews/:previewId` | preview file payload 기준 | inline |
| `GET /api/pdf-generations/:generationId/download?disposition=inline` | 생성 PDF 파일명 | inline |
| `GET /api/pdf-generations/:generationId/download` | 생성 PDF 파일명 | attachment/default |
| `GET /api/pdf-generations/archives/:archiveId/download` | archive 파일명 | attachment/default |
| `GET /api/pdf-generations/merged/:mergedId/download` | merged 파일명 | attachment/default |

## 13. 테스트 작성 기준

API 회귀 테스트는 다음을 최소로 확인한다.

- 권한 없는 세션에서 403 또는 권한 오류가 발생하는지.
- 필수 body/query 누락 시 validation 오류가 발생하는지.
- route param이 URL encoding된 값을 decode하는지.
- 생성/수정 API가 정규화된 payload를 반환하는지.
- 파일 API가 올바른 MIME과 disposition을 반환하는지.
- PDF 생성 queue API는 202, 즉시 생성 API는 201을 반환하는지.
- 데이터 삭제 summary와 delete가 같은 filter/templateIds 기준으로 동작하는지.
