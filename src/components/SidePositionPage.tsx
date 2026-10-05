import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { RiderResult, ControlState } from '../types';
import { SelectOption } from './lists';
import { WebRTCVideoPlayer } from './rtmpVideo';

interface SidePositionPageProps {
  riders: RiderResult[];
  sessionName: string;
  raceTitle: string;
  groupName: string;
  showBanner: boolean;
  control: ControlState;
  raceLaps: number;
  laps: number;
  lapsToGo: number;
  flag: number;
  raceSeconds?: number;
  stream?: string;
  useWebcam?: boolean;
  inputDevice?: string;
  videoStatus?: string;
  errorMessage?: string;
  selectedRiderId?: string | null;
  setSelectedRiderId?: (id: string | null) => void;
  setIsSetupOpen?: (open: boolean) => void;
  socket: WebSocket | null;
  inputDevices: (devices: SelectOption[]) => void;
  customBanner?: string;
}

// Helper to format race clock stopwatch
function formatRaceTimer(seconds: number = 0): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds * 10) % 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
}

// Helper to truncate/fit long driver names
function fitName(name: string, maxLength: number) {
  if (!name) return {first:'',last:'-'};;
  const parts = name.split(' ');
  if (name.length <= maxLength) return {first:'',last:name};
  if(parts.length === 1){
    if(name.length <= maxLength)return {first:'',last:name};
    return {first:'',last:name.slice(0, 3)};
  }
  return {first:parts[0][0],last:parts[1].slice(0, 3)};
}

