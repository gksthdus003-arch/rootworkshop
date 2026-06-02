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

관리자 mock 비밀번호는 `1234`입니다. 실제 배포 전에는 Firebase Auth 또는 서버 검증으로 대체해야 합니다.
