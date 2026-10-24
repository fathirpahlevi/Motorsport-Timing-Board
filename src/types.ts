/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SignalRPacket {
  target: string;
  arguments: any[];
  results?: any[];
}

export type RacerStatus =
  | 'RUN'
  | 'PIT'
  | 'IN'
  | 'OUT'
  | 'FIN'
  | 'DNF'
  | 'DNS'
  | 'DSQ'
  | 'DNQ'
  | 'Ret'
  | 'NC';

export const RACER_STATUS_OPTIONS: RacerStatus[] = [
  'RUN',
  'PIT',
  'IN',
  'OUT',
  'FIN',
  'DNF',
  'DNS',
  'DSQ',
  'DNQ',
  'Ret',
  'NC',
];

export interface RiderManualOverride {
  nam?: string;
  cb?: string;
  no?: string;
  status?: RacerStatus;
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
  fNam?: string;    // Full Rider Name
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
  s1?: string;     // Sector 1
  s2?: string;     // Sector 2
  cb?: string;     // Club/Team name (e.g. "兴联车队 XINGLIAN")
  nat?: string;
  mk?: string;
  status?: RacerStatus; // 11 Racer States (RUN, PIT, IN, OUT, FIN, DNF, DNS, DSQ, DNQ, Ret, NC)
  
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
  racerLap?: boolean;
  lastLap?: boolean;
  timingMode?: 'lapCount' | 'lastLap' | 'gap' | 'interval' | 'bestTime';
  timingVisible?: boolean;
  sidePositionPage?: number;
  [key: string]: boolean | string | number | undefined;
}

export interface LowerThirdState {
  visible: boolean;
  position: 'left' | 'center' | 'right';
  selectedRiderIds: string[];
}

export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  feature_code?: string;
  country_code?: string;
  admin1?: string;
  admin2?: string;
  country?: string;
  timezone?: string;
  [key: string]: any;
}

export interface OpenMeteoWeatherResponse {
  latitude: number;
  longitude: number;
  generationtime_ms?: number;
  utc_offset_seconds?: number;
  timezone?: string;
  timezone_abbreviation?: string;
  elevation?: number;
  current_units?: Record<string, string>;
  current?: {
    time: string;
    interval?: number;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    rain: number;
    showers: number;
    weather_code: number;
    cloud_cover: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    [key: string]: any;
  };
  hourly_units?: Record<string, string>;
  hourly?: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    [key: string]: any;
  };
  daily_units?: Record<string, string>;
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    sunrise: string[];
    sunset: string[];
    [key: string]: any;
  };
  [key: string]: any;
}

export interface WeatherState {
  visible: boolean;
  mode: 'simple' | 'detailed';
  regionName: string;
  regionAdmin: string;
  latitude: number;
  longitude: number;
  weatherData: OpenMeteoWeatherResponse | null;
  lastUpdated?: string;
}

