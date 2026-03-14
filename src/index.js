import AgentAPI from "apminsight";
AgentAPI.config();

import express from "express";
import cors from "cors";
import http from "http";
import { matchRouter } from "./routes/matches.js";
import { commentaryRouter } from "./routes/commentary.js";
import { attachWebSocketServer } from "./ws/server.js";
import { securityMiddleware } from "./config/arcjet.js";

const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || "0.0.0.0";

const app = express();
const server = http.createServer(app);

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Core middleware ──────────────────────────────────────────────────────────
app.use(securityMiddleware());
app.use(express.json());
app.use((req, _res, next) => {
  console.log("Incoming:", req.method, req.url);
  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Spotrz API is running" });
});

app.use("/api/matches", matchRouter);
app.use("/api/matches/:id/commentary", commentaryRouter);

// ── WebSocket ────────────────────────────────────────────────────────────────
const { broadcastMatchCreated, broadcastCommentary } = attachWebSocketServer(server);

app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  const status = err.status ?? 500;
  const message = err.message ?? "Internal Server Error";
  if (status >= 500) console.error("Unhandled error:", err);
  res.status(status).json({ error: message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`Server started at ${baseUrl}`);
  console.log(`WebSocket endpoint: ${baseUrl.replace("http", "ws")}/ws`);
});