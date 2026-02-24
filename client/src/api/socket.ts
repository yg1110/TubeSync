import { io } from "socket.io-client";

export const socket = io("http://27.35.18.214:3000", {
  transports: ["websocket"],
  withCredentials: true,
  autoConnect: true,
});
