import { Injectable } from '@nestjs/common';
import { RoomStateService } from './room.state.service';
import {
  JoinRejectedReason,
  SocketId,
  Member,
  QueueAddRejectedReason,
  StartNextReason,
} from './room.types';
import { parseYoutubeVideoId } from './youtube-parse.util';

function isValidNickname(raw: string): boolean {
  const nick = (raw ?? '').trim();
  if (nick.length < 2 || nick.length > 12) return false;
  // 한글/영문/숫자/공백만
  return /^[가-힣A-Za-z0-9 ]+$/.test(nick);
}

@Injectable()
export class RoomLogicService {
  constructor(private readonly state: RoomStateService) {}
  private startNextInProgress = false;

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
    this.state.recomputeLeader();
    return { ok: true };
  }

  leave(socketId: SocketId) {
    const idx = this.state.members.findIndex((m) => m.id === socketId);
    if (idx >= 0) this.state.members.splice(idx, 1);
    this.state.recomputeLeader();
  }

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

  startNext(reason: StartNextReason): { startedVideoId: string | null } {
    if (this.startNextInProgress) return { startedVideoId: null };

    this.startNextInProgress = true;
    try {
      const nextVideoId = this.state.dequeueVideoId();

      if (!nextVideoId) {
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
      this.state.setPlayback(nextVideoId, Date.now());
      this.state.resetSkipVoteFor(nextVideoId);

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

      return { startedVideoId: nextVideoId };
    } finally {
      this.startNextInProgress = false;
    }
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
