# 양식 편집기 안정화 리팩토링 계획

## 진행 상태표

마지막 업데이트:

- 2026-05-30

| 단계 | 상태 | 검증/기록 | 다음 조건 |
| --- | --- | --- | --- |
| 리팩토링 원칙과 금지 범위 명시 | 완료 | `plan.md` 작성 및 보완 | 계속 준수 |
| 작업 전 기준선 고정 | 완료 | `npm test`, smoke 기준선 기록 | 각 단위마다 재검증 |
| 1차 focus layout helper 분리 | 완료 | focus layout 테스트 및 smoke 통과 | 추가 변경 없음 |
| 1차 발견 버그 안정화 | 완료 | focus/cell object sizing 및 smoke 보강 | 재발 시 별도 버그 작업 |
| 2차 selection refocus helper 분리 | 완료 | `candidate-block-grid-selection-focus.test.js` | 추가 변경 없음 |
| 2차 keyboard delete target helper 분리 | 완료 | `candidate-block-grid-keyboard-target.test.js` | 추가 변경 없음 |
| 2차 boundary blank/sibling/grid traversal helper 분리 | 완료 | `candidate-block-grid-boundary.test.js` | 추가 변경 없음 |
| 2차 전체 리뷰 체크포인트 | 완료 | adapter 책임 감소와 남은 위험 기록 | 3차 native deletion guard 테스트 선행 |
| 3차 native deletion guard 기본 Range/Selection 테스트 | 완료 | `candidate-block-grid-native-deletion.test.js`, 5개 테스트 | 예외 케이스 추가 고정 |
| 3차 native deletion guard 예외 케이스 보강 | 완료 | blank text/BR, nested wrapper, `intersectsNode` 예외 테스트 | range helper 이동 가능 |
| 3차 range adjacency helper 분리 | 완료 | `getCandidateBlockGridAdjacentToRange` 이동 및 326개 테스트 통과 | range inclusion helper 검토 |
| 3차 range inclusion helper 분리 | 완료 | `doesRangeIncludeCandidateBlockGrid` 이동 및 328개 테스트 통과 | blank boundary host 묶음 검토 |
| 3차 blank boundary host 인접 판단 묶음 분리 | 완료 | boundary 14개 테스트, native deletion 8개 테스트, 전체 330개 테스트 통과 | 최종 guard orchestration 이동 여부 검토 |
| `shouldPreventCandidateBlockGridNativeDeletion` 최종 orchestration 이동 | 완료 | boundary/native deletion 테스트, 전체 330개 테스트, browser/UI smoke 통과 | 수험생 블록 native deletion 리팩토링 일단 중지 가능 |
| 수험생 블록 adapter 누적 리뷰 | 완료 | 823줄에서 627줄로 감소, adapter diff 257줄 삭제/5줄 추가 | 추가 수험생 블록 이동은 일단 보류 |
| 수험생 블록 외 다음 영역 선정 | 완료 | `object-size-controls.js`를 다음 후보로 선정 | 구현 전 테스트 커버와 첫 단위 재확인 |
| object size controls 사전 검토 | 완료 | pure helper 후보와 위험 경계 확인 | DOM 없는 value helper부터 진행 |
| object size value helper 분리 | 완료 | `object-size-values.test.js` 5개, 전체 335개 테스트, browser/UI smoke 통과 | DOM 측정 helper는 테스트 선행 후 검토 |
| object size DOM 측정 helper 검토 | 완료 | modal content size fallback 순서 고정 후 분리 | grid 최소 크기 helper는 별도 단위 |
| object size modal content 측정 helper 분리 | 완료 | `object-size-measurements.test.js` 7개, 전체 342개 테스트, browser/UI smoke 통과 | grid/table 측정 helper는 테스트 선행 |
| object size grid 최소 크기 helper 검토 | 완료 | row gap/table minimum clamp 순서 고정 후 분리 | table rendered target width 검토 |
| object size grid 최소 크기 helper 분리 | 완료 | `object-size-measurements.test.js` 10개, 전체 345개 테스트, browser/UI smoke 통과 | table width 측정 helper는 테스트 선행 |
| object table rendered target width helper 검토 | 완료 | collapsed border/rendered overflow/scale clamp 고정 후 분리 | table style 적용 로직 이동 금지 |
| object table rendered target width helper 분리 | 완료 | `object-size-measurements.test.js` 15개, 전체 350개 테스트, browser/UI smoke 통과 | table segment size helper 검토 |
| object table segment size helper 검토 | 완료 | 순수 helper로 확인 후 분리 | DOM 측정 helper는 별도 단위 |
| object table segment size helper 분리 | 완료 | `object-size-table-segments.test.js` 6개, 전체 356개 테스트, browser/UI smoke 통과 | column/row 측정 helper 검토 |
| object table column/row 측정 helper 검토 | 완료 | inline style/util/rect fallback 순서 고정 후 분리 | 실제 style 적용 로직은 보류 |
| object table column/row 측정 helper 분리 | 완료 | `object-size-measurements.test.js` 19개, 전체 360개 테스트, browser/UI smoke 통과 | object size controls 누적 리뷰 |
| object size controls 누적 리뷰 | 완료 | 809줄에서 642줄로 감소, direct 테스트 30개 추가 | 실제 적용 함수 이동은 보류 |
| object size controls 1차 중지 결정 | 완료 | 남은 코드는 style 적용/sync/orchestration 중심 | 다음 작업 전 새 후보 선정 |

## 1. 목적

이 문서는 ExamList의 양식 편집기 영역을 더 안정적으로 유지보수하기 위한 리팩토링 계획이다.

가장 중요한 목표는 다음 하나다.

> 기존 기능을 깨뜨리지 않고, 새로운 버그를 만들 가능성을 최대한 낮춘 상태에서 양식 편집기의 복잡도를 점진적으로 줄인다.

이 계획의 리팩토링은 새 기능 개발이 아니다. UI 개선, 저장 포맷 변경, 동작 변경, 대규모 재작성도 아니다. 이미 동작하는 시스템을 보존하면서, 반복적으로 버그가 발생하는 양식 편집기 영역의 변경 위험을 낮추는 작업이다.

## 2. 현재 판단

프로젝트 전체를 전면 리팩토링해야 하는 상태는 아니다.

근거는 다음과 같다.

- `npm test` 기준 전체 테스트가 통과하고 있다.
- 서버, 클라이언트, 공유 도메인, 양식 편집기 런타임이 이미 디렉터리 단위로 분리되어 있다.
- `client/template-editor-runtime/README.md`에 host/runtime/server rendering layer의 책임 경계가 정의되어 있다.
- 대부분의 큰 파일과 수정 위험은 프로젝트 전체가 아니라 양식 편집기 주변에 집중되어 있다.

다만 양식 편집기는 다음 이유로 부분 리팩토링 필요성이 높다.

- 최근 버그와 수정 요청이 대부분 양식 편집기에 집중되어 있다.
- DOM selection, contenteditable, IME 입력, 표 편집, 이미지/오브젝트 이동, 수험생 블록, 저장/복원, 서버 미리보기까지 연결되어 있어 변경 영향 범위가 크다.
- 일부 파일이 지나치게 크고, DOM 조작과 계산 로직이 한 파일 안에 섞여 있다.
- host layer와 runtime layer에 유사한 책임이 남아 있어, 한쪽 수정이 다른 쪽 회귀로 이어질 수 있다.

## 3. 최상위 원칙

모든 리팩토링은 아래 원칙을 지켜야 한다.

### 3.1 기능 불변

리팩토링 중 사용자에게 보이는 동작을 바꾸지 않는다.

금지 항목:

- 버튼 위치, 문구, 표시 조건 변경
- 저장 결과 변경
- 미리보기/PDF 출력 결과 변경
- 기존 단축키 동작 변경
- 기존 데이터 태그 처리 방식 변경
- 기존 수험생 블록 배치 방식 변경
- 기존 표/이미지/오브젝트 선택 방식 변경

동작 변경이 필요하다면 리팩토링 작업과 분리된 별도 작업으로 다룬다.

### 3.2 저장 포맷 불변

가장 위험한 변경은 persisted layout shape 변경이다. 따라서 리팩토링 기간에는 저장 데이터 구조를 바꾸지 않는다.

금지 항목:

- template layout JSON shape 변경
- page settings key 변경
- element config key 변경
- data tag settings shape 변경
- candidate block grid settings shape 변경
- 서버 normalization 결과 shape 변경
- runtime snapshot shape 변경

저장 포맷 변경은 충분한 테스트와 migration 계획이 생긴 뒤 별도 계획으로만 진행한다.

### 3.3 전면 재작성 금지

양식 편집기는 복잡하지만 이미 많은 기능이 동작하고 있다. 전면 재작성은 회귀 위험이 너무 크다.

금지 항목:

- `client/features/template-editor` 전체 재구성
- `client/template-editor-runtime` 전체 재작성
- contenteditable 기반 편집기 교체
- 서버 preview renderer 전체 교체
- 한 번에 여러 핵심 파일을 동시에 대규모 이동

허용되는 변경은 작은 단위의 추출, 이름 정리, 책임 분리, 테스트 보강이다.

### 3.4 작은 변경 단위

한 번의 작업은 하나의 책임만 다룬다.

좋은 작업 단위:

- 좌표 계산 함수만 별도 파일로 이동
- DOM selector helper만 별도 파일로 이동
- px/pt/mm 변환 helper만 별도 파일로 이동
- 수험생 블록 포커스 모달의 레이아웃 계산만 분리
- 오브젝트 크기 입력값 정규화만 분리

나쁜 작업 단위:

- 포커스 모달, 표 편집, 저장 로직을 한 번에 정리
- host/runtime 구조를 한 번에 바꿈
- 테스트 없이 큰 파일을 여러 개 쪼갬
- CSS와 JS 동작을 동시에 바꿈

### 3.5 순수 로직과 DOM 의존 로직 구분

리팩토링 대상은 반드시 아래 세 가지로 먼저 분류한다.

순수 helper:

- 입력값만으로 결과가 결정된다.
- `window`, `document`, `HTMLElement`, `getBoundingClientRect`, `getComputedStyle`, `selection`, `appState`를 참조하지 않는다.
- DOM을 읽지도 쓰지도 않는다.
- Node test runner에서 브라우저 없이 테스트할 수 있다.

DOM 측정 helper:

- DOM을 변경하지는 않지만, `getBoundingClientRect`, `offsetWidth`, `window.innerWidth`, `getComputedStyle`처럼 브라우저 layout 값을 읽는다.
- 호출 시점과 layout 상태에 따라 결과가 달라질 수 있다.
- 순수 helper가 아니라 중간 위험 작업으로 본다.
- 분리할 때는 호출 순서, 측정 시점, fallback 값을 바꾸지 않는다.

DOM 변경 helper:

- style/class/dataset/DOM tree/selection/focus/event listener를 변경한다.
- 가장 위험하므로 테스트 또는 smoke 없이 이동하지 않는다.
- 리팩토링 초기에 구조 변경 대상으로 삼지 않는다.

첫 단계에서는 순수 helper만 우선 분리한다. DOM 측정 helper는 함수 이름이 계산처럼 보여도 순수 helper로 취급하지 않는다.

### 3.6 테스트 선행

리팩토링 전에 해당 영역의 현재 동작을 고정하는 테스트 또는 smoke 시나리오가 있어야 한다.

원칙:

- 테스트가 부족한 영역은 먼저 테스트를 추가한다.
- 테스트를 추가할 수 없는 DOM 상호작용은 smoke 시나리오를 먼저 명확히 만든다.
- 테스트 없이 큰 파일을 이동하지 않는다.
- 리팩토링 후 기존 테스트뿐 아니라 관련 테스트를 다시 실행한다.

### 3.7 중단 가능한 진행

각 단계는 언제든 중단해도 시스템이 정상 동작해야 한다.

원칙:

- 단계 중간에 저장 포맷이 반쯤 바뀐 상태를 만들지 않는다.
- 단계 중간에 host와 runtime 중 한쪽만 새 계약을 기대하게 만들지 않는다.
- 한 단계가 실패하면 그 단계만 되돌릴 수 있어야 한다.
- 여러 단계의 변경을 한 커밋에 쌓지 않는다.

## 4. 명시적 비목표

이번 리팩토링의 비목표는 다음과 같다.

- 새 기능 추가
- 디자인 변경
- 양식 편집기 UX 변경
- 저장 데이터 migration
- PDF 렌더링 엔진 교체
- 프론트엔드 프레임워크 도입
- TypeScript 전환
- 테스트 프레임워크 교체
- 전체 CSS 재설계
- 전체 상태 관리 방식 교체

이 항목들은 필요할 수 있지만, 안정화 리팩토링과 섞으면 위험이 커진다.

## 5. 주요 대상 영역

우선순위는 최근 버그 집중도, 파일 크기, 변경 위험을 기준으로 잡는다.

### 5.1 1순위: 수험생 블록 포커스 편집

대상:

- `client/features/template-editor/candidate-block-grid-focus-editor.js`

위험:

- 수험생 블록 내부 편집
- 확대 편집 모달
- overflow 감지
- 표 normalize
- 저장 전 surface sync
- toolbar/selection과의 충돌

목표:

- 레이아웃 계산과 DOM 이벤트 처리를 분리한다.
- 순수 계산 함수부터 테스트 가능하게 만든다.
- 모달 생성, 크기 계산, overflow 판단, 저장 sync를 작은 책임으로 나눈다.

초기 분리 후보:

- CSS 변수 이름 목록
- px 값 parsing과 숫자 clamp
- 이미 측정된 rect 객체를 입력으로 받는 focus panel layout 계산
- 이미 측정된 rect 객체를 입력으로 받는 backdrop layout 계산
- overflow 판단에 필요한 순수 threshold 계산

처음에는 DOM을 직접 바꾸는 함수보다 계산 helper를 먼저 분리한다.

첫 단계에서 바로 분리하지 않을 후보:

