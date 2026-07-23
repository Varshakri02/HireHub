// Single shared Socket.io connection, authenticated with the JWT.
import { io } from "socket.io-client";

let socket = null;

export function connectSocket() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  if (socket) return socket;
  socket = io("/", { auth: { token }, autoConnect: true });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
