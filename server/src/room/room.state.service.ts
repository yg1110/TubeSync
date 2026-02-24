import { Injectable } from '@nestjs/common';
import type {
  ChatMessage,
  Member,
  PlaybackState,
  QueueItem,
  RoomStateView,
  SkipVoteView,
  SocketId,
} from './room.types';

@Injectable()
export class RoomStateService {
  leaderId: SocketId | null = null;
  members: Member[] = [];

  chat: ChatMessage[] = [];
  queue: QueueItem[] = [];
  playback: PlaybackState = {
    currentVideoId: null,
    videoStartedAtMs: null,
    isPaused: false,
    pausedAtMs: null,
  };
  skipVote: SkipVoteView | null = null;
  private skipVoters = new Set<SocketId>();

  recomputeLeader() {
    const leader = this.members
      .slice()
      .sort((a, b) => a.joinedAtMs - b.joinedAtMs)[0];
    this.leaderId = leader?.id ?? null;
  }

  toView(): RoomStateView {
    return {
      leaderId: this.leaderId,
      members: this.members,
      chat: this.chat,
      queue: this.queue,
      playback: this.playback,
      skipVote: this.skipVote,
    };
  }

  pushChat(msg: ChatMessage) {
    this.chat.push(msg);
    if (this.chat.length > 50) {
      this.chat.splice(0, this.chat.length - 50);
    }
  }

  makeSystemMessage(text: string): ChatMessage {
    return {
      id: this.genId('msg'),
      nickname: 'SYSTEM',
      text,
      tsMs: Date.now(),
    };
  }

  private genId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  enqueue(videoId: string, addedBy: string): QueueItem {
    const item: QueueItem = {
      id: this.genId('q'),
      videoId,
      addedBy,
      addedAtMs: Date.now(),
    };
    this.queue.push(item);
    return item;
  }

  dequeueVideoId(): string | null {
    const item = this.queue.shift();
    return item?.videoId ?? null;
  }

  setPlayback(
    videoId: string | null,
    startedAtMs: number | null,
    isPaused = false,
    pausedAtMs: number | null = null,
  ) {
    this.playback = {
      currentVideoId: videoId,
      videoStartedAtMs: startedAtMs,
      isPaused,
      pausedAtMs,
    };
  }

  /** 현재 재생 위치(초). 재생 중: (now - videoStartedAtMs)/1000, 일시정지: (pausedAtMs - videoStartedAtMs)/1000 */
  getPlaybackPositionSec(nowMs: number): number | null {
    const { currentVideoId, videoStartedAtMs, isPaused, pausedAtMs } =
      this.playback;
    if (!currentVideoId || videoStartedAtMs == null) return null;
    if (isPaused && pausedAtMs != null) {
      return Math.max(0, (pausedAtMs - videoStartedAtMs) / 1000);
    }
    return Math.max(0, (nowMs - videoStartedAtMs) / 1000);
  }

  /** 일시정지: 현재 위치를 고정 */
  pausePlayback(nowMs: number) {
    if (!this.playback.currentVideoId || this.playback.videoStartedAtMs == null)
      return;
    const positionSec = (nowMs - this.playback.videoStartedAtMs) / 1000;
    this.playback.isPaused = true;
    this.playback.pausedAtMs = nowMs;
  }

  /** 재생 재개: 고정된 위치에서 videoStartedAtMs 재계산 */
  resumePlayback(nowMs: number) {
    if (!this.playback.currentVideoId || !this.playback.isPaused) return;
    const pos =
      this.playback.pausedAtMs != null && this.playback.videoStartedAtMs != null
        ? (this.playback.pausedAtMs - this.playback.videoStartedAtMs) / 1000
        : 0;
    this.playback.videoStartedAtMs = nowMs - pos * 1000;
    this.playback.isPaused = false;
    this.playback.pausedAtMs = null;
  }

  /** 특정 초 위치로 이동. 일시정지 상태면 그 위치에서 일시정지 유지 */
  seekPlayback(nowMs: number, positionSec: number) {
    if (!this.playback.currentVideoId) return;
    const sec = Math.max(0, positionSec);
    this.playback.videoStartedAtMs = nowMs - sec * 1000;
    if (this.playback.isPaused) {
      this.playback.pausedAtMs = nowMs;
    }
  }

  /**
   * 다음 단계(투표)에서 채울 placeholder.
   * 지금은 skipVote를 null로 두거나, 새 영상 시작 시 null로 리셋.
   */
  resetSkipVoteFor(videoId: string | null) {
    this.skipVote = null;
    this.skipVoters.clear();
  }

  registerSkipVote(
    socketId: SocketId,
  ): { ok: boolean; reached: boolean } {
    if (!this.playback.currentVideoId) {
      return { ok: false, reached: false };
    }

    const member = this.members.find((m) => m.id === socketId);
    if (!member) {
      return { ok: false, reached: false };
    }

    if (
      !this.skipVote ||
      this.skipVote.videoId !== this.playback.currentVideoId
    ) {
      const membersCount = this.members.length;
      const threshold = Math.max(
        1,
        Math.ceil(membersCount * 0.5),
      );
      this.skipVote = {
        videoId: this.playback.currentVideoId,
        yesCount: 0,
        threshold,
      };
      this.skipVoters.clear();
    }

    if (this.skipVoters.has(socketId)) {
      return { ok: false, reached: false };
    }

    this.skipVoters.add(socketId);
    if (!this.skipVote) {
      return { ok: false, reached: false };
    }

    this.skipVote.yesCount += 1;
    const reached = this.skipVote.yesCount >= this.skipVote.threshold;
    return { ok: true, reached };
  }
}
