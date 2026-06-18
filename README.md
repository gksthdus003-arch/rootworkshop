# root_workshop

모바일 우선 React + TypeScript + TailwindCSS + Vite 기반 워크숍 가이드 초기 템플릿입니다.

설치 및 실행

```bash
cd /mnt/c/projects/workshop_guide
npm install
npm run dev
```

기능
- 하단 탭: 지도 / 일정 / 이벤트 / 추천
- 사이드 탭: 회차 리스트 + 관리자 진입(간단 비밀번호)
- 상단 고정 현재 일정 바
- 최초 진입 시 이름 입력 (localStorage)
- mock data 및 localStorage 기반 설문 저장 구조

GitHub에 업로드하기

로컬에서 리포지토리를 초기화하고 커밋한 뒤 원격을 생성하여 푸시하세요. 예:

```bash
git init
git add .
git commit -m "Initial scaffold"
# 원격 생성은 gh CLI 또는 GitHub 웹으로
gh repo create root_workshop --public --source=. --remote=origin --push
```
# 워크숍 가이드

React, TypeScript, TailwindCSS, Vite 기반의 모바일 우선 워크숍 가이드 웹앱입니다.

## 현재 구현 범위

- Vite 프로젝트 기본 구조
- 참가자 이름 입력 및 localStorage 저장 구조
- 워크숍 회차 선택 사이드탭 구조
- 참가자 하단 탭 4종 구조: 지도, 일정, 이벤트, 추천
- 현재/다음 일정 상단 안내 바 구조
- 관리자 비밀번호 진입 화면 구조
- mock data와 추후 Firebase 전환을 고려한 타입/스토어 분리

## 폴더 구조

```txt
src
├─ components
│  ├─ common
│  ├─ layout
│  ├─ onboarding
│  └─ workshop
├─ constants
├─ data
├─ features
│  ├─ admin
│  ├─ events
│  ├─ map
│  ├─ recommendations
│  └─ schedule
├─ hooks
├─ lib
├─ store
└─ types
```

## 실행

```bash
npm install
npm run dev
```

관리자 기본 비밀번호는 `1234`입니다 (DB의 `app_config` 테이블에 저장, 관리자 화면에서 변경 가능).

## 백엔드 (MySQL)

데이터는 더 이상 localStorage가 아닌 MySQL(`workshop` DB)에 저장됩니다. Docker
컨테이너 `root-ims-mysql`의 MySQL을 사용하며, Express API 서버(`server/`)가 모든
데이터 로직(정규화/검증/시드)을 담당합니다.

### 최초 1회: DB/계정 부트스트랩

root 계정으로 `workshop` 데이터베이스와 `workshop`/`workshop123` 전용 계정을 생성합니다.

```bash
npm run bootstrap
```

### 실행

```bash
# 프론트(5173)와 API 서버(4000)를 함께 기동
npm run dev:all

# 또는 개별 기동
npm run dev:server   # Express API on :4000 (스키마 생성 + 최초 시드 자동)
npm run dev          # Vite dev on :5173 (/api → :4000 프록시)
```

서버 접속 정보는 `server/.env`에서 관리합니다(`DB_USER=workshop` 등).

### 배포판 빌드 & 실행 (프로덕션)

프론트를 빌드하고, Express 서버가 빌드 결과(`dist/`)와 `/api`를 **한 포트(기본 9704)**
에서 함께 서빙합니다. Vite/프록시는 런타임에 필요 없습니다.

```bash
npm run start:prod
# 또는
bash scripts/build-and-run.sh

# 포트 변경
APP_PORT=8080 bash scripts/build-and-run.sh
# DB 부트스트랩 건너뛰기
SKIP_BOOTSTRAP=1 bash scripts/build-and-run.sh
```

스크립트는 의존성 설치 → DB 부트스트랩(멱등) → 프론트 빌드 → 프로덕션 서버 실행을
순서대로 수행합니다. 실행 후 `http://localhost:9704` 에서 접속합니다.

### API 스모크 테스트

```bash
npm run dev:server   # 서버 먼저 기동
node server/scripts/smoke.mjs
```

### 데이터 위치

- **MySQL 공유 데이터**: 가이드, 참가자 명부, 이벤트 설문 응답, 이벤트 오버라이드, 관리자 비밀번호
- **브라우저 localStorage(개별 상태)**: 내 이름, 선택한 회차, 관리자 잠금 해제 여부
