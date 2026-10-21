import { GeocodingResult, OpenMeteoWeatherResponse, WeatherState } from './types';

export interface WmoWeatherInfo {
  code: number;
  label: string;
  shortLabel: string;
  iconName: string; // Weather icon identifier
  conditionGroup: 'clear' | 'clouds' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'showers' | 'thunder';
}

/**
 * WMO Weather interpretation codes (WW)
 * 0: Clear sky
 * 1, 2, 3: Mainly clear, partly cloudy, and overcast
 * 45, 48: Fog and depositing rime fog
 * 51, 53, 55: Drizzle: Light, moderate, and dense intensity
 * 61, 63, 65: Rain: Slight, moderate and heavy intensity
 * 71, 73, 75: Snow fall: Slight, moderate, and heavy intensity
 * 80, 81, 82: Rain showers: Slight, moderate, and violent
 * 95: Thunderstorm: Slight or moderate
 * 96, 99: Thunderstorm with slight and heavy hail
 */
export function getWmoWeatherInfo(code: number): WmoWeatherInfo {
  switch (code) {
    case 0:
      return { code, label: 'Clear sky', shortLabel: 'CLEAR', iconName: 'clear', conditionGroup: 'clear' };
    case 1:
      return { code, label: 'Mainly clear', shortLabel: 'M.CLEAR', iconName: 'mainly_clear', conditionGroup: 'clear' };
    case 2:
      return { code, label: 'Partly cloudy', shortLabel: 'P.CLOUDY', iconName: 'partly_cloudy', conditionGroup: 'clouds' };
    case 3:
      return { code, label: 'Overcast', shortLabel: 'OVERCAST', iconName: 'overcast', conditionGroup: 'clouds' };
    case 45:
      return { code, label: 'Fog', shortLabel: 'FOG', iconName: 'fog', conditionGroup: 'fog' };
    case 48:
      return { code, label: 'Depositing rime fog', shortLabel: 'RIME FOG', iconName: 'fog', conditionGroup: 'fog' };
    case 51:
      return { code, label: 'Light drizzle', shortLabel: 'L.DRIZZLE', iconName: 'drizzle', conditionGroup: 'drizzle' };
    case 53:
      return { code, label: 'Moderate drizzle', shortLabel: 'M.DRIZZLE', iconName: 'drizzle', conditionGroup: 'drizzle' };
    case 55:
      return { code, label: 'Dense drizzle', shortLabel: 'D.DRIZZLE', iconName: 'drizzle', conditionGroup: 'drizzle' };
    case 61:
      return { code, label: 'Slight rain', shortLabel: 'S.RAIN', iconName: 'rain', conditionGroup: 'rain' };
    case 63:
      return { code, label: 'Moderate rain', shortLabel: 'M.RAIN', iconName: 'rain', conditionGroup: 'rain' };
    case 65:
      return { code, label: 'Heavy rain', shortLabel: 'H.RAIN', iconName: 'rain', conditionGroup: 'rain' };
    case 71:
      return { code, label: 'Slight snowfall', shortLabel: 'S.SNOW', iconName: 'snow', conditionGroup: 'snow' };
    case 73:
      return { code, label: 'Moderate snowfall', shortLabel: 'M.SNOW', iconName: 'snow', conditionGroup: 'snow' };
    case 75:
      return { code, label: 'Heavy snowfall', shortLabel: 'H.SNOW', iconName: 'snow', conditionGroup: 'snow' };
    case 80:
      return { code, label: 'Slight rain showers', shortLabel: 'S.SHOWER', iconName: 'showers', conditionGroup: 'showers' };
    case 81:
      return { code, label: 'Moderate rain showers', shortLabel: 'M.SHOWER', iconName: 'showers', conditionGroup: 'showers' };
    case 82:
      return { code, label: 'Violent rain showers', shortLabel: 'V.SHOWER', iconName: 'showers', conditionGroup: 'showers' };
    case 95:
      return { code, label: 'Thunderstorm', shortLabel: 'THUNDER', iconName: 'thunder', conditionGroup: 'thunder' };
    case 96:
      return { code, label: 'Thunderstorm with hail', shortLabel: 'THUNDER+HAIL', iconName: 'thunder_hail', conditionGroup: 'thunder' };
    case 99:
      return { code, label: 'Heavy thunderstorm with hail', shortLabel: 'H.THUNDER+HAIL', iconName: 'thunder_hail', conditionGroup: 'thunder' };
    default:
      return { code, label: 'Cloudy', shortLabel: 'CLOUDY', iconName: 'partly_cloudy', conditionGroup: 'clouds' };
  }
}

/**
 * Convert wind degree (0-360) into standard 16-point compass direction
 */
export function getWindDirectionCompass(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16;
  return directions[index];
}

/**
 * Search regions via Open-Meteo Geocoding API
 */
