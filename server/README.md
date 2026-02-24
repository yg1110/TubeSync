# TubeSync Backend (`server`)

TubeSync의 **NestJS + Socket.IO** 기반 WebSocket 서버입니다.  
단일 룸의 인메모리 상태를 관리하면서, 클라이언트 간 유튜브 재생 상태를 실시간으로 동기화합니다.

## 구조 개요

- `src/main.ts`
  - Nest 애플리케이션 부트스트랩
  - `AppModule` 로부터 서버 시작
- `src/app.module.ts`
  - `RoomModule` 등 도메인 모듈을 묶는 루트 모듈
- `src/room`
  - `room.gateway.ts`
    - `@WebSocketGateway` 로 선언된 Socket.IO 게이트웨이
    - `JOIN`, `CHAT_SEND`, `QUEUE_ADD`, `PLAY_PAUSE_TOGGLE`, `PLAY_SEEK`,
      `VOTE_SKIP`, `VIDEO_ENDED` 등 클라이언트 이벤트 처리
  - `room.logic.service.ts`
    - 닉네임 검증/채팅 검증/큐 추가/재생 제어/스킵 투표 등의 비즈니스 로직
    - 상태 변경은 모두 `RoomStateService` 에 위임
  - `room.state.service.ts`
    - `members`, `chat`, `queue`, `playback`, `skipVote` 를 메모리 상에 보관
    - 재생 위치 계산, 일시정지/재개/시킹, 스킵 투표 집계 등의 순수 상태 조작 로직
  - `sync-ticker.service.ts`
    - 일정 간격으로 `SYNC_TICK` 이벤트를 브로드캐스트
    - 클라이언트가 서버 기준 시각으로 재생 위치 드리프트를 보정할 수 있도록 지원
  - `youtube-parse.util.ts`
    - `watch?v=`, `youtu.be`, `shorts` 등의 URL에서 11자리 유튜브 영상 ID 추출
  - `room.types.ts`
    - 서버에서 사용하는 타입 정의 (멤버/채팅/큐/재생/스킵 투표 등)

### 서버 구성 다이어그램 (이미지 자리)

> Gateway ↔ LogicService ↔ StateService 사이의 흐름과 SYNC_TICK 동작을 설명하는 이미지를 여기에 넣어주세요.

![TubeSync Server Architecture]("")

## 주요 동작 흐름

1. **입장 & 퇴장**
   - 클라이언트가 연결되면 `SERVER_HELLO` 로 소켓 ID 전달
   - `JOIN` 이벤트에서 닉네임 검증 후, 성공 시 `JOIN_ACCEPTED` + 현재 `ROOM_STATE` 전송
   - 소켓이 끊기면 `leave` 처리 후 `MEMBERS_UPDATE` 브로드캐스트
2. **채팅**
   - `CHAT_SEND` → `RoomLogicService.addChat` 으로 검증
   - 유효하면 `ChatMessage` 생성 후 `RoomStateService.pushChat` + `CHAT_BROADCAST`
3. **큐 & 재생**
   - `QUEUE_ADD` → URL 파싱 후 큐에 `enqueue`
   - 재생 중인 영상이 없으면 `startNext('QUEUE_FILLED')` 로 다음 영상 자동 시작
   - 영상 종료/스킵 투표 과반 시에도 `startNext(...)` 로 다음 영상으로 전환
4. **재생 제어 & 동기화**
   - `PLAY_PAUSE_TOGGLE`, `PLAY_SEEK` 이벤트를 통해 재생/일시정지/시킹 처리
   - 각 변경 시 `PLAYBACK_UPDATE` 로 최신 `playback` + `serverNowMs` 브로드캐스트
   - `SyncTickerService` 가 주기적으로 `SYNC_TICK` 을 보내 클라이언트 드리프트 보정 지원
5. **스킵 투표**
   - `VOTE_SKIP` 이벤트마다 현재 재생 영상 기준으로 투표 수를 누적
   - 과반 이상 도달 시 다음 영상으로 이동하고, SYSTEM 메시지로 안내

## 개발/실행

```bash
cd server

# 의존성 설치
pnpm install

# 개발 모드 (watch)
pnpm start:dev

# 일반 실행
pnpm start
```

서버는 기본적으로 `http://localhost:3000` 에서 실행되며, Socket.IO 게이트웨이는 동일 포트에서 동작합니다.

---

## 참고

- 전체 프로젝트 개요 및 클라이언트 구조는 루트 [`README.md`](../README.md) 와 [`client/README.md`](../client/README.md)를 참고하세요.

