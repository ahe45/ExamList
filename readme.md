# ExamList

수험생확인대장 PDF 생성 시스템입니다. 학교별 수험생 데이터를 업로드하고, 학교 전용 PDF 양식을 편집한 뒤, 수험생확인대장 PDF를 생성, 다운로드, 인쇄, 재생성, 삭제할 수 있는 운영자용 웹 애플리케이션입니다.

이 루트 문서는 전체 개요와 상세 문서 링크만 제공합니다. 실제 화면, 패널, 요소, API, DB, 재사용 단위는 `doc/` 폴더의 주제별 문서에 분리되어 있습니다.

## 문서 색인

1. [구현 검증 기록](doc/00-implementation-verification.md)
   - 이 문서를 분리하면서 실제 구현 파일과 다시 대조한 항목과 근거입니다.
2. [시스템 개요](doc/01-system-overview.md)
   - 목적, 기술 스택, 실행 진입점, 환경 변수, 디렉터리 구조입니다.
3. [클라이언트 구조와 라우팅](doc/02-client-shell-routing.md)
   - SPA shell, 전역 상태, 렌더링 방식, route, 화면 진입 데이터 로드, navigation guard입니다.
4. [인증과 권한](doc/03-auth-permissions.md)
   - 로그인, 세션, 역할, 권한 키, 클라이언트/서버 권한 검증 방식입니다.
5. [관리 페이지 명세](doc/04-management-pages.md)
   - 로그인, 공통 상단바/사이드바, 학교 선택, 계정 관리, 양식 관리 페이지입니다.
6. [양식 편집기 명세](doc/05-template-editor.md)
   - 편집기 레이아웃, toolbar, 페이지 속성, 데이터 태그, 수험생 블록, 저장/미리보기입니다.
7. [수험생 데이터 명세](doc/06-candidates.md)
   - 수험생 테이블, 업로드, 사진 ZIP, 상세 수정, XLSX 다운로드, 필드 규칙입니다.
8. [PDF 생성 명세](doc/07-pdf-generations.md)
   - PDF 생성 목록, 생성 마법사, 진행 오버레이, 다운로드, 삭제, 상세, 작업 로그, 서버 생성 흐름입니다.
9. [데이터 삭제 명세](doc/08-data-deletion.md)
   - 삭제 범위, 필터, 양식 선택, 사전 건수 확인, 최종 확인, 삭제 후 상태 갱신입니다.
10. [서버 API 명세](doc/09-api-reference.md)
    - 인증, 시스템, 계정, 학교, 템플릿, 수험생, PDF 생성, 데이터 삭제 API 표입니다.
11. [DB와 파일 저장소](doc/10-database-storage.md)
    - MySQL 테이블, 주요 컬럼, PDF/사진 저장소 구조입니다.
12. [재사용 가이드](doc/11-reuse-guide.md)
    - 다른 프로젝트에서 화면/모듈을 가져갈 때 필요한 파일, 상태 계약, 주의점입니다.
13. [전체 구현 모듈 지도](doc/12-complete-module-map.md)
    - 서버/클라이언트/공유 도메인/CSS/스크립트/저장소 파일을 기능 단위로 빠짐없이 묶은 구현 색인입니다.
14. [상태와 UI 계약 상세 명세](doc/13-state-ui-contracts.md)
    - `appState` 전체 slice, 화면별 DOM action hook, form field, submit 조건, table 상태 계약입니다.
15. [양식 레이아웃과 편집기 런타임 상세 명세](doc/14-template-layout-editor-deep-dive.md)
    - 템플릿 layout JSON, page settings, element config, toolbar/runtime/data tag/candidate block 세부 동작입니다.
16. [API 상세 계약](doc/15-api-detailed-contracts.md)
    - endpoint별 query, body, 응답 payload, 권한, 파일 다운로드, 오류 처리 기준입니다.

## 빠른 실행

```bash
npm install
npm run start
```

기본 서버 주소는 `http://localhost`입니다. `PORT`를 별도로 설정하지 않으면 HTTP 기본 포트인 `80`을 사용하므로 주소 뒤에 포트 번호를 붙이지 않습니다. DB, PDF 큐, 브라우저 경로는 `.env` 또는 `.env.example` 기준 환경 변수로 설정합니다.

Windows 11 PC를 실제 서버처럼 사용할 경우에는 프로젝트 루트의 `start-server.bat`를 실행합니다. 최초 실행이면 `.env` 생성, 의존성 설치, DB 스키마 준비, 기본 슈퍼 관리자 계정과 `한국대학교`의 `기본 템플릿` 생성 후 서버를 시작하고, 이미 구성되어 있으면 바로 서버를 시작합니다. 자세한 내용은 [Windows 간편 배포 가이드](deploy/README.md)를 참고합니다.

Git clone으로 설치한 서버를 GitHub 최신 코드로 갱신할 때는 서버를 중지한 뒤 `update-server.bat`를 실행합니다. 이 배치 파일은 `git pull --ff-only`, `npm install`, `npm run setup:db`를 순서대로 실행하고, 완료 후 `start-server.bat`로 서버를 다시 시작하도록 안내합니다.

