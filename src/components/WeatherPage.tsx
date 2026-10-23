import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, 
  Moon, 
  CloudSun, 
  CloudMoon, 
  Cloud, 
  CloudRain, 
  CloudDrizzle, 
  CloudLightning, 
  CloudFog, 
  CloudSnow, 
  Wind, 
  Droplets
} from 'lucide-react';
import { WeatherState } from '../types';
import { getWmoWeatherInfo, getWindDirectionCompass, INITIAL_WEATHER_STATE } from '../weatherData';

interface WeatherPageProps {
  weatherState?: WeatherState;
  socket?: WebSocket | null;
}

function WeatherSymbol({ code, isDay = 1, className = "w-10 h-10" }: { code: number; isDay?: number; className?: string }) {
  const info = getWmoWeatherInfo(code);
  const dayTime = isDay !== 0;

  switch (info.conditionGroup) {
    case 'clear':
      return dayTime ? <Sun className={className} strokeWidth={1.8} /> : <Moon className={className} strokeWidth={1.8} />;
    case 'clouds':
      if (code === 1 || code === 2) {
        return dayTime ? <CloudSun className={className} strokeWidth={1.8} /> : <CloudMoon className={className} strokeWidth={1.8} />;
      }
      return <Cloud className={className} strokeWidth={1.8} />;
    case 'fog':
      return <CloudFog className={className} strokeWidth={1.8} />;
    case 'drizzle':
      return <CloudDrizzle className={className} strokeWidth={1.8} />;
    case 'rain':
    case 'showers':
      return <CloudRain className={className} strokeWidth={1.8} />;
    case 'snow':
      return <CloudSnow className={className} strokeWidth={1.8} />;
    case 'thunder':
      return <CloudLightning className={className} strokeWidth={1.8} />;
    default:
      return <Cloud className={className} strokeWidth={1.8} />;
  }
}

