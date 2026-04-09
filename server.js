import "dotenv/config";
import http from "http";

import app from "./src/app.js";
import connectDB from "./config/db.js";
import logger from "./config/logger.js";
import initSocket from "./config/socket.js";

const port = Number(process.env.PORT || 3000);

const server = http.createServer(app);

initSocket(server);

const startServer = async () => {
  try {
    await connectDB();

    server.listen(port, () => {
      logger.info(`Merchant app running at http://localhost:${port}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Rejection:", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});


