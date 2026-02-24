import { Play, Users } from "lucide-react";
import type { Member } from "./features/room/types";
import { ChatPanel } from "./features/room/components/ChatPanel";
import { NicknameModal } from "./features/room/components/NicknameModal";
import { PresencePanel } from "./features/room/components/PresencePanel";
import { useRoom } from "./features/room/useRoom";
import { QueuePanel } from "./features/room/components/QueuePanel";
import { VideoStage } from "./features/room/components/VideoStage";

export default function App() {
  const {
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
  } = useRoom();
  const showNicknameModal = connected && !joined;
  const myNickname =
    room?.members.find((m: Member) => m.id === myId)?.nickname ?? "";

  if (!room) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-6 sm:p-6 font-sans">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <Play className="text-white w-6 h-6 fill-current" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              TubeSync
            </h1>
          </div>
          <div
            className={`text-sm font-medium mb-4 ${connected ? "text-green-500" : "text-red-500"}`}
          >
            {connected ? "CONNECTED" : "DISCONNECTED"}
          </div>
          <NicknameModal
            open={showNicknameModal}
            onSubmit={join}
            error={joinError}
          />
          <p className="text-gray-500 text-sm mt-4">
            {joined
              ? "룸 상태를 불러오는 중..."
              : "닉네임을 입력하면 입장합니다."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-300 font-sans flex flex-col">
      <header className="sticky top-0 z-20 h-16 border-b border-white/5 bg-[#111214]/95 backdrop-blur flex items-center justify-between px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <Play className="text-white w-5 h-5 fill-current" />
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">
            TubeSync
          </h1>
        </div>

        <div className="hidden sm:flex items-center gap-4">
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
            <Users size={14} className="text-gray-500" />
            <span className="text-xs font-medium text-gray-400">
              {room.members.length} online
            </span>
          </div>
          <div className="text-xs font-medium text-gray-500">
            Signed in as <span className="text-white">{myNickname}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col overflow-y-auto max-h-none lg:max-h-[calc(100dvh-4rem)] p-4 sm:p-6 gap-4 sm:gap-6 custom-scrollbar">
          <section className="space-y-4">
            <VideoStage
              playback={room.playback}
              queue={room.queue}
              lastPlaybackServerNowMs={room.lastPlaybackServerNowMs}
              onPlayPauseToggle={playPauseToggle}
              onSeek={seek}
              skipVote={room.skipVote}
              members={room.members}
              onVoteSkip={voteSkip}
            />
          </section>

          <section className="space-y-4">
            <QueuePanel
              queue={room.queue}
              onAdd={addToQueue}
              error={queueError}
            />
          </section>
        </div>

        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/5 bg-[#111214] flex flex-col shrink-0">
          <div className="p-3 sm:p-4 border-b border-white/5">
            <PresencePanel members={room.members} myId={myId} />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <ChatPanel
              messages={room.chat}
              onSend={sendChat}
              myNickname={myNickname}
            />
          </div>
        </aside>
      </main>
    </div>
  );
}
