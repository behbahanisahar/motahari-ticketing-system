const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const config = require("./config");

let ioInstance = null;

function parseSessionCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
  return match ? match[1] : null;
}

function initSocket(httpServer) {
  const origins = config.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: origins.length ? origins : true,
      credentials: true,
    },
    path: "/socket.io",
  });

  io.use((socket, next) => {
    const token = parseSessionCookie(socket.handshake.headers.cookie);
    if (!token) return next(new Error("Unauthorized"));
    try {
      socket.user = jwt.verify(token, config.JWT_SECRET);
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);

    socket.on("ticket:join", (ticketId) => {
      if (ticketId) socket.join(`ticket:${ticketId}`);
    });

    socket.on("ticket:leave", (ticketId) => {
      if (ticketId) socket.leave(`ticket:${ticketId}`);
    });
  });

  ioInstance = io;
  return io;
}

function getIO() {
  return ioInstance;
}

function emitNewMessage(ticketId, message, recipientIds) {
  if (!ioInstance) return;
  ioInstance.to(`ticket:${ticketId}`).emit("message:new", { ticketId, message });
  recipientIds.forEach((userId) => {
    ioInstance.to(`user:${userId}`).emit("notification:update", { ticketId });
  });
}

module.exports = { initSocket, getIO, emitNewMessage };
