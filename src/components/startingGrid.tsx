    import React, { useState, useEffect } from 'react';
    import { RiderResult } from '../types';

    interface StartingGridProps {
    racers?: RiderResult[];
    activePageIndex?: number; // 0 for P1-P6, 1 for P7-P12, etc.
    pages?: (gridPages: number) => void;
    raceTitle: string;
    groupName: string;
    sessionName: string;
    circuitTitle: string;
    }

    const DEFAULT_RACERS: RiderResult[] = [];

    export const StartingGrid: React.FC<StartingGridProps> = ({
    raceTitle,
    groupName,
    sessionName,
    circuitTitle,
    racers = DEFAULT_RACERS,
    activePageIndex = 0,
    pages,
    }) => {
    const [pageIndex, setPageIndex] = useState(0);

    // Calculate total pages based on 6 racers per screen
    const gridPages = Math.max(1, Math.ceil(racers.length / 6));

    // 1. Notify parent component safely using useEffect
    useEffect(() => {
        if (pages) pages(gridPages);
    }, [gridPages, pages]);

    // Page chunking: Get 6 racers for current active screen
    const pageRacers = racers.slice(pageIndex * 6, pageIndex * 6 + 6);
    const row1 = pageRacers.slice(0, 3);
    const row2 = pageRacers.slice(3, 6);

    const stairCase = ['mt-0', 'mt-3', 'mt-6'];

    // 2. Animation state phase: 'idle' | 'sliding-out' | 'snapping-bottom' | 'sliding-in'
    const [animPhase, setAnimPhase] = useState<
        'idle' | 'sliding-out' | 'snapping-bottom' | 'sliding-in'
    >('idle');

    // Sync internal pageIndex when prop activePageIndex updates
    useEffect(() => {
        if (activePageIndex !== pageIndex && animPhase === 'idle') {
        setAnimPhase('sliding-out');
        }
    }, [activePageIndex, pageIndex, animPhase]);

    // Handle CSS transition completion
    const handleTransitionEnd = () => {
        if (animPhase === 'sliding-out') {
        // Step 1: Snap offscreen to bottom instantly
        setAnimPhase('snapping-bottom');

        // Step 2: Update current active page
        setPageIndex(activePageIndex);

        // Step 3: Trigger slide-in transition on next frame
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
            setAnimPhase('sliding-in');
            });
        });
        } else if (animPhase === 'sliding-in') {
        setAnimPhase('idle');
        }
    };

    const getTransformClasses = () => {
        switch (animPhase) {
        case 'sliding-out':
            return '-translate-y-[120%] transition-transform duration-500 ease-in-out';
        case 'snapping-bottom':
            return 'translate-y-[120%] transition-none';
        case 'sliding-in':
            return 'translate-y-0 transition-transform duration-500 ease-in-out';
        case 'idle':
        default:
            return 'translate-y-0';
        }
    };

    // 3. SMOOTH SIDEBAR SCROLL CALCULATION
    // Height of each badge row (28px) + Gap (24px) = 52px total per row offset
    const ROW_HEIGHT_PX = 52;
    const sidebarTranslateY = -(pageIndex * 2 * ROW_HEIGHT_PX); // Shifts 2 rows up per page

    const mainLogo = new URL('../img/logoYcr.png', import.meta.url).href;

    return (
        <div className="relative w-[1920px] h-[1020px] bg-transparent text-white font-sans overflow-hidden select-none p-8 bg-gradient-to-b from-zinc-900/80 via-slate-600/70 to-zinc-900/0">
        
        {/* ================= HEADER SECTION ================= */}
        <div className="flex flex-row">
            <img className="h-[140px] w-fit mb-5" src={mainLogo} alt="Logo" />
            <div className="ml-7 flex flex-col">
            <div className="flex items-center gap-3 text-md font-bold tracking-wider text-slate-200">
                <span className="font-extrabold uppercase">{raceTitle}</span>
            </div>
            <div className="text-lg text-slate-300 font-semibold tracking-widest uppercase">
                {circuitTitle}
            </div>

            <h1 className="text-8xl numberFont font-black tracking-widest uppercase text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] mt-1 font-title">
                STARTING GRID
            </h1>
            </div>
        </div>

        <div className="text-lg text-slate-300 font-semibold tracking-widest uppercase">
            {groupName} : {sessionName}
        </div>

        {/* ================= MAIN CONTENT LAYOUT ================= */}
        <div className="flex items-stretch mt-8 bg-zinc-200/50 rounded-l-xl">
            
            {/* 1. LEFT SIDEBAR (SMOOTH SCROLLING NUMBERS) */}
            <div className="overflow-hidden w-[220px] h-[750px] bg-zinc-100/90 rounded-l-xl p-3 flex flex-col">
            <div
                style={{
                transform: `translateY(${sidebarTranslateY}px)`,
                }}
                className="grid grid-cols-3 gap-y-6 gap-x-3 items-center mx-2 transition-transform duration-500 ease-in-out"
            >
                {racers.length === 0 ? (
                <div className="text-zinc-900 flex flex-col gap-4 animate-pulse">
                    -
                </div>
                ) : (
                racers.map((num, idx) => {
                    const racerNumber = num.no;
                    const isCurrentPageRacer = pageRacers.some(
                    (r) => String(r.no) === String(racerNumber)
                    );
                    const itemClass = stairCase[idx % 3];

                    return (
                    <div
                        key={num.id || idx}
                        className={`flex items-center justify-center h-7 border rounded-[2px] text-lg numberFontLighter tracking-wider transition-colors duration-300 ${itemClass} ${
                        isCurrentPageRacer
                            ? 'bg-gradient-to-r from-blue-800 via-blue-950 via-blue-900 to-zinc-950 border-blue-400 text-white shadow-[0_0_8px_rgba(37,99,235,0.8)]'
                            : 'bg-slate-800/80 border-slate-600/60 text-slate-400'
                        }`}
                    >
                        {racerNumber}
                    </div>
                    );
                })
                )}
            </div>
            </div>

            {/* 2. RIGHT CARDS CONTAINER (SLIDE OUT & IN ANIMATION) */}
            <div className="relative w-full h-[750px] overflow-hidden">
            <div
                onTransitionEnd={handleTransitionEnd}
                className={`h-full flex-1 flex flex-col justify-between py-2 ${getTransformClasses()}`}
            >
                {/* TOP ROW (P1, P2, P3) */}
                <div className="grid grid-cols-3 gap-14 items-end">
                {row1.map((racer, index) => (
                    <RacerCard
                    key={racer.id || racer.pos || index}
                    racer={racer}
                    offsetIndex={index}
                    />
                ))}
                </div>

                {/* BOTTOM ROW (P4, P5, P6) */}
                <div className="grid grid-cols-3 gap-14 items-end mb-40">
                {row2.map((racer, index) => (
                    <RacerCard
                    key={racer.id || racer.pos || index}
                    racer={racer}
                    offsetIndex={index}
                    />
                ))}
                </div>
            </div>
            </div>

        </div>
        </div>
    );
    };

    // ================= INDIVIDUAL RACER CARD COMPONENT =================
    interface RacerCardProps {
    racer: RiderResult;
    offsetIndex: number;
    }

    const RacerCard: React.FC<RacerCardProps> = ({ racer, offsetIndex }) => {
    const translateYClass =
        offsetIndex === 0
        ? 'translate-y-0'
        : offsetIndex === 1
        ? 'translate-y-20'
        : 'translate-y-40';
    
    const teamRacer = (racer.nam).split('/') || [];
    const nameParts = (racer.nam || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return (
        <div
        className={`relative flex flex-col justify-between w-full h-[140px] bg-gradient-to-b from-[#0B0F40] via-[#1C2082] via-[#1928AB] to-black border border-blue-500/40 shadow-[0_10px_25px_rgba(0,0,0,0.8)] p-3 transition-transform ${translateYClass}`}
        >
        <div className="absolute w-full h-[30px] bg-[#0B0F40] left-0 top-3" />
        <div className="absolute w-full h-[30px] bg-gradient-to-r from-black via-[#1928AB] to-[#0B0F40] left-0 top-18" />

        {/* TOP ROW */}
        <div className="flex justify-between items-start">
            <span className="text-3xl font-black text-white drop-shadow-md">
            {racer.pos}
            </span>
            <span className="text-5xl numberFont font-black italic tracking-normal text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-300 font-title pr-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            {racer.no}
            </span>
        </div>

        {/* BOTTOM ROW */}
        <div className="z-30 flex flex-col justify-end border-t border-blue-500/30 pt-5 mt-auto">
            <span className={`text-md ${teamRacer.length > 1 ? 'font-black' : 'font-extralight'} tracking-wider text-white uppercase leading-none`}>
            {(teamRacer.length > 1 ? teamRacer[0] : firstName)}
            </span>
            <span className="text-lg font-black tracking-wider text-white uppercase leading-tight">
            {(teamRacer.length > 1 ? teamRacer[1] : lastName)}
            </span>
        </div>

        {/* BOTTOM ACCENT LINES */}
        <div className="absolute bottom-0 left-0 right-0 h-[8px] bg-blue-700" />
        <div className="absolute bottom-1.5 left-0 right-0 h-[4px] bg-white" />
        </div>
    );
    };