- `getVisibleCanvasRect`처럼 `getBoundingClientRect`와 `window.innerWidth`를 직접 읽는 함수
- `getCanvasBackdropRect`처럼 viewport와 DOM rect를 동시에 읽는 함수
- `getElementChromeSize`처럼 `getComputedStyle`을 읽는 함수
- `getBlockLogicalSize`처럼 DOM rect, offset, grid style을 함께 읽는 함수

이 함수들은 계산처럼 보여도 DOM 측정 helper다. 순수 helper 추출이 끝나고 테스트와 수동 확인 기준이 생긴 뒤 별도 단계로 다룬다.

### 5.2 2순위: 수험생 블록 runtime adapter

대상:

- `client/features/template-editor/candidate-block-grid-adapter.js`

위험:

- 앱 state와 runtime state 연결
- 수험생 블록 설정 변경
- grid 선택/이동/크기 변경
- 저장/복원
- 서버 preview와의 결과 차이

목표:

- state 읽기/쓰기와 DOM runtime 호출을 분리한다.
- candidate block grid config normalization과 runtime binding을 섞지 않는다.
- adapter가 너무 많은 세부 DOM 규칙을 알지 않도록 줄인다.

초기 분리 후보:

- selected page에서 candidate block grid config 읽기
- candidate block grid config patch 생성
- runtime event payload 정규화
- renderer 갱신 조건 계산

### 5.3 3순위: 오브젝트 크기 조절

대상:

- `client/features/template-editor/object-size-controls.js`

위험:

- 이미지, 표, 생성 오브젝트, 수험생 블록의 크기 변경이 모두 연결되어 있다.
- table cell, collapsed border, visual scale, candidate block modal 내부 scale이 얽혀 있다.

목표:

- 숫자 입력 정규화와 DOM 크기 적용을 분리한다.
- table 크기 계산 helper를 독립적으로 테스트할 수 있게 만든다.
- candidate block grid 특수 처리와 일반 object 처리의 경계를 명확히 한다.

초기 분리 후보:

- object size input parsing
- pixel value parsing
- table collapsed border adjustment 계산
- table segment size normalization
- selected object 목록 수집

### 5.4 4순위: host/runtime 양쪽의 flow reflow 중복 정리

대상:

- `client/features/template-editor/object-flow-reflow.js`
- `client/template-editor-runtime/client/features/template-editor/object-flow-reflow.js`

위험:

- host layer와 runtime layer의 책임이 섞이면 한쪽 수정이 다른 쪽 버그로 이어진다.
- 두 파일이 완전히 같은 파일은 아니지만 유사한 관심사를 다룬다.

목표:

- 중복된 순수 계산만 먼저 중립 helper로 분리한다.
- DOM read/write는 runtime에 남긴다.
- host는 runtime public API를 통해서만 동작하도록 유지한다.

주의:

- 이 단계는 앞선 단계보다 위험하다.
- 충분한 테스트가 생긴 뒤 진행한다.
- public API 변경 없이 내부 helper 추출부터 시작한다.

### 5.5 5순위: 큰 CSS 파일의 기능 단위 정리

대상 예시:

- `styles/features/template-editor.css`
- `styles/features/template-editor/**/*.css`
- `styles/features/template-editor/data-tags.css`
- `styles/features/templates.css`, 단 양식 목록과 편집기 진입 UI에 직접 관련된 selector만
- `styles/surfaces.css`, 단 편집기 document surface에 직접 관련된 selector만

양식 편집기 안정화와 직접 관련 있는 CSS만 다룬다.

이번 계획에서 기본적으로 제외할 CSS:

- `styles/features/pdf-generations.css`
- `styles/features/data-deletion.css`
- `styles/features/grids-table.css`
- 양식 편집기 화면에서 재사용되지 않는 관리 화면 CSS

제외 CSS를 수정해야 한다면 양식 편집기 안정화 리팩토링과 분리된 별도 작업으로 다룬다.

목표:

- JS 동작 리팩토링과 CSS 리팩토링을 동시에 하지 않는다.
- CSS 분리는 클래스명 변경 없이 파일 구조만 정리한다.
- import 순서와 cascade 변화를 반드시 확인한다.

## 6. 작업 전 기준선 고정

리팩토링 시작 전 현재 동작을 기준선으로 고정한다.

### 6.1 필수 확인

리팩토링 시작 전 아래 항목을 기록한다.

- 현재 브랜치
- `git status --short` 결과
- `npm test` 결과
- 양식 편집기 관련 smoke 실행 가능 여부
- 현재 알려진 버그 목록
- 리팩토링 범위에서 제외할 진행 중 작업

### 6.2 기준선 명령

기본 테스트:

```bash
npm test
```

가능하면 실행할 smoke:

```bash
npm run smoke:ui
npm run smoke:browser
```

특정 편집기 smoke가 필요하면 직접 실행한다.

```bash
node scripts/smoke-browser.js
node scripts/smoke-ui.js
```

주의:

- smoke는 DB, 브라우저 실행 파일, 서버 상태에 따라 실패할 수 있다.
- 환경 문제로 실행하지 못한 경우, 실패 이유를 문서화한다.
- 환경 실패와 기능 실패를 섞어서 판단하지 않는다.

### 6.3 미리보기와 PDF 기준선

`preview/PDF 결과가 기존과 동일하다`는 기준은 비교 대상을 정해야 의미가 있다. 위험도가 중간 이상인 리팩토링 전에는 아래 기준선을 먼저 정한다.

기준 템플릿:

- 기본 템플릿 1개
- 수험생 블록, 표, 이미지, 데이터 태그, barcode/QR 중 수정 대상 기능을 포함한 템플릿 1개
- 실제 복잡 템플릿이 없다면 기본 템플릿을 복사해 검증용 템플릿을 만든다.
- 검증용 템플릿 생성은 로컬 또는 테스트 DB에서만 수행한다. 운영 데이터에 검증용 템플릿을 만들지 않는다.

기준 데이터:

- 샘플 수험생 데이터 또는 실제 테스트용 수험생 데이터
- 사진이 필요한 기능이면 사진이 있는 수험생과 사진이 없는 수험생을 모두 포함한다.
- 타 고사실 페이지나 생성 단위가 관련되면 최소 2개 고사실 데이터를 포함한다.
- 실제 개인정보가 포함된 운영 데이터를 기준선 artifact로 남기지 않는다.

비교 방식:

- 저장 전후 layout JSON shape가 바뀌지 않는지 확인한다.
- 같은 템플릿과 같은 데이터로 preview를 열었을 때 페이지 수, 주요 텍스트, 표 구조, 수험생 블록 배치가 유지되는지 확인한다.
- PDF 생성까지 영향을 줄 수 있는 변경이면 PDF page count와 주요 배치가 유지되는지 확인한다.
- screenshot 비교가 가능하면 같은 viewport에서 변경 전후 이미지를 남긴다.
- 자동 비교가 없으면 수동 확인 항목과 결과를 작업 기록에 남긴다.

낮은 위험의 순수 helper 추출은 매번 PDF 생성까지 요구하지 않는다. 다만 저장, preview, PDF에 연결되는 계산을 바꿨다면 해당 영역의 기준선 비교를 수행한다.

## 7. 단계별 계획

### 단계 0: 리팩토링 안전 장치 준비

목표:

- 기능 변경 없이 검증 체계를 먼저 강화한다.

작업:

- 양식 편집기 관련 기존 테스트 목록을 정리한다.
- 현재 smoke 시나리오 중 양식 편집기 관련 항목을 정리한다.
- 최근 자주 발생한 버그 유형을 체크리스트로 만든다.
- 테스트 없이 건드리기 위험한 파일을 표시한다.

완료 기준:

- 리팩토링 대상 파일별로 최소 검증 방법이 정해져 있다.
- `npm test`가 통과한다.
- smoke를 실행하지 못하는 경우, 이유와 대체 수동 검증 항목이 정리되어 있다.

중단 조건:

- 기준선 테스트가 이미 실패한다.
- 현재 동작이 불명확해서 리팩토링 후 정상 여부를 판단할 수 없다.

### 단계 1: 테스트와 smoke 보강

목표:

- 리팩토링 전에 현재 동작을 테스트로 고정한다.

우선 보강할 테스트:

- IME 조합 중 입력이 중복 저장되지 않는지
- toolbar 조작 중 selection이 유지되는지
- 표 선택 후 글꼴/색상/테두리 조작이 selection을 잃지 않는지
- 수험생 블록 포커스 편집 후 저장/복원이 되는지
- 수험생 블록 내부 표가 normalize 후 유지되는지
- 이미지 이동/크기 변경 후 저장/복원이 되는지
- barcode/QR 생성 오브젝트가 저장/미리보기에서 유지되는지
- page settings 변경 후 runtime surface가 깨지지 않는지

가능하면 자동 테스트로 작성한다.

자동화가 어려운 항목은 smoke 시나리오로 명시한다.

완료 기준:

- 새 테스트가 기존 동작을 기준으로 통과한다.
- 테스트가 implementation detail에 과하게 묶이지 않는다.
- 리팩토링이 아닌 테스트 보강만 포함한다.

중단 조건:

- 테스트 작성 중 실제 기존 버그가 발견된다.
- 발견된 버그가 리팩토링 범위보다 우선 해결되어야 한다.

### 단계 2: 순수 helper 추출

목표:

- DOM read/write를 건드리지 않고, 계산 로직만 분리한다.

대상 후보:

- 숫자 parsing
- pixel parsing
- px/pt/mm 변환
- clamp helper
- layout size 계산
- table segment size 계산
- config patch 생성
- option normalization

규칙:

- 함수 이동 전후 결과가 같아야 한다.
- export 함수 이름은 현재 의미를 그대로 드러내야 한다.
- 이동한 helper에는 작은 단위 테스트를 추가한다.
- DOM element를 직접 변경하는 함수는 이 단계에서 이동하지 않는다.

완료 기준:

- 기능 동작이 바뀌지 않는다.
- 관련 테스트와 `npm test`가 통과한다.
- 이동된 helper는 독립적으로 이해할 수 있다.

중단 조건:

- helper 추출 과정에서 호출 순서가 바뀐다.
- DOM read timing이 바뀐다.
- selection, focus, layout measurement 결과가 달라진다.

### 단계 3: 수험생 블록 포커스 편집기 분리

목표:

- `candidate-block-grid-focus-editor.js`의 책임을 작은 파일로 나눈다.

권장 순서:

1. 레이아웃 계산 helper 분리
2. overflow 판단 helper 분리
3. CSS variable 적용/해제 helper 분리
4. focus editor state 생성/정리 helper 분리
5. event binding cleanup helper 분리

주의:

- 처음에는 public 함수 signature를 바꾸지 않는다.
- 외부 모듈에서 호출하는 entry point는 유지한다.
- DOM 생성 markup은 마지막에만 분리한다.
- focus, selection, IME 관련 로직은 테스트 없이 이동하지 않는다.

검증 항목:

- 수험생 블록 더블클릭 또는 편집 진입
- focus editor 크기와 위치
- focus editor 닫기
- 내용 수정 후 반영
- overflow 시 메시지 표시
- 표 포함 블록 저장
- 모달 내부 이미지/오브젝트 선택
- 닫기 후 원래 편집기 selection 상태

완료 기준:

- 파일 크기가 줄어들어도 동작은 동일하다.
- 새로 분리된 파일은 책임이 명확하다.
- `npm test`가 통과한다.
- 관련 smoke 또는 수동 체크리스트가 통과한다.

### 단계 4: 오브젝트 크기 조절 분리

목표:

- `object-size-controls.js`에서 계산 로직과 DOM 적용 로직을 분리한다.

권장 순서:

1. 입력값 정규화 helper 분리
2. table size 계산 helper 분리
3. selected object 수집 helper 분리
4. candidate block grid 특수 처리 분리
5. toolbar rendering과 command 실행 경계 정리

주의:

- 실제 DOM width/height를 쓰는 부분은 measurement timing이 중요하다.
- visual scale 보정 로직은 변경하지 않는다.
- collapsed border 보정은 테스트 없이 수정하지 않는다.
- 수험생 블록 내부 표와 일반 표를 혼동하지 않는다.

검증 항목:

- 이미지 width/height 직접 입력
- 이미지 drag resize
- 표 width/height 직접 입력
- 표 cell resize 이후 저장
- barcode/QR 크기 변경
- 수험생 블록 grid 크기 변경
- candidate block modal 내부 object 크기 변경

완료 기준:

- 계산 helper 테스트가 추가된다.
- DOM 적용 순서가 유지된다.
- 기존 UI 조작 결과가 동일하다.

### 단계 5: 수험생 블록 adapter 정리

목표:

- `candidate-block-grid-adapter.js`에서 state 처리, runtime 호출, config patch 생성을 분리한다.

권장 순서:

1. appState에서 selected page/config를 읽는 helper 분리
2. config patch builder 분리
3. runtime event payload normalization 분리
4. render refresh 필요 여부 계산 분리
5. adapter entry point는 유지

주의:

- appState shape를 바꾸지 않는다.
- runtime API shape를 바꾸지 않는다.
- 저장 payload shape를 바꾸지 않는다.
- server normalization과 맞물린 config key는 변경하지 않는다.

검증 항목:

- 수험생 블록 생성
- 열/행/간격 변경
- 정렬 기준 변경
- 빈 블록 표시 옵션 변경
- generated object 삽입
- 저장 후 다시 열기
- preview/PDF 미리보기

완료 기준:

- adapter가 직접 처리하는 책임이 줄어든다.
- config patch 결과가 기존과 동일하다.
- 관련 테스트가 통과한다.

### 단계 6: host/runtime 중복 책임 정리

목표:

- host와 runtime 양쪽에 남아 있는 유사 로직을 더 안전한 위치로 옮긴다.

우선순위:

1. 완전히 순수한 계산 helper
2. layout normalization helper
3. object flow 관련 공통 계산
4. DOM과 무관한 값 변환

