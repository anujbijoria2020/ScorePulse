import { WebSocket, WebSocketServer } from "ws"
import { wsArcjet } from "../config/arcjet.js";

function sendJSON(socket,payload){
    if(socket.readyState!==WebSocket.OPEN){
        console.log("WebSocket is not open. Ready state: ",socket.readyState);
        return;
    }

    socket.send(JSON.stringify(payload))
}

function broadcast(wss,payload){

    for(const client of wss.clients){
if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(payload));
}
    }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  wss.on("connection", async (socket, req) => {
    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(req);

        if (decision.isDenied()) {
          const code = decision.reason.isRateLimit() ? 1013 : 1008;
          const reason = decision.reason.isRateLimit()
            ? "Too many requests."
            : "Connection denied.";

          socket.close(code, reason);
          return;
        }
      } catch (e) {
        console.error("Arcjet WebSocket error:", e);
        socket.close(1011, "Internal Server Error");
        return;
      }
    }

    socket.isAlive = true;

    socket.on("pong", () => {
      socket.isAlive = true;
    });

    console.log("New WebSocket connection established");

    sendJSON(socket, {
      type: "welcome",
      message: "Welcome to the Sports Match API WebSocket!",
    });

    socket.on("error", (error) => {
      console.log("WebSocket error:", error);
    });
  });

  const interval = setInterval(() => {
     for(const socket of wss.clients){
        if(socket.isAlive===false){
            console.log("Terminating unresponsive WebSocket connection");
            socket.terminate();
            continue;
        }
             socket.isAlive = false;
      socket.ping();
     }
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  function broadcastMatchCreated(match) {
    broadcast(wss, { type: "matchCreated", data: match });
  }

  return {
    broadCastMatchCreated: broadcastMatchCreated,
  };
}