# 시스템 개요

ExamList는 학교별 수험생확인대장 PDF를 생성하기 위한 운영자 시스템이다. 수험생 XLSX와 사진 ZIP을 업로드하고, 학교별 양식을 편집한 뒤, 조건별 PDF를 배치 생성하고 결과를 다운로드/인쇄/삭제한다.

## 핵심 업무

- 학교 관리: 학교 목록 검색, 학교 생성, 학교 정보 수정, 학교 삭제, 학교별 설정 관리.
- 계정 관리: 운영자 계정 생성, 수정, 삭제, 권한 부여.
- 양식 관리: PDF 템플릿 목록, 생성, 복사, 이름/설명 수정, 삭제.
- 양식 편집: 용지 기반 문서 편집, 데이터 태그 삽입, 표/이미지/바코드/QR/수험생 블록 구성, 미리보기, 저장.
- 수험생 데이터: XLSX 업로드, 업로드 미리보기, 사진 ZIP 업로드, 목록 조회, 정렬/필터/페이지네이션, 개별 수정, 사진 수정, XLSX 다운로드.
- PDF 생성: 템플릿과 필터를 선택해 생성 대상 산출, 첫 번째 PDF 미리보기, 배치 생성, 진행률 표시, 중단, 결과 다운로드/인쇄/재생성/삭제.
- PDF 작업 로그: PDF 생성, 미리보기, 병합, ZIP 생성, 삭제, 재시도 같은 감사 로그 조회.
- 데이터 삭제: 학교별 운영 데이터를 범위별로 삭제하고 삭제 대상 건수를 사전에 확인.

## 기술 스택

- 런타임: Node.js.
- 서버: Node 기본 `http` 모듈 기반 자체 라우터.
- 프론트엔드: HTML, CSS, ES Module JavaScript.
- DB: MySQL 또는 MariaDB, `mysql2/promise`.
- 환경 변수: `dotenv`.
- 엑셀 처리: `exceljs`.
- PDF 렌더링: 브라우저 실행 파일을 이용해 HTML을 PDF로 출력.
- PDF 병합: `pdf-lib`.
- ZIP 처리: `adm-zip`, `yazl`.
- 큐: 기본 memory queue, 선택적 BullMQ/Redis.
- 테스트: Node 내장 test runner.

## 실행 진입점

- `index.js`: `server.js`를 require한다.
- `server.js`: 앱 컨텍스트 생성, API route 생성, page handler 생성, bootstrap 후 HTTP 서버 시작.
- 기본 포트: `PORT` 환경 변수가 유효하면 해당 값, 없으면 HTTP 기본 포트 `80`.

```bash
npm install
npm run start
```

## 주요 npm script

| Script | 설명 |
| --- | --- |
| `npm run start` | 서버 실행 |
| `npm run dev` | 서버 실행. 현재 start와 동일 |
| `npm run worker:pdf` | PDF 워커 실행 |
| `npm run setup:db` | DB 초기 설정 |
| `npm run db:create-user` | DB 사용자 생성 |
| `npm run smoke:ui` | UI smoke 테스트 |
| `npm run smoke:browser` | 브라우저 smoke 테스트 |
| `npm run smoke:bullmq` | Redis 연결이 설정된 BullMQ smoke 테스트 |
| `npm test` | Node test runner 실행 |

## 환경 변수

