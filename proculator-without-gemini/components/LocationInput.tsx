import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LocationData, ServiceabilityData } from '../types';

interface LocationInputProps {
  label: string;
  value: LocationData;
  onChange: (data: LocationData) => void;
  hasWarning?: boolean;
  serviceabilityMap: Record<string, ServiceabilityData> | null;
}

const LocationInput: React.FC<LocationInputProps> = ({ label, value, onChange, hasWarning, serviceabilityMap }) => {
  const [debouncedPincode, setDebouncedPincode] = useState(value.pincode);
  
  // Use a ref to track the current value to avoid stale closures
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  });

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPincode(value.pincode);
    }, 800);

    return () => clearTimeout(timer);
  }, [value.pincode]);

  const handleLookup = useCallback((pincode: string) => {
    if (pincode.length < 3) return; 

    // Access latest state via ref
    const currentState = valueRef.current;
    
    if (serviceabilityMap && serviceabilityMap[pincode]) {
        const data = serviceabilityMap[pincode];
        onChange({ 
          ...currentState, 
          loading: false,
          city: data.city,
          state: data.state
        });
    } else {
        onChange({ ...currentState, loading: false });
    }
  }, [onChange, serviceabilityMap]); 

  // Trigger lookup when debounced pincode changes or map is loaded
  useEffect(() => {
    // Only auto-lookup if we have a pincode and city is missing or pincode changed
    if (debouncedPincode && (!value.city || value.pincode !== debouncedPincode)) {
       handleLookup(debouncedPincode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedPincode, serviceabilityMap]); 

  return (
    <div className="space-y-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm transition-colors">
      <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-100 font-medium">
        {label === 'Pickup' ? (
          <div className="p-1.5 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-md">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
          </div>
        ) : (
           <div className="p-1.5 bg-accent-50 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 rounded-md">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
           </div>
        )}
        <span>{label} Location</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Pincode</label>
          <div className="relative">
            <input
              type="text"
              value={value.pincode}
              onChange={(e) => onChange({ ...value, pincode: e.target.value, city: '', state: '' })}
              className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors text-slate-900 dark:text-white ${
                hasWarning 
                  ? 'border-accent-400 dark:border-accent-400 ring-1 ring-accent-400' 
                  : 'border-slate-200 dark:border-slate-600'
              }`}
              placeholder="Enter code"
            />
            {value.loading && (
              <div className="absolute right-3 top-2.5">
                <svg className="animate-spin h-4 w-4 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </div>
          {hasWarning && (
             <p className="text-[10px] text-accent-600 dark:text-accent-400 mt-1 font-medium">
                 Non-serviceable area
             </p>
          )}
        </div>
        
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">City & State</label>
          <div className="relative">
            <input
              type="text"
              value={value.city ? `${value.city}, ${value.state}` : ''}
              readOnly
              placeholder={serviceabilityMap ? "Auto-detecting..." : "Upload Data CSV"}
              className={`w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg outline-none transition-colors ${
                value.city 
                  ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium' 
                  : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 italic'
              }`}
            />
             {value.city && (
                <div className="absolute right-2 top-2 text-green-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationInput;