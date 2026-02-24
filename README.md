# TubeSync

실시간으로 유튜브 영상을 함께 보면서 채팅/큐 관리를 할 수 있는 **실시간 워치파티 서비스**입니다.  
클라이언트(React + Vite)와 서버(NestJS + Socket.IO)가 하나의 리포지토리 안에서 같이 동작합니다.

## 전체 구조

- **client**: React 기반 프론트엔드
  - 실시간 플레이어, 채팅, 참가자 목록, 큐 UI
  - Socket.IO 클라이언트로 서버와 통신
- **server**: NestJS 기반 WebSocket 서버
  - 단일 룸의 인메모리 상태 관리
  - 재생 상태/동기화/스킵 투표/큐 로직

### 아키텍처 다이어그램 (이미지 자리)

> 이 리포지토리의 전체 구조를 설명하는 다이어그램을 여기에 넣어주세요.

![TubeSync Architecture]("")

## 실행 방법

프로젝트 루트 기준:

```bash
# 1) 의존성 설치
pnpm install

# 2) 서버 실행 (NestJS)
cd server
pnpm start:dev

# 3) 클라이언트 실행 (React + Vite)
cd ../client
pnpm dev
```

기본적으로 서버는 `http://localhost:3000`, 클라이언트는 `http://localhost:5173` 에서 실행되도록 구성되어 있습니다
(클라이언트의 `client/src/api/socket.ts` 에서 서버 주소를 조정할 수 있습니다).

## 폴더 구조 개요

- `client/`
  - React + TypeScript + Vite 기반 UI
  - `src/features/room`: 룸/재생/채팅 관련 핵심 화면 및 훅
- `server/`
  - NestJS + Socket.IO 기반 WebSocket 서버
  - `src/room`: 룸 상태/로직/게이트웨이/동기화 타이머 등 핵심 도메인 코드

## 주요 기능 요약

- **실시간 동시 시청**
  - 서버 기준 재생 시각을 중심으로 모든 클라이언트의 YouTube 플레이어를 동기화
  - SYNC_TICK 이벤트로 재생 위치 드리프트 보정
- **큐 관리**
  - 유튜브 URL을 붙여 넣으면 서버에서 영상 ID 를 파싱해 큐에 추가
  - 큐가 비면 SYSTEM 메시지로 안내
- **채팅 & 참가자 관리**
  - 룸 입장 시 닉네임 검증 및 중복 방지
  - 채팅은 최근 N개(예: 50개)까지만 유지
- **스킵 투표**
  - 현재 재생 중인 영상에 대해 과반 투표 시 다음 영상으로 자동 넘어감

---

## 세부 문서

- 클라이언트 자세한 구조 및 UI 흐름: [`client/README.md`](client/README.md)
- 서버 도메인/소켓 이벤트/상태 흐름: [`server/README.md`](server/README.md)

위 두 문서를 통해 각 레이어의 상세한 구조와 기능을 확인할 수 있습니다.