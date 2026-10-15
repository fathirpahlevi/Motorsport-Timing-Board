import React, { useState, useEffect, useMemo } from 'react';
import { RiderResult, LowerThirdState } from '../types';
import {
  Eye,
  EyeOff,
  Radio,
  CheckSquare,
  Square,
  RotateCcw,
  ExternalLink,
  Users,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Search,
  AlertTriangle,
  Award,
  Sparkles,
} from 'lucide-react';

interface LowerThirdControlPageProps {
  riders: RiderResult[];
  socket?: WebSocket | null;
  lowerThirdState?: LowerThirdState;
  raceTitle?: string;
  sessionName?: string;
  groupName?: string;
}

export const LowerThirdControlPage: React.FC<LowerThirdControlPageProps> = ({
  riders,
  socket,
  lowerThirdState: propLowerThirdState,
  raceTitle = 'MOTOSPORT CHAMPIONSHIP',
  sessionName = 'LIVE SESSION',
  groupName = 'PREMIER CLASS',
}) => {
  // Active broadcast state
  const [broadcastState, setBroadcastState] = useState<LowerThirdState>(() => {
    return (
      propLowerThirdState || {
        visible: false,
        position: 'left',
        selectedRiderIds: [],
      }
    );
  });

  // Staged selection before user clicks "Activate Selected"
  const [stagedSelectedIds, setStagedSelectedIds] = useState<string[]>(() => {
    return propLowerThirdState?.selectedRiderIds || [];
  });

  const [stagedPosition, setStagedPosition] = useState<'left' | 'center' | 'right'>(() => {
    return propLowerThirdState?.position || 'left';
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Sync from props
  useEffect(() => {
    if (propLowerThirdState) {
      setBroadcastState(propLowerThirdState);
      setStagedSelectedIds(propLowerThirdState.selectedRiderIds);
      setStagedPosition(propLowerThirdState.position);
    }
  }, [propLowerThirdState]);

  // Sync from direct WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'lowerThirdControl') {
          const newState: LowerThirdState = {
            visible: !!data.visible,
            position: data.position || 'left',
            selectedRiderIds: Array.isArray(data.selectedRiderIds) ? data.selectedRiderIds : [],
          };
          setBroadcastState(newState);
        } else if (data.type === 'syncState' && data.raceState?.lowerThird) {
          const remoteLt = data.raceState.lowerThird;
          const newState: LowerThirdState = {
            visible: !!remoteLt.visible,
            position: remoteLt.position || 'left',
            selectedRiderIds: Array.isArray(remoteLt.selectedRiderIds) ? remoteLt.selectedRiderIds : [],
          };
          setBroadcastState(newState);
        }
      } catch (err) {
        // ignore
      }
    };

    socket.addEventListener('message', handleMessage);
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'syncState' }));
    }

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket]);

  // Broadcast helper
  const sendControlMessage = (visible: boolean, position: 'left' | 'center' | 'right', riderIds: string[]) => {
    const payload = {
      type: 'lowerThirdControl',
      visible,
      position,
      selectedRiderIds: riderIds.slice(0, 5),
    };

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
    setBroadcastState({
      visible,
      position,
      selectedRiderIds: riderIds.slice(0, 5),
    });
  };

  // Toggle racer selection checkbox
  const handleToggleRider = (id: string) => {
    setStatusNotice(null);
    if (stagedSelectedIds.includes(id)) {
      setStagedSelectedIds((prev) => prev.filter((rId) => rId !== id));
    } else {
      if (stagedSelectedIds.length >= 5) {
        setStatusNotice('Maximum 5 racers can be displayed simultaneously.');
        return;
      }
      setStagedSelectedIds((prev) => [...prev, id]);
    }
  };

  // Preset selections
  const handleSelectTop = (count: number) => {
    setStatusNotice(null);
    const sorted = [...riders].sort((a, b) => (a.lbpos || 999) - (b.lbpos || 999));
    const topIds = sorted.slice(0, Math.min(count, 5)).map((r) => r.id);
    setStagedSelectedIds(topIds);
  };

  const handleClearSelection = () => {
    setStagedSelectedIds([]);
    setStatusNotice(null);
  };

  // Button: Activate & Send Staged Racers to Lower Third
  const handleActivateChecked = () => {
    if (stagedSelectedIds.length === 0) {
      setStatusNotice('Please select at least 1 racer before activating.');
      return;
    }
    setStatusNotice(null);
    // If more than 3 racers, force position to center
    const targetPos = stagedSelectedIds.length > 3 ? 'center' : stagedPosition;
    sendControlMessage(true, targetPos, stagedSelectedIds);
  };

  // Main Show/Hide Button Toggle
  const handleToggleMainVisibility = () => {
    const nextVisible = !broadcastState.visible;
    const targetPos = stagedSelectedIds.length > 3 ? 'center' : stagedPosition;
    sendControlMessage(nextVisible, targetPos, stagedSelectedIds.length > 0 ? stagedSelectedIds : broadcastState.selectedRiderIds);
  };

  // Position change
  const handleChangePosition = (pos: 'left' | 'center' | 'right') => {
    setStagedPosition(pos);
    if (broadcastState.visible) {
      const activeIds = broadcastState.selectedRiderIds;
      if (activeIds.length <= 3) {
        sendControlMessage(true, pos, activeIds);
      }
    }
  };

  // Filter riders by search query
  const filteredRiders = useMemo(() => {
    if (!searchQuery.trim()) return riders;
    const q = searchQuery.toLowerCase().trim();
    return riders.filter(
      (r) =>
        (r.fNam || r.nam || '').toLowerCase().includes(q) ||
        (r.no || r.dNo || '').toLowerCase().includes(q) ||
        (r.cb || '').toLowerCase().includes(q)
    );
  }, [riders, searchQuery]);

  // Selected rider objects for preview
  const broadcastedRiders = useMemo(() => {
    return broadcastState.selectedRiderIds
      .map((id) => riders.find((r) => r.id === id || r.no === id))
      .filter(Boolean) as RiderResult[];
  }, [broadcastState.selectedRiderIds, riders]);

  const hasUnappliedChanges = useMemo(() => {
    const active = broadcastState.selectedRiderIds;
    if (active.length !== stagedSelectedIds.length) return true;
    const sortedActive = [...active].sort();
    const sortedStaged = [...stagedSelectedIds].sort();
    return sortedActive.some((val, idx) => val !== sortedStaged[idx]);
  }, [broadcastState.selectedRiderIds, stagedSelectedIds]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-400 text-zinc-950 rounded-lg flex items-center justify-center font-racing font-black text-xl shadow-lg shadow-amber-950/40">
            L3
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-amber-400/20 text-amber-400 border border-amber-400/40 px-2 py-0.5 rounded">
                BROADCAST CONTROL
              </span>
              <span className="text-xs font-mono text-zinc-400">
                /lowerthirdcontrol
              </span>
            </div>
            <h1 className="text-lg font-black uppercase tracking-wider text-white font-racing">
              Lower Third Graphics Controller
            </h1>
          </div>
        </div>

        {/* Global Action & Link to /lowerthird */}
        <div className="flex items-center gap-3">
          <a
            href="/lowerthird"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold uppercase rounded-lg border border-zinc-700 flex items-center gap-2 transition-colors cursor-pointer"
            title="Open Lower Third overlay page in separate window (for OBS Browser Source)"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Overlay (/lowerthird)</span>
          </a>

          {/* Main ON AIR / OFF AIR Toggle Button */}
          <button
            type="button"
            onClick={handleToggleMainVisibility}
            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2.5 transition-all cursor-pointer shadow-lg ${
              broadcastState.visible
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/60 ring-2 ring-red-500/50 animate-pulse'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 shadow-zinc-950/60'
            }`}
          >
            {broadcastState.visible ? (
              <>
                <Radio className="w-4 h-4 text-white animate-spin" />
                <span>ON AIR (CLICK TO HIDE)</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-amber-400" />
                <span>OFF AIR (CLICK TO SHOW)</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Notice Toast */}
        {statusNotice && (
          <div className="p-3 bg-amber-950/80 border border-amber-600/80 rounded-xl flex items-center gap-3 text-amber-300 text-xs font-mono animate-fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{statusNotice}</span>
          </div>
        )}

        {/* TOP STATUS & CONTROLS DASHBOARD */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: On-Air Broadcast State */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-400" />
                On-Air Broadcast Status
              </span>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded font-mono ${
                  broadcastState.visible
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {broadcastState.visible ? 'LIVE ON AIR' : 'HIDDEN'}
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-zinc-850">
                <span className="text-zinc-500">Active Displayed:</span>
                <span className="text-white font-bold">
                  {broadcastState.selectedRiderIds.length} of 5 Racers
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-850">
                <span className="text-zinc-500">Screen Position:</span>
                <span className="text-amber-400 font-bold uppercase">
                  {broadcastState.selectedRiderIds.length > 3 ? 'CENTER (Auto)' : broadcastState.position}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Active Session:</span>
                <span className="text-zinc-300 font-bold truncate max-w-[180px]">
                  {sessionName} ({groupName})
                </span>
              </div>
            </div>

            {/* Quick Show / Hide Control */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleToggleMainVisibility}
                className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  broadcastState.visible
                    ? 'bg-red-950 hover:bg-red-900 text-red-200 border border-red-800'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                }`}
              >
                {broadcastState.visible ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Hide Lower Third Graphics
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Show Lower Third Graphics
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Column 2: Position Control */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Screen Position Control
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                (for ≤ 3 Racers)
              </span>
            </div>

            <p className="text-[11px] text-zinc-400">
              When 3 or fewer racers are shown, you can place the graphic at bottom-left, center, or bottom-right. When more than 3 racers are shown, it automatically centers.
            </p>

            {/* Position Selector Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleChangePosition('left')}
                disabled={stagedSelectedIds.length > 3}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs uppercase flex flex-col items-center gap-1.5 transition-all cursor-pointer border ${
                  stagedPosition === 'left'
                    ? 'bg-amber-400 text-zinc-950 border-amber-400 shadow-md shadow-amber-950/50'
                    : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                } ${stagedSelectedIds.length > 3 ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <AlignLeft className="w-4 h-4" />
                <span>Left</span>
              </button>

              <button
                type="button"
                onClick={() => handleChangePosition('center')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs uppercase flex flex-col items-center gap-1.5 transition-all cursor-pointer border ${
                  stagedPosition === 'center' || stagedSelectedIds.length > 3
                    ? 'bg-amber-400 text-zinc-950 border-amber-400 shadow-md shadow-amber-950/50'
                    : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                }`}
              >
                <AlignCenter className="w-4 h-4" />
                <span>Center</span>
              </button>

              <button
                type="button"
                onClick={() => handleChangePosition('right')}
                disabled={stagedSelectedIds.length > 3}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs uppercase flex flex-col items-center gap-1.5 transition-all cursor-pointer border ${
                  stagedPosition === 'right'
                    ? 'bg-amber-400 text-zinc-950 border-amber-400 shadow-md shadow-amber-950/50'
                    : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                } ${stagedSelectedIds.length > 3 ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <AlignRight className="w-4 h-4" />
                <span>Right</span>
              </button>
            </div>

            {stagedSelectedIds.length > 3 && (
              <p className="text-[10px] text-amber-400 font-mono italic">
                * Locked to Center because {stagedSelectedIds.length} racers are selected (&gt; 3).
              </p>
            )}
          </div>

          {/* Column 3: Activation & Selection Counter */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  Staged Selection
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    stagedSelectedIds.length > 0
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {stagedSelectedIds.length} / 5 Selected
                </span>
              </div>

              <p className="text-[11px] text-zinc-400">
                Check up to 5 racers below from the session lineup, then click activate to send them directly to the lower third overlay screen.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleActivateChecked}
                disabled={stagedSelectedIds.length === 0}
                className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                  stagedSelectedIds.length === 0
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
                    : hasUnappliedChanges
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 shadow-amber-950/50 animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>
                  {hasUnappliedChanges
                    ? `Apply & Send ${stagedSelectedIds.length} Racer${
                        stagedSelectedIds.length > 1 ? 's' : ''
                      } to Lower Third`
                    : `Selection Active (${stagedSelectedIds.length} Racers)`}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* LIVE LOWER THIRD MONITOR PREVIEW */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-black uppercase tracking-wider text-white font-mono">
                Live On-Air Monitor Preview
              </h2>
              <span className="text-[10px] font-mono text-zinc-500">
                (Visual simulation of /lowerthird)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  broadcastState.visible
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {broadcastState.visible ? 'VISIBLE ON SCREEN' : 'HIDDEN FROM SCREEN'}
              </span>
            </div>
          </div>

          {/* Simulated 16:9 Broadcast Canvas */}
          <div className="relative w-full h-48 sm:h-64 bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 flex flex-col justify-end p-4">
            {/* Background Grid Lines simulating video background */}
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
            <div className="absolute top-3 left-4 text-[10px] font-mono text-zinc-600 uppercase select-none">
              1080p Broadcast Preview Layer
            </div>

            {/* Lower third preview container */}
            {broadcastState.visible && broadcastedRiders.length > 0 ? (
              <div
                className={`relative z-10 flex ${
                  (broadcastState.selectedRiderIds.length > 3 ? 'center' : broadcastState.position) === 'left'
                    ? 'justify-start'
                    : (broadcastState.selectedRiderIds.length > 3 ? 'center' : broadcastState.position) === 'right'
                    ? 'justify-end'
                    : 'justify-center'
                }`}
              >
                <div
                  className={`flex gap-2 ${
                    (broadcastState.selectedRiderIds.length > 3 ? 'center' : broadcastState.position) === 'center'
                      ? 'flex-row flex-wrap justify-center'
                      : 'flex-col'
                  }`}
                >
                  {broadcastedRiders.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-none overflow-hidden shadow-xl flex flex-col w-72 sm:w-80 bg-zinc-950/95 border-x border-b border-zinc-800 text-left"
                    >
                      {/* Top border */}
                      <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />
                      {/* 2-column layout */}
                      <div className="grid grid-cols-[56px_1fr] min-h-[52px]">
                        {/* Position */}
                        <div className="bg-amber-400 text-zinc-950 flex flex-col items-center justify-center font-black select-none">
                          <span className="text-[8px] tracking-widest uppercase font-mono font-bold leading-none opacity-80">
                            POS
                          </span>
                          <span className="text-xl font-racing font-black leading-none">
                            {r.pos || String(r.lbpos || 1)}
                          </span>
                        </div>
                        {/* Col 2 */}
                        <div className="flex flex-col justify-between bg-zinc-950">
                          {/* Row 1: Full name and race number */}
                          <div className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-900 border-b border-zinc-850">
                            <span className="font-black uppercase text-white tracking-wider text-xs truncate font-mono">
                              {r.fNam || r.nam}
                            </span>
                            <span className="font-racing font-black text-amber-400 text-sm ml-2 shrink-0">
                              #{r.dNo || r.no}
                            </span>
                          </div>
                          {/* Row 2: Team name */}
                          <div className="px-2.5 py-1 bg-zinc-950">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 truncate block font-mono">
                              {r.cb || 'INDEPENDENT'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-600 text-xs font-mono">
                [ Lower Third is currently {broadcastState.visible ? 'empty' : 'OFF AIR'} ]
              </div>
            )}
          </div>
        </div>

        {/* RACERS SELECTION TABLE */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white font-racing flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                Current Session Racers ({riders.length} Racers Available)
              </h2>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Check up to 5 racers below to display on the lower third.
              </p>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono">
                Presets:
              </span>
              <button
                type="button"
                onClick={() => handleSelectTop(1)}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold font-mono rounded transition-colors cursor-pointer"
              >
                Leader (P1)
              </button>
              <button
                type="button"
                onClick={() => handleSelectTop(3)}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold font-mono rounded transition-colors cursor-pointer"
              >
                Top 3
              </button>
              <button
                type="button"
                onClick={() => handleSelectTop(5)}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold font-mono rounded transition-colors cursor-pointer"
              >
                Top 5
              </button>
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-bold font-mono rounded transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Search Filter Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search racer by name, number, or team..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
            />
          </div>

          {/* Racers Table */}
          <div className="overflow-x-auto border border-zinc-800 rounded-xl max-h-[500px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead className="sticky top-0 bg-zinc-950 border-b border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400 z-10">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">Select</th>
                  <th className="py-2.5 px-3 text-center w-16">Pos</th>
                  <th className="py-2.5 px-3 text-center w-16">No.</th>
                  <th className="py-2.5 px-3">Racer Full Name</th>
                  <th className="py-2.5 px-3">Team / Club</th>
                  <th className="py-2.5 px-3 text-right">Best Lap</th>
                  <th className="py-2.5 px-3 text-center w-28">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {filteredRiders.map((r, index) => {
                  const isChecked = stagedSelectedIds.includes(r.id);
                  const isLiveOnAir = broadcastState.visible && broadcastState.selectedRiderIds.includes(r.id);
                  const isLimitReached = !isChecked && stagedSelectedIds.length >= 5;

                  return (
                    <tr
                      key={r.id || index}
                      onClick={() => handleToggleRider(r.id)}
                      className={`hover:bg-zinc-800/60 cursor-pointer transition-colors ${
                        isLiveOnAir
                          ? 'bg-amber-400/10'
                          : isChecked
                          ? 'bg-zinc-800/40'
                          : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleRider(r.id);
                          }}
                          disabled={isLimitReached}
                          className={`cursor-pointer ${
                            isLimitReached ? 'opacity-30 cursor-not-allowed' : ''
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-600 hover:text-zinc-400" />
                          )}
                        </button>
                      </td>

                      {/* Position */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block w-8 py-0.5 rounded bg-zinc-800 text-white font-bold text-center font-racing">
                          P{r.pos || r.lbpos || index + 1}
                        </span>
                      </td>

                      {/* Racer No */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-racing font-black text-amber-400 text-sm">
                          #{r.dNo || r.no}
                        </span>
                      </td>

                      {/* Full Name */}
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-white uppercase tracking-wider">
                          {r.fNam || r.nam}
                        </span>
                      </td>

                      {/* Team */}
                      <td className="py-2.5 px-3 text-zinc-400">
                        <span>{r.cb || '-'}</span>
                      </td>

                      {/* Best Lap */}
                      <td className="py-2.5 px-3 text-right text-zinc-300 font-mono">
                        <span>{r.btTm || '-'}</span>
                      </td>

                      {/* On-Air Badge */}
                      <td className="py-2.5 px-3 text-center">
                        {isLiveOnAir ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-600 text-white font-mono animate-pulse">
                            ON AIR
                          </span>
                        ) : isChecked ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-400 border border-amber-400/40 font-mono">
                            CHECKED
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-[10px] font-mono">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
