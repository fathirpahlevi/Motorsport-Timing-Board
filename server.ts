import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer, WebSocket as WSClient } from "ws";
import { HubConnectionBuilder, HubConnection } from "@microsoft/signalr";
import { createServer as createViteServer } from "vite";
import { error } from "console";

interface SessionSubscription {
  connection: HubConnection;
  subscribers: Set<WSClient>;
}
let savedID = {eventId: "", sessionId: ""};
let raceState = {
  eventId: "",
  sessionId: "",
  results: null as any,
  sessionInfo: null as any,
  announcement: "",
  stats: null as any,
  controlAction: {},
  isTimerRunning: false,
  raceSeconds: 0,
  isManualMode: false,
  manualRiders: [] as any[],
  manualSessionInfo: null as any,
};
const allClients = new Set<WSClient>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use HTTP server to bind both Express and WebSockets
  const server = http.createServer(app);

  // Set up WebSocket server on top of HTTP
  const wss = new WebSocketServer({ server });

  // Keep track of active SignalR connections to avoid duplicate feeds
  const activeSignalRConnections = new Map<string, SessionSubscription>();

  app.use(express.json());

  // Proxy route for Speedhive initial data to avoid CORS issues
  app.get("/api/speedhive-proxy", async (req, res) => {
    let { eventId, sessionId } = req.query;
    console.log("[Proxy] savedId", savedID);
    
    if (!eventId && !sessionId) {
      if (raceState.results) {
        console.log("[Proxy] Returning cached results to client.");
        return res.json(raceState.results);
      }
      eventId = savedID.eventId;
      sessionId = savedID.sessionId;
    }

    if(sessionId && sessionId !== savedID.sessionId) {
      savedID.sessionId = sessionId as string;
      raceState.sessionId = sessionId as string;
      broadcastToAll({ type: "newConnection", sessionId: sessionId });
      console.log("[Proxy] Updated savedId to new session", savedID);
    }
    if(eventId && eventId !== savedID.eventId) {
      savedID.eventId = eventId as string;
      raceState.eventId = eventId as string;
    }

    if (!savedID.eventId || !savedID.sessionId) {
      return res.status(400).json({ error: `Missing eventId or sessionId parameters.` });
    }

    const apiUrl = `https://lt-api.speedhive.com/api/events/${savedID.eventId}/sessions/${savedID.sessionId}/data`;
    console.log(`[Proxy] Fetching initial data from: ${apiUrl}`);
    try {
      const response = await fetch(apiUrl, {
        headers: {
          "accept": "application/json",
          "origin": "https://speedhive.mylaps.com",
          "referer": "https://speedhive.mylaps.com/"
        }
      });
      
      if (!response.ok) {
        throw new Error(`Speedhive API returned status ${response.status}`);
      }
      const data = await response.json();
      console.log(`[Proxy] Initial Data Fetched`);
      
      // Update our server-side cache
      raceState.results = data;
      if (data.eNam || data.rnNam || data.gNam || data.btLpTim || data.ls || data.lsTg || typeof data.f === "number") {
        raceState.sessionInfo = {
          eNam: data.eNam,
          rnNam: data.rnNam,
          gNam: data.gNam,
          btLpTim: data.btLpTim,
          ls: data.ls,
          lsTg: data.lsTg,
          f: data.f
        };
      }
      
      res.json(data);
    } catch (error: any) {
      console.error("[Proxy Error]", error);
      res.status(500).json({ error: error.message || "Failed to fetch from Speedhive API" });
    }
  });

  // Helper to send messages to frontends
  function sendToClient(ws: WSClient, payload: any) {
    if (ws.readyState === WSClient.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  // Helper to broadcast to all clients globally
  function broadcastToAll(payload: any) {
    const rawData = JSON.stringify(payload);
    for (const ws of allClients) {
      if (ws.readyState === WSClient.OPEN) {
        ws.send(rawData);
      }
    }
  }

  // Helper to broadcast to all clients watching a session
  function broadcastToSession(sessionId: string, payload: any) {
    const sessionSub = activeSignalRConnections.get(sessionId);
    if (!sessionSub) return;

    const rawData = JSON.stringify(payload);
    for (const ws of sessionSub.subscribers) {
      if (ws.readyState === WSClient.OPEN) {
        console.log('Broadcasting to:', sessionId);
        ws.send(rawData);
      }
    }
  }

  // Helper to handle client subscriber exit
  function removeClientFromAllSessions(ws: WSClient) {
    allClients.delete(ws);
    for (const [sessionId, sessionSub] of activeSignalRConnections.entries()) {
      if (sessionSub.subscribers.has(ws)) {
        sessionSub.subscribers.delete(ws);
        console.log(`[WS Server] Client unsubscribed from session: ${sessionId}. Active subscribers left: ${sessionSub.subscribers.size}`);

        if (sessionSub.subscribers.size === 0) {
          console.log(`[SignalR Proxy] No subscribers left for session: ${sessionId}. Stopping SignalR connection...`);
          sessionSub.connection.stop().catch(err => {
            console.error(`Error stopping SignalR connection for ${sessionId}:`, err);
          });
          activeSignalRConnections.delete(sessionId);
        }
      }
    }
  }

  // Run a low-frequency stopwatch drift corrector on the server
  setInterval(() => {
    if (raceState.isTimerRunning) {
      raceState.raceSeconds += 5;
      broadcastToAll({
        type: "stopwatchState",
        isTimerRunning: raceState.isTimerRunning,
        raceSeconds: raceState.raceSeconds
      });
    }
  }, 5000);

  // WebSocket connection listener
  wss.on("connection", (ws) => {
    console.log("[WS Server] Frontend connected.");
    allClients.add(ws);

    // Send the current full state immediately to the newly connected client
    // sendToClient(ws, {
    //   type: "syncState",
    //   eventId: raceState.eventId || savedID.eventId,
    //   sessionId: raceState.sessionId || savedID.sessionId,
    //   results: raceState.results,
    //   sessionInfo: raceState.sessionInfo,
    //   announcement: raceState.announcement,
    //   stats: raceState.stats,
    //   controlAction: raceState.controlAction,
    //   isTimerRunning: raceState.isTimerRunning,
    //   raceSeconds: raceState.raceSeconds
    // });

    // If there is already an active session, notify them to switch/subscribe
    if (savedID.sessionId) {
      sendToClient(ws, {
        type: "newConnection",
        sessionId: savedID.sessionId
      });
    }

    ws.on("message", async (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        const sessionId = message.sessionId;
        console.log(`[WS Server] Received client command:`, message);

        if (message.type === "newConnection" && message.newSessionId) {
          console.log(`[WS Server] New Session ID. Broadcasting to all clients: ${message.newSessionId}`);
          savedID.sessionId = message.newSessionId;
          raceState.sessionId = message.newSessionId;
          broadcastToAll({ type: "newConnection", sessionId: message.newSessionId });
        }
        else if (message.type === "subscribe") {
          sendToClient(ws, { type: "status", status: "waiting" });
          
          if (message.sessionId) {
            // Check if SignalR connection already exists
            let sessionSub = activeSignalRConnections.get(sessionId);
            if (!sessionSub) {
              console.log(`[SignalR Proxy] Initiating backend SignalR connection for session: ${sessionId}`);
              sendToClient(ws, { type: "status", status: "connecting", sessionId });

              const connection = new HubConnectionBuilder()
                .withUrl("https://notifications.speedhive.com/api", {
                  webSocket: WSClient as any,
                } as any)
                .withAutomaticReconnect()
                .build();

              sessionSub = {
                connection,
                subscribers: new Set<WSClient>(),
              };
              activeSignalRConnections.set(sessionId, sessionSub);

              // Connect event handlers and update server cache
              connection.on("resultsForSessionReceived", (data) => {
                raceState.results = data;
                broadcastToSession(sessionId, { type: "resultsForSessionReceived", data });
              });

              connection.on("sessionAddedOrUpdated", (data) => {
                raceState.sessionInfo = { ...raceState.sessionInfo, ...data };
                broadcastToSession(sessionId, { type: "sessionAddedOrUpdated", data });
              });

              connection.on("announcementsUpdated", (data) => {
                if (data && data.tx) {
                  raceState.announcement = data.tx;
                }
                broadcastToSession(sessionId, { type: "announcementsUpdated", data });
              });

              connection.on("statsUpdated", (data) => {
                raceState.stats = data;
                broadcastToSession(sessionId, { type: "statsUpdated", data });
              });

              try {
                await connection.start();
                console.log(`[SignalR Proxy] Connected to Speedhive for session: ${sessionId}`);
                await connection.invoke("JoinGroup", `session-${sessionId}`);
                console.log(`[SignalR Proxy] Joined Group session-${sessionId}`);

                sendToClient(ws, { type: "status", status: "connected", sessionId });
              } catch (err: any) {
                console.error(`[SignalR Proxy Error] Start failed for session ${sessionId}:`, err);
                sendToClient(ws, { type: "status", status: "error", message: err.message, sessionId });
                activeSignalRConnections.delete(sessionId);
                return;
              }
            } else {
              console.log(`[SignalR Proxy] Client joined existing session subscription: ${sessionId}`);
              sendToClient(ws, { type: "status", status: "connected", sessionId });
            }

            // Register subscriber ws
            sessionSub.subscribers.add(ws);

            // Send cached timing data immediately to this newly subscribed client
            if (raceState.results) {
              sendToClient(ws, { type: "resultsForSessionReceived", data: raceState.results });
            }
            if (raceState.sessionInfo) {
              sendToClient(ws, { type: "sessionAddedOrUpdated", data: raceState.sessionInfo });
            }
            if (raceState.announcement) {
              sendToClient(ws, { type: "announcementsUpdated", data: { tx: raceState.announcement } });
            }
            if (raceState.stats) {
              sendToClient(ws, { type: "statsUpdated", data: raceState.stats });
            }
          }
        }
        else if (message.type === 'control') {
          raceState.controlAction = {
            ...raceState.controlAction, // 1. Spread out all existing keys (e.g., { laps: true })
            ...message.action           // 2. Spread the new keys, overwriting existing matching ones (e.g., { time: true })
          };
          console.log(`[WS Server] broadcast:`, raceState.controlAction );
          broadcastToAll({ type: "control", action:raceState.controlAction });
        }
        else if(message.type === 'macroPad'){
          broadcastToAll({type:"macroPad", trigger:message.params});
          sendToClient(ws, { type: "macroPad", trigger:message.params});
        }
        else if(message.type === 'setRaceLaps'){
          broadcastToAll({type:"setRaceLaps", laps:message.laps});
          sendToClient(ws, { type: "setRaceLaps", laps:message.laps });
        }
        else if(message.type === 'startingGrid'){
          if(message.next){
            broadcastToAll({type:"startingGrid", next:message.next});
            sendToClient(ws, { type: "startingGrid", next:message.next });
          }
        }
        else if(message.type === 'inputDevice'){
          broadcastToAll({type:"inputDevice", inputDevice:message});
          sendToClient(ws, { type: "inputDevice", inputDevice:message });
        }
        else if(message.type === 'inputDevices'){
          broadcastToAll({type:"inputDevices", inputDevices:message});
          sendToClient(ws, { type: "inputDevices", inputDevices:message });
        }
        else if(message.type === 'askInputDevices'){
          broadcastToAll({type:"askInputDevices"});
          sendToClient(ws, { type: "askInputDevices"});
        }
        else if(message.type === 'askFinishedPages'){
          broadcastToAll({type:"askFinishedPages"});
          sendToClient(ws, { type: "askFinishedPages"});
        }
        else if(message.type === 'finishedPages'){
          broadcastToAll({type: "finishedPages",pages:message.pages});
          sendToClient(ws, {type: "finishedPages", pages: message.pages});
        }
        else if(message.type === 'finishedRacerPage'){
          broadcastToAll({type: "finishedRacerPage",page:message.page});
          sendToClient(ws, {type: "finishedRacerPage", page: message.page});
        }
        else if(message.type === 'videoURL'){
          broadcastToAll({type:"video",url:message.url});
          sendToClient(ws, { type: "video", url:message });
        }
        else if (message.type === 'syncState'){
          sendToClient(ws, { type: "syncState", raceState });
          if (raceState.isManualMode) {
            sendToClient(ws, {
              type: "manualDataSync",
              isManualMode: raceState.isManualMode,
              riders: raceState.manualRiders,
              sessionInfo: raceState.manualSessionInfo
            });
          }
        }
        else if (message.type === 'manualDataSync') {
          raceState.isManualMode = !!message.isManualMode;
          if (message.riders) raceState.manualRiders = message.riders;
          if (message.sessionInfo) raceState.manualSessionInfo = message.sessionInfo;
          console.log(`[WS Server] Manual Mode Sync: enabled=${raceState.isManualMode}, riders=${raceState.manualRiders.length}`);
          broadcastToAll({
            type: "manualDataSync",
            isManualMode: raceState.isManualMode,
            riders: raceState.manualRiders,
            sessionInfo: raceState.manualSessionInfo
          });
        }
        else if (message.type === 'videoStatus'){
          broadcastToAll({type:"videoStatus", status:message.status});
          sendToClient(ws, { type: "videoStatus", status:message.status});
        }
        else if (message.type === 'errorMessage'){
          broadcastToAll({type:"errorMessage", error:message.error});
          sendToClient(ws, { type: "errorMessage", error:message.error});
        }
        else if (message.type === 'speedhiveURL'){
          broadcastToAll({type:"speedhiveURL", url:message.url});
          sendToClient(ws, { type: "speedhiveURL", url:message.url});
        }
        else if (message.type === 'stopwatch') {
          console.log(`[WS Server] Stopwatch sync: running=${message.action === 'start'}, seconds=${message.raceSeconds}`);
          raceState.isTimerRunning = message.action === 'start';
          if (message.action === 'reset') {
            raceState.raceSeconds = 0;
          } else if (typeof message.raceSeconds === 'number') {
            raceState.raceSeconds = message.raceSeconds;
          }
          broadcastToAll({
            type: "stopwatchState",
            isTimerRunning: raceState.isTimerRunning,
            raceSeconds: raceState.raceSeconds
          });
        }
        //Mainwebsocket
      } catch (err) {
        console.error("[WS Server] Error handling incoming client message:", err);
      }
    });

    ws.on("close", () => {
      console.log("[WS Server] Client disconnected.");
      removeClientFromAllSessions(ws);
    });

    ws.on("error", (err) => {
      console.error("[WS Server] Client connection error:", err);
      removeClientFromAllSessions(ws);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
