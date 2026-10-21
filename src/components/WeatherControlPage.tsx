import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  ExternalLink, 
  MapPin, 
  Sliders, 
  Check, 
  AlertCircle,
  Copy
} from 'lucide-react';
import { GeocodingResult, OpenMeteoWeatherResponse, WeatherState } from '../types';
import { 
  searchGeocoding, 
  fetchWeatherForecast, 
  getWmoWeatherInfo, 
  getWindDirectionCompass, 
  INITIAL_WEATHER_STATE 
} from '../weatherData';

interface WeatherControlPageProps {
  socket?: WebSocket | null;
  weatherState?: WeatherState;
  onUpdateWeatherState?: (next: WeatherState) => void;
}

export const WeatherControlPage: React.FC<WeatherControlPageProps> = ({ 
  socket, 
  weatherState: externalWeatherState,
  onUpdateWeatherState 
}) => {
  // Local state initialized from external or defaults
  const [localWeather, setLocalWeather] = useState<WeatherState>(externalWeatherState || INITIAL_WEATHER_STATE);

  // Synchronize when external state updates from WebSocket
  useEffect(() => {
    if (externalWeatherState) {
      setLocalWeather(externalWeatherState);
    }
  }, [externalWeatherState]);

  // Geocoding Search States
  const [searchQuery, setSearchQuery] = useState('Cigugur');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Manual Coordinates Override States
  const [manualLat, setManualLat] = useState<string>(String(localWeather.latitude));
  const [manualLon, setManualLon] = useState<string>(String(localWeather.longitude));

  // Manual Region Override States
  const [manualCity, setManualCity] = useState<string>(localWeather.regionName);
  const [manualAdmin, setManualAdmin] = useState<string>(localWeather.regionAdmin);

  // Feedback notifications
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [copiedOverlayUrl, setCopiedOverlayUrl] = useState(false);

  // Keep manual inputs synced when localWeather updates from external
  useEffect(() => {
    setManualLat(String(localWeather.latitude));
    setManualLon(String(localWeather.longitude));
    setManualCity(localWeather.regionName);
    setManualAdmin(localWeather.regionAdmin);
  }, [localWeather.latitude, localWeather.longitude, localWeather.regionName, localWeather.regionAdmin]);

  const showNotification = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => {
      setStatusNotice(null);
    }, 4000);
  };

  // Broadcast helper
  const broadcastWeatherUpdate = (nextState: WeatherState) => {
    setLocalWeather(nextState);
    if (onUpdateWeatherState) {
      onUpdateWeatherState(nextState);
    }
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'weatherControl',
        weather: nextState
      }));
    }
  };

  // Handle Geocoding Search
  const handleSearchGeocoding = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const results = await searchGeocoding(query);
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError(`No locations found matching "${query}" in Indonesia.`);
      }
    } catch (err: any) {
      setSearchError(err.message || 'Geocoding request failed');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Selecting a Region from Search Results
  const handleSelectRegion = async (item: GeocodingResult) => {
    setIsFetchingWeather(true);
    const chosenLat = item.latitude;
    const chosenLon = item.longitude;
    const cityName = item.name;
    const adminParts = [item.admin2, item.admin1, item.country].filter(Boolean);
    const adminText = adminParts.join(', ');

    setManualLat(String(chosenLat));
    setManualLon(String(chosenLon));
    setManualCity(cityName);
    setManualAdmin(adminText);

    try {
      const weatherResp = await fetchWeatherForecast(chosenLat, chosenLon);
      const nextState: WeatherState = {
        ...localWeather,
        regionName: cityName,
        regionAdmin: adminText,
        latitude: chosenLat,
        longitude: chosenLon,
        weatherData: weatherResp,
        lastUpdated: new Date().toLocaleTimeString()
      };
      broadcastWeatherUpdate(nextState);
      showNotification(`Loaded weather for ${cityName} (${chosenLat}, ${chosenLon})`);
    } catch (err: any) {
      showNotification(`Failed to load weather: ${err.message}`);
    } finally {
      setIsFetchingWeather(false);
    }
  };

  // Handle Manual Coordinates Override
  const handleOverrideCoordinates = async () => {
    const parsedLat = parseFloat(manualLat);
    const parsedLon = parseFloat(manualLon);

    if (isNaN(parsedLat) || isNaN(parsedLon)) {
      showNotification('Error: Please enter valid numerical latitude and longitude.');
      return;
    }

    setIsFetchingWeather(true);
    try {
      const weatherResp = await fetchWeatherForecast(parsedLat, parsedLon);
      const nextState: WeatherState = {
        ...localWeather,
        latitude: parsedLat,
        longitude: parsedLon,
        weatherData: weatherResp,
        lastUpdated: new Date().toLocaleTimeString()
      };
      broadcastWeatherUpdate(nextState);
      showNotification(`Coordinates overridden: ${parsedLat}, ${parsedLon}`);
    } catch (err: any) {
      showNotification(`Failed to fetch weather: ${err.message}`);
    } finally {
      setIsFetchingWeather(false);
    }
  };

  // Handle Manual Region Labels Override
  const handleOverrideRegionLabels = () => {
    const nextCity = manualCity.trim() || localWeather.regionName;
    const nextAdmin = manualAdmin.trim() || localWeather.regionAdmin;

    const nextState: WeatherState = {
      ...localWeather,
      regionName: nextCity,
      regionAdmin: nextAdmin,
      lastUpdated: new Date().toLocaleTimeString()
    };
    broadcastWeatherUpdate(nextState);
    showNotification(`Region labels updated: "${nextCity}", "${nextAdmin}"`);
  };

  // Toggle Visibility
  const handleToggleVisibility = (visible: boolean) => {
    const nextState: WeatherState = {
      ...localWeather,
      visible
    };
    broadcastWeatherUpdate(nextState);
    showNotification(visible ? 'Weather overlay is now VISIBLE on stream' : 'Weather overlay is now HIDDEN');
  };

  // Toggle Mode (Simple vs Detailed)
  const handleSetMode = (mode: 'simple' | 'detailed') => {
    const nextState: WeatherState = {
      ...localWeather,
      mode
    };
    broadcastWeatherUpdate(nextState);
    showNotification(`Display mode switched to ${mode.toUpperCase()}`);
  };

  // Refresh Weather from current coordinates
  const handleRefreshWeather = async () => {
    setIsFetchingWeather(true);
    try {
      const weatherResp = await fetchWeatherForecast(localWeather.latitude, localWeather.longitude);
      const nextState: WeatherState = {
        ...localWeather,
        weatherData: weatherResp,
        lastUpdated: new Date().toLocaleTimeString()
      };
      broadcastWeatherUpdate(nextState);
      showNotification('Weather data refreshed successfully from Open-Meteo.');
    } catch (err: any) {
      showNotification(`Refresh failed: ${err.message}`);
    } finally {
      setIsFetchingWeather(false);
    }
  };

  const copyOverlayLink = () => {
    const fullUrl = `${window.location.origin}/weather`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedOverlayUrl(true);
    setTimeout(() => setCopiedOverlayUrl(false), 2000);
  };

  // Data helpers for right column plain strings
  const wData = localWeather.weatherData;
  const current = wData?.current;
  const daily = wData?.daily;
  const hourly = wData?.hourly;
  const currentWmo = current ? getWmoWeatherInfo(current.weather_code) : null;
  const windCompass = current ? getWindDirectionCompass(current.wind_direction_10m) : '-';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Control Bar */}
        <header className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="h-3 w-3 rounded-full bg-cyan-500 animate-pulse"></span>
              <h1 className="text-xl md:text-2xl font-black tracking-wide text-white font-mono uppercase">
                Weather Broadcast Control
              </h1>
            </div>
            <p className="text-xs text-zinc-400 mt-1 font-mono">
              Live Open-Meteo integration for timing broadcast overlay (/weather)
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Show / Hide Buttons */}
            <button
              onClick={() => handleToggleVisibility(true)}
              className={`px-4 py-2 rounded-lg font-bold text-xs uppercase font-mono tracking-wider transition-all flex items-center space-x-1.5 ${
                localWeather.visible 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-400' 
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Show On Stream</span>
            </button>
            <button
              onClick={() => handleToggleVisibility(false)}
              className={`px-4 py-2 rounded-lg font-bold text-xs uppercase font-mono tracking-wider transition-all flex items-center space-x-1.5 ${
                !localWeather.visible 
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50 ring-2 ring-rose-400' 
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              <EyeOff className="w-4 h-4" />
              <span>Hide</span>
            </button>

            {/* Mode Switcher */}
            <div className="bg-zinc-800 p-1 rounded-lg flex items-center space-x-1 border border-zinc-700">
              <button
                onClick={() => handleSetMode('simple')}
                className={`px-3 py-1.5 rounded text-xs font-mono uppercase font-semibold transition ${
                  localWeather.mode === 'simple' ? 'bg-zinc-950 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Simple
              </button>
              <button
                onClick={() => handleSetMode('detailed')}
                className={`px-3 py-1.5 rounded text-xs font-mono uppercase font-semibold transition ${
                  localWeather.mode === 'detailed' ? 'bg-zinc-950 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Detailed
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={handleRefreshWeather}
              disabled={isFetchingWeather}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 hover:text-white transition"
              title="Refresh Weather Forecast"
            >
              <RefreshCw className={`w-4 h-4 ${isFetchingWeather ? 'animate-spin' : ''}`} />
            </button>

            {/* Copy Overlay URL */}
            <button
              onClick={copyOverlayLink}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-mono text-zinc-300 flex items-center space-x-1.5 transition"
              title="Copy OBS / vMix Browser Source URL"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedOverlayUrl ? 'Copied!' : 'Copy URL'}</span>
            </button>

            {/* Open /weather */}
            <a
              href="/weather"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 rounded-lg transition"
              title="Open /weather Overlay Page"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </header>

        {/* Status notification banner */}
        {statusNotice && (
          <div className="bg-zinc-900 border-l-4 border-cyan-500 text-zinc-200 px-4 py-2.5 rounded shadow text-xs font-mono flex items-center justify-between">
            <span>{statusNotice}</span>
            <span className="text-[10px] text-zinc-500 font-mono">OK</span>
          </div>
        )}

        {/* TWO COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* ================= LEFT COLUMN ================= */}
          <div className="space-y-6">
            
            {/* Section 1: Geocoding Search */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <h2 className="text-sm font-bold tracking-wider font-mono uppercase text-zinc-200 flex items-center space-x-2">
                  <Search className="w-4 h-4 text-cyan-400" />
                  <span>Geocoding Search</span>
                </h2>
                <span className="text-[10px] font-mono text-zinc-400">Open-Meteo ID</span>
              </div>

              <form onSubmit={handleSearchGeocoding} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter city or region name (e.g. Cigugur, Bandung, Kuningan)..."
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 text-white font-bold text-xs font-mono uppercase tracking-wider rounded-lg transition flex items-center space-x-1.5"
                >
                  {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Search</span>
                </button>
              </form>

              {searchError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded text-rose-300 text-xs font-mono flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}

              {/* Geocoding Results List */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  {searchResults.length > 0 ? `Results (${searchResults.length} found):` : 'Available Results:'}
                </div>

                {searchResults.length === 0 && !searchError && (
                  <p className="text-xs text-zinc-400 italic font-mono py-2">
                    Enter a region above and click Search. Selecting a region automatically loads weather data and updates the broadcast.
                  </p>
                )}

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="p-3 bg-zinc-950 border border-zinc-800 hover:border-cyan-600/70 rounded-lg transition flex items-center justify-between gap-3 text-xs font-mono"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="font-bold text-zinc-100 text-sm flex items-center space-x-2">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate">{result.name}</span>
                          <span className="text-[10px] font-normal text-zinc-400 px-1.5 py-0.2 bg-zinc-800 rounded">
                            {result.country || 'ID'}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate">
                          Admin: {[result.admin2, result.admin1].filter(Boolean).join(', ') || '-'}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          Lat: <span className="text-zinc-300">{result.latitude}</span> | Lon: <span className="text-zinc-300">{result.longitude}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSelectRegion(result)}
                        disabled={isFetchingWeather}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-cyan-600 text-zinc-200 hover:text-white rounded text-xs font-mono font-bold uppercase tracking-wider transition shrink-0"
                      >
                        Choose
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: Manual Latitude & Longitude Override */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <h2 className="text-sm font-bold tracking-wider font-mono uppercase text-zinc-200 flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Manual Coordinates Override</span>
                </h2>
                <span className="text-[10px] font-mono text-zinc-400">WGS84</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    placeholder="-6.9675527"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={manualLon}
                    onChange={(e) => setManualLon(e.target.value)}
                    placeholder="108.4777732"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <button
                onClick={handleOverrideCoordinates}
                disabled={isFetchingWeather}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 hover:text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg transition flex items-center justify-center space-x-2"
              >
                {isFetchingWeather ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Override Coordinates & Fetch Forecast</span>
              </button>
            </div>

            {/* Section 3: Manual Region & City Override */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <h2 className="text-sm font-bold tracking-wider font-mono uppercase text-zinc-200 flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span>Manual Region & City Override</span>
                </h2>
                <span className="text-[10px] font-mono text-zinc-400">Display Labels</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
                    City Name (Header)
                  </label>
                  <input
                    type="text"
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                    placeholder="Cigugur"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
                    Region / Province (Subheader)
                  </label>
                  <input
                    type="text"
                    value={manualAdmin}
                    onChange={(e) => setManualAdmin(e.target.value)}
                    placeholder="Kuningan, Jawa Barat"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <button
                onClick={handleOverrideRegionLabels}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 hover:text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg transition flex items-center justify-center space-x-2"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Override Region Labels</span>
              </button>
            </div>

            {/* Current Broadcast State Summary Card */}
            <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2 text-xs font-mono text-zinc-400">
              <div className="flex justify-between items-center text-zinc-200">
                <span className="font-bold uppercase tracking-wider">Stream Status</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${localWeather.visible ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-zinc-800 text-zinc-400'}`}>
                  {localWeather.visible ? 'VISIBLE ON STREAM' : 'HIDDEN'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Display Mode:</span>
                <span className="text-zinc-200 font-semibold uppercase">{localWeather.mode}</span>
              </div>
              <div className="flex justify-between">
                <span>Broadcast Label:</span>
                <span className="text-zinc-200 font-semibold">{localWeather.regionName} ({localWeather.regionAdmin})</span>
              </div>
              <div className="flex justify-between">
                <span>Coordinates:</span>
                <span className="text-zinc-200">{localWeather.latitude}, {localWeather.longitude}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span className="text-zinc-200">{localWeather.lastUpdated || '-'}</span>
              </div>
            </div>

          </div>

          {/* ================= RIGHT COLUMN ================= */}
          {/* "The Right column is for showing all the detailed data from the weather api, it will just display simple string without any fancy icon/symbol." */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow space-y-5">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-wider font-mono uppercase text-zinc-200">
                  Detailed Weather API Strings
                </h2>
                <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                  Raw & formatted responses from Open-Meteo endpoint (no icons / plain text)
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 bg-zinc-950 text-zinc-400 border border-zinc-800 rounded">
                REST FEED
              </span>
            </div>

            {!wData ? (
              <div className="p-8 text-center text-zinc-500 font-mono text-xs">
                No weather data loaded yet. Search or enter coordinates on the left.
              </div>
            ) : (
              <div className="space-y-6 font-mono text-xs">
                
                {/* 1. Location & Meta Strings */}
                <div className="space-y-1.5 bg-zinc-950 border border-zinc-800/80 rounded-lg p-3.5">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pb-1 border-b border-zinc-800/60">
                    Location & Metadata
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-zinc-300">
                    <div>latitude: {wData.latitude}</div>
                    <div>longitude: {wData.longitude}</div>
                    <div>elevation: {wData.elevation ?? '-'} m</div>
                    <div>generationtime_ms: {wData.generationtime_ms ?? '-'}</div>
                    <div>timezone: {wData.timezone || 'Asia/Jakarta'}</div>
                    <div>timezone_abbreviation: {wData.timezone_abbreviation || 'GMT+7'}</div>
                    <div>utc_offset_seconds: {wData.utc_offset_seconds ?? '-'}</div>
                  </div>
                </div>

                {/* 2. Current Conditions Strings */}
                <div className="space-y-1.5 bg-zinc-950 border border-zinc-800/80 rounded-lg p-3.5">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pb-1 border-b border-zinc-800/60">
                    Current Conditions
                  </div>
                  {current ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-zinc-300">
                      <div>time: {current.time}</div>
                      <div>temperature_2m: {current.temperature_2m} °C</div>
                      <div>apparent_temperature: {current.apparent_temperature} °C</div>
                      <div>relative_humidity_2m: {current.relative_humidity_2m} %</div>
                      <div>weather_code: {current.weather_code} ({currentWmo?.label || 'Unknown'})</div>
                      <div>is_day: {current.is_day} ({current.is_day === 1 ? 'Day' : 'Night'})</div>
                      <div>precipitation: {current.precipitation} mm</div>
                      <div>rain: {current.rain} mm</div>
                      <div>showers: {current.showers} mm</div>
                      <div>cloud_cover: {current.cloud_cover} %</div>
                      <div>wind_speed_10m: {current.wind_speed_10m} km/h</div>
                      <div>wind_direction_10m: {current.wind_direction_10m}° ({windCompass})</div>
                    </div>
                  ) : (
                    <div className="text-zinc-500">No current data block</div>
                  )}
                </div>

                {/* 3. Daily Forecast Strings */}
                <div className="space-y-1.5 bg-zinc-950 border border-zinc-800/80 rounded-lg p-3.5">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pb-1 border-b border-zinc-800/60">
                    Daily Forecast Summary
                  </div>
                  {daily ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-zinc-300">
                      <div>date: {daily.time?.[0] || '-'}</div>
                      <div>weather_code: {daily.weather_code?.[0] ?? '-'}</div>
                      <div>temperature_2m_max: {daily.temperature_2m_max?.[0] ?? '-'} °C</div>
                      <div>temperature_2m_min: {daily.temperature_2m_min?.[0] ?? '-'} °C</div>
                      <div>precipitation_sum: {daily.precipitation_sum?.[0] ?? '-'} mm</div>
                      <div>precipitation_probability_max: {daily.precipitation_probability_max?.[0] ?? '-'} %</div>
                      <div>sunrise: {daily.sunrise?.[0] || '-'}</div>
                      <div>sunset: {daily.sunset?.[0] || '-'}</div>
                    </div>
                  ) : (
                    <div className="text-zinc-500">No daily data block</div>
                  )}
                </div>

                {/* 4. Units Mapping Strings */}
                <div className="space-y-1 bg-zinc-950 border border-zinc-800/80 rounded-lg p-3.5">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pb-1 border-b border-zinc-800/60">
                    Current Units Definition
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-zinc-400 text-[11px]">
                    {wData.current_units ? (
                      Object.entries(wData.current_units).map(([key, val]) => (
                        <div key={key}>
                          <span className="text-zinc-500">{key}:</span> {String(val)}
                        </div>
                      ))
                    ) : (
                      <div>temperature_2m: °C, relative_humidity_2m: %, wind_speed_10m: km/h</div>
                    )}
                  </div>
                </div>

                {/* 5. Hourly Forecast String Table (Plain text strings) */}
                <div className="space-y-1.5 bg-zinc-950 border border-zinc-800/80 rounded-lg p-3.5">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pb-1 border-b border-zinc-800/60 flex justify-between">
                    <span>Hourly Forecast Series (24h)</span>
                    <span className="text-zinc-500">Plain string table</span>
                  </div>
                  {hourly?.time && hourly.time.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto space-y-0.5 text-[11px]">
                      <div className="grid grid-cols-5 py-1 text-zinc-500 border-b border-zinc-800 font-bold">
                        <span>Time</span>
                        <span>Temp</span>
                        <span>Hum</span>
                        <span>Precip</span>
                        <span>Prob%</span>
                      </div>
                      {hourly.time.map((timeStr, idx) => {
                        const shortHour = timeStr.includes('T') ? timeStr.split('T')[1] : timeStr;
                        const hTemp = hourly.temperature_2m?.[idx] ?? '-';
                        const hHum = hourly.relative_humidity_2m?.[idx] ?? '-';
                        const hPrecip = hourly.precipitation?.[idx] ?? '-';
                        const hProb = hourly.precipitation_probability?.[idx] ?? '-';

                        return (
                          <div key={timeStr} className="grid grid-cols-5 py-0.5 text-zinc-300 hover:bg-zinc-900 px-0.5 rounded">
                            <span>{shortHour}</span>
                            <span>{hTemp}°C</span>
                            <span>{hHum}%</span>
                            <span>{hPrecip}mm</span>
                            <span>{hProb}%</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-zinc-500">No hourly forecast series</div>
                  )}
                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
