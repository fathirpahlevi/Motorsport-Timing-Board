import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
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
  Sparkles,
  Zap,
  ChevronUp,
  ChevronDown,
  Clock,
  X,
  Link,
  Bell,
} from 'lucide-react';
import { RiderResult } from '../types';
import { INITIAL_RIDERS, recalculateGaps } from '../data';

// Helper to format race clock stopwatch
function formatRaceTimer(seconds: number = 0): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds * 10) % 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
}

// Helper to parse Speedhive URLs
function parseSpeedhiveUrl(urlStr: string) {
  try {
    const clean = urlStr.trim();
    if (!clean) return { eventId: null, sessionId: null };
    if (clean.startsWith('http')) {
      const match = clean.match(/\/livetiming\/([A-Za-z0-9\-]+)\/sessions\/([A-Za-z0-9\-]+)/);
      if (match) return { eventId: match[1], sessionId: match[2] };
    }
    const parts = clean.split('-');
    if (parts.length >= 3) {
      return { eventId: `${parts[0]}-${parts[1]}`, sessionId: clean };
    }
    return { eventId: null, sessionId: null };
  } catch (e) {
    return { eventId: null, sessionId: null };
  }
}

interface MainBoardPageProps {
  riders: RiderResult[];
  sortedRiders: RiderResult[];
  raceTitle: string;
  sessionName: string;
  groupName: string;
  connectionStatus: string;
  connectionError: string | null;
  raceSeconds: number;
  isTimerRunning: boolean;
  triggerStopwatch: (action: 'start' | 'pause' | 'reset') => void;
  raceLaps: number;
  setRaceLaps: (laps: number) => void;
  isClosedLoop: boolean;
  setIsClosedLoop: (val: boolean) => void;
  sessionBestTime: string;
  sessionBestRider: string;
  laps: number;
  lapsToGo: number;
  flag: number;
  latestAnnouncement: string;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  selectedRiderId: string | null;
  setSelectedRiderId: (id: string | null) => void;
  isSetupOpen: boolean;
  setIsSetupOpen: (open: boolean) => void;
  speedhiveUrl: string;
  setSpeedhiveUrl: (url: string) => void;
  handleLoadSpeedhiveSession: () => void;
  setRiders: React.Dispatch<React.SetStateAction<RiderResult[]>>;
  setRaceTitle: (t: string) => void;
  setSessionName: (s: string) => void;
  setGroupName: (g: string) => void;
  setFlag: (f: number) => void;
  setLatestAnnouncement: (a: string) => void;
  setConnectionStatus: (c: string) => void;
  addWebSocketLog: (type: 'ws' | 'packet' | 'system' | 'sim', text: string) => void;
  autoSimulate: boolean;
  setAutoSimulate: (s: boolean) => void;
  simSpeedSeconds: number;
  setSimSpeedSeconds: (sec: number) => void;
  triggerManualOvertake: () => void;
  handleResetTiming: () => void;
  isEditingGrid: boolean;
  setIsEditingGrid: (e: boolean) => void;
  handleAddRider: (e: React.FormEvent) => void;
  newRiderName: string;
  setNewRiderName: (n: string) => void;
  newRiderNo: string;
  setNewRiderNo: (no: string) => void;
  newRiderTeam: string;
  setNewRiderTeam: (t: string) => void;
  editingRider: RiderResult | null;
  setEditingRider: (r: RiderResult | null) => void;
  handleUpdateRiderSpecs: (e: React.FormEvent) => void;
  handleDeleteRider: (id: string) => void;
  isConsoleOpen: boolean;
  setIsConsoleOpen: (open: boolean) => void;
  webSocketLogs: Array<{ id: string; time: string; type: 'ws' | 'packet' | 'system' | 'sim'; text: string }>;
  playBeep: (type: string) => void;
}

