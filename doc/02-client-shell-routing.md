# 클라이언트 구조와 라우팅

## SPA shell

`index.html`은 로그인 이후 모든 업무 화면의 공통 shell이다.

### 상단 영역

- `header.topbar#topbar`.
- 브랜드 버튼 `#brandHome`.
  - `data-go-view="schoolManagement"`.
  - 학교 목록으로 이동한다.
- 로고 이미지: `/client/assets/logo.png`.
- 제품명: `수험생확인대장`.
- 인증 상태 영역: `#authStatus`.
  - 현재 학교.
  - 사용자 이름과 권한.
  - 학교 목록 버튼.
  - 로그아웃 버튼.

### 작업공간 사이드바

- `aside#workspaceSidebar`.
- 학교 목록과 계정 관리 화면에서는 숨김.
- 학교 작업공간 화면에서 표시.
- 메뉴:
  - 양식 관리: `templateManagement`, permission `viewTemplates`.
  - 수험생 데이터: `candidateLookup`, permission `viewCandidates`.
  - PDF 생성: `pdfGenerationHistory`, permission `viewGenerations`.
  - PDF 작업 로그: `pdfHistoryManagement`, permission `viewGenerations`.
  - 데이터 삭제: `dataDeletion`, permission `deleteProjectData`.
- 모든 작업공간 메뉴는 `data-school-required="true"`를 가진다.

### 메인 view panel

`main.content-grid` 안에 view별 panel이 정적으로 존재한다.

- `templateManagement`
- `accountManagement`
- `schoolManagement`
- `pdfGenerationHistory`
- `pdfHistoryManagement`
- `pdfGenerationDetail`
- `dataDeletion`
- `templateEditor`
- `candidateLookup`

현재 view의 panel만 표시하고 나머지는 `hidden` 처리한다.

### 전역 모달 호스트

- `#globalModalHost`.
- 다음 모달/오버레이가 여기에 렌더링된다.
  - PDF 생성 모달.
  - PDF 상세 모달.
  - PDF 삭제 확인 모달.
  - PDF 일괄 다운로드 모달.
  - PDF 생성 결과 처리 모달.
  - PDF 다운로드 진행 오버레이.
  - PDF 생성 진행 오버레이.
  - 데이터 삭제 모달.
  - modal close prompt.

## 전역 상태

상태는 `client/app/app-state.js`의 단일 객체 `appState`에 저장된다.

| State slice | 역할 |
| --- | --- |
| `auth` | 인증 여부, 역할, 사용자 |
| `summary` | 권한 요약, 총 수험생 수, 총 고사실 수, 총 템플릿 수 |
| `accounts` | 계정 목록과 계정 모달 상태 |
| `schools` | 학교 목록, 검색 필터, 학교 상세, 학교 생성/수정 모달 |
| `templates` | 템플릿 목록, 카드 inline editor, 템플릿 생성 모달 |
| `templateEditor` | 편집 중인 템플릿, 데이터 태그, 미리보기, dirty 상태, 선택 페이지 |
| `candidates` | 수험생 목록, 테이블 상태, 업로드 모달, 상세 모달, 다운로드 확인 모달 |
| `pdfGenerations` | PDF 생성 목록, 생성 모달, 진행 오버레이, 다운로드/삭제/상세/결과 모달, 작업 로그 |
| `pdfGenerationDetail` | 상세 페이지용 PDF 생성 결과 |
| `dataDeletion` | 데이터 삭제 카드, 설정 모달, 확인 모달 |
| `ui` | 활성 학교, 활성 템플릿, 공통 modal close prompt |

## 렌더링 방식

`client/app/app-renderer.js`의 `createAppRenderer()`가 모든 view를 렌더링한다.

1. `syncViewShell()`로 shell mode, sidebar 노출, active nav, 권한별 메뉴 표시를 갱신.
2. `renderAuthStatus()`로 topbar 오른쪽을 갱신.
3. 각 view panel에 대응 renderer 결과를 `innerHTML`로 반영.
4. 전역 modal host를 현재 상태에 맞게 렌더링.
5. 현재 view가 `templateEditor`이면 template editor runtime을 mount.
6. 다른 화면이면 editor runtime을 unmount.

## Route 정의

Route 정의는 `shared/app-config.js`의 `viewRouteDefinitions`에 있다. 서버는 `getViewFromPathname()`으로 SPA route 여부를 판정하고, 클라이언트는 `getRouteMatch()`와 `getViewRoutePath()`로 navigation을 계산한다.

| URL | View | 설명 |
| --- | --- | --- |
| `/login` | 별도 HTML | 운영자 로그인 |
| `/schools` | `schoolManagement` | 학교 목록 |
| `/accounts` | `accountManagement` | 계정 관리 |
| `/templates` | `templateManagement` | 전역 또는 기본 템플릿 목록 |
| `/schools/:schoolId/templates` | `templateManagement` | 학교별 양식 목록 |
| `/templates/:templateId/edit` | `templateEditor` | 전역 템플릿 편집 |
| `/schools/:schoolId/templates/:templateId/edit` | `templateEditor` | 학교별 템플릿 편집 |
| `/templates/:templateId/candidates` | `candidateLookup` | 템플릿 기반 수험생 데이터 |
| `/schools/:schoolId/candidates` | `candidateLookup` | 학교별 수험생 데이터 |
| `/templates/:templateId/pdf-generations` | `pdfGenerationHistory` | 템플릿 기반 PDF 생성 목록 |
| `/schools/:schoolId/pdf-generations` | `pdfGenerationHistory` | 학교별 PDF 생성 목록 |
| `/templates/:templateId/pdf-generations/:generationId` | `pdfGenerationDetail` | PDF 생성 상세 페이지 |
| `/schools/:schoolId/pdf-generations/:generationId` | `pdfGenerationDetail` | 학교별 PDF 생성 상세 페이지 |
| `/schools/:schoolId/pdf-history` | `pdfHistoryManagement` | PDF 작업 로그 |
| `/schools/:schoolId/data-deletion` | `dataDeletion` | 데이터 삭제 |

서버 page handler 특이 동작:

- `/`는 `/login`으로 redirect.
- `/login`과 `/login/`은 `login.html` 제공.
- `/dashboard`는 `/login`으로 301 redirect.
- 나머지 SPA route는 `index.html` 제공.

## 화면 진입 데이터 로드

`client/app/bootstrap-loader.js`의 `loadViewData()`가 view별 데이터를 불러온다.

- 학교 route가 있으면 학교 상세를 먼저 로드.
- 모든 view에서 시스템 summary를 로드.
- `schoolManagement`: 학교 목록.
- `accountManagement`: 계정 목록.
- `templateManagement`: 템플릿 목록.
- `candidateLookup`: 수험생 목록.
- `pdfGenerationHistory`: PDF 생성 목록.
- `pdfHistoryManagement`: PDF 감사 로그.
- `pdfGenerationDetail`: PDF 생성 상세.
- `templateEditor`: 학교 설정과 템플릿 상세.
- `dataDeletion`: 진입 시 별도 로드 없음. 삭제 모달을 열 때 summary와 option을 로드한다.

## Shell mode와 active nav

`client/app/view-shell.js`가 shell 표시 상태를 제어한다.

- `template-list` mode:
  - `accountManagement`
  - `schoolManagement`
- `workspace` mode:
  - 그 외 학교 작업공간 화면.
- `templateEditor`의 active nav는 `templateManagement`.
- `pdfGenerationDetail`의 active nav는 `pdfGenerationHistory`.
- `data-required-permission`은 권한이 없으면 숨김.
- `data-school-required`는 활성 학교가 없으면 disabled.
- `data-template-required`는 활성 템플릿이 없으면 disabled.

## 네비게이션 보호

템플릿 편집 화면에서 저장하지 않은 변경사항이 있으면 다음 상황에서 prompt가 표시된다.

- 다른 view 이동.
- browser 뒤로/앞으로 이동.
- 편집기 내 페이지 전환.
- browser 닫기 또는 새로고침.

Prompt는 저장 후 이동, 변경사항 버리기, 취소 흐름을 제공한다.
