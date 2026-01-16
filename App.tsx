
import React, { useState, useMemo, useEffect } from 'react';
import { TripPreferences, TripPlan, TripDay, TripStop, PackingList } from './types';
import { planTripWithAI, generatePackingList } from './services/geminiService';
import { decodeTripFromSharing, getShareableUrl } from './services/sharingService';
import TripForm from './components/TripForm';
import ShareModal from './components/ShareModal';
import PackingListModal from './components/PackingListModal';

const SAVED_TRIPS_KEY = 'fart_saved_trips';
const LAST_PLAN_ID_KEY = 'fart_last_plan_id';

interface TripStopWithMeta extends TripStop {
  dayIdx: number;
  stopIdx: number;
}

const parseTimeToMinutes = (t: string): number => {
  if (!t) return 540; 
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return 540;
  return h * 60 + m;
};

const formatMinutesToTime = (m: number): string => {
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
};

const FartLogo = ({ size = "w-12 h-12" }: { size?: string }) => (
  <div className={`relative ${size} flex items-center justify-center select-none`}>
    <svg viewBox="0 0 120 100" className="w-full h-full drop-shadow-lg overflow-visible">
      <g className="animate-bounce" style={{ animationDuration: '2.5s' }}>
        <path d="M5 60 Q-15 45 -25 65 T-5 85 T15 75 Z" fill="#475569" opacity="0.6" />
        <circle cx="10" cy="72" r="12" fill="#334155" opacity="0.8" />
        <circle cx="22" cy="78" r="8" fill="#1e293b" />
      </g>
      <path d="M25 75 L25 55 Q25 45 40 45 L95 45 Q110 45 110 55 L110 75 Z" fill="#f97316" />
      <rect x="35" y="58" width="60" height="8" fill="#78350f" rx="2" />
      <path d="M40 45 L40 30 Q40 20 55 20 L100 20 Q108 20 110 30 L110 45 Z" fill="#fb923c" />
      <rect x="48" y="25" width="22" height="15" fill="#fff" opacity="0.4" rx="3" />
      <rect x="75" y="25" width="22" height="15" fill="#fff" opacity="0.4" rx="3" />
      <circle cx="45" cy="75" r="14" fill="#020617" />
      <circle cx="45" cy="75" r="6" fill="#475569" />
      <circle cx="95" cy="75" r="14" fill="#020617" />
      <circle cx="95" cy="75" r="6" fill="#475569" />
      <rect x="15" y="70" width="15" height="6" fill="#334155" rx="3" />
      <text x="0" y="98" fontSize="18" fontStyle="italic" fontWeight="900" fill="#f97316" transform="rotate(-5)" className="tracking-tighter">PHUT!</text>
    </svg>
  </div>
);

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [savedTrips, setSavedTrips] = useState<TripPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'summary'>('list');
  const [showSavedMenu, setShowSavedMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPackingModal, setShowPackingModal] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [focusedStopId, setFocusedStopId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(SAVED_TRIPS_KEY);
    const lastPlanId = localStorage.getItem(LAST_PLAN_ID_KEY);
    
    let loadedTrips: TripPlan[] = [];
    if (stored) {
      try {
        loadedTrips = JSON.parse(stored);
        setSavedTrips(loadedTrips);
      } catch (e) {
        console.error("Failed to load saved trips", e);
      }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('share');
    if (sharedData) {
      const sharedPlan = decodeTripFromSharing(sharedData);
      if (sharedPlan) {
        setPlan(sharedPlan);
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        saveCurrentPlan(sharedPlan);
      }
    } else if (lastPlanId) {
      const lastPlan = loadedTrips.find(t => t.id === lastPlanId);
      if (lastPlan) setPlan(lastPlan);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(savedTrips));
  }, [savedTrips]);

  useEffect(() => {
    if (plan?.id) {
      localStorage.setItem(LAST_PLAN_ID_KEY, plan.id);
    } else {
      localStorage.removeItem(LAST_PLAN_ID_KEY);
    }
  }, [plan]);

  const saveCurrentPlan = (updatedPlan: TripPlan) => {
    setSavedTrips(prev => {
      const exists = prev.find(t => t.id === updatedPlan.id);
      if (exists) return prev.map(t => t.id === updatedPlan.id ? updatedPlan : t);
      return [updatedPlan, ...prev];
    });
  };

  const handlePlanTrip = async (prefs: TripPreferences) => {
    if (isOffline) {
      setError("Offline. Connect to plan.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await planTripWithAI(prefs);
      try {
        const packing = await generatePackingList(result);
        result.packingList = packing;
      } catch (e) {
        console.warn("Packing list skipped.", e);
      }
      setPlan(result);
      saveCurrentPlan(result);
    } catch (err: any) {
      setError(err.message || "An error occurred while planning.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateDayStartTime = (dayIdx: number, newTime: string) => {
    if (!plan) return;
    const day = plan.days[dayIdx];
    const oldMinutes = parseTimeToMinutes(day.startTime || '09:00');
    const newMinutes = parseTimeToMinutes(newTime);
    const diff = newMinutes - oldMinutes;

    const newDays = plan.days.map((d, dIdx) => {
      if (dIdx !== dayIdx) return d;
      return {
        ...d,
        startTime: newTime,
        stops: d.stops.map(stop => ({
          ...stop,
          time: formatMinutesToTime(parseTimeToMinutes(stop.time || '09:00') + diff)
        }))
      };
    });

    const updated = { ...plan, days: newDays, lastUpdated: new Date().toISOString() };
    setPlan(updated);
    saveCurrentPlan(updated);
  };

  const updateStopDuration = (dayIdx: number, stopIdx: number, newDuration: number) => {
    if (!plan) return;
    const day = plan.days[dayIdx];
    const stop = day.stops[stopIdx];
    const diff = newDuration - (stop.duration || 30);

    const newDays = plan.days.map((d, dIdx) => {
      if (dIdx !== dayIdx) return d;
      return {
        ...d,
        stops: d.stops.map((s, sIdx) => {
          if (sIdx === stopIdx) return { ...s, duration: newDuration };
          if (sIdx > stopIdx) {
            return {
              ...s,
              time: formatMinutesToTime(parseTimeToMinutes(s.time || '09:00') + diff)
            };
          }
          return s;
        })
      };
    });

    const updated = { ...plan, days: newDays, lastUpdated: new Date().toISOString() };
    setPlan(updated);
    saveCurrentPlan(updated);
  };

  const toggleStopSelection = (dayIdx: number, stopIdx: number) => {
    if (!plan || plan.isActive) return;
    const newDays = plan.days.map((d, dIdx) => {
      if (dIdx !== dayIdx) return d;
      return {
        ...d,
        stops: d.stops.map((s, sIdx) => {
          if (sIdx !== stopIdx) return s;
          return { ...s, isSelected: !s.isSelected };
        })
      };
    });
    const updated = { ...plan, days: newDays };
    setPlan(updated);
    saveCurrentPlan(updated);
  };

  const toggleStopCompleted = (dayIdx: number, stopIdx: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!plan) return;
    const newDays = plan.days.map((day, dIdx) => {
      if (dIdx !== dayIdx) return day;
      return {
        ...day,
        stops: day.stops.map((stop, sIdx) => {
          if (sIdx !== stopIdx) return stop;
          return { ...stop, isCompleted: !stop.isCompleted };
        })
      };
    });
    const updated = { ...plan, days: newDays };
    setPlan(updated);
    saveCurrentPlan(updated);
  };

  const allStops = useMemo<TripStopWithMeta[]>(() => {
    if (!plan) return [];
    return plan.days.flatMap((day, dayIdx) => 
      day.stops.map((stop, stopIdx) => ({ ...stop, dayIdx, stopIdx } as TripStopWithMeta))
    );
  }, [plan]);

  const selectedStops = useMemo(() => allStops.filter(s => s.isSelected), [allStops]);
  const nextStop = useMemo(() => plan?.isActive ? selectedStops.find(s => !s.isCompleted) : null, [plan, selectedStops]);
  const progress = useMemo(() => selectedStops.length === 0 ? 0 : Math.round((selectedStops.filter(s => s.isCompleted).length / selectedStops.length) * 100), [selectedStops]);

  const calculatedTotalDuration = useMemo(() => {
    if (!plan) return "0 hours";
    let totalMinutes = 0;
    plan.days.forEach(day => {
      const selected = day.stops.filter(s => s.isSelected);
      if (selected.length === 0) return;
      const dayStart = parseTimeToMinutes(day.startTime || '09:00');
      const lastStop = selected[selected.length - 1];
      const lastDeparture = parseTimeToMinutes(lastStop.time || '09:00') + (lastStop.duration || 30);
      totalMinutes += Math.max(0, lastDeparture - dayStart);
    });
    return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m active journey`;
  }, [plan]);

  const MapView = () => {
    const stopsWithCoords = allStops.filter(s => s.lat !== undefined && s.lng !== undefined);
    if (stopsWithCoords.length === 0) return <div className="h-64 bg-slate-900 rounded-2xl flex items-center justify-center font-black text-[10px] text-slate-500 uppercase">Generating Map...</div>;
    const minLat = Math.min(...stopsWithCoords.map(s => s.lat!));
    const maxLat = Math.max(...stopsWithCoords.map(s => s.lat!));
    const minLng = Math.min(...stopsWithCoords.map(s => s.lng!));
    const maxLng = Math.max(...stopsWithCoords.map(s => s.lng!));
    const latRange = (maxLat - minLat) || 0.1;
    const lngRange = (maxLng - minLng) || 0.1;

    return (
      <div className="relative w-full h-[550px] bg-slate-950 rounded-[2.5rem] border-4 border-slate-900 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-blue-900/10 opacity-40"></div>
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
          <polyline 
            points={selectedStops.map(s => `${10 + (s.lng! - minLng) / lngRange * 80}%,${90 - (s.lat! - minLat) / latRange * 80}%`).join(' ')}
            fill="none" stroke="#f97316" strokeWidth="4" strokeLinecap="round" strokeDasharray="10,10" className="opacity-40"
          />
        </svg>
        {allStops.map((stop) => {
          const x = 10 + (stop.lng! - minLng) / lngRange * 80;
          const y = 90 - (stop.lat! - minLat) / latRange * 80;
          const isNext = nextStop?.id === stop.id;
          return (
            <div key={stop.id} style={{ left: `${x}%`, top: `${y}%` }} className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all cursor-pointer ${focusedStopId === stop.id ? 'z-50 scale-125' : 'z-20'}`} onClick={() => setFocusedStopId(stop.id)}>
              <div className={`p-2 rounded-xl shadow-xl border-4 ${focusedStopId === stop.id ? 'bg-slate-800 border-orange-500' : (stop.isCompleted ? 'bg-slate-900 border-slate-800 opacity-60' : 'bg-slate-900 border-slate-700')}`}>
                <span className="text-xl">{stop.isCompleted ? '✅' : '📍'}</span>
              </div>
              {isNext && <div className="absolute inset-0 bg-orange-500/20 rounded-xl animate-ping"></div>}
            </div>
          );
        })}
        {focusedStopId && (
          <div className="absolute bottom-6 left-6 right-6 bg-slate-900 rounded-[2rem] shadow-2xl p-5 border-4 border-orange-500 z-[100] text-slate-100 animate-in slide-in-from-bottom-5">
            <button onClick={() => setFocusedStopId(null)} className="absolute -top-3 -right-3 bg-white text-slate-900 w-8 h-8 rounded-full flex items-center justify-center font-black shadow-lg">✕</button>
            <div className="flex justify-between items-start">
               <div>
                  <h3 className="font-black text-sm">{allStops.find(s => s.id === focusedStopId)?.name}</h3>
                  <p className="text-[10px] text-slate-400 mt-1">{allStops.find(s => s.id === focusedStopId)?.address}</p>
               </div>
               <span className="text-xs bg-slate-800 px-2 py-1 rounded-lg shrink-0">{allStops.find(s => s.id === focusedStopId)?.weatherIcon} {allStops.find(s => s.id === focusedStopId)?.temperature}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const SummaryView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 p-5 rounded-[2rem] shadow-lg border-2 border-slate-800 text-center">
          <span className="text-2xl block mb-1">🛣️</span>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Distance</span>
          <div className="text-lg font-black text-white">{plan?.totalDistance}</div>
        </div>
        <div className="bg-slate-900 p-5 rounded-[2rem] shadow-lg border-2 border-slate-800 text-center">
          <span className="text-2xl block mb-1">⏱️</span>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Journey Time</span>
          <div className="text-lg font-black text-white">{calculatedTotalDuration}</div>
        </div>
      </div>
      <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-xl border-2 border-slate-800">
        <h3 className="text-xl font-black italic mb-6 text-white">Route Summary</h3>
        <div className="space-y-8 relative pl-10 border-l-2 border-slate-800 ml-4">
          {plan?.days.map((day, idx) => (
            <div key={idx} className="relative">
              <div className="absolute -left-[54px] top-0 w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-[10px] font-black text-white">{day.dayNumber}</div>
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-sm font-black text-slate-100">{day.title}</h4>
                <span className="text-[10px] font-bold text-slate-500">{day.weatherIcon} {day.temperatureRange}</span>
              </div>
              <p className="text-[10px] text-slate-400 italic">"{day.daySummary}"</p>
            </div>
          ))}
        </div>
      </div>
      {plan?.sources && plan.sources.length > 0 && (
        <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-xl border-2 border-slate-800">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-orange-500">Grounding Sources</h3>
          <div className="flex flex-wrap gap-2">
            {plan.sources.map((src, i) => (
              <a 
                key={i} 
                href={src.uri} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-slate-800 px-3 py-2 rounded-xl text-[9px] font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700"
              >
                🗺️ {src.title || 'Google Maps Link'}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen pb-32 text-slate-100">
      <header className="bg-slate-950/80 backdrop-blur-xl border-b border-slate-900 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setPlan(null)}>
            <div className="bg-orange-500 p-1 rounded-xl shadow-lg shadow-orange-500/20"><FartLogo size="w-10 h-10" /></div>
            <div>
              <h1 className="text-xl font-black leading-none text-white">FART</h1>
              <span className="text-[8px] font-black uppercase text-orange-500">Family Road Trip</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSavedMenu(!showSavedMenu)} className="px-3 py-1.5 bg-slate-900 text-slate-300 rounded-lg font-black text-[9px] border border-slate-800 uppercase">SAVED</button>
            {plan && (
              <div className="bg-slate-900 p-1 rounded-lg flex border border-slate-800">
                <button onClick={() => setViewMode('summary')} className={`px-2 py-1 rounded text-[8px] font-black transition-colors ${viewMode === 'summary' ? 'bg-slate-800 text-orange-500 shadow-sm' : 'text-slate-500'}`}>SUMMARY</button>
                <button onClick={() => setViewMode('list')} className={`px-2 py-1 rounded text-[8px] font-black transition-colors ${viewMode === 'list' ? 'bg-slate-800 text-orange-500 shadow-sm' : 'text-slate-500'}`}>LIST</button>
                <button onClick={() => setViewMode('map')} className={`px-2 py-1 rounded text-[8px] font-black transition-colors ${viewMode === 'map' ? 'bg-slate-800 text-orange-500 shadow-sm' : 'text-slate-500'}`}>MAP</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showSavedMenu && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-start justify-center pt-24 px-4" onClick={() => setShowSavedMenu(false)}>
          <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border-2 border-slate-800 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
               <h3 className="font-black text-xs uppercase tracking-widest text-orange-500">Saved Trips</h3>
               <button onClick={() => setShowSavedMenu(false)} className="text-slate-500 font-bold text-xs uppercase">Close</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {savedTrips.length === 0 ? (
                <div className="p-10 text-center text-slate-500 text-[10px] font-black uppercase tracking-widest">No saved journeys yet</div>
              ) : (
                savedTrips.map(t => (
                  <button key={t.id} onClick={() => { setPlan(t); setShowSavedMenu(false); }} className="w-full p-6 text-left hover:bg-slate-800 border-b border-slate-800 last:border-0 transition-colors flex justify-between items-center group">
                    <div>
                      <div className="font-black text-sm text-white group-hover:text-orange-500 transition-colors">{t.tripName}</div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase mt-1">{new Date(t.lastUpdated || '').toLocaleDateString()} • {t.totalDistance}</div>
                    </div>
                    <span className="text-xl opacity-0 group-hover:opacity-100 transition-opacity">🚀</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 pt-4">
        {error && (
          <div className="bg-red-500/10 border-2 border-red-500/20 p-4 rounded-2xl mb-6 text-red-500 text-xs font-bold text-center flex items-center justify-center gap-3">
            <span>⚠️</span> {error}
          </div>
        )}

        {!plan ? (
          <TripForm onPlan={handlePlanTrip} isLoading={isLoading} isOffline={isOffline} />
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-slate-800">
              <div className="absolute top-6 right-6 flex gap-2">
                <button onClick={() => setShowShareModal(true)} className="bg-slate-800 p-2.5 rounded-xl hover:bg-slate-700 transition-colors">🔗</button>
                {plan.packingList && <button onClick={() => setShowPackingModal(true)} className="bg-slate-800 p-2.5 rounded-xl hover:bg-slate-700 transition-colors">🎒</button>}
                <div className={`${plan.isActive ? 'bg-green-500 shadow-lg shadow-green-500/20' : 'bg-orange-500 shadow-lg shadow-orange-500/20'} px-3 py-1.5 rounded-full text-[8px] font-black uppercase flex items-center`}>{plan.isActive ? 'Tracking' : 'Draft'}</div>
              </div>
              <h2 className="text-2xl font-black italic mb-2 pr-24">{plan.tripName}</h2>
              <div className="flex gap-4 items-center mt-4">
                <span className="text-xs font-black text-orange-500">{progress}% COMPLETE</span>
                <div className="h-1.5 flex-grow bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)] transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            </div>

            {viewMode === 'list' ? (
              <div className="space-y-12 animate-in slide-in-from-bottom-5 duration-500">
                {plan.days.map((day, dIdx) => (
                  <div key={dIdx} className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-500 text-white h-7 w-7 rounded-lg flex items-center justify-center font-black text-[10px] shadow-lg shadow-orange-500/20">D{day.dayNumber}</div>
                      <h3 className="text-base font-black text-slate-100">{day.title}</h3>
                      <div className="flex-grow h-px bg-slate-800"></div>
                      <div className="text-[10px] font-bold text-blue-400 shrink-0">{day.weatherIcon} {day.temperatureRange}</div>
                      <input type="time" disabled={plan.isActive} className="bg-slate-900 border-slate-800 border-2 rounded-xl px-2 py-1.5 text-[10px] font-black text-white focus:border-orange-500 outline-none" value={day.startTime || '09:00'} onChange={(e) => updateDayStartTime(dIdx, e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {day.stops.map((stop, sIdx) => (
                        <div key={stop.id || sIdx} onClick={() => toggleStopSelection(dIdx, sIdx)} className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer relative ${stop.isSelected ? (stop.isCompleted ? 'bg-slate-900 border-slate-800 opacity-60' : 'bg-slate-900 border-orange-500 shadow-2xl') : 'bg-slate-900/50 border-transparent opacity-40'}`}>
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-3xl">📍</span>
                            <div className="text-right">
                               <div className="text-[10px] font-black text-blue-400">{stop.weatherIcon} {stop.temperature}</div>
                               <div className="text-[7px] font-bold text-slate-500 uppercase">{stop.weatherSummary}</div>
                            </div>
                          </div>
                          <h4 className="font-black text-sm mb-2 text-white">{stop.name}</h4>
                          <div className="flex gap-2 text-[8px] font-black uppercase mb-5">
                            <span className="bg-slate-950 text-slate-400 px-2 py-1 rounded border border-slate-800">Arrive {stop.time}</span>
                            <span className="bg-orange-500/10 text-orange-500 px-2 py-1 rounded border border-orange-500/20">Duration {stop.duration}m</span>
                          </div>
                          {!plan.isActive && stop.isSelected && (
                            <div className="flex items-center gap-2 mb-2">
                               <button onClick={(e) => { e.stopPropagation(); updateStopDuration(dIdx, sIdx, Math.max(5, (stop.duration || 30) - 15)); }} className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl text-[10px] font-black transition-colors">-15</button>
                               <button onClick={(e) => { e.stopPropagation(); updateStopDuration(dIdx, sIdx, (stop.duration || 30) + 15); }} className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl text-[10px] font-black transition-colors">+15</button>
                               <div className="flex-grow text-center text-[9px] font-black text-slate-500 uppercase tracking-widest">Adjust Stay</div>
                            </div>
                          )}
                          {plan.isActive && stop.isSelected && (
                            <button onClick={(e) => toggleStopCompleted(dIdx, sIdx, e)} className={`w-full py-3.5 rounded-2xl font-black text-[10px] uppercase border transition-all ${stop.isCompleted ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30'}`}>{stop.isCompleted ? 'VISITED' : 'ARRIVED'}</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : viewMode === 'summary' ? <SummaryView /> : <MapView />}
          </div>
        )}
      </main>

      {plan && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-40">
          <div className="bg-slate-900/90 backdrop-blur-2xl p-2.5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between border border-slate-800">
            <div className="px-5">
              <div className="text-[9px] font-black uppercase tracking-widest text-orange-500 mb-0.5">{selectedStops.length} Stops</div>
              <div className="text-slate-500 text-[8px] font-bold italic">{plan.isActive ? 'Live Mode' : 'Draft Mode'}</div>
            </div>
            <button onClick={() => { 
                const updated = { ...plan, isActive: !plan.isActive };
                setPlan(updated);
                saveCurrentPlan(updated);
                if (updated.isActive) setViewMode('list');
              }} 
              className={`${plan.isActive ? 'bg-red-500 shadow-red-500/20' : 'bg-orange-500 shadow-orange-500/20'} text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-2xl transition-all active:scale-95`}>
              {plan.isActive ? 'END TRIP' : 'START TRIP'}
            </button>
          </div>
        </div>
      )}

      {showShareModal && plan && <ShareModal url={getShareableUrl(plan)} onClose={() => setShowShareModal(false)} />}
      {showPackingModal && plan && plan.packingList && <PackingListModal packingList={plan.packingList} onToggleItem={() => {}} onClose={() => setShowPackingModal(false)} />}
    </div>
  );
};

export default App;
