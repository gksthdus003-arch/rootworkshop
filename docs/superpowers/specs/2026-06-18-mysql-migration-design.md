# MySQL 마이그레이션 설계 (localStorage → MySQL)

작성일: 2026-06-18

## 1. 목적 / 배경

현재 workshop-guide 앱은 백엔드가 없는 순수 React SPA로, 모든 데이터를
브라우저 `localStorage`에 저장한다. 스토어(`workshopStore.tsx`)는 시작 시
localStorage에서 전체 데이터를 **동기 로드**하고, 변경마다 전체 guides 배열을
**통째로 저장**하는 "load-all / save-all" 방식이다.

이를 Docker로 동작 중인 MySQL(`root-ims-mysql`, `mysql:8.0`,
`127.0.0.1:3306`)로 마이그레이션한다. 데이터가 브라우저별로 분리되던 문제를
해결하고 중앙 공유 저장소를 갖는 것이 목표다.

### 결정된 요구사항
- 백엔드: **Node + Express**, 이 repo 안 `server/`에 별도 프로세스로 추가.
- 스키마: **하이브리드** (guide는 JSON 문서 행, 참가자·응답·설정은 정규화/싱글톤).
- 시드: 기존 `src/data/mockData.ts`의 2026 가이드로 초기 적재.
- **모든 데이터 관련 로직(정규화·추론·기본값·검증·시드)은 서버에 둔다.**
  프론트엔드는 데이터 가공을 하지 않는 얇은 fetch 클라이언트가 된다.

## 2. 아키텍처

```
[React SPA :5173]  ──/api──▶  [Express :4000]  ──mysql2/promise──▶  [MySQL workshop @127.0.0.1:3306]
   (vite proxy)                 (repo의 server/)                     (docker: root-ims-mysql)
```

- Vite dev 서버에 `/api` → `http://localhost:4000` 프록시 추가.
- 프로덕션 빌드 시에도 동일 origin 가정(프록시/리버스프록시). 본 작업 범위는 dev 기동까지.

### DB 부트스트랩 (root 계정 사용, 1회)
root(`root`/`root123`)로 다음을 수행하는 멱등 스크립트 `server/scripts/bootstrap.mjs`:
```sql
CREATE DATABASE IF NOT EXISTS workshop
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'workshop'@'%' IDENTIFIED BY 'workshop123';
GRANT ALL PRIVILEGES ON workshop.* TO 'workshop'@'%';
FLUSH PRIVILEGES;
```
이후 앱/서버는 `workshop`/`workshop123` 계정만 사용한다.

## 3. 데이터 위치 재정의

공유 데이터만 DB로 이동하고, 개별 브라우저/세션 상태는 localStorage에 유지한다.

| 데이터 (localStorage 키) | 이동 위치 | 이유 |
|--------|----------|------|
| guides (`guide-overrides-v3`) | **MySQL** | 공유 콘텐츠 |
| participants (`participants`) | **MySQL** | 공유 명부 |
| eventResponses (`event-responses`) | **MySQL** | 공유 응답 |
| eventOverrides (`event-overrides`) | **MySQL** | 공유 |
| adminPassword (`admin-password`) | **MySQL** | 공유 |
| participantProfile (`participant-profile`) | localStorage 유지 | "이 기기의 나" |
| selectedGuideId (`selected-guide-id`) | localStorage 유지 | UI 상태 |
| adminUnlocked (`admin-unlocked`) | localStorage 유지 | 세션 상태 |

> `storage.ts` 하단의 `readFromStorage/writeToStorage/storageKeys`는 클라이언트 전용
> 상태(profile/selectedGuide/adminUnlocked) 용도로만 남긴다. 상단의 레거시
> `storage` 객체(`wg_name`, `survey_*`)는 미사용이며 본 작업에서 건드리지 않는다.

## 4. MySQL 스키마 (하이브리드)

