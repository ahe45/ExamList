# 양식 편집기 안정화 리팩토링 계획

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

## 20. 다음 체크포인트

다음 작업으로 바로 큰 구조 변경을 시작하지 않는다.

먼저 해야 할 일:

- 현재 1차 작업 변경분을 체크포인트 커밋으로 고정한다.
- 커밋 전 `git status --short`로 포함 파일을 확인한다.
- 커밋 전 마지막으로 통과한 검증 결과를 작업 기록에 남긴다.

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

## 21. 결론

양식 편집기 리팩토링은 필요하지만, 대규모 재작성 방식으로 진행하면 위험하다.

안전한 방향은 다음과 같다.

1. 현재 동작을 테스트와 smoke로 먼저 고정한다.
2. 저장 포맷과 사용자 동작은 바꾸지 않는다.
3. 순수 계산 helper부터 아주 작게 분리한다.
4. 수험생 블록, 오브젝트 크기, adapter, host/runtime 중복 순서로 진행한다.
5. 각 단계마다 테스트와 수동 검증을 통과해야 다음 단계로 간다.

이 계획의 핵심은 리팩토링 자체가 아니라, 리팩토링 중에도 양식 편집기를 안정적으로 유지하는 것이다.
