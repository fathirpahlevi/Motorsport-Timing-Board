/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RiderResult, SignalRPacket } from './types';

// The exact results from the prompt, supplemented with more grid racers
export const INITIAL_RIDERS: RiderResult[] = [
      {
          "sesId": "BC1D089628E2B749-2147483817-1073742831",
          "eId": "BC1D089628E2B749-2147483817",
          "id": "115",
          "btTm": "1:30.773",
          "ibt": true,
          "btCl": true,
          "tTm": "10:48.410",
          "lsTm": "1:32.139",
          "ls": 7,
          "cl": "Superbike",
          "cln": "Superbike",
          "nam": "Pawelec Milan",
          "no": "44",
          "dNo": "44",
          "lbpos": 1,
          "pCl": "1",
          "pos": "1",
          "mkr": 1,
          "anim": 907.73,
          "asp": 0,
          "if": false,
          "s2": "23.467",
          "s1": "30.500",
          "s0": "38.172",
          "nat": "PL",
          "mk": "Honda"
      },
      {
          "sesId": "BC1D089628E2B749-2147483817-1073742831",
          "eId": "BC1D089628E2B749-2147483817",
          "id": "120",
          "btTm": "1:32.313",
          "ibt": false,
          "btCl": true,
          "gp": "6.586",
          "df": "6.586",
          "tTm": "10:54.996",
          "lsTm": "1:33.355",
          "ls": 7,
          "cl": "SST 1000",
          "cln": "SST 1000",
          "nam": "Mateusz Molik",
          "no": "7",
          "dNo": "7",
          "lbpos": 2,
          "pCl": "1",
          "pos": "2",
          "mkr": 1,
          "anim": 924.29,
          "asp": 0,
          "if": false,
          "s2": "23.963",
          "s1": "30.742",
          "s0": "38.650",
          "nat": "PL",
          "mk": "Honda CBR1000"
      },
      {
          "sesId": "BC1D089628E2B749-2147483817-1073742831",
          "eId": "BC1D089628E2B749-2147483817",
          "id": "122",
          "btTm": "1:33.467",
          "ibt": false,
          "btCl": false,
          "gp": "6.650",
          "df": "13.236",
          "gpCl": "13.236",
          "dfCl": "13.236",
          "tTm": "11:01.646",
          "lsTm": "1:34.022",
          "ls": 7,
          "cl": "Superbike",
          "cln": "Superbike",
          "nam": "Artur Wielebski",
          "no": "16",
          "dNo": "16",
          "lbpos": 3,
          "pCl": "2",
          "pos": "3",
          "mkr": 1,
          "anim": 936.31,
          "asp": 0,
          "if": false,
          "s2": "24.015",
          "s1": "30.995",
          "s0": "39.012",
          "nat": "PL",
          "mk": "Honda CBR"
      },
      {
          "sesId": "BC1D089628E2B749-2147483817-1073742831",
          "eId": "BC1D089628E2B749-2147483817",
          "id": "70",
          "btTm": "1:33.836",
          "ibt": false,
          "btCl": false,
          "gp": "3.203",
          "df": "16.439",
          "gpCl": "9.853",
          "dfCl": "9.853",
          "tTm": "11:04.849",
          "lsTm": "1:34.378",
          "ls": 7,
          "cl": "SST 1000",
          "cln": "SST 1000",
          "nam": "Grzegorz Hanuszewicz",
          "no": "66",
          "dNo": "66",
          "lbpos": 4,
          "pCl": "2",
          "pos": "4",
          "mkr": 1,
          "anim": 940.32,
          "asp": 0,
          "if": false,
          "s2": "24.079",
          "s1": "31.068",
          "s0": "39.231",
          "nat": "PL",
          "mk": "BMW"
      },
      {
          "sesId": "BC1D089628E2B749-2147483817-1073742831",
          "eId": "BC1D089628E2B749-2147483817",
          "id": "84",
          "btTm": "1:36.539",
          "ibt": false,
          "btCl": false,
          "gp": "17.205",
          "df": "33.032",
          "gpCl": "17.205",
          "dfCl": "26.942",
          "tTm": "9:46.200",
          "lsTm": "1:36.851",
          "ls": 6,
          "cl": "SST 1000",
          "cln": "SST 1000",
          "nam": "Marcin Biernacki",
          "no": "91",
          "dNo": "91",
          "lbpos": 5,
          "pCl": "3",
          "pos": "5",
          "mkr": 1,
          "anim": 967.37,
          "asp": 0,
          "if": false,
          "s1": "31.819",
          "s0": "39.956",
          "nat": "PL",
          "mk": "BMW"
      },
      {
          "sesId": "BC1D089628E2B749-2147483817-1073742831",
          "eId": "BC1D089628E2B749-2147483817",
          "id": "93",
          "btTm": "1:36.141",
          "ibt": false,
          "btCl": false,
          "gp": "0.284",
          "df": "33.316",
          "gpCl": "0.284",
          "dfCl": "27.226",
          "tTm": "9:46.290",
          "lsTm": "1:36.826",
          "ls": 6,
          "cl": "SST 1000",
          "cln": "SST 1000",
          "nam": "Sylwester Byczkowski",
          "no": "70",
          "dNo": "70",
          "lbpos": 6,
          "pCl": "4",
          "pos": "6",
          "mkr": 1,
          "anim": 966.98,
          "asp": 0,
          "if": false,
          "s1": "31.918",
          "s0": "40.051",
          "nat": "PL",
          "mk": "BMW"
      },
      {
          "sesId": "BC1D089628E2B749-2147483817-1073742831",
          "eId": "BC1D089628E2B749-2147483817",
          "id": "121",
          "btTm": "1:37.181",
          "ibt": false,
          "btCl": false,
          "gp": "8.464",
          "df": "40.362",
          "gpCl": "28.169",
          "dfCl": "40.362",
          "tTm": "9:53.346",
          "lsTm": "1:39.182",
          "ls": 6,
          "cl": "Superbike",
          "cln": "Superbike",
          "nam": "Piotr Fałat",
          "no": "94",
          "dNo": "94",
          "lbpos": 7,
          "pCl": "3",
          "pos": "7",
          "mkr": 0,
          "anim": 973.71,
          "asp": 0,
          "if": false,
          "s0": "41.459",
          "nat": "PL",
          "mk": "BMW"
      },
      {
          "sesId": "BC1D089628E2B749-2147483817-1073742831",
          "eId": "BC1D089628E2B749-2147483817",
          "id": "67",
          "btTm": "1:40.618",
          "ibt": false,
          "btCl": false,
          "gp": "18.185",
          "df": "58.547",
          "gpCl": "26.649",
          "dfCl": "52.699",
          "tTm": "10:11.490",
          "lsTm": "1:40.744",
          "ls": 6,
          "cl": "SST 1000",
          "cln": "SST 1000",
          "nam": "Jakub Onak",
          "no": "39",
          "dNo": "39",
          "lbpos": 8,
          "pCl": "5",
          "pos": "8",
          "mkr": 1,
          "anim": 1006.18,
          "asp": 0,
          "if": false,
          "s0": "41.500",
          "nat": "PL",
          "mk": "BMW S1000"
      },
      {
          "sesId": "BC1D089628E2B749-2147483817-1073742831",
          "eId": "BC1D089628E2B749-2147483817",
          "id": "111",
          "btTm": "1:40.567",
          "ibt": false,
          "btCl": false,
          "gp": "1.616",
          "df": "1:00.163",
          "gpCl": "19.801",
          "dfCl": "1:00.163",
          "tTm": "10:12.180",
          "lsTm": "1:42.102",
          "ls": 6,
          "cl": "Superbike",
          "cln": "Superbike",
          "nam": "David Kuzela",
          "no": "79",
          "dNo": "79",
          "lbpos": 9,
          "pCl": "4",
          "pos": "9",
          "mkr": 1,
          "anim": 1007.04,
          "asp": 0,
          "if": false,
          "s0": "42.426",
          "nat": "SVK",
          "mk": "Yamaha R1"
      },
      {
          "sesId": "BC1D089628E2B749-2147483817-1073742831",
          "eId": "BC1D089628E2B749-2147483817",
          "id": "141",
          "btTm": "1:40.316",
          "ibt": false,
          "btCl": false,
          "gp": "0.241",
          "df": "1:00.404",
          "gpCl": "0.241",
          "dfCl": "1:00.404",
          "tTm": "10:12.339",
          "lsTm": "1:41.563",
          "ls": 6,
          "cl": "Superbike",
          "cln": "Superbike",
          "nam": "Tomas Borovka",
          "no": "84",
          "dNo": "84",
          "lbpos": 10,
          "pCl": "5",
          "pos": "10",
          "mkr": 1,
          "anim": 1006.15,
          "asp": 0,
          "if": false,
          "s0": "42.508",
          "nat": "SVK",
          "mk": "Yamaha R1"
      },
      {
          "sesId": "BC1D089628E2B749-2147483817-1073742831",
          "eId": "BC1D089628E2B749-2147483817",
          "id": "46",
          "ibt": false,
          "btCl": false,
          "dfCl": "DNF",
          "tTm": "1.993",
          "lsTm": "RETIRED",
          "ls": 0,
          "cl": "SST 1000",
          "cln": "SST 1000",
          "nam": "Przemysław Jakóbczak",
          "no": "21",
          "dNo": "21",
          "lbpos": 11,
          "pCl": "DNF",
          "pos": "DNF",
          "mkr": 9,
          "anim": 0.0,
          "asp": 0,
          "if": false,
          "s0": "42.524",
          "nat": "PL",
          "mk": "BMW"
      }
  ];

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

