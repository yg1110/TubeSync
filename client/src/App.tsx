import { useEffect, useState } from "react";
import { socket } from "./api/socket";

type ServerHello = { socketId: string };
type Pong = { t: number; serverNowMs: number };

export default function App() {
  const [connected, setConnected] = useState(socket.connected);
  const [serverSocketId, setServerSocketId] = useState<string | null>(null);
  const [lastPong, setLastPong] = useState<Pong | null>(null);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onHello = (payload: ServerHello) =>
      setServerSocketId(payload.socketId);
    const onPong = (payload: Pong) => setLastPong(payload);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("SERVER_HELLO", onHello);
    socket.on("PONG", onPong);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("SERVER_HELLO", onHello);
      socket.off("PONG", onPong);
      // ❌ 여기서 disconnect() 하지 마세요 (dev에서 HMR/StrictMode로 끊김)
    };
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <h2>TubeSync - Socket 연결 테스트</h2>

      <div>
        Status: <b>{connected ? "CONNECTED" : "DISCONNECTED"}</b>
      </div>
      <div>Client socket.id: {socket.id ?? "-"}</div>
      <div>Server hello socketId: {serverSocketId ?? "-"}</div>

      <button
        style={{ marginTop: 12 }}
        disabled={!connected}
        onClick={() => socket.emit("PING", { t: Date.now() })}
      >
        PING
      </button>

      <pre
        style={{
          marginTop: 12,
          padding: 12,
          border: "1px solid #ccc",
          borderRadius: 8,
          background: "#f0f0f0",
          color: "#333",
          fontFamily: "monospace",
          fontSize: 14,
          lineHeight: 1.5,
          overflowX: "auto",
          maxHeight: 200,
        }}
      >
        {lastPong ? JSON.stringify(lastPong, null, 2) : "No PONG yet"}
      </pre>
    </div>
  );
}
