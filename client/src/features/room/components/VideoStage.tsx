import { useEffect, useMemo, useRef, useState } from "react";
import type { PlaybackState, SyncTickPayload, SocketId } from "../types";
import { socket } from "../../../api/socket";
import {
  createYouTubePlayer,
  type YouTubePlayerState,
} from "../../../lib/youtube";

const DRIFT_THRESHOLD_SEC = 1.5;

function calcShouldBeSec(serverNowMs: number, startedAtMs: number) {
  return Math.max(0, (serverNowMs - startedAtMs) / 1000);
}

export function VideoStage(props: {
  playback: PlaybackState;
  leaderId: SocketId | null;
}) {
  const playerRef = useRef<YouTubePlayerState | null>(null);
  const [ready, setReady] = useState(false);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);

  const elementId = useMemo(() => "yt-player", []);

  // 1) 플레이어 생성(1회)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const p = await createYouTubePlayer({
        elementId,
        events: {
          onReady: () => {
            if (cancelled) return;
            playerRef.current?.mute(); // autoplay 정책 대응: 우선 mute로 안정화
            setReady(true);
          },
          // Step 9에서 리더 ENDED/ERROR report 붙일 예정
        },
      });

      if (cancelled) return;
      playerRef.current = p;
    })();

    return () => {
      cancelled = true;
      // YT Player destroy는 타입 상 여기서 생략(필요시 나중에 보강)
      playerRef.current = null;
    };
  }, [elementId]);

  // 2) PLAYBACK_UPDATE 반영: 새 영상 로드 + 현재 시점 싱크
  useEffect(() => {
    if (!ready) return;
    const player = playerRef.current;
    if (!player) return;

    const { currentVideoId, videoStartedAtMs } = props.playback;

    if (!currentVideoId || !videoStartedAtMs) {
      // 대기 상태: 여기서 stop 처리는 MVP에서 생략해도 UI로 가림
      return;
    }

    // 클라 시간으로 1차 싱크(정밀 보정은 SYNC_TICK에서)
    const shouldBeSec = calcShouldBeSec(Date.now(), videoStartedAtMs);

    try {
      player.loadVideoById({
        videoId: currentVideoId,
        startSeconds: shouldBeSec,
      });
      player.playVideo();
      queueMicrotask(() => setNeedsUserGesture(false));
    } catch {
      // autoplay 실패 가능: UI로 유저 클릭 유도
      queueMicrotask(() => setNeedsUserGesture(true));
    }
  }, [props.playback.currentVideoId, props.playback.videoStartedAtMs, ready]);

  // 3) SYNC_TICK으로 드리프트 보정
  useEffect(() => {
    if (!ready) return;

    const onSyncTick = (payload: SyncTickPayload) => {
      const player = playerRef.current;
      if (!player) return;

      const { currentVideoId, videoStartedAtMs } = props.playback;
      if (!currentVideoId || !videoStartedAtMs) return;

      const shouldBeSec = calcShouldBeSec(
        payload.serverNowMs,
        videoStartedAtMs,
      );

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
          player.playVideo();
        } catch {
          setNeedsUserGesture(true);
        }
      }
    };

    socket.on("SYNC_TICK", onSyncTick);
    return () => {
      socket.off("SYNC_TICK", onSyncTick);
    };
  }, [ready, props.playback]);

  const onUserPlay = () => {
    const player = playerRef.current;
    if (!player) return;
    try {
      player.playVideo();
      setNeedsUserGesture(false);
    } catch {
      // noop
    }
  };

  const isWaiting = !props.playback.currentVideoId;

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <b>영상</b>

      {isWaiting ? (
        <div style={{ marginTop: 10, color: "#666" }}>
          재생할 영상이 없습니다. 유튜브 링크를 추가해주세요.
        </div>
      ) : (
        <div style={{ marginTop: 10, position: "relative" }}>
          <div id={elementId} />

          {needsUserGesture && (
            <button
              onClick={onUserPlay}
              style={{
                position: "absolute",
                inset: 0,
                margin: "auto",
                width: 220,
                height: 48,
              }}
            >
              재생을 시작하려면 클릭
            </button>
          )}

          <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
            videoId: <code>{props.playback.currentVideoId}</code>
          </div>
        </div>
      )}
    </div>
  );
}
