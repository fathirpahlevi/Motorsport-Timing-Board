import "dotenv/config";
import express from "express";
import basicAuth from 'express-basic-auth';
import path from "path";
import fs from "fs";
import http from "http";
import { WebSocketServer, WebSocket as WSClient } from "ws";
import { HubConnectionBuilder, HubConnection } from "@microsoft/signalr";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { INITIAL_WEATHER_STATE } from "./src/weatherData";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

interface SessionSubscription {
  connection: HubConnection;
  subscribers: Set<WSClient>;
}
let savedID = {eventId: "", sessionId: ""};
let raceState = {
  eventId: "",
  sessionId: "",
  speedhiveUrl: "",
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
  manualOverrides: {} as Record<string, any>,
  lowerThird: {
    visible: false,
    position: 'left' as 'left' | 'center' | 'right',
    selectedRiderIds: [] as string[],
  },
  weather: INITIAL_WEATHER_STATE,
};
const allClients = new Set<WSClient>();

function parseSpeedhiveUrl(urlStr: string) {
  try {
    const clean = (urlStr || '').trim();
    if (!clean) return { eventId: null, sessionId: null };
    if (clean.startsWith('http')) {
      const match = clean.match(/\/livetiming\/([A-Za-z0-9\-]+)\/sessions\/([A-Za-z0-9\-]+)/);
      if (match) {
        return { eventId: match[1], sessionId: match[2] };
      }
    }
    const cleanId = clean.replace(/[^A-Za-z0-9\-]/g, '');
    const parts = cleanId.split('-');
    if (parts.length >= 2) {
      return {
        eventId: `${parts[0]}-${parts[1]}`,
        sessionId: cleanId,
      };
    }
    return { eventId: null, sessionId: cleanId || null };
  } catch (err) {
    return { eventId: null, sessionId: null };
  }
}

const STATE_CACHE_FILE = path.join(process.cwd(), '.race-state-cache.json');

function saveRaceStateCache() {
  try {
    const toSave = {
      savedID,
      speedhiveUrl: raceState.speedhiveUrl,
      isManualMode: raceState.isManualMode,
      manualRiders: raceState.manualRiders,
      manualSessionInfo: raceState.manualSessionInfo,
      manualOverrides: raceState.manualOverrides,
      lowerThird: raceState.lowerThird,
      weather: raceState.weather,
      sessionInfo: raceState.sessionInfo,
      controlAction: raceState.controlAction,
    };
    fs.writeFileSync(STATE_CACHE_FILE, JSON.stringify(toSave, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Cache] Failed to save state to cache file:', e);
  }
}

function loadRaceStateCache() {
  try {
    if (fs.existsSync(STATE_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_CACHE_FILE, 'utf-8'));
      if (data.savedID) savedID = data.savedID;
      if (data.speedhiveUrl) raceState.speedhiveUrl = data.speedhiveUrl;
      if (typeof data.isManualMode === 'boolean') raceState.isManualMode = data.isManualMode;
      if (Array.isArray(data.manualRiders) && data.manualRiders.length > 0) raceState.manualRiders = data.manualRiders;
      if (data.manualSessionInfo) raceState.manualSessionInfo = data.manualSessionInfo;
      if (data.manualOverrides) raceState.manualOverrides = data.manualOverrides;
      if (data.lowerThird) raceState.lowerThird = data.lowerThird;
      if (data.weather) raceState.weather = data.weather;
      if (data.sessionInfo) raceState.sessionInfo = data.sessionInfo;
      if (data.controlAction) raceState.controlAction = data.controlAction;
      console.log(`[Cache] Loaded race state from cache. ManualMode=${raceState.isManualMode}, ManualRiders=${raceState.manualRiders.length}`);
    }
  } catch (e) {
    console.error('[Cache] Failed to load state cache:', e);
  }
}

