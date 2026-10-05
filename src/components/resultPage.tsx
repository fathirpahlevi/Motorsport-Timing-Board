import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Printer, ArrowLeft, Flag, Medal, Clock } from 'lucide-react';
import { RiderResult, RaceEventData, RacerResult } from '../types';

interface RaceResultPageProps {
  data?: React.RefObject<RaceEventData | undefined> | RaceEventData;
  riders?: RiderResult[];
  raceTitle?: string;
  groupName?: string;
  sessionName?: string;
  finishedRacerPage: number;
  finishedRacerPages: (finishedRacerPages: number) => void;
}

export const RaceResultPage: React.FC<RaceResultPageProps> = ({
  data,
  riders,
  raceTitle = '-',
  groupName = '-',
  sessionName = '-',
  finishedRacerPage = 0,
  finishedRacerPages
}) => {
  // Resolve event data if passed as a ref or direct object
  const resolvedData: RaceEventData | undefined = React.isValidElement(data)
    ? undefined
    : (data as any)?.current || (data as RaceEventData | undefined);

  // Derive title, event name, session date
  const displayEventName = resolvedData?.eventName || raceTitle;
  const displayGroupName = resolvedData?.groupName || groupName;
  const displaySessionName = sessionName;

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
    const filtered =  sorted;

    finishedRacers = filtered.map((r, idx) => ({
      id: r.id || `rider-${idx}`,
      pos: idx + 1,
      name: r.nam || '-',
      team: r.cb || '-',
      number: r.no || '-',
      totalTime: r.tTm || r.lsTm || '--:--.---',
      isFinished: true,
      btTm: r.btTm || '--:--.---',
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
  

  let dividedFinishedRacers: Array<{
    id: string;
    pos: number;
    name: string;
    team: string;
    number: string | number;
    totalTime: string;
    isFinished: boolean;
  }> = [];

  // 2. Chunk into groups of 10
  const PAGE_SIZE = 10;
  const finishedRacersPages = [];
  const mainLogo = new URL('../img/logoYcr.png', import.meta.url).href;

  for (let i = 0; i < finishedRacers.length; i += PAGE_SIZE) {
    finishedRacersPages.push(finishedRacers.slice(i, i + PAGE_SIZE));
  }
  finishedRacerPages(finishedRacersPages.length);
  dividedFinishedRacers = finishedRacersPages[finishedRacerPage];

  return (
    <div className="h-[900px] text-zinc-100 font-sans selection:bg-blue-800/0">

      {/* Main Print / Display Container */}
      <div className="max-w-3xl mx-auto bg-blue-950/80 p-5 relative overflow-hidden">
        {/* Banner Graphic Line */}
        <div className="absolute -top-0 z-10 left-0 w-full h-1.5 bg-gradient-to-r from-yellow-600 via-yellow-600 to-yellow-300"></div>

        {/* Header Section */}
        <header className="mb-1 sticky top-0">
          <div className='w-full flex flex-row gap-3'>
            <img className="h-[90px] w-fit mb-5" src={mainLogo}/>
              <div className='w-full flex flex-col gap-3'>
                <h1 className="text-4xl numberFont uppercase tracking-widest text-white print:text-black">Final Results</h1>
                <div className="w-full p-2 bg-gradient-to-r from-zinc-100 via-zinc-100 to-zinc-100/0">
                  <h1 className="text-xl font-black italic uppercase tracking-tight text-blue-900 print:text-black">
                    {displayEventName}
                    {/* Yamaha Cup Race Seri 2 2026 */}
                  </h1>
                </div>
              </div>
          </div>
          <div className="flex flex-row items-center gap-4">
            <div className="w-full">
              <div className="flex items-center gap-2 mb-3">
              </div>
              <p className="text-sm font-semibold text-zinc-100 uppercase tracking-widest mt-3 print:text-zinc-600">
                {displayGroupName} : {displaySessionName}
                
              {/* DF250 TMAX - XMAX - MAXI BORE UP : RACE 1 */}
              </p>
            </div>
          </div>
        </header>

        {/* Finished Racers Table */}
        {finishedRacers.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 font-mono">
            <p className="text-xs mt-1 text-zinc-600">-</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto mt-5">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y bg-zinc-100 divide-zinc-800/60 print:divide-zinc-200">
                {dividedFinishedRacers.map((racer) => {
                  return (
                    <tr
                      key={racer.id}
                      className={`border-transparent border-b-4 pointer border-b-blue-950`}
                    >
                      {/* Column 1: Finished Position */}
                      <td className="py-1 px-1 text-center">
                        <div className="inline-flex items-center justify-center">
                            <span className="text-2xl font-mono font-bold text-black print:text-black">
                              {racer.pos}
                            </span>
                          
                        </div>
                      </td>

                      {/* Column 2: 1 Column with 2 Rows (Row 1: Racer Name, Row 2: Team Name) */}
                      <td className="py-1 px-4">
                        <div className="flex flex-col justify-center">
                          <span className="text-base sm:text-lg font-semibold uppercase tracking-tight text-black print:text-black">
                            {racer.name}
                          </span>
                          <span className="text-xs font-semibold uppercase tracking-wider text-black mt-0.5">
                            {racer.team}
                            {/* YAMAHA RACING TEAM */}
                          </span>
                        </div>
                      </td>

                      {/* Column 3: Racer Number */}
                      <td className="py-1 px-4 text-center">
                        <span className="inline-block bgbiruYamaha text-white font-mono font-black italic px-3 py-1 rounded text-base sm:text-lg print:bg-zinc-200 print:text-black">
                          #{racer.number}
                        </span>
                      </td>

                      {/* Column 4: Total Time */}
                      <td className="py-1 px-4 text-right">
                        <span className="font-mono text-base sm:text-lg font-extrabold text-black print:text-black">
                          {racer.totalTime}
                          {/* {racer.btTm} */}
                        </span>
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
  );
};

export default RaceResultPage;
