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
export function parseLapTimeToMs(timeStr: string | undefined | null): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  
  const trimmed = timeStr.trim();
  if (!trimmed || trimmed === "0:00.000" || trimmed === "00:00.000") return 0;

  const parts = trimmed.split(':');
  
  // Format: "ss.sss" (no minutes colon)
  if (parts.length === 1) {
    const parsed = parseFloat(parts[0]);
    return isNaN(parsed) ? 0 : Math.round(parsed * 1000);
  }
  
  // Format: "mm:ss.sss" or "hh:mm:ss.sss"
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10) || 0;
    const secParts = parts[1].split('.');
    const secs = parseInt(secParts[0], 10) || 0;
    const msStr = secParts[1] ? secParts[1].padEnd(3, '0').slice(0, 3) : '0';
    const ms = parseInt(msStr, 10) || 0;
    return mins * 60000 + secs * 1000 + ms;
  }

  return 0;
}

export function recalculateGaps(riders: RiderResult[]): RiderResult[] {
  if (riders.length === 0) return [];

  // Sort list by lbpos or numerical pos
  const sorted = [...riders].sort((a, b) => {
    const posA = a.lbpos ?? (parseInt(a.pos, 10) || 999);
    const posB = b.lbpos ?? (parseInt(b.pos, 10) || 999);
    return posA - posB;
  });

  const leaderTimeStr = sorted[0]?.tTm;
  const leaderMs = parseLapTimeToMs(leaderTimeStr);

  return sorted.map((rider, index) => {
    const posInt = index + 1;
    const posStr = posInt.toString();

    // Preserve existing raw string gaps if available and valid (e.g., "1 Lap", "0.238", etc.)
    let gpStr = rider.gp;
    let dfStr = rider.df;

    if (index === 0) {
      gpStr = "LEADER";
      dfStr = "-";
    } else {
      const currentMs = parseLapTimeToMs(rider.tTm);
      const precedingMs = parseLapTimeToMs(sorted[index - 1]?.tTm);

      // Only calculate mathematically if BOTH current and comparison riders have valid >0 total times
      // AND raw values were not already provided by the server/packet
      if (!gpStr && leaderMs > 0 && currentMs > 0) {
        const gapToLeader = (currentMs - leaderMs) / 1000;
        gpStr = gapToLeader > 0 ? `+${gapToLeader.toFixed(3)}` : `+0.000`;
      }

      if (!dfStr && precedingMs > 0 && currentMs > 0) {
        const diffToPreceding = (currentMs - precedingMs) / 1000;
        dfStr = diffToPreceding > 0 ? `+${diffToPreceding.toFixed(3)}` : `+0.000`;
      }
    }

    return {
      ...rider,
      lbpos: posInt,
      pos: posStr,
      pCl: posStr,
      gp: gpStr || "-",
      df: dfStr || "-",
      gpCl: gpStr || "-",
      dfCl: dfStr || "-"
    };
  });
}