규칙:

- DOM read/write는 runtime에 남긴다.
- host는 runtime 내부 파일을 직접 import하지 않는다.
- 공유가 필요한 순수 helper는 중립 위치에 둔다.
- public API 변경은 마지막 수단으로만 사용한다.

주의:

- 이 단계는 앞선 단계보다 위험하다.
- 작은 helper 하나씩 이동한다.
- 이동 전후 diff가 크면 작업을 나눈다.
- host/runtime 양쪽 테스트가 모두 있어야 한다.

완료 기준:

- 중복이 줄지만 runtime 경계가 흐려지지 않는다.
- `client/template-editor-runtime/README.md`의 경계 규칙을 위반하지 않는다.
- 기존 smoke와 테스트가 통과한다.

### 단계 7: CSS 구조 정리

목표:

- 양식 편집기 관련 CSS를 기능별로 읽기 쉽게 정리한다.

규칙:

- 클래스명 변경 금지
- selector 의미 변경 금지
- cascade 순서 변경 최소화
- JS 리팩토링과 같은 커밋에 섞지 않기
- visual regression 확인 없이는 큰 CSS 이동 금지

검증 항목:

- template list
- template editor shell
- toolbar
- data tags panel
- document surface
- candidate block grid
- focus editor modal
- responsive layout

완료 기준:

- 화면이 기존과 동일하게 보인다.
- CSS 파일만 이동 또는 분리된다.
- JS 동작 변경이 없다.

## 8. 검증 전략

### 8.1 매 단계 공통 검증

각 단계마다 최소 다음을 실행한다.

```bash
npm test
```

양식 편집기 관련 파일을 건드렸다면 가능한 범위에서 smoke를 실행한다.

```bash
npm run smoke:ui
npm run smoke:browser
```

환경상 smoke가 불가능하면 수동 체크리스트를 실행하고 결과를 기록한다.

### 8.2 자동 테스트 우선 영역

자동 테스트로 묶기 좋은 영역:

- pure helper
- normalization
- config patch
- request payload builder
- table size 계산
- page settings 계산
- data tag sample 처리
- overflow 계산
- generation unit config

### 8.3 smoke 또는 수동 검증이 필요한 영역

자동 테스트만으로 부족한 영역:

- browser selection
- IME composition
- contenteditable caret
- toolbar focus 이동
- pointer drag
- table resize handle
- image resize handle
- modal focus trap
- 실제 preview/PDF rendering

### 8.4 검증 체크리스트 운용 방식

수동 체크리스트는 매번 전체를 수행하지 않는다. 변경 위험과 영향 범위에 따라 3단계로 나눈다.

필수 최소 체크:

- 대상 양식 편집 화면 진입
- 수정 대상 기능 1회 조작
- 저장
- 새로고침 또는 재진입
- 저장된 결과 유지 확인
- `npm test` 통과

영향 영역별 체크:

- 수정한 파일이 수험생 블록 관련이면 수험생 블록 체크를 수행한다.
- 수정한 파일이 표 관련이면 표 체크를 수행한다.
- 수정한 파일이 이미지/오브젝트 관련이면 이미지와 오브젝트 체크를 수행한다.
- 수정한 파일이 page settings 관련이면 페이지 설정 체크를 수행한다.
- 수정한 파일이 data tag 관련이면 데이터 태그 체크를 수행한다.

릴리즈 전 또는 중간 이상 위험 변경 후 전체 체크:

- 아래 전체 체크리스트를 수행한다.
- smoke 실행이 가능하면 `npm run smoke:ui`와 `npm run smoke:browser`를 함께 실행한다.
- smoke가 불가능하면 불가능한 이유와 수동 대체 확인 결과를 기록한다.

#### 전체 체크리스트: 진입과 저장

- 학교 선택 후 양식 목록 진입
- 기존 양식 편집 진입
- 변경 없이 목록으로 돌아가기
- 텍스트 수정 후 저장
- 저장 후 새로고침
- 저장 후 다시 편집 진입

#### 전체 체크리스트: 문서 편집

- 일반 텍스트 입력
- 한글 IME 입력
- 줄바꿈
- 텍스트 선택 후 굵게/기울임/밑줄
- 글꼴 변경
- 글자 크기 변경
- 줄 간격 변경
- 글자색 변경

#### 전체 체크리스트: 데이터 태그

- 데이터 태그 panel 검색
- 태그 삽입
- 태그 샘플값 표시/숨김
- 빈 값 설정 저장
- 저장 후 미리보기

#### 전체 체크리스트: 표

- 표 삽입
- 행 추가/삭제
- 열 추가/삭제
- 셀 선택
- 테두리 변경
- 셀 배경 변경
- 열 크기 조절
- 행 크기 조절
- 저장 후 복원

#### 전체 체크리스트: 이미지와 오브젝트

- 이미지 삽입
- 이미지 이동
- 이미지 크기 조절
- barcode 삽입
- QR 삽입
- 생성 오브젝트 source 변경
- 오브젝트 정렬
- 오브젝트 삭제
- 저장 후 복원

#### 전체 체크리스트: 수험생 블록

- 수험생 블록 삽입
- 열/행 변경
- 간격 변경
- 정렬 기준 변경
- 빈 블록 표시 변경
- 블록 내부 텍스트 수정
- 블록 내부 표 수정
- focus editor 열기/닫기
- focus editor 수정 내용 반영
- 저장 후 복원
- 미리보기 결과 확인

#### 전체 체크리스트: 페이지 설정

- 용지 크기 변경
- 방향 변경
- 여백 변경
- 페이지 번호 표시 변경
- 인식 마크 설정 변경
- 타 고사실 페이지 설정 변경
- 저장 후 미리보기

## 9. 변경 위험 등급

리팩토링 작업은 위험도에 따라 분류한다.

### 낮음

- 순수 helper 추출
- 이름이 명확하지 않은 local helper rename
- 테스트 추가
- 문서 업데이트
- dead code 제거, 단 확실한 경우만

조건:

- DOM read/write 없음
- `window`, `document`, `HTMLElement`, `getBoundingClientRect`, `getComputedStyle` 참조 없음
- public API 변경 없음
- 저장 포맷 변경 없음

### 중간

- DOM 측정 helper 분리
- DOM selector helper 분리
- event binding cleanup helper 분리
- adapter 내부 책임 분리
- toolbar command routing 정리
- runtime 내부 파일 구조 정리

조건:

- 호출 순서가 유지되어야 한다.
- DOM 측정 시점이 유지되어야 한다.
- 수동 체크가 필요하다.

### 높음

- selection 처리 변경
- IME composition 처리 변경
- contenteditable input 처리 변경
- table resize/move 로직 변경
- image/object drag 로직 변경
- save/restore sync 변경
- host/runtime API 변경
- server preview renderer와 관련된 구조 변경

조건:

- 기본적으로 리팩토링 초기 단계에서 하지 않는다.
- 반드시 테스트를 먼저 보강한다.
- 별도 작업으로 분리한다.

## 10. 중단 기준

다음 상황에서는 리팩토링을 멈추고 원인 분석을 먼저 한다.

- `npm test`가 실패한다.
- 저장 후 다시 열었을 때 layout이 달라진다.
- 미리보기/PDF 결과가 기존과 달라진다.
- 한글 입력이 중복되거나 누락된다.
- toolbar 조작 후 selection이 사라진다.
- 표 편집 후 cell 구조가 깨진다.
- 이미지/오브젝트 위치가 저장 전후 달라진다.
- 수험생 블록 내부 편집 내용이 반영되지 않는다.
- 변경 diff가 한 번에 너무 커져 리뷰가 어렵다.
- 원래 목표와 다른 기능 수정이 섞이기 시작한다.

중단 후 원칙:

- 실패한 단계의 변경만 되돌릴 수 있어야 한다.
- 테스트 실패 원인을 해결하기 전 다음 단계로 넘어가지 않는다.
- 버그 수정이 필요하면 리팩토링과 분리된 작업으로 처리한다.

## 11. 커밋과 리뷰 단위

권장 커밋 단위:

- 테스트 보강 1개 커밋
- helper 추출 1개 커밋
- 파일 분리 1개 커밋
- 문서 업데이트 1개 커밋

피해야 할 커밋:

- 테스트, 구조 변경, 동작 변경이 섞인 커밋
- 여러 큰 파일을 동시에 바꾸는 커밋
- 저장 포맷과 UI 변경이 섞인 커밋
- 리팩토링 중 발견한 별도 버그 수정이 섞인 커밋

리뷰 기준:

- 이 변경이 사용자 동작을 바꾸는가?
- 저장 payload가 바뀌는가?
- 호출 순서가 바뀌는가?
- DOM measurement timing이 바뀌는가?
- selection/focus 흐름이 바뀌는가?
- 테스트가 변경된 책임을 보호하는가?
- 실패 시 이 커밋만 되돌릴 수 있는가?

## 12. 파일 이동 규칙

파일을 새로 만들 때는 다음 기준을 따른다.

### host layer

위치:

- `client/features/template-editor/`

넣을 수 있는 것:

- appState adapter
- editor page state 처리
- template save/preview API payload
- host UI renderer
- runtime public API 호출

넣으면 안 되는 것:

- runtime 내부 DOM 세부 규칙
- contenteditable selection 내부 구현
- runtime private helper 직접 import

### runtime layer

위치:

- `client/template-editor-runtime/client/`

넣을 수 있는 것:

- document DOM interaction
- contenteditable selection
- keyboard command
- table editing
- image movement/resizing
- toolbar interaction

넣으면 안 되는 것:

- appState 직접 접근
- host feature module import
- 서버 API 호출

### server rendering layer

위치:

- `server/modules/pdf-templates/`
- `server/modules/pdf-preview/`

넣을 수 있는 것:

- persisted layout normalization
- preview/PDF HTML rendering
- server-side token replacement
- server-side candidate block rendering

넣으면 안 되는 것:

- browser DOM 전용 로직
- client runtime selection 로직

### shared pure helper

공유가 필요한 순수 함수만 별도 위치를 고려한다.

조건:

- DOM을 참조하지 않는다.
- window/document를 참조하지 않는다.
- appState를 참조하지 않는다.
- DB나 API를 참조하지 않는다.
- client와 server 양쪽에서 같은 결과가 필요하다.

추가 규칙:

- 먼저 layer-local helper로 충분한지 검토한다.
- client와 server 양쪽에서 실제로 필요할 때만 `shared/`로 이동한다.
- 현재 프로젝트는 client가 ES Module import를 사용하고 server가 CommonJS require를 사용한다.
- 새 shared helper가 양쪽에서 필요하다면 `shared/app-config.js`처럼 양쪽 로딩 방식을 의식한 형태를 쓰거나, 한쪽 전용 helper로 유지한다.
- shared helper를 만들면 client import와 server require가 모두 깨지지 않는지 테스트한다.
- module format 문제를 해결하기 위해 빌드 도구를 새로 도입하지 않는다.

## 13. 첫 작업 추천안

가장 안전한 첫 작업은 `candidate-block-grid-focus-editor.js`의 순수 레이아웃 계산을 분리하는 것이다.

이유:

- 최근 위험 영역인 수험생 블록과 직접 관련된다.
- 전체 파일이 크다.
- 계산 helper는 DOM mutation보다 비교적 테스트하기 쉽다.
- 기능 변경 없이 파일 책임을 줄일 수 있다.

첫 작업 범위:

- 새 helper 파일 생성
- pixel parsing 함수 이동
- 숫자 clamp helper 이동
- 이미 측정된 canvas rect와 block logical size를 입력으로 받는 panel layout 계산 이동
- 이미 측정된 canvas rect를 입력으로 받는 backdrop layout 계산 이동
- 기존 entry point 유지
- 관련 테스트 추가

첫 작업에서 하지 않을 것:

- `getBoundingClientRect`, `getComputedStyle`, `offsetWidth`, `window.innerWidth`를 직접 읽는 함수 이동
- focus editor markup 변경
- event listener 구조 변경
- 저장 sync 변경
- selection 처리 변경
- IME 처리 변경
- modal close 동작 변경

첫 작업 완료 기준:

- `npm test` 통과
- 수험생 블록 focus editor 수동 체크 통과
- 저장 후 복원 확인
- 미리보기 확인
- DOM 측정 함수의 호출 위치와 호출 순서가 기존과 동일함
- diff가 작고 되돌리기 쉬움

## 14. 두 번째 작업 추천안

두 번째 작업은 `object-size-controls.js`의 숫자/크기 계산 helper 분리다.

첫 작업보다 넓은 기능에 영향을 주므로, 수험생 블록 focus editor 분리 경험과 테스트 보강 후 진행한다.

첫 분리 후보:

- `normalizeObjectSizeInputValue`
- pixel parsing helper
- table segment size normalization
- table collapsed border adjustment 중 DOM을 읽지 않는 순수 계산 부분

주의:

- DOM size를 읽는 함수와 style을 쓰는 함수는 처음에는 그대로 둔다.
- `getComputedStyle`로 border 값을 읽는 함수는 DOM 측정 helper이므로 첫 분리 대상에서 제외한다.
- table 관련 helper는 수험생 블록 내부 표와 일반 표 모두에서 결과가 같은지 확인한다.

## 15. 리팩토링 성공 기준

이번 리팩토링이 성공했다고 판단하려면 다음 상태가 되어야 한다.

- 사용자 기능은 기존과 동일하다.
- 저장된 양식이 기존과 동일하게 다시 열린다.
- preview/PDF 결과가 기존과 동일하다.
- `npm test`가 계속 통과한다.
- 양식 편집기 관련 smoke 또는 수동 체크가 통과한다.
- 큰 파일의 책임이 줄어든다.
- 순수 계산 로직이 테스트 가능한 위치로 이동한다.
- host/runtime/server rendering 경계가 더 명확해진다.
- 향후 양식 편집기 버그 수정 시 건드려야 하는 범위가 줄어든다.

