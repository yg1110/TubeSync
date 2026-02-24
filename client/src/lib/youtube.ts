/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}
export {};

export type YouTubePlayerState = {
  cueVideoById: (opts: { videoId: string; startSeconds?: number }) => void;
  loadVideoById: (opts: { videoId: string; startSeconds?: number }) => void;
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
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

export async function createYouTubePlayer(params: {
  elementId: string;
  videoId?: string;
  events?: PlayerEvents;
}): Promise<YouTubePlayerState> {
  await loadYouTubeIframeApi();

  const player = new window.YT.Player(params.elementId, {
    videoId: params.videoId,
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
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
