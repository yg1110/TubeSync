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
}
