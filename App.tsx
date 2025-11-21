import React, { useState, useMemo, useEffect } from 'react';
import { DimensionUnit, LogisticsSettings, Dimensions, LocationData, CalculationResult, ShipmentOptions } from './types';
import { ZONE_PRICE_MATRIX, getZone } from './data/logisticsData';
import SettingsModal from './components/SettingsModal';
import LocationInput from './components/LocationInput';

const DEFAULT_SETTINGS: LogisticsSettings = {
  volumetricDivisor: 4500,
  minChargeableWeight: 20,
  minFreightAmount: 350,
  fuelSurchargePercent: 25,
  awbCharge: 100,
  cftDensityMin: 7,
  odaPerKg: 8,
  odaMin: 1000,
  handling70to200: 3,
  handlingAbove200: 4,
  codPercent: 1,
  codMin: 50,
  rovPercent: 0.5,
  rovMin: 100,
  csdCharge: 1000,
  timeSpecificPerKg: 3,
  timeSpecificMin: 1500,
  mallDeliveryPerKg: 3,
  mallDeliveryMin: 500,
  reattemptPerKg: 3,
  reattemptMin: 500,
  regionalSurcharge: 5,
  serviceabilityMap: null
};

const DEFAULT_OPTIONS: ShipmentOptions = {
  isCod: false,
  isRov: false,
  isCsd: false,
  isMallDelivery: false,
  isTimeSpecific: false,
  isHoliday: false,
  isReattempt: false
};

