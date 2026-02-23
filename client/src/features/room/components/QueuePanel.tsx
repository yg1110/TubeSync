import { useState } from "react";
import type { QueueAddRejectedReason, QueueItem } from "../types";

function errorMessage(e: QueueAddRejectedReason) {
  return e === "INVALID_URL"
    ? "유효한 유튜브 링크가 아닙니다."
    : "큐 추가 실패";
}

export function QueuePanel(props: {
  queue: QueueItem[];
  onAdd: (url: string) => void;
  error: QueueAddRejectedReason | null;
}) {
  const [url, setUrl] = useState("");

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <b>재생 큐</b>

      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="유튜브 URL을 입력하세요"
          style={{ flex: 1, padding: 10 }}
        />
        <button
          onClick={() => {
            const v = url.trim();
            if (!v) return;
            props.onAdd(v);
            setUrl("");
          }}
          style={{ padding: "10px 14px" }}
        >
          추가
        </button>
      </div>

      {props.error && (
        <div style={{ marginTop: 8, color: "crimson", fontSize: 13 }}>
          {errorMessage(props.error)}
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 13, color: "#666" }}>
        {props.queue.length === 0
          ? "큐가 비어 있습니다."
          : `대기 영상 ${props.queue.length}개`}
      </div>

      <ol style={{ marginTop: 8, paddingLeft: 18 }}>
        {props.queue.map((q) => (
          <li key={q.id} style={{ marginBottom: 6 }}>
            <div>
              <code>{q.videoId}</code>
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>
              added by <b>{q.addedBy}</b>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
