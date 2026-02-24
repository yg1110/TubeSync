import { ChatPanel } from "./features/room/components/ChatPanel";
import { NicknameModal } from "./features/room/components/NicknameModal";
import { PresencePanel } from "./features/room/components/PresencePanel";
import { useRoom } from "./features/room/useRoom";
import { QueuePanel } from "./features/room/components/QueuePanel";
import { VideoStage } from "./features/room/components/VideoStage";

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
    playPauseToggle,
    seek,
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
        <VideoStage
          playback={room.playback}
          leaderId={room.leaderId}
          lastPlaybackServerNowMs={room.lastPlaybackServerNowMs}
          onPlayPauseToggle={playPauseToggle}
          onSeek={seek}
        />
      </div>

      <ChatPanel messages={room.chat} onSend={sendChat} />
    </div>
  );
}
