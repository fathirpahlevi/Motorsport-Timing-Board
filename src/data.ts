/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RiderResult, SignalRPacket } from './types';

// The exact results from the prompt, supplemented with more grid racers
export const INITIAL_RIDERS: RiderResult[] = [{
    sesId: "ses_ycr1_ycr2_expert_novice",
    eId: "event_ycr_final",
    id: "r_84",
    no: "84",
    dNo: "84",
    nam: "M ALDY MUSFIQ FUADI",
    fNam: "M ALDY MUSFIQ FUADI",
    cb: "PAPABE BKK X BOS CINO",
    cl: "YCR1 & YCR2-MX KING 150cc TU MIX EXPERT & NOVICE",
    cln: "MX KING 150cc TU MIX EXPERT & NOVICE",
    lbpos: 1,
    pos: "1",
    pCl: "1",
    btTm: "46.381",
    ibt: true,
    btCl: true,
    tTm: "00:00.000",
    lsTm: "46.381",
    ls: 0,
    gp: "LEADER",
    df: "-",
    gpCl: "LEADER",
    dfCl: "-",
    prevPos: 1,
    changeTime: Date.now(),
    changeDirection: "steady",
    lapStatus: "none"
  },
  {
    sesId: "ses_ycr1_ycr2_expert_novice",
    eId: "event_ycr_final",
    id: "r_97",
    no: "97",
    dNo: "97",
    nam: "RENGGI LUKMANA",
    fNam: "RENGGI LUKMANA",
    cb: "YAMAHA YAMALUBE LFN HP969 RACING TEAM",
    cl: "YCR1 & YCR2-MX KING 150cc TU MIX EXPERT & NOVICE",
    cln: "MX KING 150cc TU MIX EXPERT & NOVICE",
    lbpos: 2,
    pos: "2",
    pCl: "2",
    btTm: "46.579",
    tTm: "00:00.000",
    lsTm: "46.579",
    ls: 0,
    gp: "+0.198",
    df: "+0.198",
    gpCl: "+0.198",
    dfCl: "+0.198",
    prevPos: 2,
    changeTime: Date.now(),
    changeDirection: "steady",
    lapStatus: "none"
  },
  {
    sesId: "ses_ycr1_ycr2_expert_novice",
    eId: "event_ycr_final",
    id: "r_157",
    no: "157",
    dNo: "157",
    nam: "KEVINO HANDSKY",
    fNam: "KEVINO HANDSKY",
    cb: "YOUNGKING X AYAH GROUP RT",
    cl: "YCR1 & YCR2-MX KING 150cc TU MIX EXPERT & NOVICE",
    cln: "MX KING 150cc TU MIX EXPERT & NOVICE",
    lbpos: 3,
    pos: "3",
    pCl: "3",
    btTm: "46.853",
    tTm: "00:00.000",
    lsTm: "46.853",
    ls: 0,
    gp: "+0.472",
    df: "+0.274",
    gpCl: "+0.472",
    dfCl: "+0.274",
    prevPos: 3,
    changeTime: Date.now(),
    changeDirection: "steady",
    lapStatus: "none"
  },
  {
    sesId: "ses_ycr1_ycr2_expert_novice",
    eId: "event_ycr_final",
    id: "r_145",
    no: "145",
    dNo: "145",
    nam: "DANIAL DAMAR",
    fNam: "DANIAL DAMAR",
    cb: "YAMAHA YAMALUBE LFN HP969 RACING TEAM",
    cl: "YCR1 & YCR2-MX KING 150cc TU MIX EXPERT & NOVICE",
    cln: "MX KING 150cc TU MIX EXPERT & NOVICE",
    lbpos: 4,
    pos: "4",
    pCl: "4",
    btTm: "46.909",
    tTm: "00:00.000",
    lsTm: "46.909",
    ls: 0,
    gp: "+0.528",
    df: "+0.056",
    gpCl: "+0.528",
    dfCl: "+0.056",
    prevPos: 4,
    changeTime: Date.now(),
    changeDirection: "steady",
    lapStatus: "none"
  },
  {
    sesId: "ses_ycr1_ycr2_expert_novice",
    eId: "event_ycr_final",
    id: "r_5",
    no: "5",
    dNo: "05",
    nam: "AHMAD VHILY NASUTION",
    fNam: "AHMAD VHILY NASUTION",
    cb: "KIRANA PHOTIDO BMK 28 DRAGON RACING TEAM",
    cl: "YCR1 & YCR2-MX KING 150cc TU MIX EXPERT & NOVICE",
    cln: "MX KING 150cc TU MIX EXPERT & NOVICE",
    lbpos: 5,
    pos: "5",
    pCl: "5",
    btTm: "47.019",
    tTm: "00:00.000",
    lsTm: "47.019",
    ls: 0,
    gp: "+0.638",
    df: "+0.110",
    gpCl: "+0.638",
    dfCl: "+0.110",
    prevPos: 5,
    changeTime: Date.now(),
    changeDirection: "steady",
    lapStatus: "none"
  },
  {
    sesId: "ses_ycr1_ycr2_expert_novice",
    eId: "event_ycr_final",
    id: "r_44",
    no: "44",
    dNo: "44",
    nam: "M ZACKY RAMADHAN",
    fNam: "M ZACKY RAMADHAN",
    cb: "BM31 PERMATA RENO KENZIE 22",
    cl: "YCR1 & YCR2-MX KING 150cc TU MIX EXPERT & NOVICE",
    cln: "MX KING 150cc TU MIX EXPERT & NOVICE",
    lbpos: 6,
    pos: "6",
    pCl: "6",
    btTm: "47.895",
    tTm: "00:00.000",
    lsTm: "47.895",
    ls: 0,
    gp: "+1.514",
    df: "+0.876",
    gpCl: "+1.514",
    dfCl: "+0.876",
    prevPos: 6,
    changeTime: Date.now(),
    changeDirection: "steady",
    lapStatus: "none"
  },
  {
    sesId: "ses_ycr1_ycr2_expert_novice",
    eId: "event_ycr_final",
    id: "r_24",
    no: "24",
    dNo: "24",
    nam: "ALVI NOVRIANDO",
    fNam: "ALVI NOVRIANDO",
    cb: "A21 KITA KOIZUMI TRASTAR RACING TEAM",
    cl: "YCR1 & YCR2-MX KING 150cc TU MIX EXPERT & NOVICE",
    cln: "MX KING 150cc TU MIX EXPERT & NOVICE",
    lbpos: 7,
    pos: "7",
    pCl: "7",
    btTm: "48.273",
    tTm: "00:00.000",
    lsTm: "48.273",
    ls: 0,
    gp: "+1.892",
    df: "+0.378",
    gpCl: "+1.892",
    dfCl: "+0.378",
    prevPos: 7,
    changeTime: Date.now(),
    changeDirection: "steady",
    lapStatus: "none"
  },
  {
    sesId: "ses_ycr1_ycr2_expert_novice",
    eId: "event_ycr_final",
    id: "r_179",
    no: "179",
    dNo: "179",
    nam: "RAMA SR",
    fNam: "RAMA SR",
    cb: "INDEPENDENT",
    cl: "YCR1 & YCR2-MX KING 150cc TU MIX EXPERT & NOVICE",
    cln: "MX KING 150cc TU MIX EXPERT & NOVICE",
    lbpos: 8,
    pos: "8",
    pCl: "8",
    btTm: "48.452",
    tTm: "00:00.000",
    lsTm: "48.452",
    ls: 0,
    gp: "+2.071",
    df: "+0.179",
    gpCl: "+2.071",
    dfCl: "+0.179",
    prevPos: 8,
    changeTime: Date.now(),
    changeDirection: "steady",
    lapStatus: "none"
  },
  {
    sesId: "ses_ycr1_ycr2_expert_novice",
    eId: "event_ycr_final",
    id: "r_212",
    no: "212",
    dNo: "212",
    nam: "REO MANURUNG",
    fNam: "REO MANURUNG",
    cb: "KIRANA PHOTIDO BMK 28 DRAGON RACING TEAM",
    cl: "YCR1 & YCR2-MX KING 150cc TU MIX EXPERT & NOVICE",
    cln: "MX KING 150cc TU MIX EXPERT & NOVICE",
    lbpos: 9,
    pos: "9",
    pCl: "9",
    btTm: "48.922",
    tTm: "00:00.000",
    lsTm: "48.922",
    ls: 0,
    gp: "+2.541",
    df: "+0.470",
    gpCl: "+2.541",
    dfCl: "+0.470",
    prevPos: 9,
    changeTime: Date.now(),
    changeDirection: "steady",
    lapStatus: "none"
  },
  {
    sesId: "ses_ycr1_ycr2_expert_novice",
    eId: "event_ycr_final",
    id: "r_189",
    no: "189",
    dNo: "189",
    nam: "IKHSAN ALFARIZY",
    fNam: "IKHSAN ALFARIZY",
    cb: "PAPABE BKK X BOS CINO",
    cl: "YCR1 & YCR2-MX KING 150cc TU MIX EXPERT & NOVICE",
    cln: "MX KING 150cc TU MIX EXPERT & NOVICE",
    lbpos: 10,
    pos: "10",
    pCl: "10",
    btTm: "48.965",
    tTm: "00:00.000",
    lsTm: "48.965",
    ls: 0,
    gp: "+2.584",
    df: "+0.043",
    gpCl: "+2.584",
    dfCl: "+0.043",
    prevPos: 10,
    changeTime: Date.now(),
    changeDirection: "steady",
    lapStatus: "none"
  },
  {
    sesId: "ses_ycr1_ycr2_expert_novice",
    eId: "event_ycr_final",
    id: "r_27",
    no: "27",
    dNo: "27",
    nam: "ALESTIYA FERO AKBAR",
    fNam: "ALESTIYA FERO AKBAR",
    cb: "PAPABE BKK X BOS CINO",
    cl: "YCR1 & YCR2-MX KING 150cc TU MIX EXPERT & NOVICE",
    cln: "MX KING 150cc TU MIX EXPERT & NOVICE",
    lbpos: 11,
    pos: "11",
    pCl: "11",
    btTm: "50.453",
    tTm: "00:00.000",
    lsTm: "50.453",
    ls: 0,
    gp: "+4.072",
    df: "+1.488",
    gpCl: "+4.072",
    dfCl: "+1.488",
    prevPos: 11,
    changeTime: Date.now(),
    changeDirection: "steady",
    lapStatus: "none"
  },
  {
    sesId: "ses_ycr1_ycr2_expert_novice",
    eId: "event_ycr_final",
    id: "r_21",
    no: "21",
    dNo: "21",
    nam: "M NABIL ARDIANSYAH",
    fNam: "M NABIL ARDIANSYAH",
    cb: "A21 KITA KOIZUMI TRASTAR RACING TEAM",
    cl: "YCR1 & YCR2-MX KING 150cc TU MIX EXPERT & NOVICE",
    cln: "MX KING 150cc TU MIX EXPERT & NOVICE",
    lbpos: 12,
    pos: "12",
    pCl: "12",
    btTm: "51.986",
    tTm: "00:00.000",
    lsTm: "51.986",
    ls: 0,
    gp: "+5.605",
    df: "+1.533",
    gpCl: "+5.605",
    dfCl: "+1.533",
    prevPos: 12,
    changeTime: Date.now(),
    changeDirection: "steady",
    lapStatus: "none"
  }];

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
