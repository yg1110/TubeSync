import { NicknameModal } from "./features/room/components/NicknameModal";
import { PresencePanel } from "./features/room/components/PresencePanel";
import { useRoom } from "./features/room/useRoom";

export default function App() {
  const { connected, joined, room, join, joinError } = useRoom();

  const showNicknameModal = connected && !joined;

  return (
    <div
      style={{
        fontFamily: "system-ui",
        padding: 16,
        maxWidth: 960,
        margin: "0 auto",
      }}
    >
      <h2>TubeSync</h2>
      <div style={{ color: connected ? "green" : "crimson" }}>
        {connected ? "CONNECTED" : "DISCONNECTED"}
      </div>

      <NicknameModal
        open={showNicknameModal}
        onSubmit={join}
        error={joinError}
      />

      {room ? (
        <div style={{ marginTop: 16 }}>
          <PresencePanel leaderId={room.leaderId} members={room.members} />
        </div>
      ) : (
        <div style={{ marginTop: 16, color: "#666" }}>
          {joined
            ? "룸 상태를 불러오는 중..."
            : "닉네임을 입력하면 입장합니다."}
        </div>
      )}
    </div>
  );
}
