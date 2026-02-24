export type SocketId = string;
export type JoinRejectedReason = 'NICKNAME_TAKEN' | 'INVALID_NICKNAME';
export type QueueAddRejectedReason = 'INVALID_URL';
export type StartNextReason =
  | 'QUEUE_FILLED'
  | 'VIDEO_ENDED'
  | 'VIDEO_ERROR'
  | 'VOTE_SKIP';

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
  /** 재생 시작 시점(서버 시각). 재생 중일 때 현재 재생 위치 = (now - videoStartedAtMs) / 1000 */
  videoStartedAtMs: number | null;
  /** 일시정지 여부. true면 pausedAtMs 기준으로 위치 고정 */
  isPaused: boolean;
  /** 일시정지된 시점(서버 시각). isPaused일 때만 사용. 위치 = (pausedAtMs - videoStartedAtMs) / 1000 */
  pausedAtMs: number | null;
  /** 현재 재생 중인 영상을 추가한 사용자 닉네임 */
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
}
export interface QueueAddRejectedPayload {
  reason: QueueAddRejectedReason;
}