export async function searchGeocoding(regionName: string): Promise<GeocodingResult[]> {
  const trimmed = regionName.trim();
  if (!trimmed) return [];

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=5&language=id&countryCode=ID`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geocoding search failed: ${response.statusText}`);
  }
  const data = await response.json();
  return Array.isArray(data.results) ? data.results : [];
}

/**
 * Fetch detailed weather forecast via Open-Meteo Weather API
 */
export async function fetchWeatherForecast(latitude: number, longitude: number): Promise<OpenMeteoWeatherResponse> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset&forecast_days=1&timezone=Asia%2FJakarta`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather fetch failed: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Initial fallback weather state for Cigugur, Jawa Barat
 */
export const INITIAL_WEATHER_STATE: WeatherState = {
  visible: false,
  mode: 'simple',
  regionName: 'Cigugur',
  regionAdmin: 'Jawa Barat',
  latitude: -6.9675527,
  longitude: 108.4777732,
  weatherData: {
    latitude: -6.994727,
    longitude: 108.45569,
    generationtime_ms: 0.25,
    utc_offset_seconds: 25200,
    timezone: 'Asia/Jakarta',
    timezone_abbreviation: 'GMT+7',
    elevation: 614,
    current_units: {
      time: 'iso8601',
      interval: 'seconds',
      temperature_2m: '°C',
      relative_humidity_2m: '%',
      apparent_temperature: '°C',
      is_day: '',
      precipitation: 'mm',
      rain: 'mm',
      showers: 'mm',
      weather_code: 'wmo code',
      cloud_cover: '%',
      wind_speed_10m: 'km/h',
      wind_direction_10m: '°'
    },
    current: {
      time: '2026-10-21T12:00',
      interval: 900,
      temperature_2m: 24.5,
      relative_humidity_2m: 82,
      apparent_temperature: 25.8,
      is_day: 1,
      precipitation: 0,
      rain: 0,
      showers: 0,
      weather_code: 2,
      cloud_cover: 35,
      wind_speed_10m: 11.2,
      wind_direction_10m: 240
    },
    hourly_units: {
      time: 'iso8601',
      temperature_2m: '°C',
      relative_humidity_2m: '%',
      precipitation_probability: '%',
      precipitation: 'mm',
      weather_code: 'wmo code'
    },
    hourly: {
      time: [
        '2026-10-21T00:00', '2026-10-21T01:00', '2026-10-21T02:00', '2026-10-21T03:00',
        '2026-10-21T04:00', '2026-10-21T05:00', '2026-10-21T06:00', '2026-10-21T07:00',
        '2026-10-21T08:00', '2026-10-21T09:00', '2026-10-21T10:00', '2026-10-21T11:00',
        '2026-10-21T12:00', '2026-10-21T13:00', '2026-10-21T14:00', '2026-10-21T15:00',
        '2026-10-21T16:00', '2026-10-21T17:00', '2026-10-21T18:00', '2026-10-21T19:00',
        '2026-10-21T20:00', '2026-10-21T21:00', '2026-10-21T22:00', '2026-10-21T23:00'
      ],
      temperature_2m: [
        21.1, 21.0, 20.9, 20.8, 20.7, 20.6, 21.1, 22.6, 23.2, 24.7, 26.0, 27.2,
        27.8, 29.1, 28.7, 26.5, 26.1, 24.9, 23.4, 22.2, 21.4, 21.2, 21.2, 21.2
      ],
      relative_humidity_2m: [
        95, 95, 95, 94, 94, 96, 95, 90, 88, 81, 74, 69,
        66, 56, 56, 71, 73, 77, 86, 94, 97, 94, 91, 90
      ],
      precipitation_probability: [
        0, 0, 0, 0, 0, 0, 0, 0, 6, 14, 25, 40,
        57, 71, 83, 93, 90, 65, 29, 2, 0, 0, 0, 0
      ],
      precipitation: [
        0, 0, 0, 0, 0, 0, 0, 0, 0.1, 0.2, 0.3, 0.1,
        0.1, 0.1, 0.2, 0.6, 0, 0, 0, 0, 0, 0, 0, 0
      ],
      weather_code: [
        45, 45, 3, 3, 2, 45, 45, 45, 51, 51, 51, 51,
        51, 51, 51, 53, 1, 1, 2, 3, 45, 45, 1, 1
      ]
    },
    daily_units: {
      time: 'iso8601',
      weather_code: 'wmo code',
      temperature_2m_max: '°C',
      temperature_2m_min: '°C',
      precipitation_sum: 'mm',
      precipitation_probability_max: '%',
      sunrise: 'iso8601',
      sunset: 'iso8601'
    },
    daily: {
      time: ['2026-10-21'],
      weather_code: [2],
      temperature_2m_max: [29.1],
      temperature_2m_min: [20.6],
      precipitation_sum: [1.7],
      precipitation_probability_max: [93],
      sunrise: ['2026-10-21T05:22'],
      sunset: ['2026-10-21T17:39']
    }
  },
  lastUpdated: new Date().toLocaleTimeString()
};
