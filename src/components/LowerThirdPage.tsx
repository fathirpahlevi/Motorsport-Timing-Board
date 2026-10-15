import React, { useEffect, useState, useRef, useMemo } from 'react';
import { RiderResult, LowerThirdState } from '../types';

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
  // Local Lower Third State synced via props and direct WebSocket messages
  const [ltState, setLtState] = useState<LowerThirdState>(() => {
    return (
      propLowerThirdState || {
        visible: false,
        position: 'left',
        selectedRiderIds: [],
      }
    );
  });

  // Keep state in sync with props
  useEffect(() => {
    if (propLowerThirdState) {
      setLtState(propLowerThirdState);
    }
  }, [propLowerThirdState]);

  // Also listen directly on the socket for real-time responsiveness
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'lowerThirdControl') {
          setLtState({
            visible: !!data.visible,
            position: data.position || 'left',
            selectedRiderIds: Array.isArray(data.selectedRiderIds) ? data.selectedRiderIds : [],
          });
        } else if (data.type === 'syncState' && data.raceState?.lowerThird) {
          const remoteLt = data.raceState.lowerThird;
          setLtState({
            visible: !!remoteLt.visible,
            position: remoteLt.position || 'left',
            selectedRiderIds: Array.isArray(remoteLt.selectedRiderIds) ? remoteLt.selectedRiderIds : [],
          });
        }
      } catch (err) {
        // ignore
      }
    };

    socket.addEventListener('message', handleMessage);
    // Request initial state on mount if socket is open
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'syncState' }));
    }

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket]);

  // Ensure body and html background are transparent for broadcast capture
  useEffect(() => {
    const originalBodyBg = document.body.style.backgroundColor;
    const originalHtmlBg = document.documentElement.style.backgroundColor;
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';

    return () => {
      document.body.style.backgroundColor = originalBodyBg;
      document.documentElement.style.backgroundColor = originalHtmlBg;
    };
  }, []);

  // Map of riders by id or number for quick lookup from the main "riders" variable
  const ridersMap = useMemo(() => {
    const map = new Map<string, RiderResult>();
    riders.forEach((r) => {
      map.set(r.id, r);
      if (r.no) map.set(`no-${r.no}`, r);
    });
    return map;
  }, [riders]);

  // Track rendered items with animation states
  const [renderedItems, setRenderedItems] = useState<AnimatedRiderItem[]>([]);
  const prevSelectedIdsRef = useRef<string[]>([]);
  const prevVisibleRef = useRef<boolean>(false);

  // Reconcile selected riders with animated states
  useEffect(() => {
    const isVisible = ltState.visible;
    const targetIds = ltState.selectedRiderIds.slice(0, 5); // Limit max 5
    const wasVisible = prevVisibleRef.current;
    const prevIds = prevSelectedIdsRef.current;

    if (!isVisible) {
      if (wasVisible && renderedItems.length > 0) {
        // Transition all active items to exiting
        setRenderedItems((prev) =>
          prev.map((item) => ({ ...item, status: 'exiting' }))
        );
        const timer = setTimeout(() => {
          setRenderedItems([]);
        }, 320);
        prevVisibleRef.current = false;
        prevSelectedIdsRef.current = [];
        return () => clearTimeout(timer);
      } else {
        setRenderedItems([]);
        prevVisibleRef.current = false;
        prevSelectedIdsRef.current = [];
        return;
      }
    }

    // Is visible now
    const nextItems: AnimatedRiderItem[] = [];
    const timers: NodeJS.Timeout[] = [];

    // Find all active target riders from the main riders variable
    targetIds.forEach((id) => {
      const rider = ridersMap.get(id) || riders.find((r) => r.id === id || r.no === id);
      if (!rider) return;

      const isNew = !prevIds.includes(id) || !wasVisible;

      nextItems.push({
        id: rider.id,
        rider,
        status: isNew ? 'entering' : 'active',
      });
    });

    // Check for racers that were removed (e.g. going from 5 to 3 racers)
    if (wasVisible) {
      renderedItems.forEach((oldItem) => {
        if (!targetIds.includes(oldItem.id) && oldItem.status !== 'exiting') {
          // Keep it temporarily with exiting status
          nextItems.push({
            ...oldItem,
            status: 'exiting',
          });
        }
      });
    }

    setRenderedItems(nextItems);

    // Schedule transition of 'entering' items to 'active'
    const hasEntering = nextItems.some((it) => it.status === 'entering');
    if (hasEntering) {
      const enterTimer = setTimeout(() => {
        setRenderedItems((current) =>
          current.map((it) => (it.status === 'entering' ? { ...it, status: 'active' } : it))
        );
      }, 400);
      timers.push(enterTimer);
    }

    // Schedule cleanup of 'exiting' items
    const hasExiting = nextItems.some((it) => it.status === 'exiting');
    if (hasExiting) {
      const exitTimer = setTimeout(() => {
        setRenderedItems((current) => current.filter((it) => it.status !== 'exiting'));
      }, 320);
      timers.push(exitTimer);
    }

    prevVisibleRef.current = isVisible;
    prevSelectedIdsRef.current = targetIds;

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [ltState.visible, ltState.selectedRiderIds, ridersMap]);

  // Keep rider data updated in renderedItems when the main riders variable updates
  useEffect(() => {
    setRenderedItems((current) =>
      current.map((item) => {
        const fresh = ridersMap.get(item.id) || riders.find((r) => r.id === item.id);
        return fresh ? { ...item, rider: fresh } : item;
      })
    );
  }, [riders, ridersMap]);

  // Determine effective position
  // "When I want to only show 3 or less racer, all the lower third can be positioned to left/center/right from the lower third control page, but if more than 3 racers, only show in the center, the maximum racer can be shown is only 5."
  const activeCount = ltState.selectedRiderIds.length;
  const effectivePosition: 'left' | 'center' | 'right' =
    activeCount > 3 ? 'center' : ltState.position;

  // Positioning classes for outer container on the screen
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

  // Flex alignment for cards
  const flexCardsClass = useMemo(() => {
    if (effectivePosition === 'left') {
      return 'flex flex-col gap-2.5 items-start';
    }
    if (effectivePosition === 'right') {
      return 'flex flex-col gap-2.5 items-end';
    }
    // Center: if 1 card, single; if multiple, clean horizontal row or wrapping row
    return activeCount > 2
      ? 'flex flex-row flex-wrap gap-3 items-end justify-center'
      : 'flex flex-row gap-3 items-end justify-center';
  }, [effectivePosition, activeCount]);

  if (!ltState.visible && renderedItems.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="lower-third-overlay"
      className="fixed inset-0 pointer-events-none z-50 bg-transparent overflow-hidden"
    >
      {/* Lower Third Main Container */}
      <div className={`absolute flex ${positionWrapperClass}`}>
        <div className={flexCardsClass}>
          {renderedItems.map(({ id, rider, status }) => {
            // Layout fields
            const posDisplay = rider.pos || String(rider.lbpos || 1);
            const raceNumber = rider.dNo || rider.no || '-';
            const fullName = rider.fNam || rider.nam || 'UNKNOWN RACER';
            const teamName = rider.cb && rider.cb.trim() !== '' ? rider.cb : '-';

            const isExiting = status === 'exiting';
            const isEntering = status === 'entering';

            return (
              <div
                key={id}
                className={`transition-all duration-300 transform ${
                  isExiting
                    ? 'lt-card-exit'
                    : isEntering
                    ? 'lt-card-enter'
                    : 'opacity-100 scale-100'
                }`}
              >
                {/* 
                  Square Container without rounded corners (rounded-none strictly).
                  Two column layout:
                    Col 1: Position, centered vertically
                    Col 2: Divided into 2 rows:
                      Row 1: Divided into 2 columns (full name, race number)
                      Row 2: Only showing team name
                */}
                <div className="rounded-none overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.85)] flex flex-col w-[380px] bg-zinc-950/95 border-x border-b border-zinc-800 backdrop-blur-md">
                  {/* Top animated border line */}
                  <div
                    className={`h-1.5 w-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 ${
                      isExiting ? 'lt-border-exit' : 'lt-border-enter'
                    }`}
                  />

                  {/* 2-Column Grid */}
                  <div className="grid grid-cols-[68px_1fr] min-h-[64px]">
                    {/* COLUMN 1: Position (Position number centered vertically) */}
                    <div className="bg-amber-400 text-zinc-950 flex flex-col items-center justify-center font-black select-none border-r border-amber-500/80">
                      <span className="text-[10px] tracking-widest uppercase font-mono font-bold leading-none opacity-80 mb-0.5">
                        POS
                      </span>
                      <span className="text-2xl font-racing font-black leading-none">
                        {posDisplay}
                      </span>
                    </div>

                    {/* COLUMN 2: Divided into two rows */}
                    <div className="flex flex-col justify-between bg-zinc-950 truncate">
                      {/* ROW 1: Divided into two columns (Full name & Race number) */}
                      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-zinc-900 to-zinc-950 border-b border-zinc-850">
                        {/* Row 1, Col 1: Full Name */}
                        <div className="truncate pr-2">
                          <span className="font-black uppercase text-white tracking-wider text-sm truncate block font-mono">
                            {fullName}
                          </span>
                        </div>

                        {/* Row 1, Col 2: Race Number */}
                        <div className="shrink-0 flex items-center gap-1 pl-2 border-l border-zinc-800">
                          <span className="text-[9px] font-mono text-zinc-400 font-bold uppercase">
                            NO.
                          </span>
                          <span className="font-racing font-black text-amber-400 text-lg leading-none tracking-wider">
                            {raceNumber}
                          </span>
                        </div>
                      </div>

                      {/* ROW 2: Only showing the team name */}
                      <div className="px-3 py-1.5 bg-zinc-950 flex items-center">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 truncate font-mono">
                          {teamName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