## 16. 리팩토링 실패 신호

다음이 보이면 계획을 재검토한다.

- 파일 수는 늘었지만 책임이 명확해지지 않는다.
- 테스트 없이 추출만 계속한다.
- 리팩토링 도중 새 기능 요구가 섞인다.
- 저장 포맷을 바꾸고 싶어지는 상황이 반복된다.
- 작은 변경이라고 시작했지만 diff가 수천 줄이 된다.
- 수동 검증 없이는 정상 여부를 판단할 수 없다.
- runtime 내부를 host에서 직접 참조하게 된다.
- 같은 로직을 분리했는데 오히려 호출 경로가 더 복잡해진다.

이 경우 더 진행하지 말고, 테스트 보강 또는 범위 축소로 돌아간다.

## 17. 운영 규칙

리팩토링 기간에는 다음 운영 규칙을 따른다.

- 버그 수정과 리팩토링을 같은 작업에 섞지 않는다.
- 기능 추가와 리팩토링을 같은 작업에 섞지 않는다.
- 저장 포맷 변경은 하지 않는다.
- UI 변경은 하지 않는다.
- 테스트 실패 상태로 다음 단계에 가지 않는다.
- smoke 실패가 환경 문제인지 기능 문제인지 구분한다.
- 변경 전후 수동 체크 결과를 간단히 기록한다.
- 위험도가 높은 변경은 더 작은 작업으로 쪼갠다.
- 일반적인 리팩토링 작업은 소스 파일 1~3개와 해당 테스트 파일 범위로 제한한다.
- diff가 커지면 기능 단위가 아니라 추출 단위로 다시 쪼갠다.
- 테스트 파일 증가로 diff가 커지는 것은 허용하되, 동작 코드 diff가 커지면 중단 기준으로 본다.

## 18. 작업 시작 전 체크 카드

각 리팩토링 작업을 시작하기 전에 아래 항목을 먼저 채운다.

작업 목표:

- 이번 작업이 줄이려는 책임 또는 위험을 한 문장으로 적는다.

수정 대상:

- 수정할 파일 목록
- 새로 만들 파일 목록
- 건드리지 않을 파일 목록

위험 등급:

- 낮음, 중간, 높음 중 하나로 분류한다.
- DOM 측정 helper를 이동하면 중간 이상으로 분류한다.
- selection, IME, 저장 sync를 건드리면 높음으로 분류한다.

허용 범위:

- 이동할 함수
- 추가할 테스트
- 유지할 public entry point

금지 범위:

- 저장 포맷 변경
- UI 변경
- runtime API 변경
- DOM 측정 시점 변경
- selection/focus 흐름 변경

검증:

- 실행할 자동 테스트
- 실행할 smoke
- 수행할 수동 체크리스트
- preview/PDF 기준선 비교 필요 여부

되돌리기:

- 실패 시 되돌릴 수 있는 최소 변경 단위
- 별도 버그가 발견되었을 때 리팩토링을 중단할 기준

## 19. 1차 작업 진행 기록

기준일:

- 2026-05-30

상태:

- 1차 리팩토링 단위 완료
- 실패 원인 확인 완료
- 제품 코드의 실제 버그와 smoke 취약점 모두 최소 범위로 보정
- 2차 리팩토링으로 바로 확장하지 않고 체크포인트를 만든 뒤 진행

1차 리팩토링 범위:

- `candidate-block-grid-focus-editor.js`에서 순수 레이아웃 계산을 분리했다.
- 새 파일 `candidate-block-grid-focus-layout.js`를 만들고, DOM을 읽지 않는 계산 helper만 이동했다.
- `getBoundingClientRect`, `getComputedStyle`, focus editor DOM 생성, 이벤트 바인딩, 저장 sync는 이동하지 않았다.
- public entry point와 사용자 동작은 유지했다.
- 순수 helper 테스트를 추가했다.

1차 작업 중 발견한 제품 버그:

- 수험생 블록 grid 선택 직후 requestAnimationFrame refocus가 우측 숫자 입력의 focus를 빼앗는 문제가 있었다.
- 표 셀 내부 이미지, barcode, QR이 `max-height: 100%` 때문에 렌더 높이가 0으로 접히는 문제가 있었다.
- 표 셀 내부 이미지 resize 기준이 absolute positioning 기준과 달라 최소 크기로 과하게 clamp되는 문제가 있었다.
- runtime 툴바 버튼 클릭 중 selection이 surface root로 바뀌면서 표 툴바가 비활성화되는 문제가 있었다.
- host 쪽 기존 표 toolbar 상태 계산이 runtime의 `suppressToolbarSelectionChange`, `activeCellElement`, `tableSelection.anchorCell` 상태를 고려하지 못하는 문제가 있었다.

제품 버그 수정 원칙:

- 리팩토링 범위를 넓히지 않고, 실패를 만드는 경로만 최소 수정했다.
- 저장 포맷은 변경하지 않았다.
- UI 문구와 배치는 변경하지 않았다.
- runtime public API는 변경하지 않았다.
- selection/focus 관련 수정은 단위 테스트를 추가했다.
- 이미지 max-height 수정은 table cell 내부 렌더링 안정화 목적이며 저장 shape를 바꾸지 않는다.

1차 작업 중 발견한 smoke 취약점:

- school modal smoke가 이미 저장된 값과 같은 고정값을 사용해 dirty 상태를 보장하지 못했다.
- 수험생 블록 smoke가 좁은 블록에 긴 샘플 텍스트를 넣어 overflow guard에 걸렸다.
- 일부 toolbar smoke가 실제 브라우저 클릭 경로가 아니라 합성 `.click()`에 의존했다.
- data tag smoke가 현재 sample display mode를 고려하지 않았다.
- table save smoke가 일시적인 toast 표시와 하드코딩된 recognition mark offset에 의존했다.

새 smoke 작성 규칙:

- 사용자 상호작용 검증은 가능한 한 `dispatchBrowserMouseClick` 같은 실제 브라우저 입력 경로를 사용한다.
- 저장 검증은 transient toast보다 저장 payload, DOM 상태, 재렌더링 결과를 우선 확인한다.
- smoke 데이터는 현재 DB 상태와 같아도 dirty 상태가 보장되도록 대체 값을 사용한다.
- 수험생 블록 smoke는 overflow 자체를 검증하는 케이스가 아니라면 블록 크기에 맞는 짧은 샘플 값을 사용한다.
- data tag 검증은 label 표시와 sample 표시 mode를 구분해 현재 설정에 맞는 기대값을 둔다.
- recognition mark 같은 기본값은 정확한 수치 변경을 검증하는 케이스가 아니라면 finite value와 enabled state 중심으로 확인한다.

1차 작업 검증 결과:

```bash
npm run smoke:browser
npm test
npm run smoke:ui
```

결과:

- `npm run smoke:browser` 통과
- `npm test` 통과, 298개 테스트
- `npm run smoke:ui` 통과

1차 작업 후 유지해야 할 안전 규칙:

- selection/focus 흐름은 낮은 위험 리팩토링 대상이 아니다. 관련 변경은 항상 높은 위험으로 분류한다.
- 표 셀 내부 object는 일반 document object와 같은 크기 기준을 쓰지 않을 수 있다.
- table cell 내부 이미지의 `max-height`는 percent 값이 아니라 계산된 pixel 값으로 고정해야 렌더 높이가 안정적이다.
- runtime toolbar pointerdown은 click 전에 editor selection을 보존해야 한다.
- host toolbar 상태 계산은 runtime이 selection을 임시 보존 중인 상태를 무시하면 안 된다.
- smoke 실패가 나오면 리팩토링 확장보다 실패 원인 분류를 먼저 한다.

## 20. 체크포인트 상태

1차 작업 체크포인트는 완료되었다.

체크포인트 커밋:

- `a94a29b refactor: extract candidate block focus layout helpers`
- `a282876 fix: stabilize template editor focus and cell object sizing`
- `fb23e3f test: harden template editor browser smoke flows`
- `54d11d9 docs: record template editor refactor checkpoint`

2차 리팩토링 후보:

- 수험생 블록 편집기의 선택, focus, 입력 상태 안정화

2차 작업 시작 조건:

- 1차 작업 체크포인트가 만들어져 있어야 한다.
- 새 작업의 수정 대상과 금지 범위를 먼저 적어야 한다.
- selection/focus를 건드릴 가능성이 있으면 높은 위험 작업으로 분류해야 한다.
- 작업 시작 전에 관련 단위 테스트 또는 smoke 기준을 먼저 정해야 한다.

2차 작업에서 아직 하지 않을 것:

- focus editor markup 재작성
- modal close 정책 변경
- 저장 payload shape 변경
- runtime API 변경
- host/runtime 경계 변경
- CSS 구조 변경

## 21. 2차 첫 작업 진행 기록

기준일:

- 2026-05-30

상태:

- 2차 첫 작업 완료
- 수험생 블록 선택 후 rAF refocus 판단 규칙을 별도 helper로 분리
- DOM focus 실행 순서와 public entry point는 유지

작업 범위:

- `candidate-block-grid-selection.js` 안에 있던 refocus 판단 규칙을 `candidate-block-grid-selection-focus.js`로 이동했다.
- `selectCandidateBlockGridElement`의 focus 실행, requestAnimationFrame 호출, selection state 관리는 변경하지 않았다.
- 외부 input, textarea, select, button, contenteditable에 focus가 있는 경우 grid refocus가 focus를 빼앗지 않는 규칙을 테스트로 고정했다.
- body/documentElement/null처럼 수동 복구가 필요한 focus 상태에서는 grid refocus를 허용하는 규칙을 테스트로 고정했다.
- grid 자체 또는 grid 내부 요소가 active element인 경우 refocus를 허용하는 기존 동작을 테스트로 고정했다.

금지 범위 준수:

- focus editor markup 변경 없음
- modal close 정책 변경 없음
- 저장 payload shape 변경 없음
- runtime API 변경 없음
- host/runtime 경계 변경 없음
- CSS 변경 없음

검증 결과:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test client/features/template-editor/candidate-block-grid-selection-focus.test.js
npm test
npm run smoke:browser
npm run smoke:ui
```

결과:

- 단일 focus helper 테스트 통과
- `npm test` 통과, 302개 테스트
- `npm run smoke:browser` 통과
- `npm run smoke:ui` 통과

2차 다음 후보:

- 수험생 블록 삭제/키보드 처리의 focus guard를 테스트 가능한 단위로 분리한다.

다음 후보 시작 조건:

- `isCandidateBlockGridKeyboardDeleteTarget`처럼 selection/focus/delete를 동시에 판단하는 함수는 높은 위험으로 본다.
- 삭제 동작 자체를 바꾸지 말고, 먼저 판단 규칙을 테스트로 고정해야 한다.
- 실제 Backspace/Delete 동작은 browser smoke가 통과해야 한다.

## 22. 2차 두 번째 작업 진행 기록

기준일:

- 2026-05-30

상태:

- 2차 두 번째 작업 완료
- 수험생 블록 Backspace/Delete guard 판단을 별도 helper로 분리
- 실제 삭제 실행, 재포커스, 저장 sync, dirty 처리 흐름은 유지

작업 범위:

- `candidate-block-grid-adapter.js` 안에 있던 `isCandidateBlockGridKeyboardDeleteTarget` 판단을 `candidate-block-grid-keyboard-target.js`로 이동했다.
- DOM wrapper는 실제 `event`, `surfaceElement`, `gridElement`, `ownerDocument.activeElement`를 읽고, 조건 평가는 `shouldHandleCandidateBlockGridKeyboardDelete`로 분리했다.
- 외부 편집 컨트롤에 focus가 있을 때 수험생 블록 삭제가 실행되지 않는 규칙을 테스트로 고정했다.
- grid 내부 컨트롤, 문서 surface 내부 컨트롤, disconnected element는 외부 편집 컨트롤로 보지 않는 규칙을 테스트로 고정했다.
- target/active element가 선택 grid, surface, body, documentElement인 경우 기존처럼 삭제 guard가 허용되는 규칙을 테스트로 고정했다.

금지 범위 준수:

- Backspace/Delete 실행 동작 변경 없음
- 수험생 블록 삭제 방식 변경 없음
- focus editor close 정책 변경 없음
- 저장 payload shape 변경 없음
- runtime API 변경 없음
- CSS 변경 없음

검증 결과:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test client/features/template-editor/candidate-block-grid-keyboard-target.test.js
npm test
npm run smoke:browser
npm run smoke:ui
```

결과:

- 단일 keyboard guard 테스트 통과
- `npm test` 통과, 308개 테스트
- `npm run smoke:browser` 통과
- `npm run smoke:ui` 통과

2차 다음 후보:

- 수험생 블록 boundary deletion 판단 중 DOM traversal이 아닌 작은 조건 helper부터 테스트로 고정한다.

다음 후보 시작 조건:

- `shouldPreventCandidateBlockGridNativeDeletion` 자체는 Range, Selection, DOM tree traversal이 얽혀 있어 한 번에 이동하지 않는다.
- 먼저 `isIgnorableCandidateBlockBoundaryNode`, blank host 판단처럼 작은 helper만 분리한다.
- Range 이동, sibling 탐색, native deletion prevent 정책 변경은 별도 고위험 작업으로 둔다.

## 23. 2차 세 번째 작업 진행 기록

기준일:

- 2026-05-30

상태:

- 2차 세 번째 작업 완료
- 수험생 블록 native deletion 방지 로직 안의 작은 boundary 판단 helper만 분리
- Range traversal, sibling 탐색, deletion prevent 정책은 유지

작업 범위:

- `candidate-block-grid-adapter.js` 안에 있던 `isIgnorableCandidateBlockBoundaryNode`와 `isBlankCandidateBlockBoundaryHost`를 `candidate-block-grid-boundary.js`로 이동했다.
- blank text node와 `BR` element를 무시 가능한 boundary node로 보는 기존 규칙을 테스트로 고정했다.
- `<br>`, `<br />`, `&nbsp;`, 공백만 있는 host를 blank boundary host로 보는 기존 규칙을 테스트로 고정했다.
- 실제 `Range`, `Selection`, DOM sibling 탐색 함수는 이동하지 않았다.