export const WeatherPage: React.FC<WeatherPageProps> = ({ weatherState = INITIAL_WEATHER_STATE }) => {
  const isVisible = weatherState?.visible ?? false;
  const mode = weatherState?.mode ?? 'simple';
  const regionName = weatherState?.regionName || 'Cigugur';
  const regionAdmin = weatherState?.regionAdmin || 'Jawa Barat';
  const weatherData = weatherState?.weatherData;
  const current = weatherData?.current;
  const daily = weatherData?.daily;

  const wCode = current?.weather_code ?? 0;
  const weatherInfo = getWmoWeatherInfo(wCode);
  const temp = typeof current?.temperature_2m === 'number' ? current.temperature_2m.toFixed(1) : '--';
  const apparentTemp = typeof current?.apparent_temperature === 'number' ? current.apparent_temperature.toFixed(1) : '--';
  const humidity = current?.relative_humidity_2m ?? '--';
  const windSpeed = typeof current?.wind_speed_10m === 'number' ? current.wind_speed_10m.toFixed(1) : '--';
  const windDirDeg = current?.wind_direction_10m ?? 0;
  const windCompass = getWindDirectionCompass(windDirDeg);
  const rain = typeof current?.rain === 'number' ? current.rain.toFixed(1) : (current?.precipitation?.toFixed(1) ?? '0.0');
  const cloudCover = current?.cloud_cover ?? '--';
  const isDay = current?.is_day ?? 1;

  const tempMin = daily?.temperature_2m_min?.[0] !== undefined ? daily.temperature_2m_min[0].toFixed(1) : '--';
  const tempMax = daily?.temperature_2m_max?.[0] !== undefined ? daily.temperature_2m_max[0].toFixed(1) : '--';
  const precipProbMax = daily?.precipitation_probability_max?.[0] ?? '--';
  const sunriseTime = daily?.sunrise?.[0] ? daily.sunrise[0].split('T')[1] : '--:--';
  const sunsetTime = daily?.sunset?.[0] ? daily.sunset[0].split('T')[1] : '--:--';

  return (
    <div className="fixed inset-0 pointer-events-none bg-transparent overflow-hidden select-none font-sans">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            key="weather-broadcast-square"
            initial={{ x: -380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -380, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            className={`pointer-events-auto fixed left-8 top-1/2 -translate-y-1/2 w-80 ${mode === 'simple' ? '' : 'h-50'} bg-zinc-950/92 backdrop-blur-md border border-zinc-700/75 shadow-2xl rounded-sm p-2 flex flex-col justify-between text-zinc-100`}
          >
            {/* Header: Location & Status */}
            <div className="border-b border-zinc-800 pb-0 flex items-start justify-between">
              <div className="min-w-0 pr-2 gap-1 flex flex-col">
                <div className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase font-semibold">
                  LOCAL WEATHER
                </div>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[14px] font-black tracking-wide text-zinc-50 uppercase leading-tight">
                    {regionName}
                  </p>
                  <span className="text-zinc-500">|</span>
                  <p className="text-[13px] font-medium text-zinc-400 truncate">
                    {regionAdmin}
                  </p>
                </div>
              </div>
              {/* <div className="flex flex-col items-end shrink-0 pt-0.5">
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded border border-zinc-700 uppercase tracking-wider">
                  {mode === 'simple' ? 'LIVE' : 'METRICS'}
                </span>
                <span className="text-[9px] font-mono text-zinc-500 mt-1">
                  {current?.time ? current.time.split('T')[1] : ''}
                </span>
              </div> */}
            </div>

            {/* Mode: Simple (3-5 key data points with clean symbols & neutral aesthetic) */}
            {mode === 'simple' ? (
              <div className="flex-1 flex flex-col justify-center pt-1 space-y-0">
                {/* Main Temperature and Icon */}
                <div className="flex items-center justify-between px-1">
                  <div>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-4xl font-black tracking-tighter text-white font-mono">
                        {temp}
                      </span>
                      <span className="text-lg font-semibold text-zinc-400">°C</span>
                    </div>
                    {/* Condition text */}
                    <div className="px-1">
                      <div className="text-xs font-semibold tracking-wider uppercase text-zinc-300 font-mono">
                        {weatherInfo.label}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-200">
                    <WeatherSymbol code={wCode} isDay={isDay} className="w-9 h-9" />
                  </div>
                    {/* Wind */}
                  <div className="bg-zinc-900/90 border border-zinc-800/70 rounded p-1.5 flex flex-col items-center text-center">
                    <div className="flex items-center space-x-1 text-zinc-400 mb-0.5">
                      <Wind className="w-3.5 h-3.5" />
                      <span className="text-[9px]">WIND</span>
                    </div>
                    <span className="font-bold text-zinc-200 text-[11px] leading-tight truncate w-full">
                      {windSpeed} <span className="text-[9px] font-normal text-zinc-400">km/h</span>
                    </span>
                    <span className="text-[10px] text-zinc-400 font-semibold">{windCompass}</span>
                  </div>
                  
                  <div className="bg-zinc-900/90 border pb-5 border-zinc-800/70 rounded p-1.5 flex flex-col items-center text-center">
                    <div className="flex items-center space-x-1 text-zinc-400 mb-0.5">
                      <CloudRain className="w-3.5 h-3.5" />
                      <span className="text-[9px]">RAIN</span>
                    </div>
                    <span className="font-bold text-zinc-200 text-[11px] leading-tight">
                      {precipProbMax}%
                    </span>
                  </div>
                </div>

                {/* 3-5 Metrics Grid with Icons */}
                {/* <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-zinc-800/80 text-[11px] font-mono">
          
                  <div className="bg-zinc-900/90 border border-zinc-800/70 rounded p-1.5 flex flex-col items-center text-center">
                    <div className="flex items-center space-x-1 text-zinc-400 mb-0.5">
                      <Droplets className="w-3.5 h-3.5" />
                      <span className="text-[9px]">HUM</span>
                    </div>
                    <span className="font-bold text-zinc-200 text-[11px] leading-tight">
                      {humidity}%
                    </span>
                    <span className="text-[9px] text-zinc-400 mt-0.5">RH</span>
                  </div>

                  <div className="bg-zinc-900/90 border border-zinc-800/70 rounded p-1.5 flex flex-col items-center text-center">
                    <div className="flex items-center space-x-1 text-zinc-400 mb-0.5">
                      <CloudRain className="w-3.5 h-3.5" />
                      <span className="text-[9px]">RAIN</span>
                    </div>
                    <span className="font-bold text-zinc-200 text-[11px] leading-tight">
                      {rain}
                    </span>
                    <span className="text-[9px] text-zinc-400 mt-0.5">mm</span>
                  </div>
                </div> */}
              </div>
            ) : (
              /* Mode: Detailed (Dense, small font, abbreviated words without fancy decorations) */
              <div className="flex-1 flex flex-col justify-between py-1 text-zinc-200 font-mono text-[10px]">
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <div className="flex justify-between border-b border-zinc-800/60 pb-0.5">
                    <span className="text-zinc-500 font-medium">TEMPERATURE</span>
                    <span className="font-bold text-zinc-100">{temp}°C</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/60 pb-0.5">
                    <span className="text-zinc-500 font-medium">FEELS LIKE</span>
                    <span className="font-bold text-zinc-100">{apparentTemp}°C</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/60 pb-0.5">
                    <span className="text-zinc-500 font-medium">CONDITION</span>
                    <span className="font-bold text-zinc-100 truncate max-w-[80px]">{weatherInfo.shortLabel}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/60 pb-0.5">
                    <span className="text-zinc-500 font-medium">HUMIDITY</span>
                    <span className="font-bold text-zinc-100">{humidity}%</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/60 pb-0.5">
                    <span className="text-zinc-500 font-medium">WIND SPEED</span>
                    <span className="font-bold text-zinc-100">{windSpeed} km/h</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/60 pb-0.5">
                    <span className="text-zinc-500 font-medium">WIND DIRECTION</span>
                    <span className="font-bold text-zinc-100">{windCompass} ({windDirDeg}°)</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/60 pb-0.5">
                    <span className="text-zinc-500 font-medium">RAIN</span>
                    <span className="font-bold text-zinc-100">{rain} mm</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/60 pb-0.5">
                    <span className="text-zinc-500 font-medium">CLOUD</span>
                    <span className="font-bold text-zinc-100">{cloudCover}%</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/60 pb-0.5">
                    <span className="text-zinc-500 font-medium">MIN/MAX</span>
                    <span className="font-bold text-zinc-100">{tempMin}° / {tempMax}°</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/60 pb-0.5">
                    <span className="text-zinc-500 font-medium">PRECIPITATION</span>
                    <span className="font-bold text-zinc-100">{precipProbMax}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800 text-[10px] text-zinc-400">
                  <div>
                    <span className="text-zinc-500 font-bold">SUNRISE:</span> <span className="text-zinc-200">{sunriseTime}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 font-bold">SUNSET:</span> <span className="text-zinc-200">{sunsetTime}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Subtle footer */}
            {/* <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[9px] font-mono text-zinc-400">
              <span className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>OPEN-METEO FEED</span>
              </span>
              <span>{weatherState?.lastUpdated ? `UPD: ${weatherState.lastUpdated}` : 'LIVE'}</span>
            </div> */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
