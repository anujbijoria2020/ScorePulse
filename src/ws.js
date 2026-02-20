import { WebSocket, WebSocketServer } from "ws"

function sendJSON(socket,payload){
    if(socket.readyState!==WebSocket.OPEN){
        console.log("WebSocket is not open. Ready state: ",socket.readyState);
        return;
    }

    socket.send(JSON.stringify(payload))
}

function broadcast(wss,payload){

    for(const client of wss.clients){
    if(client.readyState!==WebSocket.OPEN){
        console.log("WebSocket is not open. Ready state: ",client.readyState);
        return;
    }
client.send(JSON.stringify(payload));
    }
}

export function attachWebSocketServer(server){
    const wss = new WebSocketServer({
        server,
        path:"/ws",
        maxPayload:1024*1024,
    });

    wss.on("connection",(socket)=>{
        console.log("New WebSocket connection established");
        sendJSON(socket,{type:"welcome",message:"Welcome to the Sports Match API WebSocket!"});

        socket.on("error",(error)=>{
            console.log("WebSocket error: ",error);
        });
    });

    function broadcastMatchCreated(match){
        broadcast(wss,{type:"matchCreated",data:match});
    }

    return {
        broadCastMatchCreated:broadcastMatchCreated
    }
}