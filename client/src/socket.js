// Single shared Socket.io connection, authenticated with the JWT.
import { io } from "socket.io-client";

let socket = null;

export function connectSocket() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  if (socket) return socket;
  // Dev: same-origin ("/") via Vite proxy. Prod: direct to the backend origin
  // (WebSocket upgrade can't be proxied by Vercel rewrites, so connect directly).
  const url = import.meta.env.VITE_SOCKET_URL || "/";
  socket = io(url, { auth: { token }, autoConnect: true });
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
