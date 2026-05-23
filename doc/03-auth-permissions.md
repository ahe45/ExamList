# 인증과 권한

## 인증 흐름

구현 파일:

- `login.html`
- `client/login.js`
- `client/features/auth/`
- `server/http/routes/auth.js`
- `server/modules/auth/service.js`

API:

- `GET /api/auth/session`
- `POST /api/auth/login`
- `POST /api/auth/logout`

세션:

- cookie 이름: `examlist_session`.
- TTL: `EXAMLIST_SESSION_TTL_HOURS`, 1시간에서 14일 사이로 보정.
- secret: `EXAMLIST_SESSION_SECRET`.
- secure cookie: `EXAMLIST_SESSION_COOKIE_SECURE`.

인증 비활성:

- `EXAMLIST_AUTH_ENABLED=false`이면 로그인 없이 기본 역할로 접근한다.
- 기본 역할은 `EXAMLIST_ROLE` 또는 `EXAMLIST_DEFAULT_ROLE`, 기본값 `super_admin`.

## 로그인 페이지 동작

- 페이지 로드 시 `/api/auth/session` 호출.
- 인증 비활성 또는 이미 로그인된 상태면 `/schools`로 이동.
- submit 시 `/api/auth/login`에 `{ username, password }` 전송.
- 성공 시 `/schools`로 이동.
- 실패 시 toast error 표시.

로그인 UI:

- 브랜드: `Exam List System`, `수험생확인대장`.
- 제목: `운영자 로그인`.
- 아이디 input placeholder: `이름`.
- 비밀번호 input placeholder: `1234`.
- button: `로그인`.

## 역할

| 역할 | 표시명 | 권한 요약 |
| --- | --- | --- |
| `super_admin` | 슈퍼 관리자 | 모든 권한 |
| `admin` | 관리자 | 계정 관리와 삭제 비밀번호 우회 제외 대부분 권한 |
| `user` | 사용자 | 템플릿 조회, PDF 생성/조회/다운로드 중심 권한 |
| `guest` | 로그인 필요 | 접근 권한 없음 |

## 권한 키

- `viewDashboard`
- `viewTemplates`
- `manageTemplates`
- `deleteTemplates`
- `previewTemplates`
- `viewCandidates`
- `manageCandidates`
- `viewGenerations`
- `generatePdfs`
- `downloadPdfs`
- `manageAccounts`
- `deleteProjectData`
- `deleteSchoolsWithoutPassword`

## 역할별 특징

### super_admin

- 모든 권한 true.
- 계정 관리 가능.
- 학교 삭제 비밀번호 우회 가능.
- 데이터 삭제 가능.

### admin

- 대부분의 운영 기능 가능.
- `manageAccounts=false`.
- `deleteSchoolsWithoutPassword=false`.
- 학교 삭제 시 비밀번호 필요.

### user

허용 중심:

- dashboard 조회.
- 템플릿 조회.
- PDF 생성 조회.
- PDF 생성 요청.
- PDF 다운로드.

제한 중심:

- 계정 관리 불가.
- 수험생 조회/관리 불가.
- 템플릿 관리/삭제/미리보기 제한.
- 프로젝트 데이터 삭제 불가.

### guest

- 모든 주요 권한 false.

## 클라이언트 권한 처리

- `client/app/access.js`의 `hasAccess()`로 권한 확인.
- `data-required-permission` 속성이 있는 메뉴나 버튼은 권한이 없으면 숨김.
- 각 feature renderer는 action button 렌더링 전 권한 확인.
- 권한이 없어도 서버 API가 최종 검증한다.

## 서버 권한 처리

- `server/create-route-deps.js`가 `assertPermission()`과 `hasPermission()`을 route deps로 제공.
- route 파일은 permission guard 또는 직접 `assertPermission()`을 호출한다.
- 권한 실패 시 HTTP error를 JSON으로 응답한다.

## 계정 관리 제약

- `manageAccounts` 권한 필요.
- 현재 로그인 계정은 삭제할 수 없다.
- 마지막 활성 `super_admin`은 삭제하거나 권한을 낮출 수 없다.
- `user_id`는 unique.
- 비밀번호는 hash로 저장한다.