async function startServer() {
  loadRaceStateCache();
  const app = express();
  const PORT = 3000;

  // Use HTTP server to bind both Express and WebSockets
  const server = http.createServer(app);

  // Set up WebSocket server on top of HTTP
  const wss = new WebSocketServer({ server });

  // Keep track of active SignalR connections to avoid duplicate feeds
  const activeSignalRConnections = new Map<string, SessionSubscription>();

  // Allow larger payload for screenshot images
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Multimodal Gemini endpoint to convert screenshots of starting grid
  app.post("/api/extract-starting-grid", async (req, res) => {
    try {
      const { images, promptHint } = req.body;
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ success: false, error: "No images provided. Please upload at least one image." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          success: false,
          error: "Gemini API key is not configured on the server. Please check the Secrets settings."
        });
      }

      // Convert image payloads to Gemini parts
      const imageParts = images.map((img: { mimeType?: string; data: string }, index: number) => {
        let base64Data = img.data;
        let mimeType = img.mimeType || "image/png";

        if (base64Data.includes(";base64,")) {
          const parts = base64Data.split(";base64,");
          const matchMime = parts[0].match(/data:(.*?);/);
          if (matchMime) mimeType = matchMime[1];
          base64Data = parts[1];
        }

        return {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        };
      });

      const promptText = `You are an expert motorsport timing official and starting grid data extraction specialist.
Analyze the provided starting grid screenshot(s) / document image(s) (${images.length} image(s) provided).
Extract all racers/riders along with any race/event title metadata visible.

Extract:
1. Event title / Championship name (if visible)
2. Class / Group name (e.g. Novice, Expert, Moto3, TMAX, Bebek, etc., if visible)
3. Session title (e.g. Starting Grid, Race 1, etc., if visible)
4. Starting Grid Racers in order of their starting grid position:
   - pos: Starting grid position number (integer 1, 2, 3...)
   - no: Bike/racer number (string e.g. "46", "99", "12")
   - nam: Racer full name
   - cb: Team name or club or sponsor (if present, otherwise empty string)
   - btTm: Best qualifying/lap time if present (e.g. "1:42.123", otherwise empty string)
   - tTm: Gap or total time if present (otherwise empty string)

Important guidelines:
- If there are multiple images (pages, columns, or sequential screenshots), merge all racers into a single sequential starting grid (P1, P2, P3, ...).
- Maintain correct starting grid order. If explicit position numbers are missing, assign sequential positions 1, 2, 3... based on visual grid layout.
- Clean up any OCR noise in names, numbers, and times.
${promptHint ? `Additional user hint: ${promptHint}` : ""}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite", //gemma-4-26b-a4b-it gemini-3.8-flash gemini-3.1-flash-lite
        contents: {
          parts: [
            ...imageParts,
            { text: promptText },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              raceTitle: { type: Type.STRING, description: "Event or championship title if visible" },
              groupName: { type: Type.STRING, description: "Race class or group name if visible" },
              sessionName: { type: Type.STRING, description: "Session name if visible" },
              racers: {
                type: Type.ARRAY,
                description: "List of starting grid racers in position order",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    pos: { type: Type.INTEGER, description: "Grid position number (1, 2, 3...)" },
                    no: { type: Type.STRING, description: "Bike / racer number" },
                    nam: { type: Type.STRING, description: "Racer name" },
                    cb: { type: Type.STRING, description: "Team or Club name" },
                    btTm: { type: Type.STRING, description: "Best lap time or qualifying time" },
                    tTm: { type: Type.STRING, description: "Total time or gap" },
                  },
                  required: ["pos", "no", "nam"],
                },
              },
            },
            required: ["racers"],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response returned from Gemini API");
      }

      const parsedData = JSON.parse(responseText);
      res.json({
        success: true,
        data: parsedData,
      });
    } catch (err: any) {
      console.error("[Gemini Extraction Error]", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed to extract starting grid data from images.",
      });
    }
  });

  // REST API for manual riders persistence
  app.post("/api/manual-riders", (req, res) => {
    const newRider = req.body;
    if (newRider) {
      raceState.manualRiders = [...(raceState.manualRiders || []), newRider];
      raceState.isManualMode = true;
      broadcastToAll({
        type: "manualDataSync",
        isManualMode: true,
        riders: raceState.manualRiders,
        sessionInfo: raceState.manualSessionInfo,
      });
    }
    res.json({ success: true, rider: newRider });
  });

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

  // Helper to handle client subscriber exit without abruptly killing global SignalR
  function removeClientFromAllSessions(ws: WSClient) {
    allClients.delete(ws);
    for (const [, sessionSub] of activeSignalRConnections.entries()) {
      sessionSub.subscribers.delete(ws);
    }
  }

  // Helper to shut down all active SignalR connections
  async function shutdownSignalRSessions() {
    console.log(`[SignalR Proxy] Shutting down active SignalR connections (${activeSignalRConnections.size})...`);
    for (const [id, sessionSub] of activeSignalRConnections.entries()) {
      try {
        await sessionSub.connection.stop();
        console.log(`[SignalR Proxy] Stopped SignalR connection for ${id}`);
      } catch (e) {
        console.error(`Error stopping SignalR connection for ${id}:`, e);
      }
    }
    activeSignalRConnections.clear();
    broadcastToAll({
      type: "sessionStatus",
      status: "disconnected",
      action: "shutdown",
      message: "SignalR live connection was shut down by operator."
    });
    broadcastToAll({ type: "status", status: "disconnected" });
  }

  // Helper to connect or reconnect SignalR session and fetch fresh baseline data
  async function startOrReconnectSignalRSession(targetSessionId: string, targetEventId?: string) {
    if (!targetSessionId) return;

    // First stop existing connection
    const existing = activeSignalRConnections.get(targetSessionId);
    if (existing) {
      try {
        await existing.connection.stop();
      } catch (e) {}
      activeSignalRConnections.delete(targetSessionId);
    }

    savedID.sessionId = targetSessionId;
    raceState.sessionId = targetSessionId;
    if (targetEventId) {
      savedID.eventId = targetEventId;
      raceState.eventId = targetEventId;
    }

    // Switch to live mode when SignalR connects
    raceState.isManualMode = false;

    // Fetch fresh baseline data from Speedhive REST API if eventId is available
    if (savedID.eventId && savedID.sessionId) {
      try {
        const apiUrl = `https://lt-api.speedhive.com/api/events/${savedID.eventId}/sessions/${savedID.sessionId}/data`;
        console.log(`[Proxy] Fetching fresh baseline data: ${apiUrl}`);
        const response = await fetch(apiUrl, {
          headers: {
            "accept": "application/json",
            "origin": "https://speedhive.mylaps.com",
            "referer": "https://speedhive.mylaps.com/"
          }
        });
        if (response.ok) {
          const freshData = await response.json();
          raceState.results = freshData;
          if (freshData.eNam || freshData.rnNam || freshData.gNam || freshData.btLpTim || freshData.ls || freshData.lsTg || typeof freshData.f === "number") {
            raceState.sessionInfo = {
              eNam: freshData.eNam,
              rnNam: freshData.rnNam,
              gNam: freshData.gNam,
              btLpTim: freshData.btLpTim,
              ls: freshData.ls,
              lsTg: freshData.lsTg,
              f: freshData.f
            };
          }
          saveRaceStateCache();
          broadcastToAll({ type: "initialData", data: freshData });
          broadcastToAll({ type: "resultsForSessionReceived", data: freshData });
          broadcastToAll({ type: "sessionAddedOrUpdated", data: raceState.sessionInfo });
          broadcastToAll({ type: "manualDataSync", isManualMode: false });
        }
      } catch (err) {
        console.error("[Proxy Error fetching fresh data]", err);
      }
    }

    // Connect to SignalR hub
    try {
      console.log(`[SignalR Proxy] Initiating SignalR connection for session: ${targetSessionId}`);
      broadcastToAll({ type: "status", status: "connecting", sessionId: targetSessionId });

      const connection = new HubConnectionBuilder()
        .withUrl("https://notifications.speedhive.com/api", {
          webSocket: WSClient as any,
        } as any)
        .withAutomaticReconnect()
        .build();

      const sessionSub: SessionSubscription = {
        connection,
        subscribers: new Set<WSClient>(allClients),
      };
      activeSignalRConnections.set(targetSessionId, sessionSub);

      connection.on("resultsForSessionReceived", (data) => {
        raceState.results = data;
        broadcastToAll({ type: "resultsForSessionReceived", data });
      });

      connection.on("sessionAddedOrUpdated", (data) => {
        raceState.sessionInfo = { ...raceState.sessionInfo, ...data };
        broadcastToAll({ type: "sessionAddedOrUpdated", data });
      });

      connection.on("announcementsUpdated", (data) => {
        if (data && data.tx) {
          raceState.announcement = data.tx;
        }
        broadcastToAll({ type: "announcementsUpdated", data });
      });

      connection.on("statsUpdated", (data) => {
        raceState.stats = data;
        broadcastToAll({ type: "statsUpdated", data });
      });

      await connection.start();
      console.log(`[SignalR Proxy] Connected to Speedhive for session: ${targetSessionId}`);
      await connection.invoke("JoinGroup", `session-${targetSessionId}`);
      console.log(`[SignalR Proxy] Joined Group session-${targetSessionId}`);

      broadcastToAll({ type: "status", status: "connected", sessionId: targetSessionId });
      broadcastToAll({
        type: "sessionControl",
        action: "reconnected",
        status: "connected",
        sessionId: targetSessionId,
        message: "SignalR session reconnected successfully."
      });
      saveRaceStateCache();
    } catch (err: any) {
      console.error(`[SignalR Proxy Error] Failed for session ${targetSessionId}:`, err);
      broadcastToAll({ type: "status", status: "error", message: err.message, sessionId: targetSessionId });
      activeSignalRConnections.delete(targetSessionId);
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
    sendToClient(ws, {
      type: "syncState",
      raceState,
      eventId: raceState.eventId || savedID.eventId,
      sessionId: raceState.sessionId || savedID.sessionId,
      results: raceState.results,
      sessionInfo: raceState.sessionInfo,
      announcement: raceState.announcement,
      stats: raceState.stats,
      controlAction: raceState.controlAction,
      isTimerRunning: raceState.isTimerRunning,
      raceSeconds: raceState.raceSeconds,
      manualOverrides: raceState.manualOverrides,
    });

    if (raceState.isManualMode || raceState.manualRiders.length > 0 || (raceState.manualOverrides && Object.keys(raceState.manualOverrides).length > 0)) {
      sendToClient(ws, {
        type: "manualDataSync",
        isManualMode: raceState.isManualMode,
        riders: raceState.manualRiders,
        sessionInfo: raceState.manualSessionInfo,
        manualOverrides: raceState.manualOverrides,
      });
    }

    if (raceState.lowerThird) {
      sendToClient(ws, {
        type: "lowerThirdControl",
        visible: raceState.lowerThird.visible,
        position: raceState.lowerThird.position,
        selectedRiderIds: raceState.lowerThird.selectedRiderIds,
      });
    }

    if (raceState.weather) {
      sendToClient(ws, {
        type: "weatherControl",
        weather: raceState.weather,
      });
    }

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
        
        else if (message.type === 'customBanner') {
          broadcastToAll({ type: "customBanner", text:message.text });
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
          if (raceState.lowerThird) {
            sendToClient(ws, {
              type: "lowerThirdControl",
              visible: raceState.lowerThird.visible,
              position: raceState.lowerThird.position,
              selectedRiderIds: raceState.lowerThird.selectedRiderIds,
            });
          }
          if (raceState.weather) {
            sendToClient(ws, {
              type: "weatherControl",
              weather: raceState.weather,
            });
          }
        }
        else if (message.type === 'lowerThirdControl') {
          raceState.lowerThird = {
            visible: !!message.visible,
            position: message.position || 'left',
            selectedRiderIds: Array.isArray(message.selectedRiderIds) ? message.selectedRiderIds : [],
          };
          saveRaceStateCache();
          console.log(`[WS Server] LowerThird Control: visible=${raceState.lowerThird.visible}, pos=${raceState.lowerThird.position}, count=${raceState.lowerThird.selectedRiderIds.length}`);
          broadcastToAll({
            type: "lowerThirdControl",
            visible: raceState.lowerThird.visible,
            position: raceState.lowerThird.position,
            selectedRiderIds: raceState.lowerThird.selectedRiderIds,
          });
        }
        else if (message.type === 'weatherControl') {
          raceState.weather = {
            ...raceState.weather,
            ...(message.weather || {}),
          };
          saveRaceStateCache();
          console.log(`[WS Server] Weather Control: visible=${raceState.weather.visible}, mode=${raceState.weather.mode}, region=${raceState.weather.regionName}`);
          broadcastToAll({
            type: "weatherControl",
            weather: raceState.weather,
          });
        }
        else if (message.type === 'manualDataSync') {
          raceState.isManualMode = !!message.isManualMode;
          if (message.riders) raceState.manualRiders = message.riders;
          if (message.sessionInfo) raceState.manualSessionInfo = message.sessionInfo;
          if (message.manualOverrides) {
            raceState.manualOverrides = {
              ...(raceState.manualOverrides || {}),
              ...message.manualOverrides
            };
          }
          saveRaceStateCache();
          console.log(`[WS Server] Manual Mode Sync: enabled=${raceState.isManualMode}, riders=${raceState.manualRiders.length}`);
          broadcastToAll({
            type: "manualDataSync",
            isManualMode: raceState.isManualMode,
            riders: raceState.manualRiders,
            sessionInfo: raceState.manualSessionInfo,
            manualOverrides: raceState.manualOverrides
          });
        }
        else if (message.type === 'manualRiderOverride') {
          if (!raceState.manualOverrides) raceState.manualOverrides = {};
          if (message.riderId && message.override) {
            raceState.manualOverrides[message.riderId] = {
              ...(raceState.manualOverrides[message.riderId] || {}),
              ...message.override
            };
            if (Array.isArray(raceState.manualRiders)) {
              raceState.manualRiders = raceState.manualRiders.map((r: any) => {
                if (r.id === message.riderId) {
                  return { ...r, ...message.override };
                }
                return r;
              });
            }
          }
          saveRaceStateCache();
          console.log(`[WS Server] Saved manual rider override: riderId=${message.riderId}`, message.override);
          broadcastToAll({
            type: "manualRiderOverride",
            riderId: message.riderId,
            override: message.override,
            manualOverrides: raceState.manualOverrides
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
          const url = message.url;
          raceState.speedhiveUrl = url;
          broadcastToAll({ type: "speedhiveURL", url: message.url });
          sendToClient(ws, { type: "speedhiveURL", url: message.url });

          if (url) {
            const parsed = parseSpeedhiveUrl(url);
            if (parsed.sessionId) {
              console.log(`[WS Server] Auto-connecting Speedhive session: sessionId=${parsed.sessionId}, eventId=${parsed.eventId}`);
              // Switch to live mode, reset manual riders and previous session results
              raceState.isManualMode = false;
              raceState.manualRiders = [];
              raceState.manualSessionInfo = undefined;
              raceState.results = null;
              saveRaceStateCache();
              await startOrReconnectSignalRSession(parsed.sessionId, parsed.eventId || undefined);
            }
          }
        }
        else if (message.type === 'sessionControl') {
          console.log(`[WS Server] Received sessionControl: action=${message.action}`);
          if (message.action === 'shutdown') {
            await shutdownSignalRSessions();
            saveRaceStateCache();
          } else if (message.action === 'reconnect') {
            const urlToUse = message.url || raceState.speedhiveUrl;
            let targetSessionId = savedID.sessionId || raceState.sessionId;
            let targetEventId = savedID.eventId || raceState.eventId;
            if (urlToUse) {
              const parsed = parseSpeedhiveUrl(urlToUse);
              if (parsed.sessionId) {
                targetSessionId = parsed.sessionId;
                if (parsed.eventId) targetEventId = parsed.eventId;
              }
            }
            if (targetSessionId) {
              await startOrReconnectSignalRSession(targetSessionId, targetEventId);
              saveRaceStateCache();
            } else {
              broadcastToAll({
                type: 'errorMessage',
                error: 'Cannot reconnect: No active Speedhive URL or Session ID configured.'
              });
            }
          }
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
