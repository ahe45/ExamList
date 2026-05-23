# ExamList Windows 11 간편 배포

이 폴더는 Windows 11 PC를 ExamList 서버로 사용할 때 반복 작업을 줄이기 위한 배치 파일 모음입니다.

## 자동화되는 항목

- Node.js LTS 설치 시도
- Docker Desktop 설치 시도
- Docker용 WSL2 Windows 기능 활성화
- 프로젝트 루트의 `.env` 기본 생성
- `EXAMLIST_SESSION_SECRET` 랜덤 생성
- `npm ci` 의존성 설치
- Edge/Chrome PDF 브라우저 탐색 확인
- Docker Redis 컨테이너 시작
- Redis/BullMQ PDF 큐 모드 확인
- DB 스키마 생성 또는 갱신 실행
- 앱 실행

## 직접 준비해야 하는 항목

- MariaDB 또는 MySQL 설치
- DB 이름, DB 사용자, DB 비밀번호 결정
- DB 사용자에게 `examlist` DB 접근 권한 부여
- 최초 로그인 관리자 계정 설정
- 외부 접속이 필요할 경우 Windows 방화벽, 공유기 포트포워딩, 도메인 또는 DDNS 설정

## 가장 쉬운 실행 순서

1. Windows 11 서버 PC에 MariaDB/MySQL을 설치하고 DB 계정 정보를 정합니다.
2. GitHub에서 프로젝트를 받습니다.
3. 프로젝트 루트에서 아래 파일을 관리자 권한으로 실행합니다.

```bat
deploy\windows\install-prerequisites.bat
```

이 파일은 `winget`으로 Node.js LTS와 Docker Desktop 설치를 시도하고, Docker에 필요한 WSL2 관련 Windows 기능을 켭니다. 재부팅이 필요하다고 표시되면 Windows를 재부팅한 뒤 Docker Desktop을 한 번 실행합니다.

4. 프로젝트 루트에서 아래 파일을 실행합니다.

```bat
deploy\windows\setup-windows.bat
```

처음 실행하면 루트에 `.env`가 생성되고, 서버 접속 방식과 DB 연결 정보를 직접 입력받습니다.

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=examlist_app
DB_PASSWORD=직접정한DB비밀번호
DB_NAME=examlist
```

기본값은 HTTP 표준 포트 `80`입니다. 이 경우 `.env`에 `PORT`를 쓰지 않아도 되고, 브라우저에서 `http://localhost` 또는 `http://서버PC_IP`처럼 포트 없이 접속합니다. 다른 포트를 쓰고 싶을 때만 setup 단계에서 custom port를 선택하면 `.env`에 `PORT=3002` 같은 값이 저장됩니다.

이미 IIS, Apache, 다른 웹 서버가 `80` 포트를 사용 중이면 ExamList가 시작되지 않습니다. 그 경우 기존 웹 서버를 중지하거나 setup 단계에서 custom port를 선택합니다.

DB 비밀번호는 화면에 표시되지 않습니다. 기존 `.env`가 이미 있는 경우에도 다시 입력해서 `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`를 갱신할 수 있습니다. 입력을 비워두면 현재 `.env` 값을 유지합니다.

DB 연결 정보 저장 후에는 `.env`를 메모장으로 열어 최초 관리자 계정이나 고급 설정을 수정할 수 있습니다. 안내에 따라 계속 진행하면 아래 작업이 한 번에 진행됩니다.

- `npm ci`
- Docker Redis 컨테이너 시작
- `npm run setup:db`
- ExamList 서버 실행

## 사전 설치 자동화의 한계

`install-prerequisites.bat`는 관리자 권한으로 실행하면 대부분의 Windows 11 PC에서 Node.js와 Docker Desktop을 자동 설치할 수 있습니다. 다만 Docker Desktop은 PC 상태에 따라 아래 작업이 필요할 수 있습니다.

- Windows 재부팅
- Docker Desktop 최초 실행 화면 확인
- Docker Desktop 약관 동의
- BIOS/UEFI 가상화 기능 활성화
- `winget` 또는 Microsoft Store의 App Installer 사용 가능 상태
- 기관 보안 정책에 따른 설치 허용

## 최초 관리자 계정

