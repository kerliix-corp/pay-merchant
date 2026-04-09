import { Server } from "socket.io";
import logger from "./logger.js";

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join_room", (room) => {
      socket.join(room);
    });

    socket.on("leave_room", (room) => {
      socket.leave(room);
    });

    socket.on("send_message", ({ room, message }) => {
      io.to(room).emit("receive_message", message);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export default initSocket;