export const MainBoardPage: React.FC<MainBoardPageProps> = ({
  riders,
  sortedRiders,
  raceTitle,
  sessionName,
  groupName,
  connectionStatus,
  connectionError,
  raceSeconds,
  isTimerRunning,
  triggerStopwatch,
  raceLaps,
  setRaceLaps,
  isClosedLoop,
  setIsClosedLoop,
  sessionBestTime,
  sessionBestRider,
  laps,
  lapsToGo,
  flag,
  latestAnnouncement,
  soundEnabled,
  setSoundEnabled,
  selectedRiderId,
  setSelectedRiderId,
  isSetupOpen,
  setIsSetupOpen,
  speedhiveUrl,
  setSpeedhiveUrl,
  handleLoadSpeedhiveSession,
  setRiders,
  setRaceTitle,
  setSessionName,
  setGroupName,
  setFlag,
  setLatestAnnouncement,
  setConnectionStatus,
  addWebSocketLog,
  autoSimulate,
  setAutoSimulate,
  simSpeedSeconds,
  setSimSpeedSeconds,
  triggerManualOvertake,
  handleResetTiming,
  isEditingGrid,
  setIsEditingGrid,
  handleAddRider,
  newRiderName,
  setNewRiderName,
  newRiderNo,
  setNewRiderNo,
  newRiderTeam,
  setNewRiderTeam,
  editingRider,
  setEditingRider,
  handleUpdateRiderSpecs,
  handleDeleteRider,
  isConsoleOpen,
  setIsConsoleOpen,
  webSocketLogs,
  playBeep,
}) => {
  return (
    <div className="min-h-screen text-zinc-100 font-sans flex flex-col bg-zinc-950 selection:bg-red-600 selection:text-white relative overflow-x-hidden" id="main-container">
      {/* Background Decoratives */}
      <div className="absolute top-0 right-0 w-1/3 h-full opacity-5 pointer-events-none overflow-hidden z-0">
        <div className="absolute -right-10 top-20 text-[350px] font-black italic text-zinc-400 rotate-12 leading-none select-none">GP</div>
      </div>

      {/* Broadcast Header */}
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
              {connectionStatus === 'connected' ? 'ONLINE' : connectionStatus === 'connecting' ? 'CONNECTING' : connectionStatus === 'waiting' ? 'WAITING' : 'OFFLINE'}
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
                  title={isTimerRunning ? 'Pause timer' : 'Start timer'}
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
                  {flag === 3 ? 'Finished' : lapsToGo} {flag !== 3 && <span className="text-xs text-zinc-500 font-normal">LAPS</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Track Console */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6 relative z-10 animate-fade-in" id="main-content">
        <section className="w-full flex flex-col gap-4" id="leaderboard-section">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-10" id="leaderboard-board-panel">
            {/* Banner */}
            <div className="bg-zinc-900/90 px-6 py-4 border-b border-zinc-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-[173px]">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-md shadow-emerald-500/50"></span>
                <span className="text-xs font-black uppercase tracking-widest text-zinc-400 italic">Leaderboard Timing Console</span>
              </div>

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

            {/* Headers */}
            <div className="grid grid-cols-12 bg-zinc-900/60 py-4.5 px-6 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 italic border-b border-zinc-800">
              <div className="col-span-2 sm:col-span-1 text-right">
                <span className="padding-inline-end pe-4">Stat</span> Pos
              </div>
              <div className="col-span-2 sm:col-span-1 text-center">No.</div>
              <div className="col-span-5 sm:col-span-6 pl-4">Rider / Team Specifications</div>
              <div className="col-span-3 text-right">Time telemetry (best / lst)</div>
            </div>

            {/* Rider Rows */}
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
                    const isLeader = index === 0;

                    const rowBorderClass = isLeader
                      ? 'border-l-4 border-red-600 bg-zinc-900/40 hover:bg-zinc-800/60'
                      : 'border-l-4 border-zinc-700 bg-zinc-900/10 hover:bg-zinc-800/50';

                    const posTextStyle = isLeader
                      ? 'text-3xl font-black italic text-red-600 font-mono tracking-tight'
                      : 'text-2xl font-black italic text-zinc-400 font-mono tracking-tight';

                    const isRecentlyChanged = rider.changeTime && Date.now() - rider.changeTime < 1300;
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
                        {/* Position */}
                        <div className="col-span-2 sm:col-span-1 flex items-center justify-self-end gap-3 pe-4">
                          <div className="hidden sm:block">
                            {rider.changeDirection === 'up' && <ChevronUp className="w-4 h-4 text-emerald-500" />}
                            {rider.changeDirection === 'down' && <ChevronDown className="w-4 h-4 text-red-500" />}
                            {(!rider.changeDirection || rider.changeDirection === 'steady') && (
                              <span className="text-zinc-650 text-3xl font-bold">{rider.if ? '🏁' : '-'}</span>
                            )}
                          </div>

                          <span className={posTextStyle} id={`rider-pos-${rider.id}`}>
                            {(index + 1).toString().padStart(2, '0')}
                          </span>
                        </div>

                        {/* Vehicle No */}
                        <div className="col-span-2 sm:col-span-1 text-center">
                          <span className="text-3xl font-black italic tracking-tighter text-zinc-100 select-none font-sans">
                            {rider.no}
                          </span>
                        </div>

                        {/* Rider Name / Team */}
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

                        {/* Timings */}
                        <div className="col-span-3 text-right flex flex-col justify-center">
                          <div className="font-mono text-lg md:text-xl font-black text-zinc-100 tracking-tight leading-none">
                            {rider.btTm || '--:--.---'}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-1.5 leading-none uppercase tracking-wider flex items-center justify-end gap-1">
                            <span className="font-bold">LST:</span> {rider.lsTm || '--:--.---'}
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

      {/* Setup Drawer */}
      <AnimatePresence>
        {isSetupOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSetupOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 210 }}
              className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 flex flex-col overflow-hidden"
              id="settings-drawer"
            >
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

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Speedhive URL input */}
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
                      className="w-full h-20 bg-zinc-950 border border-zinc-800 p-3 rounded text-xs font-mono text-zinc-300 focus:outline-none focus:border-red-600 leading-relaxed"
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
                        setLatestAnnouncement('');
                        handleLoadSpeedhiveSession();
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
                          setConnectionStatus('disconnected');
                          setFlag(0);
                          setLatestAnnouncement('');
                          addWebSocketLog('system', '🧹 Speedhive configurations reset back to pristine demo starting grid.');
                        }}
                        className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-bold uppercase tracking-wider rounded cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Connection info */}
                <div className="space-y-3 bg-zinc-950/40 p-4 border border-zinc-800 rounded-xl">
                  <h3 className="text-xs font-black tracking-widest uppercase text-zinc-400 italic">Connection Info Status</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="bg-zinc-950 p-2.5 border border-zinc-850 rounded">
                      <span className="text-zinc-500 text-[9px] uppercase font-bold block leading-none">Hub Status</span>
                      <span
                        className={`font-bold mt-1.5 block flex items-center gap-1.5 ${
                          connectionStatus === 'connected'
                            ? 'text-emerald-400'
                            : connectionStatus === 'connecting' || connectionStatus === 'setting up'
                            ? 'text-amber-400'
                            : 'text-red-500'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            connectionStatus === 'connected'
                              ? 'bg-emerald-400 animate-pulse'
                              : connectionStatus === 'connecting'
                              ? 'bg-amber-400 animate-ping'
                              : 'bg-red-500'
                          }`}
                        />
                        {connectionStatus.toUpperCase()}
                      </span>
                    </div>
                    <div className="bg-zinc-950 p-2.5 border border-zinc-850 rounded">
                      <span className="text-zinc-500 text-[9px] uppercase font-bold block leading-none">Session Code</span>
                      <span className="text-zinc-300 font-bold mt-1.5 block truncate">
                        {parseSpeedhiveUrl(speedhiveUrl).sessionId
                          ? parseSpeedhiveUrl(speedhiveUrl).sessionId?.substring(0, 10) + '...'
                          : 'Demo Mode'}
                      </span>
                    </div>
                  </div>

                  {connectionError && (
                    <div className="p-2.5 bg-red-950/40 border border-red-900 text-red-300 text-[10px] font-mono rounded leading-relaxed">
                      <strong>WebSocket Error:</strong> {connectionError}
                    </div>
                  )}
                </div>

                {/* Grid Configuration */}
                <div className="space-y-3 bg-zinc-950/40 p-4 border border-zinc-800 rounded-xl">
                  <h3 className="text-xs font-black tracking-widest uppercase text-zinc-400 italic">Race Grid Configuration</h3>
                  
                  <div className="pt-1">
                    <a
                      href="/manual"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md shadow-blue-950/40"
                    >
                      <Terminal className="w-4 h-4" /> Open Manual Timing Desk (/manual)
                    </a>
                  </div>

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

                {/* Simulator */}
                <div className="space-y-3 bg-zinc-950/40 p-4 border border-zinc-800 rounded-xl">
                  <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                    <h3 className="text-xs font-black tracking-widest uppercase text-zinc-400 italic flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-red-500" /> AI Race Simulator
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase font-bold flex items-center gap-1 ${
                        autoSimulate
                          ? 'bg-emerald-950 border border-emerald-800 text-emerald-400'
                          : 'bg-zinc-950 border border-zinc-850 text-zinc-500'
                      }`}
                    >
                      {autoSimulate ? 'Enabled' : 'Paused'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setAutoSimulate(true);
                        playBeep('tick');
                      }}
                      className={`py-2 px-3 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        autoSimulate ? 'bg-red-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5" /> Start Sim
                    </button>
                    <button
                      onClick={() => {
                        setAutoSimulate(false);
                        playBeep('tick');
                      }}
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

                {/* Rider Pack Management */}
                <div className="space-y-3 bg-zinc-950/40 p-4 border border-zinc-800 rounded-xl">
                  <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                    <h3 className="text-xs font-black tracking-widest uppercase text-zinc-400 italic">Rider Pack Management</h3>
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
                        <label className="text-[9px] text-zinc-500 uppercase font-black">Club Name / Team</label>
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

                  {selectedRiderId && (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3" id="selected-rider-telemetry-profile">
                      {(() => {
                        const rider = riders.find((r) => r.id === selectedRiderId);
                        if (!rider) return <p className="text-xs text-zinc-500">Rider record not found.</p>;
                        return (
                          <>
                            <div className="flex justify-between items-start border-b border-zinc-850 pb-2">
                              <div>
                                <span className="text-[9px] uppercase font-black tracking-wider text-red-500 italic">Rider Specs Profile</span>
                                <h3 className="text-sm font-bold text-zinc-100 uppercase">{rider.nam}</h3>
                              </div>
                              <span className="text-2xl font-black italic text-zinc-100">#{rider.no}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                              <div>
                                <span className="text-zinc-500 text-[9px] block leading-none uppercase font-black">Class Team</span>
                                <span className="text-zinc-300 font-bold block truncate">{rider.cb || '-'}</span>
                              </div>
                              <div>
                                <span className="text-zinc-500 text-[9px] block leading-none uppercase font-black font-mono">Lap record</span>
                                <span className="text-zinc-300 font-bold">{rider.btTm || '--:--.---'}</span>
                              </div>
                            </div>

                            {editingRider?.id === rider.id ? (
                              <form onSubmit={handleUpdateRiderSpecs} className="space-y-3.5 border-t border-zinc-800 pt-3" id="inline-edit-profile-form">
                                <span className="text-[9px] text-red-500 font-black uppercase tracking-wider italic block">
                                  Inline Edit Specifications
                                </span>

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
                                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition-all flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Save Changes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingRider(null)}
                                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <div className="flex gap-2 border-t border-zinc-850 pt-3">
                                <button
                                  onClick={() => setEditingRider(rider)}
                                  className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" /> Edit Rider Specs
                                </button>
                                <button
                                  onClick={() => handleDeleteRider(rider.id)}
                                  className="px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-300 font-bold text-xs rounded transition-all border border-red-800/40 cursor-pointer"
                                  title="Delete Rider Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Developer Logs Console */}
                <div className="space-y-3 bg-zinc-950/40 p-4 border border-zinc-800 rounded-xl">
                  <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                    <h3 className="text-xs font-black tracking-widest uppercase text-zinc-400 italic flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-zinc-500" /> Live Telemetry Console Log
                    </h3>
                    <button
                      onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                      className="text-[9px] font-mono text-zinc-500 hover:text-zinc-300 uppercase tracking-widest cursor-pointer"
                    >
                      {isConsoleOpen ? 'Collapse' : 'Expand'}
                    </button>
                  </div>

                  {isConsoleOpen && (
                    <div className="bg-zinc-950 border border-zinc-850 p-3 rounded font-mono text-[10px] space-y-1.5 max-h-48 overflow-y-auto" id="console-logs-list">
                      {webSocketLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                          <span className="text-zinc-600 shrink-0">[{log.time}]</span>
                          <span
                            className={
                              log.type === 'ws'
                                ? 'text-amber-400'
                                : log.type === 'packet'
                                ? 'text-emerald-400'
                                : log.type === 'sim'
                                ? 'text-purple-400'
                                : 'text-zinc-400'
                            }
                          >
                            {log.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-zinc-900 border-t border-zinc-850 py-4 text-center text-[10px] font-mono text-zinc-500 mt-auto uppercase tracking-wider font-bold" id="timing-footer">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Broadcast Desk • Built for Speed • © 2026 Fathir Pahlevi</span>
          <span>Feed monitors active • 120hz frame cycles</span>
        </div>
      </footer>
    </div>
  );
};

export default MainBoardPage;
