/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Radio, 
  Tv, 
  Activity, 
  Volume2, 
  VolumeX, 
  Terminal, 
  Settings, 
  Edit3, 
  PlusCircle, 
  Check, 
  Trash2, 
  HelpCircle,
  TrendingUp, 
  TrendingDown, 
  Minus,
  Sparkles,
  Zap,
  ChevronRight,
  User,
  Clock,
  Gauge,
  X,
  Link,
  Wifi,
  WifiOff,
  Bell,
  Diamond,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { RiderResult, SignalRPacket, ControlState, RaceEventData, RacerResult } from './types';
import { INITIAL_RIDERS, recalculateGaps, parseLapTimeToMs, formatLapTime } from './data';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RaceResultPage } from './components/resultPage';
import { TrophyPage } from './components/trophyPage';
import { DisplayController } from './components/control';
import { SidePositionPage } from './components/SidePositionPage';
import { MainBoardPage } from './components/MainBoardPage';
import { StartingGrid } from './components/startingGrid';
import { WebRTCVideoPlayer } from './components/rtmpVideo';
import { ManualPage } from './components/ManualPage';

import { ListSelectInput, SelectOption } from './components/lists';



// Helper to parse Speedhive URLs or session IDs
function parseSpeedhiveUrl(urlStr: string) {
  try {
    const clean = urlStr.trim();
    if (!clean) return { eventId: null, sessionId: null };

    // Try URL pattern e.g. https://speedhive.mylaps.com/livetiming/BB89C9A089830254-2147485566/sessions/BB89C9A089830254-2147485566-1073745079
    if (clean.startsWith('http')) {
      const match = clean.match(/\/livetiming\/([A-Za-z0-9\-]+)\/sessions\/([A-Za-z0-9\-]+)/);
      if (match) {
        return { eventId: match[1], sessionId: match[2] };
      }
    }

    // Try direct session ID pattern e.g. "BB89C9A089830254-2147485566-1073745079"
    const parts = clean.split('-');
    if (parts.length >= 3) {
      return {
        eventId: `${parts[0]}-${parts[1]}`,
        sessionId: clean
      };
    }

    return { eventId: null, sessionId: null };
  } catch (e) {
    return { eventId: null, sessionId: null };
  }
}

// Helper to format race clock stopwatch seconds
function formatRaceTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds * 10) % 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
}

function fitName(name: string, maxLength: number) {
    if(!name)return "-";
    const parts = name.split(" ");

    if (name.length <= maxLength) {
        return name;
    }

    if (parts.length === 2) {
        const short = `${parts[0]} ${parts[1].slice(0, 4)}`;

        if (short.length <= maxLength) {
            return short;
        }
        
        const short2 = `${parts[0]} ${parts[1][0]}`;
        if(short2.length <= maxLength)
        return short2;
        return `${parts[0][0]} ${parts[1].slice(0,3)}`;

    }

    return `${parts[0]} ${parts.slice(1)
        .map(x => x[0])
        .join(" ")}`;
}
  // Attach WebRTC MediaStream to the video element