금지 범위 준수:

- native deletion prevent 정책 변경 없음
- Range traversal 변경 없음
- candidate block sibling 탐색 변경 없음
- Backspace/Delete 실행 동작 변경 없음
- 저장 payload shape 변경 없음
- CSS 변경 없음

검증 결과:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test client/features/template-editor/candidate-block-grid-boundary.test.js
npm test
npm run smoke:browser
npm run smoke:ui
```

결과:

- 단일 boundary helper 테스트 통과
- `npm test` 통과, 311개 테스트
- `npm run smoke:browser` 통과
- `npm run smoke:ui` 통과

2차 다음 후보:

- `getAdjacentCandidateBlockBoundaryNode`의 방향별 sibling 탐색을 별도 helper로 분리할 수 있는지 검토한다.

다음 후보 시작 조건:

- `getAdjacentCandidateBlockBoundaryNode`는 DOM childNodes 순회가 포함되므로 이번 작업보다 위험도가 높다.
- 먼저 fake node tree로 현재 동작을 테스트할 수 있는지 확인한다.
- `getCandidateBlockGridAdjacentToRange`나 `shouldPreventCandidateBlockGridNativeDeletion` 전체 이동은 아직 하지 않는다.

## 24. 2차 네 번째 작업 진행 기록

기준일:

- 2026-05-30

상태:

- 2차 네 번째 작업 완료
- 수험생 블록 native deletion boundary sibling 탐색 helper 분리
- Range traversal, grid adjacency 판단, deletion prevent 정책은 유지

작업 범위:

- `candidate-block-grid-adapter.js` 안에 있던 `getAdjacentCandidateBlockBoundaryNode`를 `candidate-block-grid-boundary.js`로 이동했다.
- forward 방향에서 blank text node와 `BR`을 건너뛰고 다음 non-ignorable node를 찾는 기존 동작을 테스트로 고정했다.
- backward 방향에서 blank text node와 `BR`을 건너뛰고 이전 non-ignorable node를 찾는 기존 동작을 테스트로 고정했다.
- `direction === "backward"`가 아닌 값은 기존처럼 forward 탐색으로 처리되는 동작을 테스트로 고정했다.
- 범위를 벗어나거나 non-ignorable node가 없으면 `null`을 반환하는 동작을 테스트로 고정했다.

금지 범위 준수:

- `getCandidateBlockGridAdjacentToRange` 이동 없음
- `shouldPreventCandidateBlockGridNativeDeletion` 이동 없음
- Range/Selection 접근 방식 변경 없음
- Backspace/Delete 실행 동작 변경 없음
- 저장 payload shape 변경 없음
- CSS 변경 없음

검증 결과:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test client/features/template-editor/candidate-block-grid-boundary.test.js
npm test
npm run smoke:browser
npm run smoke:ui
```

결과:

- 단일 boundary helper 테스트 통과
- `npm test` 통과, 314개 테스트
- `npm run smoke:browser` 통과
- `npm run smoke:ui` 통과

2차 다음 후보:

- `getCandidateBlockGridFromBoundaryNode`를 별도 helper로 분리할지 검토한다.

다음 후보 시작 조건:

- 이 함수는 nested child traversal과 candidate block grid selector 판별을 함께 다루므로 이번 작업보다 위험도가 높다.
- fake HTMLElement tree로 현재 동작을 먼저 테스트해야 한다.
- `getCandidateBlockGridAdjacentToRange` 전체 이동은 아직 하지 않는다.

## 25. 2차 다섯 번째 작업 진행 기록

기준일:

- 2026-05-30

상태:

- 2차 다섯 번째 작업 완료
- 수험생 블록 boundary node에서 candidate block grid를 찾는 nested traversal helper 분리
- Range traversal, grid adjacency 판단, native deletion prevent 정책은 유지

작업 범위:

- `candidate-block-grid-adapter.js` 안에 있던 `getCandidateBlockGridFromBoundaryNode`를 `candidate-block-grid-boundary.js`로 이동했다.
- 현재 node가 `[data-candidate-block-grid]` 또는 `.examlist-candidate-block-grid`이면 바로 반환하는 기존 동작을 테스트로 고정했다.
- forward 방향에서 첫 non-ignorable child chain을 따라 nested grid를 찾는 기존 동작을 테스트로 고정했다.
- backward 방향에서 마지막 non-ignorable child chain을 따라 nested grid를 찾는 기존 동작을 테스트로 고정했다.
- non-grid leaf node, text node, null 입력에서는 `null`을 반환하는 기존 동작을 테스트로 고정했다.

금지 범위 준수:

- `getCandidateBlockGridAdjacentToRange` 이동 없음
- `shouldPreventCandidateBlockGridNativeDeletion` 이동 없음
- Range/Selection 접근 방식 변경 없음
- Backspace/Delete 실행 동작 변경 없음
- 저장 payload shape 변경 없음
- CSS 변경 없음

검증 결과:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test client/features/template-editor/candidate-block-grid-boundary.test.js
npm test
npm run smoke:browser
npm run smoke:ui
```

결과:

- 단일 boundary helper 테스트 통과
- `npm test` 통과, 318개 테스트
- `npm run smoke:browser` 통과
- `npm run smoke:ui` 통과

2차 다음 후보:

- 여기서 수험생 블록 selection/focus/native deletion helper 분리는 일단 멈춘다.
- 다음 큰 후보로 넘어가기 전에 2차 작업 전체를 리뷰하고, `candidate-block-grid-adapter.js` diff와 책임 감소 효과를 확인한다.

다음 후보 시작 조건:

- `getCandidateBlockGridAdjacentToRange`와 `shouldPreventCandidateBlockGridNativeDeletion`은 Range/Selection과 직접 연결되어 있어 더 높은 위험이다.
- 해당 함수 이동은 지금 바로 진행하지 않는다.
- 다음 작업은 리뷰와 체크포인트 확인 후 결정한다.

## 26. 2차 작업 전체 리뷰 체크포인트

기준일:

- 2026-05-30

검토 범위:

- 기준 커밋: `54d11d9 docs: record template editor refactor checkpoint`
- 현재 커밋: `dd07eea docs: record candidate block grid traversal step`
- 범위: 2차 수험생 블록 리팩토링 5개 코드 단위와 각 문서 기록

검토 결과:

- 즉시 되돌려야 할 문제는 발견하지 않았다.
- `candidate-block-grid-adapter.js`는 2차 작업 범위에서 1개 파일 기준 105줄 삭제, 6줄 추가로 책임이 줄었다.
- 현재 파일 라인 수 기준으로 `candidate-block-grid-adapter.js`는 823줄에서 746줄로 감소했다.
- 새로 분리된 책임은 다음 3개 영역이다.
  - 선택된 수험생 블록 재포커스 판단: `candidate-block-grid-selection-focus.js`
  - 선택된 수험생 블록 키보드 삭제 대상 판단: `candidate-block-grid-keyboard-target.js`
  - 수험생 블록 native deletion boundary 탐색 helper: `candidate-block-grid-boundary.js`
- 각 분리 파일은 대응 테스트 파일을 갖고 있다.
  - `candidate-block-grid-selection-focus.test.js`
  - `candidate-block-grid-keyboard-target.test.js`
  - `candidate-block-grid-boundary.test.js`

안전성 확인:

- 저장 payload shape 변경 없음
- CSS 변경 없음
- 수험생 블록 렌더링 HTML 구조 변경 없음
- `bindCandidateBlockGridControls` 외부 API 변경 없음
- event listener 등록 순서 변경 없음
- `handleSurfaceKeyDown`과 `handleDocumentKeyDown`의 실행 흐름 변경 없음
- `getCandidateBlockGridAdjacentToRange` 이동 없음
- `shouldPreventCandidateBlockGridNativeDeletion` 이동 없음

검증 이력:

- 2차 각 코드 단위마다 해당 helper 단위 테스트를 실행했다.
- 2차 각 코드 단위마다 `npm test`를 실행했다.
- 2차 각 코드 단위마다 `npm run smoke:browser`를 실행했다.
- 2차 각 코드 단위마다 `npm run smoke:ui`를 실행했다.
- 마지막 코드 단위 기준 `npm test`는 318개 테스트 통과 상태였다.

남은 위험 지점:

- `getCandidateBlockGridAdjacentToRange`는 DOM `Range.startContainer`, `Range.startOffset`, text node boundary, parent traversal, surface containment를 동시에 다룬다.
- `shouldPreventCandidateBlockGridNativeDeletion`은 `window.getSelection()`, collapsed range, non-collapsed range, blank boundary host, adjacent grid 판단을 한 함수에서 연결한다.
- `handleSurfaceKeyDown`과 `handleDocumentKeyDown`은 같은 Backspace/Delete 계열 동작을 나눠 처리하므로, 다음 리팩토링에서 순서나 preventDefault 조건이 바뀌면 회귀 위험이 크다.
- 현재 helper 단위 테스트는 fake node 중심이다. Range/Selection 자체를 검증하는 테스트는 아직 충분하지 않다.

판단:

- 2차 리팩토링은 여기까지의 범위에서는 안정적으로 완료된 것으로 본다.
- 다음 작업에서 바로 `getCandidateBlockGridAdjacentToRange`나 `shouldPreventCandidateBlockGridNativeDeletion`을 이동하지 않는다.
- 다음 안전한 단위는 코드 이동이 아니라 native deletion guard의 Range/Selection 동작을 테스트로 먼저 고정하는 것이다.
- 테스트 고정 없이 Range/Selection helper를 이동하면 리팩토링 목적과 반대로 버그 발생 가능성이 커진다.

다음 추천 작업:

- `shouldPreventCandidateBlockGridNativeDeletion` 주변 동작을 테스트 가능하게 만들기 위한 최소 구조를 검토한다.
- 우선 테스트해야 할 케이스는 다음이다.
  - collapsed range가 일반 텍스트 중간에 있을 때 Backspace/Delete를 막지 않는다.
  - collapsed range가 수험생 블록 바로 앞이나 뒤에 있을 때 native deletion을 막는다.
  - 빈 boundary host가 수험생 블록과 인접할 때 native deletion을 막는다.
  - non-collapsed range가 수험생 블록을 포함할 때 native deletion을 막는다.
  - selection이 문서 surface 밖이면 native deletion을 막지 않는다.
- 이 테스트가 먼저 통과한 뒤에만 `getCandidateBlockGridAdjacentToRange` 분리를 다시 검토한다.

## 27. 3차 첫 작업 진행 기록

기준일:

- 2026-05-30

상태:

- 3차 첫 작업 완료
- 수험생 블록 native deletion guard의 Range/Selection 동작을 테스트로 먼저 고정
- `getCandidateBlockGridAdjacentToRange`와 `shouldPreventCandidateBlockGridNativeDeletion` 구현 이동은 아직 하지 않음

작업 범위:

- `candidate-block-grid-native-deletion.test.js`를 추가했다.
- 기존 `shouldPreventCandidateBlockGridNativeDeletion` 함수를 테스트에서 직접 호출할 수 있도록 export했다.
- 함수 본문 로직은 변경하지 않았다.
- fake DOM, fake Range, fake Selection으로 다음 동작을 고정했다.
  - collapsed range가 일반 텍스트 중간에 있을 때 Backspace/Delete를 막지 않는다.
  - collapsed range가 수험생 블록 바로 뒤에 있을 때 Backspace를 막는다.
  - collapsed range가 수험생 블록 바로 앞에 있을 때 Delete를 막는다.
  - 빈 boundary host가 수험생 블록과 인접할 때 Delete를 막는다.
  - non-collapsed range가 수험생 블록을 포함할 때 Backspace를 막는다.
  - selection이 문서 surface 밖이면 Backspace/Delete를 막지 않는다.

금지 범위 준수:

- `getCandidateBlockGridAdjacentToRange` 이동 없음
- `shouldPreventCandidateBlockGridNativeDeletion` 함수 본문 변경 없음
- `handleSurfaceKeyDown` 변경 없음
- `handleDocumentKeyDown` 변경 없음
- Backspace/Delete 실행 순서 변경 없음
- event listener 등록 순서 변경 없음
- 저장 payload shape 변경 없음
- CSS 변경 없음

검증 결과:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test client/features/template-editor/candidate-block-grid-native-deletion.test.js
npm test
npm run smoke:browser
npm run smoke:ui
```

결과:

- 단일 native deletion guard 테스트 통과, 5개 테스트
- `npm test` 통과, 323개 테스트
- `npm run smoke:browser` 통과
- `npm run smoke:ui` 통과

판단:

- 이번 작업은 다음 리팩토링을 위한 안전장치 성격이다.
- 이제 Range/Selection 기반 native deletion guard의 핵심 회귀 케이스가 테스트로 고정되었다.
- 그래도 `getCandidateBlockGridAdjacentToRange`는 parent traversal과 text offset boundary를 직접 다루므로 여전히 고위험 함수다.

다음 후보:

- `getCandidateBlockGridAdjacentToRange`를 바로 이동하기 전에, 테스트가 부족한 예외 케이스가 더 있는지 한 번 더 확인한다.
- 특히 다음 케이스는 이동 전에 추가 검토 대상이다.
  - blank text node와 `BR`을 사이에 둔 Range boundary
  - nested wrapper 안에 있는 수험생 블록 인접 판단
  - `range.intersectsNode`가 예외를 던지는 non-collapsed range
- 추가 테스트가 필요하지 않다고 판단될 때만 `getCandidateBlockGridAdjacentToRange` 분리를 진행한다.

## 28. 3차 두 번째 작업 진행 기록

기준일:

- 2026-05-30

상태:

