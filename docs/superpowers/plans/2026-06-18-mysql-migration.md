# MySQL 마이그레이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** localStorage 저장을 Docker MySQL 기반 Express 백엔드로 교체하고, 모든 데이터 로직을 서버로 이관한다.

**Architecture:** 이 repo 안에 `server/`(Express + mysql2, TypeScript, tsx 실행)를 추가한다. 서버가 정규화/시드/검증을 전담하고 정규화된 데이터를 JSON으로 반환한다. 프론트 `workshopRepository.ts`는 데이터 가공 없는 async fetch 클라이언트가 되고, 스토어는 비동기 초기화 + 낙관적 mutation으로 전환한다.

**Tech Stack:** Node 26, Express, mysql2/promise, tsx, dotenv, cors, Vite, React 18, TypeScript.

## Global Constraints

- DB 접속: 앱/서버는 `workshop`/`workshop123` 계정, DB `workshop` (`127.0.0.1:3306`)만 사용. root(`root`/`root123`)는 부트스트랩에서만 사용.
- 정규화/추론/기본값/검증/시드 등 **모든 데이터 로직은 서버에만** 존재한다. 프론트는 가공하지 않는다.
- 공유 데이터(guides, participants, event_responses, event_overrides, admin_password)만 MySQL로. 클라이언트 전용 상태(participantProfile, selectedGuideId, adminUnlocked)는 localStorage 유지.
- 멱등성: 부트스트랩/스키마/시드는 여러 번 실행해도 안전해야 한다.
- 프론트 타입(`src/types/workshop.ts`)이 단일 진실원천. 서버도 이 타입을 import한다.

---

### Task 1: 의존성 + DB 부트스트랩 스크립트

**Files:**
- Modify: `package.json` (deps + scripts)
- Modify: `.gitignore` (server/.env)
- Create: `server/.env`
- Create: `server/scripts/bootstrap.mjs`

**Interfaces:**
- Produces: `workshop` DB + `workshop`/`workshop123` 계정. env 변수 `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME/PORT`.

- [ ] **Step 1:** 의존성 설치
```bash
npm i express mysql2 cors dotenv
npm i -D tsx @types/express @types/cors concurrently
```

- [ ] **Step 2:** `package.json` scripts 추가
```json
"bootstrap": "node server/scripts/bootstrap.mjs",
"dev:server": "tsx watch server/index.ts",
"dev:all": "concurrently -n web,api -c blue,green \"npm:dev\" \"npm:dev:server\""
```

- [ ] **Step 3:** `server/.env` 생성
```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=workshop
DB_PASSWORD=workshop123
DB_NAME=workshop
PORT=4000
```

- [ ] **Step 4:** `.gitignore`에 `server/.env` 추가.

