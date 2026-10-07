    import React, { useState } from 'react';
    import { Link } from 'react-router-dom';
    import {
    ToggleLeft,
    ToggleRight,
    Plus,
    Trash2,
    Edit3,
    Save,
    ArrowUp,
    ArrowDown,
    CheckCircle2,
    Flag,
    RotateCcw,
    Sparkles,
    Tv,
    ArrowLeft,
    Check,
    RefreshCw,
    Trophy,
    LayoutGrid,
    FileText
    } from 'lucide-react';
    import { RiderResult } from '../types';
    import { recalculateGaps } from '../data';
    import { StartingGridImporter } from './StartingGridImporter';

    interface ManualPageProps {
    riders: RiderResult[];
    setRiders: React.Dispatch<React.SetStateAction<RiderResult[]>>;
    isManualMode: boolean;
    setIsManualMode: (manual: boolean) => void;
    raceTitle: string;
    setRaceTitle: (title: string) => void;
    sessionName: string;
    setSessionName: (name: string) => void;
    groupName: string;
    setGroupName: (name: string) => void;
    raceLaps: number;
    setRaceLaps: (laps: number) => void;
    laps: number;
    setLaps: (laps: number) => void;
    lapsToGo: number;
    setLapsToGo: (lapsToGo: number) => void;
    flag: number;
    setFlag: (flag: number) => void;
    socket: WebSocket | null;
    addWebSocketLog?: (direction: 'in' | 'system' | 'sent' | 'ws' | 'packet' | 'sim', message: string) => void;
    }

    export const ManualPage: React.FC<ManualPageProps> = ({
    riders,
    setRiders,
    isManualMode,
    setIsManualMode,
    raceTitle,
    setRaceTitle,
    sessionName,
    setSessionName,
    groupName,
    setGroupName,
    raceLaps,
    setRaceLaps,
    laps,
    setLaps,
    lapsToGo,
    setLapsToGo,
    flag,
    setFlag,
    socket,
    addWebSocketLog,
    }) => {
    // Local state for new racer form
    const [newRacerName, setNewRacerName] = useState('');
    const [newRacerNo, setNewRacerNo] = useState('');
    const [newRacerTeam, setNewRacerTeam] = useState('');
    const [newRacerPos, setNewRacerPos] = useState<string>('');
    const [newRacerTotalTime, setNewRacerTotalTime] = useState('');
    const [newRacerBestTime, setNewRacerBestTime] = useState('');
    const [newRacerLastTime, setNewRacerLastTime] = useState('');
    const [newRacerIsFinished, setNewRacerIsFinished] = useState(false);

    // State for inline editing a racer
    const [editingRiderId, setEditingRiderId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<RiderResult>>({});

    // Helper to send manual data sync over WebSocket
    const broadcastManualData = (
        manualActive: boolean,
        currentRiders: RiderResult[],
        sessionMeta?: {
        raceTitle?: string;
        sessionName?: string;
        groupName?: string;
        raceLaps?: number;
        laps?: number;
        lapsToGo?: number;
        flag?: number;
        }
    ) => {
        const sessionInfo = {
        raceTitle: sessionMeta?.raceTitle ?? raceTitle,
        sessionName: sessionMeta?.sessionName ?? sessionName,
        groupName: sessionMeta?.groupName ?? groupName,
        raceLaps: sessionMeta?.raceLaps ?? raceLaps,
        laps: sessionMeta?.laps ?? laps,
        lapsToGo: sessionMeta?.lapsToGo ?? lapsToGo,
        flag: sessionMeta?.flag ?? flag,
        };

        if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
            JSON.stringify({
            type: 'manualDataSync',
            isManualMode: manualActive,
            riders: currentRiders,
            sessionInfo,
            })
        );
        }
        if (addWebSocketLog) {
        addWebSocketLog('sent', `📤 Manual Data Sync sent: ${manualActive ? 'Manual ON' : 'Manual OFF'} (${currentRiders.length} racers)`);
        }
    };

    // Toggle Manual Mode
    const handleToggleManualMode = () => {
        const nextState = !isManualMode;
        setIsManualMode(nextState);

        let nextRiders = riders;
        // If turning on manual mode and no racers exist, load a sample preset
        if (nextState && riders.length === 0) {
        nextRiders = recalculateGaps(SAMPLE_PRESET_RIDERS);
        setRiders(nextRiders);
        }

        broadcastManualData(nextState, nextRiders);
    };

    // Handle Event / Race Info Changes
    const handleUpdateRaceInfo = (e: React.FormEvent) => {
        e.preventDefault();
        broadcastManualData(isManualMode, riders);
    };

    // Handle importing starting grid racers from CSV or Gemini screenshot OCR
    const handleApplyImportedRiders = (
        newRiders: RiderResult[],
        mode: 'replace' | 'append',
        metadata?: { raceTitle?: string; groupName?: string; sessionName?: string }
    ) => {
        let updatedRiders: RiderResult[];
        if (mode === 'replace') {
            updatedRiders = newRiders;
        } else {
            // Append
            const startPos = riders.length;
            const reindexedNew = newRiders.map((r, i) => ({
                ...r,
                lbpos: startPos + i + 1,
                pos: (startPos + i + 1).toString(),
                pCl: (startPos + i + 1).toString(),
            }));
            updatedRiders = [...riders, ...reindexedNew];
        }

        const finalRiders = recalculateGaps(updatedRiders);
        setRiders(finalRiders);

        let newRaceTitle = raceTitle;
        let newGroupName = groupName;
        let newSessionName = sessionName;

        if (metadata) {
            if (metadata.raceTitle) {
                newRaceTitle = metadata.raceTitle;
                setRaceTitle(metadata.raceTitle);
            }
            if (metadata.groupName) {
                newGroupName = metadata.groupName;
                setGroupName(metadata.groupName);
            }
            if (metadata.sessionName) {
                newSessionName = metadata.sessionName;
                setSessionName(metadata.sessionName);
            }
        }

        // Automatically ensure manual mode is active and broadcast immediately
        setIsManualMode(true);
        broadcastManualData(true, finalRiders, {
            raceTitle: newRaceTitle,
            groupName: newGroupName,
            sessionName: newSessionName,
        });
    };

    // Direct toggle / set manual mode
    const handleDirectSetManualMode = (enabled: boolean) => {
        setIsManualMode(enabled);
        broadcastManualData(enabled, riders);
    };

    // Add new racer
    const handleAddRacer = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRacerName.trim() || !newRacerNo.trim()) return;

        // Calculate position: default to next position if not specified
        const targetPos = newRacerPos ? parseInt(newRacerPos, 10) : riders.length + 1;

        const newRider: RiderResult = {
        sesId: 'manual-session',
        eId: 'manual-event',
        id: `manual-rider-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        nam: newRacerName.trim(),
        fNam: newRacerName.trim(),
        no: newRacerNo.trim(),
        dNo: newRacerNo.trim(),
        cb: newRacerTeam.trim() || '-',
        cl: 'MANUAL CLASS',
        cln: 'Manual Entry',
        lbpos: targetPos,
        pos: targetPos.toString(),
        pCl: targetPos.toString(),
        tTm: newRacerTotalTime.trim() || undefined,
        btTm: newRacerBestTime.trim() || undefined,
        lsTm: newRacerLastTime.trim() || undefined,
        if: newRacerIsFinished,
        ls: laps || 1,
        gp: targetPos === 1 ? 'LEADER' : newRacerTotalTime ? `+${newRacerTotalTime}` : '-',
        df: targetPos === 1 ? '-' : '-',
        };

        // Insert racer into list and sort by lbpos
        const updated = [...riders, newRider].sort((a, b) => a.lbpos - b.lbpos);
        const reindexed = updated.map((r, idx) => ({
        ...r,
        lbpos: idx + 1,
        pos: (idx + 1).toString(),
        pCl: (idx + 1).toString(),
        }));

        const finalRiders = recalculateGaps(reindexed);
        setRiders(finalRiders);

        // Reset form
        setNewRacerName('');
        setNewRacerNo('');
        setNewRacerTeam('');
        setNewRacerPos('');
        setNewRacerTotalTime('');
        setNewRacerBestTime('');
        setNewRacerLastTime('');
        setNewRacerIsFinished(false);

        // Broadcast if manual mode is enabled
        if (isManualMode) {
        broadcastManualData(true, finalRiders);
        }
    };

    // Move racer up / down
    const handleMoveRacer = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === riders.length - 1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const reordered = [...riders];

        // Swap
        const temp = reordered[index];
        reordered[index] = reordered[targetIndex];
        reordered[targetIndex] = temp;

        // Re-index position numbers
        const updated = reordered.map((r, idx) => ({
        ...r,
        lbpos: idx + 1,
        pos: (idx + 1).toString(),
        pCl: (idx + 1).toString(),
        changeDirection: (idx === index ? (direction === 'up' ? 'down' : 'up') : idx === targetIndex ? (direction === 'up' ? 'up' : 'down') : 'steady') as 'up' | 'down' | 'steady',
        changeTime: Date.now(),
        }));

        const finalRiders = recalculateGaps(updated);
        setRiders(finalRiders);

        if (isManualMode) {
        broadcastManualData(true, finalRiders);
        }
    };

    // Toggle finished flag on racer
    const handleToggleFinished = (id: string) => {
        const updated = riders.map((r) => {
        if (r.id === id) {
            return { ...r, if: !r.if };
        }
        return r;
        });
        setRiders(updated);

        if (isManualMode) {
        broadcastManualData(true, updated);
        }
    };

    // Start inline editing
    const handleStartEdit = (rider: RiderResult) => {
        setEditingRiderId(rider.id);
        setEditForm({ ...rider });
    };

    // Save inline edit
    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRiderId) return;

        const updated = riders.map((r) => {
        if (r.id === editingRiderId) {
            const merged = { ...r, ...editForm };
            const posInt = editForm.pos ? parseInt(editForm.pos, 10) || r.lbpos : r.lbpos;
            return {
            ...merged,
            lbpos: posInt,
            pos: posInt.toString(),
            pCl: posInt.toString(),
            };
        }
        return r;
        }).sort((a, b) => a.lbpos - b.lbpos);

        const reindexed = updated.map((r, idx) => ({
        ...r,
        lbpos: idx + 1,
        pos: (idx + 1).toString(),
        pCl: (idx + 1).toString(),
        }));

        const finalRiders = recalculateGaps(reindexed);
        setRiders(finalRiders);
        setEditingRiderId(null);
        setEditForm({});

        if (isManualMode) {
        broadcastManualData(true, finalRiders);
        }
    };

    // Delete racer
    const handleDeleteRacer = (id: string) => {
        const updated = riders.filter((r) => r.id !== id).map((r, idx) => ({
        ...r,
        lbpos: idx + 1,
        pos: (idx + 1).toString(),
        pCl: (idx + 1).toString(),
        }));

        const finalRiders = recalculateGaps(updated);
        setRiders(finalRiders);

        if (isManualMode) {
        broadcastManualData(true, finalRiders);
        }
    };

    // Load Preset
    const handleLoadPreset = () => {
        const preset = recalculateGaps(SAMPLE_PRESET_RIDERS);
        setRiders(preset);
        if (isManualMode) {
        broadcastManualData(true, preset);
        }
    };

    // Clear All Racers
    const handleClearAll = () => {
        if (window.confirm('Are you sure you want to clear all racers?')) {
        setRiders([]);
        if (isManualMode) {
            broadcastManualData(true, []);
        }
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 sm:p-8 selection:bg-blue-600 selection:text-white">
        {/* Top Navigation */}
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
            <Link
                to="/"
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Console
            </Link>
            <div className="h-6 w-px bg-zinc-800 hidden sm:block"></div>
            <h1 className="text-xl font-black italic tracking-tight uppercase text-white font-mono flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                MANUAL TIMING DESK
            </h1>
            </div>

            {/* Display Quick Navigation Links */}
            <div className="flex flex-wrap items-center gap-2">
            <Link
                to="/sidePosition"
                target="_blank"
                className="text-xs font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 bg-blue-950/60 border border-blue-800/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
                <Tv className="w-3.5 h-3.5" /> Side Position
            </Link>
            <Link
                to="/startingGrid"
                target="_blank"
                className="text-xs font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 bg-amber-950/60 border border-amber-800/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
                <LayoutGrid className="w-3.5 h-3.5" /> Starting Grid
            </Link>
            <Link
                to="/result"
                target="_blank"
                className="text-xs font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
                <Flag className="w-3.5 h-3.5" /> Results
            </Link>
            <Link
                to="/trophy"
                target="_blank"
                className="text-xs font-bold uppercase tracking-wider text-purple-400 hover:text-purple-300 bg-purple-950/60 border border-purple-800/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
                <Trophy className="w-3.5 h-3.5" /> Trophy
            </Link>
            </div>
        </div>

        {/* Main Container */}
        <div className="max-w-7xl mx-auto space-y-6">

            {/* MANUAL MODE TOGGLE BANNER */}
            <div className={`p-6 rounded-2xl border transition-all flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl ${
            isManualMode
                ? 'bg-blue-950/80 border-blue-600 shadow-blue-950/50'
                : 'bg-zinc-900/90 border-zinc-800'
            }`}>
            <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                isManualMode ? 'bg-blue-600 text-white animate-pulse' : 'bg-zinc-800 text-zinc-500'
                }`}>
                <FileText className="w-7 h-7" />
                </div>
                <div>
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest ${
                    isManualMode ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-700 text-zinc-300'
                    }`}>
                    {isManualMode ? 'MANUAL MODE ACTIVE' : 'SPEEDHIVE LIVE MODE ACTIVE'}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
                    {isManualMode ? 'Live Speedhive updates overridden' : 'Receiving Speedhive stream'}
                    </span>
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight text-white mt-1">
                    {isManualMode ? 'Manual Race Telemetry Engine' : 'Enable Manual Overriding Mode'}
                </h2>
                <p className="text-xs text-zinc-400 max-w-xl mt-0.5">
                    {isManualMode
                    ? 'All timing displays (/sidePosition, /result, /trophy, /startingGrid) are now showing your manually entered racer data in real-time.'
                    : 'Toggle ON to manually insert and control racers without relying on a Speedhive live timing feed.'}
                </p>
                </div>
            </div>

            <button
                onClick={handleToggleManualMode}
                className={`px-6 py-3 rounded-xl font-black uppercase tracking-wider text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                isManualMode
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-950/50'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/50'
                }`}
            >
                {isManualMode ? (
                <>
                    <ToggleRight className="w-6 h-6 text-zinc-950" /> MANUAL MODE ON
                </>
                ) : (
                <>
                    <ToggleLeft className="w-6 h-6" /> ENABLE MANUAL MODE
                </>
                )}
            </button>
            </div>

            {/* STARTING GRID IMPORTER (CSV & GEMINI MULTIMODAL SCREENSHOTS) */}
            <StartingGridImporter
                currentRiders={riders}
                onApplyRiders={handleApplyImportedRiders}
                isManualMode={isManualMode}
                onToggleManualMode={handleDirectSetManualMode}
                raceTitle={raceTitle}
                groupName={groupName}
                sessionName={sessionName}
            />

            {/* EVENT & SESSION INFO EDITORS */}
            <form onSubmit={handleUpdateRaceInfo} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-blue-400 flex items-center gap-2 font-mono">
                <Sparkles className="w-4 h-4" /> Event & Session Titles
                </h3>
                <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                <Save className="w-3.5 h-3.5" /> Broadcast Titles
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                    Event / Race Title
                </label>
                <input
                    type="text"
                    value={raceTitle}
                    onChange={(e) => setRaceTitle(e.target.value)}
                    placeholder="Yamaha Cup Race Seri 2 2026"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-blue-500"
                />
                </div>

                <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                    Class / Group Name
                </label>
                <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="DF250 TMAX - XMAX - MAXI BORE UP"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-blue-500"
                />
                </div>

                <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                    Session Name
                </label>
                <input
                    type="text"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="RACE 1"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-blue-500"
                />
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-zinc-850">
                <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                    Race Laps (Target)
                </label>
                <input
                    type="number"
                    value={raceLaps}
                    onChange={(e) => setRaceLaps(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
                </div>

                <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                    Current Lap
                </label>
                <input
                    type="number"
                    value={laps}
                    onChange={(e) => setLaps(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
                </div>

                <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                    Laps To Go
                </label>
                <input
                    type="number"
                    value={lapsToGo}
                    onChange={(e) => setLapsToGo(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
                </div>

                <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                    Flag Status
                </label>
                <select
                    value={flag}
                    onChange={(e) => {
                    const fVal = parseInt(e.target.value, 10);
                    setFlag(fVal);
                    if (isManualMode) {
                        broadcastManualData(true, riders, { flag: fVal });
                    }
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-blue-500"
                >
                    <option value={0}>Green Flag (Active Race)</option>
                    <option value={1}>Yellow Flag (Caution)</option>
                    <option value={2}>Red Flag (Session Stopped)</option>
                    <option value={3}>Checkered Flag 🏁 (Finished)</option>
                </select>
                </div>
            </div>
            </form>

            {/* ADD RACER FORM */}
            <form onSubmit={handleAddRacer} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2 font-mono">
                <Plus className="w-4 h-4" /> Add Racer to Grid
                </h3>
                <span className="text-[10px] font-mono text-zinc-400">
                * Later added riders are positioned below existing ones by default
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                    Racer Name *
                </label>
                <input
                    type="text"
                    value={newRacerName}
                    onChange={(e) => setNewRacerName(e.target.value)}
                    placeholder="e.g. Valentino Rossi"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                </div>

                <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                    Bike Number (#) *
                </label>
                <input
                    type="text"
                    value={newRacerNo}
                    onChange={(e) => setNewRacerNo(e.target.value)}
                    placeholder="e.g. 46"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                </div>

                <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                    Team / Club Name
                </label>
                <input
                    type="text"
                    value={newRacerTeam}
                    onChange={(e) => setNewRacerTeam(e.target.value)}
                    placeholder="e.g. Yamaha Factory Racing"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                </div>

                <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                    Target Position (Optional)
                </label>
                <input
                    type="number"
                    min="1"
                    value={newRacerPos}
                    onChange={(e) => setNewRacerPos(e.target.value)}
                    placeholder={`Auto (${riders.length + 1})`}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                </div>

                <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                    Total Time / Gap
                </label>
                <input
                    type="text"
                    value={newRacerTotalTime}
                    onChange={(e) => setNewRacerTotalTime(e.target.value)}
                    placeholder="12:34.567 or +1.234"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                </div>

                <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                    Best Lap Time
                </label>
                <input
                    type="text"
                    value={newRacerBestTime}
                    onChange={(e) => setNewRacerBestTime(e.target.value)}
                    placeholder="1:42.123"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                </div>

                <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                    Last Lap Time
                </label>
                <input
                    type="text"
                    value={newRacerLastTime}
                    onChange={(e) => setNewRacerLastTime(e.target.value)}
                    placeholder="1:42.500"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                </div>

                <div className="flex items-end pb-1">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-300">
                    <input
                    type="checkbox"
                    checked={newRacerIsFinished}
                    onChange={(e) => setNewRacerIsFinished(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-zinc-950 border-zinc-800 cursor-pointer"
                    />
                    Is Finished 🏁
                </label>
                </div>
            </div>

            <div className="pt-2">
                <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                <Plus className="w-4 h-4" /> Add Racer To Grid
                </button>
            </div>
            </form>

            {/* RACERS MANAGEMENT TABLE */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-3">
                <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2 font-mono">
                    <LayoutGrid className="w-4 h-4 text-blue-400" /> Manual Grid List ({riders.length} Racers)
                </h3>
                <p className="text-[10px] font-mono text-zinc-400">
                    Use ▲ / ▼ buttons to adjust positions, or edit details inline.
                </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={handleLoadPreset}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-400" /> Load Sample Grid
                </button>
                <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 font-bold text-xs uppercase tracking-wider rounded-lg border border-red-900/40 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                    <Trash2 className="w-3.5 h-3.5" /> Clear All
                </button>
                </div>
            </div>

            {riders.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 font-mono">
                <p className="text-sm font-bold uppercase tracking-wider">No manual racers added yet.</p>
                <p className="text-xs mt-1 text-zinc-600">
                    Fill out the form above or click "Load Sample Grid" to populate demo racers.
                </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                    <tr className="border-b border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400 font-mono">
                        <th className="py-2.5 px-3 text-center w-16">Pos</th>
                        <th className="py-2.5 px-3 text-center w-16">No.</th>
                        <th className="py-2.5 px-3">Racer & Team</th>
                        <th className="py-2.5 px-3 text-right">Total Time</th>
                        <th className="py-2.5 px-3 text-right">Best Lap</th>
                        <th className="py-2.5 px-3 text-center w-24">Finished</th>
                        <th className="py-2.5 px-3 text-center w-36">Order</th>
                        <th className="py-2.5 px-3 text-right w-28">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
                    {riders.map((racer, idx) => {
                        const isEditing = editingRiderId === racer.id;

                        if (isEditing) {
                        return (
                            <tr key={racer.id} className="bg-blue-950/40">
                            <td className="py-3 px-3 text-center">
                                <input
                                type="number"
                                value={editForm.pos ?? racer.lbpos}
                                onChange={(e) => setEditForm({ ...editForm, pos: e.target.value })}
                                className="w-12 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1 text-center font-bold text-white"
                                />
                            </td>
                            <td className="py-3 px-3 text-center">
                                <input
                                type="text"
                                value={editForm.no ?? racer.no}
                                onChange={(e) => setEditForm({ ...editForm, no: e.target.value })}
                                className="w-12 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1 text-center font-bold text-white"
                                />
                            </td>
                            <td className="py-3 px-3">
                                <div className="flex flex-col gap-1">
                                <input
                                    type="text"
                                    value={editForm.nam ?? racer.nam}
                                    onChange={(e) => setEditForm({ ...editForm, nam: e.target.value })}
                                    placeholder="Name"
                                    className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 font-bold text-white"
                                />
                                <input
                                    type="text"
                                    value={editForm.cb ?? racer.cb}
                                    onChange={(e) => setEditForm({ ...editForm, cb: e.target.value })}
                                    placeholder="Team"
                                    className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-300"
                                />
                                </div>
                            </td>
                            <td className="py-3 px-3 text-right">
                                <input
                                type="text"
                                value={editForm.tTm ?? racer.tTm ?? ''}
                                onChange={(e) => setEditForm({ ...editForm, tTm: e.target.value })}
                                placeholder="Total Time"
                                className="w-24 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-right text-white"
                                />
                            </td>
                            <td className="py-3 px-3 text-right">
                                <input
                                type="text"
                                value={editForm.btTm ?? racer.btTm ?? ''}
                                onChange={(e) => setEditForm({ ...editForm, btTm: e.target.value })}
                                placeholder="Best Time"
                                className="w-24 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-right text-white"
                                />
                            </td>
                            <td className="py-3 px-3 text-center">
                                <input
                                type="checkbox"
                                checked={editForm.if ?? racer.if ?? false}
                                onChange={(e) => setEditForm({ ...editForm, if: e.target.checked })}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-zinc-950 border-zinc-700 cursor-pointer"
                                />
                            </td>
                            <td colSpan={2} className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                <button
                                    type="button"
                                    onClick={handleSaveEdit}
                                    className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 rounded cursor-pointer"
                                    title="Save"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingRiderId(null)}
                                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded cursor-pointer"
                                    title="Cancel"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                                </div>
                            </td>
                            </tr>
                        );
                        }

                        return (
                        <tr key={racer.id} className="hover:bg-zinc-800/40 transition-colors">
                            <td className="py-3 px-3 text-center font-bold text-white text-sm">
                            {racer.lbpos || idx + 1}
                            </td>
                            <td className="py-3 px-3 text-center">
                            <span className="bg-blue-900/80 text-white font-bold px-2 py-0.5 rounded italic">
                                #{racer.no}
                            </span>
                            </td>
                            <td className="py-3 px-3">
                            <div className="flex flex-col">
                                <span className="font-bold text-white uppercase text-sm">
                                {racer.nam}
                                </span>
                                <span className="text-[10px] text-zinc-400 uppercase">
                                {racer.cb || '-'}
                                </span>
                            </div>
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-zinc-200">
                            {racer.tTm || racer.gp || '-'}
                            </td>
                            <td className="py-3 px-3 text-right text-emerald-400">
                            {racer.btTm || '-'}
                            </td>
                            <td className="py-3 px-3 text-center">
                            <button
                                type="button"
                                onClick={() => handleToggleFinished(racer.id)}
                                className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                                racer.if
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                {racer.if ? '🏁 FINISHED' : 'RACING'}
                            </button>
                            </td>
                            <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                                <button
                                type="button"
                                onClick={() => handleMoveRacer(idx, 'up')}
                                disabled={idx === 0}
                                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-200 cursor-pointer"
                                title="Move Up"
                                >
                                <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                type="button"
                                onClick={() => handleMoveRacer(idx, 'down')}
                                disabled={idx === riders.length - 1}
                                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-200 cursor-pointer"
                                title="Move Down"
                                >
                                <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            </td>
                            <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                                <button
                                type="button"
                                onClick={() => handleStartEdit(racer)}
                                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors cursor-pointer"
                                title="Edit"
                                >
                                <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                type="button"
                                onClick={() => handleDeleteRacer(racer.id)}
                                className="p-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-400 rounded transition-colors cursor-pointer"
                                title="Delete"
                                >
                                <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            </td>
                        </tr>
                        );
                    })}
                    </tbody>
                </table>
                </div>
            )}
            </div>
        </div>
        </div>
    );
    };

    // Default sample racers when user loads sample grid
    const SAMPLE_PRESET_RIDERS: RiderResult[] = [
    {
        sesId: 'manual',
        eId: 'manual',
        id: 'm1',
        nam: 'Valentino Rossi',
        fNam: 'Valentino Rossi',
        no: '46',
        dNo: '46',
        cb: 'Yamaha Factory Racing',
        cl: 'MAXI BORE UP',
        cln: 'MAXI BORE UP',
        lbpos: 1,
        pos: '1',
        pCl: '1',
        tTm: '12:15.320',
        btTm: '1:38.210',
        lsTm: '1:38.450',
        if: true,
        ls: 8,
        gp: 'LEADER',
        df: '-',
        ibt: true,
    },
    {
        sesId: 'manual',
        eId: 'manual',
        id: 'm2',
        nam: 'Jorge Lorenzo',
        fNam: 'Jorge Lorenzo',
        no: '99',
        dNo: '99',
        cb: 'Monster Energy Yamaha',
        cl: 'MAXI BORE UP',
        cln: 'MAXI BORE UP',
        lbpos: 2,
        pos: '2',
        pCl: '2',
        tTm: '12:16.850',
        btTm: '1:38.540',
        lsTm: '1:38.800',
        if: true,
        ls: 8,
        gp: '+1.530',
        df: '+1.530',
    },
    {
        sesId: 'manual',
        eId: 'manual',
        id: 'm3',
        nam: 'Toprak Razgatlioglu',
        fNam: 'Toprak Razgatlioglu',
        no: '54',
        dNo: '54',
        cb: 'ROKiT BMW Motorrad',
        cl: 'MAXI BORE UP',
        cln: 'MAXI BORE UP',
        lbpos: 3,
        pos: '3',
        pCl: '3',
        tTm: '12:18.210',
        btTm: '1:38.890',
        lsTm: '1:39.100',
        if: true,
        ls: 8,
        gp: '+2.890',
        df: '+1.360',
    },
    {
        sesId: 'manual',
        eId: 'manual',
        id: 'm4',
        nam: 'Fabio Quartararo',
        fNam: 'Fabio Quartararo',
        no: '20',
        dNo: '20',
        cb: 'Yamaha MotoGP Team',
        cl: 'MAXI BORE UP',
        cln: 'MAXI BORE UP',
        lbpos: 4,
        pos: '4',
        pCl: '4',
        tTm: '12:20.400',
        btTm: '1:39.050',
        lsTm: '1:39.320',
        if: true,
        ls: 8,
        gp: '+5.080',
        df: '+2.190',
    },
    {
        sesId: 'manual',
        eId: 'manual',
        id: 'm5',
        nam: 'Maverick Vinales',
        fNam: 'Maverick Vinales',
        no: '12',
        dNo: '12',
        cb: 'Aprilia Racing Team',
        cl: 'MAXI BORE UP',
        cln: 'MAXI BORE UP',
        lbpos: 5,
        pos: '5',
        pCl: '5',
        tTm: '12:22.110',
        btTm: '1:39.400',
        lsTm: '1:39.600',
        if: true,
        ls: 8,
        gp: '+6.790',
        df: '+1.710',
    },
    {
        sesId: 'manual',
        eId: 'manual',
        id: 'm6',
        nam: 'Franco Morbidelli',
        fNam: 'Franco Morbidelli',
        no: '21',
        dNo: '21',
        cb: 'Pramac Racing Team',
        cl: 'MAXI BORE UP',
        cln: 'MAXI BORE UP',
        lbpos: 6,
        pos: '6',
        pCl: '6',
        tTm: '12:25.000',
        btTm: '1:39.800',
        lsTm: '1:40.100',
        if: false,
        ls: 7,
        gp: '+9.680',
        df: '+2.890',
    },
    ];
