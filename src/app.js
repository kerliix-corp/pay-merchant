import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import routes from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(projectRoot, "views"));

app.use(express.json({
  verify: (req, res, buffer) => {
    req.rawBody = buffer.toString("utf8");
  }
}));

app.use((req, res, next) => {
  const startedAt = Date.now();
  console.log(`[merchant] ${req.method} ${req.originalUrl} started`);

  res.on("finish", () => {
    console.log(
      `[merchant] ${req.method} ${req.originalUrl} completed ${res.statusCode} in ${Date.now() - startedAt}ms`
    );
  });

  next();
});

app.use(express.static(path.join(projectRoot, "public")));

app.use(routes);

app.use((req, res) => {
  res.status(404).send("Page not found");
});

app.use((err, req, res, next) => {
  console.error("[merchant] unhandled_error", err);
  res.status(500).send("Internal Server Error");
});

export default app;