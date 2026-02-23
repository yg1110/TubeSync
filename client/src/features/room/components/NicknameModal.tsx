import { useState } from "react";
import type { JoinRejectedReason } from "../types";

function reasonToMessage(reason: JoinRejectedReason) {
  if (reason === "NICKNAME_TAKEN") return "이미 사용 중인 닉네임입니다.";
  return "닉네임은 2~12자, 한글/영문/숫자/공백만 가능합니다.";
}

export function NicknameModal(props: {
  open: boolean;
  onSubmit: (nickname: string) => void;
  error: JoinRejectedReason | null;
}) {
  const [nickname, setNickname] = useState("");

  if (!props.open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        style={{
          width: 360,
          background: "#fff",
          padding: 16,
          borderRadius: 12,
        }}
      >
        <h3 style={{ marginTop: 0 }}>닉네임 입력</h3>

        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="2~12자, 한글/영문/숫자/공백"
          style={{ width: "100%", padding: 10, boxSizing: "border-box" }}
        />

        {props.error && (
          <div style={{ marginTop: 8, color: "crimson", fontSize: 13 }}>
            {reasonToMessage(props.error)}
          </div>
        )}

        <button
          style={{ marginTop: 12, width: "100%", padding: 10 }}
          onClick={() => props.onSubmit(nickname)}
        >
          입장
        </button>
      </div>
    </div>
  );
}