`EXAMLIST_AUTH_ENABLED=true` 상태에서는 로그인 계정이 필요합니다. 아직 DB 계정 관리 화면에 들어갈 수 없는 최초 1회는 `.env`의 `EXAMLIST_USERS_JSON`에 임시 슈퍼 관리자 계정을 넣는 방식이 가장 간단합니다.

비밀번호의 SHA-256 값을 만들려면 프로젝트 루트에서 아래 명령을 실행합니다.

```bat
node -e "const crypto=require('crypto'); console.log(crypto.createHash('sha256').update(process.argv[1],'utf8').digest('hex'))" "사용할비밀번호"
```

출력된 값을 이용해 `.env`에 아래처럼 설정합니다.

```env
EXAMLIST_USERS_JSON=[{"username":"admin","displayName":"관리자","passwordSha256":"위명령에서출력된값","role":"super_admin"}]
```

이 계정으로 로그인한 뒤 화면의 계정 관리에서 실제 운영 계정을 만들 수 있습니다. 실제 운영 계정을 만든 뒤에는 임시 `EXAMLIST_USERS_JSON` 계정을 제거해도 됩니다.

## 실행 주소

배치 파일 마지막 단계에서 서버 실행을 선택하면 서버 PC에서는 아래 주소로 접속합니다.

```txt
http://localhost
```

같은 내부망의 다른 PC에서는 아래 주소로 접속합니다.

```txt
http://서버PC_IP
```

나중에 서버만 다시 실행해야 할 때는 아래 파일을 사용합니다.

```bat
deploy\windows\start-examlist.bat
```

## PDF 큐 모드

기본 `.env`는 실제 운영에 더 적합한 Redis/BullMQ 큐를 사용합니다.

```env
PDF_QUEUE_DRIVER=bullmq
REDIS_URL=redis://127.0.0.1:6379
```

`setup-windows.bat`는 Redis 포트가 열려 있지 않으면 Docker의 `redis:7-alpine` 컨테이너를 `examlist-redis` 이름으로 시작합니다. Docker Desktop이 설치되어 있지 않거나 실행 중이 아니면 이 단계에서 중단됩니다.

Redis 없이 임시 테스트만 하고 싶을 때는 `.env`에서 `PDF_QUEUE_DRIVER=memory`로 바꿀 수 있습니다. 다만 `NODE_ENV=production`에서는 memory 큐를 사용할 수 없고, 앱 재시작 시 대기 중인 PDF 작업이 사라질 수 있습니다.

## Windows 자동 시작은 별도 선택

서버 PC가 켜질 때 ExamList도 자동으로 실행하려면 NSSM을 사용합니다.

1. NSSM을 다운로드합니다.
2. `nssm.exe`를 `deploy\windows` 폴더에 넣거나 PATH에 등록합니다.
3. 관리자 권한으로 아래 파일을 실행합니다.

```bat
deploy\windows\install-service-nssm.bat
```

서비스 제거가 필요하면 관리자 권한으로 아래 파일을 실행합니다.

```bat
deploy\windows\uninstall-service-nssm.bat
```

서비스 로그는 아래에 생성됩니다.

```txt
logs\examlist.out.log
logs\examlist.err.log
```

## 방화벽 허용

다른 PC에서 접속해야 한다면 Windows 방화벽에서 `80` 포트를 허용해야 합니다. 관리자 권한 터미널에서 실행합니다.

```bat
netsh advfirewall firewall add rule name="ExamList HTTP 80" dir=in action=allow protocol=TCP localport=80
```

setup 단계에서 custom port를 선택했다면 방화벽도 해당 포트로 열어야 합니다.

## 백업

실제 운영 데이터는 DB와 `storage` 폴더에 있습니다. 둘 중 하나만 백업하면 복구가 완전하지 않습니다.

반드시 함께 백업해야 하는 항목:

- MariaDB/MySQL의 `examlist` 데이터베이스
- 프로젝트 루트의 `storage` 폴더

## 업데이트

GitHub 변경사항을 서버에 반영할 때는 아래 순서로 처리합니다.

```bat
git pull
npm ci
npm run setup:db
```

NSSM 서비스로 실행 중이라면 이후 Windows 서비스에서 `ExamList`를 재시작합니다.