| 변수 | 기본 예시 | 용도 |
| --- | --- | --- |
| `PORT` | 미설정 시 `80` | HTTP 서버 포트 |
| `DB_HOST` | `127.0.0.1` | DB 호스트 |
| `DB_PORT` | `3306` | DB 포트 |
| `DB_USER` | `examlist_app` | 앱 DB 사용자 |
| `DB_PASSWORD` | `examlist_dev_password` | 앱 DB 비밀번호 |
| `DB_NAME` | `examlist` | DB 이름 |
| `DB_CONNECTION_LIMIT` | `10` | MySQL connection pool 크기 |
| `EXAMLIST_ROLE` | `super_admin` | 인증 비활성 또는 기본 권한 계산용 역할 |
| `EXAMLIST_DEFAULT_ROLE` | `super_admin` | `EXAMLIST_ROLE`이 비어 있을 때 사용하는 기본 역할 |
| `EXAMLIST_AUTH_ENABLED` | `true` | 로그인 사용 여부 |
| `EXAMLIST_SESSION_SECRET` | `change-this-session-secret` | 세션 서명 비밀키 |
| `EXAMLIST_SESSION_TTL_HOURS` | `8` | 세션 유지 시간, 1시간에서 14일 사이로 보정 |
| `EXAMLIST_SESSION_COOKIE_SECURE` | `false` | secure cookie 사용 여부 |
| `EXAMLIST_USERS_JSON` | `[]` | 환경 변수 기반 보조 사용자 목록 |
| `EXAMLIST_PHOTO_ARCHIVE_MAX_MB` | 기본 2048 | 사진 ZIP 최대 업로드 크기, 1MB에서 4096MB 사이 |
| `EXAMLIST_PHOTO_ARCHIVE_SESSION_TTL_MINUTES` | 기본 30 | 사진 ZIP 미리보기 후 실제 반영에 재사용하는 임시 업로드 세션 유지 시간 |
| `EXAMLIST_STORAGE_DIR` | `storage` | PDF와 사진 저장소의 기본 루트. 상대 경로면 프로젝트 루트 기준 |
| `PDF_BROWSER_PATH` | 빈 값 | PDF 렌더링용 브라우저 실행 파일 경로 |
| `PDF_STORAGE_DIR` | `storage/pdf-generations` | PDF 결과 저장 루트. 설정하면 그 아래 학교 코드별 디렉터리를 사용 |
| `PDF_QUEUE_DRIVER` | `memory` | PDF queue driver. `memory` 또는 `bullmq` |
| `PDF_QUEUE_NAME` | `examlist-pdf-generation` | BullMQ 사용 시 queue 이름 |
| `PDF_QUEUE_PROCESS_IN_WEB` | `true` | BullMQ 사용 시 웹 프로세스에서 worker도 실행할지 여부 |
| `PDF_QUEUE_CONCURRENCY` | `1` | BullMQ worker 동시 처리 수, 1에서 5 사이로 보정 |
| `PDF_QUEUE_MAX_ATTEMPTS` | `2` | 생성 실패 재시도 횟수 |
| `PDF_QUEUE_RETRY_DELAY_MS` | `5000` | 재시도 지연 |
| `PDF_GENERATION_CHUNK_SIZE` | `500` | 대상별 수험생 chunk 크기 |
| `PDF_RETENTION_DAYS` | `30` | PDF 파일 보관 일수 |
| `REDIS_URL` | 빈 값 | `PDF_QUEUE_DRIVER=bullmq`일 때 Redis 연결 URL |
| `NODE_ENV` | 빈 값 | 실행 환경 구분 |
| `DB_ADMIN_USER` | `root` | `npm run db:create-user` 실행 시 관리자 DB 사용자 |
| `DB_ADMIN_PASSWORD` | 빈 값 | `npm run db:create-user` 실행 시 관리자 DB 비밀번호 |
| `MYSQL_CLI_PATH`, `MARIADB_CLI_PATH` | 빈 값 | DB 사용자 생성 script가 사용할 CLI 실행 파일 경로 |

## DB 부트스트랩

서버 시작 시 `server/bootstrap.js`가 다음 순서로 초기화한다.

1. `ensureDatabaseExists()`로 DB가 없으면 생성.
2. `db/schema.sql` 기준 테이블 생성.
3. 학교 스코프, 학교 설정, 템플릿, PDF 생성, 수험생, 계정 관련 컬럼과 인덱스 보정.
4. 기존 데이터가 학교 스코프를 갖도록 `school-default` 기준 백필.
5. PDF queue 시작.

DB 연결 생성과 low-level query는 루트 `db.js`가 담당한다.

## 주요 디렉터리

| 경로 | 역할 |
| --- | --- |
| `index.html` | 로그인 이후 SPA shell |
| `login.html` | 로그인 전용 페이지 |
| `client/core.js` | SPA 초기화, 라우팅, 상태 로드, 렌더링 연결, unsaved guard |
| `client/app/` | 전역 상태, 렌더러, 네비게이션, DOM 참조, modal guard, shell 제어 |
| `client/features/accounts/` | 계정 관리 화면, 모달, 액션 |
| `client/features/auth/` | 상단 인증 상태와 로그아웃 |
| `client/features/candidates/` | 수험생 목록, 업로드, 상세, 다운로드 |
| `client/features/data-deletion/` | 데이터 삭제 카드, 모달, 확인, 액션 |
| `client/features/pdf-generations/` | PDF 생성 목록, 생성 마법사, 진행, 상세, 로그, 다운로드, 삭제 |
| `client/features/schools/` | 학교 목록, 학교 생성/수정/삭제 |
| `client/features/school-settings/` | 학교 표시 설정 |
| `client/features/template-editor/` | 양식 편집 화면과 액션 |
| `client/template-editor-runtime/` | contenteditable 기반 문서 편집 runtime |
| `client/features/templates/` | 양식 목록, 카드 편집, 생성/복사 모달 |
| `shared/app-config.js` | 서버와 클라이언트가 공유하는 route 정의 |
| `shared/domain/` | 수험생 필드 정의 등 도메인 공통 정보 |
| `styles/` | 기본 UI, 기능별 CSS, 반응형 CSS |
| `server/http/` | 자체 router, API route 등록, 요청/응답 유틸 |
| `server/modules/` | 기능별 서버 service와 repository |
| `db/schema.sql` | 기준 DB schema |
| `scripts/` | DB, PDF worker, smoke 테스트 유틸 |
| `storage/` | PDF, 사진 등 runtime 파일 저장소 |
