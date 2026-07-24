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
import { RiderResult, SignalRPacket } from './types';
import { INITIAL_RIDERS, recalculateGaps, parseLapTimeToMs, formatLapTime } from './data';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RaceResultPage } from './components/resultPage';
import {DisplayController} from './components/control';

import { ListSelectInput, SelectOption } from './components/lists';

interface RacerResult {
    id: string;
    position: number;
    riderNo: string | number;
    riderName: string;
    teamGroup: string;       // Racer's team or group (e.g. "Monster Energy Yamaha" or "Group A")
    totalTime: string;      // Total race time or gap (e.g. "23:45.123" or "+1.234s")
    bestLapTime: string;    // Best lap time (e.g. "1:28.452")
    hasFastestLap?: boolean;// Flag for fastest lap record in the session
    status?: 'FINISHED' | 'DNF' | 'DNS' | 'DSQ';
}
interface RaceEventData {
    eventName: string;       // e.g. "GRAN PREMIO D'ITALIA OAKLEY"
    groupName: string;       // e.g. "MOTOGP - RACE RESULTS" or "GROUP 1 - FINAL"
    sessionDate: string;      // e.g. "2026-07-23"
    circuitName: string;     // e.g. "Autodromo Internazionale del Mugello"
    lapsCompleted: number;  // e.g. 23
    racers: RacerResult[];
}
interface ControlState {
  laps?: boolean;
  time?: boolean;
  input?: boolean;
  rtmp?: boolean;
  [key: string]: boolean | undefined; // Allows for any other dynamic boolean/keys you might send later
}

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
  const resultData = useRef<RaceEventData>;
  const [raceLaps, setRaceLaps] = useState<number>();
  const [isClosedLoop, setIsClosedLoop] = useState<boolean>(() => {
    return localStorage.getItem('is_closed_loop') !== 'false';
  });
  const [showLTG, setShowLTG] = useState<boolean>(false);
  const [showLaps, setShowLaps] = useState<boolean>(false);
  const [showBanner, setShowBanner] = useState<boolean>(true);

  const [stream, setStream] = useState<string>('http://localhost:8889/live/iPhone/');
  const [useWebcam, setUseWebcam] = useState<boolean>(true);
  const [inputDevice, setInputDevice] = useState<string>('');
  const inputDeviceRef = useRef('');
  const lastInputDevicesRef = useRef<SelectOption[]>([]);
  
  const [inputDevices,setInputDevices] = useState<SelectOption[]>([]);
  const [inputDevicesOption,setInputDevicesOption] = useState<SelectOption[]>([]);
  // 1. Move device fetching inside a useEffect
  useEffect(() => {
    // Only query devices if we are on the /sideposition route
    console.log("RUNS ON location.pathname useeffect:", location.pathname);
    if (location.pathname !== '/sideposition') return;

    let isMounted = true;

    const getVideoInput = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputDevices = devices
          .filter((device) => device.kind === 'videoinput')
          .map((device) => ({
            value: device.deviceId,
            label: device.label || 'Video Input',
          }));

        if (isMounted) {
          setInputDevices(videoInputDevices);
        }
      } catch (err: any) {
        console.error('Failed to enumerate devices:', err);
      }
    };

    getVideoInput();

    // Listen for device changes (e.g. user plugs/unplugs a USB camera)
    navigator.mediaDevices.addEventListener('devicechange', getVideoInput);

    return () => {
      isMounted = false;
      navigator.mediaDevices.removeEventListener('devicechange', getVideoInput);
    };
  }, [location.pathname]); // Re-runs if the user navigates to /sideposition


  // 2. Your WebSocket sender useEffect stays clean
  useEffect(() => {
    const isWsOpen = connectionRef.current?.readyState === WebSocket.OPEN;
    const isSidePosition = location.pathname === '/sideposition';
    const hasDevicesChanged = inputDevices !== lastInputDevicesRef.current;
    if (isSidePosition && isWsOpen && hasDevicesChanged) {
    console.log("Sending websock");
      connectionRef.current?.send(
        JSON.stringify({
          type: 'inputDevices',
          devices: inputDevices,
        })
      );
    }

    lastInputDevicesRef.current = inputDevices;
  }, [inputDevices, location.pathname]);
  // }
  useEffect(() => {
    inputDeviceRef.current = inputDevice;

    // 1. Explicitly stop stream if on /sideposition OR no input device selected
    if (!inputDevice || location.pathname !== '/sideposition') {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setVideoStatus('error');
      setErrorMessage('Video disabled on this route');
      return;
    }

    let isMounted = true;
    setVideoStatus('connecting');
    setErrorMessage('');

    const startWebcam = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            deviceId: { exact: inputDevice }
          },
          audio: false
        });

        if (!isMounted) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play();
          setVideoStatus('connected');
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Webcam access denied or failed:", err);
        setVideoStatus('error');

        const msg = err.name === 'NotAllowedError'
          ? 'Camera permission denied by browser'
          : err.name === 'NotFoundError'
          ? 'No camera device found'
          : 'Failed to access browser camera';

        setErrorMessage(msg);
        setControlVideoStatus(msg);
      }
    };

    startWebcam();

    // 2. Global cleanup on unmount or when dependencies change
    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
}, [inputDevice, location.pathname]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [videoStatus, setVideoStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [controlVideoStatus, setControlVideoStatus] = useState<string>('connecting');
  const [errorMessageControl, setErrorMessageControl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  useEffect(() => {
    if(connectionRef.current && connectionRef.current.readyState === WebSocket.OPEN && location.pathname === '/sideposition'){
      if(videoStatus){
        connectionRef.current.send(JSON.stringify({
            type: 'videoStatus',
            status:videoStatus
          }));
      }
      if(errorMessage){
        connectionRef.current.send(JSON.stringify({
            type: 'errorMessage',
            error: errorMessage
          }));
      }
    } 
  }, [videoStatus,errorMessage]);

  useEffect(() => {
    if (!useWebcam || location.pathname !== '/sideposition' || !inputDeviceRef.current){
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      return;
    }


    let isMounted = true;
    setVideoStatus('connecting');
    setErrorMessage('');

    const startWebcam = async () => {
      try {
        // 1. Request access to camera and microphone
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            deviceId: {
              exact: inputDeviceRef.current,
            }
          },
          audio: false // Set to true if you want webcam mic audio
        });
        
        if (!isMounted) {
          // If unmounted before permission granted, stop all tracks
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = mediaStream;

        // 2. Attach stream to HTML5 Video element
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play();
          setVideoStatus('connected');
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Webcam access denied or failed:", err);
        setVideoStatus('error');

        if (err.name === 'NotAllowedError') {
          setErrorMessage('Camera permission denied by browser');
          setControlVideoStatus('Camera permission denied by browser');
        } else if (err.name === 'NotFoundError') {
          setErrorMessage('No camera device found');
          setControlVideoStatus('Camera permission denied by browser');
        } else {
          setErrorMessage('Failed to access browser camera');
          setControlVideoStatus('Failed to access browser camera');
        }
      }
    };

    startWebcam();

    // Cleanup: Turn off camera light/hardware when component unmounts
    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [useWebcam]);
  
  // const videoRef = useRef<HTMLVideoElement | null>(null);
  // const pcRef = useRef<RTCPeerConnection | null>(null);
  // const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  // const [errorMessage, setErrorMessage] = useState<string>('');

  // useEffect(() => {
  //   if (!stream) return;
    
  //   console.log("VIDEO URL:",stream);
  //   let isMounted = true;
  //   setStatus('connecting');
  //   setErrorMessage('');

  //   const connectWebRTC = async () => {
  //     try {
  //       // Clean up existing connection before creating a new one
  //       if (pcRef.current) {
  //         pcRef.current.close();
  //       }

  //       const pc = new RTCPeerConnection({
  //         iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  //       });
  //       pcRef.current = pc;

  //       pc.addTransceiver('video', { direction: 'recvonly' });
  //       pc.addTransceiver('audio', { direction: 'recvonly' });

  //       pc.ontrack = (event) => {
  //         if (videoRef.current && event.streams[0]) {
  //           videoRef.current.srcObject = event.streams[0];
  //           videoRef.current.play().catch(() => {
  //             if (videoRef.current) {
  //               videoRef.current.muted = true;
  //               videoRef.current.play();
  //             }
  //           });
  //         }
  //       };

  //       pc.onconnectionstatechange = () => {
  //         if (!isMounted) return;
  //         if (pc.connectionState === 'connected') {
  //           setStatus('connected');
  //         } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
  //           setStatus('error');
  //           setErrorMessage('Stream connection lost');
  //         }
  //       };

  //       const offer = await pc.createOffer();
  //       await pc.setLocalDescription(offer);

  //       // --- FIX 1: Wait for ICE Gathering ---
  //       if (pc.iceGatheringState !== 'complete') {
  //         await new Promise<void>((resolve) => {
  //           const checkState = () => {
  //             if (pc.iceGatheringState === 'complete') {
  //               pc.removeEventListener('icegatheringstatechange', checkState);
  //               resolve();
  //             }
  //           };
  //           pc.addEventListener('icegatheringstatechange', checkState);
  //           // Safety timeout in case STUN server hangs
  //           setTimeout(resolve, 2000); 
  //         });
  //       }

  //       if (!isMounted) return;

  //       // Send SDP with complete ICE candidates
  //       const response = await fetch(stream, {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/sdp' },
  //         body: pc.localDescription?.sdp || offer.sdp
  //       });

  //       if (!response.ok) {
  //         throw new Error(`Server returned HTTP ${response.status}`);
  //       }

  //       const answerSdp = await response.text();
        
  //       if (!isMounted) return;

  //       await pc.setRemoteDescription({
  //         type: 'answer',
  //         sdp: answerSdp
  //       });

  //     } catch (err: any) {
  //       if (!isMounted) return;
  //       console.error("WebRTC connection failed:", err);
  //       setStatus('error');
  //       setErrorMessage(err.message || 'Failed to connect to stream URL');
  //     }
  //   };

  //   connectWebRTC();

  //   return () => {
  //     isMounted = false;
  //     if (pcRef.current) {
  //       pcRef.current.close();
  //       pcRef.current = null;
  //     }
  //   };
  // }, [stream]);

  const [control, setControl] = useState<ControlState>({});

  
  useEffect(() => {
    if(control.laps || control.ltg){
      setShowBanner(true);
    }
    else{
      setShowBanner(false);
    }
    if(control.rtmp)setUseWebcam(false);
    if(control.input)setUseWebcam(true);
  }, [control]);

  // Display states mapped from Speedhive events
  const [raceTitle, setRaceTitle] = useState<string>('-');
  const [sessionName, setSessionName] = useState<string>('Live Timing Stream');
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
      // }
      // if(!sessionIdRef.current && initialLoadRef.current){
      //   console.log("No sessionId to fetch initial data for");
      //   connectSignalR("");
      //   initialLoadRef.current = false;
      // }

  }, [savedSessionId]);

  const handleSpeedHiveUrl = (passedSpeedhiveUrl: string) =>{
    // console.log("url received", passedSpeedhiveUrl);
    setSpeedhiveUrl(passedSpeedhiveUrl);
  };
  // Scrolling Announcements from hub
  const [latestAnnouncement, setLatestAnnouncement] = useState<string>('');

  // Active Riders / Telemetry grid
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

  // Add websocket log entry
  const addWebSocketLog = (direction: 'in' | 'system' | 'sent', message: string, payloadStr?: string) => {
    setSignalRLogs((prev) => {
      const timestamp = new Date().toLocaleTimeString();
      return [
        {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp,
          direction,
          message,
          rawPayload: payloadStr
        },
        ...prev
      ].slice(0, 35);
    });
  };
  const injectSignalRPacket = (packetObj: SignalRPacket) => {
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
          else if(message.type === 'askInputDevices' && location.pathname === "/sideposition"){
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
                devices: inputDevices,
              })
            );

            }
            if(location.pathname === "/control"){
              console.log("Asking input devices");
              socket.send(
              JSON.stringify({
                type: 'askInputDevices'
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
          } else if (message.type === "resultsForSessionReceived") {
            addWebSocketLog('in', `📥 resultsForSessionReceived websocket frame parsed`);
            const data = message.data;
            if (data && Array.isArray(data.results)) {
              injectSignalRPacket(data);
            }
          } else if (message.type === "sessionAddedOrUpdated") {
            addWebSocketLog('in', `🔔 Feed event: sessionAddedOrUpdated`);
            const data = message.data;
            if (data) {
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
            if(control.laps || control.ltg)setShowBanner(true);
            setControlAction(message.action);
          }
          else if(message.type === 'video'){
            setStream(message.url);
            // console.log("url sent:", message.url);
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
  const sortedRiders = [...riders].sort((a, b) => (a.pos || 0) - (b.pos || 0));


  return (
    <BrowserRouter>
      <Routes>
        
        <Route path="/result" element={<RaceResultPage data={resultData} />} />
        <Route 
            path="/" 
            element={
          <div className="min-h-screen text-zinc-100 font-sans flex flex-col bg-zinc-950 selection:bg-red-600 selection:text-white relative overflow-x-hidden" id="main-container">
            
            {/* Background Decoratives */}
            <div className="absolute top-0 right-0 w-1/3 h-full opacity-5 pointer-events-none overflow-hidden z-0">
              <div className="absolute -right-10 top-20 text-[350px] font-black italic text-zinc-400 rotate-12 leading-none select-none">GP</div>
            </div>

            {/* Broadcast Header matching "Sleek Interface" */}
            <header className={`bg-zinc-900 border-b border-zinc-850 relative z-20 shadow-xl shadow-black/40 animate-fade-in ${flag === 3 ? 'finished' : ''}`} id="timing-header">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-red-600"></div>
              <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col lg:flex-row items-center justify-between gap-4">
                
                {/* Logo Title and Live Badge */}
                <div className="flex items-center gap-6 w-full lg:w-auto">
                  <div 
                    onClick={() => {
                      setIsSetupOpen(true);
                      playBeep('tick');
                    }}
                    className={`px-3 py-1.5 text-[10px] font-black tracking-widest flex items-center gap-2 transition-all cursor-pointer select-none rounded ${
                      connectionStatus === 'connected' 
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                        : connectionStatus === 'connecting'
                          ? 'bg-amber-600 text-white hover:bg-amber-700 animate-pulse'
                          : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full bg-white ${connectionStatus === 'connected' && 'animate-ping'}`}></span>
                    {connectionStatus === 'connected' ? 'ONLINE' : connectionStatus === 'connecting' ? 'CONNECTING' : connectionStatus === 'waiting' ? 'WAITING' : 'OFFLINE' }
                  </div>
                  <div className="border-l border-zinc-700 h-8 hidden md:block"></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest leading-none">
                        {sessionName || 'Motorsports timing board'}
                      </span>
                    </div>
                    <h1 className="text-xl font-black italic tracking-tighter uppercase text-zinc-100 leading-tight">
                      {raceTitle} <span className="text-zinc-500 font-normal">/ {groupName || 'No active session'}</span>
                    </h1>
                  </div>
                </div>

                {/* CUSTOM RACE TIMER STOPWATCH CONTROL */}
                <div className="flex flex-column flex-wrap items-center gap-4 bg-zinc-950/80 border border-zinc-800 px-5 py-2.5 rounded-lg text-xs font-mono">
                  <div>
                    <div>
                      <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none mb-1">Race clock</div>
                      <div className="text-xl font-mono font-bold text-red-500 flex items-center gap-1">
                        <Clock className="w-4 h-4 text-zinc-500 animate-pulse" />
                        {formatRaceTimer(raceSeconds)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 mb-1">
                      <button
                        onClick={() => {
                          triggerStopwatch(isTimerRunning ? 'pause' : 'start');
                          playBeep('tick');
                        }}
                        className={`p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors border border-zinc-850 flex items-center gap-1 cursor-pointer`}
                        title={isTimerRunning ? "Pause timer" : "Start timer"}
                      >
                        {isTimerRunning ? <Pause className="w-3.5 h-3.5 text-amber-500" /> : <Play className="w-3.5 h-3.5 text-emerald-500" />}
                      </button>
                      <button
                        onClick={() => {
                          triggerStopwatch('reset');
                          playBeep('tick');
                        }}
                        className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors border border-zinc-800 cursor-pointer"
                        title="Reset timer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                      </button>
                    </div>
                  </div>
                  
                    {/* GEAR BOX TRIGGER FOR COLLAPSIBLE SETUP PANEL */}
                    <button
                      onClick={() => {
                        setIsSetupOpen(true);
                        playBeep('tick');
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white border border-red-700 rounded-lg text-xs font-sans font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-red-950/40"
                      title="Open Timing Desk Settings Drawer"
                    >
                      <Settings className="w-4 h-4" />
                      SETUP DESK
                    </button>
                  </div>
                  <div className="grid grid-cols-2 grid-rows-2 gap-2">
                    <div className="hidden sm:block">
                      <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none mb-1">Track target</div>
                      <div className="text-xl font-bold italic text-zinc-200 font-sans leading-none">
                        {raceLaps} <span className="text-xs text-zinc-500 font-normal">{isClosedLoop ? 'LAPS (CLOSED)' : 'POINT-TO-POINT'}</span>
                      </div>
                    </div>

                    <div className="hidden lg:block">
                      <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none mb-1">Fastest lap</div>
                      <div className="text-xl font-bold font-mono text-purple-400 leading-none">
                        {sessionBestTime} <span className="text-[10px] text-zinc-500 font-normal">({sessionBestRider})</span>
                      </div>
                    </div>
                    {isClosedLoop && (
                    <div className="hidden sm:block">
                      <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none mb-1">Laps</div>
                      <div className="text-xl font-bold italic text-zinc-200 font-sans leading-none">
                        {laps} <span className="text-xs text-zinc-500 font-normal">LAPS</span>
                      </div>
                    </div>
                    )}
                    {isClosedLoop && (
                    <div className="hidden sm:block">
                      <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none mb-1">Laps to go</div>
                      <div className="text-xl font-bold italic text-zinc-200 font-sans leading-none">
                        {(flag === 3) ? 'Finished' : lapsToGo } {flag !== 3 && (<span className="text-xs text-zinc-500 font-normal">LAPS</span>)}
                      </div>
                    </div>
                    )}
                  </div>      


              </div>
            </header>

            {/* DETAILED TRACK CONSOLE - TAKE 100% ENTIRE PAGE DISPLAY */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6 relative z-10 animate-fade-in" id="main-content">
              
              {/* LEADERBOARD VIEW PORT - 100% WIDTH FOR MAXIMUM SPACING AND CLEAN LOOK */}
              <section className="w-full flex flex-col gap-4" id="leaderboard-section">

                {/* MOTORSPORT LEADERBOARD PANEL */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-10" id="leaderboard-board-panel">
                  
                  {/* RACING TRACK LAP BANNER */}
                  <div className="bg-zinc-900/90 px-6 py-4 border-b border-zinc-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 w-[173px]">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-md shadow-emerald-500/50"></span>
                      <span className="text-xs font-black uppercase tracking-widest text-zinc-400 italic">Leaderboard Timing Console</span>
                    </div>
                          {/* LATEST ANNOUNCEMENT FLASHING TICKER */}
                    {latestAnnouncement && (
                      <div className="bg-red-950 border-y rounded-md border-red-900/50 text-red-200 flex items-center gap-3 relative overflow-hidden z-10 animate-pulse w-full">
                        <div className="flex items-center gap-2 font-black tracking-widest text-[9px] bg-red-600 text-white px-2.5 py-1 uppercase rounded leading-none shrink-0">
                          <Bell className="w-3.5 animate-bounce" /> Broadcast
                        </div>
                        <div className="font-mono text-xs md:text-sm uppercase tracking-wide truncate flex-1 font-bold">
                          {latestAnnouncement}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {soundEnabled ? (
                        <button onClick={() => setSoundEnabled(false)} className="p-1 rounded text-zinc-500 hover:text-zinc-300 cursor-pointer" title="Mute audio feed">
                          <Volume2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={() => setSoundEnabled(true)} className="p-1 rounded text-red-500 hover:text-red-400 cursor-pointer" title="Unmute audio feed">
                          <VolumeX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* LEADERBOARD HEADERS - Position, Number, Rider Name, and Time */}
                  <div className="grid grid-cols-12 bg-zinc-900/60 py-4.5 px-6 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 italic border-b border-zinc-800">
                    <div className="col-span-2 sm:col-span-1 text-right"><span className="padding-inline-end pe-4">Stat</span> Pos</div>
                    <div className="col-span-2 sm:col-span-1 text-center">No.</div>
                    <div className="col-span-5 sm:col-span-6 pl-4">Rider / Team Specifications</div>
                    <div className="col-span-3 text-right">Time telemetry (best / lst)</div>
                  </div>

                  {/* REORDERING LIST WITH SPRING LAYOUT ANIMATIONS */}
                  <div className="divide-y divide-zinc-950 p-3 min-h-[550px] bg-zinc-900/10 relative" id="riders-reordering-list">
                    <AnimatePresence initial={false}>
                      {riders.length === 0 ? (
                        <div className="text-center py-24 text-zinc-500 flex flex-col items-center justify-center gap-4 animate-fade-in">
                          <Tv className="w-12 h-12 text-zinc-700 animate-pulse" />
                          <div>
                            <h3 className="font-bold text-zinc-400 uppercase text-sm tracking-widest">No active timing feed</h3>
                            <p className="text-xs text-zinc-650 max-w-sm mt-1.5 leading-relaxed">
                              The live timing screen is ready. Paste a Speedhive Session URL into the <span className="text-red-500 font-bold">SETUP Desk</span> at the top-right to start receiving live telemetry updates.
                            </p>
                          </div>
                        </div>
                        ) : (
                            sortedRiders.map((rider, index) => {
                              // Guaranteed true ONLY for the first element in the array
                              const isLeader = index === 0;

                              // Position border indicator styles
                              const rowBorderClass = isLeader
                                ? "border-l-4 border-red-600 bg-zinc-900/40 hover:bg-zinc-800/60"
                                : "border-l-4 border-zinc-700 bg-zinc-900/10 hover:bg-zinc-800/50";

                              const posTextStyle = isLeader
                                ? "text-3xl font-black italic text-red-600 font-mono tracking-tight"
                                : "text-2xl font-black italic text-zinc-400 font-mono tracking-tight";

                              // Flash highlighting on position changes
                              const isRecentlyChanged = rider.changeTime && (Date.now() - rider.changeTime < 1300);
                              const flashClass = isRecentlyChanged
                                ? rider.changeDirection === 'up'
                                  ? 'bg-emerald-950/60 border-l-emerald-500 transition-all duration-300'
                                  : rider.changeDirection === 'down'
                                    ? 'bg-red-950/60 border-l-red-500 transition-all duration-300'
                                    : ''
                                : '';

                              const isSelected = selectedRiderId === rider.id;

                              return (
                                <motion.div
                                  key={rider.id}
                                  layoutId={`rider-row-${rider.id}`}
                                  className={`grid grid-cols-12 items-center py-4 px-6 my-2.5 rounded-r-lg border-y border-r border-transparent transition-all duration-500 cursor-pointer ${
                                    isSelected ? 'bg-zinc-850 border-zinc-700 shadow-2xl' : rowBorderClass
                                  } ${flashClass}`}
                                  id={`rider-row-${rider.id}`}
                                  onClick={() => {
                                    setSelectedRiderId(isSelected ? null : rider.id);
                                    setIsSetupOpen(true);
                                    playBeep('tick');
                                  }}
                                >
                                  {/* POSITION & DELTA */}
                                  <div className="col-span-2 sm:col-span-1 flex items-center justify-self-end gap-3 pe-4">
                                    <div className="hidden sm:block">
                                      {rider.changeDirection === 'up' && (
                                        <ChevronUp className="w-4 h-4 text-emerald-500" />
                                      )}
                                      {rider.changeDirection === 'down' && (
                                        <ChevronDown className="w-4 h-4 text-red-500" />
                                      )}
                                      {(!rider.changeDirection || rider.changeDirection === 'steady') && (
                                        <span className="text-zinc-650 text-3xl font-bold">
                                          {rider.if ? '🏁' : '-'}
                                        </span>
                                      )}
                                    </div>

                                    <span className={posTextStyle} id={`rider-pos-${rider.id}`}>
                                      {(index + 1).toString().padStart(2, '0')}
                                    </span>
                                  </div>

                                  {/* VEHICLE NO */}
                                  <div className="col-span-2 sm:col-span-1 text-center">
                                    <span className="text-3xl font-black italic tracking-tighter text-zinc-100 select-none font-sans">
                                      {rider.no}
                                    </span>
                                  </div>

                                  {/* RIDER NAME / TEAM */}
                                  <div className="col-span-5 sm:col-span-6 pl-4">
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-2.5">
                                        <span className="text-lg md:text-xl font-black uppercase tracking-tight text-zinc-100 leading-none">
                                          {rider.nam}
                                        </span>
                                        
                                        {rider.ibt && (
                                          <span className="text-[8px] bg-purple-950 text-purple-300 font-extrabold px-1.5 py-0.5 rounded border border-purple-600/40 flex items-center gap-0.5 uppercase tracking-wider leading-none">
                                            <Sparkles className="w-2.5 h-2.5 shrink-0" /> RECORD
                                          </span>
                                        )}
                                      </div>
                                      {rider.cb && (
                                        <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1.5 leading-none truncate font-sans">
                                          {rider.cb}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* BEST & LAST TIMINGS */}
                                  <div className="col-span-3 text-right flex flex-col justify-center">
                                    <div className="font-mono text-lg md:text-xl font-black text-zinc-100 tracking-tight leading-none">
                                      {rider.btTm || "--:--.---"}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 font-mono mt-1.5 leading-none uppercase tracking-wider flex items-center justify-end gap-1">
                                      <span className="font-bold">LST:</span> {rider.lsTm || "--:--.---"}
                                      {rider.ls !== undefined && (
                                        <span className="text-zinc-650 bg-zinc-950 px-1 py-0.2 rounded font-normal text-[8px] border border-zinc-850 ml-1">
                                          L.{rider.ls}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })
                        )}
                    </AnimatePresence>
                  </div>

                </div>
              </section>

            </main>
            {/* SETTINGS COLLAPSIBLE DRAWER PANEL */}
            <AnimatePresence>
              {isSetupOpen && (
                <>
                  {/* Dark blur overlay backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsSetupOpen(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
                  />

                  {/* Sidebar drawer content */}
                  <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 26, stiffness: 210 }}
                    className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 flex flex-col overflow-hidden"
                    id="settings-drawer"
                  >
                    {/* Drawer Header */}
                    <div className="bg-zinc-950 px-6 py-5 border-b border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Settings className="w-5 h-5 text-red-500 animate-spin-slow" />
                        <div>
                          <h2 className="text-sm font-black tracking-widest uppercase text-zinc-200">Timing Desk Setup</h2>
                          <p className="text-[10px] text-zinc-500 font-mono">SIGNALR FEED & SYSTEM CONFIG</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsSetupOpen(false)}
                        className="p-1.5 rounded-md hover:bg-zinc-850 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Drawer Scroll Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                      {/* SPEEDHIVE WS FEEDS CONFIG */}
                      <div className="space-y-3 bg-zinc-950/40 p-4 border border-zinc-800 rounded-xl">
                        <h3 className="text-xs font-black tracking-widest uppercase text-red-500 italic flex items-center gap-1.5">
                          <Link className="w-3.5 h-3.5 animate-pulse" /> Speedhive Live timing URL
                        </h3>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Enter the entire Speedhive session page URL. The applet automatically parses the active WebSocket session parameter and starts the telemetry feed.
                        </p>
                        
                        <div className="space-y-2">
                          <textarea
                            value={speedhiveUrl}
                            onChange={(e) => setSpeedhiveUrl(e.target.value)}
                            placeholder="Paste Speedhive session URL here..."
                            className="w-full h-20 bg-zinc-500 border border-zinc-800 p-3 rounded text-xs font-mono text-zinc-300 focus:outline-none focus:border-red-600 leading-relaxed"
                          />
                          <div className="text-[9px] text-zinc-500 font-mono leading-relaxed bg-zinc-950 p-2.5 rounded border border-zinc-850">
                            <strong>Supported Format Example:</strong><br />
                            https://speedhive.mylaps.com/livetiming/BB89C9A089830254-2147485566/sessions/BB89C9A089830254-2147485566-1073745079
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => {
                              setRiders(recalculateGaps(INITIAL_RIDERS));
                              setRaceTitle('-');
                              setSessionName('Live Timing Stream');
                              setGroupName('-');
                              setFlag(0);
                              addWebSocketLog('system', 'New Speedhive configurations');
                              setConnectionStatus('setting up');      
                              setLatestAnnouncement("");
                              handleLoadSpeedhiveSession()
                            }}
                            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-sans font-black uppercase tracking-wider text-xs rounded transition-all cursor-pointer text-center"
                          >
                            Connect Live Stream
                          </button>
                          {speedhiveUrl && (
                            <button
                              onClick={() => {
                                setSpeedhiveUrl('');
                                localStorage.removeItem('speedhive_url');
                                setRiders(recalculateGaps(INITIAL_RIDERS));
                                setRaceTitle('-');
                                setSessionName('Live Timing Stream');
                                setGroupName('-');
                                setConnectionStatus('disconnected')
                                setFlag(0);
                                setLatestAnnouncement("");
                                addWebSocketLog('system', '🧹 Speedhive configurations reset back to pristine demo starting grid.');
                              }}
                              className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-bold uppercase tracking-wider rounded cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>

                      {/* SIGNALR HUB CONNECTION STATE */}
                      <div className="space-y-3 bg-zinc-950/40 p-4 border border-zinc-800 rounded-xl">
                        <h3 className="text-xs font-black tracking-widest uppercase text-zinc-400 italic">
                          Connection Info Status
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                          <div className="bg-zinc-950 p-2.5 border border-zinc-850 rounded">
                            <span className="text-zinc-500 text-[9px] uppercase font-bold block leading-none">Hub Status</span>
                            <span className={`font-bold mt-1.5 block flex items-center gap-1.5 ${
                              connectionStatus === 'connected' 
                                ? 'text-emerald-400' 
                                : connectionStatus === 'connecting' || connectionStatus === 'setting up'
                                  ? 'text-amber-400' 
                                  : 'text-red-500'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                connectionStatus === 'connected' 
                                  ? 'bg-emerald-400 animate-pulse' 
                                  : connectionStatus === 'connecting' 
                                    ? 'bg-amber-400 animate-ping' 
                                    : 'bg-red-500'
                              }`} />
                              {connectionStatus.toUpperCase()}
                            </span>
                          </div>
                          <div className="bg-zinc-950 p-2.5 border border-zinc-850 rounded">
                            <span className="text-zinc-500 text-[9px] uppercase font-bold block leading-none">Session Code</span>
                            <span className="text-zinc-300 font-bold mt-1.5 block truncate">
                              {parseSpeedhiveUrl(speedhiveUrl).sessionId ? parseSpeedhiveUrl(speedhiveUrl).sessionId?.substring(0, 10) + '...' : 'Demo Mode'}
                            </span>
                          </div>
                        </div>

                        {connectionError && (
                          <div className="p-2.5 bg-red-950/40 border border-red-900 text-red-300 text-[10px] font-mono rounded leading-relaxed">
                            <strong>WebSocket Error:</strong> {connectionError}
                          </div>
                        )}
                      </div>

                      {/* NUMBER OF RACE LAPS AND OPEN TRACK OPTIONS */}
                      <div className="space-y-3 bg-zinc-950/40 p-4 border border-zinc-800 rounded-xl">
                        <h3 className="text-xs font-black tracking-widest uppercase text-zinc-400 italic">
                          Race Grid Configuration
                        </h3>
                        
                        <div className="space-y-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Number of Race Laps</label>
                            <input
                              type="number"
                              min="1"
                              max="200"
                              value={raceLaps}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 12;
                                setRaceLaps(val);
                                localStorage.setItem('race_laps', val.toString());
                              }}
                              className="bg-zinc-950 border border-zinc-800 px-3 py-2 rounded text-xs text-zinc-100 font-mono focus:outline-none focus:border-red-600"
                            />
                          </div>

                          <div className="flex items-center justify-between py-2 border-t border-zinc-850">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-zinc-200">Closed Loop Track Circuit</span>
                              <span className="text-[10px] text-zinc-500 font-mono">Uncheck for Open Loop point-to-point race</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={isClosedLoop}
                              onChange={(e) => {
                                setIsClosedLoop(e.target.checked);
                                localStorage.setItem('is_closed_loop', e.target.checked.toString());
                              }}
                              className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600 bg-zinc-950 border-zinc-800 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>

                      {/* DYNAMIC SANDBOX SIMULATION SYSTEM */}
                      <div className="space-y-3 bg-zinc-950/40 p-4 border border-zinc-800 rounded-xl">
                        <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                          <h3 className="text-xs font-black tracking-widest uppercase text-zinc-400 italic flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-red-500" /> AI Race Simulator
                          </h3>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase font-bold flex items-center gap-1 ${
                            autoSimulate ? 'bg-emerald-950 border border-emerald-800 text-emerald-400' : 'bg-zinc-950 border border-zinc-850 text-zinc-500'
                          }`}>
                            {autoSimulate ? 'Enabled' : 'Paused'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Toggle automatic grid updates to simulate race progress, position swaps, sector timing shifts, and record lap events.
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => { setAutoSimulate(true); playBeep('tick'); }}
                            className={`py-2 px-3 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              autoSimulate ? 'bg-red-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                            }`}
                          >
                            <Play className="w-3.5 h-3.5" /> Start Sim
                          </button>
                          <button
                            onClick={() => { setAutoSimulate(false); playBeep('tick'); }}
                            className={`py-2 px-3 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              !autoSimulate ? 'bg-red-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                            }`}
                          >
                            <Pause className="w-3.5 h-3.5" /> Pause Sim
                          </button>
                        </div>

                        <div className="flex flex-col gap-2 pt-1 border-t border-zinc-850">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">Grid Shift Period</span>
                            <span className="text-red-500 font-extrabold">{simSpeedSeconds} SECONDS</span>
                          </div>
                          <input 
                            type="range" 
                            min="1" 
                            max="15" 
                            step="1"
                            value={simSpeedSeconds}
                            onChange={(e) => setSimSpeedSeconds(parseInt(e.target.value, 10))}
                            className="w-full h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-red-600"
                          />
                        </div>

                        <div className="border border-zinc-800 bg-zinc-950 p-3 rounded-lg flex flex-col gap-2">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-extrabold font-mono">Sim Command Actions</span>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={triggerManualOvertake}
                              className="py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-100 uppercase tracking-wide font-black text-[10px] rounded transition-all flex items-center justify-center gap-1 border border-zinc-800 cursor-pointer"
                            >
                              <Zap className="w-3.5 h-3.5 text-red-500 animate-pulse" /> Force Swap
                            </button>
                            <button
                              onClick={handleResetTiming}
                              className="py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-100 uppercase tracking-wide font-black text-[10px] rounded transition-all flex items-center justify-center gap-1 border border-zinc-800 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" /> Reset All
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* ADD RACER GRID CUSTOMIZATION PANEL */}
                      <div className="space-y-3 bg-zinc-950/40 p-4 border border-zinc-800 rounded-xl">
                        <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                          <h3 className="text-xs font-black tracking-widest uppercase text-zinc-400 italic">
                            Rider Pack Management
                          </h3>
                          <button
                            onClick={() => setIsEditingGrid(!isEditingGrid)}
                            className="text-[9px] font-bold bg-zinc-950 px-2.5 py-1 rounded hover:bg-zinc-850 hover:text-white text-zinc-400 font-mono transition-all border border-zinc-850 uppercase tracking-wider cursor-pointer"
                          >
                            {isEditingGrid ? 'Close Form' : 'Add Rider'}
                          </button>
                        </div>

                        {isEditingGrid && (
                          <form onSubmit={handleAddRider} className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-zinc-850" id="add-rider-form">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] text-zinc-500 uppercase font-black">Rider Name</label>
                                <input 
                                  type="text" 
                                  placeholder="Maxim Kirwan"
                                  value={newRiderName}
                                  onChange={(e) => setNewRiderName(e.target.value)}
                                  className="bg-zinc-900 text-xs px-3 py-2 rounded text-zinc-100 border border-zinc-800 focus:outline-none focus:border-red-600"
                                  required
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] text-zinc-500 uppercase font-black">Number</label>
                                <input 
                                  type="text" 
                                  placeholder="68"
                                  value={newRiderNo}
                                  onChange={(e) => setNewRiderNo(e.target.value)}
                                  className="bg-zinc-900 text-xs px-3 py-2 rounded text-zinc-100 border border-zinc-800 focus:outline-none focus:border-red-600 font-mono"
                                  required
                                />
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] text-zinc-500 uppercase font-black">Club Name / Team Team</label>
                              <input 
                                type="text" 
                                placeholder="Team Name"
                                value={newRiderTeam}
                                onChange={(e) => setNewRiderTeam(e.target.value)}
                                className="bg-zinc-900 text-xs px-3 py-2 rounded text-zinc-100 border border-zinc-800 focus:outline-none focus:border-red-600 w-full"
                              />
                            </div>

                            <button
                              type="submit"
                              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <PlusCircle className="w-4 h-4" /> Add Rider To Grid
                            </button>
                          </form>
                        )}

                        {/* Inline profile editor panel if a rider row is highlighted */}
                        {selectedRiderId && (
                          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3" id="selected-rider-telemetry-profile">
                            {(() => {
                              const rider = riders.find(r => r.id === selectedRiderId);
                              if (!rider) return <p className="text-xs text-zinc-500">Rider record not found.</p>;
                              return (
                                <>
                                  <div className="flex justify-between items-start border-b border-zinc-850 pb-2">
                                    <div>
                                      <span className="text-[9px] uppercase font-black tracking-wider text-red-500 italic">Rider Specs Profile</span>
                                      <h3 className="text-sm font-bold text-zinc-100 uppercase">{rider.nam}</h3>
                                    </div>
                                    <span className="text-2xl font-black italic text-zinc-100">
                                      #{rider.no}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                                    <div>
                                      <span className="text-zinc-500 text-[9px] block leading-none uppercase font-black">Class Team</span>
                                      <span className="text-zinc-300 font-bold block truncate">{rider.cb || "-"}</span>
                                    </div>
                                    <div>
                                      <span className="text-zinc-500 text-[9px] block leading-none uppercase font-black font-mono">Lap record</span>
                                      <span className="text-zinc-300 font-bold">{rider.btTm || "--:--.---"}</span>
                                    </div>
                                  </div>

                                  {editingRider?.id === rider.id ? (
                                    <form onSubmit={handleUpdateRiderSpecs} className="space-y-3.5 border-t border-zinc-800 pt-3" id="inline-edit-profile-form">
                                      <span className="text-[9px] text-red-500 font-black uppercase tracking-wider italic block">Inline Edit Specifications</span>
                                      
                                      <div className="grid grid-cols-2 gap-2">
                                        <input 
                                          type="text" 
                                          value={editingRider.nam} 
                                          onChange={(e) => setEditingRider({ ...editingRider, nam: e.target.value })}
                                          className="bg-zinc-900 p-2 text-xs text-zinc-100 rounded border border-zinc-800"
                                          placeholder="Name"
                                        />
                                        <input 
                                          type="text" 
                                          value={editingRider.no} 
                                          onChange={(e) => setEditingRider({ ...editingRider, no: e.target.value })}
                                          className="bg-zinc-900 p-2 text-xs text-zinc-100 rounded border border-zinc-800 font-mono"
                                          placeholder="No"
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                        <input 
                                          type="text" 
                                          value={editingRider.btTm} 
                                          onChange={(e) => setEditingRider({ ...editingRider, btTm: e.target.value })}
                                          className="bg-zinc-900 p-2 text-xs text-zinc-100 rounded border border-zinc-800 font-mono"
                                          placeholder="Best Lap"
                                        />
                                        <input 
                                          type="text" 
                                          value={editingRider.cb} 
                                          onChange={(e) => setEditingRider({ ...editingRider, cb: e.target.value })}
                                          className="bg-zinc-900 p-2 text-xs text-zinc-100 rounded border border-zinc-800"
                                          placeholder="Team Name"
                                        />
                                      </div>

                                      <div className="flex gap-2">
                                        <button
                                          type="submit"
                                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold uppercase tracking-wider cursor-pointer"
                                        >
                                          Save Specs
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingRider(null)}
                                          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded text-xs font-mono cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    <div className="flex items-center gap-2 border-t border-zinc-850 pt-2.5">
                                      <button
                                        onClick={() => setEditingRider({ ...rider })}
                                        className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-zinc-100 rounded text-xs font-bold uppercase tracking-wider transition-all border border-zinc-800 flex items-center justify-center gap-1.5 cursor-pointer"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" /> Edit specs
                                      </button>
                                      
                                      <button
                                        onClick={() => handleDeleteRider(rider.id, rider.nam)}
                                        className="px-3 py-2 bg-red-950/60 hover:bg-red-900/60 text-red-450 hover:text-red-200 rounded text-xs font-bold uppercase tracking-wider transition-all border border-red-900/30 flex items-center justify-center gap-1.5 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" /> Remove
                                      </button>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* MICRO BROADCAST LOGS */}
                      <div className="space-y-3 bg-zinc-950/40 p-4 border border-zinc-800 rounded-xl">
                        <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                          <h3 className="text-xs font-black tracking-widest uppercase text-zinc-400 italic flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-red-500" /> WebSockets Feeder Logs
                          </h3>
                          <button 
                            onClick={() => setSignalRLogs([])} 
                            className="text-[9px] uppercase font-mono text-red-500 hover:text-red-400 transition-all font-bold tracking-widest cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>

                        <div className="h-44 overflow-y-auto font-mono text-[10px] flex flex-col gap-2 divide-y divide-zinc-950 leading-normal" id="signalr-logs-list">
                          {signalRLogs.length === 0 ? (
                            <div className="text-zinc-650 italic py-4 text-center">Console is empty. Waiting for SignalR client activity...</div>
                          ) : (
                            signalRLogs.map((log) => (
                              <div key={log.id} className="pt-2 flex flex-col gap-1 first:pt-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] text-zinc-500">{log.timestamp}</span>
                                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase ${
                                    log.direction === 'in' 
                                      ? 'bg-[#ffe4e6]/10 text-red-400 border border-red-900/30' 
                                      : log.direction === 'sent' 
                                        ? 'bg-zinc-950 text-zinc-400 border border-zinc-850' 
                                        : 'bg-zinc-950 text-zinc-500 border border-zinc-850'
                                  }`}>
                                    {log.direction === 'in' ? 'WS RECV' : log.direction === 'sent' ? 'WS PUSH' : 'SYS'}
                                  </span>
                                </div>
                                <span className="text-zinc-300 break-words font-mono leading-relaxed">{log.message}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Drawer Footer */}
                    <div className="bg-zinc-950 px-6 py-4 border-t border-zinc-800 text-center text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-bold">
                      🖧 SignalR /racingHub Link Engine
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* FOOTER TIMING STRIP */}
            <footer className="bg-zinc-900 border-t border-zinc-850 py-4 text-center text-[10px] font-mono text-zinc-500 mt-auto uppercase tracking-wider font-bold" id="timing-footer">
              <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span>Broadcast Desk • Built for Speed • © 2026 Fathir Pahlevi</span>
                <span>Feed monitors active • 120hz frame cycles</span>
              </div>
            </footer>

          </div>} 
        />
        <Route 
            path="/control" 
            element={
          <DisplayController socket={connectionRef.current} connectionStatus={connectionStatus} syncState={control} inputVideo={controlVideoStatus} errorMessage={errorMessageControl} inputDevices={inputDevicesOption} passSpeedHiveUrl={handleSpeedHiveUrl}/>
        } />
        <Route 
            path="/sidePosition" 
            element={
          <div className={`mt-2 w-full min-h-screen text-zinc-100 font-sans flex flex-col relative overflow-x-hidden`} id="main-container">
            <div className='ml-2 flex flex-row w-fit h-[73px]'>
              <div className='p-3 bg-blue-800 flex flex-row'>
                <div className='w-[100px] logoYcr'></div>

                <div className='flex flex-col w-fit gap-2'>
                  <div className="flex items-center gap-2">
                    <span className="text-md font-bold text-zinc-300 uppercase tracking-widest leading-none">
                      {sessionName || 'Motorsports timing board'}
                    </span>
                  </div>
                  <h1 className="text-xl font-black italic tracking-tighter uppercase text-zinc-100 leading-tight">
                    {raceTitle} <span className="text-zinc-300 font-normal">/ {groupName || 'No active session'}</span>
                  </h1>
                </div>
              
              </div>
                {showBanner && (
                  <div className="w-fit flex gap-2 h-full bg-blue-950/95 p-4">
                    <div className='mt-auto w-fit flex gap-2 h-min'>
                      {(control.laps && !control.ltg) && (
                        <div className="text-3xl font-bold italic text-zinc-200 font-sans leading-none">
                          {laps} <span className="text-lg text-zinc-300 font-normal">LAPS</span>
                        </div>
                      )}
                      {(control.laps && control.ltg && flag !== 3) && (
                      <div className="h-min">
                        <div className="text-3xl font-bold text-zinc-200 font-sans leading-none">
                          <span className="text-2xl text-zinc-300 font-normal mr-3">LAP</span>{laps}
                        <span className='text-3xl text-zinc-600'> / </span>
                        
                          {(flag === 3) ? ' Finished' : raceLaps ? raceLaps : lapsToGo ? `${lapsToGo}` : '' } {(flag !== 3 && !raceLaps && lapsToGo) && (<span className="text-3xl text-zinc-500 font-normal">Laps to go</span>)}
                        </div>
                      </div>)}
                      {(!control.laps && control.ltg || flag === 3) && (
                      <div className="h-min">
                        <div className="text-3xl font-bold italic text-zinc-200 font-sans leading-none">
                          {(flag === 3) ? 'Finished' : lapsToGo } {flag !== 3 && (<span className="text-lg text-zinc-500 font-normal">Laps to go</span>)}
                        </div>
                      </div>
                      )}
                    </div>
                  </div>  
                )}
            </div>
            <div className='flex flex-col bg-zinc-900 w-fit p-3 ml-2 gap-2'>
              <div className="text-3xl font-mono text-white flex items-center gap-1">
                {formatRaceTimer(raceSeconds)}
              </div>
            </div>
            {/* DETAILED TRACK CONSOLE - TAKE 100% ENTIRE PAGE DISPLAY */}
            <main className="flex-1 max-w-7xl w-full mx-0 p-1 flex flex-col relative z-10 animate-fade-in" id="main-content">
              <div className={`${control.video ? useWebcam ? videoStatus === "connected" ? "" : "hidden" : "hidden" : 'hidden'} ml-1 w-[400px] bg-slate-950 rounded-t-lg overflow-hidden border border-slate-800 shadow-2xl font-sans`}>
                {/* Stream Header */}
                <div className="hidden flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      {videoStatus === 'connected' && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      )}
                      <span
                        className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                          videoStatus === 'connected'
                            ? 'bg-red-600'
                            : status === 'connecting'
                            ? 'bg-amber-500 animate-pulse'
                            : 'bg-slate-600'
                        }`}
                      />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      {stream}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase">
                    {videoStatus}
                  </span>
                </div>

                {/* 400px Video Viewport (16:9 Aspect Ratio) */}
                <div className="relative aspect-video w-full flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Status Overlays */}
                  {videoStatus !== 'connected' &&(
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-4 text-center">
                      {status === 'connecting' && (
                        <p className="text-xs font-mono text-slate-400 animate-pulse">
                          CONNECTING...
                        </p>
                      )}
                      {videoStatus === 'error' && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-red-400">SIGNAL LOST</p>
                          <p className="text-[10px] font-mono text-slate-500 max-w-[300px] truncate">
                            {errorMessage}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* LEADERBOARD VIEW PORT - 100% WIDTH FOR MAXIMUM SPACING AND CLEAN LOOK */}
              <section className="w-full flex flex-col gap-4" id="leaderboard-section">

                  {/* REORDERING LIST WITH SPRING LAYOUT ANIMATIONS */}
                  <div className="divide-y divide-zinc-950w-full min-h-[550px] relative" id="riders-reordering-list">
                    <AnimatePresence initial={false}>
                      {riders.length === 0 ? (
                        <div className="text-zinc-100 flex flex-col gap-4 animate-fade-in animate-pulse">
                          -
                        </div>
                      ) : (
                        riders.map((rider, index) => {
                          const showUI = {gap: false, gapTime: 0, diff: false};
                          if(typeof rider.df === 'number') {
                            if(rider.df >= 4 && rider.df < 5) {
                              showUI.diff = true;
                            }
                          }
                          const isLeader = index === 0;

                          // Position border indicator styles
                          const rowBorderClass = isLeader 
                            ? "border-l-4 border-red-600 bg-zinc-900/79" 
                            : "border-l-4 border-zinc-700 bg-zinc-900/70 ";

                          const posTextStyle = isLeader 
                            ? "text-2xl font-mono font-bold text-white tracking-tight" 
                            : "text-2xl font-mono font-bold text-white tracking-tight";

                          // Highlight flashes on overtake swap events
                          const isRecentlyChanged = rider.changeTime && (Date.now() - rider.changeTime < 1300);
                          const flashClass = isRecentlyChanged
                            ? rider.changeDirection === 'up'
                              ? 'border-l-emerald-500'
                              : rider.changeDirection === 'down'
                                ? 'border-l-red-500'
                                : ''
                            : '';
                            const posState = isRecentlyChanged
                            ? rider.changeDirection === 'up'
                              ? 'bg-emerald-950/60 border-l-emerald-500 transition-all duration-300'
                              : rider.changeDirection === 'down'
                                ? 'bg-red-950/60 border-l-red-500 transition-all duration-300'
                                : ''
                            : '';

                          return (
                            <motion.div
                              layoutId={`rider-row-${rider.id}`}
                              key={rider.id}
                              className={`${showUI.diff ? 'mt-8 ' : ''}my-1 ${control.laps ? '' : ''} w-full flex items-center flex-row border-transparent pointer border-l-4 ${flashClass}`}
                              id={`rider-row-${rider.id}`}
                              onClick={() => {
                                setSelectedRiderId(rider.id === selectedRiderId ? null : rider.id);
                                setIsSetupOpen(true); // open setup pane to modify/inspect selected rider
                                playBeep('tick');
                              }}
                            >
                              <div key={`rider-${rider.id}`} className={`flex items-center grid-cols-8 w-[400px] h-full grid border-zinc-700 bg-zinc-950/90`}>
                                {/* POSITION */}
                                <div className="col-span-1 flex items-center justify-center">
                                  {/* Delta arrows */}
                                  <div className="">
                                    {rider.changeDirection === 'up' && (
                                      <ChevronUp className="w-4 h-4 text-emerald-500" />
                                    )}
                                    {rider.changeDirection === 'down' && (
                                      <ChevronDown className="w-4 h-4 text-red-500" />
                                    )}
                                    {(!rider.changeDirection || rider.changeDirection !== 'up' && rider.changeDirection !== 'down') && (
                                      <span className="text-zinc-650 text-xl font-bold" id={`rider-pos-${rider.id}`}>
                                    {`${rider.pos}`}
                                      </span>
                                    )}
                                  </div>
                                  {/* <span className={`${posTextStyle}`} id={`rider-pos-${rider.id}`}>
                                    {`${(index + 1).toString()}`}
                                  </span> */}
                                </div>
                                
                                {/* RIDER NAME / TEAM */}
                                <div className="col-span-5 pl-4 flex items-center h-full bg-linear-to-r from-blue-950/70 to-black/0">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-lg font-black uppercase tracking-tight leading-none">
                                        {`${fitName(rider.nam, 8)}`}
                                      </span>
                                    {(rider.changeDirection === 'steady' && rider.if === true) && (
                                      <span className="text-zinc-650 text-3xl font-bold">🏁</span>
                                    )}
                                      
                                      {/* {rider.ibt && (
                                        <span className="text-[8px] bg-purple-950 text-purple-300 font-extrabold px-1.5 py-0.5 rounded border border-purple-600/40 flex items-center gap-0.5 uppercase tracking-wider leading-none">
                                          <Sparkles className="w-2.5 h-2.5 shrink-0" /> RECORD
                                        </span>
                                      )} */}
                                    </div>
                                    {rider.cb && (
                                      <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1.5 leading-none truncate font-sans">
                                        {rider.cb}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                
                                {/* VEHICLE NO */}
                                <div className="col-span-2 my-1 rounded-l-lg bg-linear-to-r from-blue-700/100 to-blue-700/70 text-center">
                                  <span className="text-xl italic tracking-tighter text-white select-none font-sans">
                                    {rider.no}
                                  </span>
                                </div> 
                              </div>
                              
                              <div className='flex flex-row'>
                                {/* BEST & LAST TIMINGS */}
                                {(rider.df || rider.gp) && (
                                <div className={`${control.time ? "" : "hidden"} w-[110px] text-right flex flex-col justify-center bg-zinc-950/90 border border-zinc-800 px-2 py-0.5 gap-1`}>
                                  <div className="font-mono text-xl font-semibold text-zinc-100 tracking-tight leading-none">
                                    {isLeader ? control.gap ? 'INTERVAL' : 'GAP'  : control.gap ? rider.gp : control.diff ? rider.df : rider.df ? rider.dfCl : "-"}
                                  </div>
                                  {/* <div className="text-[10px] text-zinc-500 font-mono mt-1.5 leading-none uppercase tracking-wider flex items-center justify-end gap-1">
                                    <span className="font-bold">BEST:</span> {rider.btTm || "--:--.---"}
                                    {rider.ls !== undefined && (
                                      <span className="text-zinc-650 bg-zinc-950 px-1 py-0.2 rounded font-normal text-[8px] border border-zinc-850 ml-1">laps{rider.ls}</span>
                                    )}
                                  </div> */}
                                </div>)}
                                {rider.btTm && (
                                <div className={`${control.best ? '' : 'hidden'} text-left flex flex-row text-lg font-black leading-none uppercase tracking-wider flex items-center justify-end gap-1 border-zinc-800 rounded px-2 bg-zinc-950/90 border border-zinc-800`}>
                                  <span className="font-bold">BEST:</span> {rider.btTm}
                                  {/* {rider.ls !== undefined && (
                                    <span className="text-zinc-650 bg-zinc-950 px-1 py-0.2 rounded font-normal text-[8px] border border-zinc-850 ml-1">laps{rider.ls}</span>
                                  )} */}
                                </div>)}
                              </div>
                              
                            </motion.div>
                          );
                        })
                      )}
                    </AnimatePresence>
                  </div>
              </section>

            </main>
          </div>} 
        />
        <Route 
          path="/sideposition" 
          element={<Navigate to="/sidePosition" replace />} 
        />
      </Routes>
    </BrowserRouter>
  );
}
