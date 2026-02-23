import { useEffect, useState } from "react";
import { socket } from "../../api/socket";
import type {
  JoinRejectedReason,
  RoomStateView,
  Member,
  ChatMessage,
  QueueAddRejectedReason,
  QueueItem,
} from "./types";

export function useRoom() {
  const [connected, setConnected] = useState(socket.connected);
  const [joined, setJoined] = useState(false);

  const [room, setRoom] = useState<RoomStateView | null>(null);
  const [joinError, setJoinError] = useState<JoinRejectedReason | null>(null);
  const [queueError, setQueueError] = useState<QueueAddRejectedReason | null>(
    null,
  );

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => {
      setConnected(false);
      setJoined(false);
    };

    const onJoinAccepted = () => {
      setJoined(true);
      setJoinError(null);
    };

    const onJoinRejected = (payload: { reason: JoinRejectedReason }) => {
      setJoinError(payload.reason);
      setJoined(false);
    };

    const onRoomState = (payload: { state: RoomStateView }) => {
      setRoom(payload.state);
    };

    const onMembersUpdate = (payload: {
      leaderId: string | null;
      members: Member[];
    }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          leaderId: payload.leaderId,
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

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("JOIN_ACCEPTED", onJoinAccepted);
    socket.on("JOIN_REJECTED", onJoinRejected);
    socket.on("ROOM_STATE", onRoomState);
    socket.on("MEMBERS_UPDATE", onMembersUpdate);
    socket.on("CHAT_BROADCAST", onChatBroadcast);
    socket.on("QUEUE_UPDATE", onQueueUpdate);
    socket.on("QUEUE_ADD_REJECTED", onQueueAddRejected);

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

  return {
    connected,
    joined,
    room,
    join,
    joinError,
    sendChat,
    addToQueue,
    queueError,
  };
}
