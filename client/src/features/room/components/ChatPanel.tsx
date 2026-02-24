import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import type { ChatMessage } from "../types";

function formatTime(tsMs: number) {
  return new Date(tsMs).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatPanel(props: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  myNickname: string;
}) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [props.messages.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    props.onSend(v);
    setText("");
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center gap-2">
        <MessageSquare size={16} className="text-gray-500" />
        <h2 className="text-xs font-bold text-white uppercase tracking-widest">
          Live Chat
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {props.messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-1">
            {msg.nickname === "SYSTEM" ? (
              <div className="flex items-center gap-2 py-1">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                  {msg.text}
                </span>
                <div className="h-px flex-1 bg-white/5" />
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <span
                    className={`text-xs font-bold ${msg.nickname === props.myNickname ? "text-red-500" : "text-gray-400"}`}
                  >
                    {msg.nickname}
                  </span>
                  <span className="text-[9px] text-gray-600">
                    {formatTime(msg.tsMs)}
                  </span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed break-words">
                  {msg.text}
                </p>
              </>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="p-4 bg-black/20">
        <div className="relative">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Say something..."
            className="w-full bg-[#151619] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-red-600/50 transition-colors"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-red-500 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
