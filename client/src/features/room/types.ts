export type SocketId = string;

export type JoinRejectedReason = "NICKNAME_TAKEN" | "INVALID_NICKNAME";
export type QueueAddRejectedReason = "INVALID_URL";
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
  isPaused: boolean;
  pausedAtMs: number | null;
  addedBy: string | null;
}

export interface SkipVoteView {
  videoId: string;
  yesCount: number;
  threshold: number;
}

export interface RoomStateView {
  members: Member[];
  chat: ChatMessage[];
  queue: QueueItem[];
  playback: PlaybackState;
  skipVote: SkipVoteView | null;
  lastPlaybackServerNowMs?: number;
}

export interface SyncTickPayload {
  serverNowMs: number;
}

/** 서버 기준 현재 재생 위치(초). 재생 중/일시정지 모두 동일 공식으로 계산 */
export function getPlaybackPositionSec(
  playback: PlaybackState,
  serverNowMs: number,
): number | null {
  const { currentVideoId, videoStartedAtMs, isPaused, pausedAtMs } = playback;
  if (!currentVideoId || videoStartedAtMs == null) return null;
  if (isPaused && pausedAtMs != null) {
    return Math.max(0, (pausedAtMs - videoStartedAtMs) / 1000);
  }
  return Math.max(0, (serverNowMs - videoStartedAtMs) / 1000);
}
