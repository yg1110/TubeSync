import { Injectable } from '@nestjs/common';
import { RoomStateService } from './room.state.service';
import {
  JoinRejectedReason,
  SocketId,
  Member,
  QueueAddRejectedReason,
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
}
