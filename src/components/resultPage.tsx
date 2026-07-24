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
}

export const RaceResultPage: React.FC<RaceResultPageProps> = ({
  data,
  riders,
  raceTitle = 'MOTOGP GRAND PRIX',
  groupName = 'OFFICIAL RACE RESULTS',
  sessionName = 'LIVE RACE FINISH',
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
    const filtered = hasFlaggedFinished ? sorted.filter((r) => r.if === true) : sorted;

    finishedRacers = filtered.map((r, idx) => ({
      id: r.id || `rider-${idx}`,
      pos: idx + 1,
      name: r.nam || 'Rider',
      team: r.cb || r.cl || 'Independent',
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
        name: r.riderName || 'Racer',
        team: r.teamGroup || 'Team',
        number: r.riderNo || '-',
        totalTime: r.totalTime || '--:--.---',
        isFinished: true,
      })
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 sm:p-8 selection:bg-red-600 selection:text-white">
      {/* Top Action Nav Bar (hidden when printing) */}
      <div className="max-w-5xl mx-auto flex items-center justify-between mb-8 print:hidden">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Console
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg shadow-lg shadow-red-950/40 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Results
          </button>
        </div>
      </div>

      {/* Main Print / Display Container */}
      <div className="max-w-5xl mx-auto bg-zinc-900/80 border border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-10 relative overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Banner Graphic Line */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-blue-600 to-red-600"></div>

        {/* Header Section */}
        <header className="border-b border-zinc-800 pb-6 mb-8 print:border-zinc-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
                  <Flag className="w-3 h-3" /> OFFICIAL
                </span>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">
                  {displaySessionName}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tight text-white print:text-black">
                {displayEventName}
              </h1>
              <p className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mt-1 print:text-zinc-600">
                {displayGroupName}
              </p>
            </div>

            <div className="flex items-center gap-3 bg-zinc-950/80 border border-zinc-800 px-4 py-3 rounded-xl print:border-zinc-300 print:bg-zinc-100">
              <Trophy className="w-8 h-8 text-amber-400 shrink-0" />
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Class Winners
                </div>
                <div className="text-xs font-bold text-zinc-200 print:text-black">
                  {finishedRacers.length > 0 ? finishedRacers[0].name : 'No Finisher'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Finished Racers Table */}
        {finishedRacers.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 font-mono">
            <Clock className="w-10 h-10 mx-auto mb-3 text-zinc-600 animate-pulse" />
            <p className="text-sm font-bold uppercase tracking-wider">No finished racers recorded yet.</p>
            <p className="text-xs mt-1 text-zinc-600">Results will display once riders cross the finish line.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 print:border-zinc-300 print:text-zinc-700">
                  <th className="py-3 px-4 text-center w-16">Pos</th>
                  <th className="py-3 px-4">Racer & Team</th>
                  <th className="py-3 px-4 text-center w-24">No.</th>
                  <th className="py-3 px-4 text-right w-36">Total Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 print:divide-zinc-200">
                {finishedRacers.map((racer) => {
                  const isGold = racer.pos === 1;
                  const isSilver = racer.pos === 2;
                  const isBronze = racer.pos === 3;

                  return (
                    <tr
                      key={racer.id}
                      className={`hover:bg-zinc-800/30 transition-colors ${
                        isGold ? 'bg-amber-950/20' : isSilver ? 'bg-zinc-800/20' : isBronze ? 'bg-amber-900/10' : ''
                      }`}
                    >
                      {/* Column 1: Finished Position */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center justify-center">
                          {isGold ? (
                            <span className="w-8 h-8 rounded-full bg-amber-400 text-zinc-950 font-black text-sm flex items-center justify-center shadow-lg shadow-amber-400/30">
                              1
                            </span>
                          ) : isSilver ? (
                            <span className="w-8 h-8 rounded-full bg-slate-300 text-zinc-950 font-black text-sm flex items-center justify-center">
                              2
                            </span>
                          ) : isBronze ? (
                            <span className="w-8 h-8 rounded-full bg-amber-700 text-white font-black text-sm flex items-center justify-center">
                              3
                            </span>
                          ) : (
                            <span className="text-lg font-mono font-bold text-zinc-400 print:text-black">
                              {racer.pos}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 2: 1 Column with 2 Rows (Row 1: Racer Name, Row 2: Team Name) */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col justify-center">
                          <span className="text-base sm:text-lg font-black uppercase tracking-tight text-white print:text-black">
                            {racer.name}
                          </span>
                          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 print:text-blue-800 mt-0.5">
                            {racer.team}
                          </span>
                        </div>
                      </td>

                      {/* Column 3: Racer Number */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-block bg-blue-700/80 text-white font-mono font-black italic px-3 py-1 rounded text-base sm:text-lg print:bg-zinc-200 print:text-black">
                          #{racer.number}
                        </span>
                      </td>

                      {/* Column 4: Total Time */}
                      <td className="py-4 px-4 text-right">
                        <span className="font-mono text-base sm:text-lg font-extrabold text-zinc-100 print:text-black">
                          {racer.totalTime}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-10 pt-6 border-t border-zinc-800 text-center text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex flex-col sm:flex-row items-center justify-between gap-2 print:border-zinc-300 print:text-zinc-600">
          <span>Official Motorsports Timing Systems</span>
          <span>Validated • Printed on {new Date().toLocaleDateString()}</span>
        </footer>
      </div>
    </div>
  );
};

export default RaceResultPage;
