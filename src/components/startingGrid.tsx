import React ,{useState,useRef,useEffect} from 'react';
import { RiderResult, ControlState } from '../types';


    interface StartingGrid {
    championshipTitle?: string;
    circuitTitle?: string;
    racers?: RiderResult[];
    activePageIndex?: number; // 0 for P1-P6, 1 for P7-P12
    pages: (gridPages:number|0) => void;
    }

    // Sample fallback data matching the Moto3 layout
    const DEFAULT_RACERS: RiderResult[] = [];


    export const StartingGrid: React.FC<StartingGrid> = ({
        championshipTitle = 'YAMAHA CUP RACE SERI 2 2026',
        circuitTitle = 'SIRKUIT LANUD SUTAN SJAHRIR',
        racers = DEFAULT_RACERS,
        activePageIndex = 0,
        pages,
    }) => {
    // Page chunking: Get 6 racers for the current grid screen
    const gridPage = useRef<number>(0);
    const [pageIndex, setPageIndex] = useState(0);

    const pageRacers = racers.slice(gridPage.current * 6, gridPage.current * 6 + 6);
    const row1 = pageRacers.slice(0, 3);
    const row2 = pageRacers.slice(3, 6);
    const gridPages = Math.ceil(racers.length / 6);
    pages(gridPages);
    const stairCase = [
    'mt-0', // Applied to index 0, 3, 6, 9...
    'mt-3',   // Applied to index 1, 4, 7, 10...
    'mt-6',  // Applied to index 2, 5, 8, 11...
    ];

    // Animation state phase: 'idle' | 'sliding-out' | 'snapping-bottom' | 'sliding-in'
    const [animPhase, setAnimPhase] = useState<'idle' | 'sliding-out' | 'snapping-bottom' | 'sliding-in'>('idle');

    // Trigger function to go to next page
    const triggerNextPage = () => {
        if (animPhase !== 'idle') return; // Prevent double clicking during animation
        setAnimPhase('sliding-out');
    };
    useEffect(() => {
        gridPage.current = pageIndex;
    },[pageIndex]);

    if(activePageIndex !== gridPage.current){
        triggerNextPage();
    }

    // Called automatically when the slide-out CSS transition finishes
    const handleTransitionEnd = () => {
        if (animPhase === 'sliding-out') {
            // 1. Instantly snap offscreen to bottom (disable transition briefly)
            setAnimPhase('snapping-bottom');

            // 2. Update page content while offscreen
            setPageIndex((prev) => (prev + 1) % gridPages);
            setPageIndex(activePageIndex);

            // 3. Immediately slide back in from the bottom on next frame
            requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setAnimPhase('sliding-in');
            });
            });
        } else if (animPhase === 'sliding-in') {
            // Return to normal resting position
            setAnimPhase('idle');
        }
    };

    // Get current styling based on animation phase
    const getTransformClasses = () => {
    switch (animPhase) {
        case 'sliding-out':
        return '-translate-y-[120%] transition-transform duration-350 ease-in-out';
        case 'snapping-bottom':
        return 'translate-y-[120%] transition-none'; // No transition so snap is invisible
        case 'sliding-in':
        return 'translate-y-0 transition-transform duration-350 ease-in-out';
        case 'idle':
        default:
        return 'translate-y-0';
    }
    };
    
    const mainLogo = new URL('../img/logoYcr.png', import.meta.url).href;

    return (
        <div className="relative w-[1920px] h-[1000px] bg-transparent text-white font-sans overflow-hidden select-none p-8 bg-gradient-to-b from-zinc-900/80 via-slate-600/70 to-zinc-900/0">
        
        {/* ================= HEADER SECTION ================= */}
            <div className='flex flex-row'>
                
                <img className="h-[140px] w-fit mb-5" src={mainLogo}/>
                <div className="ml-7 flex flex-col">
                    {/* Championship & Track Titles */}
                    <div className="flex items-center gap-3 text-md font-bold tracking-wider text-slate-200">
                    <span className="font-extrabold uppercase">{championshipTitle}</span>
                    </div>
                    <div className="text-lg text-slate-300 font-semibold tracking-widest uppercase">
                    {circuitTitle}
                    </div>

                    {/* Large "STARTING GRID" Main Title */}
                    <h1 className="text-8xl numberFont font-black tracking-widest uppercase text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] mt-1 font-title">
                        STARTING GRID
                    </h1>
                </div>
                
            </div>

            <div className="text-lg text-slate-300 font-semibold tracking-widest uppercase">
                DF250 TMAX - XMAX - MAXI BORE UP : RACE 1
            </div>
            {/* ================= MAIN CONTENT LAYOUT ================= */}
            <div className="flex items-stretch mt-8 bg-zinc-200/50 rounded-l-xl">
                
                {/* 1. LEFT SIDEBAR (RACER NUMBERS IN 3 COLUMNS) */}
                <div className="w-[220px] bg-zinc-100/90 rounded-l-xl p-3 flex flex-col justify-center">
                    <div className="grid grid-cols-3 gap-y-6 gap-x-3 items-center mx-2">
                        {racers.length === 0 ? (
                        <div className="text-zinc-100 flex flex-col gap-4 animate-fade-in animate-pulse">-</div>):
                        (racers.map((num, idx) => {
                        // Highlight active page racers in bright blue/white, inactive in dim grey
                        const racerNumber = num.no;
                        const isCurrentPageRacer = pageRacers.some((r) => String(r.no) === String(racerNumber));
                        const itemClass = stairCase[idx % 3];

                            return (
                                <div
                                key={idx}
                                className={`flex items-center justify-center h-7 border rounded-[2px] text-lg numberFontLighter tracking-wider ${itemClass} ${
                                    isCurrentPageRacer
                                    ? 'bg-gradient-to-r from-blue-800 via-blue-950 via-blue-900 to-zinc-950 border-blue-400 text-white shadow-[0_0_8px_rgba(37,99,235,0.8)]'
                                    : 'bg-slate-800/80 border-slate-600/60 text-slate-400'
                                }`}
                                >
                                {racerNumber}
                                </div>
                            );
                        }))
                        }
                    </div>
                </div>
                <div className='relative w-full h-[750px] overflow-hidden'>
                    <div onTransitionEnd={handleTransitionEnd} className={`h-full flex-1 flex flex-col justify-between py-2 transition-transform ${getTransformClasses()}`}>
                    
                    {/* TOP ROW (P1, P2, P3) */}
                        <div className="grid grid-cols-3 gap-14 items-end">
                            {row1.map((racer, index) => (
                                <RacerCard key={racer.pos || index} racer={racer} offsetIndex={index} />
                            ))}
                        </div>

                        {/* BOTTOM ROW (P4, P5, P6) */}
                        <div className="grid grid-cols-3 gap-14 items-end mb-40">
                            {row2.map((racer, index) => (
                            <RacerCard key={racer.pos || index} racer={racer} offsetIndex={index} />
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
    // Stagger grid offset: Column 0 is higher, Column 1 is lower, Column 2 is lowest
    const translateYClass =
        offsetIndex === 0 ? 'translate-y-0' : offsetIndex === 1 ? 'translate-y-20' : 'translate-y-40';

    // Format name: split into first name and last name for bold styling
    const nameParts = racer.nam.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return (
        <div className={`relative flex flex-col justify-between w-full h-[140px] bg-gradient-to-b from-[#0B0F40] via-[#1C2082] via-[#1928AB] to-black border border-blue-500/40 shadow-[0_10px_25px_rgba(0,0,0,0.8)] p-3 transition-transform ${translateYClass}`}>
        <div className='absolute w-full h-[30px] bg-[#0B0F40] left-0 top-3'></div>
        <div className='absolute w-full h-[30px] bg-gradient-to-r from-black via-[#1928AB] to-[#0B0F40] left-0 top-18'></div>
            {/* TOP ROW: POSITION NUMBER & LARGE OUTLINED BIKE NUMBER */}
            <div className="flex justify-between items-start">
                {/* Position Number (Top Left) */}
                <span className="text-3xl font-black text-white drop-shadow-md">
                {racer.pos}
                </span>

                {/* Bike Number (Top Right - Large Outlined Racing Style) */}
                <span className="text-5xl numberFont font-black italic tracking-normal text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-300 font-title pr-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {racer.no}
                </span>
            </div>

            {/* BOTTOM ROW: RACER NAME (NO COUNTRY FLAG) */}
            <div className="z-30 flex flex-col justify-end border-t border-blue-500/30 pt-5 mt-auto">
                {/* First Name (Regular/Smaller) */}
                <span className="text-md font-extralight tracking-wider text-white uppercase leading-none">
                {firstName}
                </span>
                {/* Last Name (Bold/Large) */}
                <span className="text-lg font-black tracking-wider text-white uppercase leading-tight">
                {lastName}
                </span>
            </div>

            {/* Bottom Accent Line */}
            <div className="absolute bottom-0 left-0 right-0 h-[8px] bg-blue-700" />
            <div className="absolute bottom-1.5 left-0 right-0 h-[4px] bg-white" />
        </div>
    );
};