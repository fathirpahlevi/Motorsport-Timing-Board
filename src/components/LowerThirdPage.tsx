import React, { useEffect, useState, useRef, useMemo } from 'react';
import { RiderResult, LowerThirdState, LowerThirdInfoMode } from '../types';
import { motion, AnimatePresence } from 'motion/react';

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

interface LowerThirdPageProps {
  riders: RiderResult[];
  socket?: WebSocket | null;
  lowerThirdState?: LowerThirdState;
}

interface AnimatedRiderItem {
  id: string;
  rider: RiderResult;
  status: 'entering' | 'active' | 'exiting';
}

export const LowerThirdPage: React.FC<LowerThirdPageProps> = ({
  riders,
  socket,
  lowerThirdState: propLowerThirdState,
}) => {
  // Sync state with props or fallback to default
  const [ltState, setLtState] = useState<LowerThirdState>(
    () => propLowerThirdState || { visible: false, position: 'left', selectedRiderIds: [], infoMode: 'team' }
  );

  useEffect(() => {
    if (propLowerThirdState) setLtState(propLowerThirdState);
  }, [propLowerThirdState]);

  // Real-time WebSocket synchronization
  useEffect(() => {
    if (!socket) return;

    const parseLtData = (data: any): LowerThirdState => ({
      visible: !!data.visible,
      position: data.position || 'left',
      selectedRiderIds: Array.isArray(data.selectedRiderIds) ? data.selectedRiderIds : [],
      infoMode: (data.infoMode as LowerThirdInfoMode) || 'team',
    });

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'lowerThirdControl') {
          setLtState(parseLtData(data));
        } else if (data.type === 'syncState' && data.raceState?.lowerThird) {
          setLtState(parseLtData(data.raceState.lowerThird));
        }
      } catch (err) {
        // Handle/ignore JSON parse errors
      }
    };

    socket.addEventListener('message', handleMessage);
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'syncState' }));
    }

    return () => socket.removeEventListener('message', handleMessage);
  }, [socket]);

  // Ensure body and HTML backgrounds are transparent for OBS/Broadcast overlays
  useEffect(() => {
    const origBodyBg = document.body.style.backgroundColor;
    const origHtmlBg = document.documentElement.style.backgroundColor;
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';

    return () => {
      document.body.style.backgroundColor = origBodyBg;
      document.documentElement.style.backgroundColor = origHtmlBg;
    };
  }, []);

  // Lookup map for fast rider resolution
  const ridersMap = useMemo(() => {
    const map = new Map<string, RiderResult>();
    riders.forEach((r) => {
      map.set(r.id, r);
      if (r.no) map.set(`no-${r.no}`, r);
      if (r.dNo) map.set(`no-${r.dNo}`, r);
    });
    return map;
  }, [riders]);

  // Get active riders (capped at max 5)
  const activeRiders = useMemo(() => {
    if (!ltState.visible) return [];
    return ltState.selectedRiderIds
      .slice(0, 5)
      .map((id) => ridersMap.get(id) || riders.find((r) => r.id === id || String(r.no) === id))
      .filter((r): r is RiderResult => Boolean(r));
  }, [ltState.visible, ltState.selectedRiderIds, ridersMap, riders]);

  // Handle position rules (>3 racers always centers)
  const activeCount = ltState.selectedRiderIds.length;
  const effectivePosition: 'left' | 'center' | 'right' =
    activeCount > 3 ? 'center' : ltState.position;

  // Outer container positioning styles
  const positionWrapperClass = useMemo(() => {
    switch (effectivePosition) {
      case 'left':
        return 'justify-start items-end left-8 bottom-8';
      case 'right':
        return 'justify-end items-end right-8 bottom-8';
      case 'center':
      default:
        return 'justify-center items-end left-1/2 -translate-x-1/2 bottom-8';
    }
  }, [effectivePosition]);

  // Flex alignment styles for inner card group
  const flexCardsClass = useMemo(() => {
    if (effectivePosition === 'left') return 'flex flex-col gap-2.5 items-start';
    if (effectivePosition === 'right') return 'flex flex-col gap-2.5 items-end';
    return activeCount > 2
      ? 'flex flex-row flex-wrap gap-3 items-end justify-center'
      : 'flex flex-row gap-3 items-end justify-center';
  }, [effectivePosition, activeCount]);

  // if (!ltState.visible && activeRiders.length === 0) return null;

  return (
    <div
      data-testid="lower-third-overlay"
      className="fixed inset-0 pointer-events-none z-50 bg-transparent overflow-hidden"
    >
      <div className={`absolute flex ${positionWrapperClass}`}>
        <div className={flexCardsClass}>
          <AnimatePresence mode="popLayout">
            {activeRiders.map((rider) => {
              const posDisplay = rider.pos || String(rider.lbpos || 1);
              const raceNumber = rider.dNo || rider.no || '-';
              const fullName = rider.fNam || rider.nam || '-';
              const teamName = rider.cb && rider.cb.trim() !== '' ? rider.cb : '-';

              return (
                <motion.div
                  layout
                  key={rider.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{opacity: 1,y: 0,scale: 1,transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }, }}
                  exit={{
                      opacity: 0,
                      y: 15,
                      scale: 0.95,
                      transition: { duration: 0.25, ease: [0.7, 0, 0.84, 0] },
                    }}
                  className="rounded-none overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.85)] flex flex-col w-[460px] bg-zinc-950/95 border-x-4 border-b border-zinc-300 backdrop-blur-md pointer-events-auto"
                >
                  {/* Top Animated Border Line */}
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }}
                    exit={{scaleX: 0,transition: { duration: 0.2, ease: [0.7, 0, 0.84, 0], delay: 0.1 },}}
                    className="h-1.5 w-full bg-gradient-to-r from-zinc-300 via-white to-zinc-500 origin-left"
                  />

                  {/* 2-Column Grid Card */}
                  <div className="grid grid-cols-[58px_1fr] min-h-[64px]">
                    {/* COLUMN 1: Position */}
                    <div className="bgbiruYamaha text-zinc-100 flex flex-col items-center justify-center font-black select-none border-r border-blue-600">
                      <span className="text-[10px] tracking-widest uppercase font-bold leading-none opacity-80 mb-0.5">
                        POS
                      </span>
                      <span className="text-2xl font-mono font-black leading-none">
                        {posDisplay}
                      </span>
                    </div>

                    {/* COLUMN 2: Full Name, Number & Team */}
                    <div className="flex flex-col justify-between bg-zinc-950 truncate">
                      {/* ROW 1: Name & Race Number */}
                      <div className="flex items-center justify-between px-3 pb-0 pt-2 bg-gradient-to-r from-zinc-900 to-zinc-950 border-b border-zinc-850">
                        <div className="truncate pr-2">
                          <span className="font-black uppercase text-white tracking-wider text-lg truncate block">
                            {fullName}
                          </span>
                        </div>

                        <div className="shrink-0 flex items-center gap-1 pl-1 border-l border-zinc-400">
                          <span className="text-sm font-mono text-zinc-400 font-bold uppercase">
                            NO.
                          </span>
                          <span className="font-racing font-extrabold text-blue-600 text-xl leading-none tracking-tight">
                            {raceNumber}
                          </span>
                        </div>
                      </div>

                      {/* ROW 2: Selected Info (Team, Best Time, Last Lap, Gap, Interval, Lap Count) */}
                      <div className="px-3 pb-1.5 bg-zinc-950 flex items-center min-h-[36px]">
                        {(() => {
                          const mode = ltState.infoMode || 'team';
                          const isLeader = posDisplay === '1' || rider.lbpos === 1;

                          switch (mode) {
                            case 'bestTime':
                              return (
                                <div className="flex items-center gap-2 truncate">
                                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/30">
                                    BEST LAP
                                  </span>
                                  <span className="text-lg font-mono font-black tracking-wider text-white truncate">
                                    {rider.btTm || '--:--.---'}
                                  </span>
                                </div>
                              );
                            case 'lastLap':
                              return (
                                <div className="flex items-center gap-2 truncate">
                                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest px-1.5 py-0.5 rounded ">
                                    LAST LAP
                                  </span>
                                  <span className="text-lg font-mono font-black tracking-wider text-white truncate">
                                    {rider.lsTm || '--:--.---'}
                                  </span>
                                </div>
                              );
                            case 'gap': {
                              const gapText = formatDeltaTime(rider.gp, isLeader);
                              return (
                                <div className="flex items-center gap-2 truncate">
                                  {gapText !== "LEADER" && <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest px-1.5 py-0.5">
                                    GAP
                                  </span>}
                                  <span className="text-lg font-mono font-black tracking-wider text-white truncate">
                                    {gapText}
                                  </span>
                                </div>
                              );
                            }
                            case 'interval': {
                              const intText = formatDeltaTime(rider.df, isLeader);
                              return (
                                <div className="flex items-center gap-2 truncate">
                                  {intText !== "LEADER" && <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest px-1.5 py-0.5 rounded">
                                    INTERVAL
                                  </span>}
                                  <span className="text-lg font-mono font-black tracking-wider text-white truncate">
                                    {intText}
                                  </span>
                                </div>
                              );
                            }
                            case 'lapCount': {
                              const lapsCount = rider.ls !== undefined && rider.ls !== null ? `${rider.ls} LAPS` : '-';
                              return (
                                <div className="flex items-center gap-2 truncate">
                                  <span className="text-[10px] font-mono font-bold text-yellow-400 uppercase tracking-widest px-1.5 py-0.5 rounded bg-yellow-400/10 border border-yellow-400/30">
                                    LAPS
                                  </span>
                                  <span className="text-lg font-mono font-black tracking-wider text-white truncate">
                                    {lapsCount}
                                  </span>
                                </div>
                              );
                            }
                            case 'team':
                            default:
                              return (
                                <span className="text-lg font-bold uppercase tracking-wider text-zinc-300 truncate font-mono">
                                  {teamName}
                                </span>
                              );
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};