export const TERMINAL_STATUS_STATES: string[] = ['DNF', 'DNS', 'DSQ', 'DNQ', 'Ret', 'NC'];

export function isRiderDnf(rider: RiderResult): boolean {
  if (!rider) return false;
  if (rider.status && TERMINAL_STATUS_STATES.includes(rider.status)) {
    return true;
  }
  const posUpper = typeof rider.pos === 'string' ? rider.pos.trim().toUpperCase() : '';
  const pClUpper = typeof rider.pCl === 'string' ? rider.pCl.trim().toUpperCase() : '';
  return TERMINAL_STATUS_STATES.some(st => posUpper === st || pClUpper === st || posUpper.includes(st) || pClUpper.includes(st));
}

export function recalculateGaps(riders: RiderResult[]): RiderResult[] {
  if (riders.length === 0) return [];

  // Keep the exact sorted racer position as provided by raw data (do NOT shift DNF/terminal racers behind)
  const sorted = [...riders];

  const leaderTimeStr = sorted[0]?.tTm;
  const leaderMs = parseLapTimeToMs(leaderTimeStr);

  return sorted.map((rider, index) => {
    const status = rider.status || 'RUN';
    const isTerminalState = TERMINAL_STATUS_STATES.includes(status);
    const isDnf = isTerminalState || isRiderDnf(rider);

    // Keep the raw position from raw data; only states 6-11 (terminal states) replace the .pos string
    let posStr: string;
    let posInt: number = rider.lbpos ?? (index + 1);

    if (isTerminalState) {
      posStr = status;
    } else if (isDnf) {
      posStr = typeof rider.pos === 'string' && rider.pos ? rider.pos : 'DNF';
    } else {
      // States 1-5 (RUN, PIT, IN, OUT, FIN) do NOT replace .pos string
      posStr = typeof rider.pos === 'string' && rider.pos ? rider.pos : (rider.lbpos ? String(rider.lbpos) : String(index + 1));
    }

    // Preserve existing raw string gaps if available and valid (e.g., "1 Lap", "0.238", etc.)
    let gpStr = rider.gp;
    let dfStr = rider.df;

    if (isDnf) {
      gpStr = gpStr && gpStr !== '-' ? gpStr : "-";
      dfStr = dfStr && dfStr !== '-' ? dfStr : "-";
    } else if (index === 0) {
      gpStr = gpStr && gpStr !== '-' ? gpStr : "LEADER";
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
      status,
      lbpos: posInt,
      pos: posStr,
      pCl: isDnf ? posStr : (rider.pCl && isNaN(Number(rider.pCl)) ? rider.pCl : posStr),
      gp: gpStr || "-",
      df: dfStr || "-",
      gpCl: gpStr || "-",
      dfCl: dfStr || "-"
    };
  });
}