```sql
CREATE TABLE guides (
  id          VARCHAR(128) PRIMARY KEY,
  is_default  TINYINT(1) NOT NULL DEFAULT 0,
  sort_order  INT NOT NULL DEFAULT 0,
  data        JSON NOT NULL,            -- 정규화된 WorkshopGuide 1개 전체
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE participants (
  id          VARCHAR(128) PRIMARY KEY,
  name        VARCHAR(255) NOT NULL UNIQUE,
  created_at  VARCHAR(64) NOT NULL       -- ISO 문자열 (프론트 타입과 일치)
);

CREATE TABLE event_responses (
  id                VARCHAR(128) PRIMARY KEY,
  guide_id          VARCHAR(128) NOT NULL,
  event_id          VARCHAR(128) NOT NULL,
  participant_id    VARCHAR(128) NULL,
  participant_name  VARCHAR(255) NOT NULL,
  assigned_team_id  VARCHAR(128) NULL,
  submitted_at      VARCHAR(64) NOT NULL,
  answers           JSON NOT NULL,
  -- 응답자 식별: participant_id 우선, 없으면 participant_name
  UNIQUE KEY uniq_response (guide_id, event_id, participant_name)
);

CREATE TABLE app_config (
  config_key    VARCHAR(64) PRIMARY KEY,  -- 'admin-password', 'event-overrides'
  config_value  JSON NOT NULL
);
```

- 스키마 생성도 멱등(`CREATE TABLE IF NOT EXISTS`)하게 서버 부팅 시 `ensureSchema()`로 실행.
- `event_responses`의 upsert 의미는 현재 `saveEventResponse`와 동일: 같은
  (guide_id, event_id, 응답자)면 교체. participant_id 우선 식별 로직은 서버에서 처리.

## 5. API 설계 (repository 인터페이스 1:1 미러링)

모든 응답은 **서버에서 정규화된 데이터**. 모든 쓰기는 서버에서 정규화 후 저장.

| 메서드 & 경로 | 대응 repository 함수 | 동작 |
|------|------|------|
| `GET /api/guides` | `listGuides` | 정규화된 WorkshopGuide[] 반환 (없으면 시드 후 반환) |
| `PUT /api/guides` | `saveGuides` | 전체 배열 교체(upsert + 누락분 삭제), isDefault 정리 |
| `GET /api/participants` | `listParticipants` | ParticipantProfile[] |
| `POST /api/participants` | `saveParticipantProfile`(명부 부분) | name 기준 upsert |
| `GET /api/event-responses` | `listEventResponses` | EventSurveyResponse[] |
| `PUT /api/event-responses` | `saveEventResponses` | 전체 교체 |
| `POST /api/event-responses` | `saveEventResponse` | 단건 upsert(응답자 식별 규칙 적용) |
| `GET /api/event-overrides` | `getEventOverrides` | Record<string, EventItem[]> |
| `PUT /api/event-overrides` | `saveEventOverrides` | 교체 |
| `POST /api/admin/verify` | `verifyAdminPassword` | `{ password }` → `{ ok: boolean }` (비번 평문 노출 안 함) |
| `PUT /api/admin/password` | `setAdminPassword` | `{ password }` 저장 |

- 어드민 비번은 내부 워크숍 앱 특성상 평문 저장(현행 유지). 해시는 YAGNI로 범위 외.
  단, **비번을 GET으로 클라이언트에 내려주지 않고** verify는 서버에서만 비교한다
  (현행 대비 약간의 개선).
- 에러는 JSON `{ error: string }` + 적절한 상태코드.

## 6. 서버 구성 (`server/`)

```
server/
  index.mjs               # Express 부트스트랩, ensureSchema + seed, 라우트 등록
  db.mjs                  # mysql2/promise 풀 생성 (env에서 접속정보)
  normalize.mjs           # 프론트에서 이관한 모든 정규화/추론/기본값 로직
  seed.mjs                # mockData → 정규화 → guides 적재 (멱등)
  routes/
    guides.mjs
    participants.mjs
    eventResponses.mjs
    eventOverrides.mjs
    admin.mjs
  scripts/
    bootstrap.mjs         # root로 DB/유저 생성
```

