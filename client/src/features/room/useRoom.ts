import { useEffect, useState } from "react";
import { socket } from "../../api/socket";
import type {
  JoinRejectedReason,
  RoomStateView,
  Member,
  ChatMessage,
  QueueAddRejectedReason,
  QueueItem,
  PlaybackState,
  SkipVoteView,
} from "./types";

export function useRoom() {
  const [connected, setConnected] = useState(socket.connected);
  const [joined, setJoined] = useState(false);
  const [myId, setMyId] = useState<string>("");

  const [room, setRoom] = useState<RoomStateView | null>(null);
  const [joinError, setJoinError] = useState<JoinRejectedReason | null>(null);
  const [queueError, setQueueError] = useState<QueueAddRejectedReason | null>(
    null,
  );

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      setMyId(socket.id ?? "");
    };
    const onDisconnect = () => {
      setConnected(false);
      setJoined(false);
      setMyId("");
    };

    const onJoinAccepted = () => {
      setJoined(true);
      setJoinError(null);
    };

    const onJoinRejected = (payload: { reason: JoinRejectedReason }) => {
      setJoinError(payload.reason);
      setJoined(false);
    };

    const onRoomState = (payload: {
      state: RoomStateView;
      serverNowMs?: number;
    }) => {
      setRoom({
        ...payload.state,
        lastPlaybackServerNowMs:
          payload.serverNowMs ?? payload.state.lastPlaybackServerNowMs,
      });
    };

    const onMembersUpdate = (payload: { members: Member[] }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: payload.members,
        };
      });
    };

    const onChatBroadcast = (payload: { message: ChatMessage }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        const nextChat = [...prev.chat, payload.message];
        // 안전하게 50개 유지(서버도 유지하지만, 클라에서도 한번 더)
        const trimmed =
          nextChat.length > 50
            ? nextChat.slice(nextChat.length - 50)
            : nextChat;
        return { ...prev, chat: trimmed };
      });
    };

    const onQueueUpdate = (payload: { queue: QueueItem[] }) => {
      setRoom((prev) => (prev ? { ...prev, queue: payload.queue } : prev));
    };

    const onQueueAddRejected = (payload: {
      reason: QueueAddRejectedReason;
    }) => {
      setQueueError(payload.reason);
    };

    const onPlaybackUpdate = (payload: {
      playback: PlaybackState;
      serverNowMs?: number;
    }) => {
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              playback: payload.playback,
              lastPlaybackServerNowMs:
                payload.serverNowMs ?? prev.lastPlaybackServerNowMs,
            }
          : prev,
      );
    };

    const onSkipVoteUpdate = (payload: { skipVote: SkipVoteView | null }) => {
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              skipVote: payload.skipVote ?? null,
            }
          : prev,
      );
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("JOIN_ACCEPTED", onJoinAccepted);
    socket.on("JOIN_REJECTED", onJoinRejected);
    socket.on("ROOM_STATE", onRoomState);
    socket.on("MEMBERS_UPDATE", onMembersUpdate);
    socket.on("CHAT_BROADCAST", onChatBroadcast);
    socket.on("QUEUE_UPDATE", onQueueUpdate);
    socket.on("QUEUE_ADD_REJECTED", onQueueAddRejected);
    socket.on("PLAYBACK_UPDATE", onPlaybackUpdate);
    socket.on("SKIP_VOTE_UPDATE", onSkipVoteUpdate);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("JOIN_ACCEPTED", onJoinAccepted);
      socket.off("JOIN_REJECTED", onJoinRejected);
      socket.off("ROOM_STATE", onRoomState);
      socket.off("MEMBERS_UPDATE", onMembersUpdate);
      socket.off("CHAT_BROADCAST", onChatBroadcast);
      socket.off("QUEUE_UPDATE", onQueueUpdate);
      socket.off("QUEUE_ADD_REJECTED", onQueueAddRejected);
      socket.off("PLAYBACK_UPDATE", onPlaybackUpdate);
      socket.off("SKIP_VOTE_UPDATE", onSkipVoteUpdate);
    };
  }, []);

  const join = (nickname: string) => {
    socket.emit("JOIN", { nickname });
  };

  const sendChat = (text: string) => {
    socket.emit("CHAT_SEND", { text });
  };

  const addToQueue = (youtubeUrl: string) => {
    setQueueError(null);
    socket.emit("QUEUE_ADD", { youtubeUrl });
  };

  const playPauseToggle = () => {
    socket.emit("PLAY_PAUSE_TOGGLE", {});
  };

  const seek = (positionSec: number) => {
    socket.emit("PLAY_SEEK", { positionSec });
  };

  const voteSkip = () => {
    socket.emit("VOTE_SKIP", {});
  };

  return {
    connected,
    joined,
    room,
    myId,
    join,
    joinError,
    sendChat,
    addToQueue,
    queueError,
    playPauseToggle,
    seek,
    voteSkip,
  };
}
