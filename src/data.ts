/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RiderResult, SignalRPacket } from './types';

// The exact results from the prompt, supplemented with more grid racers
export const INITIAL_RIDERS: RiderResult[] = [
  {
    sesId: "27E4F85A3EEBD7C5-2147484204-1073743589",
    eId: "27E4F85A3EEBD7C5-2147484204",
    id: "136",
    btTm: "1:04.344",
    ibt: true,
    btCl: true,
    tTm: "5:25.610",
    lsTm: "1:04.350",
    ls: 5,
    cl: "GCIC兴联杯Xinglian CUP",
    cln: "GCIC兴联杯Xinglian CUP",
    nam: "廖梓旭",
    fNam: "廖梓旭",
    no: "09",
    dNo: "09",
    lbpos: 1,
    pCl: "1",
    pos: "1",
    mkr: 1,
    anim: 643.44,
    asp: 0,
    if: false,
    s0: "22.037",
    cb: "兴联车队 XINGLIAN"
  },
  {
    sesId: "27E4F85A3EEBD7C5-2147484204-1073743589",
    eId: "27E4F85A3EEBD7C5-2147484204",
    id: "134",
    btTm: "1:04.571",
    ibt: false,
    btCl: false,
    gp: "+0.828",
    df: "+0.828",
    gpCl: "+0.828",
    dfCl: "+0.828",
    tTm: "5:26.438",
    lsTm: "1:04.928",
    ls: 5,
    cl: "GCIC兴联杯Xinglian CUP",
    cln: "GCIC兴联杯Xinglian CUP",
    nam: "謝佳晋",
    fNam: "謝佳晋",
    no: "05",
    dNo: "05",
    lbpos: 2,
    pCl: "2",
    pos: "2",
    mkr: 1,
    anim: 645.71,
    asp: 0,
    if: false,
    s0: "22.307",
    cb: "兴联车队 XINGLIAN"
  },
  {
    sesId: "27E4F85A3EEBD7C5-2147484204-1073743589",
    eId: "27E4F85A3EEBD7C5-2147484204",
    id: "142",
    btTm: "1:04.812",
    ibt: false,
    btCl: false,
    gp: "+1.921",
    df: "+1.093",
    gpCl: "+1.921",
    dfCl: "+1.093",
    tTm: "5:27.531",
    lsTm: "1:04.890",
    ls: 5,
    cl: "GCIC兴联杯Xinglian CUP",
    cln: "GCIC兴联杯Xinglian CUP",
    nam: "张晓鹏",
    fNam: "张晓鹏",
    no: "88",
    dNo: "88",
    lbpos: 3,
    pCl: "3",
    pos: "3",
    mkr: 1,
    anim: 648.12,
    asp: 0,
    if: false,
    s0: "22.411",
    cb: "极速赛车车队 SPEED"
  },
  {
    sesId: "27E4F85A3EEBD7C5-2147484204-1073743589",
    eId: "27E4F85A3EEBD7C5-2147484204",
    id: "151",
    btTm: "1:05.109",
    ibt: false,
    btCl: false,
    gp: "+3.141",
    df: "+1.220",
    gpCl: "+3.141",
    dfCl: "+1.220",
    tTm: "5:28.751",
    lsTm: "1:05.241",
    ls: 5,
    cl: "GCIC兴联杯Xinglian CUP",
    cln: "GCIC兴联杯Xinglian CUP",
    nam: "陈浩然",
    fNam: "陈浩然",
    no: "27",
    dNo: "27",
    lbpos: 4,
    pCl: "4",
    pos: "4",
    mkr: 1,
    anim: 651.09,
    asp: 0,
    if: false,
    s0: "22.580",
    cb: "风之子车队 WIND"
  },
  {
    sesId: "27E4F85A3EEBD7C5-2147484204-1073743589",
    eId: "27E4F85A3EEBD7C5-2147484204",
    id: "123",
    btTm: "1:05.418",
    ibt: false,
    btCl: false,
    gp: "+4.615",
    df: "+1.474",
    gpCl: "+4.615",
    dfCl: "+1.474",
    tTm: "5:30.225",
    lsTm: "1:05.990",
    ls: 5,
    cl: "GCIC兴联杯Xinglian CUP",
    cln: "GCIC兴联杯Xinglian CUP",
    nam: "郭嘉铭",
    fNam: "郭嘉铭",
    no: "71",
    dNo: "71",
    lbpos: 5,
    pCl: "5",
    pos: "5",
    mkr: 1,
    anim: 654.18,
    asp: 0,
    if: false,
    s0: "22.712",
    cb: "极速赛车车队 SPEED"
  },
  {
    sesId: "27E4F85A3EEBD7C5-2147484204-1073743589",
    eId: "27E4F85A3EEBD7C5-2147484204",
    id: "160",
    btTm: "1:05.790",
    ibt: false,
    btCl: false,
    gp: "+5.998",
    df: "+1.383",
    gpCl: "+5.998",
    dfCl: "+1.383",
    tTm: "5:31.608",
    lsTm: "1:05.810",
    ls: 5,
    cl: "GCIC兴联杯Xinglian CUP",
    cln: "GCIC兴联杯Xinglian CUP",
    nam: "李伟捷",
    fNam: "李伟捷",
    no: "23",
    dNo: "23",
    lbpos: 6,
    pCl: "6",
    pos: "6",
    mkr: 1,
    anim: 657.90,
    asp: 0,
    if: false,
    s0: "22.910",
    cb: "兴联车队 XINGLIAN"
  },
  {
    sesId: "27E4F85A3EEBD7C5-2147484204-1073743589",
    eId: "27E4F85A3EEBD7C5-2147484204",
    id: "111",
    btTm: "1:06.120",
    ibt: false,
    btCl: false,
    gp: "+7.545",
    df: "+1.547",
    gpCl: "+7.545",
    dfCl: "+1.547",
    tTm: "5:33.155",
    lsTm: "1:06.210",
    ls: 5,
    cl: "GCIC兴联杯Xinglian CUP",
    cln: "GCIC兴联杯Xinglian CUP",
    nam: "曾子健",
    fNam: "曾子健",
    no: "17",
    dNo: "17",
    lbpos: 7,
    pCl: "7",
    pos: "7",
    mkr: 1,
    anim: 661.20,
    asp: 0,
    if: false,
    s0: "23.111",
    cb: "雷力赛车队 POWER"
  },
  {
    sesId: "27E4F85A3EEBD7C5-2147484204-1073743589",
    eId: "27E4F85A3EEBD7C5-2147484204",
    id: "115",
    btTm: "1:06.452",
    ibt: false,
    btCl: false,
    gp: "+9.012",
    df: "+1.467",
    gpCl: "+9.012",
    dfCl: "+1.467",
    tTm: "5:34.622",
    lsTm: "1:06.890",
    ls: 5,
    cl: "GCIC兴联杯Xinglian CUP",
    cln: "GCIC兴联杯Xinglian CUP",
    nam: "王博涛",
    fNam: "王博涛",
    no: "12",
    dNo: "12",
    lbpos: 8,
    pCl: "8",
    pos: "8",
    mkr: 1,
    anim: 664.52,
    asp: 0,
    if: false,
    s0: "23.321",
    cb: "飓风车队 HURRICANE"
  }
];

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
    
    let gpStr = "";
    let dfStr = "";
    
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
    
    return {
      ...rider,
      lbpos: posInt,
      pos: posStr,
      pCl: posStr,
      gp: gpStr,
      df: dfStr,
      gpCl: gpStr,
      dfCl: dfStr
    };
  });
}
