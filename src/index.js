import express from "express";
import {matchRouter} from "./routes/matches.js";
import http from "http";
import { attachWebSocketServer } from "./ws.js";

const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || "0.0.0.0";

const app = express();
const server = http.createServer(app);


app.use(express.json());
app.use((req, res, next) => {
  console.log("Incoming:", req.method, req.url);
  next();
});


app.get("/", (req, res) => {
  res.json({ message: "SportBroadcast server is running." });
});

console.log("matchRouter value:", matchRouter);
app.use("/api/matches",matchRouter);

const {broadCastMatchCreated} = attachWebSocketServer(server);
app.locals.broadCastMatchCreated = broadCastMatchCreated;

server.listen(PORT, HOST, () => {
  const baseUrl = HOST==='0.0.0.0'?`http://localhost:${PORT}`:`http://${HOST}:${PORT}`;

  console.log(`Server started at ${baseUrl}`);
  console.log(`Websocket endpoint available at ${baseUrl.replace('http','ws')}/ws`);
});

