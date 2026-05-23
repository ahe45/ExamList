# 서버 API 명세

모든 API는 `server/http/routes` 하위 파일에 정의된다. 클라이언트에서 버튼을 숨기더라도 서버의 permission check가 최종 기준이다.

이 문서는 빠른 endpoint 표다. query/body/응답 payload/파일 다운로드/공통 filter alias까지 포함한 상세 계약은 [API 상세 계약](15-api-detailed-contracts.md)에 분리되어 있다.

## 인증

| Method | URL | Permission | 설명 |
| --- | --- | --- | --- |
| GET | `/api/auth/session` | 없음 | 현재 세션과 access summary |
| POST | `/api/auth/login` | 없음 | 로그인, cookie 발급 |
| POST | `/api/auth/logout` | 없음 | 로그아웃, cookie 제거 |

## 시스템

| Method | URL | Permission | 설명 |
| --- | --- | --- | --- |
| GET | `/api/system/summary?schoolId=` | 세션 기반 | 총 수험생, 템플릿, 권한 요약 |

## 계정

| Method | URL | Permission | 설명 |
| --- | --- | --- | --- |
| GET | `/api/accounts` | `manageAccounts` | 계정 목록 |
| POST | `/api/accounts` | `manageAccounts` | 계정 생성 |
| PATCH | `/api/accounts/:accountId` | `manageAccounts` | 계정 수정 |
| DELETE | `/api/accounts/:accountId` | `manageAccounts` | 계정 삭제 |

## 학교

| Method | URL | Permission | 설명 |
| --- | --- | --- | --- |
| GET | `/api/schools` | `viewTemplates` | 학교 목록 |
| POST | `/api/schools` | `manageTemplates` | 학교 생성 |
| GET | `/api/schools/:schoolId` | `viewTemplates` | 학교 상세 |
| PATCH | `/api/schools/:schoolId` | `manageTemplates` | 학교 수정 |
| DELETE | `/api/schools/:schoolId` | `manageTemplates` | 학교 삭제 |
| GET | `/api/school-settings?schoolId=` | `viewTemplates` | 학교 표시 설정 |
| PATCH | `/api/school-settings` | `manageTemplates` | 학교 표시 설정 수정 |

## 템플릿과 데이터 태그

| Method | URL | Permission | 설명 |
| --- | --- | --- | --- |
| GET | `/api/pdf-templates` | `viewTemplates` | 템플릿 목록 |
| POST | `/api/pdf-templates` | `manageTemplates` | 템플릿 생성 |
| GET | `/api/pdf-templates/:templateId` | `viewTemplates` | 템플릿 상세 |
| PATCH | `/api/pdf-templates/:templateId` | `manageTemplates` | 템플릿 저장 |
| DELETE | `/api/pdf-templates/:templateId` | `deleteTemplates` | 템플릿 삭제 |
| POST | `/api/pdf-templates/:templateId/duplicate` | `manageTemplates` | 템플릿 복사 |
| GET | `/api/pdf-data-tags?schoolId=` | `viewTemplates` | 데이터 태그 catalog |
| POST | `/api/pdf-preview` | `previewTemplates` | 템플릿 HTML preview |

## 수험생

| Method | URL | Permission | 설명 |
| --- | --- | --- | --- |
| GET | `/api/candidates` | `viewCandidates` | 수험생 목록 |
| GET | `/api/candidates/template.xlsx` | `manageCandidates` | 업로드 양식 다운로드 |
| POST | `/api/candidates/export.xlsx` | `viewCandidates` | XLSX export |
| POST | `/api/candidates/import/preview` | `manageCandidates` | XLSX 업로드 미리보기 |
| POST | `/api/candidates/import` | `manageCandidates` | XLSX 업로드 반영 |
| POST | `/api/candidates/photo-archive/preview` | `manageCandidates` | 사진 ZIP 미리보기 |
| POST | `/api/candidates/photo-archive` | `manageCandidates` | 사진 ZIP 반영 |
| GET | `/api/candidates/filter-options` | `generatePdfs` | PDF 생성/삭제 필터 option |
| GET | `/api/candidates/:candidateId/photo` | `viewCandidates` | 사진 조회 |
| PUT | `/api/candidates/:candidateId/photo` | `manageCandidates` | 사진 저장 |
| PATCH | `/api/candidates/:candidateId` | `manageCandidates` | 수험생 수정 |

## PDF 생성

| Method | URL | Permission | 설명 |
| --- | --- | --- | --- |
| GET | `/api/pdf-generations/targets` | `generatePdfs` | 생성 대상 목록/건수 |
| POST | `/api/pdf-generations/preview` | `generatePdfs` + `previewTemplates` | 실제 수험생 기반 PDF 미리보기 |
| GET | `/api/pdf-generations` | `viewGenerations` | 생성 이력 목록 |
| DELETE | `/api/pdf-generations` | `generatePdfs` | 선택 생성 이력 삭제 |
| GET | `/api/pdf-generations/audit-logs` | `viewGenerations` | PDF 감사 로그 |
| GET | `/api/pdf-generations/batches/:batchId` | `viewGenerations` | 배치 상태 |
| POST | `/api/pdf-generations/batches/:batchId/cancel` | `generatePdfs` | 배치 중단 요청 |
| GET | `/api/pdf-generations/:generationId` | `viewGenerations` | 생성 상세 |
| POST | `/api/pdf-generations/jobs` | `generatePdfs` | 단일 생성 큐 등록 |
| POST | `/api/pdf-generations/batch/jobs` | `generatePdfs` | 배치 생성 큐 등록 |
| POST | `/api/pdf-generations` | `generatePdfs` | 즉시 단일 생성 |
| POST | `/api/pdf-generations/retention/cleanup` | `generatePdfs` | 만료 PDF 정리 |
| POST | `/api/pdf-generations/archive` | `downloadPdfs` | ZIP archive 생성 |
| POST | `/api/pdf-generations/merge` | `downloadPdfs` | 병합 PDF 생성 |
| POST | `/api/pdf-generations/batch` | `generatePdfs` | 즉시 배치 생성 |
| POST | `/api/pdf-generations/rerun-batch` | `generatePdfs` | 배치 재생성 |
| POST | `/api/pdf-generations/:generationId/retry` | `generatePdfs` | 실패 생성 재시도 |
| POST | `/api/pdf-generations/:generationId/rerun` | `generatePdfs` | 생성 이력 기반 재생성 |
| GET | `/api/pdf-generations/previews/:previewId` | `previewTemplates` | 미리보기 PDF inline 다운로드 |
| GET | `/api/pdf-generations/archives/:archiveId/download` | `downloadPdfs` | ZIP 다운로드 |
| GET | `/api/pdf-generations/merged/:mergedId/download` | `downloadPdfs` | 병합 PDF 다운로드 |
| GET | `/api/pdf-generations/:generationId/download` | `downloadPdfs` | PDF 다운로드 또는 inline 인쇄 |

## 데이터 삭제

| Method | URL | Permission | 설명 |
| --- | --- | --- | --- |
| GET | `/api/data-deletion/summary` | `deleteProjectData` | 삭제 대상 건수 조회 |
| DELETE | `/api/data-deletion/:scope` | `deleteProjectData` | 범위별 삭제 실행 |

Scope:

- `all`
- `candidates`
- `photos`
- `candidate-photos`
- `pdf-generations`
- `templates`
