import { useEffect, useMemo, useRef, useState } from "react";
import { ListMusic, SkipForward } from "lucide-react";
import type {
  PlaybackState,
  QueueItem,
  SyncTickPayload,
  SocketId,
} from "../types";
import { getPlaybackPositionSec } from "../types";
import { socket } from "../../../api/socket";
import {
  createYouTubePlayer,
  type YouTubePlayerState,
} from "../../../lib/youtube";

const DRIFT_THRESHOLD_SEC = 1.5;

/** YT.PlayerState.PLAYING = 1 */
const YT_PLAYING = 1;
/** YT.PlayerState.ENDED = 0 */
const YT_ENDED = 0;

export function VideoStage(props: {
  playback: PlaybackState;
  queue?: QueueItem[];
  lastPlaybackServerNowMs?: number;
  onPlayPauseToggle: () => void;
  onSeek: (positionSec: number) => void;
  skipVote: import("../types").SkipVoteView | null;
  onVoteSkip: () => void;
}) {
  const playerRef = useRef<YouTubePlayerState | null>(null);
  const [ready, setReady] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);

  const serverTimeRef = useRef<{ serverMs: number; clientMs: number }>({
    serverMs: 0,
    clientMs: 0,
  });
  const appliedVideoIdRef = useRef<string | null>(null);
  const [, setDisplayServerTimeMs] = useState(0);

  const elementId = useMemo(() => "yt-player", []);

  const isValidVideoId = (id: string | null): id is string =>
    !!id && /^[A-Za-z0-9_-]{11}$/.test(id);
  const shouldMountPlayer = isValidVideoId(props.playback.currentVideoId);

  // 유튜브 제목 oEmbed 조회
  useEffect(() => {
    const id = props.playback.currentVideoId;
    if (!isValidVideoId(id)) {
      const t = setTimeout(() => setVideoTitle(null), 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`;
    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { title?: string } | null) => {
        if (!cancelled && data?.title) setVideoTitle(data.title);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [props.playback.currentVideoId]);

  useEffect(() => {
    if (!shouldMountPlayer) return;

    const initialVideoId = props.playback.currentVideoId;
    if (!isValidVideoId(initialVideoId)) return;

    const serverNow =
      props.lastPlaybackServerNowMs ??
      serverTimeRef.current.serverMs ??
      Date.now();
    const startSec = getPlaybackPositionSec(props.playback, serverNow);
    const startSeconds =
      startSec != null && startSec > 0 ? Math.floor(startSec) : undefined;

    let cancelled = false;

    (async () => {
      const p = await createYouTubePlayer({
        elementId,
        videoId: initialVideoId,
        startSeconds,
        events: {
          onReady: () => {
            if (cancelled) return;
            setReady(true);
          },
          onStateChange: (state) => {
            // 영상이 끝나면 서버에 알려서 다음 큐 또는 빈 상태로 전환
            if (state === YT_ENDED) {
              socket.emit("VIDEO_ENDED", {});
            }
            // 재생/일시정지는 여전히 서버가 관리
          },
        },
      });

      if (cancelled) return;
      playerRef.current = p;
    })();

    return () => {
      cancelled = true;
      playerRef.current = null;
      setReady(false);
      setShowOverlay(false);
    };
  }, [elementId, shouldMountPlayer, props.playback.currentVideoId]);

  // 서버 재생 상태 반영
  useEffect(() => {
    if (!ready) return;
    const player = playerRef.current;
    if (!player) return;

    const { playback, lastPlaybackServerNowMs } = props;
    const serverNow =
      lastPlaybackServerNowMs ?? serverTimeRef.current.serverMs ?? Date.now();
    if (lastPlaybackServerNowMs != null) {
      const clientNow = Date.now();
      serverTimeRef.current = {
        serverMs: lastPlaybackServerNowMs,
        clientMs: clientNow,
      };
    }

    const shouldBeSec = getPlaybackPositionSec(playback, serverNow);
    if (!isValidVideoId(playback.currentVideoId) || shouldBeSec == null) return;

    const isNewVideo = appliedVideoIdRef.current !== playback.currentVideoId;
    appliedVideoIdRef.current = playback.currentVideoId;

    try {
      if (isNewVideo) {
        player.loadVideoById({
          videoId: playback.currentVideoId,
          startSeconds: shouldBeSec,
        });
      } else {
        player.seekTo(shouldBeSec, true);
      }
      if (playback.isPaused) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    } catch {
      // ignore
    }
  }, [
    props.playback.currentVideoId,
    props.playback.videoStartedAtMs,
    props.playback.isPaused,
    props.playback.pausedAtMs,
    props.lastPlaybackServerNowMs,
    ready,
  ]);

  // Autoplay blocked: show click overlay
  useEffect(() => {
    if (!ready || !playerRef.current || !shouldMountPlayer) return;
    const t = setTimeout(() => {
      try {
        if (
          playerRef.current?.getPlayerState() !== YT_PLAYING &&
          !props.playback.isPaused
        ) {
          setShowOverlay(true);
        }
      } catch {
        // ignore
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [ready, shouldMountPlayer, props.playback.isPaused]);

  // SYNC_TICK: 서버 시각으로 드리프트 보정
  useEffect(() => {
    if (!ready) return;

    const onSyncTick = (payload: SyncTickPayload) => {
      const clientNow = Date.now();
      serverTimeRef.current = {
        serverMs: payload.serverNowMs,
        clientMs: clientNow,
      };
      setDisplayServerTimeMs(payload.serverNowMs);
      const player = playerRef.current;
      if (!player) return;

      const shouldBeSec = getPlaybackPositionSec(
        props.playback,
        payload.serverNowMs,
      );
      if (!isValidVideoId(props.playback.currentVideoId) || shouldBeSec == null)
        return;

      let current = 0;
      try {
        current = player.getCurrentTime();
      } catch {
        return;
      }

      const drift = shouldBeSec - current;
      if (Math.abs(drift) >= DRIFT_THRESHOLD_SEC) {
        try {
          player.seekTo(shouldBeSec, true);
          if (!props.playback.isPaused) {
            player.playVideo();
          } else {
            player.pauseVideo();
          }
        } catch {
          // ignore
        }
      }
    };

    socket.on("SYNC_TICK", onSyncTick);
    return () => {
      socket.off("SYNC_TICK", onSyncTick);
    };
  }, [ready, props.playback]);

  // 프로그레스바용 서버 시각 추정
  useEffect(() => {
    if (!props.playback.currentVideoId || props.playback.isPaused) return;
    const id = setInterval(() => {
      const { serverMs, clientMs } = serverTimeRef.current;
      setDisplayServerTimeMs(serverMs + (clientMs ? Date.now() - clientMs : 0));
    }, 200);
    return () => clearInterval(id);
  }, [props.playback.currentVideoId, props.playback.isPaused]);

  if (!shouldMountPlayer) {
    return (
      <div className="w-full aspect-video bg-[#151619] rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
          <ListMusic className="text-gray-600" size={32} />
        </div>
        <div>
          <h3 className="text-white font-medium">No video playing</h3>
          <p className="text-sm text-gray-500 mt-1">
            Add a YouTube link to the queue to start watching together.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10">
        <div className="absolute inset-0 z-0">
          <div id={elementId} className="w-full h-full" />
        </div>
        {/* 클릭(일시정지/시간이동) 방지: iframe 위 오버레이 - 터치만 막고 오버레이 표시 시에는 클릭 통과 */}
        {!showOverlay && (
          <div
            className="absolute inset-0 z-1"
            style={{ pointerEvents: "all" }}
            aria-hidden
          />
        )}
      </div>

      {/* 재생 컨트롤 바 — 유튜브 스타일 */}
      <div className="flex items-center justify-between bg-[#151619] p-4 rounded-xl border border-white/5">
        <div className="flex-1 min-w-0">
          <h2
            className="text-white font-semibold truncate"
            title={videoTitle ?? undefined}
          >
            {videoTitle ?? props.playback.currentVideoId ?? "—"}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {props.playback.addedBy
              ? `Added by: ${props.playback.addedBy}`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">
              Skip Vote
            </span>
            <span className="text-sm font-mono text-white">
              {props.skipVote
                ? `${props.skipVote.yesCount} / ${props.skipVote.threshold}`
                : `0 / 0`}
            </span>
          </div>
          <button
            onClick={props.onVoteSkip}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors text-white"
            title="Vote to skip"
          >
            <SkipForward size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}
