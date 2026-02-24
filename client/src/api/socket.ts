import { io } from "socket.io-client";

export const socket = io("http://192.168.0.16:3000", {
  transports: ["websocket"],
  withCredentials: true,
  autoConnect: true,
});
