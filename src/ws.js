import { WebSocket, WebSocketServer } from "ws"

/**
 * Send a JSON-serializable payload over the provided WebSocket if it is open.
 *
 * If the socket is not open, logs the socket ready state and returns without sending.
 * @param {WebSocket} socket - The WebSocket to send the payload to.
 * @param {*} payload - The value to serialize to JSON and send to the client.
 */
function sendJSON(socket,payload){
    if(socket.readyState!==WebSocket.OPEN){
        console.log("WebSocket is not open. Ready state: ",socket.readyState);
        return;
    }

    socket.send(JSON.stringify(payload))
}

/**
 * Broadcasts a JSON-serialized payload to every connected WebSocket client on the given server.
 *
 * Sends JSON.stringify(payload) to each client whose readyState equals WebSocket.OPEN. If a client is found whose readyState is not OPEN, the function logs that readyState and stops broadcasting.
 * @param {WebSocketServer} wss - The WebSocket server whose clients will receive the payload.
 * @param {*} payload - The value to serialize and send to clients.
 */
function broadcast(wss,payload){

    for(const client of wss.clients){
    if(client.readyState!==WebSocket.OPEN){
        console.log("WebSocket is not open. Ready state: ",client.readyState);
        return;
    }
client.send(JSON.stringify(payload));
    }
}

/**
 * Attach a WebSocket server to an existing HTTP server and expose a broadcaster for match-created events.
 *
 * The WebSocket server is mounted at "/ws" and accepts messages up to 1MB. Connected clients will receive
 * a welcome message upon connection. The returned API contains a function that broadcasts a `matchCreated`
 * event (with the match object as `data`) to all connected clients.
 *
 * @param {import('http').Server} server - HTTP server instance to attach the WebSocket server to.
 * @returns {{ broadCastMatchCreated: function(match: object): void }} An object with `broadCastMatchCreated`, a function that broadcasts a `matchCreated` event containing the provided match object to all connected WebSocket clients.
 */
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