- `normalize.mjs`는 현재 `workshopRepository.ts`의 정규화 로직
  (`normalizeGuide`, `normalizeEvent`, `inferEventType`, `inferSurveyKind`,
  `inferEventKind`, `inferEventPhase`, `normalizePoster`, `normalizeSurvey`,
  `normalizeTeam`, `normalizeLegacyTeams`, `normalizeRecommendation`,
  `normalizeAnnouncement`, `normalizeMapLocation`, `ensureDefault2026Events`,
  `normalizeGuides`)를 그대로 이관한다.
- mockData(`src/data/mockData.ts`)는 서버에서도 import 가능해야 한다. 순수 데이터/
  타입만 의존하므로 `server/`에서 직접 import하거나 `server/seedData.mjs`로 복제.
  (구현 시 import 경로가 깔끔하면 직접 import, 브라우저 의존이 있으면 복제로 결정.)
- 환경변수(`server/.env`, `.gitignore`에 추가):
  `DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=workshop DB_PASSWORD=workshop123 DB_NAME=workshop PORT=4000`

## 7. 프론트엔드 변경

- `src/services/workshopRepository.ts`:
  - 정규화 로직 전부 **제거**(서버로 이관). 파일은 **async fetch 클라이언트**로 재작성.
  - 인터페이스의 각 메서드가 동기 → `Promise` 반환으로 변경.
- `src/store/workshopStore.tsx`:
  - 초기화: 동기 `useState(() => repo.list())` → `useState(빈/로딩)` + `useEffect`에서
    `GET`들을 await 하여 채움. 로딩 동안 **로딩 화면** 표시.
  - mutation: 현행 "로컬 state 즉시 갱신(낙관적) + persist" 패턴 유지.
    persist 호출만 동기 repo 호출 → async api 호출로 교체(`void api...()`).
  - `verifyAdminPassword`(unlockAdmin)는 결과가 boolean이 필요하므로 async/await로
    전환하고 호출부(`AdminPage`)도 Promise 처리하도록 수정.
  - client 전용 상태(participantProfile/selectedGuideId/adminUnlocked)는
    localStorage 직접 사용 유지.
- `vite.config.ts`: `server.proxy['/api'] = 'http://localhost:4000'` 추가.
- `package.json`: `dev:server`, `bootstrap` 스크립트, `express`/`mysql2`/`cors`/`dotenv`
  의존성 추가. (선택) `concurrently`로 `dev`가 프론트+서버 동시 기동.

### 비동기화 영향 받는 호출부
- `AdminPage.tsx`: `unlockAdmin`(verify), `changeAdminPassword` — Promise 처리.
- 그 외 mutation들은 낙관적 업데이트라 UI는 동기 유지, persist만 비동기(영향 미미).

## 8. 시드 & 데이터 마이그레이션

- 기존 localStorage 데이터는 브라우저별 분산이라 중앙 마이그레이션 대상 없음.
- 서버 부팅 시 `guides`가 비어있으면 `mockData`의 가이드를 정규화하여 1회 적재(멱등).
- `app_config`의 `admin-password`가 없으면 `mockAdminConfig.password`로 초기화.

## 9. 테스트 / 검증

1. `node server/scripts/bootstrap.mjs` → workshop DB/유저 생성 확인.
2. 서버 기동 → `ensureSchema` + seed 로그 확인, `guides` 테이블 행 존재 확인.
3. 스모크 테스트 스크립트(`server/scripts/smoke.mjs` 또는 curl):
   - `GET /api/guides`가 정규화된 2026 가이드 반환.
   - `PUT /api/guides`로 일부 변경 → 재 `GET`에 반영 확인.
   - `POST /api/event-responses` upsert 후 `GET` 확인.
   - `POST /api/admin/verify` 정답/오답 동작 확인.
4. 프론트: `npm run lint`(tsc) 통과. 앱 기동 후 지도/일정/이벤트/추천/어드민 로드 확인.

## 10. 범위 밖 (YAGNI)
- 어드민 비번 해시/세션 토큰 기반 인증.
- 프로덕션 배포/리버스프록시 구성.
- 레거시 `storage` 객체(`wg_name`/`survey_*`) 정리.
- 완전 정규화 스키마(가이드 하위 엔티티 테이블 분해).
