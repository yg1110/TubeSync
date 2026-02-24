import { Injectable } from '@nestjs/common';
import { RoomStateService } from './room.state.service';
import {
  JoinRejectedReason,
  SocketId,
  Member,
  QueueAddRejectedReason,
  StartNextReason,
  QueueItem,
} from './room.types';
import { parseYoutubeVideoId } from './youtube-parse.util';

function isValidNickname(raw: string): boolean {
  const nick = (raw ?? '').trim();
  if (nick.length < 2 || nick.length > 12) return false;
  return /^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9 ]+$/.test(nick);
}

/**
 * 룸 비즈니스 로직을 담당하는 서비스.
 * - 닉네임/채팅/큐 추가/재생 제어/스킵 투표 등의 규칙을 캡슐화하고
 * - 실제 상태 변경은 RoomStateService 를 통해서만 수행한다.
 */
@Injectable()
export class RoomLogicService {
  constructor(private readonly state: RoomStateService) {}
  private startNextInProgress = false;

  /**
   * 소켓 ID와 닉네임으로 룸에 입장.
   * - 닉네임 유효성 검사 및 중복 닉네임 방지
   */
  join(
    socketId: SocketId,
    nicknameRaw: string,
  ): { ok: true } | { ok: false; reason: JoinRejectedReason } {
    const nickname = (nicknameRaw ?? '').trim();

    if (!isValidNickname(nickname))
      return { ok: false, reason: 'INVALID_NICKNAME' };
    const dup = this.state.members.some((m) => m.nickname === nickname);
    if (dup) return { ok: false, reason: 'NICKNAME_TAKEN' };

    this.state.members.push({ id: socketId, nickname, joinedAtMs: Date.now() });
    return { ok: true };
  }

  leave(socketId: SocketId) {
    const idx = this.state.members.findIndex((m) => m.id === socketId);
    if (idx >= 0) this.state.members.splice(idx, 1);
  }

  /**
   * 채팅 추가 전 유효성 검사(회원 여부, 길이 제한 등)만 수행.
   * 실제 push 는 RoomGateway 에서 ChatMessage 를 만들어 RoomStateService 에 위임.
   */
  addChat(
    socketId: SocketId,
    textRaw: string,
  ): { ok: true; nickname: string; text: string } | { ok: false } {
    const member = this.state.members.find((m: Member) => m.id === socketId);
    if (!member) return { ok: false };

    const text = (textRaw ?? '').trim();
    if (!text || text.length > 300) return { ok: false };

    return { ok: true, nickname: member.nickname, text };
  }

  /**
   * 유튜브 URL을 파싱해 영상 ID를 얻고, 큐에 추가한다.
   */
  addQueue(
    socketId: SocketId,
    youtubeUrl: string,
  ): { ok: true } | { ok: false; reason: QueueAddRejectedReason } {
    const member = this.state.members.find((m) => m.id === socketId);
    if (!member) return { ok: false, reason: 'INVALID_URL' };

    const videoId = parseYoutubeVideoId(youtubeUrl);
    if (!videoId) return { ok: false, reason: 'INVALID_URL' };

    this.state.enqueue(videoId, member.nickname);
    return { ok: true };
  }

  /**
   * 큐에서 다음 영상을 꺼내 재생을 시작한다.
   * - 큐가 비면 재생 상태를 초기화하고 SYSTEM 메시지 출력
   * - 동시에 여러 번 호출되지 않도록 startNextInProgress 플래그로 보호
   */
  startNext(reason: StartNextReason): { startedVideoId: string | null } {
    if (this.startNextInProgress) return { startedVideoId: null };

    this.startNextInProgress = true;
    try {
      // RoomStateService는 별도 서비스라 eslint가 타입 추론을 완전히 따라가지 못하므로, 여기서는 안전한 래핑 호출임을 명시한다.

      const nextItem: QueueItem | null = this.state.dequeueNextItem();

      if (!nextItem) {
        // 큐가 비면 대기 상태
        this.state.setPlayback(null, null);
        this.state.resetSkipVoteFor(null);
        // SYSTEM 메시지(선택) - 우리는 포함하기로 확정했으니 넣어도 됨
        this.state.pushChat(
          this.state.makeSystemMessage(
            '재생할 영상이 없습니다. 유튜브 링크를 추가해주세요.',
          ),
        );
        return { startedVideoId: null };
      }

      // 새 영상 시작
      this.state.setPlayback(
        nextItem.videoId,
        Date.now(),
        false,
        null,
        nextItem.addedBy,
      );
      this.state.resetSkipVoteFor(nextItem.videoId);

      if (reason === 'VOTE_SKIP') {
        this.state.pushChat(
          this.state.makeSystemMessage(
            '스킵 투표가 과반이 되어 다음 영상으로 넘어갑니다.',
          ),
        );
      } else if (reason === 'VIDEO_ERROR') {
        this.state.pushChat(
          this.state.makeSystemMessage(
            '재생 불가 영상이라 다음 영상으로 넘어갑니다.',
          ),
        );
      }

      return { startedVideoId: nextItem.videoId };
    } finally {
      this.startNextInProgress = false;
    }
  }

  /**
   * 스킵 투표를 등록하고, 임계치(과반)를 넘었는지 여부를 반환.
   */
  voteSkip(socketId: SocketId): { ok: boolean; reached: boolean } {
    const member = this.state.members.find((m) => m.id === socketId);
    if (!member) return { ok: false, reached: false };
    if (!this.state.playback.currentVideoId) {
      return { ok: false, reached: false };
    }

    return this.state.registerSkipVote(socketId);
  }

  /** 일시정지 토글: 재생 중이면 일시정지, 일시정지면 재개 */
  playPauseToggle(socketId: SocketId): boolean {
    const member = this.state.members.find((m) => m.id === socketId);
    if (!member) return false;
    if (!this.state.playback.currentVideoId) return false;

    const now = Date.now();
    if (this.state.playback.isPaused) {
      this.state.resumePlayback(now);
    } else {
      this.state.pausePlayback(now);
    }
    return true;
  }

  /** 특정 초 위치로 이동 */
  seek(socketId: SocketId, positionSec: number): boolean {
    const member = this.state.members.find((m) => m.id === socketId);
    if (!member) return false;
    if (!this.state.playback.currentVideoId) return false;

    this.state.seekPlayback(Date.now(), positionSec);
    return true;
  }
}