export interface PagedRidersResult {
  displayedRiders: RiderResult[];
  currentPage: number;
  totalPages: number;
  fixedCount: number;
  windowSize: number;
  pageRangeText: string;
}

/**
 * Limits tower display to a maximum of 19 racers.
 * - Total <= 19: All racers displayed (Page 1/1, 1-N).
 * - Total 20..26: Top 15 racers fixed (1-15), remaining slots (4) windowed (Page 0: 1-19, Page 1: 1-15 & 20-23, Page 2: 1-15 & 24-N).
 * - Total > 26: Top 10 racers fixed (1-10), remaining slots (9) windowed (Page 0: 1-19, Page 1: 1-10 & 20-28, Page 2: 1-10 & 29-N).
 */
export function getPagedRiders(riders: RiderResult[], requestedPage: number = 0): PagedRidersResult {
  const total = riders.length;
  if (total <= 19) {
    return {
      displayedRiders: riders,
      currentPage: 0,
      totalPages: 1,
      fixedCount: total,
      windowSize: 0,
      pageRangeText: total > 0 ? `1-${total}` : '0',
    };
  }

  const isBetween20And26 = total <= 26;
  const fixedCount = isBetween20And26 ? 15 : 10;
  const windowSize = isBetween20And26 ? 4 : 9;

  const remainingTotal = total - fixedCount;
  const totalPages = Math.max(1, Math.ceil(remainingTotal / windowSize));
  const currentPage = Math.max(0, Math.min(requestedPage, totalPages - 1));

  const fixedRiders = riders.slice(0, fixedCount);
  const windowStart = fixedCount + currentPage * windowSize;
  const windowEnd = windowStart + windowSize;
  const windowRiders = riders.slice(windowStart, windowEnd);

  const displayedRiders = [...fixedRiders, ...windowRiders];

  let pageRangeText = '';
  if (currentPage === 0) {
    pageRangeText = `1-${Math.min(19, total)}`;
  } else {
    const winStartPos = windowStart + 1;
    const winEndPos = Math.min(windowEnd, total);
    pageRangeText = `1-${fixedCount} & ${winStartPos}-${winEndPos}`;
  }

  return {
    displayedRiders,
    currentPage,
    totalPages,
    fixedCount,
    windowSize,
    pageRangeText,
  };
}

