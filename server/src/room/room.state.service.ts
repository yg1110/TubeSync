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
  playback: PlaybackState = { currentVideoId: null, videoStartedAtMs: null };
  skipVote: SkipVoteView | null = null;

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
}
