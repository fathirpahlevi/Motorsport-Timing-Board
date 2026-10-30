import React, { useState, useEffect, useMemo } from 'react';
import { RiderResult, LowerThirdState, LowerThirdInfoMode } from '../types';
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
  Layers,
  Timer,
  Clock,
  Compass,
  ChevronsRight,
  Hash,
} from 'lucide-react';

interface LowerThirdControlPageProps {
  riders: RiderResult[];
  socket?: WebSocket | null;
  lowerThirdState?: LowerThirdState;
  raceTitle?: string;
  sessionName?: string;
  groupName?: string;
}

const formatDeltaTime = (timeVal?: string | number, isLeader: boolean = false): string => {
  if (isLeader) return 'LEADER';
  if (timeVal === undefined || timeVal === null || timeVal === '') return '-';
  const strVal = String(timeVal).trim();
  if (strVal === '-' || strVal === '0' || strVal === '0.000' || strVal === '0.0') return isLeader ? 'LEADER' : '-';
  if (strVal.startsWith('+') || strVal.toLowerCase().includes('lap')) return strVal;
  const num = parseFloat(strVal);
  if (!isNaN(num) && num > 0) return `+${strVal}`;
  return strVal;
};

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
        infoMode: 'team',
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

  // Info Mode state (which data to show on row 2 of Lower Third)
  const [infoMode, setInfoMode] = useState<LowerThirdInfoMode>(() => {
    return propLowerThirdState?.infoMode || 'team';
  });

  // Preset Mode: null = deactivated / random selection, 3 = batch 3 racers, 5 = batch 5 racers
  const [activePresetMode, setActivePresetMode] = useState<3 | 5 | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Sync from props
  useEffect(() => {
    if (propLowerThirdState) {
      setBroadcastState(propLowerThirdState);
      setStagedSelectedIds(propLowerThirdState.selectedRiderIds);
      setStagedPosition(propLowerThirdState.position);
      if (propLowerThirdState.infoMode) {
        setInfoMode(propLowerThirdState.infoMode);
      }
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
            infoMode: (data.infoMode as LowerThirdInfoMode) || 'team',
          };
          setBroadcastState(newState);
          if (data.infoMode) setInfoMode(data.infoMode);
        } else if (data.type === 'syncState' && data.raceState?.lowerThird) {
          const remoteLt = data.raceState.lowerThird;
          const newState: LowerThirdState = {
            visible: !!remoteLt.visible,
            position: remoteLt.position || 'left',
            selectedRiderIds: Array.isArray(remoteLt.selectedRiderIds) ? remoteLt.selectedRiderIds : [],
            infoMode: (remoteLt.infoMode as LowerThirdInfoMode) || 'team',
          };
          setBroadcastState(newState);
          if (remoteLt.infoMode) setInfoMode(remoteLt.infoMode);
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
  const sendControlMessage = (
    visible: boolean,
    position: 'left' | 'center' | 'right',
    riderIds: string[],
    targetInfoMode: LowerThirdInfoMode = infoMode
  ) => {
    const payload = {
      type: 'lowerThirdControl',
      visible,
      position,
      selectedRiderIds: riderIds.slice(0, 5),
      infoMode: targetInfoMode,
    };

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
    setBroadcastState({
      visible,
      position,
      selectedRiderIds: riderIds.slice(0, 5),
      infoMode: targetInfoMode,
    });
  };

  // Change info mode (which data displays in row 2)
  const handleSelectInfoMode = (newMode: LowerThirdInfoMode) => {
    setInfoMode(newMode);
    const modeLabel =
      newMode === 'team'
        ? 'Team / Club'
        : newMode === 'bestTime'
        ? 'Best Time'
        : newMode === 'lastLap'
        ? 'Last Lap'
        : newMode === 'gap'
        ? 'Gap to Leader'
        : newMode === 'interval'
        ? 'Interval'
        : 'Lap Count';

    setStatusNotice(`Lower Third Row 2 displayed data set to: ${modeLabel}`);

    // If already visible on air, update lower third immediately
    if (broadcastState.visible) {
      const targetPos = stagedSelectedIds.length > 3 ? 'center' : stagedPosition;
      const idsToSend = stagedSelectedIds.length > 0 ? stagedSelectedIds : broadcastState.selectedRiderIds;
      sendControlMessage(true, targetPos, idsToSend, newMode);
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

  // Toggle racer selection or range selection
  const handleRiderRowClick = (rider: RiderResult, index: number) => {
    setStatusNotice(null);

    // If a preset mode (3 racers or 5 racers) is active:
    if (activePresetMode !== null) {
      const startIndex = filteredRiders.findIndex((r) => r.id === rider.id);
      const safeIndex = startIndex !== -1 ? startIndex : index;
      const count = activePresetMode;
      const range = filteredRiders.slice(safeIndex, safeIndex + count);
      const rangeIds = range.map((r) => r.id);
      setStagedSelectedIds(rangeIds);
      const posDisplay = rider.pos || String(rider.lbpos || safeIndex + 1);
      setStatusNotice(
        `Selected ${rangeIds.length} racers starting from P${posDisplay} (${range.map((r) => `#${r.no || r.dNo}`).join(', ')}) [${activePresetMode} Racers Preset Active]`
      );
      return;
    }

    // Normal individual / random selection (preset deactivated)
    if (stagedSelectedIds.includes(rider.id)) {
      setStagedSelectedIds((prev) => prev.filter((rId) => rId !== rider.id));
    } else {
      if (stagedSelectedIds.length >= 5) {
        setStatusNotice('Maximum 5 racers can be displayed simultaneously.');
        return;
      }
      setStagedSelectedIds((prev) => [...prev, rider.id]);
    }
  };

  // Preset button toggle: "3 Racers" or "5 Racers"
  const handleTogglePreset = (count: 3 | 5) => {
    if (activePresetMode === count) {
      // Deactivate
      setActivePresetMode(null);
      setStatusNotice(`Preset ${count} Racers deactivated. Random racer selection is now active.`);
    } else {
      // Activate
      setActivePresetMode(count);
      const topIds = filteredRiders.slice(0, count).map((r) => r.id);
      setStagedSelectedIds(topIds);
      setStatusNotice(
        `Preset ${count} Racers activated! Top ${count} selected. Click any racer row below to select ${count} starting from that racer (e.g. click P5 to select P5, P6, P7).`
      );
    }
  };

  const handleClearSelection = () => {
    setStagedSelectedIds([]);
    setActivePresetMode(null);
    setStatusNotice('Racer selection cleared.');
  };

  // Button: Activate & Send Staged Racers to Lower Third
  const handleActivateChecked = () => {
    if (stagedSelectedIds.length === 0) {
      setStatusNotice('Please select at least 1 racer before activating.');
      return;
    }
    setStatusNotice(null);
    const targetPos = stagedSelectedIds.length > 3 ? 'center' : stagedPosition;
    sendControlMessage(true, targetPos, stagedSelectedIds, infoMode);
  };

  // Main Show/Hide Button Toggle
  const handleToggleMainVisibility = () => {
    const nextVisible = !broadcastState.visible;
    const targetPos = stagedSelectedIds.length > 3 ? 'center' : stagedPosition;
    sendControlMessage(
      nextVisible,
      targetPos,
      stagedSelectedIds.length > 0 ? stagedSelectedIds : broadcastState.selectedRiderIds,
      infoMode
    );
  };

  // Position change
  const handleChangePosition = (pos: 'left' | 'center' | 'right') => {
    setStagedPosition(pos);
    if (broadcastState.visible) {
      const activeIds = broadcastState.selectedRiderIds;
      if (activeIds.length <= 3) {
        sendControlMessage(true, pos, activeIds, infoMode);
      }
    }
  };

  // Racers for preview container: always visible!
  const previewRiders = useMemo(() => {
    const ids = stagedSelectedIds.length > 0 ? stagedSelectedIds : broadcastState.selectedRiderIds;
    if (ids.length > 0) {
      return ids
        .map((id) => riders.find((r) => r.id === id || r.no === id))
        .filter(Boolean) as RiderResult[];
    }
    // Fallback to top 3 so preview is never completely empty
    return riders.slice(0, 3);
  }, [stagedSelectedIds, broadcastState.selectedRiderIds, riders]);

  const hasUnappliedChanges = useMemo(() => {
    const active = broadcastState.selectedRiderIds;
    if (active.length !== stagedSelectedIds.length) return true;
    const sortedActive = [...active].sort();
    const sortedStaged = [...stagedSelectedIds].sort();
    return (
      sortedActive.some((val, idx) => val !== sortedStaged[idx]) ||
      broadcastState.infoMode !== infoMode
    );
  }, [broadcastState.selectedRiderIds, broadcastState.infoMode, stagedSelectedIds, infoMode]);

  // Info mode options specification
  const infoModeOptions: Array<{
    id: LowerThirdInfoMode;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'team',
      label: 'Team / Club',
      sublabel: 'Team name',
      icon: <Users className="w-3.5 h-3.5" />,
    },
    {
      id: 'bestTime',
      label: 'Best Time',
      sublabel: 'Best lap time',
      icon: <Timer className="w-3.5 h-3.5" />,
    },
    {
      id: 'lastLap',
      label: 'Last Lap',
      sublabel: 'Last lap time',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    {
      id: 'gap',
      label: 'Gap',
      sublabel: 'Delta to leader',
      icon: <Compass className="w-3.5 h-3.5" />,
    },
    {
      id: 'interval',
      label: 'Interval',
      sublabel: 'Delta to car ahead',
      icon: <ChevronsRight className="w-3.5 h-3.5" />,
    },
    {
      id: 'lapCount',
      label: 'Lap Count',
      sublabel: 'Laps completed',
      icon: <Hash className="w-3.5 h-3.5" />,
    },
  ];

  // Helper to render preview row 2
  const renderPreviewRow2 = (rider: RiderResult, mode: LowerThirdInfoMode) => {
    const isLeader = rider.pos === '1' || rider.lbpos === 1;
    switch (mode) {
      case 'bestTime':
        return (
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-widest px-1 py-0.2 rounded bg-amber-400/20">
              BEST
            </span>
            <span className="text-xs font-mono font-black text-white truncate">
              {rider.btTm || '--:--.---'}
            </span>
          </div>
        );
      case 'lastLap':
        return (
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-widest px-1 py-0.2 rounded bg-cyan-400/20">
              LAST
            </span>
            <span className="text-xs font-mono font-black text-white truncate">
              {rider.lsTm || '--:--.---'}
            </span>
          </div>
        );
      case 'gap': {
        const gapText = formatDeltaTime(rider.gp, isLeader);
        return (
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest px-1 py-0.2 rounded bg-emerald-400/20">
              GAP
            </span>
            <span className="text-xs font-mono font-black text-white truncate">
              {gapText}
            </span>
          </div>
        );
      }
      case 'interval': {
        const intText = formatDeltaTime(rider.df, isLeader);
        return (
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-widest px-1 py-0.2 rounded bg-blue-400/20">
              INT
            </span>
            <span className="text-xs font-mono font-black text-white truncate">
              {intText}
            </span>
          </div>
        );
      }
      case 'lapCount': {
        const lapsText = rider.ls !== undefined && rider.ls !== null ? `${rider.ls} LAPS` : '-';
        return (
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[9px] font-mono font-bold text-yellow-400 uppercase tracking-widest px-1 py-0.2 rounded bg-yellow-400/20">
              LAPS
            </span>
            <span className="text-xs font-mono font-black text-white truncate">
              {lapsText}
            </span>
          </div>
        );
      }
      case 'team':
      default:
        return (
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 truncate font-mono">
            {rider.cb || '-'}
          </span>
        );
    }
  };

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

        {/* Global Action & Main ON AIR / OFF AIR Toggle Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleActivateChecked}
            disabled={stagedSelectedIds.length === 0}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
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
                ? `Apply & Send (${stagedSelectedIds.length} Racers)`
                : `Selection Active (${stagedSelectedIds.length} Racers)`}
            </span>
          </button>

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
                <span>HIDE (ON AIR)</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-amber-400" />
                <span>SHOW ON AIR</span>
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
                  {broadcastState.selectedRiderIds.length > 3
                    ? 'CENTER (Auto)'
                    : broadcastState.position}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-850">
                <span className="text-zinc-500">Row 2 Info Mode:</span>
                <span className="text-cyan-400 font-bold uppercase">
                  {infoMode === 'team'
                    ? 'Team Name'
                    : infoMode === 'bestTime'
                    ? 'Best Time'
                    : infoMode === 'lastLap'
                    ? 'Last Lap'
                    : infoMode === 'gap'
                    ? 'Gap'
                    : infoMode === 'interval'
                    ? 'Interval'
                    : 'Lap Count'}
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

          {/* Column 3: Selection & Preset Mode Summary */}
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

              <div className="text-xs font-mono space-y-1.5 text-zinc-400">
                <div className="flex justify-between">
                  <span>Preset Mode:</span>
                  <span
                    className={`font-bold ${
                      activePresetMode !== null
                        ? 'text-amber-400 uppercase'
                        : 'text-zinc-500'
                    }`}
                  >
                    {activePresetMode !== null
                      ? `${activePresetMode} Racers Range Active`
                      : 'Deactivated (Random)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Target Screen Pos:</span>
                  <span className="text-white font-bold uppercase">
                    {stagedSelectedIds.length > 3 ? 'Center' : stagedPosition}
                  </span>
                </div>
              </div>
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
                    ? `Apply & Send (${stagedSelectedIds.length} Racers) to Air`
                    : `Selection Active (${stagedSelectedIds.length} Racers)`}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* LIVE LOWER THIRD MONITOR PREVIEW (ALWAYS VISIBLE AS REQUESTED) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-black uppercase tracking-wider text-white font-mono">
                Live Monitor Preview
              </h2>
              <span className="text-[10px] font-mono text-zinc-400">
                (Always visible real-time simulation of /lowerthird)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                  broadcastState.visible
                    ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
                    : 'bg-amber-400/20 text-amber-400 border border-amber-400/50'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    broadcastState.visible ? 'bg-red-500 animate-ping' : 'bg-amber-400'
                  }`}
                />
                {broadcastState.visible
                  ? 'ON AIR BROADCASTING'
                  : 'OFF AIR (PREVIEW ONLY)'}
              </span>
            </div>
          </div>

          {/* Simulated 16:9 Broadcast Canvas: ALWAYS VISIBLE */}
          <div className="relative w-full min-h-[170px] sm:min-h-[200px] bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 flex flex-col justify-end p-4">
            {/* Background Grid Lines simulating camera video background */}
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
            <div className="absolute top-3 left-4 text-[10px] font-mono text-zinc-500 uppercase select-none flex items-center gap-2">
              <span>1080p Broadcast Layer Simulation</span>
              <span className="text-zinc-600">|</span>
              <span className="text-cyan-400 font-bold">
                Showing: {previewRiders.length} Racer{previewRiders.length > 1 ? 's' : ''}
              </span>
              <span className="text-zinc-600">|</span>
              <span className="text-amber-400 font-bold uppercase">
                Row 2: {infoMode}
              </span>
            </div>

            {/* Lower third preview container: ALWAYS RENDERED */}
            <div
              className={`relative z-10 flex ${
                (previewRiders.length > 3 ? 'center' : stagedPosition) === 'left'
                  ? 'justify-start'
                  : (previewRiders.length > 3 ? 'center' : stagedPosition) === 'right'
                  ? 'justify-end'
                  : 'justify-center'
              }`}
            >
              <div
                className={`flex gap-3 ${
                  (previewRiders.length > 3 ? 'center' : stagedPosition) === 'center'
                    ? 'flex-row flex-wrap justify-center'
                    : 'flex-col'
                }`}
              >
                {previewRiders.map((r) => {
                  const posDisplay = r.pos || String(r.lbpos || 1);
                  const raceNumber = r.dNo || r.no || '-';
                  const fullName = r.fNam || r.nam || 'UNKNOWN';

                  return (
                    <div
                      key={r.id}
                      className="rounded-none overflow-hidden shadow-2xl flex flex-col w-[340px] sm:w-[380px] bg-zinc-950/95 border-x-4 border-b border-zinc-300 text-left"
                    >
                      {/* Top Animated Border Line */}
                      <div className="h-1.5 w-full bg-gradient-to-r from-zinc-300 via-white to-zinc-500" />

                      {/* 2-Column Grid Card */}
                      <div className="grid grid-cols-[52px_1fr] min-h-[58px]">
                        {/* COLUMN 1: Position */}
                        <div className="bgbiruYamaha text-zinc-100 flex flex-col items-center justify-center font-black select-none border-r border-blue-600">
                          <span className="text-[9px] tracking-widest uppercase font-bold leading-none opacity-80 mb-0.5">
                            POS
                          </span>
                          <span className="text-xl font-mono font-black leading-none">
                            {posDisplay}
                          </span>
                        </div>

                        {/* COLUMN 2: Full Name, Number & Selected Info Mode */}
                        <div className="flex flex-col justify-between bg-zinc-950 truncate">
                          {/* ROW 1: Name & Race Number */}
                          <div className="flex items-center justify-between px-3 pb-0 pt-1.5 bg-gradient-to-r from-zinc-900 to-zinc-950 border-b border-zinc-850">
                            <div className="truncate pr-2">
                              <span className="font-black uppercase text-white tracking-wider text-sm truncate block font-mono">
                                {fullName}
                              </span>
                            </div>

                            <div className="shrink-0 flex items-center gap-1 pl-1 border-l border-zinc-400">
                              <span className="text-xs font-mono text-zinc-400 font-bold uppercase">
                                NO.
                              </span>
                              <span className="font-racing font-extrabold text-blue-500 text-base leading-none tracking-tight">
                                {raceNumber}
                              </span>
                            </div>
                          </div>

                          {/* ROW 2: Dynamic Info Row based on infoMode */}
                          <div className="px-3 pb-1 pt-0.5 bg-zinc-950 flex items-center min-h-[28px]">
                            {renderPreviewRow2(r, infoMode)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RACERS SELECTION & INFORMATION CONTROLLER */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-5">
          {/* Section Header & Presets */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white font-racing flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                Current Session Racers ({riders.length} Racers in Grid)
              </h2>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                {activePresetMode !== null
                  ? `[${activePresetMode} Racers Preset Active] Click any row to select ${activePresetMode} consecutive racers starting from that racer position.`
                  : 'Random mode active: check/uncheck racers individually (max 5).'}
              </p>
            </div>

            {/* Presets: 3 Racers toggle, 5 Racers toggle, Clear */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono">
                Preset Modes:
              </span>

              {/* 3 Racers Toggle Button */}
              <button
                type="button"
                onClick={() => handleTogglePreset(3)}
                className={`px-3 py-1.5 text-xs font-bold font-mono rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border ${
                  activePresetMode === 3
                    ? 'bg-amber-400 text-zinc-950 border-amber-300 shadow-md shadow-amber-950/60 font-black'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                }`}
              >
                <span>3 Racers</span>
                {activePresetMode === 3 && (
                  <span className="text-[9px] bg-zinc-950 text-amber-400 px-1 py-0.2 rounded font-black">
                    ACTIVE
                  </span>
                )}
              </button>

              {/* 5 Racers Toggle Button */}
              <button
                type="button"
                onClick={() => handleTogglePreset(5)}
                className={`px-3 py-1.5 text-xs font-bold font-mono rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border ${
                  activePresetMode === 5
                    ? 'bg-amber-400 text-zinc-950 border-amber-300 shadow-md shadow-amber-950/60 font-black'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                }`}
              >
                <span>5 Racers</span>
                {activePresetMode === 5 && (
                  <span className="text-[9px] bg-zinc-950 text-amber-400 px-1 py-0.2 rounded font-black">
                    ACTIVE
                  </span>
                )}
              </button>

              {/* Clear button */}
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 text-xs font-bold font-mono rounded-lg transition-colors cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
          </div>

          {/* CLICKABLE ROW 2 INFORMATION SELECTOR BAR (EQUAL TO TABLE COLUMNS) */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                Row 2 Display Information (Select One to Show on Lower Third):
              </span>
              <span className="text-[10px] font-mono text-amber-400 font-bold">
                Active: {infoModeOptions.find((o) => o.id === infoMode)?.label}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {infoModeOptions.map((opt) => {
                const isSelected = infoMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectInfoMode(opt.id)}
                    className={`py-2 px-3 rounded-lg text-xs font-mono transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1 border ${
                      isSelected
                        ? 'bg-amber-400 text-zinc-950 border-amber-300 font-black shadow-md shadow-amber-950/50 ring-2 ring-amber-400/40'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {opt.icon}
                      <span className="font-bold">{opt.label}</span>
                    </div>
                    <span
                      className={`text-[9px] ${
                        isSelected ? 'text-zinc-900/80 font-bold' : 'text-zinc-500'
                      }`}
                    >
                      {opt.sublabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Filter Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by racer name, vehicle number, or team..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
            />
          </div>

          {/* Racers Table with Dynamic Column Information */}
          <div className="overflow-x-auto border border-zinc-800 rounded-xl max-h-[520px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead className="sticky top-0 bg-zinc-950 border-b border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400 z-10">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">Select</th>
                  <th className="py-2.5 px-3 text-center w-14">Pos</th>
                  <th className="py-2.5 px-3 text-center w-14">No.</th>
                  <th className="py-2.5 px-3 min-w-[140px]">Racer Full Name</th>

                  {/* Team Column Header (Clickable to switch mode) */}
                  <th
                    onClick={() => handleSelectInfoMode('team')}
                    className={`py-2.5 px-3 cursor-pointer transition-colors ${
                      infoMode === 'team'
                        ? 'bg-amber-400/20 text-amber-300 font-black border-b-2 border-amber-400'
                        : 'hover:text-zinc-200'
                    }`}
                    title="Click to display Team Name on Lower Third"
                  >
                    <div className="flex items-center gap-1">
                      <span>Team / Club</span>
                      {infoMode === 'team' && (
                        <span className="text-[8px] px-1 py-0.2 bg-amber-400 text-zinc-950 rounded font-black">
                          ON L3
                        </span>
                      )}
                    </div>
                  </th>

                  {/* Best Lap Column Header (Clickable to switch mode) */}
                  <th
                    onClick={() => handleSelectInfoMode('bestTime')}
                    className={`py-2.5 px-3 text-right cursor-pointer transition-colors ${
                      infoMode === 'bestTime'
                        ? 'bg-amber-400/20 text-amber-300 font-black border-b-2 border-amber-400'
                        : 'hover:text-zinc-200'
                    }`}
                    title="Click to display Best Time on Lower Third"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Best Lap</span>
                      {infoMode === 'bestTime' && (
                        <span className="text-[8px] px-1 py-0.2 bg-amber-400 text-zinc-950 rounded font-black">
                          ON L3
                        </span>
                      )}
                    </div>
                  </th>

                  {/* Last Lap Column Header (Clickable to switch mode) */}
                  <th
                    onClick={() => handleSelectInfoMode('lastLap')}
                    className={`py-2.5 px-3 text-right cursor-pointer transition-colors ${
                      infoMode === 'lastLap'
                        ? 'bg-amber-400/20 text-amber-300 font-black border-b-2 border-amber-400'
                        : 'hover:text-zinc-200'
                    }`}
                    title="Click to display Last Lap on Lower Third"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Last Lap</span>
                      {infoMode === 'lastLap' && (
                        <span className="text-[8px] px-1 py-0.2 bg-amber-400 text-zinc-950 rounded font-black">
                          ON L3
                        </span>
                      )}
                    </div>
                  </th>

                  {/* Gap Column Header (Clickable to switch mode) */}
                  <th
                    onClick={() => handleSelectInfoMode('gap')}
                    className={`py-2.5 px-3 text-right cursor-pointer transition-colors ${
                      infoMode === 'gap'
                        ? 'bg-amber-400/20 text-amber-300 font-black border-b-2 border-amber-400'
                        : 'hover:text-zinc-200'
                    }`}
                    title="Click to display Gap on Lower Third"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Gap</span>
                      {infoMode === 'gap' && (
                        <span className="text-[8px] px-1 py-0.2 bg-amber-400 text-zinc-950 rounded font-black">
                          ON L3
                        </span>
                      )}
                    </div>
                  </th>

                  {/* Interval Column Header (Clickable to switch mode) */}
                  <th
                    onClick={() => handleSelectInfoMode('interval')}
                    className={`py-2.5 px-3 text-right cursor-pointer transition-colors ${
                      infoMode === 'interval'
                        ? 'bg-amber-400/20 text-amber-300 font-black border-b-2 border-amber-400'
                        : 'hover:text-zinc-200'
                    }`}
                    title="Click to display Interval on Lower Third"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Interval</span>
                      {infoMode === 'interval' && (
                        <span className="text-[8px] px-1 py-0.2 bg-amber-400 text-zinc-950 rounded font-black">
                          ON L3
                        </span>
                      )}
                    </div>
                  </th>

                  {/* Laps Column Header (Clickable to switch mode) */}
                  <th
                    onClick={() => handleSelectInfoMode('lapCount')}
                    className={`py-2.5 px-3 text-center cursor-pointer transition-colors ${
                      infoMode === 'lapCount'
                        ? 'bg-amber-400/20 text-amber-300 font-black border-b-2 border-amber-400'
                        : 'hover:text-zinc-200'
                    }`}
                    title="Click to display Lap Count on Lower Third"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Laps</span>
                      {infoMode === 'lapCount' && (
                        <span className="text-[8px] px-1 py-0.2 bg-amber-400 text-zinc-950 rounded font-black">
                          ON L3
                        </span>
                      )}
                    </div>
                  </th>

                  <th className="py-2.5 px-3 text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {filteredRiders.map((r, index) => {
                  const isChecked = stagedSelectedIds.includes(r.id);
                  const isLiveOnAir =
                    broadcastState.visible && broadcastState.selectedRiderIds.includes(r.id);
                  const isLimitReached =
                    activePresetMode === null && !isChecked && stagedSelectedIds.length >= 5;
                  const isLeader = r.pos === '1' || r.lbpos === 1;

                  return (
                    <tr
                      key={r.id || index}
                      onClick={() => handleRiderRowClick(r, index)}
                      className={`hover:bg-zinc-800/60 cursor-pointer transition-colors ${
                        isLiveOnAir
                          ? 'bg-amber-400/10'
                          : isChecked
                          ? 'bg-zinc-800/50'
                          : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRiderRowClick(r, index);
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

                      {/* Team Column */}
                      <td
                        className={`py-2.5 px-3 ${
                          infoMode === 'team'
                            ? 'bg-amber-400/10 text-white font-bold'
                            : 'text-zinc-400'
                        }`}
                      >
                        <span className="truncate max-w-[160px] block font-mono">
                          {r.cb || '-'}
                        </span>
                      </td>

                      {/* Best Lap Column */}
                      <td
                        className={`py-2.5 px-3 text-right font-mono ${
                          infoMode === 'bestTime'
                            ? 'bg-amber-400/10 text-amber-300 font-bold'
                            : 'text-zinc-300'
                        }`}
                      >
                        <span>{r.btTm || '-'}</span>
                      </td>

                      {/* Last Lap Column */}
                      <td
                        className={`py-2.5 px-3 text-right font-mono ${
                          infoMode === 'lastLap'
                            ? 'bg-amber-400/10 text-cyan-300 font-bold'
                            : 'text-zinc-300'
                        }`}
                      >
                        <span>{r.lsTm || '-'}</span>
                      </td>

                      {/* Gap Column */}
                      <td
                        className={`py-2.5 px-3 text-right font-mono ${
                          infoMode === 'gap'
                            ? 'bg-amber-400/10 text-emerald-300 font-bold'
                            : 'text-zinc-300'
                        }`}
                      >
                        <span>{formatDeltaTime(r.gp, isLeader)}</span>
                      </td>

                      {/* Interval Column */}
                      <td
                        className={`py-2.5 px-3 text-right font-mono ${
                          infoMode === 'interval'
                            ? 'bg-amber-400/10 text-blue-300 font-bold'
                            : 'text-zinc-300'
                        }`}
                      >
                        <span>{formatDeltaTime(r.df, isLeader)}</span>
                      </td>

                      {/* Laps Column */}
                      <td
                        className={`py-2.5 px-3 text-center font-mono ${
                          infoMode === 'lapCount'
                            ? 'bg-amber-400/10 text-yellow-300 font-bold'
                            : 'text-zinc-400'
                        }`}
                      >
                        <span>{r.ls !== undefined && r.ls !== null ? r.ls : '-'}</span>
                      </td>

                      {/* Status / On-Air Badge */}
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
