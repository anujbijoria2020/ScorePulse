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
    noServer: true,
    maxPayload: 1024 * 1024,
  });

  server.on("upgrade", async (req, socket, head) => {
    const { pathname } = new URL(req.url, "http://localhost");
    if (pathname !== "/ws") {
      socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(req);
        if (decision.isDenied()) {
          const statusLine = decision.reason.isRateLimit()
            ? "HTTP/1.1 429 Too Many Requests"
            : "HTTP/1.1 403 Forbidden";
          socket.write(`${statusLine}\r\nConnection: close\r\n\r\n`);
          socket.destroy();
          return;
        }
      } catch (e) {
        console.error("Arcjet WebSocket error:", e);
        socket.write(
          "HTTP/1.1 500 Internal Server Error\r\nConnection: close\r\n\r\n",
        );
        socket.destroy();
        return;
      }
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (socket) => {
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
