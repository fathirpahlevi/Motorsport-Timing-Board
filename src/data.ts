/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RiderResult, SignalRPacket } from './types';

// The exact results from the prompt, supplemented with more grid racers
export const INITIAL_RIDERS: RiderResult[] = [];

// Helper to format Lap Time numbers into minutes:seconds.milliseconds
export function formatLapTime(milli: number): string {
  const mins = Math.floor(milli / 60000);
  const secs = Math.floor((milli % 60000) / 1000);
  const ms = Math.floor(milli % 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

export function parseLapTimeToMs(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length < 2) return parseFloat(timeStr) * 1000;
  const mins = parseInt(parts[0], 10);
  const subParts = parts[1].split('.');
  const secs = parseInt(subParts[0], 10);
  const ms = subParts[1] ? parseInt(subParts[1].padEnd(3, '0').slice(0, 3), 10) : 0;
  return mins * 60000 + secs * 1000 + ms;
}

// Generate gap strings dynamically relative to the leader's total time
export function recalculateGaps(riders: RiderResult[]): RiderResult[] {
  if (riders.length === 0) return [];
  
  // Sort list by lbpos or pos sequentially
  const sorted = [...riders].sort((a, b) => {
    return (a.lbpos || parseInt(a.pos, 10)) - (b.lbpos || parseInt(b.pos, 10));
  });

  const leaderTimeStr = sorted[0].tTm || "0:00.000";
  const leaderMs = parseLapTimeToMs(leaderTimeStr);

  return sorted.map((rider, index) => {
    // Standardize correct positions
    const posInt = index + 1;
    const posStr = posInt.toString();
    
    let gpStr = rider.gp ?? rider.gpCl ?? "";
    let dfStr = rider.df ?? rider.dfCl ?? "";
    
    if (gpStr === "" || gpStr === "+0.000") {
      if (index === 0) {
        gpStr = "LEADER";
        dfStr = "-";
      } else {
        const currentMs = parseLapTimeToMs(rider.tTm || "0:00.000");
        const precedingMs = parseLapTimeToMs(sorted[index - 1].tTm || "0:00.000");
        
        const gapToLeader = (currentMs - leaderMs) / 1000;
        const diffToPreceding = (currentMs - precedingMs) / 1000;
        
        gpStr = gapToLeader > 0 ? `+${gapToLeader.toFixed(3)}` : `+0.000`;
        dfStr = diffToPreceding > 0 ? `+${diffToPreceding.toFixed(3)}` : `+0.000`;
      }
    }
    
    return {
      ...rider,
      lbpos: posInt,
      pos: posStr,
      pCl: posStr,
      gp: gpStr,
      df: dfStr,
      gpCl: rider.gpCl ?? gpStr,
      dfCl: rider.dfCl ?? dfStr
    };
  });
}
