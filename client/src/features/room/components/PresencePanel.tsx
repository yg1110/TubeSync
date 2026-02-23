import type { Member, SocketId } from "../types";

export function PresencePanel(props: {
  leaderId: SocketId | null;
  members: Member[];
}) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <b>접속자</b>
        <span>{props.members.length}명</span>
      </div>

      <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
        {props.members.map((m) => (
          <li key={m.id}>
            {m.nickname} {props.leaderId === m.id ? "👑" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