- [ ] **Step 5:** `server/scripts/bootstrap.mjs` — root로 DB/유저 생성 (mysql2 사용, 멱등)
```js
import mysql from "mysql2/promise";
const conn = await mysql.createConnection({
  host: "127.0.0.1", port: 3306, user: "root", password: "root123", multipleStatements: true,
});
await conn.query(`CREATE DATABASE IF NOT EXISTS workshop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
await conn.query(`CREATE USER IF NOT EXISTS 'workshop'@'%' IDENTIFIED BY 'workshop123';`);
await conn.query(`GRANT ALL PRIVILEGES ON workshop.* TO 'workshop'@'%';`);
await conn.query(`FLUSH PRIVILEGES;`);
console.log("bootstrap done");
await conn.end();
```

- [ ] **Step 6:** 실행 검증
```bash
npm run bootstrap
docker exec root-ims-mysql mysql -uworkshop -pworkshop123 -e "SELECT DATABASE() FROM DUAL; SHOW DATABASES LIKE 'workshop';"
```
Expected: workshop DB 보임, workshop 계정 접속 성공.

- [ ] **Step 7:** Commit `chore: add backend deps and DB bootstrap`

---

### Task 2: DB 풀 + 스키마 + Express 스켈레톤

**Files:**
- Create: `server/db.ts`
- Create: `server/schema.ts`
- Create: `server/index.ts`

**Interfaces:**
- Produces: `pool` (mysql2 Pool), `ensureSchema(): Promise<void>`. 서버가 `:4000`에서 기동, `GET /api/health` → `{ ok: true }`.

- [ ] **Step 1:** `server/db.ts`
```ts
import mysql from "mysql2/promise";
import "dotenv/config";
export const pool = mysql.createPool({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, connectionLimit: 10, namedPlaceholders: true,
});
```

- [ ] **Step 2:** `server/schema.ts` — `ensureSchema()`가 spec §4의 4개 테이블을 `CREATE TABLE IF NOT EXISTS`로 생성 (guides, participants, event_responses, app_config). 컬럼은 spec §4와 동일.

- [ ] **Step 3:** `server/index.ts` — express 앱, `cors()`, `express.json({limit:'10mb'})`, `ensureSchema()` await 후 `GET /api/health` 등록, `listen(PORT)`.

- [ ] **Step 4:** 기동 검증
```bash
npm run dev:server &  # 또는 별 터미널
curl -s localhost:4000/api/health
docker exec root-ims-mysql mysql -uworkshop -pworkshop123 workshop -e "SHOW TABLES;"
```
Expected: `{"ok":true}`, 4개 테이블 존재.

- [ ] **Step 5:** Commit `feat(server): db pool, schema, express skeleton`

---

### Task 3: 정규화 모듈 이관 + 시드

**Files:**
- Create: `server/normalize.ts` (← `src/services/workshopRepository.ts`의 정규화 로직 전부 이관)
- Create: `server/seed.ts`
- Modify: `server/index.ts` (부팅 시 seed 호출)

**Interfaces:**
- Consumes: `src/data/mockData.ts`(`mockWorkshopGuides`, `mockAdminConfig`, `getDefaultGuide`), `src/types/workshop.ts`.
- Produces: `normalizeGuides(guides: WorkshopGuide[]): WorkshopGuide[]`, `normalizeEventResponse(r): EventSurveyResponse`, `seedIfEmpty(): Promise<void>`.

- [ ] **Step 1:** `server/normalize.ts` — `workshopRepository.ts` 1~383행의 순수 함수(`createId`, `inferEventType/SurveyKind/EventKind/EventPhase`, `normalizePoster/Survey/Team/LegacyTeams/Event`, `ensureDefault2026Events`, `normalizeRecommendation/Announcement/MapLocation`, `shouldUseDefault2026Schedule`, `normalizeGuide`, `normalizeGuides`)를 그대로 옮긴다. import 경로를 `../src/...`로 조정. `inferMapLocationCategory`는 `../src/lib/mapLocationCategories`에서 import.

- [ ] **Step 2:** `server/seed.ts` — `seedIfEmpty()`: `SELECT COUNT(*) FROM guides`가 0이면 `normalizeGuides(mockWorkshopGuides)`를 guides 테이블에 insert(각 행 id/is_default/sort_order/data). `app_config`의 `admin-password`가 없으면 `mockAdminConfig.password`로 insert.

- [ ] **Step 3:** `server/index.ts`에서 `ensureSchema()` 후 `await seedIfEmpty()` 호출.

- [ ] **Step 4:** 검증
```bash
npm run dev:server
docker exec root-ims-mysql mysql -uworkshop -pworkshop123 workshop -e "SELECT id,is_default FROM guides; SELECT config_key FROM app_config;"
```
Expected: workshop-2026 행 존재, admin-password 키 존재.

- [ ] **Step 5:** Commit `feat(server): port normalization logic and seeding`

---

### Task 4: guides 라우트 (GET/PUT)

**Files:**
- Create: `server/routes/guides.ts`
- Modify: `server/index.ts` (라우트 등록)

**Interfaces:**
- Produces: `GET /api/guides` → `WorkshopGuide[]`(정규화), `PUT /api/guides`(body: `WorkshopGuide[]`) → 정규화 후 전체 교체(upsert + 누락 삭제), `{ guides: WorkshopGuide[] }` 반환.

- [ ] **Step 1:** GET — `SELECT data FROM guides ORDER BY sort_order` → `normalizeGuides(rows.map JSON.parse)` 반환. 비었으면 `seedIfEmpty()` 후 재조회(방어).
- [ ] **Step 2:** PUT — `normalizeGuides(req.body)` → 트랜잭션으로 기존 행 전체 삭제 후 재삽입(sort_order=index, is_default=guide.isDefault). 정규화 결과 반환.
- [ ] **Step 3:** `server/index.ts`에 `app.use("/api/guides", guidesRouter)` 등록.
- [ ] **Step 4:** 검증
```bash
curl -s localhost:4000/api/guides | head -c 200
curl -s -X PUT localhost:4000/api/guides -H 'content-type: application/json' \
  -d "$(curl -s localhost:4000/api/guides)" | head -c 80
