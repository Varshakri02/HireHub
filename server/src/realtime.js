// Holds the Socket.io server instance so non-socket code (REST routes, stores)
// can push events without importing index.js and creating a cycle.
let io = null;

export function setIO(instance) {
  io = instance;
}

// Emit to every tab/device of one user. No-op before the socket server is up.
export function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(`user:${Number(userId)}`).emit(event, payload);
}