- 3차 두 번째 작업 완료
- `getCandidateBlockGridAdjacentToRange` 분리 전 예외 케이스를 추가 테스트로 고정
- 구현 이동과 런타임 동작 변경은 하지 않음

작업 범위:

- `candidate-block-grid-native-deletion.test.js`에 native deletion guard 회귀 테스트 3개를 추가했다.
- blank text node와 `BR`이 collapsed range와 수험생 블록 사이에 있을 때 Backspace/Delete를 막는 동작을 고정했다.
- nested wrapper 안에 있는 수험생 블록이 collapsed range와 인접할 때 Backspace/Delete를 막는 동작을 고정했다.
- non-collapsed range에서 `range.intersectsNode`가 예외를 던지면 native deletion을 막지 않는 동작을 고정했다.

금지 범위 준수:

- `getCandidateBlockGridAdjacentToRange` 이동 없음
- `shouldPreventCandidateBlockGridNativeDeletion` 함수 본문 변경 없음
- adapter 이벤트 흐름 변경 없음
- Backspace/Delete preventDefault 조건 변경 없음
- 저장 payload shape 변경 없음
- CSS 변경 없음

검증 결과:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test client/features/template-editor/candidate-block-grid-native-deletion.test.js
npm test
npm run smoke:browser
npm run smoke:ui
```

결과:

- 단일 native deletion guard 테스트 통과, 8개 테스트
- `npm test` 통과, 326개 테스트
- `npm run smoke:browser` 통과
- `npm run smoke:ui` 통과

판단:

- `getCandidateBlockGridAdjacentToRange` 이동 전에 필요한 핵심 Range boundary 회귀 케이스는 현재 충분히 고정되었다.
- 다음 단위에서는 `getCandidateBlockGridAdjacentToRange`만 분리 대상으로 검토할 수 있다.
- 단, `shouldPreventCandidateBlockGridNativeDeletion` 전체 이동은 아직 하지 않는다.

다음 후보:

- `getCandidateBlockGridAdjacentToRange`를 `candidate-block-grid-boundary.js` 또는 별도 Range 전용 helper 파일로 이동할지 결정한다.
- 이동한다면 함수 본문을 그대로 옮기고, import/export만 조정한다.
- 이동 후에는 이번 native deletion guard 테스트와 기존 boundary 테스트를 함께 실행한다.

## 29. 3차 세 번째 작업 진행 기록

기준일:

- 2026-05-30

상태:

- 3차 세 번째 작업 완료
- `getCandidateBlockGridAdjacentToRange`를 adapter에서 boundary helper로 분리
- native deletion guard 전체 이동은 하지 않음

작업 범위:

- `candidate-block-grid-adapter.js` 안에 있던 `getCandidateBlockGridAdjacentToRange`를 `candidate-block-grid-boundary.js`로 이동했다.
- 함수 본문은 기존 로직 그대로 유지했다.
- adapter는 `getCandidateBlockGridAdjacentToRange`를 import해서 기존 `shouldPreventCandidateBlockGridNativeDeletion`에서 그대로 호출한다.
- `shouldPreventCandidateBlockGridNativeDeletion`의 조건 순서와 본문 로직은 변경하지 않았다.

금지 범위 준수:

- `shouldPreventCandidateBlockGridNativeDeletion` 전체 이동 없음
- `getCandidateBlockBoundaryHostElement` 이동 없음
- `getCandidateBlockGridSibling` 이동 없음
- `doesRangeIncludeCandidateBlockGrid` 이동 없음
- `handleSurfaceKeyDown` 변경 없음
- `handleDocumentKeyDown` 변경 없음
- Backspace/Delete preventDefault 조건 변경 없음
- event listener 등록 순서 변경 없음
- 저장 payload shape 변경 없음
- CSS 변경 없음

검증 결과:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test client/features/template-editor/candidate-block-grid-boundary.test.js
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test client/features/template-editor/candidate-block-grid-native-deletion.test.js
npm test
npm run smoke:browser
npm run smoke:ui
```

결과:

- boundary helper 테스트 통과, 10개 테스트
- native deletion guard 테스트 통과, 8개 테스트
- `npm test` 통과, 326개 테스트
- `npm run smoke:browser` 통과
- `npm run smoke:ui` 통과

판단:

- 이번 단위는 함수 이동만 수행했고 런타임 정책은 바꾸지 않았다.
- 이동 전에 추가한 Range/Selection 회귀 테스트가 모두 통과했으므로 현재 분리는 안정적인 범위로 본다.
- 그래도 `shouldPreventCandidateBlockGridNativeDeletion`은 selection, range, blank host, non-collapsed range 판단을 묶고 있어 아직 고위험 함수다.

다음 후보:

- 바로 `shouldPreventCandidateBlockGridNativeDeletion` 전체를 옮기기보다, adapter에 남은 native deletion 관련 함수들의 결합도를 먼저 검토한다.
- 다음 이동 후보를 고른다면 `getCandidateBlockBoundaryHostElement`, `getCandidateBlockGridSibling`, `isBlankBoundaryHostAdjacentToCandidateBlockGrid`, `doesRangeIncludeCandidateBlockGrid` 중 하나만 단위로 선택한다.
- 이 중 `doesRangeIncludeCandidateBlockGrid`는 단독 순수도가 높지만 `getCandidateBlockGridElements(surfaceElement)`에 의존하므로 별도 파일 위치를 신중히 정한다.

## 30. 3차 네 번째 작업 진행 기록

기준일:

- 2026-05-30

상태:

- 3차 네 번째 작업 완료
- `doesRangeIncludeCandidateBlockGrid`를 adapter에서 boundary helper로 분리
- `shouldPreventCandidateBlockGridNativeDeletion` 전체 이동은 아직 하지 않음

작업 범위:

- `candidate-block-grid-adapter.js` 안에 있던 `doesRangeIncludeCandidateBlockGrid`를 `candidate-block-grid-boundary.js`로 이동했다.
- adapter의 `getCandidateBlockGridElements` 직접 import를 제거했다.
- `candidate-block-grid-boundary.js`가 `getCandidateBlockGridElements(surfaceElement)`를 사용해 non-collapsed range의 grid 포함 여부를 판단한다.
- `candidate-block-grid-boundary.test.js`에 direct range helper 테스트를 추가했다.
- non-collapsed range가 grid를 포함하면 `true`를 반환하는 동작을 테스트로 고정했다.
- null range, collapsed range, `range.intersectsNode` 예외에서는 `false`를 반환하는 동작을 테스트로 고정했다.

금지 범위 준수:

- `shouldPreventCandidateBlockGridNativeDeletion` 전체 이동 없음
- `shouldPreventCandidateBlockGridNativeDeletion` 본문 조건 순서 변경 없음
- `getCandidateBlockBoundaryHostElement` 이동 없음
- `getCandidateBlockGridSibling` 이동 없음
- `isBlankBoundaryHostAdjacentToCandidateBlockGrid` 이동 없음
- adapter 이벤트 흐름 변경 없음
- Backspace/Delete preventDefault 조건 변경 없음
- 저장 payload shape 변경 없음
- CSS 변경 없음

검증 결과:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test client/features/template-editor/candidate-block-grid-boundary.test.js
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test client/features/template-editor/candidate-block-grid-native-deletion.test.js
npm test
npm run smoke:browser
npm run smoke:ui
```

결과:

- boundary helper 테스트 통과, 12개 테스트
- native deletion guard 테스트 통과, 8개 테스트
- `npm test` 통과, 328개 테스트
- `npm run smoke:browser` 통과
- `npm run smoke:ui` 통과

판단:

- `doesRangeIncludeCandidateBlockGrid`는 selection을 직접 읽지 않고 range와 surface만 사용하는 helper라 이번 이동은 낮은 위험 범위였다.
- native deletion의 non-collapsed range 판단은 이제 boundary helper 쪽에서 직접 테스트된다.
- adapter에 남은 native deletion 관련 로직은 blank boundary host 인접 판단과 최종 guard orchestration이다.

다음 후보:

- 다음 이동 후보는 `getCandidateBlockBoundaryHostElement`, `getCandidateBlockGridSibling`, `isBlankBoundaryHostAdjacentToCandidateBlockGrid` 묶음이다.
- 이 묶음은 서로 강하게 연결되어 있어 하나씩 나누면 오히려 adapter/boundary 양쪽 호출이 복잡해진다.
- 이동 전에는 blank host 인접 판단 direct 테스트를 먼저 추가하거나, 묶음 전체를 옮긴 뒤 기존 native deletion 테스트로 검증한다.

## 31. 3차 다섯 번째 작업 진행 기록

기준일:

- 2026-05-30

상태:

- 3차 다섯 번째 작업 완료
- blank boundary host 인접 판단 묶음을 adapter에서 boundary helper로 분리
- `shouldPreventCandidateBlockGridNativeDeletion` 최종 orchestration은 아직 이동하지 않음

작업 범위:

- `candidate-block-grid-adapter.js` 안에 있던 `getCandidateBlockBoundaryHostElement`를 `candidate-block-grid-boundary.js`로 이동했다.
- `candidate-block-grid-adapter.js` 안에 있던 `getCandidateBlockGridSibling`을 `candidate-block-grid-boundary.js`로 이동했다.
- `candidate-block-grid-adapter.js` 안에 있던 `isBlankBoundaryHostAdjacentToCandidateBlockGrid`를 `candidate-block-grid-boundary.js`로 이동했다.
- adapter는 `isBlankBoundaryHostAdjacentToCandidateBlockGrid`만 import해서 기존 guard 흐름에서 그대로 호출한다.
- `candidate-block-grid-boundary.test.js`의 fake HTMLElement를 parent/closest/contains를 지원하도록 확장했다.
- blank host가 수험생 블록 앞 또는 뒤에 인접하면 `true`를 반환하는 동작을 테스트로 고정했다.
- nonblank host, grid와 인접하지 않은 blank host, grid 내부 blank host는 `false`를 반환하는 동작을 테스트로 고정했다.

금지 범위 준수:

- `shouldPreventCandidateBlockGridNativeDeletion` 전체 이동 없음
- `shouldPreventCandidateBlockGridNativeDeletion` 본문 조건 순서 변경 없음
- `handleSurfaceKeyDown` 변경 없음
- `handleDocumentKeyDown` 변경 없음
- Backspace/Delete preventDefault 조건 변경 없음
- event listener 등록 순서 변경 없음
- 저장 payload shape 변경 없음
- CSS 변경 없음

검증 결과:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test client/features/template-editor/candidate-block-grid-boundary.test.js
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test client/features/template-editor/candidate-block-grid-native-deletion.test.js
npm test
npm run smoke:browser
npm run smoke:ui
```

결과:

- boundary helper 테스트 통과, 14개 테스트
- native deletion guard 테스트 통과, 8개 테스트
- `npm test` 통과, 330개 테스트
- `npm run smoke:browser` 통과
- `npm run smoke:ui` 통과

판단:

- blank boundary host 인접 판단은 boundary helper로 분리되어 direct 테스트를 갖게 되었다.
- adapter에 남은 native deletion 관련 로직은 `shouldPreventCandidateBlockGridNativeDeletion` 최종 orchestration이 중심이다.
- 최종 guard는 `event.key`, `window.getSelection()`, collapsed/non-collapsed 분기, prevent 대상 판단을 연결하므로 여전히 신중히 다뤄야 한다.

다음 후보:

- 다음 작업은 바로 이동보다 `shouldPreventCandidateBlockGridNativeDeletion` 전체를 boundary helper로 옮겨도 책임 경계가 적절한지 검토한다.
- 이동한다면 함수 본문은 그대로 두고 adapter import/export만 조정한다.
- 이동 후에는 boundary/native deletion 단위 테스트, `npm test`, browser/UI smoke를 모두 다시 실행한다.

## 32. 3차 여섯 번째 작업 진행 기록

기준일:

- 2026-05-30

상태:

- 3차 여섯 번째 작업 완료
- `shouldPreventCandidateBlockGridNativeDeletion` 최종 orchestration을 adapter에서 boundary helper로 분리
- adapter는 기존 테스트/외부 진입점을 유지하기 위해 같은 이름을 re-export

작업 범위:

- `candidate-block-grid-adapter.js` 안에 있던 `shouldPreventCandidateBlockGridNativeDeletion` 함수 본문을 `candidate-block-grid-boundary.js`로 이동했다.
- 함수 본문 로직은 변경하지 않았다.
- adapter는 `shouldPreventCandidateBlockGridNativeDeletion`을 import해서 기존 `handleSurfaceKeyDown` 흐름에서 그대로 호출한다.
- adapter는 `shouldPreventCandidateBlockGridNativeDeletion`을 re-export해서 기존 테스트 진입점을 유지한다.
- adapter의 direct native deletion helper import는 최종 guard import 하나로 줄었다.

금지 범위 준수:

- `shouldPreventCandidateBlockGridNativeDeletion` 본문 조건 순서 변경 없음
- `handleSurfaceKeyDown` 변경 없음
- `handleDocumentKeyDown` 변경 없음
- Backspace/Delete preventDefault 조건 변경 없음
- event listener 등록 순서 변경 없음
- 저장 payload shape 변경 없음
- CSS 변경 없음