```
Expected: 가이드 배열 JSON, PUT 왕복 정상.
- [ ] **Step 5:** Commit `feat(server): guides routes`

---

### Task 5: participants 라우트

**Files:**
- Create: `server/routes/participants.ts`
- Modify: `server/index.ts`

**Interfaces:**
- Produces: `GET /api/participants` → `ParticipantProfile[]`, `POST /api/participants`(body: `ParticipantProfile`) → name 기준 upsert, 갱신된 목록 반환.

- [ ] **Step 1:** GET — `SELECT id,name,created_at FROM participants` 매핑.
- [ ] **Step 2:** POST — id 없으면 생성. `INSERT ... ON DUPLICATE KEY UPDATE`(name UNIQUE) 로 upsert.
- [ ] **Step 3:** 등록 + 검증 curl.
- [ ] **Step 4:** Commit `feat(server): participants routes`

---

### Task 6: event-responses 라우트

**Files:**
- Create: `server/routes/eventResponses.ts`
- Modify: `server/index.ts`

**Interfaces:**
- Produces: `GET /api/event-responses` → `EventSurveyResponse[]`, `PUT /api/event-responses`(전체 교체), `POST /api/event-responses`(단건 upsert; participant_id 우선 식별, 없으면 participant_name).

- [ ] **Step 1:** GET — 행 → `EventSurveyResponse`(answers JSON.parse).
- [ ] **Step 2:** PUT — 트랜잭션으로 전체 삭제 후 재삽입.
- [ ] **Step 3:** POST — 현행 `saveEventResponse` 규칙: 같은 guide_id+event_id이고 (participant_id 있으면 id, 없으면 name) 일치하는 행 삭제 후 insert.
- [ ] **Step 4:** 등록 + 검증 curl(upsert 멱등 확인).
- [ ] **Step 5:** Commit `feat(server): event-responses routes`

---

### Task 7: event-overrides 라우트

**Files:**
- Create: `server/routes/eventOverrides.ts`
- Modify: `server/index.ts`

**Interfaces:**
- Produces: `GET /api/event-overrides` → `Record<string, EventItem[]>` (없으면 `{}`), `PUT /api/event-overrides`(교체) — `app_config` key `event-overrides`에 JSON 저장.

- [ ] **Step 1:** GET — `SELECT config_value FROM app_config WHERE config_key='event-overrides'`, 없으면 `{}`.
- [ ] **Step 2:** PUT — `INSERT ... ON DUPLICATE KEY UPDATE config_value=...`.
- [ ] **Step 3:** 등록 + 검증 curl.
- [ ] **Step 4:** Commit `feat(server): event-overrides routes`

---

### Task 8: admin 라우트

**Files:**
- Create: `server/routes/admin.ts`
- Modify: `server/index.ts`

**Interfaces:**
- Produces: `POST /api/admin/verify`(body `{password}`) → `{ ok: boolean }`(서버에서만 비교), `PUT /api/admin/password`(body `{password}`) → `{ ok: true }`.

- [ ] **Step 1:** verify — `app_config['admin-password']` 읽어 `{ ok: stored === password }`. 없으면 `mockAdminConfig.password`와 비교.
- [ ] **Step 2:** PUT password — upsert.
- [ ] **Step 3:** 등록 + 검증 curl(정답/오답).
- [ ] **Step 4:** Commit `feat(server): admin routes`

---

### Task 9: 프론트 repository → async fetch 클라이언트

**Files:**
- Rewrite: `src/services/workshopRepository.ts`
- Modify: `src/lib/storage.ts` (client-only 키만 유지 — 변경 없음, 확인만)

**Interfaces:**
- Produces: `workshopApi` 객체. 비동기 메서드:
  `listGuides(): Promise<WorkshopGuide[]>`, `saveGuides(g): Promise<WorkshopGuide[]>`,
  `listParticipants(): Promise<ParticipantProfile[]>`, `saveParticipantProfile(p): Promise<ParticipantProfile[]>`,
  `listEventResponses(): Promise<EventSurveyResponse[]>`, `saveEventResponses(r): Promise<void>`, `saveEventResponse(r): Promise<void>`,
  `getEventOverrides(): Promise<Record<string,EventItem[]>>`, `saveEventOverrides(o): Promise<void>`,
  `verifyAdminPassword(pw): Promise<boolean>`, `setAdminPassword(pw): Promise<void>`.
- 클라이언트 전용(localStorage 유지, 별도 헬퍼): `getParticipantProfile/saveParticipantProfileLocal`, `getSelectedGuideId/saveSelectedGuideId`, `isAdminUnlocked/setAdminUnlocked`.

- [ ] **Step 1:** 정규화 로직/타입 가공 전부 제거. `fetch`로 `/api/*` 호출하는 얇은 함수들 작성. 공통 `request<T>(path, init)` 헬퍼(에러 시 throw).
- [ ] **Step 2:** client-only 상태는 `readFromStorage/writeToStorage`로 localStorage 직접 사용하는 별도 헬퍼로 분리.
- [ ] **Step 3:** `npm run lint` 통과 확인(스토어 수정 전이라 타입 에러는 Task 10에서 정리; 이 파일 자체는 컴파일되도록).
- [ ] **Step 4:** Commit `refactor(web): repository becomes async API client`

---

### Task 10: 스토어 비동기 초기화 + 낙관적 persist

**Files:**
- Modify: `src/store/workshopStore.tsx`
- Modify: `src/App.tsx` 또는 Provider 내부 (로딩 화면)

**Interfaces:**
- Consumes: Task 9의 `workshopApi` + client-only 헬퍼.
- Produces: 동일한 `WorkshopStoreValue` 컨텍스트. `unlockAdmin`/`changeAdminPassword`는 `Promise` 반환으로 시그니처 변경.

- [ ] **Step 1:** 초기 state를 빈 값/로딩으로. `useEffect`에서 `Promise.all([listGuides, listParticipants, listEventResponses])`로 채우고 `isLoaded` 플래그 set.
- [ ] **Step 2:** `selectedGuideId/participantProfile/isAdminUnlocked`는 client-only 헬퍼로 초기화(동기 가능).
- [ ] **Step 3:** 모든 mutation: 로컬 state 즉시 갱신(현행 유지) + persist를 `void workshopApi.save...()`로 교체.
- [ ] **Step 4:** `saveParticipantName`: 로컬 profile은 localStorage, 명부는 `saveParticipantProfile`(서버) 호출 후 결과로 participants set.
- [ ] **Step 5:** `unlockAdmin`을 `async (pw) => { const ok = await api.verifyAdminPassword(pw); if(ok){...} return ok; }`로. `changeAdminPassword`도 async.
- [ ] **Step 6:** Provider가 `isLoaded` false면 로딩 화면 렌더.
- [ ] **Step 7:** `npm run lint`.
- [ ] **Step 8:** Commit `refactor(web): async store init + optimistic persist`

---

### Task 11: AdminPage 비동기 핸들러 + Vite 프록시 + 스크립트 마무리

**Files:**
- Modify: `src/features/admin/AdminPage.tsx` (handleLogin, 비번변경 핸들러 await)
- Modify: `vite.config.ts` (`/api` 프록시)

**Interfaces:**
- Consumes: Task 10의 async `unlockAdmin`/`changeAdminPassword`.

- [ ] **Step 1:** `handleLogin`을 async로, `const isUnlocked = await unlockAdmin(password);`.
- [ ] **Step 2:** 비번변경 핸들러를 async로, `await changeAdminPassword(newPassword);`.
- [ ] **Step 3:** `vite.config.ts`에 `server.proxy = { "/api": "http://localhost:4000" }` 추가.
- [ ] **Step 4:** `npm run lint`.
- [ ] **Step 5:** Commit `refactor(web): async admin handlers + vite api proxy`

---

### Task 12: 스모크 테스트 + 전체 검증

**Files:**
- Create: `server/scripts/smoke.mjs`

- [ ] **Step 1:** `smoke.mjs` — health, GET guides(비어있지 않음), PUT guides 왕복, POST/GET event-responses upsert, admin verify 정답/오답을 fetch로 검증하고 실패 시 비0 종료.
- [ ] **Step 2:** 전체 절차 실행
```bash
npm run bootstrap
npm run dev:server &   # 백그라운드
node server/scripts/smoke.mjs
npm run lint
```
Expected: smoke 전부 PASS, lint 통과.
- [ ] **Step 3:** 프론트+서버 동시 기동(`npm run dev:all`)로 앱 로드(지도/일정/이벤트/추천/어드민) 수동 확인.
- [ ] **Step 4:** Commit `test(server): endpoint smoke test + verification`

---

## Self-Review 결과
- 스펙 커버리지: §2 아키텍처(T1,2,11), §3 데이터위치(T9,10), §4 스키마(T2), §5 API(T4~8), §6 서버구성(T2,3), §7 프론트(T9,10,11), §8 시드(T3), §9 검증(T12) — 전부 태스크 매핑됨.
- Placeholder 없음. 비동기 시그니처(`unlockAdmin`/`changeAdminPassword` → Promise)가 T10 정의와 T11 소비처에서 일치.
- 어드민 비번 평문 저장은 스펙 §10(YAGNI) 명시대로 유지.