## 핵심 기능 요약

- 학교 관리: 학교 목록 검색, 학교 생성/수정/삭제, 학교별 로고와 모집년도 설정.
- 계정 관리: 운영자 계정 생성/수정/삭제, 권한 부여.
- 양식 관리: 학교별 PDF 템플릿 생성, 복사, 수정, 삭제.
- 양식 편집: 문서 HTML 편집, 표/이미지/바코드/QR/데이터 태그/수험생 블록 구성, 표/텍스트 포커스 유지형 toolbar 편집.
- 수험생 데이터: XLSX 업로드, 사진 ZIP 업로드, 업로드 진행 오버레이, 목록 필터/정렬, 개별 수정, 다운로드.
- PDF 생성: 생성 대상 산출, 첫 PDF 미리보기, 배치 생성, 진행률 표시, 다운로드, 인쇄, 재생성, 삭제.
- PDF 작업 로그: 생성, 미리보기, 병합, ZIP 다운로드, 삭제, 재시도 등 감사 로그 조회.
- 데이터 삭제: 학교별 운영 데이터를 범위별로 사전 건수 확인, 공통 busy overlay 표시, 삭제 후 모달 내용 갱신, 관련 PDF 병합 로그와 파일 포함 삭제.

## 최근 반영된 주요 동작

- 양식 편집 toolbar의 글꼴, 글자 크기, 줄 간격은 드롭다운 picker 기반으로 동작하며 텍스트/표 선택 상태가 toolbar 조작 중에도 유지됩니다.
- 글자색과 표/셀 음영 picker의 흰색 항목은 `색 없음`으로 처리됩니다.
- 수험생 데이터 블록과 블록 내부 표는 기본 줄 간격 `1`, 블록 내부 표 셀 여백 `0`을 기본값으로 사용합니다.
- 수험생 데이터 업로드, 수험생 사진 ZIP 처리, 데이터 삭제, 학교 삭제는 공통 busy overlay 스타일로 진행 상태를 표시합니다.
- 데이터 삭제 완료 후 열려 있던 데이터 삭제 설정 모달은 최신 건수와 선택 상태로 갱신됩니다.
- 생성 PDF 데이터 삭제에는 PDF 생성 이력, 일괄 생성 결과, PDF/ZIP 파일, PDF 작업 로그뿐 아니라 관련 PDF 병합 로그와 병합 PDF 파일도 포함됩니다.
- 수험생 사진 ZIP은 미리보기 때 서버 임시 업로드 세션으로 보관하고, 실제 반영 시 같은 ZIP을 재전송하지 않고 `previewToken`으로 처리합니다.

## 기술 스택 요약

- Node.js 기본 HTTP 서버.
- 프레임워크 없는 HTML/CSS/ES Module JavaScript SPA.
- MySQL 또는 MariaDB.
- `exceljs` 기반 XLSX 처리.
- 브라우저 렌더링 기반 PDF 생성.
- `pdf-lib` 기반 PDF 병합.
- `adm-zip`, `yazl` 기반 ZIP 처리.
- 기본 memory queue, 선택적 BullMQ/Redis 기반 PDF 작업 큐.

## 현재 문서 검증 상태

문서 분리 작업 중 다음 구현 파일을 다시 확인했습니다.

- `shared/app-config.js`: SPA route와 view 목록.
- `server/http/routes/*.js`: API route와 permission.
- `db/schema.sql`: 실제 테이블 목록과 컬럼.
- `client/features/candidates/candidate-table-model.js`: 수험생 컬럼과 업로드 정책.
- `client/features/pdf-generations/pdf-generation-flow.js`: PDF 생성 필터 단계와 생성 단위 매핑.
- `client/features/data-deletion/constants.js`: 삭제 scope와 확인 문구.
- `client/features/template-editor/renderers.js`, `client/template-editor-runtime/**`: 편집기 DOM hook과 toolbar/오브젝트 기능.
- `client/features/templates/template-create-modal-*.js`, `server/modules/pdf-templates/service.js`: 새 양식 생성 모드와 기본 템플릿 복제 방식.
- `server/modules/permissions/service.js`: 역할 표시명과 권한 map.
- `client/app/app-state.js`: 화면별 전역 상태 slice와 modal/table/progress 상태 구조.
- `client/features/*/renderers.js`, `client/features/*/actions.js`: 화면별 DOM hook과 action 처리.
- `server/modules/pdf-templates/layout*.js`, `client/features/template-editor/*`: 템플릿 layout 정규화와 편집기 런타임 계약.
- `server/modules/pdf-generations/queue-*.js`: 기본 memory queue와 선택적 BullMQ 큐 동작.
- `server/modules/auth/workbook.js`, `client/features/accounts/*`: 계정 엑셀 업로드 API와 화면 동작.

상세 검증 결과는 [구현 검증 기록](doc/00-implementation-verification.md)에 정리했습니다.