검증 결과:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test client/features/template-editor/candidate-block-grid-boundary.test.js
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test client/features/template-editor/candidate-block-grid-native-deletion.test.js
npm test
npm run smoke:browser
npm run smoke:ui
```

결과:

- boundary helper 테스트 통과, 14개 테스트
- native deletion guard 테스트 통과, 8개 테스트
- `npm test` 통과, 330개 테스트
- `npm run smoke:browser` 통과
- `npm run smoke:ui` 통과

판단:

- 수험생 블록 native deletion 판단 로직은 boundary helper 쪽으로 정리되었다.
- adapter에는 event handler 흐름과 실제 삭제/동기화 orchestration이 남아 있다.
- 이 시점에서 수험생 블록 native deletion 리팩토링은 한 번 멈추고 다음 영역을 고르는 것이 안전하다.

다음 후보:

- 다음 작업 전에는 수험생 블록 전체 adapter diff를 리뷰하고, 추가로 옮길 가치가 있는지 판단한다.
- 새 리팩토링 영역을 고른다면 `object-size-controls.js`의 수험생 블록/일반 오브젝트 크기 처리 분리 후보를 검토한다.
- 바로 구현에 들어가기보다 해당 영역의 테스트 상태와 smoke 커버를 먼저 확인한다.

## 33. 3차 완료 후 adapter 리뷰와 다음 영역 선정

기준일:

- 2026-05-30

검토 범위:

- 기준 커밋: `54d11d9 docs: record template editor refactor checkpoint`
- 현재 커밋: `d83d926 docs: record native deletion guard extraction`
- 대상 파일:
  - `client/features/template-editor/candidate-block-grid-adapter.js`
  - 3차에서 분리한 수험생 블록 boundary/keyboard/selection helper와 테스트 파일

검토 결과:

- 수험생 블록 adapter는 기준점 기준 823줄에서 627줄로 감소했다.
- `candidate-block-grid-adapter.js` 단일 파일 diff 기준 257줄 삭제, 5줄 추가다.
- 새로 분리된 판단 로직은 테스트 파일을 갖고 있다.
  - `candidate-block-grid-selection-focus.test.js`
  - `candidate-block-grid-keyboard-target.test.js`
  - `candidate-block-grid-boundary.test.js`
  - `candidate-block-grid-native-deletion.test.js`
- native deletion 판단은 `candidate-block-grid-boundary.js`로 정리되었다.
- adapter에는 여전히 이벤트 바인딩, pointer/key/input handler, 실제 삭제/동기화 orchestration이 남아 있다.

판단:

- 수험생 블록 native deletion 리팩토링은 여기서 멈추는 것이 안전하다.
- 지금 adapter에 남은 코드는 단순 helper라기보다 이벤트 흐름과 상태 동기화에 가까워 추가 이동 위험이 커졌다.
- 다음 작업은 수험생 블록 adapter를 더 쪼개는 것보다, 이미 계획에 있던 `object-size-controls.js` 영역을 검토하는 것이 낫다.

다음 영역 후보:

- `client/features/template-editor/object-size-controls.js`

선정 이유:

- 파일이 809줄로 크다.
- 수험생 블록 grid size, 수험생 블록 modal object size, 일반 객체 size, table/cell size 처리, toolbar input 처리 로직이 한 파일에 섞여 있다.
- 계획서의 두 번째 추천 작업도 object size 계산 helper 분리였다.
- 최근 수험생 블록 안정화 작업과 연결되는 grid/modal size 처리 코드가 포함되어 있다.

위험 지점:

- `applyObjectSizeToSelection`은 일반 객체, table, table cell, 수험생 블록 modal object, modal table, 수험생 블록 grid를 한 번에 분기한다.
- `applyCandidateBlockGridObjectSize`는 grid DOM style, table normalization, page config sync, input event dispatch를 함께 수행한다.
- `applyCandidateBlockModalObjectSize`는 modal content bounds, object size, absolute position 보정, modal sync와 연결된다.
- size 변경은 사용자 화면, 저장 config, candidate block modal sync에 직접 영향을 준다.

다음 작업 원칙:

- 바로 큰 함수 이동을 하지 않는다.
- 첫 단위는 object size 영역의 테스트 커버를 확인하고, 가장 순수한 계산 helper부터 분리한다.
- 후보는 다음 순서로 검토한다.
  - `normalizeObjectSizeInputValue`
  - `parseObjectSizePixelValue`
  - `parseObjectSizeInlinePixelValue`
  - `getCandidateBlockModalContentSize`
  - `getCandidateBlockGridMinimumSize`
- DOM style 적용, event dispatch, `writeCandidateBlockGridSizeToConfig`, `syncActiveEditor` 호출은 첫 단위에서 이동하지 않는다.

## 34. object size controls 첫 번째 작업 진행 기록

기준일:

- 2026-05-30

상태:

- object size controls 첫 번째 작업 완료
- DOM 부작용이 없는 size value helper를 `object-size-controls.js`에서 분리
- 기존 toolbar input, selection 적용, table/cell/grid/modal size 적용 흐름은 변경하지 않음

작업 범위:

- `client/features/template-editor/object-size-values.js`를 추가했다.
- 기존 `object-size-controls.js`의 다음 private helper를 새 모듈로 이동했다.
  - `normalizeObjectSizeInputValue`
  - `parseObjectSizePixelValue`
  - `parseObjectSizeInlinePixelValue`
- `object-size-controls.js`는 새 helper를 import해서 기존 호출 위치에서 그대로 사용한다.
- `client/features/template-editor/object-size-values.test.js`를 추가해 현재 입력값 처리 규칙을 고정했다.

테스트로 고정한 규칙:

- 빈 값, 공백, 비숫자 입력은 size input 값으로 인정하지 않고 `null`을 반환한다.
- 숫자 입력은 `Math.round(Number(value))` 규칙을 유지한다.
- 최소 크기는 `templateEditorObjectMinimumSize` 아래로 내려가지 않는다.
- 일반 pixel parsing은 기존 `Number.parseFloat` 기반 동작을 유지한다.
- inline pixel parsing은 명시적인 `px` 단위 문자열만 허용한다.

금지 범위 준수:

- toolbar input event 흐름 변경 없음
- `applyObjectSizeToSelection` 변경 없음
- `applyCandidateBlockGridObjectSize` 변경 없음
- `applyCandidateBlockModalObjectSize` 변경 없음
- table/cell/grid/modal style 적용 순서 변경 없음
- `writeCandidateBlockGridSizeToConfig` 호출 변경 없음
- `syncActiveEditor` 호출 변경 없음
- 저장 payload shape 변경 없음
- CSS 변경 없음

검증 결과:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test client/features/template-editor/object-size-values.test.js
npm test
npm run smoke:browser
npm run smoke:ui
```

결과:

- object size value helper 테스트 통과, 5개 테스트
- `npm test` 통과, 335개 테스트
- `npm run smoke:browser` 통과
- `npm run smoke:ui` 통과

판단:

- 이번 작업은 순수 helper 이동만 포함하므로 기능 회귀 위험이 낮다.
- `object-size-controls.js`의 DOM 적용 흐름은 그대로 유지되어 사용자가 보는 동작과 저장 결과가 바뀌지 않는다.
- 다음 단계부터는 DOM 측정 helper가 후보가 되므로, helper 이름이 계산처럼 보여도 `getBoundingClientRect`, `offsetWidth`, `getComputedStyle`, dataset fallback을 읽는 순간 중간 위험 작업으로 다뤄야 한다.

다음 후보:

- `getCandidateBlockModalContentSize`
- `getCandidateBlockGridMinimumSize`
- `getObjectTableRenderedTargetWidth`

다음 작업 조건:

- DOM 측정 helper를 이동하기 전 현재 fallback 우선순위를 테스트로 먼저 고정한다.
- style/class/dataset 쓰기, event dispatch, config sync는 다음 단위에서도 이동하지 않는다.
- 특히 수험생 블록 grid size는 화면 크기와 저장 config가 동시에 연결되므로 direct helper 테스트와 smoke를 모두 통과해야 한다.

## 35. object size controls 두 번째 작업 진행 기록

기준일:

- 2026-05-30

상태:

- object size controls 두 번째 작업 완료
- DOM을 읽지만 쓰지 않는 modal content size 측정 helper를 분리
- 기존 modal object size 적용 흐름은 변경하지 않음

작업 범위:

- `client/features/template-editor/object-size-measurements.js`를 추가했다.
- 기존 `object-size-controls.js`의 `getCandidateBlockModalContentSize`를 새 모듈로 이동했다.
- `object-size-controls.js`는 새 helper를 import해서 기존 `applyCandidateBlockModalObjectSize` 흐름에서 그대로 사용한다.
- `client/features/template-editor/object-size-measurements.test.js`를 추가해 modal content size fallback 우선순위를 고정했다.

테스트로 고정한 규칙:

- HTMLElement가 아니면 `null`을 반환한다.
- logical content dataset 값이 있으면 가장 먼저 사용한다.
- content dataset 값이 `0`이면 기존처럼 logical size dataset으로 fallback한다.
- dataset 값이 없으면 client size를 offset size와 rect보다 먼저 사용한다.
- client size가 없으면 offset size를 rect보다 먼저 사용한다.
- client/offset 값이 없으면 candidate block focus scale을 반영한 rect fallback을 사용한다.
- 모든 값이 비어 있으면 `templateEditorObjectMinimumSize`로 clamp한다.

금지 범위 준수:

- `applyCandidateBlockModalObjectSize` 조건과 style 적용 순서 변경 없음
- absolute position 보정 로직 변경 없음
- inline-block fallback 로직 변경 없음
- modal input event dispatch 변경 없음
- `syncActiveEditor` 호출 변경 없음
- 수험생 블록 grid size 로직 변경 없음
- 저장 payload shape 변경 없음
- CSS 변경 없음

검증 결과:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test client/features/template-editor/object-size-measurements.test.js
npm test
npm run smoke:browser
npm run smoke:ui
```

결과:

- object size measurement helper 테스트 통과, 7개 테스트
- `npm test` 통과, 342개 테스트
- `npm run smoke:browser` 통과
- `npm run smoke:ui` 통과

판단:

- modal content 측정 책임은 `object-size-measurements.js`로 분리되었고, fallback 순서가 direct 테스트로 고정되었다.
- 이번 변경은 DOM 읽기 helper 이동만 포함하며, DOM 쓰기와 저장 동기화는 그대로 남겨 회귀 위험을 낮췄다.
- 다음 후보인 grid 최소 크기 측정은 table normalizer와 CSS row gap을 함께 읽으므로 modal content helper보다 위험도가 높다.

다음 후보:

- `getCandidateBlockGridMinimumSize`
- `getObjectTableRenderedTargetWidth`

다음 작업 조건:

- `getCandidateBlockGridMinimumSize`를 이동하기 전 `getCandidateBlockGridTableMinimumSize` 결과, `candidateBlockRows`, row gap, grid 최소 width/height clamp 순서를 테스트로 고정한다.
- `normalizeCandidateBlockTables`, `writeCandidateBlockGridSizeToConfig`, input event dispatch는 다음 단위에서도 이동하지 않는다.
- grid 최소 크기 helper 이동 후에는 object size measurement 테스트, 전체 테스트, browser/UI smoke를 모두 다시 실행한다.

## 36. object size controls 세 번째 작업 진행 기록

기준일:

- 2026-05-30

상태:

- object size controls 세 번째 작업 완료
- 수험생 블록 grid 최소 크기 측정 helper를 `object-size-measurements.js`로 분리
- grid size 적용, table normalize, config sync, input event dispatch 흐름은 변경하지 않음

작업 범위:

- 기존 `object-size-controls.js`의 `getCandidateBlockGridMinimumSize`를 `object-size-measurements.js`로 이동했다.
- `object-size-controls.js`는 새 helper를 import해서 기존 `applyCandidateBlockGridObjectSize` 흐름에서 그대로 사용한다.
- `object-size-measurements.test.js`에 grid 최소 크기 테스트를 추가했다.
- 테스트 fake DOM은 candidate block table normalizer가 읽는 `querySelectorAll`, row/cell, computed style 경로만 최소 구현했다.

테스트로 고정한 규칙:

- grid table minimum이 없을 때 width는 `candidateBlockGridMinimumWidth` 아래로 내려가지 않는다.
- height는 `candidateBlockRows`, `candidateBlockGridMinimumRowHeight`, row gap을 반영한다.
- `rowGap` 값이 있으면 generic `gap`보다 우선한다.
- candidate block table minimum size가 더 크면 grid 최소 width/height는 table minimum size를 따른다.
- table minimum 계산은 block chrome, cell border/padding/line-height, grid column/row gap을 포함한다.

금지 범위 준수:

- `applyCandidateBlockGridObjectSize` 조건과 분기 변경 없음
- `normalizeCandidateBlockTables` 호출 순서 변경 없음
- grid style width/height/maxWidth/minHeight 적용 순서 변경 없음
- `writeCandidateBlockGridSizeToConfig` 호출 변경 없음
- input event dispatch 변경 없음
- modal object size 로직 변경 없음
- 저장 payload shape 변경 없음
- CSS 변경 없음

검증 결과:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test client/features/template-editor/object-size-measurements.test.js
npm test
npm run smoke:browser
npm run smoke:ui
```

결과:

- object size measurement helper 테스트 통과, 10개 테스트
- `npm test` 통과, 345개 테스트
- `npm run smoke:browser` 통과
- `npm run smoke:ui` 통과

판단:

- 수험생 블록 grid 최소 크기 산정은 measurement helper로 이동했고, grid/table minimum fallback이 테스트로 고정되었다.
- 실제 grid 크기 적용과 저장 동기화는 여전히 `object-size-controls.js`에 남아 있어 변경 범위가 제한적이다.
- 다음 후보부터는 일반 table width 측정과 collapsed border 보정이 엮여 있으므로, table style 적용 함수 이동보다 측정 helper 테스트가 먼저다.

다음 후보:

- `getObjectTableRenderedTargetWidth`
- `getObjectTableCollapsedBorderAdjustment`

다음 작업 조건:

- collapsed border 보정, inline width, rendered rect width, visual scale 계산 순서를 먼저 테스트로 고정한다.
- `applyObjectTableWidth`, colgroup resize, cell width style 적용은 다음 단위에서 이동하지 않는다.
- 일반 table과 수험생 블록 modal table 양쪽에서 사용하는 scale fallback이 바뀌지 않는지 smoke까지 확인한다.

## 37. object size controls 네 번째 작업 진행 기록

기준일:

- 2026-05-30

상태:

- object size controls 네 번째 작업 완료
- table rendered target width 측정 helper를 `object-size-measurements.js`로 분리
- table width 적용, colgroup/cell style 변경, row/column size 적용 흐름은 변경하지 않음

