
import React, { useState, useEffect, useRef } from 'react';
import { AgeGroup, StopType, TripPreferences } from '../types';
import { getPlaceSuggestions } from '../services/geminiService';

interface TripFormProps {
  onPlan: (prefs: TripPreferences) => void;
  isLoading: boolean;
  isOffline?: boolean;
}

const AutocompleteInput: React.FC<{
  label: string;
  icon: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}> = ({ label, icon, placeholder, value, onChange, disabled }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [show, setShow] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasError, setHasError] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (disabled) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    
    const trimmedVal = value.trim();
    if (trimmedVal.length > 2) {
      setHasError(false);
      setIsSearching(true);
      timerRef.current = window.setTimeout(async () => {
        try {
          const results = await getPlaceSuggestions(trimmedVal);
          setSuggestions(results);
          setShow(true);
        } catch (err) {
          console.error("Suggestion UI Error:", err);
          setHasError(true);
        } finally {
          setIsSearching(false);
        }
      }, 600); 
    } else {
      setSuggestions([]);
      setShow(false);
      setIsSearching(false);
    }
  }, [value, disabled]);

  const handleSelect = (s: string) => {
    onChange(s);
    setSuggestions([]);
    setShow(false);
  };

  return (
    <div className="relative group">
      {label && (
        <label className="block text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1.5 ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg group-focus-within:scale-110 transition-transform">
          {isSearching ? <div className="w-4 h-4 border-2 border-slate-700 border-t-orange-500 rounded-full animate-spin"></div> : icon}
        </span>
        <input
          type="text"
          placeholder={disabled ? "Internet required..." : placeholder}
          autoComplete="off"
          disabled={disabled}
          className={`w-full pl-11 pr-4 py-4 rounded-2xl bg-slate-900 border-2 transition-all outline-none font-bold text-sm text-slate-100 placeholder:text-slate-600 ${
            disabled ? 'opacity-50 cursor-not-allowed' :
            show && suggestions.length > 0 ? 'border-orange-500' : 'border-white/5 focus:border-orange-500'
          }`}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShow(true); }}
          onBlur={() => setTimeout(() => setShow(false), 200)}
        />
      </div>
      
      {show && (suggestions.length > 0 || hasError) && !disabled && (
        <div className="absolute top-full left-0 right-0 z-[100] mt-2 bg-slate-900 border-2 border-slate-800 shadow-[0_10px_40px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          {hasError ? (
            <div className="px-4 py-4 text-[10px] font-bold text-red-400 bg-red-900/20 uppercase tracking-widest">
              Suggestions unavailable
            </div>
          ) : (
            suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                className="w-full text-left px-4 py-4 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors border-b border-slate-800 last:border-0"
                onMouseDown={() => handleSelect(s)}
              >
                {s}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const TripForm: React.FC<TripFormProps> = ({ onPlan, isLoading, isOffline }) => {
  const [prefs, setPrefs] = useState<TripPreferences>({
    source: '',
    destinations: [''],
    ageGroups: [],
    stopTypes: [],
    startDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    dailyDriveLimit: 6,
    maxLegDuration: 2
  });

  const loadingMessages = [
    "Plotting your route...",
    "Finding kid-friendly stops...",
    "Checking the weather...",
    "Curating activities...",
    "Almost there..."
  ];
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep(s => (s + 1) % loadingMessages.length);
      }, 3000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline) return;
    if (!prefs.source.trim() || prefs.destinations.some(d => !d.trim())) {
      alert("Missing start point or destinations.");
      return;
    }
    onPlan(prefs);
  };

  const getStopTypeIcon = (type: StopType) => {
    switch (type) {
      case StopType.HOTEL: return '🏨 ';
      case StopType.GAS_STATION: return '⛽ ';
      case StopType.PLAYGROUND: return '🛝 ';
      case StopType.RESTAURANT: return '🍔 ';
      case StopType.RESTROOM: return '🚽 ';
      case StopType.MUSEUM: return '🏛️ ';
      case StopType.ACTIVITY: return '🎠 ';
      case StopType.NECESSITY: return '🛒 ';
      default: return '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 p-6 md:p-8 rounded-[3rem] shadow-2xl space-y-6 max-w-2xl mx-auto border-2 border-slate-800">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <AutocompleteInput 
          label="Starting Point" 
          icon="🏠" 
          placeholder="Address or city" 
          value={prefs.source} 
          onChange={v => setPrefs({...prefs, source: v})} 
          disabled={isOffline}
        />
        <div className="grid grid-cols-2 gap-3">
           <div>
              <label className="block text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1.5 ml-1">Date</label>
              <input 
                type="date"
                disabled={isOffline}
                className="w-full px-4 py-4 rounded-2xl bg-slate-800 border-2 border-transparent focus:border-orange-500 outline-none font-bold text-xs text-slate-100 transition-all"
                value={prefs.startDate}
                onChange={e => setPrefs({...prefs, startDate: e.target.value})}
              />
           </div>
           <div>
              <label className="block text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1.5 ml-1">Time</label>
              <input 
                type="time"
                disabled={isOffline}
                className="w-full px-4 py-4 rounded-2xl bg-slate-800 border-2 border-transparent focus:border-orange-500 outline-none font-bold text-xs text-slate-100 transition-all"
                value={prefs.startTime}
                onChange={e => setPrefs({...prefs, startTime: e.target.value})}
              />
           </div>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1 ml-1">Destinations</label>
        {prefs.destinations.map((dest, index) => (
          <div key={index} className="flex gap-3">
            <div className="flex-1">
              <AutocompleteInput 
                label="" 
                icon="📍" 
                placeholder={`Destination ${index + 1}`} 
                value={dest} 
                disabled={isOffline}
                onChange={v => {
                  const newDests = [...prefs.destinations];
                  newDests[index] = v;
                  setPrefs({...prefs, destinations: newDests});
                }} 
              />
            </div>
            {prefs.destinations.length > 1 && (
              <button
                type="button"
                disabled={isOffline}
                onClick={() => setPrefs({...prefs, destinations: prefs.destinations.filter((_, i) => i !== index)})}
                className="self-end p-4 bg-slate-800 text-red-500 hover:bg-red-900/20 rounded-2xl transition-all h-[58px] w-[58px] border-2 border-transparent"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          disabled={isOffline}
          onClick={() => setPrefs({...prefs, destinations: [...prefs.destinations, '']})}
          className="w-full py-3 border-2 border-dashed border-slate-800 text-slate-500 hover:border-orange-500/50 hover:text-orange-500 rounded-2xl font-bold text-[10px] transition-all"
        >
          + ADD DESTINATION
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3 ml-1">Kids' Ages</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(AgeGroup).map(age => (
              <button
                key={age}
                type="button"
                disabled={isOffline}
                onClick={() => setPrefs(p => ({
                  ...p,
                  ageGroups: p.ageGroups.includes(age) ? p.ageGroups.filter(a => a !== age) : [...p.ageGroups, age]
                }))}
                className={`px-3 py-3 rounded-xl text-[9px] font-black border-2 transition-all ${
                  prefs.ageGroups.includes(age) ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-800 border-transparent text-slate-400'
                }`}
              >
                {age}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3 ml-1">Must Stops</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(StopType).map(type => (
              <button
                key={type}
                type="button"
                disabled={isOffline}
                onClick={() => setPrefs(p => ({
                  ...p,
                  stopTypes: p.stopTypes.includes(type) ? p.stopTypes.filter(t => t !== type) : [...p.stopTypes, type]
                }))}
                className={`px-3 py-3 rounded-xl text-[9px] font-black border-2 transition-all flex items-center gap-2 ${
                  prefs.stopTypes.includes(type) ? 'bg-white border-white text-slate-900 shadow-xl' : 'bg-slate-800 border-transparent text-slate-400'
                }`}
              >
                <span className="shrink-0">{getStopTypeIcon(type)}</span>
                <span className="truncate">{type}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2 ml-1">Drive Limit (Hrs)</label>
          <input
            type="number"
            min="1"
            className="w-full px-5 py-4 rounded-2xl bg-slate-800 border-2 border-transparent focus:border-orange-500 outline-none font-black text-xs text-slate-100"
            value={prefs.dailyDriveLimit}
            onChange={e => setPrefs({...prefs, dailyDriveLimit: parseInt(e.target.value) || 0})}
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2 ml-1">Break Every (Hrs)</label>
          <input
            type="number"
            step="0.5"
            className="w-full px-5 py-4 rounded-2xl bg-slate-800 border-2 border-transparent focus:border-orange-500 outline-none font-black text-xs text-slate-100"
            value={prefs.maxLegDuration}
            onChange={e => setPrefs({...prefs, maxLegDuration: parseFloat(e.target.value) || 0})}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading || isOffline}
        className={`w-full py-5 ${isOffline ? 'bg-slate-800 text-slate-600' : 'bg-orange-500 text-white shadow-[0_20px_40px_rgba(249,115,22,0.3)] hover:scale-[1.01]'} rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] active:scale-95 transition-all flex items-center justify-center gap-4`}
      >
        {isLoading ? (
          <div className="flex items-center gap-4">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            <span className="animate-pulse">{loadingMessages[loadingStep]}</span>
          </div>
        ) : isOffline ? 'OFFLINE' : '🚀 PLAN TRIP'}
      </button>
    </form>
  );
};

export default TripForm;