export default function App() {
  const [speedhiveUrl, setSpeedhiveUrl] = useState<string>();
  const resultData = useRef<RaceEventData | null>(null);
  const [raceLaps, setRaceLaps] = useState<number>(0);
  const [isClosedLoop, setIsClosedLoop] = useState<boolean>(() => {
    return localStorage.getItem('is_closed_loop') !== 'false';
  });
  const [showLTG, setShowLTG] = useState<boolean>(false);
  const [showLaps, setShowLaps] = useState<boolean>(false);
  const [showBanner, setShowBanner] = useState<boolean>(true);
  
  const [customBanner, setCustomBanner] = useState<string>('');

  const [finishedRacerPage, setfinishedRacerPage] = useState<number>(0);
  const [finishedPages, setFinishedPages] = useState<number>(0);

  const [stream, setStream] = useState<string>('');
  const [useWebcam, setUseWebcam] = useState<boolean>(true);
  const [inputDevice, setInputDevice] = useState<string>('');
  const inputDeviceRef = useRef('');
  const lastInputDevicesRef = useRef<SelectOption[]>([]);
  
  const [inputDevices,setInputDevices] = useState<SelectOption[]>([]);
  const [inputDevicesOption,setInputDevicesOption] = useState<SelectOption[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [videoStatus, setVideoStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [controlVideoStatus, setControlVideoStatus] = useState<string>('connecting');
  const [errorMessageControl, setErrorMessageControl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [control, setControl] = useState<ControlState>({laps:false,ltg:false,input:false,rtmp:false});
  const controlRef = useRef<ControlState>({laps:false,ltg:false,input:false,rtmp:false});
  
  useEffect(() => {
    controlRef.current = control;
    
    // if(control.laps || control.ltg || flag === 3 || control.start || control.finish || control.custom){
    if(control.laps || control.ltg || control.start || control.finish || control.custom){
      setShowBanner(true);
    }
    else{
      setShowBanner(false);
    }
    if(control.rtmp || control.input)setInputDevice('');
    console.log("Control Ref", controlRef.current);
  }, [control]);

  // Display states mapped from Speedhive events
  const [raceTitle, setRaceTitle] = useState<string>('-');
  const [sessionName, setSessionName] = useState<string>('-');
  const [groupName, setGroupName] = useState<string>('-');
  const [sessionBestTime, setSessionBestTime] = useState<string>('0:00.000');
  const [sessionBestRider, setSessionBestRider] = useState<string>('-');
  const [laps, setLaps ] = useState<number>(0);
  const [lapsToGo, setLapsToGo ] = useState<number>(0);
  const [flag, setFlag ] = useState<number>(0);
  const flagRef = useRef(flag);
  const [savedSessionId, setSessionId] = useState<string>('');
  const [savedEventId, setEventId] = useState<string>('');
  const sessionIdRef = useRef(savedSessionId);
  const initialLoadRef = useRef(true);

  useEffect(() => {
      flagRef.current = flag;
      if (flagRef.current === 3) {
          setLatestAnnouncement("The Race is Finished");
      }
  }, [flag]);

  useEffect(() => {
      if(savedSessionId !== sessionIdRef.current){

      }
      sessionIdRef.current = savedSessionId;
      // if(!savedSessionId){ 
        // console.log("Trying to fetch initial data for new sessionId");
        initialLoadRef.current = false;
        async function fetchData() {
          try {
              await fetchInitialData("", "");
              connectSignalR(sessionIdRef.current);
              document.title = raceTitle;
          } catch (error) {
              console.error(error);
              return () => {
                if (connectionRef.current) {
                  connectionRef.current.close();
                }
              };
          }
        }
        fetchData();

  }, [savedSessionId]);

  useEffect(() =>{
    if(inputDevices.length>0)
    lastInputDevicesRef.current = inputDevices;
  },[inputDevices]);
  const handleSpeedHiveUrl = (passedSpeedhiveUrl: string) =>{
    // console.log("url received", passedSpeedhiveUrl);
    setSpeedhiveUrl(passedSpeedhiveUrl);
  };
  
  const handleInputDevices = (devices: SelectOption[]) =>{
    console.log("devices received", devices);
    setInputDevices(devices);
  };
  const gridPagesRef = useRef<number>(0);
  const handleGridPages = (gridPages: number)=>{
    gridPagesRef.current = gridPages;
  }
  const finishedRacerPagesNum = useRef<number>(0);
  const handleFinishedRacers = (finishedRacerPages: number) =>{
      finishedRacerPagesNum.current = finishedRacerPages;
      console.log("finishedpages", finishedRacerPagesNum.current);
      
      if (connectionRef.current && connectionRef.current.readyState === WebSocket.OPEN) {
        connectionRef.current.send(JSON.stringify({
          type: 'finishedPages',
          pages : finishedRacerPages
        }));
      }
  }
  
  // Scrolling Announcements from hub
  const [latestAnnouncement, setLatestAnnouncement] = useState<string>('');

  // Active Riders / Telemetry grid
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const isManualModeRef = useRef<boolean>(false);
  useEffect(() => {
    isManualModeRef.current = isManualMode;
  }, [isManualMode]);

  const [riders, setRiders] = useState<RiderResult[]>(() => {
    return recalculateGaps(INITIAL_RIDERS);
  });

  // Track previous state for flashes and change directions
  const previousPositionsRef = useRef<{ [riderId: string]: number }>({});
  
  // Collapsible Setup drawer state
  const [isSetupOpen, setIsSetupOpen] = useState<boolean>(false);

  // Connection / WebSocket states
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'setting up' | 'waiting' | 'error'>('disconnected');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const connectionRef = useRef<WebSocket | null>(null);

  // Simulation Controls (Moved entirely into the collapsible Setup Drawer)
  const [autoSimulate, setAutoSimulate] = useState<boolean>(false);
  const [simSpeedSeconds, setSimSpeedSeconds] = useState<number>(4);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  
  // Custom Race Stopwatch variables
  const [raceSeconds, setRaceSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Admin Customizer states
  const [isEditingGrid, setIsEditingGrid] = useState<boolean>(false);
  const [editingRider, setEditingRider] = useState<RiderResult | null>(null);
  const [newRiderName, setNewRiderName] = useState('');
  const [newRiderNo, setNewRiderNo] = useState('');
  const [newRiderTeam, setNewRiderTeam] = useState('');

  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);

  // Micro-console logs array for setup page
  const [signalRLogs, setSignalRLogs] = useState<Array<{
    id: string;
    timestamp: string;
    direction: 'in' | 'system' | 'sent';
    message: string;
    rawPayload?: string;
  }>>([
    {
      id: "initial-log",
      timestamp: new Date().toLocaleTimeString(),
      direction: 'system',
      message: "🔄 Timing Desk Console initialized. Waiting for Speedhive feed connection..."
    }
  ]);

  // Audio synthesizer for record lap / overtake beeps
  const playBeep = (type: 'overtake' | 'bestlap' | 'tick') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (type === 'overtake') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        // osc.connect(gain);
        // gain.connect(audioCtx.destination);
        // osc.type = 'sine';
        // osc.frequency.setValueAtTime(880, audioCtx.currentTime); 
        // osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.08); 
        // gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        // gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        // osc.start();
        // osc.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'bestlap') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        // osc.connect(gain);
        // gain.connect(audioCtx.destination);
        // osc.type = 'triangle';
        // osc.frequency.setValueAtTime(987.77, audioCtx.currentTime); 
        // osc.frequency.setValueAtTime(1479.98, audioCtx.currentTime + 0.1); 
        // osc.frequency.setValueAtTime(1975.53, audioCtx.currentTime + 0.2); 
        // gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        // gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
        // osc.start();
        // osc.stop(audioCtx.currentTime + 0.45);
      } else {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        // osc.connect(gain);
        // gain.connect(audioCtx.destination);
        // osc.type = 'sine';
        // osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        // gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
        // gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        // osc.start();
        // osc.stop(audioCtx.currentTime + 0.05);
      }
    } catch (err) {
      // Ignore audio context errors due to browser autoplay policies
    }
  };

  // Setup stopwatch counter for track session
  useEffect(() => {
    let clockTimer: any = null;
    if (isTimerRunning) {
      clockTimer = setInterval(() => {
        setRaceSeconds((prev) => prev + 0.1);
      }, 100);
    }
    return () => {
      if (clockTimer) clearInterval(clockTimer);
    };
  }, [isTimerRunning]);

  // Update previous positions when riders state changes
  useEffect(() => {
    const currentPositions: { [riderId: string]: number } = {};
    riders.forEach((r) => {
      currentPositions[r.id] = r.lbpos;
    });
    previousPositionsRef.current = currentPositions;
    const hasActiveHighlights = riders.some(
      (r) => r.changeDirection !== 'steady' && Date.now() - r.changeTime < 3000
    );

    if (!hasActiveHighlights) return;

    // Check back every 100ms to clean up expired rows smoothly
    const timer = setInterval(() => {
      setRiders((currentRiders) => {
        let updated = false;
        
        const nextRiders = currentRiders.map((rider) => {
          if (rider.changeDirection !== 'steady' && Date.now() - rider.changeTime >= 3000) {
            updated = true;
            return { ...rider, changeDirection: 'steady' as const };
          }
          return rider;
        });

        // Avoid unnecessary re-renders if nothing actually expired during this tick
        return updated ? nextRiders : currentRiders;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [riders]);
  const startingGridPageRef = useRef<number>(0);
  const [startingGridPage,setStartingGridPage] = useState<number>(0);
  useEffect(()=>{
    startingGridPageRef.current = startingGridPage;
  },[startingGridPage]);
  // Add websocket log entry
  const addWebSocketLog = (direction: 'in' | 'system' | 'sent' | 'ws' | 'packet' | 'sim', message: string, payloadStr?: string) => {
    setSignalRLogs((prev) => {
      const timestamp = new Date().toLocaleTimeString();
      return [
        {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp,
          direction: direction as 'in' | 'system' | 'sent',
          message,
          rawPayload: payloadStr
        },
        ...prev
      ].slice(0, 35);
    });
  };

  const webSocketLogs = useMemo(() => {
    return signalRLogs.map((log) => ({
      id: log.id,
      time: log.timestamp,
      type: (log.direction === 'in' ? 'packet' : log.direction === 'sent' ? 'ws' : log.direction) as 'ws' | 'packet' | 'system' | 'sim',
      text: log.message,
    }));
  }, [signalRLogs]);
  
  const injectSignalRPacket = (packetObj: SignalRPacket) => {
    if (isManualModeRef.current) return; // Ignore Speedhive live updates when manual mode is active
    if (!packetObj || !Array.isArray(packetObj.results)) {
      addWebSocketLog('system', "❌ SignalR Error: results is not a valid array");
      return;
    }
    // console.log("RAW Packet", packetObj);
    setRiders((prevRiders) => {
      const riderMap = new Map<string, RiderResult>();
      prevRiders.forEach((r) => {
        riderMap.set(r.id, r);
      });

      let sessionBestImproved = false;
      let overtakeHappened = false;
      const rawGapsMap = new Map<string, { gp?: string; df?: string }>();

      const mergedRiders = packetObj.results.map((incoming) => {
        rawGapsMap.set(incoming.id, { gp: incoming.gp, df: incoming.df });

        const existing = riderMap.get(incoming.id);
        const originalPos = existing ? existing.lbpos : undefined;
        
        // Default to incoming delta value if provided, else steady
        let changeDirection: 'up' | 'down' | 'steady' = 'steady';
        let changeTime = existing ? existing.changeTime : Date.now();

        if (originalPos !== undefined && incoming.lbpos !== undefined) {
          if (incoming.lbpos < originalPos) {
            changeDirection = 'up';
            changeTime = Date.now(); // Track exactly when it went up
            overtakeHappened = true;
          } else if (incoming.lbpos > originalPos) {
            changeDirection = 'down';
            changeTime = Date.now(); // Track exactly when it went down
          } else {
            // If the position didn't change in this packet, retain the old direction 
            // if it hasn't expired yet (we check expiration inside the cleanup loop)
            changeDirection = existing ? existing.changeDirection : 'steady';
          }
        }

        let isAbsoluteFastest = false;
        if (incoming.btTm) {
          const incomingMs = parseLapTimeToMs(incoming.btTm);
          const currentBestMs = parseLapTimeToMs(sessionBestTime);
          if (incomingMs < currentBestMs && incomingMs > 10000) {
            setSessionBestTime(incoming.btTm);
            setSessionBestRider(incoming.nam);
            isAbsoluteFastest = true;
            sessionBestImproved = true;
          }
        }

        return {
          ...existing,
          ...incoming,
          prevPos: originalPos,
          changeTime,
          changeDirection,
          ibt: isAbsoluteFastest ? true : (incoming.ibt || (existing ? existing.ibt : false))
        } as RiderResult;
      });

      const incomingIds = new Set(packetObj.results.map(r => r.id));
      const omittedRiders = prevRiders.filter(r => !incomingIds.has(r.id));
      
      const fullRaceGroup = [...mergedRiders, ...omittedRiders];
      const sortedPack = recalculateGaps(fullRaceGroup);

      const finalPack = sortedPack.map((rider) => {
        const rawGaps = rawGapsMap.get(rider.id);
        if (rawGaps) {
          return {
            ...rider,
            gp: rawGaps.gp !== undefined ? rawGaps.gp : rider.gp,
            df: rawGaps.df !== undefined ? rawGaps.df : rider.df,
          };
        }
        return rider;
      });
      // console.log("new Data", finalPack);
      if (sessionBestImproved) {
        playBeep('bestlap');
      } else if (overtakeHappened) {
        playBeep('overtake');
      } else {
        playBeep('tick');
      }

      return finalPack;
    });
  };
  // Fetch initial Speedhive timing state via Express API proxy to bypass CORS
  const fetchInitialData = async (eventId: string, sessionId: string) => {
    addWebSocketLog('system', `🔍 Querying initial racing board session: ${sessionId}`);
    try {
      if (connectionRef.current) {
        try {
          connectionRef.current.close();
        } catch (e) {
          // ignore
        }
      }
      const url = eventId && sessionId ? `/api/speedhive-proxy?eventId=${eventId}&sessionId=${sessionId}` : `/api/speedhive-proxy`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Speedhive API returned ${res.status} (${res.statusText})`);
      }
      const data = await res.json();
      if(data)console.log("Initial data fetched", data);
      
      setRiders([]); // clear any existing riders before fetching new data
      if (data.eNam) setRaceTitle(data.eNam);
      if (data.rnNam) setSessionName(data.rnNam);
      if (data.gNam) setGroupName(data.gNam);
      if (data.btLpTim) setSessionBestTime(data.btLpTim);
      // if (data.ls) setRaceLaps(data.ls);
      if (data.ls) setLaps(data.ls);
      if (data.lsTg) setLapsToGo(data.lsTg);
      if (typeof data.f === "number") setFlag(data.f);
      if (data.id) setSessionId(data.id);
      if (data.eventId) setEventId(data.eventId);
      if (data.l && Array.isArray(data.l)) {
      // Map and preserve the initial raw gp and df values from Speedhive
      const rawGapsMap = new Map<string, { gp?: string; df?: string }>();
      data.l.forEach((r: RiderResult) => {
        rawGapsMap.set(r.id, { gp: r.gp, df: r.df });
      });

      const sorted = recalculateGaps(data.l);

      // Restore initial raw gap strings
      const finalInitialData = sorted.map((rider) => {
        const rawGaps = rawGapsMap.get(rider.id);
        return {
          ...rider,
          gp: rawGaps?.gp ?? rider.gp,
          df: rawGaps?.df ?? rider.df,
          gpCl: rawGaps?.gp ?? rider.gpCl,
          dfCl: rawGaps?.df ?? rider.dfCl,
        };
      });

      setRiders(finalInitialData);

      const bestRider = finalInitialData.find(r => r.ibt || r.btTm === data.btLpTim);
      if (bestRider) {
        setSessionBestRider(bestRider.nam);
      }
      addWebSocketLog('system', `📊 Received ${finalInitialData.length} starter grid positions from Speedhive API.`);
    }
      return { eventId: data.eventId, sessionId: data.sessionId };
    } catch (err: any) {
      console.error("Speedhive proxy fetch error:", err);
      addWebSocketLog('system', `⚠️ Initial data load missed: ${err.message}. Fetching will resume dynamically via SignalR WebSockets.`);
    }
  };

  const [controlAction, setControlAction] = useState('');
  const controlActionRef = useRef(controlAction);
  
  useEffect(() => {

  }, [controlAction]);

  const triggerStopwatch = (action: 'start' | 'pause' | 'reset') => {
    const nextRunning = action === 'start';
    const nextSeconds = action === 'reset' ? 0 : raceSeconds;
    
    if (connectionRef.current && connectionRef.current.readyState === WebSocket.OPEN) {
      connectionRef.current.send(JSON.stringify({
        type: 'stopwatch',
        action,
        raceSeconds: nextSeconds
      }));
    } else {
      setIsTimerRunning(nextRunning);
      if (action === 'reset') setRaceSeconds(0);
    }
  };

  // Connect to our backend WebSocket proxy
  const connectSignalR = (sessionId: string) => { //MainWebsocket
    if (connectionRef.current) {
      try {
        connectionRef.current.close();
      } catch (e) {
        // ignore
      }
    }
    // if(!sessionId) {
    //   addWebSocketLog('system', `⚠️ No sessionId provided. SignalR connection will not be established.`);
    //   return;
    // }

    setConnectionStatus('connecting');
    setConnectionError(null);

    const wsProtocol = window.location.protocol === 'https:' ? "wss:" : "ws:";
    const socketUrl = `${wsProtocol}//${window.location.host}`;
    addWebSocketLog('system', `📡 Connecting to backend WebSocket proxy: ${socketUrl}`);

    try {
      const socket = new WebSocket(socketUrl);

      socket.onopen = () => {
        if(sessionId) {
          addWebSocketLog('system', `🟢 Connected to backend proxy. Subscribing to session: ${sessionId}`);
          socket.send(JSON.stringify({
            type: "subscribe",
            sessionId: sessionId,
            newSessionId: sessionId
          }));
        }else{
          addWebSocketLog('system', `🟢 Connected to backend proxy. No sessionId provided, waiting for new connection.`);
          socket.send(JSON.stringify({
            type: "subscribe",
            sessionId: ""
          }));
        }
        
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "newConnection") {
            addWebSocketLog('system', `📡 New connection detected`);
            if(message.sessionId !== sessionIdRef.current) {
              // console.log("New Session Id", message.sessionId);   
              setLatestAnnouncement("");
              setSessionId(message.sessionId);
            }
          }
          else if(message.type === "speedhiveURL"){
              // console.log("New Speedhive URL", message.url);
            handleLoadSpeedhiveSession(message.url)
          }
          else if(message.type === 'customBanner' && location.pathname === "/sideposition"){
            setCustomBanner(message.text);
          }
          else if(message.type === "startingGrid" && location.pathname === "/startingGrid"){
              // console.log("New Speedhive URL", message.url);
              if((startingGridPageRef.current + 1) === gridPagesRef.current){
                  setStartingGridPage(0);
              }
              else{
                setStartingGridPage(startingGridPageRef.current + 1);
              }
          }
          else if(message.type === "finishedRacerPage" && location.pathname === "/result"){
            console.log("Setting page",message.page)
            setfinishedRacerPage(message.page);
          }
          else if(message.type === "askFinishedPages" && location.pathname === "/result"){
            
            console.log("Sending finished pages:",finishedRacerPage);
            
            if (connectionRef.current && connectionRef.current.readyState === WebSocket.OPEN) {
              connectionRef.current.send(JSON.stringify({
                type: 'finishedPages',
                pages : finishedRacerPagesNum.current
              }));
            }
          }
          else if(message.type === "finishedPages" && location.pathname === "/control"){
            console.log("finished pages:",message.pages);
            setFinishedPages(message.pages);
          }
          else if (message.type === "stopwatchState") {
            if (typeof message.isTimerRunning === "boolean") {
              setIsTimerRunning(message.isTimerRunning);
            }
            if (typeof message.raceSeconds === "number") {
              setRaceSeconds(message.raceSeconds);
              // console.log("seconds",message.raceSeconds);
            }
          }
          else if(message.type === "videoStatus"){
            // console.log("videoStatus", message.status);
            setControlVideoStatus(message.status);
          }
          else if(message.type === "macroPad" && location.pathname === '/sideposition'){
            
            if(message.trigger){
              const key = message.trigger.eventName;
              const controlVal = controlRef.current;
              console.log("Macropad:" ,key);
              if(key === "video"){
              setControl((prevControl) => ({
              ...prevControl, // Keep all previous keys (e.g., laps: true)
              ...{video: !controlVal.video}  // Add or overwrite with new keys (e.g., time: true)
            }));}
            }
          }
          else if(message.type === 'askInputDevices' && location.pathname === "/sideposition"){
            console.log("Sending to control");
            socket.send(
              JSON.stringify({
                type: 'inputDevices',
                devices: lastInputDevicesRef.current,
              })
            );
          }
          else if (message.type === "status") {
            if (message.status === "connected") {
                socket.send(JSON.stringify({
                  type: "syncState",
                  sessionId: sessionId,
                  newSessionId: sessionId
                }));
            if(location.pathname === "/sideposition" || location.pathname === "/sideposition/"){
              console.log("Sending to control");
              socket.send(
                JSON.stringify({
                  type: 'inputDevices',
                  devices: lastInputDevicesRef.current,
                })
              );
            }
            if(location.pathname === "/control"){
              console.log("Asking input devices && result pages");
              socket.send(
                JSON.stringify({
                  type: 'askInputDevices'
                })
              );
              socket.send(
                JSON.stringify({
                  type: 'askFinishedPages'
                })
            );
            }
              setConnectionStatus('connected');
              addWebSocketLog('system', `🟢 Speedhive session subscription verified. Telemetry active.`);
            } else if (message.status === "connecting") {
              setConnectionStatus('connecting');
              addWebSocketLog('system', `Initiating Speedhive session.`);
            } else if (message.status === "waiting") {
              setConnectionStatus('waiting');
              addWebSocketLog('system', `Waiting for Speedhive session.`);
            } 
            else if (message.status === "error") {
              setConnectionStatus('error');
              setConnectionError(message.message || 'Subscription failed');
              addWebSocketLog('system', `❌ Subscription Error: ${message.message}`);
            }
          } else if (message.type === "manualDataSync") {
            addWebSocketLog('system', `⚙️ Manual Mode Sync received: enabled=${message.isManualMode}`);
            setIsManualMode(!!message.isManualMode);
            if (message.riders && Array.isArray(message.riders)) {
              setRiders(message.riders);
            }
            if (message.sessionInfo) {
              if (typeof message.sessionInfo.raceTitle === 'string') setRaceTitle(message.sessionInfo.raceTitle);
              if (typeof message.sessionInfo.sessionName === 'string') setSessionName(message.sessionInfo.sessionName);
              if (typeof message.sessionInfo.groupName === 'string') setGroupName(message.sessionInfo.groupName);
              if (typeof message.sessionInfo.raceLaps === 'number') setRaceLaps(message.sessionInfo.raceLaps);
              if (typeof message.sessionInfo.laps === 'number') setLaps(message.sessionInfo.laps);
              if (typeof message.sessionInfo.lapsToGo === 'number') setLapsToGo(message.sessionInfo.lapsToGo);
              if (typeof message.sessionInfo.flag === 'number') setFlag(message.sessionInfo.flag);
            }
          } else if (message.type === "resultsForSessionReceived") {
            addWebSocketLog('in', `📥 resultsForSessionReceived websocket frame parsed`);
            const data = message.data;
            if (data && Array.isArray(data.results)) {
              injectSignalRPacket(data);
            }
          } else if (message.type === "sessionAddedOrUpdated") {
            addWebSocketLog('in', `🔔 Feed event: sessionAddedOrUpdated`);
            const data = message.data;
            if (data && !isManualModeRef.current) {
              if (data.eNam) setRaceTitle(data.eNam);
              if (data.rnNam) setSessionName(data.rnNam);
              if (data.gNam) setGroupName(data.gNam);
              if (data.btLpTim) setSessionBestTime(data.btLpTim);
              // if (data.ls) setRaceLaps(data.ls);
              if (data.ls) setLaps(data.ls);
              if (data.lsTg) setLapsToGo(data.lsTg);
              if (typeof data.f === "number") setFlag(data.f);
            }
          } else if (message.type === "announcementsUpdated") {
            addWebSocketLog('in', `📢 Announcement message received`);
            const data = message.data;
            if (data && data.tx) {
              setLatestAnnouncement(data.tx);
              setTimeout(() => {
                  setLatestAnnouncement((current) => {
                      // A newer announcement arrived, don't touch it
                      if (current !== data.tx) {
                          return current;
                      }

                      // No newer announcement, show a fixed message
                      return flagRef.current === 3 ? "The Race is Finished" : "";
                  });
              }, 15000);
            }
          } else if (message.type === "statsUpdated") {
            addWebSocketLog('in', `📊 Stats packet received`);
            const data = message.data;
            if (data && data.bestLapTime) {
              setSessionBestTime(data.bestLapTime);
              if (data.bestLapDriverName) {
                setSessionBestRider(data.bestLapDriverName);
              }
            }
          } else if(message.type === "control" && message.action){
            // console.log("Control action received:", message.action);
            setControl((prevControl) => ({
              ...prevControl, // Keep all previous keys (e.g., laps: true)
              ...message.action  // Add or overwrite with new keys (e.g., time: true)
            }));
            if(control.laps || control.ltg || control.start || control.finish || control.custom)setShowBanner(true);
            setControlAction(message.action);
          }
          else if(message.type === 'setRaceLaps'){
            console.log("Received race laps",message.laps)
            setRaceLaps(message.laps);
          }
          else if(message.type === 'video'){
            setStream(message.url);
            console.log("url sent:", message.url);
          }
          else if(message.type === 'errorMessage'){
            setErrorMessageControl(message.error);
            // console.log("Error msg sent:", message.error);
          }
          else if(message.type === "inputDevice"){
            // console.log("input Device msg", message);
            setInputDevice(message.inputDevice.device);
            // console.log("Set Input Device", message.inputDevice.device);
          }
          else if(message.type === "inputDevices"){
            console.log("Received inputs",message);
            setInputDevicesOption(message.inputDevices.devices);
          }
          else if (message.type === "syncState") {
            addWebSocketLog('system', `📡 Received full race state sync from server.`);
            // console.log("Received full race state sync from server. control", message);
            if (message.raceState.sessionId && message.raceState.sessionId !== sessionIdRef.current) {
              setSessionId(message.raceState.sessionId);
            }
            if (message.raceState.eventId) {
              setEventId(message.raceState.eventId);
            }
            if (message.raceState.results && Array.isArray(message.raceState.results.results)) {
              injectSignalRPacket(message.raceState.results);
            }
            if (message.raceState.sessionInfo) {
              const data = message.raceState.sessionInfo;
              if (data.eNam) setRaceTitle(data.eNam);
              if (data.rnNam) setSessionName(data.rnNam);
              if (data.gNam) setGroupName(data.gNam);
              if (data.btLpTim) setSessionBestTime(data.btLpTim);
              // if (data.ls) setRaceLaps(data.ls);
              if (data.ls) setLaps(data.ls);
              if (data.lsTg) setLapsToGo(data.lsTg);
              if (typeof data.f === "number") setFlag(data.f);
            }
            if (message.raceState.announcement) {
              setLatestAnnouncement(message.raceState.announcement);
            }
            if (message.raceState.stats) {
              const data = message.raceState.stats;
              if (data.bestLapTime) {
                setSessionBestTime(data.bestLapTime);
                if (data.bestLapDriverName) {
                  setSessionBestRider(data.bestLapDriverName);
                }
              }
            }
            if (message.raceState.controlAction) {
              setControl((prevControl) => ({
              ...prevControl, // Keep all previous keys (e.g., laps: true)
              ...message.raceState.controlAction  // Add or overwrite with new keys (e.g., time: true)
            }));
              // console.log("Control action updated from syncState:", message.raceState.controlAction);
            }
            if (typeof message.raceState.isTimerRunning === "boolean") {
              setIsTimerRunning(message.raceState.isTimerRunning);
            }
            if (typeof message.raceState.raceSeconds === "number") {
              setRaceSeconds(message.raceState.raceSeconds);
            }
          }

        } catch (err: any) {
          console.error("Failed to parse backend websocket message:", err);
        }
      };

      socket.onclose = (event) => {
        if (!event.wasClean) {
          setConnectionStatus('error');
          setConnectionError(`Connection closed unexpectedly (code ${event.code})`);
          addWebSocketLog('system', `❌ Backend WebSocket proxy connection closed unexpectedly`);
        } else {
          setConnectionStatus('disconnected');
          addWebSocketLog('system', `⚪ Backend WebSocket proxy connection closed normally`);
        }
      };

      socket.onerror = (err) => {
        console.error("Frontend WebSocket Error:", err);
        setConnectionStatus('error');
        setConnectionError('WebSocket connection error');
        addWebSocketLog('system', `❌ WebSocket connection error encountered`);
      };

      connectionRef.current = socket;
    } catch (err: any) {
      console.error("Frontend WebSocket initialization failure:", err);
      setConnectionStatus('error');
      setConnectionError(err.message || 'WebSocket initialization failed');
      addWebSocketLog('system', `❌ WebSocket initialization failure: ${err.message}`);
    }
  };
  
  const handleRTMPStatus = (rtmpStatus:string) =>{
    console.log("RTMP:",rtmpStatus)
    console.log("stream ref",streamRef.current);
  };
  // Parse speedhive URL, query endpoint, and startup Websockets
  const handleLoadSpeedhiveSession = async (customUrl?: string) => {
    const urlToUse = customUrl || speedhiveUrl;
    if (!urlToUse) return;

    // console.log("Handling:",urlToUse);

    const { eventId, sessionId } = parseSpeedhiveUrl(urlToUse);
    if (!sessionId) {
      addWebSocketLog('system', `❌ Error: URL does not match Speedhive session syntax.`);
      alert("Invalid Speedhive session URL pattern. Make sure it contains /livetiming/ and a valid ID.");
      return;
    }

    localStorage.setItem('speedhive_url', urlToUse);
    setAutoSimulate(false); // disable simulator on real speedhive load
    // 1. Load initial timing tables
    if (eventId) {
      await fetchInitialData(eventId, sessionId);
    } else {
      const parts = sessionId.split('-');
      if (parts.length >= 2) {
        await fetchInitialData(`${parts[0]}-${parts[1]}`, sessionId);
      }
    }
    setSessionId(sessionId);

    // 2. Spawn WebSockets
    connectSignalR(sessionId);
  };

  // Simulator loop to swap grid position dynamically for demonstration testing
  useEffect(() => {
    if (!autoSimulate) return;

    const timer = setInterval(() => {
      setRiders((currentPack) => {
        if (currentPack.length < 2) return currentPack;

        const eventType = Math.random();
        let updated = [...currentPack];
        let eventMessage = "";

        if (eventType < 0.70) {
          // Overtake Event
          const indexToOvertake = Math.floor(Math.random() * (updated.length - 1));
          const defender = updated[indexToOvertake];
          const attacker = updated[indexToOvertake + 1];

          const initialDefPos = defender.lbpos;
          const initialAttPos = attacker.lbpos;

          defender.lbpos = initialAttPos;
          defender.pos = initialAttPos.toString();
          defender.prevPos = initialDefPos;
          defender.changeDirection = 'down';
          defender.changeTime = Date.now();

          attacker.lbpos = initialDefPos;
          attacker.pos = initialDefPos.toString();
          attacker.prevPos = initialAttPos;
          attacker.changeDirection = 'up';
          attacker.changeTime = Date.now();

          const baseMs = parseLapTimeToMs(sessionBestTime);
          const newLastLapMs = baseMs + (Math.random() * 1900 - 400); 
          attacker.lsTm = formatLapTime(newLastLapMs);
          attacker.ls += 1; 

          const defenderMsStr = defender.tTm || "5:26.000";
          const defenderMs = parseLapTimeToMs(defenderMsStr);
          attacker.tTm = formatLapTime(defenderMs - 120); 
          defender.tTm = formatLapTime(defenderMs + 100);

          eventMessage = `⚡ [Simulator] Overtake: #${attacker.no} ${attacker.nam} overtook #${defender.no} ${defender.nam} for P${initialDefPos}!`;
          playBeep('overtake');
          updated = recalculateGaps(updated);
        } else {
          // Record Improvement Event
          const targetIndex = Math.floor(Math.random() * updated.length);
          const targetRider = { ...updated[targetIndex] };
          
          const currentBestMs = parseLapTimeToMs(targetRider.btTm || "1:07.000");
          const reductionMs = Math.random() * 800 + 100; 
          const newBestMs = Math.round(currentBestMs - reductionMs);
          const newBestLapStr = formatLapTime(newBestMs);

          targetRider.btTm = newBestLapStr;
          targetRider.lsTm = newBestLapStr;
          targetRider.ls += 1;

          const currentGlobalBestMs = parseLapTimeToMs(sessionBestTime);
          if (newBestMs < currentGlobalBestMs) {
            setSessionBestTime(newBestLapStr);
            setSessionBestRider(targetRider.nam);
            targetRider.ibt = true;
            eventMessage = `💜 [Simulator] RECORD OVERALL LAP: #${targetRider.no} ${targetRider.nam} sets ${newBestLapStr}!`;
            playBeep('bestlap');
          } else {
            eventMessage = `🏁 [Simulator] Personal Best Lap: #${targetRider.no} ${targetRider.nam} clocked ${newBestLapStr}.`;
            playBeep('tick');
          }

          updated[targetIndex] = targetRider;
          updated = recalculateGaps(updated);
        }

        addWebSocketLog('in', eventMessage);
        return updated;
      });
    }, simSpeedSeconds * 1000);

    return () => clearInterval(timer);
  }, [autoSimulate, simSpeedSeconds, sessionBestTime]);

  // Handle direct manual trigger for overtaking action
  const triggerManualOvertake = () => {
    if (riders.length < 2) return;
    const targetIdx = 1 + Math.floor(Math.random() * (riders.length - 1));
    const attacker = { ...riders[targetIdx] };
    const defender = { ...riders[targetIdx - 1] };

    const defOrigPos = defender.lbpos;
    const attOrigPos = attacker.lbpos;

    attacker.lbpos = defOrigPos;
    attacker.pos = defOrigPos.toString();
    attacker.changeDirection = 'up';
    attacker.changeTime = Date.now();

    defender.lbpos = attOrigPos;
    defender.pos = attOrigPos.toString();
    defender.changeDirection = 'down';
    defender.changeTime = Date.now();

    const currentBaseMs = parseLapTimeToMs(defender.tTm || "0:00.000");
    attacker.tTm = formatLapTime(currentBaseMs - 150);
    defender.tTm = formatLapTime(currentBaseMs + 50);
    attacker.lsTm = formatLapTime(parseLapTimeToMs(sessionBestTime) + Math.random() * 800);

    const updated = [...riders];
    updated[targetIdx] = defender;
    updated[targetIdx - 1] = attacker;

    const finalRiders = recalculateGaps(updated);
    addWebSocketLog('sent', `⚡ Overtake triggered: #${attacker.no} ${attacker.nam} passed #${defender.no} ${defender.nam}`);
    setRiders(finalRiders);
    playBeep('overtake');
  };

  // Reset timings
  const handleResetTiming = () => {
    const fresh = recalculateGaps(INITIAL_RIDERS);
    setRiders(fresh);
    setRaceSeconds(0);
    setSessionBestTime("0:00.000");
    setSessionBestRider("-");
    setSelectedRiderId(null);
    addWebSocketLog('system', "🔄 Telemetry timeline restored to default parameters.");
    playBeep('tick');
  };

  // Create Rider Form Action
  const handleAddRider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRiderName || !newRiderNo) return;
    
    const nextId = (Math.max(...riders.map(r => parseInt(r.id, 10) || 100)) + 1).toString();
    const mockTotalTimeMs = parseLapTimeToMs(riders[riders.length - 1]?.tTm || "0:00.000") + 2500;
    
    const freshRider: RiderResult = {
      sesId: "27E4F85A3EEBD7C5-2147484204-1073743589",
      eId: "27E4F85A3EEBD7C5-2147484204",
      id: nextId,
      btTm: formatLapTime(parseLapTimeToMs(sessionBestTime) + 2100),
      ibt: false,
      btCl: false,
      tTm: formatLapTime(mockTotalTimeMs),
      lsTm: formatLapTime(parseLapTimeToMs(sessionBestTime) + 2500),
      ls: 5,
      cl: "TaG 125",
      cln: "TaG 125",
      nam: newRiderName,
      fNam: newRiderName,
      no: newRiderNo,
      dNo: newRiderNo,
      lbpos: riders.length + 1,
      pCl: (riders.length + 1).toString(),
      pos: (riders.length + 1).toString(),
      anim: 668.0,
      asp: 0,
      if: false,
      cb: newRiderTeam || "XINGLIAN RACING"
    };

    const updated = [...riders, freshRider];
    const resorted = recalculateGaps(updated);
    setRiders(resorted);
    addWebSocketLog('system', `➕ Added racer #${newRiderNo} ${newRiderName} to active timing deck.`);
    setNewRiderName('');
    setNewRiderNo('');
    setNewRiderTeam('');
    playBeep('tick');
  };

  // Delete Rider Action
  const handleDeleteRider = (id: string, name: string) => {
    const updated = riders.filter(r => r.id !== id);
    const resorted = recalculateGaps(updated);
    setRiders(resorted);
    addWebSocketLog('system', `➖ Removed rider ID ${id} (${name}) from timing board.`);
    if (selectedRiderId === id) setSelectedRiderId(null);
    playBeep('tick');
  };

  // Inline specs edit
  const handleUpdateRiderSpecs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRider) return;

    setRiders((prev) => {
      const idx = prev.findIndex(r => r.id === editingRider.id);
      if (idx === -1) return prev;
      
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        nam: editingRider.nam,
        no: editingRider.no,
        cb: editingRider.cb,
        btTm: editingRider.btTm,
        lsTm: editingRider.lsTm
      };
      
      const resorted = recalculateGaps(copy);
      addWebSocketLog('system', `✏️ Inline specs revised for rider #${editingRider.no} ${editingRider.nam}.`);
      setEditingRider(null);
      return resorted;
    });
    playBeep('tick');
  };
  const sortedRiders = [...riders].sort((a, b) => (Number(a.pos) || a.lbpos || 0) - (Number(b.pos) || b.lbpos || 0));


  return (
    <BrowserRouter>
      <Routes>
        
        <Route
          path="/manual"
          element={
            <ManualPage
              riders={riders}
              setRiders={setRiders}
              isManualMode={isManualMode}
              setIsManualMode={setIsManualMode}
              raceTitle={raceTitle}
              setRaceTitle={setRaceTitle}
              sessionName={sessionName}
              setSessionName={setSessionName}
              groupName={groupName}
              setGroupName={setGroupName}
              raceLaps={raceLaps}
              setRaceLaps={setRaceLaps}
              laps={laps}
              setLaps={setLaps}
              lapsToGo={lapsToGo}
              setLapsToGo={setLapsToGo}
              flag={flag}
              setFlag={setFlag}
              socket={connectionRef.current}
              addWebSocketLog={addWebSocketLog}
            />
          }
        />
        <Route
          path="/trophy"
          element={
            <TrophyPage
              data={resultData.current || undefined}
              riders={riders}
              raceTitle={raceTitle}
              groupName={groupName}
              sessionName={sessionName}
            />
          }
        />
        <Route
          path="/result"
          element={
            <RaceResultPage
              data={resultData.current || undefined}
              riders={riders}
              raceTitle={raceTitle}
              groupName={groupName}
              sessionName={sessionName}
              finishedRacerPages={handleFinishedRacers}
              finishedRacerPage={finishedRacerPage}
            />
          }
        />
        <Route 
            path="/control" 
            element={
          <DisplayController 
          socket={connectionRef.current}
          connectionStatus={connectionStatus} 
          syncState={control} 
          inputVideo={controlVideoStatus} 
          errorMessage={errorMessageControl} 
          inputDevices={inputDevicesOption} 
          passSpeedHiveUrl={handleSpeedHiveUrl}
          globalRaceLaps={raceLaps}
          globalLaps={laps}
          globalLtg={lapsToGo}
          raceTitle={raceTitle}
          sessionName={sessionName}
          groupName={groupName}
          finishedPages={finishedPages}/>
        } />
        <Route 
            path="/sidePosition" 
            element={
              <SidePositionPage
                riders={riders}
                sessionName={sessionName}
                raceTitle={raceTitle}
                groupName={groupName}
                showBanner={showBanner}
                control={control}
                raceLaps={raceLaps}
                laps={laps}
                lapsToGo={lapsToGo}
                flag={flag}
                raceSeconds={raceSeconds}
                stream={stream}
                useWebcam={useWebcam}
                inputDevice={inputDevice}
                videoStatus={videoStatus}
                errorMessage={errorMessage}
                selectedRiderId={selectedRiderId}
                setSelectedRiderId={setSelectedRiderId}
                setIsSetupOpen={setIsSetupOpen}
                socket={connectionRef.current}
                inputDevices={handleInputDevices}
                customBanner={customBanner}
              />
            }
        />
        <Route 
          path="/startingGrid"
          element={
            <StartingGrid 
            circuitTitle='SIRKUIT LANUD SUTAN SJAHRIR'
            racers={riders}
            activePageIndex={startingGridPage}
            pages={handleGridPages}
            raceTitle={raceTitle}
            groupName={groupName}
            sessionName={sessionName}
          />
          }
          />
        <Route 
          path="/testRTMP"
          element={
            <WebRTCVideoPlayer 
            streamUrl='http://192.168.137.1:8889/live/iPhone/whep'
            isRtmpActive={true}
            connStatus={handleRTMPStatus}
          />
          }
          />
        <Route 
            path="/" 
            element={<MainBoardPage
              riders={riders}
              sortedRiders={sortedRiders}
              raceTitle={raceTitle}
              sessionName={sessionName}
              groupName={groupName}
              connectionStatus={connectionStatus}
              connectionError={connectionError}
              raceSeconds={raceSeconds}
              isTimerRunning={isTimerRunning}
              triggerStopwatch={triggerStopwatch}
              raceLaps={raceLaps}
              setRaceLaps={setRaceLaps}
              isClosedLoop={isClosedLoop}
              setIsClosedLoop={setIsClosedLoop}
              sessionBestTime={sessionBestTime}
              sessionBestRider={sessionBestRider}
              laps={laps}
              lapsToGo={lapsToGo}
              flag={flag}
              latestAnnouncement={latestAnnouncement}
              soundEnabled={soundEnabled}
              setSoundEnabled={setSoundEnabled}
              selectedRiderId={selectedRiderId}
              setSelectedRiderId={setSelectedRiderId}
              isSetupOpen={isSetupOpen}
              setIsSetupOpen={setIsSetupOpen}
              speedhiveUrl={speedhiveUrl || ''}
              setSpeedhiveUrl={setSpeedhiveUrl}
              handleLoadSpeedhiveSession={handleLoadSpeedhiveSession}
              setRiders={setRiders}
              setRaceTitle={setRaceTitle}
              setSessionName={setSessionName}
              setGroupName={setGroupName}
              setFlag={setFlag}
              setLatestAnnouncement={setLatestAnnouncement}
              setConnectionStatus={(c: any) => setConnectionStatus(c)}
              addWebSocketLog={addWebSocketLog}
              autoSimulate={autoSimulate}
              setAutoSimulate={setAutoSimulate}
              simSpeedSeconds={simSpeedSeconds}
              setSimSpeedSeconds={setSimSpeedSeconds}
              triggerManualOvertake={triggerManualOvertake}
              handleResetTiming={handleResetTiming}
              isEditingGrid={isEditingGrid}
              setIsEditingGrid={setIsEditingGrid}
              handleAddRider={handleAddRider}
              newRiderName={newRiderName}
              setNewRiderName={setNewRiderName}
              newRiderNo={newRiderNo}
              setNewRiderNo={setNewRiderNo}
              newRiderTeam={newRiderTeam}
              setNewRiderTeam={setNewRiderTeam}
              editingRider={editingRider}
              setEditingRider={setEditingRider}
              handleUpdateRiderSpecs={handleUpdateRiderSpecs}
              handleDeleteRider={(id: string) => handleDeleteRider(id, '')}
              isConsoleOpen={isConsoleOpen}
              setIsConsoleOpen={setIsConsoleOpen}
              webSocketLogs={webSocketLogs}
              playBeep={playBeep}
            />}
        />
        <Route 
          path="/sideposition" 
          element={<Navigate to="/sidePosition" replace />} 
        />
      </Routes>
    </BrowserRouter>
  );
}