작업 범위:

- 기존 `object-size-controls.js`의 `getObjectTableCollapsedBorderAdjustment`를 `object-size-measurements.js`로 이동했다.
- 기존 `object-size-controls.js`의 `getObjectTableRenderedTargetWidth`를 `object-size-measurements.js`로 이동했다.
- `object-size-controls.js`는 `getObjectTableRenderedTargetWidth`를 import해서 기존 `applyObjectTableWidth` 흐름에서 그대로 사용한다.
- `object-size-measurements.test.js`에 collapsed border와 rendered target width 테스트를 추가했다.

테스트로 고정한 규칙:

- collapsed border가 아닌 table은 border 보정값을 `0`으로 처리한다.
- collapsed table은 table 좌우 border와 outer cell border 중 가장 큰 값을 보정값으로 사용한다.
- target width는 collapsed border 보정값을 올림 처리해서 차감한다.
- inline width보다 scaled rendered rect width가 더 크면 overflow 보정을 차감한다.
- rendered overflow 보정과 collapsed border 보정 중 더 큰 값을 차감한다.
- 보정 후 width는 `templateEditorObjectMinimumSize` 아래로 내려가지 않는다.

금지 범위 준수:

- `applyObjectTableWidth` 조건과 분기 변경 없음
- `ensureTemplateEditorTableColGroup` 호출 흐름 변경 없음
- colgroup width 적용 순서 변경 없음
- cell width style 적용 순서 변경 없음
- table height/row height 로직 변경 없음
- 수험생 블록 grid/modal size 로직 변경 없음
- 저장 payload shape 변경 없음
- CSS 변경 없음

검증 결과:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test client/features/template-editor/object-size-measurements.test.js
npm test
npm run smoke:browser
npm run smoke:ui
```

결과:

- object size measurement helper 테스트 통과, 15개 테스트
- `npm test` 통과, 350개 테스트
- `npm run smoke:browser` 통과
- `npm run smoke:ui` 통과

판단:

- table width 측정과 collapsed border 보정은 measurement helper로 분리되었고, direct 테스트를 갖게 되었다.
- 실제 table width 적용과 DOM style 변경은 여전히 `object-size-controls.js`에 남아 있어 변경 범위가 제한적이다.
- 다음 후보는 `normalizeObjectTableSegmentSizes`처럼 DOM을 읽지 않는 size 분배 helper가 안전하다.

다음 후보:

- `normalizeObjectTableSegmentSizes`
- `getObjectTableColumnWidths`
- `getObjectTableRowHeights`

다음 작업 조건:

- 먼저 `normalizeObjectTableSegmentSizes`가 순수 helper인지 확인하고, even distribution, proportional distribution, overflow/deficit 보정 규칙을 테스트로 고정한다.
- `getObjectTableColumnWidths`와 `getObjectTableRowHeights`는 DOM 측정 helper이므로 순수 helper와 같은 단위로 이동하지 않는다.
- `applyObjectTableWidth`, `applyObjectTableHeight`, table style 적용은 다음 단위에서도 이동하지 않는다.

## 38. object size controls 다섯 번째 작업 진행 기록

기준일:

- 2026-05-30

상태:

- object size controls 다섯 번째 작업 완료
- DOM을 읽지 않는 table segment size 분배 helper를 분리
- table width/height 적용과 DOM 측정 helper 흐름은 변경하지 않음

작업 범위:

- `client/features/template-editor/object-size-table-segments.js`를 추가했다.
- 기존 `object-size-controls.js`의 `normalizeObjectTableSegmentSizes`를 새 모듈로 이동했다.
- `object-size-controls.js`는 새 helper를 import해서 기존 `applyObjectTableWidth`, `applyObjectTableHeight` 흐름에서 그대로 사용한다.
- `client/features/template-editor/object-size-table-segments.test.js`를 추가해 현재 size 분배 규칙을 고정했다.

테스트로 고정한 규칙:

- 빈 source는 빈 배열을 반환한다.
- 거의 균등한 source는 target size를 균등 분배하고 remainder를 앞쪽 segment부터 배정한다.
- target size가 최소 합계보다 작으면 최소 합계로 clamp한다.
- 불균등 source는 minimum 초과분 비율에 따라 target extra size를 분배한다.
- 입력 size, target size, minimum size는 기존처럼 반올림/숫자 변환 규칙을 따른다.
- rounding overflow는 뒤쪽 segment부터 minimum을 지키는 범위에서 줄인다.

금지 범위 준수:

- `applyObjectTableWidth` 조건과 분기 변경 없음
- `applyObjectTableHeight` 조건과 분기 변경 없음
- `getObjectTableColumnWidths` 변경 없음
- `getObjectTableRowHeights` 변경 없음
- colgroup width 적용 순서 변경 없음
- row/cell height 적용 순서 변경 없음
- table style 적용 변경 없음
- 저장 payload shape 변경 없음
- CSS 변경 없음

검증 결과:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test client/features/template-editor/object-size-table-segments.test.js
npm test
npm run smoke:browser
npm run smoke:ui
```

결과:

- object size table segment helper 테스트 통과, 6개 테스트
- `npm test` 통과, 356개 테스트
- `npm run smoke:browser` 통과
- `npm run smoke:ui` 통과

판단:

- table segment 분배 규칙은 순수 helper로 분리되었고, DOM 없이 direct 테스트가 가능해졌다.
- `object-size-controls.js`에는 여전히 table column/row 측정과 실제 style 적용이 남아 있다.
- 다음 후보인 `getObjectTableColumnWidths`, `getObjectTableRowHeights`는 DOM 측정 helper이므로 fallback 순서 테스트가 먼저다.

다음 후보:

- `getObjectTableColumnWidths`
- `getObjectTableRowHeights`

다음 작업 조건:

- column width는 inline style width, table util 측정값, scaled rect fallback, minimum clamp 순서를 테스트로 고정한다.
- row height는 inline style height, scaled rect fallback, minimum clamp 순서를 테스트로 고정한다.
- `applyObjectTableWidth`, `applyObjectTableHeight`, row group height sync, cell style 적용은 다음 단위에서 이동하지 않는다.

## 39. object size controls 여섯 번째 작업 진행 기록

기준일:

- 2026-05-30

상태:

- object size controls 여섯 번째 작업 완료
- table column/row size 측정 helper를 `object-size-measurements.js`로 분리
- table width/height 적용, row group sync, colgroup/cell/row style 변경 흐름은 변경하지 않음

작업 범위:

- 기존 `object-size-controls.js`의 `getObjectTableColumnWidths`를 `object-size-measurements.js`로 이동했다.
- 기존 `object-size-controls.js`의 `getObjectTableRowHeights`를 `object-size-measurements.js`로 이동했다.
- `object-size-controls.js`는 새 helper를 import해서 기존 `applyObjectTableWidth`, `applyObjectTableHeight` 흐름에서 그대로 사용한다.
- `object-size-measurements.test.js`에 column/row 측정 fallback 테스트를 추가했다.

테스트로 고정한 규칙:

- column width는 inline style width를 우선한다.
- column width는 object minimum size 아래로 내려가지 않는다.
- inline style width가 없으면 table utils 측정값을 scaled rect fallback보다 먼저 사용한다.
- table utils 측정값이 없으면 candidate block visual scale을 반영한 rect width를 사용한다.
- row height는 inline style height를 우선한다.
- row height는 object minimum size 아래로 내려가지 않는다.
- inline style height가 없으면 candidate block visual scale을 반영한 rect height를 사용한다.

금지 범위 준수:

- `applyObjectTableWidth` 조건과 분기 변경 없음
- `applyObjectTableHeight` 조건과 분기 변경 없음
- `ensureTemplateEditorTableColGroup` 호출 흐름 변경 없음
- colgroup width 적용 순서 변경 없음
- cell width style 적용 순서 변경 없음
- row/cell height style 적용 순서 변경 없음
- row group height sync 변경 없음
- 수험생 블록 grid/modal size 로직 변경 없음
- 저장 payload shape 변경 없음
- CSS 변경 없음

검증 결과:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test client/features/template-editor/object-size-measurements.test.js
npm test
npm run smoke:browser
npm run smoke:ui
```

결과:

- object size measurement helper 테스트 통과, 19개 테스트
- `npm test` 통과, 360개 테스트
- `npm run smoke:browser` 통과
- `npm run smoke:ui` 통과

판단:

- table 측정 helper는 measurement module로 정리되었고, fallback 우선순위가 direct 테스트로 고정되었다.
- `object-size-controls.js`에는 이제 toolbar binding, selection 분기, 실제 style 적용, sync orchestration이 중심으로 남아 있다.
- 다음 작업은 바로 적용 함수를 옮기기보다 누적 diff와 파일 책임을 리뷰해 추가 이동 가치가 있는지 판단하는 것이 안전하다.

다음 후보:

- `object-size-controls.js` 누적 리뷰
- `applyObjectTableWidth`, `applyObjectTableHeight` 이동 여부 판단
- `applyCandidateBlockGridObjectSize`, `applyCandidateBlockModalObjectSize` 이동 여부 판단

다음 작업 조건:

- 실제 DOM style 적용 함수는 helper 이동보다 위험도가 높으므로, 바로 이동하지 않는다.
- 누적 리뷰에서 adapter처럼 충분히 책임이 줄었는지 먼저 확인한다.
- 추가 이동을 한다면 적용 함수별 direct 테스트 또는 smoke 시나리오를 먼저 명시한다.

## 40. object size controls 누적 리뷰와 중지 판단

기준일:

- 2026-05-30

검토 범위:

- 기준 커밋: `68f85ce docs: select next template editor refactor area`
- 현재 커밋: `4730f85 docs: record object table dimension measurement step`
- 대상 파일:
  - `client/features/template-editor/object-size-controls.js`
  - `client/features/template-editor/object-size-values.js`
  - `client/features/template-editor/object-size-measurements.js`
  - `client/features/template-editor/object-size-table-segments.js`
  - 각 helper 테스트 파일

누적 결과:

- `object-size-controls.js`는 809줄에서 642줄로 줄었다.
- 기준점 대비 `object-size-controls.js` 단일 파일 diff는 14줄 추가, 218줄 삭제다.
- 새로 분리한 helper는 모두 direct 테스트를 갖는다.
  - `object-size-values.test.js`: 5개 테스트
  - `object-size-measurements.test.js`: 19개 테스트
  - `object-size-table-segments.test.js`: 6개 테스트
- object size 영역에 direct 테스트가 총 30개 추가되었다.
- 전체 테스트는 마지막 코드 변경 기준 360개 통과했다.
- `npm run smoke:browser`, `npm run smoke:ui`도 마지막 코드 변경 기준 통과했다.

분리 완료된 책임:

- size input 값 정규화
- px/inline px parsing
- candidate block modal content size 측정
- candidate block grid minimum size 측정
- table collapsed border 보정
- table rendered target width 측정
- table column/row size 측정
- table segment size 분배

현재 `object-size-controls.js`에 남은 책임:

- 선택된 일반 object/table/table cell/candidate block modal/candidate block grid 분류
- table cell object size 적용
- candidate block modal object size 적용
- candidate block grid size 적용
- table width/height style 적용
- row group height sync
- candidate block grid config sync
- modal editor input event dispatch 및 active editor sync
- toolbar input 상태, focus 보존, commit 처리
- selection 변경에 따른 toolbar 표시값 동기화

위험도 판단:

- `applyObjectTableWidth`와 `applyObjectTableHeight`는 colgroup, cell width/height, row group height, table utils 호출을 직접 변경한다.
- `applyCandidateBlockGridObjectSize`는 table normalization, grid style 변경, config write, input event dispatch를 한 함수에서 수행한다.
- `applyCandidateBlockModalObjectSize`는 modal content bounds, object size, absolute position 보정, inline-block fallback을 함께 처리한다.
- `bindObjectSizeControls`는 input commit, focus 복원, requestAnimationFrame sync, read-only 상태, mixed size 표시를 함께 관리한다.
- 위 함수들은 계산 helper보다 실제 사용자 동작과 저장 동기화에 가까워, 지금 바로 이동하면 회귀 위험이 커진다.

중지 판단:

- object size controls의 첫 리팩토링 단위는 여기서 멈추는 것이 안전하다.
- 기존 계획의 원칙대로 순수 helper와 DOM 측정 helper는 분리했고, 남은 코드는 orchestration 및 DOM 변경 중심이다.
- 추가 이동을 강행하기보다 현재 상태에서 충분히 안정화 이득을 얻었다고 판단한다.

다음 작업 조건:

- object size controls를 더 진행하려면 먼저 적용 함수별 direct DOM 테스트 또는 smoke 시나리오를 작성한다.
- 특히 table width/height 적용, candidate block grid size 적용, modal object absolute position 보정은 각각 별도 작업으로 다룬다.
- 테스트 없이 `applyObjectTableWidth`, `applyObjectTableHeight`, `applyCandidateBlockGridObjectSize`, `applyCandidateBlockModalObjectSize`, `bindObjectSizeControls`를 이동하지 않는다.
- 다음 리팩토링 작업은 object size controls 바깥의 다른 고위험 영역을 다시 검토한 뒤 선정한다.

## 41. 결론

양식 편집기 리팩토링은 필요하지만, 대규모 재작성 방식으로 진행하면 위험하다.

안전한 방향은 다음과 같다.

1. 현재 동작을 테스트와 smoke로 먼저 고정한다.
2. 저장 포맷과 사용자 동작은 바꾸지 않는다.
3. 순수 계산 helper부터 아주 작게 분리한다.
4. 수험생 블록, 오브젝트 크기, adapter, host/runtime 중복 순서로 진행한다.
5. 각 단계마다 테스트와 수동 검증을 통과해야 다음 단계로 간다.

이 계획의 핵심은 리팩토링 자체가 아니라, 리팩토링 중에도 양식 편집기를 안정적으로 유지하는 것이다.
