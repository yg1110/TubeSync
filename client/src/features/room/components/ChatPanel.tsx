import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../types";

function formatTime(tsMs: number) {
  const d = new Date(tsMs);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function ChatPanel(props: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [props.messages.length]);

  const submit = () => {
    const v = text.trim();
    if (!v) return;
    props.onSend(v);
    setText("");
  };

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 12,
        height: 420,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <b>채팅</b>

      <div
        style={{
          marginTop: 8,
          flex: 1,
          overflow: "auto",
          background: "#fafafa",
          padding: 8,
          borderRadius: 8,
        }}
      >
        {props.messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "#666" }}>
              <b
                style={{ color: m.nickname === "SYSTEM" ? "#b45309" : "#111" }}
              >
                {m.nickname}
              </b>{" "}
              <span>{formatTime(m.tsMs)}</span>
            </div>
            <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="메시지를 입력하세요"
          style={{ flex: 1, padding: 10 }}
        />
        <button onClick={submit} style={{ padding: "10px 14px" }}>
          전송
        </button>
      </div>
    </div>
  );
}
