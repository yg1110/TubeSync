export type SocketId = string;

export type JoinRejectedReason = "NICKNAME_TAKEN" | "INVALID_NICKNAME";

export interface Member {
  id: SocketId;
  nickname: string;
  joinedAtMs: number;
}

export interface ChatMessage {
  id: string;
  nickname: string;
  text: string;
  tsMs: number;
}

export interface QueueItem {
  id: string;
  videoId: string;
  addedBy: string;
  addedAtMs: number;
}

export interface PlaybackState {
  currentVideoId: string | null;
  videoStartedAtMs: number | null;
}

export interface SkipVoteView {
  videoId: string;
  yesCount: number;
  threshold: number;
}

export interface RoomStateView {
  leaderId: SocketId | null;
  members: Member[];
  chat: ChatMessage[];
  queue: QueueItem[];
  playback: PlaybackState;
  skipVote: SkipVoteView | null;
}
