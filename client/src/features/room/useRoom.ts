import { useEffect, useState } from "react";
import { socket } from "../../api/socket";
import type { JoinRejectedReason, RoomStateView, Member } from "./types";

export function useRoom() {
  const [connected, setConnected] = useState(socket.connected);
  const [joined, setJoined] = useState(false);

  const [room, setRoom] = useState<RoomStateView | null>(null);
  const [joinError, setJoinError] = useState<JoinRejectedReason | null>(null);

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

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("JOIN_ACCEPTED", onJoinAccepted);
    socket.on("JOIN_REJECTED", onJoinRejected);
    socket.on("ROOM_STATE", onRoomState);
    socket.on("MEMBERS_UPDATE", onMembersUpdate);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("JOIN_ACCEPTED", onJoinAccepted);
      socket.off("JOIN_REJECTED", onJoinRejected);
      socket.off("ROOM_STATE", onRoomState);
      socket.off("MEMBERS_UPDATE", onMembersUpdate);
    };
  }, []);

  const join = (nickname: string) => {
    socket.emit("JOIN", { nickname });
  };

  return { connected, joined, room, join, joinError };
}
