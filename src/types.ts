/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SignalRPacket {
  target: string;
  arguments: any[];
  results?: any[];
}

export interface RiderResult {
  sesId: string;
  eId: string;
  id: string;      // Rider unique ID
  btTm?: string;   // Best Lap Time (e.g. "1:04.344")
  ibt?: boolean;   // Is Best Time (usually personal best)
  btCl?: boolean;  // Best in Class
  gp?: string;     // Gap to leader (e.g. "+0.828" or "0.828")
  df?: string;     // Difference to preceding rider (e.g. "+0.123")
  gpCl?: string;   // Gap/Diff in Class
  dfCl?: string;   //
  tTm?: string;    // Total Time (e.g. "5:25.610")
  lsTm?: string;   // Last Lap Time (e.g. "1:04.350")
  ls: number;      // Laps done (e.g. 5)
  cl: string;      // Class (e.g. "GCIC兴联杯Xinglian CUP")
  cln: string;     // Class Name
  nam: string;     // Rider Name
  fNam: string;    // Full Rider Name
  no: string;      // Rider vehicle number (e.g. "09")
  dNo: string;     // Display number
  lbpos: number;   // Leaderboard Position integer
  pCl: string;     // Position in class (string integer)
  pos: string;     // Position (string integer)
  mkr?: number;    // Marker
  anim?: number;   // LAP score or numeric representation of speed/time
  asp?: number;    // Speed / Gap parameter
  if?: boolean;    // Finished flag
  s0?: string;     // Sector 0
  cb?: string;     // Club/Team name (e.g. "兴联车队 XINGLIAN")
  
  // Custom states added for UI reactivity (or injected by simulator)
  prevPos?: number;    // Previous position for animation trigger
  changeTime?: number; // Timestamp of last position change to display flash
  changeDirection?: 'up' | 'down' | 'steady';
  lapStatus?: 'improved' | 'personal-best' | 'none'; // Lap status indicator
}

export interface RacerResult {
    id: string;
    position: number;
    riderNo: string | number;
    riderName: string;
    teamGroup: string;       // Racer's team or group (e.g. "Monster Energy Yamaha" or "Group A")
    totalTime: string;      // Total race time or gap (e.g. "23:45.123" or "+1.234s")
    bestLapTime: string;    // Best lap time (e.g. "1:28.452")
    hasFastestLap?: boolean;// Flag for fastest lap record in the session
    status?: 'FINISHED' | 'DNF' | 'DNS' | 'DSQ';
}

export interface RaceEventData {
    eventName: string;       // e.g. "GRAN PREMIO D'ITALIA OAKLEY"
    groupName: string;       // e.g. "MOTOGP - RACE RESULTS" or "GROUP 1 - FINAL"
    sessionDate: string;      // e.g. "2026-07-23"
    circuitName: string;     // e.g. "Autodromo Internazionale del Mugello"
    lapsCompleted: number;  // e.g. 23
    racers: RacerResult[];
}

export interface ControlState {
  laps?: boolean;
  time?: boolean;
  input?: boolean;
  rtmp?: boolean;
  best?: boolean;
  gap?: boolean;
  diff?: boolean;
  ltg?: boolean;
  video?: boolean;
  [key: string]: boolean | undefined;
}

