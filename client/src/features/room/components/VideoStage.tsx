import { useEffect, useMemo, useRef, useState } from "react";
import type { PlaybackState, SyncTickPayload, SocketId } from "../types";
import { getPlaybackPositionSec } from "../types";
import { socket } from "../../../api/socket";
import {
  createYouTubePlayer,
  type YouTubePlayerState,
} from "../../../lib/youtube";

const DRIFT_THRESHOLD_SEC = 1.5;

export function VideoStage(props: {
  playback: PlaybackState;
  leaderId: SocketId | null;
  lastPlaybackServerNowMs?: number;
  onPlayPauseToggle: () => void;
  onSeek: (positionSec: number) => void;
}) {
  const playerRef = useRef<YouTubePlayerState | null>(null);
  const [ready, setReady] = useState(false);

  const serverTimeRef = useRef<{ serverMs: number; clientMs: number }>({
    serverMs: 0,
    clientMs: 0,
  });
  const appliedVideoIdRef = useRef<string | null>(null);
  /** 프로그레스바용 서버 시각(추정). effect/interval에서만 갱신 */
  const [displayServerTimeMs, setDisplayServerTimeMs] = useState(0);

  const elementId = useMemo(() => "yt-player", []);

  useEffect(() => {
    if (serverTimeRef.current.serverMs === 0) {
      const t = Date.now();
      serverTimeRef.current = { serverMs: t, clientMs: t };
      const id = setTimeout(() => setDisplayServerTimeMs(t), 0);
      return () => clearTimeout(id);
    }
  }, []);

  const isValidVideoId = (id: string | null): id is string =>
    !!id && /^[A-Za-z0-9_-]{11}$/.test(id);

  const shouldMountPlayer = isValidVideoId(props.playback.currentVideoId);

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
          onStateChange: () => {
            // 서버가 재생/일시정지를 관리하므로 로컬 상태 변경은 무시
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
    };
  }, [elementId, shouldMountPlayer, props.playback.currentVideoId]);

  // 서버 재생 상태 반영: 영상이 바뀌었으면 loadVideoById, 같으면 seekTo + 재생/일시정지
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
      queueMicrotask(() => setDisplayServerTimeMs(lastPlaybackServerNowMs));
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

  // 프로그레스바가 재생 중일 때 매끄럽게 움직이도록: 서버 시각 추정 + 주기적 리렌더
  useEffect(() => {
    if (!props.playback.currentVideoId || props.playback.isPaused) return;
    const id = setInterval(() => {
      const { serverMs, clientMs } = serverTimeRef.current;
      setDisplayServerTimeMs(serverMs + (clientMs ? Date.now() - clientMs : 0));
    }, 200);
    return () => clearInterval(id);
  }, [props.playback.currentVideoId, props.playback.isPaused]);

  const currentPositionSec =
    getPlaybackPositionSec(props.playback, displayServerTimeMs) ?? 0;

  const [durationSec, setDurationSec] = useState(0);
  useEffect(() => {
    if (!ready || !playerRef.current) return;
    const resetId = setTimeout(() => setDurationSec(0), 0);
    let cancelled = false;
    const applyDuration = (d: number) => {
      if (!cancelled && typeof d === "number" && d > 0) setDurationSec(d);
    };
    const t = setInterval(() => {
      try {
        const d = playerRef.current?.getDuration();
        if (typeof d === "number" && d > 0) applyDuration(d);
      } catch {
        // ignore
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(resetId);
      clearInterval(t);
    };
  }, [ready, props.playback.currentVideoId]);

  const formatTime = (sec: number, unknown = false) => {
    if (unknown || sec <= 0) return "--:--";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <b>영상</b>

      {!shouldMountPlayer ? (
        <div style={{ marginTop: 10, color: "#666" }}>
          재생할 영상이 없습니다. 유튜브 링크를 추가해주세요.
        </div>
      ) : (
        <div style={{ marginTop: 10, position: "relative" }}>
          <div style={{ position: "relative" }}>
            <div id={elementId} />
            {/* 유튜브 영상 클릭(일시정지/시간이동) 방지: iframe 위에 오버레이 */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "all",
                zIndex: 1,
              }}
              aria-hidden
            />
          </div>

          <div
            style={{
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 12, color: "#666" }}>
              {props.playback.isPaused ? "일시정지" : "재생 중"}
            </span>
            <span style={{ fontSize: 12, color: "#666" }}>
              {formatTime(currentPositionSec)} /{" "}
              {formatTime(durationSec, durationSec <= 0)}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(durationSec, 1)}
              step={1}
              value={currentPositionSec}
              readOnly
              style={{ flex: 1, minWidth: 80, pointerEvents: "none" }}
              tabIndex={-1}
              aria-label="재생 위치 (보기 전용)"
            />
          </div>

          <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
            videoId: <code>{props.playback.currentVideoId}</code>
          </div>
        </div>
      )}
    </div>
  );
}