export const SidePositionPage: React.FC<SidePositionPageProps> = ({
  riders,
  sessionName = '-',
  raceTitle = '-',
  groupName = '-',
  showBanner = false,
  control,
  raceLaps = 0,
  laps = 0,
  lapsToGo = 0,
  flag = 0,
  raceSeconds = 0,
  stream = '',
  useWebcam = false,
  inputDevice = '',
  videoStatus: parentVideoStatus,
  errorMessage: parentErrorMessage,
  selectedRiderId,
  setSelectedRiderId,
  setIsSetupOpen,
  socket,
  inputDevices,
  customBanner,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<string>('');
  const rtmpConnectionRef = useRef<string>('');

  streamRef.current = stream;

  const handleRTMPStatus = (rtmpStatus:string) =>{
    setLocalVideoStatus(rtmpStatus);
    sendStatus(rtmpStatus, 'rtmp');
    console.log("RTMP:",rtmpStatus)
    console.log("stream ref",streamRef.current);
    rtmpConnectionRef.current = rtmpStatus;
  };

  const [localVideoStatus, setLocalVideoStatus] = useState<string>('disconnected');
  const [localErrorMessage, setLocalErrorMessage] = useState<string>('');

  const activeVideoStatus = parentVideoStatus || localVideoStatus;
  const activeErrorMessage = parentErrorMessage || localErrorMessage;

  function sendStatus (status:string,msg:string){
    if(socket && socket.readyState === WebSocket.OPEN){
      socket.send(JSON.stringify({
              type: 'videoStatus',
              status:status,
              msg:msg
            }));
    }
  }
  function errorMessage (status:string,msg:string){
    if(socket && socket.readyState === WebSocket.OPEN){
      socket.send(JSON.stringify({
              type: 'errorMessage',
              status:status,
              error:msg
            }));
    }
  }

  const mainLogo = new URL('../img/logoYcr.png', import.meta.url).href;

  // --------------------------------------------------------------------------------------------------
  const finishFlagUrl = new URL('../img/finish-flah-blue.png', import.meta.url).href;
  const formatDeltaTime = (timeVal?: string | number, isLeader: boolean = false): string => {
  if (isLeader) return '-';
  if (timeVal === undefined || timeVal === null || timeVal === '') return '-';

  const strVal = String(timeVal).trim();

  // If leader or zero gap
  if (strVal === '-' || strVal === '0' || strVal === '0.000' || strVal === '0.0') {
    return '-';
  }

  // If it already has '+' or represents lap gaps like '1 LAP', leave as is
  if (strVal.startsWith('+') || strVal.toLowerCase().includes('lap')) {
    return strVal;
  }

  // Append '+' for positive numeric deltas
  const numericVal = parseFloat(strVal);
  if (!isNaN(numericVal) && numericVal > 0) {
    return `+${strVal}`;
  }

  return strVal;
};
  return (
    <div
      className="mt-2 w-full min-h-screen text-zinc-100 font-sans flex flex-col relative overflow-x-hidden"
      id="sideposition-container"
    >
      {/* Header Bar */}
      
      {false && (
      <div className="ml-10 flex flex-row w-fit bgbiruYamaha h-[60px]">
        <div className="p-2 flex flex-row gap-3">
          <img className="h-[40px] w-fit mb-5" src={mainLogo}/>

          <div className="flex flex-col w-fit gap-1">
            <div className="flex items-center gap-2">
              <span className="text-md font-bold text-zinc-300 uppercase tracking-widest leading-none">
                {sessionName || '-'}
                {/* RACE 1 */}
              </span>
            </div>
            <h1 className="text-xl font-black italic tracking-tighter uppercase text-zinc-100 leading-tight">
              {raceTitle} <span className="text-zinc-300 font-normal">/ {groupName}</span>
              {/* Yamaha Cup Race Seri 2 2026 / DF250 TMAX - XMAX - MAXI BORE UP */}
            </h1>
          </div>
        </div>

        {showBanner && (
          <div className="w-fit flex gap-2 h-full bgbiruYamaha p-3 items-end">
            <div className="w-fit flex gap-2 h-min">
              {/* {control.laps && !control.ltg && (
                <div className="text-3xl font-bold italic text-zinc-200 font-sans leading-none">
                  {laps} <span className="text-lg text-zinc-300 font-normal">LAPS</span>
                </div>
              )} */}
              
              {control.custom && (
                <h1 className="text-3xl font-bold text-zinc-100 uppercase">{customBanner}</h1>
              )}
              {(control.finish) && (
              // {(flag === 3 || control.finish) && (
                <h1 className="text-3xl font-bold text-zinc-100 uppercase">Finish</h1>
              )}
              {control.laps && flag !== 3 && !control.ltg && lapsToGo !==1 &&  (
                <div className="h-min">
                  {(raceLaps > laps) ? (
                  <div className="text-2xl font-bold text-zinc-100 font-sans leading-none">
                    Lap {laps}
                    <span className="text-2xl text-zinc-400"> / </span>
                    {raceLaps}
                  </div>) : (<div className="text-2xl font-bold text-zinc-100 font-sans leading-none">
                    Lap {laps}
                    <span className="text-2xl text-zinc-400"> / </span>
                    {(laps+lapsToGo)}
                  </div>)}
                  
                </div>
              )}

              {(control.ltg && flag !== 3) && (
              // {(control.ltg && flag !== 3) && (
                <div className="h-min">
                  {(lapsToGo === 1 )? (
                  <div className="text-3xl font-bold text-zinc-200 font-sans leading-none">
                    LAST LAP
                  </div>) : (
                  <div className="text-3xl font-bold italic text-zinc-200 font-sans leading-none">
                    {lapsToGo}{' '}
                    {flag !== 3 && <span className="text-lg text-zinc-400 font-normal">Laps to go</span>}
                  </div>)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )}
    {true &&(
      <div className="mt-5 ml-8.5 flex flex-col bg-zinc-100 h-fit rounded-t-xl w-[206px]">
        <motion.div 
        key="finish"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}>
          <div className="flex flex-col text-center w-full gap-1 p-2">
            <img className="h-[60px] mx-auto w-fit" src={mainLogo}/>
            <h1 className="text-[12px] my-0.5 font-extrabold italic tracking-tighter uppercase text-black leading-tight">
              {raceTitle}
              {/* Yamaha Cup Race Seri 2 2026 */}
            </h1>
            <div className='bg-blue-700 p-1 w-full'>
              <h1 className="text-sm font-bold tracking-tighter uppercase text-zinc-100 leading-tight">
                {groupName} 
                {/* DF250 TMAX - XMAX - MAXI BORE UP */}
              </h1>
            </div>
            <div className='flex align-center text-center'>
              <div className='h-[10px] flex-1 mr-2 border border-b-zinc-900 w-full'></div>
              <h1 className="text-sm font-semibold uppercase text-zinc-950 leading-tight">
                {sessionName || '-'}
                {/* RACE 1 */}
              </h1>
              <div className='h-[10px] flex-1 ml-2 border border-b-zinc-900 w-full'></div>
            </div>
          </div>
          <div className='overflow-hidden'>
            <div className={`w-full flex h-full px-1.5 items-center transition-transform ${showBanner ? 'translate-y-[0%] transition-transform duration-300 ease-in-out' : flag === 3 ? '' : '-translate-y-[100%] transition-transform duration-300 ease-in-out'}`}>
              <div className="w-full flex gap-2 h-min text-center align-center">
                {control.start &&(
                  <h1 className={`text-3xl numberFont text-black tracking-wider uppercase mx-auto`}>START</h1>

                )}
                {/* {flag === 3 && control.finish && !control.start && ( */}
                {control.finish && !control.start && (
                  <h1 className={`text-3xl numberFont text-black tracking-wider uppercase mx-auto`}>Finish</h1>
                )}
                {control.laps && flag !== 3 && !control.ltg && lapsToGo !==1 && !control.start &&  (

                  <div className="h-min  tracking-wide">

                    {true && (<div className="text-2xl text-black numberFont leading-none">
                    Lap {laps}
                    </div>)}

                    {false && (<div className="text-2xl numberFont text-black leading-none">
                      <span className='numberFontLighter'>Lap</span>
                      {" "}{laps}
                      <span className="text-2xl text-zinc-400"> / </span>
                      {(laps+lapsToGo)}
                    </div>)}
                  </div>
                )}

                {control.ltg && flag !== 3 && !control.start && (
                  <div className="h-min w-full">
                    {(lapsToGo === 1 )? (
                    <div className="text-3xl numberFont text-black leading-none">
                      LAST LAP
                    </div>) : (
                    <div className="flex items-center text-3xl ml-1 gap-2 font-bold uppercase text-black numberFont leading-none">
                      {lapsToGo}{' '}
                      <span className="text-lg text-zinc-900 numberFontLighter">Laps to go</span>
                    </div>)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    )}

      {/* Race Clock Timer */}
      {false &&(
        <div className="flex flex-col bg-zinc-900 w-fit p-3 ml-2 gap-2">
          <div className="text-3xl font-mono text-white flex items-center gap-1">
            {formatRaceTimer(raceSeconds)}
          </div>
        </div>
      )}
      

      {/* Main Positioning Display */}
    
    {true && (
      <main className="flex-1 max-w-7xl w-full flex flex-col relative z-10 animate-fade-in overflow-hidden " id="main-content">
        {/* Video Overlay Stream Viewport */}
        {control.video && (<p className='text-zinc-100/90 tracking-wider text-xl uppercase font-bold absolute left-85 top-2 z-40'>LIVE</p>)}
        <div className={`${control.video && control.rtmp && rtmpConnectionRef.current === 'playing' ? '' : 'hidden'} z-20 ml-8.5 w-[380px] bg-zinc-100 p-1 overflow-hidden font-sans`}>
          {streamRef.current.length > 0 && (
          <WebRTCVideoPlayer 
                streamUrl={streamRef.current}
                isRtmpActive={control.rtmp || false}
                connStatus={handleRTMPStatus}
              />)}
        </div>

        {/* Leaderboard Section */}
        <section className={`w-full flex flex-col ${control.position ? '' :'-translate-y-[120%] transition-transform duration-1000 ease-out'}`} id="leaderboard-section">
          <div className="w-full relative" id="riders-reordering-list">
            <AnimatePresence initial={false}>
              {riders.length === 0 ? (
                <div className="text-zinc-100 flex flex-col gap-4 animate-fade-in animate-pulse">-</div>
              ) : (
                riders.map((rider, index) => {
                  const showUI = { gap: false, gapTime: 0, diff: false };
                  if (typeof rider.df === 'number') {
                    if (rider.df >= 4 && rider.df < 5) {
                      showUI.diff = true;
                    }
                  }
                  const isLeader = index === 0;

                  // Highlight flashes on position swap
                  const isRecentlyChanged = rider.changeTime && Date.now() - rider.changeTime < 1300;
                  const flashClass = isRecentlyChanged
                    ? rider.changeDirection === 'up'
                      ? 'border-x-4 pointer border-l-emerald-600 border-r-emerald-600'
                      : rider.changeDirection === 'down'
                      ? 'border-x-4 pointer border-l-red-500 border-r-red-500'
                      : ''
                    : '';

                  return (
                    <motion.div
                      layoutId={`rider-row-${rider.id}`}
                      key={rider.id}
                      className={`my-0 w-full flex items-center flex-row border-transparent`}
                      id={`rider-row-${rider.id}`}
                      onClick={() => {
                        if (setSelectedRiderId) {
                          setSelectedRiderId(rider.id === selectedRiderId ? null : rider.id);
                        }
                        if (setIsSetupOpen) {
                          setIsSetupOpen(true);
                        }
                      }}
                    >
                      <div className={`flex items-center grid-cols-7 w-[240px] h-full grid border-transparent`}>
                        <div className="top-0 h-[30px]">
                        {(!rider.changeDirection || rider.changeDirection === 'steady') && (
                          
                          <img
                            src={finishFlagUrl} // Path from public/ directory
                            alt="Finish flag"
                            className={`${rider.if ? '' : 'hidden '}h-[40px] drop-shadow-2xl col-span-1 z-20 pointer-events-none`}
                          />
                          )}
                          </div>
                        {/* POSITION & ARROW */}
                        <div className={`col-span-1 border-transparent flex items-center justify-center h-full bg-zinc-100 ${flashClass}`}>
                          
                          <div>
                            {rider.changeDirection === 'up' && (
                              <ChevronUp className="w-7 h-7 text-emerald-600" />
                            )}
                            {rider.changeDirection === 'down' && (
                              <ChevronDown className="w-7 h-7 text-red-500" />
                            )}
                            {(!rider.changeDirection ||
                              (rider.changeDirection !== 'up' && rider.changeDirection !== 'down')) && (
                              <span
                                className="text-black text-xl font-bold"
                                id={`rider-pos-${rider.id}`}
                              >
                                {rider.pos || index + 1}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* RIDER NAME / TEAM */}
                        <div className="col-span-5 pl-4 flex items-center h-full bg-zinc-100">
                          <div className="w-fit flex truncate items-center gap-2.5">
                            {fitName(rider.nam, 6).first &&(
                            <span className="text-lg uppercase font-extralight tracking-tight leading-none text-black">
                              {fitName(rider.nam, 6).first}
                            </span>)}
                            <span className="text-lg uppercase font-bold tracking-tight leading-none text-black">
                              {fitName(rider.nam, 6).last}
                            </span>
                          </div>
                          
                        {/* VEHICLE NO */}
                        <div className="w-15 px-2 truncate my-1 ml-auto col-span-2 mr-2 rounded-sm bg-gradient-to-r from-blue-800 to-blue-950 text-center py-0">
                          <span className="text-xl font-semibold tracking-tighter text-white select-none font-sans">
                            {rider.no}
                          </span>
                        </div>
                        </div>

                      </div>

                      {/* TIMING & GAP / DIFF COLUMNS */}
                      <div className='overflow-hidden'>
                        <div className={`flex flex-row h-full `}>
                          {(rider.df || rider.gp) && control.time && (
                            <div
                              className={`${control.time ? 'translate-x-[0%] transition-transform duration-300 ease-in-out' : '-translate-x-[100%] transition-transform duration-300 ease-in-out'}
                              } w-[125px] h-full text-right flex flex-col justify-center bg-zinc-200 px-2 py-1.5 gap-1 z-10`}
                            >
                              <div className="h-full font-mono text-xl text-black tracking-tight leading-none">
                                {isLeader ? control.gap
                                    ? 'INTERVAL' : 'GAP'
                                      : control.gap ? formatDeltaTime(rider.gp, isLeader)
                                        : control.diff ? formatDeltaTime(rider.df, isLeader)
                                          : rider.df ? formatDeltaTime(rider.dfCl, isLeader)
                                            : '-'}
                                            
                                {/* {rider.lsTm ? `L:${rider.lsTm}` : '-'} */}
                              </div>
                            </div>
                          )}
              
                          {/* {rider.btTm && rider.ibt && ( */}
                          {(rider.btTm && control.best) && (
                            <div
                              className={`${
                                control.best ? control.time ? 'translate-x-[0%] transition-transform duration-300 ease-in-out' : 'translate-x-[100%] transition-transform duration-300 ease-in-out' : '-translate-x-[100%] transition-transform duration-300 ease-in-out'
                              } text-left flex flex-row text-lg py-1.5 font-black leading-none uppercase tracking-tight items-center justify-end gap-1 border-zinc-800 px-2 bg-zinc-200 border-transparent text-black z-2`}
                            >
                              <span className="font-mono text-black font-light tracking-tight">{laps === 2 ? 'Last lap:' : 'Best:'}</span> {rider.btTm}
                            </div>
                          )}
                          {rider.ls && (
                            <div
                              className={`${
                                control.racerLap ? control.time ? control.best ?'translate-x-[0%] transition-transform duration-300 ease-in-out' : '-translate-x-[0%] transition-transform duration-300 ease-in-out' : 'translate-x-[0%] transition-transform duration-300 ease-in-out' : '-translate-x-[100%] transition-transform duration-300 ease-in-out'
                              } text-left flex flex-row text-lg py-1.5 font-black leading-none uppercase tracking-tight items-center justify-end gap-1 border-zinc-800 px-2 bg-zinc-200 border-transparent text-black z-1`}
                            >
                              <span className="font-mono text-black font-light tracking-tight">lap: </span>{rider.ls}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>
      )}
    </div>
  );
};

export default SidePositionPage;
