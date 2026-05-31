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
  Gauge
} from 'lucide-react';
import { RiderResult, SignalRPacket } from './types';
import { INITIAL_RIDERS, recalculateGaps, parseLapTimeToMs, formatLapTime } from './data';

export default function App() {
  // App variables
  const [riders, setRiders] = useState<RiderResult[]>(() => {
    return recalculateGaps(INITIAL_RIDERS);
  });
  
  // Track previous state for flashes and change directions
  const previousPositionsRef = useRef<{ [riderId: string]: number }>({});
  
  // UI Display Modes
  // 'broadcast' is the exact minimal requested mode: shows position, rider number, and rider name with giant eye-catching typography
  // 'telemetry' is the complete advanced racing dashboard mode
  const [displayMode, setDisplayMode] = useState<'broadcast' | 'telemetry'>('broadcast');
  const [autoSimulate, setAutoSimulate] = useState<boolean>(true);
  const [simSpeedSeconds, setSimSpeedSeconds] = useState<number>(4);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [liveLogCount, setLiveLogCount] = useState<number>(1);
  
  // SignalR Simulated Log Stream
  const [signalRLogs, setSignalRLogs] = useState<Array<{
    id: string;
    timestamp: string;
    direction: 'in' | 'system' | 'sent';
    message: string;
    rawPayload?: string;
  }>>([
    {
      id: "initial-0",
      timestamp: new Date().toLocaleTimeString(),
      direction: 'system',
      message: "🔄 Microsoft SignalR Service connected. Protocol: JSON v1. Transport: WebSockets."
    },
    {
      id: "initial-1",
      timestamp: new Date().toLocaleTimeString(),
      direction: 'in',
      message: "📥 Broadcast received: type=0 (Session Initialization timing frame)",
      rawPayload: JSON.stringify({ type: 0, results: INITIAL_RIDERS.slice(0, 2) }, null, 2)
    }
  ]);

  // JSON Input frame for manual websocket parsing sandbox
  const [rawJsonInput, setRawJsonInput] = useState<string>(() => {
    return JSON.stringify({
      type: 0,
      results: INITIAL_RIDERS.slice(0, 3)
    }, null, 2);
  });

  // Racing state tracker (Lap number and elapsed session time)
  const [currentLap, setCurrentLap] = useState<number>(5);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(325.61);
  const [sessionBestTime, setSessionBestTime] = useState<string>("1:04.344");
  const [sessionBestRider, setSessionBestRider] = useState<string>("廖梓旭");

  // Grid / Rider Editing & Creation states
  const [isEditingGrid, setIsEditingGrid] = useState<boolean>(false);
  const [editingRider, setEditingRider] = useState<RiderResult | null>(null);
  const [newRiderName, setNewRiderName] = useState('');
  const [newRiderNo, setNewRiderNo] = useState('');
  const [newRiderTeam, setNewRiderTeam] = useState('');

  // Audio syntesizer function for eye-safe immersion feedback
  const playBeep = (type: 'overtake' | 'bestlap' | 'tick') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (type === 'overtake') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.08); // high pitch swoop
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'bestlap') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(987.77, audioCtx.currentTime); // B5
        osc.frequency.setValueAtTime(1479.98, audioCtx.currentTime + 0.1); // F#6
        osc.frequency.setValueAtTime(1975.53, audioCtx.currentTime + 0.2); // B6 purple record!
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.45);
      } else {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
      }
    } catch (err) {
      // Browsers block audio until interaction - fail silently
    }
  };

  // Setup stopwatch counter for track session
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 0.1);
    }, 100);
    return () => clearInterval(clockTimer);
  }, []);

  // Update backup previousPositions whenever riders state changes
  useEffect(() => {
    const currentPositions: { [riderId: string]: number } = {};
    riders.forEach((r) => {
      currentPositions[r.id] = r.lbpos;
    });
    previousPositionsRef.current = currentPositions;
  }, [riders]);

  // Synchronize JSON textbox representation with current top active riders
  const syncJsonTextBox = (currentRiders: RiderResult[]) => {
    try {
      const simplifiedPayload = {
        type: 0,
        results: currentRiders.map(r => ({
          sesId: r.sesId,
          eId: r.eId,
          id: r.id,
          btTm: r.btTm,
          ibt: r.ibt,
          gp: r.gp,
          df: r.df,
          lsTm: r.lsTm,
          ls: r.ls,
          cl: r.cl,
          nam: r.nam,
          no: r.no,
          lbpos: r.lbpos,
          pos: r.pos,
          cb: r.cb
        }))
      };
      setRawJsonInput(JSON.stringify(simplifiedPayload, null, 2));
    } catch (e) {
      // Fail silently
    }
  };

  // Add a new log message to the micro-websocket screen
  const addWebSocketLog = (direction: 'in' | 'system' | 'sent', message: string, payloadStr?: string) => {
    setSignalRLogs((prev) => {
      const timestamp = new Date().toLocaleTimeString();
      const logs = [
        {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp,
          direction,
          message,
          rawPayload: payloadStr
        },
        ...prev
      ];
      return logs.slice(0, 35); // Keep last 35 logs for high performance
    });
  };

  // Core handler: parses incoming SignalR mock frames and updates UI state with stunning reactive timing changes
  const injectSignalRPacket = (packetObj: SignalRPacket) => {
    if (!packetObj || !Array.isArray(packetObj.results)) {
      addWebSocketLog('system', "❌ SignalR Parse Error: Results is not an array");
      return;
    }

    setRiders((prevRiders) => {
      // Map existing riders by ID for easy delta tracking
      const riderMap = new Map<string, RiderResult>();
      prevRiders.forEach((r) => {
        riderMap.set(r.id, r);
      });

      // Track occurrences
      let sessionBestImproved = false;
      let overtakeHappened = false;

      // Update values from signalR stream
      const mergedRiders = packetObj.results.map((incoming) => {
        const existing = riderMap.get(incoming.id);
        const originalPos = existing ? existing.lbpos : undefined;
        let changeDirection: 'up' | 'down' | 'steady' = 'steady';

        // Detect if position changed relative to existing local position state
        if (originalPos !== undefined && incoming.lbpos !== undefined) {
          if (incoming.lbpos < originalPos) {
            changeDirection = 'up';
            overtakeHappened = true;
          } else if (incoming.lbpos > originalPos) {
            changeDirection = 'down';
          }
        }

        // Detect new overall fastest lap record
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
          changeTime: Date.now(),
          changeDirection,
          ibt: isAbsoluteFastest ? true : (incoming.ibt || (existing ? existing.ibt : false))
        } as RiderResult;
      });

      // Keep riders that were NOT in the SignalR packet to avoid deleting them from timing screen
      const incomingIds = new Set(packetObj.results.map(r => r.id));
      const omittedRiders = prevRiders.filter(r => !incomingIds.has(r.id));
      
      const fullRaceGroup = [...mergedRiders, ...omittedRiders];

      // Re-sort elements based on incoming telemetry pos index
      const sortedPack = recalculateGaps(fullRaceGroup);

      // Play suitable sound indicators
      if (sessionBestImproved) {
        playBeep('bestlap');
      } else if (overtakeHappened) {
        playBeep('overtake');
      } else {
        playBeep('tick');
      }

      // Sync the JSON Editor with this fresh model
      setTimeout(() => syncJsonTextBox(sortedPack), 50);

      return sortedPack;
    });
  };

  // Handle direct custom typing into JSON sandbox
  const handleManualJsonInject = () => {
    try {
      const parsed = JSON.parse(rawJsonInput) as SignalRPacket;
      addWebSocketLog('sent', `📥 Manual injection: pushed ${parsed.results?.length || 0} timing records via SignalR Socket.`);
      injectSignalRPacket(parsed);
    } catch (e: any) {
      addWebSocketLog('system', `❌ Invalid JSON Payload Format: ${e.message}`);
    }
  };

  // Simulation Engine: Runs in background creating lively racing actions (overtakes, lap timer logs)
  useEffect(() => {
    if (!autoSimulate) return;

    const timer = setInterval(() => {
      setRiders((currentPack) => {
        if (currentPack.length < 2) return currentPack;

        // Choose a random category of event:
        // 75% chance of positional battle / overtake
        // 25% chance of a lap time improvement
        const eventType = Math.random();

        let updated = [...currentPack];
        let eventMessage = "";
        let jsonPayloadStr = "";

        if (eventType < 0.70) {
          // SELECT AN ADJACENT PAIR FOR OVERTAKE SITUATION
          // Prefer pairs closer together in index
          const indexToOvertake = Math.floor(Math.random() * (updated.length - 1));
          const defender = updated[indexToOvertake];
          const attacker = updated[indexToOvertake + 1];

          // Swap Positions
          const initialDefPos = defender.lbpos;
          const initialAttPos = attacker.lbpos;

          // Mutate values and simulate sector progress
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

          // Generate updated last lap for the overtaking attacker
          const baseMs = parseLapTimeToMs(sessionBestTime);
          const newLastLapMs = baseMs + (Math.random() * 1900 - 400); // slightly around faster/slower
          attacker.lsTm = formatLapTime(newLastLapMs);
          attacker.ls += 1; // Completed a live sector lap

          // Generate minor swap timing offsets
          const defenderMsStr = defender.tTm || "5:26.000";
          const defenderMs = parseLapTimeToMs(defenderMsStr);
          attacker.tTm = formatLapTime(defenderMs - 120); // overtake puts attacker 120ms ahead
          defender.tTm = formatLapTime(defenderMs + 100);

          // Log the action to SignalR logger
          eventMessage = `⚡ [SignalR Core] Overtake! ID ${attacker.id} (#${attacker.no} ${attacker.nam}) overtook ID ${defender.id} (#${defender.no} ${defender.nam}) for P${initialDefPos}!`;
          playBeep('overtake');
          
          updated = recalculateGaps(updated);
        } else {
          // SIMULATE LAP TIME RECORD IMPROVEMENT FOR A RACER
          const targetIndex = Math.floor(Math.random() * updated.length);
          const targetRider = { ...updated[targetIndex] };
          
          const currentBestMs = parseLapTimeToMs(targetRider.btTm || "1:07.000");
          const reductionMs = Math.random() * 800 + 100; // improve by 0.1s to 0.9s
          const newBestMs = Math.round(currentBestMs - reductionMs);
          const newBestLapStr = formatLapTime(newBestMs);

          targetRider.btTm = newBestLapStr;
          targetRider.lsTm = newBestLapStr;
          targetRider.ls += 1;
          
          // Re-generate sector
          targetRider.s0 = (parseFloat(targetRider.s0 || "22.5") - 0.12).toFixed(3);

          // Check if this improves session best time
          const currentGlobalBestMs = parseLapTimeToMs(sessionBestTime);
          let isAbsoluteFastest = false;
          if (newBestMs < currentGlobalBestMs) {
            setSessionBestTime(newBestLapStr);
            setSessionBestRider(targetRider.nam);
            isAbsoluteFastest = true;
            targetRider.ibt = true;
            eventMessage = `💜 [SignalR Core] PURPLE SECTOR FASTEST LAP: ID ${targetRider.id} (#${targetRider.no} ${targetRider.nam}) set absolute best session lap: ${newBestLapStr}!`;
            playBeep('bestlap');
          } else {
            eventMessage = `🏁 [SignalR Core] Personal Best Lap: ID ${targetRider.id} (#${targetRider.no} ${targetRider.nam}) improves to ${newBestLapStr}.`;
            playBeep('tick');
          }

          updated[targetIndex] = targetRider;
          updated = recalculateGaps(updated);
        }

        // Accumulate active laps and timeline progress
        setCurrentLap((prev) => (Math.random() > 0.85 ? prev + 1 : prev));

        // Format raw packet output for terminal view
        const logResults = updated.slice(0, 5).map(r => ({
          id: r.id, no: r.no, nam: r.nam, pos: r.pos, btTm: r.btTm, cb: r.cb
        }));
        
        jsonPayloadStr = JSON.stringify({ type: 0, results: logResults }, null, 2);
        
        addWebSocketLog('in', eventMessage, jsonPayloadStr);
        syncJsonTextBox(updated);

        return updated;
      });
    }, simSpeedSeconds * 1000);

    return () => clearInterval(timer);
  }, [autoSimulate, simSpeedSeconds, sessionBestTime]);

  // Handle direct manual trigger for overtaking action
  const triggerManualOvertake = () => {
    if (riders.length < 2) return;
    
    // Pick random racer between P2 and bottom slot to make an overtake move on the rider ahead
    const targetIdx = 1 + Math.floor(Math.random() * (riders.length - 1));
    const attacker = { ...riders[targetIdx] };
    const defender = { ...riders[targetIdx - 1] };

    const defOrigPos = defender.lbpos;
    const attOrigPos = attacker.lbpos;

    // Direct positions swap
    attacker.lbpos = defOrigPos;
    attacker.pos = defOrigPos.toString();
    attacker.changeDirection = 'up';
    attacker.changeTime = Date.now();

    defender.lbpos = attOrigPos;
    defender.pos = attOrigPos.toString();
    defender.changeDirection = 'down';
    defender.changeTime = Date.now();

    // Adjust Total Time to reflect swap nicely
    const currentBaseMs = parseLapTimeToMs(defender.tTm || "5:26.000");
    attacker.tTm = formatLapTime(currentBaseMs - 150);
    defender.tTm = formatLapTime(currentBaseMs + 50);
    
    attacker.lsTm = formatLapTime(parseLapTimeToMs(sessionBestTime) + Math.random() * 800);

    const updated = [...riders];
    updated[targetIdx] = defender;
    updated[targetIdx - 1] = attacker;

    const finalRiders = recalculateGaps(updated);
    
    const eventMsg = `⚡ [Sandbox Direct] Manual signal overtake: #${attacker.no} ${attacker.nam} overtook #${defender.no} ${defender.nam} at Turn 4!`;
    addWebSocketLog('sent', eventMsg, JSON.stringify({ event: 'manual-overtake', attacker, defender }, null, 2));
    setRiders(finalRiders);
    syncJsonTextBox(finalRiders);
    playBeep('overtake');
  };

  // Reset the timing system back to pristine original values
  const handleResetTiming = () => {
    const fresh = recalculateGaps(INITIAL_RIDERS);
    setRiders(fresh);
    setCurrentLap(5);
    setElapsedSeconds(325.61);
    setSessionBestTime("1:04.344");
    setSessionBestRider("廖梓旭");
    setSelectedRiderId(null);
    addWebSocketLog('system', "🔄 Telemetry context reset. Position state restored from pristine SignalR initialization parameters.");
    syncJsonTextBox(fresh);
    playBeep('tick');
  };

  // Create Rider Form Action
  const handleAddRider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRiderName || !newRiderNo) return;
    
    const nextId = (Math.max(...riders.map(r => parseInt(r.id, 10) || 100)) + 1).toString();
    const mockTotalTimeMs = parseLapTimeToMs(riders[riders.length - 1]?.tTm || "5:34.000") + 2500;
    
    const freshRider: RiderResult = {
      sesId: "27E4F85A3EEBD7C5-2147484204-1073743589",
      eId: "27E4F85A3EEBD7C5-2147484204",
      id: nextId,
      btTm: formatLapTime(parseLapTimeToMs(sessionBestTime) + 2100),
      ibt: false,
      btCl: false,
      tTm: formatLapTime(mockTotalTimeMs),
      lsTm: formatLapTime(parseLapTimeToMs(sessionBestTime) + 2500),
      ls: currentLap,
      cl: "GCIC兴联杯Xinglian CUP",
      cln: "GCIC兴联杯Xinglian CUP",
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
      cb: newRiderTeam || "GCIC Racing"
    };

    const updated = [...riders, freshRider];
    const resorted = recalculateGaps(updated);
    setRiders(resorted);
    syncJsonTextBox(resorted);
    
    addWebSocketLog('system', `➕ Added racer #${newRiderNo} ${newRiderName} to the live starting grid.`);
    setNewRiderName('');
    setNewRiderNo('');
    setNewRiderTeam('');
    playBeep('tick');
  };

  // Delete a Rider from timing board
  const handleDeleteRider = (id: string, name: string) => {
    const updated = riders.filter(r => r.id !== id);
    const resorted = recalculateGaps(updated);
    setRiders(resorted);
    syncJsonTextBox(resorted);
    addWebSocketLog('system', `➖ Removed rider ID ${id} (${name}) from live telemetry tracking.`);
    if (selectedRiderId === id) setSelectedRiderId(null);
    playBeep('tick');
  };

  // Handle direct custom modifications to an active rider
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
      addWebSocketLog('system', `✏️ Updated specifications and times for rider #${editingRider.no} ${editingRider.nam}.`);
      setEditingRider(null);
      setIsEditingGrid(false);
      return resorted;
    });
    playBeep('tick');
  };

  // Calculate stats
  const activeRidersCount = riders.length;
  const closestDeltaSeconds = useMemo(() => {
    if (riders.length < 2) return "0.000";
    let minGap = Infinity;
    for (let i = 1; i < riders.length; i++) {
      const prevMs = parseLapTimeToMs(riders[i-1].tTm || "0:00.000");
      const currentMs = parseLapTimeToMs(riders[i].tTm || "0:00.000");
      const gap = (currentMs - prevMs) / 1000;
      if (gap > 0 && gap < minGap) minGap = gap;
    }
    return minGap === Infinity ? "0.000" : minGap.toFixed(3);
  }, [riders]);

  return (
    <div className="min-h-screen text-zinc-100 font-sans flex flex-col bg-zinc-950 selection:bg-red-600 selection:text-white relative overflow-x-hidden" id="main-container">
      
      {/* Background Graphic Elements */}
      <div className="absolute top-0 right-0 w-1/3 h-full opacity-5 pointer-events-none overflow-hidden z-0">
        <div className="absolute -right-10 top-20 text-[350px] font-black italic text-zinc-400 rotate-12 leading-none select-none">GP</div>
      </div>

      {/* Broadcast Header matching "Sleek Interface" */}
      <header className="bg-zinc-900 border-b border-zinc-800 relative z-20 shadow-xl shadow-black/40" id="timing-header">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-red-600"></div>
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo Title and Live Badge */}
          <div className="flex items-center gap-6">
            <div className="bg-red-600 px-3.5 py-1 text-xs font-black tracking-widest flex items-center gap-2 hover:bg-red-700 transition-colors cursor-pointer select-none">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              LIVE
            </div>
            <div className="border-l border-zinc-700 h-8 hidden md:block"></div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">GCIC兴联杯Xinglian CUP</span>
              </div>
              <h1 className="text-xl font-black italic tracking-tighter uppercase text-zinc-100">
                Championship Finals <span className="text-zinc-500 font-normal">/ Session 03</span>
              </h1>
            </div>
          </div>

          {/* TELEMETRY HEADS UP SUMMARY PANEL */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-8 bg-zinc-950/60 border border-zinc-800 px-5 py-2.5 rounded-lg text-xs font-mono">
            <div>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Race Time</div>
              <div className="text-xl font-mono font-bold text-red-500">
                {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toFixed(1).padStart(4, '0')}
              </div>
            </div>

            <div className="h-6 w-[1.5px] bg-zinc-850 hidden sm:block"></div>

            <div>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Active Lap</div>
              <div className="text-xl font-bold italic text-zinc-200 font-sans">
                LAP {currentLap} <span className="text-xs text-zinc-500 font-normal">/ 12</span>
              </div>
            </div>

            <div className="h-6 w-[1.5px] bg-zinc-850 hidden sm:block"></div>

            <div className="hidden lg:block">
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Fastest Lap</div>
              <div className="text-xl font-bold font-mono text-zinc-300">
                {sessionBestTime} <span className="text-[10px] text-zinc-500 font-normal">({sessionBestRider})</span>
              </div>
            </div>

            <div className="h-6 w-[1.5px] bg-zinc-850 hidden sm:block"></div>

            <div>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Tightest Delta</div>
              <div className="text-xl font-bold font-mono text-emerald-400">
                +{closestDeltaSeconds}s
              </div>
            </div>
          </div>

          {/* Master Controller Settings */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-lg border transition-all truncate cursor-pointer ${soundEnabled ? 'bg-zinc-850 border-zinc-700 text-red-500 hover:bg-zinc-700' : 'bg-zinc-950 border-zinc-850 text-zinc-650'}`}
              title={soundEnabled ? "Disable audio buzzer" : "Enable audio buzzer"}
              id="sound-toggle-btn"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={handleResetTiming}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              title="Reset timing stats back to initial values"
              id="reset-timings-btn"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>

        </div>
      </header>

      {/* DETAILED TRACK CONSOLE */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10" id="main-content">
        
        {/* LEADERBOARD VIEW PORT: takes 7 cols on large screens, or 12 on small */}
        <section className="lg:col-span-7 flex flex-col gap-4" id="leaderboard-section">
          
          {/* DISPLAY MODE CONTROL BOX */}
          <div className="bg-zinc-900/40 border border-zinc-850 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl" id="mode-controls">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-red-500" />
              <span className="text-xs font-black uppercase tracking-widest text-zinc-400 italic">Timing Display Mode</span>
            </div>

            <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 w-full sm:w-auto" id="toggle-display-container">
              <button
                onClick={() => { setDisplayMode('broadcast'); playBeep('tick'); }}
                className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${displayMode === 'broadcast' ? 'bg-red-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                id="btn-broadcast-mode"
              >
                <Radio className="w-3.5 h-3.5" /> Broadcast Stream
              </button>
              <button
                onClick={() => { setDisplayMode('telemetry'); playBeep('tick'); }}
                className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${displayMode === 'telemetry' ? 'bg-red-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                id="btn-telemetry-mode"
              >
                <Activity className="w-3.5 h-3.5" /> Pro Telemetry Board
              </button>
            </div>
          </div>

          {/* MOTOSPORT LEADERBOARD PANEL */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-10" id="leaderboard-board-panel">
            
            {/* RACING TRACK LAP BANNER */}
            <div className="bg-zinc-900/90 px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-xs font-black uppercase tracking-widest text-zinc-400 italic">GCIC Live Timing Feed</span>
              </div>
              <span className="text-xs font-bold bg-zinc-950 px-3 py-1 rounded text-zinc-400 border border-zinc-800 uppercase tracking-wider">
                VRC-2024-LIVE-FEED
              </span>
            </div>

            {/* LEADERBOARD HEADERS matching "Sleek Interface" spacing style */}
            <div className="grid grid-cols-12 bg-zinc-900/60 py-3.5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 italic border-b border-zinc-800">
              <div className="col-span-2 sm:col-span-1 text-center">Pos</div>
              <div className="col-span-2 sm:col-span-1 text-center">No.</div>
              <div className="col-span-5 sm:col-span-4 pl-2">Rider</div>
              
              {displayMode === 'telemetry' ? (
                <>
                  <div className="col-span-3 text-right">LAST LAP</div>
                  <div className="col-span-1 text-center hidden sm:block">LAP</div>
                  <div className="col-span-2 text-right">BEST LAP</div>
                  <div className="col-span-1 text-right hidden sm:block">GAP</div>
                </>
              ) : (
                <div className="col-span-3 text-right italic text-zinc-500 font-sans font-light hidden sm:block tracking-normal uppercase text-[9px] font-bold">Broadcast Display Stream (P1 Form)</div>
              )}
            </div>

            {/* ANIMATED TIMING ROWS CONTAINER */}
            <div className="divide-y divide-zinc-950 p-3 min-h-[480px] bg-zinc-900/10 relative" id="riders-reordering-list">
              <AnimatePresence initial={false}>
                {riders.map((rider, index) => {
                  const isLeader = index === 0;
                  const isTop3 = index < 3;
                  
                  // Class styles matching Sleek Interface design exactly
                  const rowBorderClass = isLeader 
                    ? "border-l-4 border-red-600 bg-zinc-900/50 hover:bg-zinc-800/80" 
                    : "border-l-4 border-zinc-700 bg-zinc-900/30 hover:bg-zinc-800/80";

                  const posTextStyle = isLeader 
                    ? "text-2xl font-black italic text-red-600" 
                    : "text-2xl font-black italic text-zinc-400";

                  // Overtake Flash Trigger helper
                  const isRecentlyChanged = rider.changeTime && (Date.now() - rider.changeTime < 1300);
                  const flashClass = isRecentlyChanged
                    ? rider.changeDirection === 'up'
                      ? 'bg-emerald-950/60 border-l-emerald-500'
                      : rider.changeDirection === 'down'
                        ? 'bg-red-950/60 border-l-red-500'
                        : ''
                    : '';

                  // Purple display helper for session overall absolute fastest lap
                  const isSessionAbsoluteBest = rider.btTm === sessionBestTime;

                  return (
                    <motion.div
                      key={rider.id}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ 
                        type: "spring", 
                        damping: 24, 
                        stiffness: 140,
                        mass: 0.9
                      }}
                      onClick={() => {
                        setSelectedRiderId(rider.id === selectedRiderId ? null : rider.id);
                        playBeep('tick');
                      }}
                      className={`grid grid-cols-12 items-center py-3 px-4 my-1.5 cursor-pointer rounded-r-lg border-y border-r border-transparent transition-all ${
                        selectedRiderId === rider.id 
                          ? 'bg-zinc-800 border-zinc-700 shadow-xl' 
                          : rowBorderClass
                      } ${flashClass}`}
                      id={`rider-row-${rider.id}`}
                    >
                      {/* POS COLUMN */}
                      <div className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1">
                        <span className={posTextStyle} id={`rider-pos-${rider.id}`}>
                          {rider.pos.padStart(2, '0')}
                        </span>
                        
                        {/* Status Trend Arrow Indicator */}
                        <div className="w-4 flex justify-center">
                          {rider.changeDirection === 'up' && (
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                          {rider.changeDirection === 'down' && (
                            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                          )}
                          {(!rider.changeDirection || rider.changeDirection === 'steady') && (
                            <span className="text-zinc-650 text-xs">-</span>
                          )}
                        </div>
                      </div>

                      {/* VEHICLE NO COLUMN */}
                      <div className="col-span-2 sm:col-span-1 text-center">
                        <span className="text-3xl font-black italic tracking-tighter text-zinc-100 select-none">
                          {rider.no}
                        </span>
                      </div>

                      {/* RIDER NAME AND OPTIONAL TEAM SUBTITLE */}
                      <div className="col-span-5 sm:col-span-4 pl-2">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold uppercase tracking-tight text-zinc-100 leading-tight">
                              {rider.nam}
                            </span>
                            
                            {/* Absolute session best overall lap maker badge */}
                            {isSessionAbsoluteBest && displayMode === 'telemetry' && (
                              <span className="text-[9px] bg-purple-950 text-purple-300 font-extrabold px-1.5 py-0.5 rounded border border-purple-600/40 flex items-center gap-0.5 uppercase tracking-wider animate-pulse leading-none">
                                <Sparkles className="w-2.5 h-2.5 shrink-0" /> RECORD
                              </span>
                            )}
                          </div>
                          
                          {/* Club Team Row */}
                          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-1 leading-none truncate">
                            {rider.cb || "兴联车队 XINGLIAN"}
                          </p>
                        </div>
                      </div>

                      {/* TELEMETRY INFO FOR ADVANCED MODE */}
                      {displayMode === 'telemetry' ? (
                        <>
                          {/* Last Lap Time */}
                          <div className="col-span-3 text-right">
                            <span className="font-mono text-base text-zinc-300">
                              {rider.lsTm || "--:--.---"}
                            </span>
                          </div>

                          {/* Completed Laps Count */}
                          <div className="col-span-1 text-center font-mono text-zinc-500 hidden sm:block text-sm">
                            {rider.ls}
                          </div>

                          {/* Best Lap */}
                          <div className="col-span-2 text-right">
                            <span className={`font-mono text-base ${
                              rider.ibt || isSessionAbsoluteBest ? 'text-yellow-400 font-bold' : 'text-zinc-300'
                            }`}>
                              {rider.btTm || "--:--.---"}
                            </span>
                          </div>

                          {/* Gap to Leader */}
                          <div className="col-span-1 text-right font-mono text-sm text-zinc-400 hidden sm:block">
                            {rider.gp === "LEADER" ? (
                              <span className="text-zinc-500 uppercase font-black text-[10px] tracking-wider">Interval</span>
                            ) : (
                              rider.gp
                            )}
                          </div>
                        </>
                      ) : (
                        /* Broadcast Stream mode: minimal clean display */
                        <div className="col-span-3 text-right flex items-center justify-end gap-1 font-mono">
                          <span className="text-zinc-500 uppercase font-black text-xs mr-3 tracking-wider hidden sm:inline">Active Sector</span>
                          <span className="text-red-500 font-black text-xs bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800">
                            S1: {rider.s0 || "22.03"}s
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* BANNER SHOWING DIRECT CONNECTION STATS */}
            <div className="bg-zinc-950 px-5 py-3 text-xs font-mono text-zinc-500 flex flex-col sm:flex-row justify-between items-center gap-2 border-t border-zinc-900 font-bold uppercase tracking-wider text-[10px]">
              <span>🖧 Connection Status: SignalR /racingHub (Active)</span>
              <span className="text-red-500">Tap racer row to edit specs or remove from grid pack.</span>
            </div>

          </div>
        </section>

        {/* SIDE BAR TOOLS PANEL: takes 5 cols on large screens */}
        <section className="lg:col-span-5 flex flex-col gap-6" id="race-tools">
          
          {/* SIMULATION ENGINE SPEED CONSOLE */}
          <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 shadow-xl flex flex-col gap-4 relative" id="admin-simulation-panel">
            <h2 className="text-xs font-black tracking-[0.2em] uppercase text-zinc-400 flex items-center gap-2 border-b border-zinc-800 pb-2.5 italic">
              <Activity className="w-4 h-4 text-red-500" /> AI Race Director Simulator
            </h2>

            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">Automatic Grid Updates:</span>
              <span className={`px-2.5 py-1 rounded text-[10px] font-mono tracking-wider uppercase font-extrabold flex items-center gap-1.5 ${
                autoSimulate ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-400' : 'bg-zinc-950 border border-zinc-850 text-zinc-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${autoSimulate ? 'bg-emerald-400' : 'bg-zinc-650'} ${autoSimulate && 'animate-pulse'}`}></span>
                {autoSimulate ? 'Enabled' : 'Paused'}
              </span>
            </div>

            {/* Play Pause Controls */}
            <div className="grid grid-cols-2 gap-2" id="sim-controls-grid">
              <button
                onClick={() => { setAutoSimulate(true); playBeep('tick'); }}
                className={`py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider font-sans flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  autoSimulate 
                    ? 'bg-red-600 text-white shadow-md' 
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                id="btn-start-simulation"
              >
                <Play className="w-3.5 h-3.5" /> Resume Grid
              </button>
              <button
                onClick={() => { setAutoSimulate(false); playBeep('tick'); }}
                className={`py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider font-sans flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  !autoSimulate 
                    ? 'bg-red-600 text-white shadow-md' 
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                id="btn-pause-simulation"
              >
                <Pause className="w-3.5 h-3.5" /> Pause Grid
              </button>
            </div>

            {/* Speed slider indicator */}
            <div className="flex flex-col gap-2 pt-1.5 border-t border-zinc-850">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-400 uppercase tracking-wider text-[10px] font-bold">SignalR Packet Interval</span>
                <span className="text-red-500 font-extrabold">{simSpeedSeconds} SECONDS</span>
              </div>
              <input 
                type="range" 
                min="2" 
                max="10" 
                step="1"
                value={simSpeedSeconds}
                onChange={(e) => setSimSpeedSeconds(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-red-600"
                id="sim-speed-slider"
              />
            </div>

            {/* Action Box */}
            <div className="border border-zinc-800 bg-zinc-950 p-3 rounded-lg flex flex-col gap-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-extrabold font-mono">Manual Grid Actions:</span>
              <button
                onClick={triggerManualOvertake}
                className="w-full py-2.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-100 uppercase tracking-wide font-black text-xs rounded-lg transition-all flex items-center justify-center gap-2 border border-zinc-700 cursor-pointer"
                id="btn-instant-overtake"
              >
                <Zap className="w-4 h-4 text-red-500 animate-pulse" /> Force Immediate Overtake
              </button>
            </div>
          </div>

          {/* SIGNALR OUTLET DEBUG PANEL */}
          <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 shadow-xl flex flex-col gap-4 relative" id="signalr-outlet-panel">
            <h2 className="text-xs font-black tracking-[0.2em] uppercase text-zinc-400 flex items-center gap-2 border-b border-zinc-800 pb-2.5 italic">
              <Terminal className="w-4 h-4 text-red-500" /> WebSockets Feeder
            </h2>

            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Test custom SignalR results payload down in real-time. Changes below will propagate immediately upon pushing.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500 font-bold">Inbound Data Payload (SignalR Client Form)</label>
              <textarea
                value={rawJsonInput}
                onChange={(e) => setRawJsonInput(e.target.value)}
                className="font-mono text-xs bg-zinc-950 leading-relaxed p-4 rounded-lg border border-zinc-800 h-40 focus:outline-none focus:border-red-650 text-zinc-300 w-full"
                placeholder="Paste telemetry JSON packet here..."
                id="json-payload-textarea"
              />
            </div>

            <button
              onClick={handleManualJsonInject}
              className="py-3 bg-red-600 hover:bg-red-700 text-white font-sans font-black uppercase tracking-wider text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              id="btn-manual-inject"
            >
              <Check className="w-4 h-4" /> Push Custom Packet
            </button>
          </div>

          {/* ACTIVE SIGNALR RAW CLIENT LOGGER: high contrast, moving list */}
          <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 shadow-xl flex flex-col gap-3 relative" id="signalr-logs-container">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <h2 className="text-xs font-black tracking-[0.2em] uppercase text-zinc-400 flex items-center gap-1.5 italic">
                <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" /> Telemetry Hub Log
              </h2>
              <button 
                onClick={() => setSignalRLogs([])} 
                className="text-[10px] uppercase font-mono text-red-500 hover:text-red-400 transition-all font-bold tracking-widest cursor-pointer"
                id="clear-logs-btn"
              >
                Clear
              </button>
            </div>

            {/* Scrolling logs list */}
            <div className="h-44 overflow-y-auto font-mono text-[11px] flex flex-col gap-2 divide-y divide-zinc-950 leading-normal" id="signalr-logs-list">
              {signalRLogs.length === 0 ? (
                <div className="text-zinc-600 italic py-4 text-center">Console is empty. Waiting for SignalR client activity...</div>
              ) : (
                signalRLogs.map((log) => (
                  <div key={log.id} className="pt-2 flex flex-col gap-1 first:pt-0">
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] text-zinc-500">{log.timestamp}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider ${
                        log.direction === 'in' 
                          ? 'bg-[#ffe4e6]/10 text-red-400 border border-red-900/30' 
                          : log.direction === 'sent' 
                            ? 'bg-zinc-950 text-zinc-400 border border-zinc-800' 
                            : 'bg-zinc-950 text-zinc-400'
                      }`}>
                        {log.direction === 'in' ? 'WS RECV' : log.direction === 'sent' ? 'WS PUSH' : 'SYS'}
                      </span>
                    </div>
                    <span className="text-zinc-300 break-words font-mono line-clamp-3">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RACE STARTING GRID CUSTOMIZATION BOARD */}
          <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 shadow-xl flex flex-col gap-3.5 relative" id="starting-grid-board">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <h2 className="text-xs font-black tracking-[0.2em] uppercase text-zinc-400 flex items-center gap-2 italic">
                <Settings className="w-4 h-4 text-red-500" /> Grid Customs Management
              </h2>
              <button
                onClick={() => setIsEditingGrid(!isEditingGrid)}
                className="text-[10px] font-bold bg-zinc-950 px-3 py-1.5 rounded hover:bg-zinc-800 hover:text-white text-zinc-400 font-mono transition-all border border-zinc-850 uppercase tracking-wider cursor-pointer"
                id="toggle-grid-settings-btn"
              >
                {isEditingGrid ? 'Hide Pack Settings' : 'Add Rider Form'}
              </button>
            </div>

            {/* Dropdown editing form */}
            {isEditingGrid && (
              <form onSubmit={handleAddRider} className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-zinc-850" id="add-rider-form">
                <span className="text-xs text-red-500 font-black uppercase tracking-wider block italic">Add Rider to Pack</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Rider Name</label>
                    <input 
                      type="text" 
                      placeholder="廖梓旭"
                      value={newRiderName}
                      onChange={(e) => setNewRiderName(e.target.value)}
                      className="bg-zinc-900 text-xs px-3 py-2 rounded text-zinc-100 border border-zinc-800 focus:outline-none focus:border-red-600"
                      required
                      id="input-rider-name"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Rider Number</label>
                    <input 
                      type="text" 
                      placeholder="09"
                      value={newRiderNo}
                      onChange={(e) => setNewRiderNo(e.target.value)}
                      className="bg-zinc-900 text-xs px-3 py-2 rounded text-zinc-100 border border-zinc-800 focus:outline-none focus:border-red-600 font-mono"
                      required
                      id="input-rider-no"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Club Name / Team</label>
                  <input 
                    type="text" 
                    placeholder="兴联车队 XINGLIAN"
                    value={newRiderTeam}
                    onChange={(e) => setNewRiderTeam(e.target.value)}
                    className="bg-zinc-900 text-xs px-3 py-2 rounded text-zinc-100 border border-zinc-800 focus:outline-none focus:border-red-600 w-full"
                    id="input-rider-team"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1 cursor-pointer"
                  id="btn-submit-add-rider"
                >
                  <PlusCircle className="w-4 h-4" /> Add Racer to Live Pack
                </button>
              </form>
            )}

            {/* Detailed edits panel if a rider was marked / selected */}
            {selectedRiderId && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3 relative" id="selected-rider-telemetry-profile">
                {(() => {
                  const rider = riders.find(r => r.id === selectedRiderId);
                  if (!rider) return <p className="text-xs text-zinc-500">Rider profile not found.</p>;
                  return (
                    <>
                      <div className="flex justify-between items-start border-b border-zinc-850 pb-2">
                        <div>
                          <span className="text-[10px] uppercase font-black tracking-wider text-red-500 italic">Rider Profile Specs</span>
                          <h3 className="text-base font-bold text-zinc-100 uppercase">{rider.nam}</h3>
                        </div>
                        <span className="text-2xl font-black italic text-zinc-100 select-none">
                          #{rider.no}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div>
                          <span className="text-zinc-500 text-[9px] block leading-none uppercase font-black">Class Team</span>
                          <span className="text-zinc-300 font-bold block truncate">{rider.cb || "XINGLIAN RACING"}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 text-[9px] block leading-none uppercase font-black border-red-500 font-mono">Lap record</span>
                          <span className="text-zinc-300 font-bold">{rider.btTm || "--:--.---"}</span>
                        </div>
                      </div>

                      {/* Editing individual inline parameters panel */}
                      {editingRider?.id === rider.id ? (
                        <form onSubmit={handleUpdateRiderSpecs} className="space-y-3.5 border-t border-zinc-800 pt-3" id="inline-edit-profile-form">
                          <span className="text-[10px] text-red-500 font-black uppercase tracking-wider italic block">Inline Edit Specifications</span>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <input 
                              type="text" 
                              value={editingRider.nam} 
                              onChange={(e) => setEditingRider({ ...editingRider, nam: e.target.value })}
                              className="bg-zinc-900 p-2 text-xs text-zinc-100 rounded border border-zinc-800"
                              placeholder="Name"
                              id="edit-inline-name"
                            />
                            <input 
                              type="text" 
                              value={editingRider.no} 
                              onChange={(e) => setEditingRider({ ...editingRider, no: e.target.value })}
                              className="bg-zinc-900 p-2 text-xs text-zinc-100 rounded border border-zinc-800 font-mono"
                              placeholder="No"
                              id="edit-inline-no"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <input 
                              type="text" 
                              value={editingRider.btTm} 
                              onChange={(e) => setEditingRider({ ...editingRider, btTm: e.target.value })}
                              className="bg-zinc-900 p-2 text-xs text-zinc-100 rounded border border-zinc-800 font-mono"
                              placeholder="Best Lap"
                              id="edit-inline-bestlap"
                            />
                            <input 
                              type="text" 
                              value={editingRider.cb} 
                              onChange={(e) => setEditingRider({ ...editingRider, cb: e.target.value })}
                              className="bg-zinc-900 p-2 text-xs text-zinc-100 rounded border border-zinc-800"
                              placeholder="Team Name"
                              id="edit-inline-cb"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold uppercase tracking-wider cursor-pointer"
                              id="btn-edit-inline-update"
                            >
                              Save specs
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRider(null)}
                              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded text-xs font-mono cursor-pointer"
                              id="btn-edit-inline-cancel"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-center gap-2 border-t border-zinc-850 pt-2.5">
                          <button
                            onClick={() => setEditingRider({ ...rider })}
                            className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 rounded text-xs font-bold uppercase tracking-wider transition-all border border-zinc-800 flex items-center justify-center gap-1.5 cursor-pointer"
                            id="btn-profile-edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit specs
                          </button>
                          
                          <button
                            onClick={() => handleDeleteRider(rider.id, rider.nam)}
                            className="px-3 py-2 bg-red-950/60 hover:bg-red-900/60 text-red-450 hover:text-red-200 rounded text-xs font-bold uppercase tracking-wider transition-all border border-red-900/30 flex items-center justify-center gap-1.5 cursor-pointer"
                            title="Remove racer from grid"
                            id="btn-profile-delete"
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

            {/* Bottom prompt detail helper */}
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850 text-[11px] text-zinc-500 flex items-center gap-2.5 font-bold uppercase tracking-wider text-[9px]">
              <HelpCircle className="w-4 h-4 text-zinc-650 shrink-0" />
              <span>Grid positions slide dynamically on signalR feeds using responsive layout metrics.</span>
            </div>

          </div>

        </section>

      </main>

      {/* FOOTER TIMING STRIP */}
      <footer className="bg-zinc-900 border-t border-zinc-850 py-4 text-center text-[10px] font-mono text-zinc-500 mt-auto uppercase tracking-wider font-bold" id="timing-footer">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>GCIC兴联杯 Broadcast Desk • Built for Speed • © 2026 Core Tech</span>
          <span>Feed monitors active • 120hz frame cycles</span>
        </div>
      </footer>

    </div>
  );
}
