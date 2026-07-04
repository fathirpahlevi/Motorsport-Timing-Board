import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer, WebSocket as WSClient } from "ws";
import { HubConnectionBuilder, HubConnection } from "@microsoft/signalr";
import { createServer as createViteServer } from "vite";

interface SessionSubscription {
  connection: HubConnection;
  subscribers: Set<WSClient>;
}

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
    const { eventId, sessionId } = req.query;
    if (!eventId || !sessionId) {
      return res.status(400).json({ error: "Missing eventId or sessionId parameters." });
    }

    const apiUrl = `https://lt-api.speedhive.com/api/events/${eventId}/sessions/${sessionId}/data`;
    console.log(`[Proxy] Fetching initial data from: ${apiUrl}`);

    try {
      const response = await fetch(apiUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      if (!response.ok) {
        throw new Error(`Speedhive API returned status ${response.status}`);
      }
      const data = await response.json();
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

  // Helper to broadcast to all clients watching a session
  function broadcastToSession(sessionId: string, payload: any) {
    const sessionSub = activeSignalRConnections.get(sessionId);
    if (!sessionSub) return;

    const rawData = JSON.stringify(payload);
    for (const ws of sessionSub.subscribers) {
      if (ws.readyState === WSClient.OPEN) {
        ws.send(rawData);
      }
    }
  }

  // Helper to handle client subscriber exit
  function removeClientFromAllSessions(ws: WSClient) {
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

  // WebSocket connection listener
  wss.on("connection", (ws) => {
    console.log("[WS Server] Frontend connected.");

    ws.on("message", async (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        console.log(`[WS Server] Received client command:`, message);

        if (message.type === "subscribe" && message.sessionId) {
          const sessionId = message.sessionId;

          // Check if SignalR connection already exists
          let sessionSub = activeSignalRConnections.get(sessionId);
          if (!sessionSub) {
            console.log(`[SignalR Proxy] Initiating backend SignalR connection for session: ${sessionId}`);

            const connection = new HubConnectionBuilder()
              .withUrl("https://notifications.speedhive.com/api", {
                // Pass the standard WebSocket constructor from 'ws' package to run SignalR in Node
                webSocket: WSClient as any,
              } as any)
              .withAutomaticReconnect()
              .build();

            sessionSub = {
              connection,
              subscribers: new Set<WSClient>(),
            };
            activeSignalRConnections.set(sessionId, sessionSub);

            // Connect event handlers
            connection.on("resultsForSessionReceived", (data) => {
              broadcastToSession(sessionId, { type: "resultsForSessionReceived", data });
            });

            connection.on("sessionAddedOrUpdated", (data) => {
              broadcastToSession(sessionId, { type: "sessionAddedOrUpdated", data });
            });

            connection.on("announcementsUpdated", (data) => {
              broadcastToSession(sessionId, { type: "announcementsUpdated", data });
            });

            connection.on("statsUpdated", (data) => {
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
        }
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
