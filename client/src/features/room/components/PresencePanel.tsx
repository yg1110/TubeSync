import { Users, Crown } from "lucide-react";
import type { Member } from "../types";

export function PresencePanel(props: { members: Member[]; myId?: string }) {
  const myId = props.myId ?? "";

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Users size={16} className="text-gray-500" />
        <h2 className="text-xs font-bold text-white uppercase tracking-widest">
          Participants
        </h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {props.members.map((m) => (
          <div
            key={m.id}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              m.id === myId
                ? "bg-red-600/10 border-red-600/30 text-red-400"
                : "bg-white/5 border-white/10 text-gray-400"
            }`}
          >
            {m.nickname}
          </div>
        ))}
      </div>
    </div>
  );
}