export interface ManualRiderInput {
  nam: string;     // Rider Name
  cb?: string;     // Club/Team Name
  no: string;      // Bike/Rider Number
  tTm?: string;    // Total Time (e.g. "5:25.610")
  btTm?: string;   // Best Lap Time (e.g. "1:04.344")
  ls?: number;     // Laps completed
  cl?: string;     // Class
  sesId?: string;
  eId?: string;
}

export function createManualRider(
  input: ManualRiderInput,
  existingRiders: RiderResult[]
): RiderResult {
  const nextPos = existingRiders.length + 1;
  const posString = String(nextPos);
  const id = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    sesId: input.sesId || 'manual_session',
    eId: input.eId || 'manual_event',
    id: id,
    nam: input.nam,
    fNam: input.nam,
    no: input.no,
    dNo: input.no,
    cb: input.cb || 'Independent',
    tTm: input.tTm || '0:00.000',
    btTm: input.btTm || input.tTm || '0:00.000',
    ls: input.ls ?? 1,
    cl: input.cl || 'General',
    cln: input.cl || 'General',
    
    // Auto-calculated Position
    lbpos: nextPos,
    pos: posString,
    pCl: posString,
    
    // Default Gaps & Stats
    gp: nextPos === 1 ? 'LEADER' : '+0.000',
    df: '+0.000',
    gpCl: nextPos === 1 ? 'LEADER' : '+0.000',
    dfCl: '+0.000',
    lsTm: input.btTm || input.tTm || '0:00.000',
    
    // Custom UI States
    prevPos: nextPos,
    changeTime: Date.now(),
    changeDirection: 'steady',
    lapStatus: 'none',
  };
}
