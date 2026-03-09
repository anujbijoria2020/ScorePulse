import express from "express";
import {matchRouter} from "./routes/matches.js";
import http from "http";
import { attachWebSocketServer } from "./ws/server.js";
import { securityMiddleware } from "./config/arcjet.js";
import {commentaryRouter} from "./routes/commentary.js";

const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || "0.0.0.0";

const app = express();
const server = http.createServer(app);

app.get("/",(req,res)=>{
  res.send("hello from express server");
})

app.use(securityMiddleware());
app.use(express.json());
app.use((req, res, next) => {
  console.log("Incoming:", req.method, req.url);
  next();
});

console.log("matchRouter value:", matchRouter);

app.use("/api/matches",matchRouter);
app.use("/api/matches/:id/commentary",commentaryRouter);

const {
  broadCastMatchCreated,
  broadCastCommentary,
  broadcastMatchCreated,
  broadcastCommentary,
} = attachWebSocketServer(server);

// Keep both legacy and corrected names to avoid route-level mismatches.
app.locals.broadCastMatchCreated = broadCastMatchCreated ?? broadcastMatchCreated;
app.locals.broadcastMatchCreated = broadcastMatchCreated ?? broadCastMatchCreated;
app.locals.broadCastCommentary = broadCastCommentary ?? broadcastCommentary;
app.locals.broadcastCommentary = broadcastCommentary ?? broadCastCommentary;

server.listen(PORT, HOST, () => {
  const baseUrl = HOST==='0.0.0.0'?`http://localhost:${PORT}`:`http://${HOST}:${PORT}`;

  console.log(`Server started at ${baseUrl}`);
  console.log(`Websocket endpoint available at ${baseUrl.replace('http','ws')}/ws`);
});

