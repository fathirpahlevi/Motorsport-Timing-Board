import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Printer, ArrowLeft, Flag, Medal, Clock } from 'lucide-react';
import { RiderResult, RaceEventData, RacerResult } from '../types';
import '@fontsource/orbitron';

interface RaceResultPageProps {
  data?: React.RefObject<RaceEventData | undefined> | RaceEventData;
  riders?: RiderResult[];
  raceTitle?: string;
  groupName?: string;
  sessionName?: string;
}

export const TrophyPage: React.FC<RaceResultPageProps> = ({
  data,
  riders,
  raceTitle = '-',
  groupName = '-',
  sessionName = '-',
}) => {
  // Resolve event data if passed as a ref or direct object
  const resolvedData: RaceEventData | undefined = React.isValidElement(data)
    ? undefined
    : (data as any)?.current || (data as RaceEventData | undefined);

  // Derive title, event name, session date
  const displayEventName = resolvedData?.eventName || raceTitle;
  const displayGroupName = resolvedData?.groupName || groupName;
  const displaySessionName = sessionName;
  
  const goldTrophy = new URL('../img/gold.png', import.meta.url).href;
  const silverTrophy = new URL('../img/silver.png', import.meta.url).href;
  const bronzeTrophy = new URL('../img/bronze.png', import.meta.url).href;
  const goldMedal = new URL('../img/gold-medal.png', import.meta.url).href;
  const silverMedal = new URL('../img/silver-medal.png', import.meta.url).href;
  const bronzeMedal = new URL('../img/bronze-medal.png', import.meta.url).href;
  const mainLogo = new URL('../img/logoYcr.png', import.meta.url).href;

  // Build unified list of finished racers
  let finishedRacers: Array<{
    id: string;
    pos: number;
    name: string;
    team: string;
    number: string | number;
    totalTime: string;
    isFinished: boolean;
  }> = [];

  if (riders && riders.length > 0) {
    // Sort riders by position
    const sorted = [...riders].sort(
      (a, b) => (a.lbpos || parseInt(a.pos, 10) || 99) - (b.lbpos || parseInt(b.pos, 10) || 99)
    );

    // Filter finished racers (`r.if === true` or completed laps or if explicitly finished)
    // Fall back to showing all sorted if none explicitly flagged `if === true`
    const hasFlaggedFinished = sorted.some((r) => r.if === true);
    const filtered = hasFlaggedFinished ? sorted.filter((r) => r.if === true) : sorted;

    finishedRacers = filtered.map((r, idx) => ({
      id: r.id || `rider-${idx}`,
      pos: idx + 1,
      name: r.nam || '-',
      team: r.cb || '-',
      number: r.no || '-',
      totalTime: r.tTm || r.gp || r.lsTm || '--:--.---',
      isFinished: true,
    }));
  } else if (resolvedData?.racers && resolvedData.racers.length > 0) {
    const finishedOnly = resolvedData.racers.filter(
      (r) => !r.status || r.status === 'FINISHED'
    );
    finishedRacers = (finishedOnly.length > 0 ? finishedOnly : resolvedData.racers).map(
      (r, idx) => ({
        id: r.id || `racer-${idx}`,
        pos: r.position || idx + 1,
        name: r.riderName || '-',
        team: r.teamGroup || '-',
        number: r.riderNo || '-',
        totalTime: r.totalTime || '--:--.---',
        isFinished: true,
      })
    );
  }
  return (
    <div className="mt-30 relative bg-gradient-to-t from-blue-950 via-blue-900/90 via-blue-900/90 to-blue-900/0 flex flex-col justify-center items-center min-h-screen text-zinc-100 font-sans p-8">

      {/* Main Print / Display Container */}
      {(finishedRacers.length > 0) && (
      <div className="w-fit flex text-center mb-70">
        <div className="flex flex-wrap justify-center items-end gap-10 text-zinc-900">
          <div className='mb-0'>
            <div className='flex flex-row items-end'>
              <div className='ml-6 flex flex-row items-start'>
                <h1 className='numberFont mb-1 text-9xl text-zinc-100'>4</h1>
                <p className='text-6xl text-zinc-100'>TH</p>
              </div>
              <div className="w-fit h-fit ml-auto flex flex-col justify-center items-end ">
                <img className="h-[120px] w-fit mb-5" src={mainLogo}/>
                <div className="bg-blue-800/70 h-auto w-40 flex justify-center items-end text-zinc-100 font-bold text-2xl">{finishedRacers[3] ? finishedRacers[3].totalTime :'--:--'}</div>
              </div>
            </div>
            <div className="w-100 flex flex-col">
              <div className="w-full py-3 bg-blue-800 flex flex-col items-center">
                <h2 className="text-zinc-100 uppercase font-bold text-3xl">{finishedRacers[3] ? finishedRacers[3].name : '-'}</h2>
              </div>
              <div className="w-full flex flex-col items-center bg-zinc-100">
                <p className="text-blue-950 font-semibold text-3xl">{finishedRacers[3] ? finishedRacers[3].team : '-'}</p>
                {/* <p className="text-blue-950 font-semibold text-3xl">Team 3</p> */}
              </div>
            </div>
          </div>
          <div className='mb-20'>
            <div className='flex flex-row items-end'>
              <div className='ml-6 flex flex-row items-start'>
                <h1 className='numberFont mb-1 text-9xl text-zinc-100'>2</h1>
                <p className='text-6xl z-2 text-zinc-100'>ND</p>
              </div>
              <div className="w-fit h-fit ml-auto relative flex flex-col justify-center items-end ">
                <img className='h-[166px] z-1 w-fit absolute -left-34 bottom-13' src={silverMedal}/>
                <img className="h-[120px] z-2 w-fit mb-5" src={mainLogo}/>
                <div className="bg-blue-800/70 h-auto w-40 flex justify-center items-end text-zinc-100 font-bold text-2xl">{finishedRacers[1] ? finishedRacers[1].totalTime : '--:--'}</div>
              </div>
            </div>
            <div className="w-100 flex flex-col">
              <div className="w-full py-3 bg-blue-800 flex flex-col items-center">
                <h2 className="text-zinc-100 uppercase font-bold text-3xl">{finishedRacers[1] ? finishedRacers[1].name : '-'}</h2>
              </div>
              <div className="w-full flex flex-col items-center bg-zinc-100">
                <p className="text-blue-950 font-semibold text-3xl">{finishedRacers[1] ? finishedRacers[1].team : '-'}</p>
                {/* <p className="text-blue-950 font-semibold text-3xl">Team 4</p> */}
              </div>
            </div>
          </div>
          <div className='mb-50'>
            <div className='flex flex-row items-end'>
              <div className='ml-6 flex flex-row items-start'>
                <h1 className='numberFont mb-1 text-9xl text-zinc-100'>1</h1>
                <p className='text-6xl z-2 text-zinc-100'>ST</p>
              </div>
              <div className="w-fit h-fit ml-auto relative flex flex-col justify-center items-end ">
                <img className='h-[166px] z-1 w-fit absolute -left-27 bottom-15' src={goldMedal}/>
                <img className="h-[120px] z-2 w-fit mb-5" src={mainLogo}/>
                <div className="bg-blue-800/70 h-auto w-40 flex justify-center items-end text-zinc-100 font-bold text-2xl">{finishedRacers[0] ? finishedRacers[0].totalTime : '--:--'}</div>
              </div>
            </div>
            <div className="w-100 flex flex-col">
              <div className="w-full py-3 bg-blue-800 flex flex-col items-center">
                <h2 className="text-zinc-100 uppercase font-bold text-3xl">{finishedRacers[0] ? finishedRacers[0].name : '-'}</h2>
              </div>
              <div className="w-full flex flex-col items-center bg-zinc-100">
                <p className="text-blue-950 font-semibold text-3xl">{finishedRacers[0] ? finishedRacers[0].team : '-'}</p>
                {/* <p className="text-blue-950 font-semibold text-3xl">Team 2</p> */}
              </div>
            </div>
          </div>
          <div className='mb-20'>
            <div className='flex flex-row items-end'>
              <div className='ml-6 flex flex-row items-start'>
                <h1 className='numberFont mb-1 text-9xl text-zinc-100'>3</h1>
                <p className='text-6xl z-2 text-zinc-100'>RD</p>
              </div>
              <div className="w-fit h-fit ml-auto relative flex flex-col justify-center items-end ">
                <img className='h-[166px] z-1 w-fit absolute -left-27 bottom-15' src={bronzeMedal}/>
                <img className="h-[120px] z-2 w-fit mb-5" src={mainLogo}/>
                <div className="bg-blue-800/70 h-auto w-40 flex justify-center items-end text-zinc-100 font-bold text-2xl">{finishedRacers[2] ? finishedRacers[2].totalTime : '--:--'}</div>
              </div>
            </div>
            <div className="w-100 flex flex-col">
              <div className="w-full py-3 bg-blue-800 flex flex-col items-center">
                <h2 className="text-zinc-100 uppercase font-bold text-3xl">{finishedRacers[2] ? finishedRacers[2].name : '-'}</h2>
              </div>
              <div className="w-full flex flex-col items-center bg-zinc-100">
                <p className="text-blue-950 font-semibold text-3xl">{finishedRacers[2] ? finishedRacers[2].team : '-'}</p>
                
                {/* <p className="text-blue-950 font-semibold text-3xl">Team 1</p> */}
              </div>
            </div>
          </div>
          <div className='mb-0'>
            <div className='flex flex-row items-end'>
              <div className='ml-6 flex flex-row items-start'>
                <h1 className='numberFont mb-1 text-9xl text-zinc-100'>5</h1>
                <p className='text-6xl z-2 text-zinc-100'>TH</p>
              </div>
              <div className="w-fit h-fit ml-auto relative flex flex-col justify-center items-end ">
                <img className="h-[120px] z-2 w-fit mb-5" src={mainLogo}/>
                <div className="bg-blue-800/70 h-auto w-40 flex justify-center items-end text-zinc-100 font-bold text-2xl">{finishedRacers[4] ? finishedRacers[4].totalTime : '--:--'}</div>
              </div>
            </div>
            <div className="w-100 flex flex-col">
              <div className="w-full py-3 bg-blue-800 flex flex-col items-center">
                <h2 className="text-zinc-100 uppercase font-bold text-3xl">{finishedRacers[4] ? finishedRacers[4].name : '-'}</h2>
              </div>
              <div className="w-full flex flex-col items-center bg-zinc-100">
                <p className="text-blue-950 font-semibold text-3xl">{finishedRacers[4] ? finishedRacers[4].team : '-'}</p>
                
                {/* <p className="text-blue-950 font-semibold text-3xl">Team 2</p> */}
              </div>
            </div>
          </div>

        </div>
      </div>
      )}
      <div className='absolute flex flex-col bottom-50 text-center'>
        <h1 className='text-7xl numberFont text-zinc-100'>AWARDING</h1>
        <h1 className='text-7xl numberFont text-zinc-100'>
              {groupName}</h1>
      </div>
    </div>
  );
};

export default TrophyPage;
