import { WebSocket, WebSocketServer } from "ws"
import { wsArcjet } from "../config/arcjet.js";


const matchSubscribers = new Map();

function subscribe(matchId,socket){
    if(!matchSubscribers.has(matchId)){
        matchSubscribers.set(matchId,new Set());
    }
    matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId,socket){
    const subscribers = matchSubscribers.get(matchId);
    if(!subscribers){
        return;
    }
    subscribers.delete(socket);
    if(subscribers.size===0){
         matchSubscribers.delete(matchId);
    }
}

function cleanUpSubscriptions(socket){
    for(const matchId of socket.subscriptions){
        unsubscribe(matchId,socket);
    }
}

function sendJSON(socket,payload){
    if(socket.readyState!==WebSocket.OPEN){
        console.log("WebSocket is not open. Ready state: ",socket.readyState);
        return;
    }

    socket.send(JSON.stringify(payload))
}

function broadcast(wss,payload){
    const message = JSON.stringify(payload);
    for(const client of wss.clients){
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}

function broadcastToMatch(matchId,payload){
    const subscribers = matchSubscribers.get(matchId);

    if(!subscribers|| !subscribers.size){
        return;
    }

    const message = JSON.stringify(payload);

    for(const subscriber of subscribers){
        if(subscriber.readyState===WebSocket.OPEN){
            subscriber.send(message);
        }
    }
}

function handleMessage(socket,payload){
    let message;

    try{
        message = JSON.parse(payload.toString());
    }catch(e){
        sendJSON(socket,{type:"error",message:"Invalid JSON"});
        return;
    }

    if(message?.type==="subscribe" && Number.isInteger(message.matchId)){
        subscribe(message.matchId,socket);
        socket.subscriptions.add(message.matchId);
        sendJSON(socket,{type:"subscribed",matchId:message.matchId});
        return;
    }

    if(message?.type==="unsubscribe" && Number.isInteger(message.matchId)){
        unsubscribe(message.matchId,socket);
        socket.subscriptions.delete(message.matchId);
        sendJSON(socket,{type:"unsubscribed",matchId:message.matchId});
        return;
    }

    sendJSON(socket,{type:"error",message:"Unsupported message type"});
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
    socket.subscriptions = new Set();

    socket.on("pong", () => {
      socket.isAlive = true;
    });

    console.log("New WebSocket connection established");
    sendJSON(socket, {
      type: "welcome",
      message: "Welcome to the Sports Match API WebSocket!",
    });

    socket.on("message", (data) => {
        handleMessage(socket,data);
    })

     socket.on("error",(err)=>{
         console.error(err);
         socket.terminate();
     })

    socket.on("close", () => {
      cleanUpSubscriptions(socket);
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
    console.log("Broadcasting matchCreated", {
      matchId: match?.id,
      clientCount: wss.clients.size,
    });
    broadcast(wss, { type: "matchCreated", data: match });
  }

  function broadcastCommentary(matchId,commentary){
      broadcastToMatch(matchId,{type: "commentary",data: commentary});
  }

  return {
    broadcastMatchCreated,
    broadcastCommentary,
  };
}
