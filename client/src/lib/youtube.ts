/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}
export {};

/** YT.PlayerState: UNSTARTED= -1, ENDED=0, PLAYING=1, PAUSED=2, BUFFERING=3, CUED=5 */
export type YouTubePlayerState = {
  cueVideoById: (opts: { videoId: string; startSeconds?: number }) => void;
  loadVideoById: (opts: { videoId: string; startSeconds?: number }) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
};

type PlayerEvents = {
  onReady?: () => void;
  onStateChange?: (state: number) => void;
  onError?: (code: number) => void;
};

let ytReadyPromise: Promise<void> | null = null;

export function loadYouTubeIframeApi(): Promise<void> {
  if (ytReadyPromise) return ytReadyPromise;

  ytReadyPromise = new Promise<void>((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => resolve();
  });

  return ytReadyPromise;
}

/**
 * 컨트롤이 숨겨진 YouTube iframe 플레이어를 생성한다.
 * - autoplay, disablekb, modestbranding 등 임베드 옵션을 통일해서 적용
 * - 상위 컴포넌트(예: VideoStage)에서 onReady / onStateChange 콜백으로 제어
 */
export async function createYouTubePlayer(params: {
  elementId: string;
  videoId?: string;
  /** 이미 재생 중인 영상이면 시작 초(정수). embed의 &t= 와 동일, playerVars.start 로 전달 */
  startSeconds?: number;
  events?: PlayerEvents;
}): Promise<YouTubePlayerState> {
  await loadYouTubeIframeApi();

  const start =
    params.startSeconds != null && params.startSeconds > 0
      ? Math.floor(params.startSeconds)
      : undefined;

  const player = new window.YT.Player(params.elementId, {
    videoId: params.videoId,
    playerVars: {
      autoplay: 1,
      controls: 0, // 컨트롤 숨김 → 일시정지/시간이동/볼륨 등 불가
      disablekb: 1, // 키보드 조작 비활성화
      fs: 0, // 풀스크린 버튼 숨김
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
      ...(start != null && { start }),
    },
    events: {
      onReady: () => params.events?.onReady?.(),
      onStateChange: (e: { data: number }) =>
        params.events?.onStateChange?.(e.data),
      onError: (e: { data: number }) => params.events?.onError?.(e.data),
    },
  });

  return player as YouTubePlayerState;
}
