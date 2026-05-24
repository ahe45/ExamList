# ExamList Windows 11 간편 배포

이 폴더는 Windows 11 PC를 ExamList 서버로 사용할 때 필요한 배포 파일만 모아둔 폴더입니다.

## 파일 구성

- 프로젝트 루트의 `start-server.bat`: 서버 구성 여부를 확인하고, 최초 실행이면 Windows setup을 먼저 진행한 뒤 서버를 시작합니다.
- `deploy\setup-windows.bat`: Node.js 사전 설치 확인, `.env` 생성, DB 접속 사용자 정보 입력, 의존성 설치, DB 스키마 준비, 서버 실행을 처리하는 setup 전용 진입점입니다.
- `README.md`: 이 안내 문서입니다.

## 직접 준비해야 하는 항목

- MariaDB 또는 MySQL 설치
- DB 접속 사용자와 비밀번호 결정
- DB 사용자에게 `examlist` DB 접근 권한 부여
- 최초 로그인 후 기본 관리자 비밀번호 변경
- 외부 접속이 필요할 경우 Windows 방화벽, 공유기 포트포워딩, 도메인 또는 DDNS 설정

## 실행 순서

1. Windows 11 서버 PC에 MariaDB/MySQL을 설치하고 DB 접속 계정 정보를 정합니다.
2. GitHub에서 프로젝트를 받습니다.
3. 프로젝트 루트에서 아래 파일을 실행합니다.

```bat
start-server.bat
```

`start-server.bat`는 `.env`, `node_modules`, `node`, `npm`을 확인합니다. 아직 서버가 구성되어 있지 않으면 Windows setup을 먼저 실행하고, 이미 구성되어 있으면 바로 서버를 시작합니다. Node.js가 없으면 setup 단계에서 스스로 관리자 권한으로 다시 실행되어 설치를 시도합니다.

## setup 입력 순서

최초 구성 시 Windows setup은 아래 순서대로 입력받아 루트 `.env`를 자동 생성하거나 갱신합니다.

1. `Q1. 서버 포트번호를 별도로 설정하시겠습니까? (예: Y / 아니오: N)`
2. Q1에서 `Y`를 입력한 경우: `Q1-1. 포트번호를 설정하세요`
3. `Q2. DB USER ID를 설정하세요`
4. `Q3. DB USER PASSWORD를 설정하세요`

`DB_HOST`와 `DB_PORT`는 직접 입력받지 않고 항상 `DB_HOST=127.0.0.1`, `DB_PORT=3306`으로 자동 저장합니다. `DB_NAME`도 직접 입력받지 않고 항상 `examlist`로 자동 저장합니다. `npm run setup:db`는 이 이름의 DB를 생성하거나 스키마를 갱신합니다. 단, 입력한 DB 계정이 DB 생성 권한을 갖고 있지 않다면 MariaDB/MySQL에서 `examlist` DB를 먼저 만들어야 합니다.

입력이 끝나면 Windows setup은 `npm run setup:db`를 자동 실행하고, 완료 후 ExamList 서버를 바로 시작합니다. 이 단계에서는 MariaDB/MySQL 서버가 실행 중이어야 합니다.

setup 실행 로그는 프로젝트 루트의 `log\setup-windows.log`에 저장됩니다. `log` 폴더가 없으면 실행 시 자동으로 생성됩니다.

## 접속 주소

Q1에서 `N`을 선택하면 `.env`에 `PORT`를 저장하지 않고 HTTP 기본 포트인 `80`을 사용합니다.

```txt
http://localhost
http://서버PC_IP
```

Q1에서 `Y`를 선택하고 예를 들어 `3002`를 입력하면 아래처럼 접속합니다.

```txt
http://localhost:3002
http://서버PC_IP:3002
```

이미 IIS, Apache, 다른 웹 서버가 `80` 포트를 사용 중이면 ExamList가 시작되지 않습니다. 그 경우 기존 웹 서버를 중지하거나 custom port를 선택합니다.

## 최초 관리자 계정

초기 DB 스키마 준비 시 계정 테이블이 비어 있으면 아래 슈퍼 관리자 계정이 자동 생성됩니다.

```txt
ID: admin
PW: 1234
```

이 계정으로 로그인한 뒤 화면의 계정 관리에서 운영 계정을 만들고 기본 비밀번호를 변경합니다.

## 방화벽

다른 PC에서 접속해야 한다면 Windows 방화벽에서 사용 포트를 허용해야 합니다. 기본 포트 `80`을 사용할 경우 관리자 권한 터미널에서 실행합니다.

```bat
netsh advfirewall firewall add rule name="ExamList HTTP 80" dir=in action=allow protocol=TCP localport=80
```

custom port를 선택했다면 해당 포트로 열어야 합니다.

## 백업

실제 운영 데이터는 DB와 `storage` 폴더에 있습니다. 둘 중 하나만 백업하면 복구가 완전하지 않습니다.

- MariaDB/MySQL의 `examlist` 데이터베이스
- 프로젝트 루트의 `storage` 폴더

## 업데이트

GitHub 변경사항을 서버에 반영할 때는 아래 순서로 처리합니다.

```bat
git pull
npm ci
npm run setup:db
```
