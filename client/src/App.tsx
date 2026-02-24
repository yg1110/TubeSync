import { ChatPanel } from "./features/room/components/ChatPanel";
import { NicknameModal } from "./features/room/components/NicknameModal";
import { PresencePanel } from "./features/room/components/PresencePanel";
import { useRoom } from "./features/room/useRoom";
import { QueuePanel } from "./features/room/components/QueuePanel";

const layoutStyle = {
  fontFamily: "system-ui",
  padding: 16,
  maxWidth: 960,
  margin: "0 auto",
} as const;

export default function App() {
  const {
    connected,
    joined,
    room,
    join,
    joinError,
    sendChat,
    addToQueue,
    queueError,
  } = useRoom();
  const showNicknameModal = connected && !joined;

  if (!room) {
    return (
      <div style={layoutStyle}>
        <h2>TubeSync</h2>
        <div style={{ color: connected ? "green" : "crimson" }}>
          {connected ? "CONNECTED" : "DISCONNECTED"}
        </div>
        <NicknameModal
          open={showNicknameModal}
          onSubmit={join}
          error={joinError}
        />
        <div style={{ marginTop: 16, color: "#666" }}>
          {joined
            ? "룸 상태를 불러오는 중..."
            : "닉네임을 입력하면 입장합니다."}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 16,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <PresencePanel leaderId={room.leaderId} members={room.members} />
        <QueuePanel queue={room.queue} onAdd={addToQueue} error={queueError} />
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 12,
            color: "#666",
          }}
        >
          {room.playback.currentVideoId ? (
            <div>
              <b>재생중</b>
              <div style={{ marginTop: 6 }}>
                videoId: <code>{room.playback.currentVideoId}</code>
              </div>
            </div>
          ) : (
            "재생할 영상이 없습니다. 유튜브 링크를 추가해주세요."
          )}
        </div>
      </div>

      <ChatPanel messages={room.chat} onSend={sendChat} />
    </div>
  );
}