// ODA Warning Modal Component
const OdaWarningModal = ({ isOpen, onClose, pickupOda, deliveryOda }: { isOpen: boolean; onClose: () => void; pickupOda: boolean; deliveryOda: boolean }) => {
    if (!isOpen) return null;

    let message = "Pin Code is non-serviceable.";
    if (pickupOda && deliveryOda) {
        message = "Both Pickup and Destination Pin Codes are non-serviceable.";
    } else if (pickupOda) {
        message = "Pickup Pin Code is non-serviceable.";
    } else if (deliveryOda) {
        message = "Destination Pin Code is non-serviceable.";
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-red-200 dark:border-red-900/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-red-500"></div>
                <div className="flex items-start space-x-4">
                    <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full flex-shrink-0">
                         <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Serviceability Alert</h3>
                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                            {message} Extra charges will be added to this shipment.
                        </p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                        OK, I Understand
                    </button>
                </div>
            </div>
        </div>
    );
};

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [settings, setSettings] = useState<LogisticsSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [pickup, setPickup] = useState<LocationData>({ pincode: '', city: '', state: '', loading: false });
  const [drop, setDrop] = useState<LocationData>({ pincode: '', city: '', state: '', loading: false });
  
  const [weight, setWeight] = useState<string>('');
  const [invoiceValue, setInvoiceValue] = useState<string>('');
  const [dimensions, setDimensions] = useState<Dimensions>({ length: 0, breadth: 0, height: 0 });
  const [dimUnit, setDimUnit] = useState<DimensionUnit>(DimensionUnit.CM);
  
  const [options, setOptions] = useState<ShipmentOptions>(DEFAULT_OPTIONS);
  
  // ODA Popup State
  const [showOdaPopup, setShowOdaPopup] = useState(false);
  const [odaAcknowledged, setOdaAcknowledged] = useState(false);

  // Theme Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Reset ODA acknowledgement when pincodes change
  useEffect(() => {
      setOdaAcknowledged(false);
      setShowOdaPopup(false);
  }, [pickup.pincode, drop.pincode]);

  const handleUnitChange = (newUnit: DimensionUnit) => {
    if (newUnit === dimUnit) return;

    // If switching TO CM, we are coming FROM Inch (multiply by 2.54)
    // If switching TO Inch, we are coming FROM CM (divide by 2.54)
    const toCm = newUnit === DimensionUnit.CM;
    const factor = toCm ? 2.54 : (1 / 2.54);

    const convert = (val: number) => {
      if (!val) return 0;
      return parseFloat((val * factor).toFixed(2));
    };

    setDimensions({
      length: convert(dimensions.length),
      breadth: convert(dimensions.breadth),
      height: convert(dimensions.height)
    });
    setDimUnit(newUnit);
  };

  // Main Calculation Logic
  const result: CalculationResult | null = useMemo(() => {
    if (!pickup.state || !drop.state) return null;

    // Determine Zones
    // Priority 1: CSV Data (if available)
    // Priority 2: State Mapping
    let zoneFrom = getZone(pickup.state);
    let zoneTo = getZone(drop.state);
    let pickupOda = false;
    let deliveryOda = false;

    if (settings.serviceabilityMap) {
        // If CSV is loaded, we use strict checking
        const pickupData = settings.serviceabilityMap[pickup.pincode];
        const dropData = settings.serviceabilityMap[drop.pincode];
        
        // Zone Override
        if (pickupData?.zone) zoneFrom = pickupData.zone;
        if (dropData?.zone) zoneTo = dropData.zone;

        // ODA / Serviceability Logic
        // Logic: "If available then proceed, else give popup... Extra charges added"
        
        // Check Pickup
        if (!pickupData || !pickupData.pickupAvailable) {
            pickupOda = true;
        }

        // Check Delivery
        if (!dropData || !dropData.deliveryAvailable) {
            deliveryOda = true;
        }
    }

    if (!zoneFrom || !zoneTo) return null;
    const isOda = pickupOda || deliveryOda;

    const deadWt = parseFloat(weight) || 0;
    const invValue = parseFloat(invoiceValue) || 0;
    
    // 1. Calculate Weight
    let L = dimensions.length;
    let B = dimensions.breadth;
    let H = dimensions.height;

    if (dimUnit === DimensionUnit.INCH) {
        L *= 2.54; B *= 2.54; H *= 2.54;
    }

    const volume = L * B * H;
    const volumetricWt = volume > 0 ? volume / settings.volumetricDivisor : 0;
    
    // Chargeable Weight
    let chargeable = Math.max(deadWt, volumetricWt, settings.minChargeableWeight);
    chargeable = parseFloat(chargeable.toFixed(2));

    // 2. Identify Base Rate
    const rate = ZONE_PRICE_MATRIX[zoneFrom]?.[zoneTo] || 0;
    
    let basicFreight = rate * chargeable;
    
    if (basicFreight < settings.minFreightAmount) {
        basicFreight = settings.minFreightAmount;
    }

    // 4. Surcharges
    
    // Fuel
    const fuelSurcharge = basicFreight * (settings.fuelSurchargePercent / 100);

    // ODA Charge
    let odaCharge = 0;
    if (isOda) {
        odaCharge = Math.max(settings.odaMin, settings.odaPerKg * chargeable);
    }

    // Handling
    let handlingCharge = 0;
    if (chargeable >= 71 && chargeable <= 200) {
        handlingCharge = settings.handling70to200 * chargeable;
    } else if (chargeable > 200) {
        handlingCharge = settings.handlingAbove200 * chargeable;
    }

    // Regional Surcharge
    let regionalCharge = 0;
    const isGuwahati = drop.city.toLowerCase().includes('guwahati') || drop.pincode.startsWith('781');
    const destStateLower = drop.state.toLowerCase();
    
    const isRegionalZone = ['jammu & kashmir', 'himachal pradesh', 'jammu and kashmir'].includes(destStateLower) || 
                           (getZone(destStateLower) === 'NE' && !isGuwahati);

    if (isRegionalZone) {
        regionalCharge = settings.regionalSurcharge * chargeable;
    }

    // Other Surcharges
    let otherSurcharges = 0;
    const warnings: string[] = [];

    if (options.isHoliday) otherSurcharges += 1000;
    if (options.isCsd) otherSurcharges += settings.csdCharge;
    
    if (options.isTimeSpecific) {
        const charge = Math.max(settings.timeSpecificMin, settings.timeSpecificPerKg * chargeable);
        otherSurcharges += charge;
    }
    
    if (options.isMallDelivery) {
        const charge = Math.max(settings.mallDeliveryMin, settings.mallDeliveryPerKg * chargeable);
        otherSurcharges += charge;
    }

    if (options.isReattempt) {
        const charge = Math.max(settings.reattemptMin, settings.reattemptPerKg * chargeable);
        otherSurcharges += charge;
    }

    // COD
    let codCharge = 0;
    if (options.isCod) {
        codCharge = Math.max(settings.codMin, invValue * (settings.codPercent / 100));
    }

    // ROV (Carrier Risk)
    let rovCharge = 0;
    if (options.isRov) {
        rovCharge = Math.max(settings.rovMin, invValue * (settings.rovPercent / 100));
    }

    // AWB
    const awb = settings.awbCharge;

    // Total
    const totalCost = basicFreight + fuelSurcharge + awb + odaCharge + handlingCharge + regionalCharge + otherSurcharges + codCharge + rovCharge;

    return {
      volumetricWeight: parseFloat(volumetricWt.toFixed(2)),
      deadWeight: deadWt,
      chargeableWeight: chargeable,
      zoneFrom: zoneFrom || 'N/A',
      zoneTo: zoneTo || 'N/A',
      baseRate: rate,
      freightCharge: parseFloat(basicFreight.toFixed(2)),
      fuelSurcharge: parseFloat(fuelSurcharge.toFixed(2)),
      awbCharge: awb,
      odaCharge: parseFloat(odaCharge.toFixed(2)),
      handlingCharge: parseFloat(handlingCharge.toFixed(2)),
      regionalCharge: parseFloat(regionalCharge.toFixed(2)),
      otherSurcharges: parseFloat(otherSurcharges.toFixed(2)),
      codCharge: parseFloat(codCharge.toFixed(2)),
      rovCharge: parseFloat(rovCharge.toFixed(2)),
      totalCost: Math.round(totalCost),
      isOda,
      pickupOda,
      deliveryOda,
      warnings
    };
  }, [pickup, drop, weight, dimensions, dimUnit, settings, options, invoiceValue]);

  // Trigger ODA Popup
  useEffect(() => {
      if (result?.isOda && !odaAcknowledged && !showOdaPopup) {
          // Only show if we have full pincodes to avoid premature popping
          if (pickup.pincode.length >= 6 && drop.pincode.length >= 6) {
              setShowOdaPopup(true);
          }
      }
  }, [result?.isOda, odaAcknowledged, showOdaPopup, pickup.pincode, drop.pincode]);

  const toggleOption = (key: keyof ShipmentOptions) => {
      setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-200 pb-20">
      
      <OdaWarningModal 
        isOpen={showOdaPopup} 
        onClose={() => {
            setShowOdaPopup(false);
            setOdaAcknowledged(true);
        }}
        pickupOda={result?.pickupOda || false}
        deliveryOda={result?.deliveryOda || false}
      />

      {/* Header */}
      <header className="bg-brand dark:bg-slate-900 border-b border-brand-700 dark:border-slate-800 sticky top-0 z-30 transition-colors no-print shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-brand-900 font-bold shadow-lg shadow-black/20">
              P
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Proculator</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-brand-200 hover:text-white hover:bg-brand-800 rounded-full transition-colors"
              title="Toggle Dark Mode"
            >
               {isDarkMode ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
               ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
               )}
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-brand-200 hover:text-white hover:bg-brand-800 rounded-full transition-colors"
              title="Settings"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Route */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-lg font-semibold text-brand dark:text-slate-100">Route & Location</h2>
            </div>
            <div className="p-6 space-y-4">
              <LocationInput 
                label="Pickup" 
                value={pickup} 
                onChange={setPickup} 
                hasWarning={result?.pickupOda} 
              />
              <LocationInput 
                label="Destination" 
                value={drop} 
                onChange={setDrop}
                hasWarning={result?.deliveryOda} 
              />
              
              {/* Serviceability Status Indicator */}
              <div className="pt-2 flex justify-end no-print">
                  {settings.serviceabilityMap ? (
                       <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center">
                           <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                           Serviceability Data Loaded
                       </span>
                  ) : (
                      <button onClick={() => setIsSettingsOpen(true)} className="text-xs text-brand-500 hover:underline flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                          Upload Serviceability CSV in Settings
                      </button>
                  )}
              </div>
            </div>
          </section>

          {/* Details */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-lg font-semibold text-brand dark:text-slate-100">Consignment</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Dead Weight</label>
                    <div className="relative">
                    <input 
                        type="number" 
                        value={weight} 
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-medium text-slate-900 dark:text-white"
                        placeholder="0.0"
                    />
                    <span className="absolute right-4 top-3.5 text-slate-400 font-medium">kg</span>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Invoice Value</label>
                    <div className="relative">
                    <span className="absolute left-4 top-3.5 text-slate-400 font-medium">₹</span>
                    <input 
                        type="number" 
                        value={invoiceValue} 
                        onChange={(e) => setInvoiceValue(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-medium text-slate-900 dark:text-white"
                        placeholder="0"
                    />
                    </div>
                </div>
                
                {/* Payment Mode Toggle */}
                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Payment Mode</label>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button 
                            onClick={() => setOptions(prev => ({ ...prev, isCod: false }))}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!options.isCod ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                            Prepaid
                        </button>
                        <button 
                            onClick={() => setOptions(prev => ({ ...prev, isCod: true }))}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${options.isCod ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                            COD
                        </button>
                    </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center mb-1">
                   <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">Dimensions</label>
                   <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg no-print">
                      <button 
                        onClick={() => handleUnitChange(DimensionUnit.CM)}
                        className={`px-2 py-0.5 text-xs font-medium rounded-md transition-all ${dimUnit === DimensionUnit.CM ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500'}`}
                      >cm</button>
                      <button 
                        onClick={() => handleUnitChange(DimensionUnit.INCH)}
                        className={`px-2 py-0.5 text-xs font-medium rounded-md transition-all ${dimUnit === DimensionUnit.INCH ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500'}`}
                      >inch</button>
                   </div>
                   <div className="hidden print:block text-xs font-bold uppercase text-slate-500">
                       Unit: {dimUnit}
                   </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['L','B','H'].map((d, i) => (
                       <input key={d} type="number" placeholder={d} 
                        value={Object.values(dimensions)[i] || ''}
                        onChange={(e) => {
                            const k = Object.keys(dimensions)[i] as keyof Dimensions;
                            setDimensions({...dimensions, [k]: parseFloat(e.target.value)})
                        }}
                        className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-center font-medium text-slate-900 dark:text-white" 
                      />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Additional Options */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-lg font-semibold text-brand dark:text-slate-100">Services & Surcharges</h2>
            </div>
            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                    { k: 'isRov', label: 'Carrier Risk (ROV)' },
                    { k: 'isCsd', label: 'CSD Delivery' },
                    { k: 'isMallDelivery', label: 'Mall Delivery' },
                    { k: 'isTimeSpecific', label: 'Time Specific' },
                    { k: 'isHoliday', label: 'Holiday/Sunday' },
                    { k: 'isReattempt', label: 'Re-attempt' },
                ].map((opt) => (
                    <label key={opt.k} className="flex items-center space-x-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                        <input 
                            type="checkbox" 
                            checked={options[opt.k as keyof ShipmentOptions]} 
                            onChange={() => toggleOption(opt.k as keyof ShipmentOptions)}
                            className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500 dark:bg-slate-800 dark:border-slate-600"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{opt.label}</span>
                    </label>
                ))}
            </div>
          </section>

        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-5" id="result-section">
          <div className="sticky top-24 space-y-6">
            
            {result ? (
                <section className="bg-brand dark:bg-slate-800 text-white rounded-2xl shadow-xl overflow-hidden relative" id="result-card">
                {/* Decorative pattern */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-5 rounded-full blur-xl"></div>
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-accent opacity-10 rounded-full blur-2xl"></div>
                
                {result.isOda && (
                    <div className="bg-red-500/90 text-white text-center text-xs font-bold py-2 px-4 backdrop-blur-sm animate-pulse">
                        ⚠ NON-SERVICEABLE AREA / ODA CHARGES APPLIED
                    </div>
                )}

                <div className="p-8 relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-brand-200 text-sm font-medium uppercase tracking-wider">Total Estimate</h3>
                        <div className="text-right">
                             <span className="text-3xl font-bold text-accent">₹{result.totalCost.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Zone Info */}
                    <div className="flex items-center justify-between text-sm mb-6 bg-white/5 p-3 rounded-lg border border-white/10">
                        <div className="flex flex-col">
                            <span className="text-brand-200 text-xs">From Zone</span>
                            <span className="font-semibold">{result.zoneFrom}</span>
                        </div>
                         <div className="text-brand-300">→</div>
                         <div className="flex flex-col text-right">
                            <span className="text-brand-200 text-xs">To Zone</span>
                            <span className="font-semibold">{result.zoneTo}</span>
                        </div>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between text-brand-100">
                            <span>Chargeable Weight</span>
                            <span className="font-mono text-white">{result.chargeableWeight} kg</span>
                        </div>
                        <div className="flex justify-between text-brand-100 border-b border-brand-700 dark:border-slate-700 pb-2">
                            <span>Base Rate ({result.baseRate}/kg)</span>
                            <span className="font-mono text-white">₹{result.freightCharge}</span>
                        </div>
                        
                        {/* Breakdown Items */}
                        <div className="space-y-2 pt-1 text-xs text-brand-200">
                            <div className="flex justify-between">
                                <span>Fuel Surcharge ({settings.fuelSurchargePercent}%)</span>
                                <span>₹{result.fuelSurcharge}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>AWB Charge</span>
                                <span>₹{result.awbCharge}</span>
                            </div>
                            {result.odaCharge > 0 && (
                                <div className="flex justify-between text-red-300 font-bold">
                                    <span>ODA Surcharge (Non-Serviceable)</span>
                                    <span>₹{result.odaCharge}</span>
                                </div>
                            )}
                            {result.handlingCharge > 0 && (
                                <div className="flex justify-between">
                                    <span>Handling</span>
                                    <span>₹{result.handlingCharge}</span>
                                </div>
                            )}
                            {result.regionalCharge > 0 && (
                                <div className="flex justify-between">
                                    <span>Regional Surcharge</span>
                                    <span>₹{result.regionalCharge}</span>
                                </div>
                            )}
                             {result.codCharge > 0 && (
                                <div className="flex justify-between">
                                    <span>COD Charge</span>
                                    <span>₹{result.codCharge}</span>
                                </div>
                            )}
                            {result.rovCharge > 0 && (
                                <div className="flex justify-between">
                                    <span>ROV / Risk</span>
                                    <span>₹{result.rovCharge}</span>
                                </div>
                            )}
                             {result.otherSurcharges > 0 && (
                                <div className="flex justify-between">
                                    <span>Other Services</span>
                                    <span>₹{result.otherSurcharges}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="px-8 py-4 bg-brand-950/30 dark:bg-slate-950/30 flex justify-between items-center text-xs text-brand-300 dark:text-slate-500">
                    <span>Min Chargeable: {settings.minChargeableWeight}kg</span>
                    <span>Divisor: {settings.volumetricDivisor}</span>
                </div>
                </section>
            ) : (
                 <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Enter details to view rate estimate</p>
                    <p className="text-xs text-slate-400 mt-2">Requires valid Pickup & Destination</p>
                 </div>
            )}

             {/* Helper Info */}
            <div className="bg-brand-50 dark:bg-slate-800 border border-brand-100 dark:border-slate-700 rounded-xl p-4 flex items-start space-x-3 transition-colors no-print">
               <div className="flex-shrink-0 mt-0.5 text-brand-600 dark:text-brand-400">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </div>
               <p className="text-sm text-brand-800 dark:text-brand-200 leading-relaxed">
                 Charges are calculated based on the higher of Volumetric or Dead weight. Regional and ODA surcharges apply automatically based on location.
               </p>
            </div>
          </div>
        </div>

      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onSave={setSettings}
      />
    </div>
  );
}

export default App;