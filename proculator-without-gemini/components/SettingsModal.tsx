import React, { useState } from 'react';
import { LogisticsSettings, ServiceabilityData } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: LogisticsSettings;
  onSave: (settings: LogisticsSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<LogisticsSettings>(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'surcharges' | 'services' | 'data'>('general');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [recordCount, setRecordCount] = useState<number>(0);

  React.useEffect(() => {
    setLocalSettings(settings);
    if (settings.serviceabilityMap) {
      setRecordCount(Object.keys(settings.serviceabilityMap).length);
    } else {
      setRecordCount(0);
    }
    setUploadStatus('idle');
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalSettings(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  const handleClearData = () => {
    setLocalSettings(prev => ({ ...prev, serviceabilityMap: null }));
    setRecordCount(0);
    setUploadStatus('idle');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus('processing');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/);
        
        // Expected Headers: PIN CODE, PICK UP STATION, DELIVERY STATE/UT, DELIVERY CITY, PICK UP AVAILABLE, DELIVERY AVAILABLE, Zonal Code
        const headers = lines[0].split(',').map(h => h.trim().toUpperCase().replace(/['"]/g, ''));
        
        const map: Record<string, ServiceabilityData> = {};
        
        // Helper to find index
        const idxPin = headers.findIndex(h => h.includes('PIN') && h.includes('CODE'));
        const idxPickAvail = headers.findIndex(h => h.includes('PICK') && h.includes('AVAILABLE'));
        const idxDelAvail = headers.findIndex(h => h.includes('DELIVERY') && h.includes('AVAILABLE'));
        const idxZone = headers.findIndex(h => h.includes('ZONAL'));
        const idxCity = headers.findIndex(h => h.includes('CITY'));
        const idxState = headers.findIndex(h => h.includes('STATE'));

        if (idxPin === -1) {
            throw new Error("Missing 'PIN CODE' header in CSV");
        }

        let count = 0;
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            // Handle CSV quoting properly (simple split for now, assuming no commas in fields for simplicity based on prompt)
            const cells = lines[i].split(',').map(c => c.trim().replace(/['"]/g, ''));
            
            const pincode = cells[idxPin];
            if (!pincode || !/^\d+$/.test(pincode)) continue;

            const pickAvail = idxPickAvail !== -1 ? cells[idxPickAvail]?.toUpperCase() : 'Y';
            const delAvail = idxDelAvail !== -1 ? cells[idxDelAvail]?.toUpperCase() : 'Y';
            
            map[pincode] = {
                pickupAvailable: pickAvail === 'Y' || pickAvail === 'YES' || pickAvail === 'TRUE',
                deliveryAvailable: delAvail === 'Y' || delAvail === 'YES' || delAvail === 'TRUE',
                zone: idxZone !== -1 ? cells[idxZone] : '',
                city: idxCity !== -1 ? cells[idxCity] : '',
                state: idxState !== -1 ? cells[idxState] : '',
            };
            count++;
        }

        setLocalSettings(prev => ({ ...prev, serviceabilityMap: map }));
        setRecordCount(count);
        setUploadStatus('success');
      } catch (error) {
        console.error("CSV Parse error", error);
        setUploadStatus('error');
      }
      
      // Reset input value to allow selecting the same file again if needed
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(localSettings);
    onClose();
  };

  const tabClass = (tab: string) => 
    `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
      activeTab === tab 
        ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-slate-800' 
        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center flex-shrink-0">
          <h3 className="text-lg font-semibold text-brand-900 dark:text-white">Calculator Configuration</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="flex px-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button onClick={() => setActiveTab('general')} className={tabClass('general')}>General</button>
          <button onClick={() => setActiveTab('surcharges')} className={tabClass('surcharges')}>Surcharges</button>
          <button onClick={() => setActiveTab('services')} className={tabClass('services')}>Value Added</button>
          <button onClick={() => setActiveTab('data')} className={tabClass('data')}>Serviceability Data</button>
        </div>

        <div className="overflow-y-auto p-6 flex-grow">
          <form id="settings-form" onSubmit={handleSubmit} className="space-y-6">
            {activeTab === 'general' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Volumetric Divisor</label>
                  <input type="number" name="volumetricDivisor" value={localSettings.volumetricDivisor} onChange={handleChange} className="input-field" />
                  <p className="text-xs text-slate-400 mt-1">Standard: 4500 (cm)</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Min Chargeable Weight (kg)</label>
                  <input type="number" name="minChargeableWeight" value={localSettings.minChargeableWeight} onChange={handleChange} className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Min Freight Amount (₹)</label>
                  <input type="number" name="minFreightAmount" value={localSettings.minFreightAmount} onChange={handleChange} className="input-field" />
                </div>
                 <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">AWB Charge (₹)</label>
                  <input type="number" name="awbCharge" value={localSettings.awbCharge} onChange={handleChange} className="input-field" />
                </div>
              </div>
            )}

            {activeTab === 'surcharges' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Fuel Surcharge (%)</label>
                    <input type="number" name="fuelSurchargePercent" value={localSettings.fuelSurchargePercent} onChange={handleChange} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Regional Surcharge (₹/kg)</label>
                    <input type="number" name="regionalSurcharge" value={localSettings.regionalSurcharge} onChange={handleChange} className="input-field" />
                    <p className="text-xs text-slate-400 mt-1">Applied to J&K, HP, NE</p>
                  </div>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">ODA (Out of Delivery Area)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label-text">Per KG (₹)</label>
                      <input type="number" name="odaPerKg" value={localSettings.odaPerKg} onChange={handleChange} className="input-field" />
                    </div>
                    <div>
                      <label className="label-text">Minimum (₹)</label>
                      <input type="number" name="odaMin" value={localSettings.odaMin} onChange={handleChange} className="input-field" />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Handling Charges</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label-text">71-200 kg (₹/kg)</label>
                      <input type="number" name="handling70to200" value={localSettings.handling70to200} onChange={handleChange} className="input-field" />
                    </div>
                    <div>
                      <label className="label-text">&gt; 200 kg (₹/kg)</label>
                      <input type="number" name="handlingAbove200" value={localSettings.handlingAbove200} onChange={handleChange} className="input-field" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'services' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">COD</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="label-text">% of Invoice</label><input type="number" name="codPercent" value={localSettings.codPercent} onChange={handleChange} className="input-field" /></div>
                      <div><label className="label-text">Min (₹)</label><input type="number" name="codMin" value={localSettings.codMin} onChange={handleChange} className="input-field" /></div>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">ROV / Risk</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="label-text">% of Invoice</label><input type="number" name="rovPercent" value={localSettings.rovPercent} onChange={handleChange} className="input-field" /></div>
                      <div><label className="label-text">Min (₹)</label><input type="number" name="rovMin" value={localSettings.rovMin} onChange={handleChange} className="input-field" /></div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><label className="label-text">CSD (Fixed)</label><input type="number" name="csdCharge" value={localSettings.csdCharge} onChange={handleChange} className="input-field" /></div>
                  <div><label className="label-text">Mall Del. Min</label><input type="number" name="mallDeliveryMin" value={localSettings.mallDeliveryMin} onChange={handleChange} className="input-field" /></div>
                  <div><label className="label-text">Time Spec. Min</label><input type="number" name="timeSpecificMin" value={localSettings.timeSpecificMin} onChange={handleChange} className="input-field" /></div>
                  <div><label className="label-text">Re-attempt Min</label><input type="number" name="reattemptMin" value={localSettings.reattemptMin} onChange={handleChange} className="input-field" /></div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
                <div className="space-y-6">
                     <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                         <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Serviceability Matrix (CSV)</h4>
                         
                         {recordCount > 0 ? (
                           <div className="bg-white dark:bg-slate-800 rounded-lg border border-green-200 dark:border-green-900 p-4 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm gap-4">
                              <div className="flex items-center space-x-3">
                                  <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg flex-shrink-0">
                                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  </div>
                                  <div>
                                      <h5 className="text-sm font-medium text-slate-900 dark:text-white">Data Loaded Successfully</h5>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">{recordCount.toLocaleString()} pincode entries active.</p>
                                  </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                   <label className="cursor-pointer px-4 py-2 text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 rounded-lg border border-brand-200 dark:border-brand-800/50 transition-colors">
                                      Replace File
                                      <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                                   </label>
                                   <button 
                                      type="button"
                                      onClick={handleClearData}
                                      className="px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg border border-red-200 dark:border-red-800/50 transition-colors"
                                   >
                                      Remove Data
                                   </button>
                              </div>
                           </div>
                         ) : (
                           <>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                Upload CSV with headers: PIN CODE, PICK UP STATION, DELIVERY STATE/UT, DELIVERY CITY, PICK UP AVAILABLE, DELIVERY AVAILABLE, Zonal Code
                            </p>
                            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 flex flex-col items-center justify-center bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <input 
                                    type="file" 
                                    accept=".csv" 
                                    onChange={handleFileUpload} 
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-slate-800 dark:file:text-brand-400 cursor-pointer"
                                />
                                <div className="mt-3 text-sm text-center">
                                    {uploadStatus === 'processing' && <span className="text-blue-500">Processing CSV...</span>}
                                    {uploadStatus === 'error' && <span className="text-red-500">Error parsing CSV. Check format.</span>}
                                    {uploadStatus === 'idle' && <span className="text-slate-400">No file selected</span>}
                                </div>
                            </div>
                           </>
                         )}
                     </div>
                </div>
            )}
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end space-x-3 flex-shrink-0 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="settings-form"
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 shadow-sm"
          >
            Save Configuration
          </button>
        </div>
      </div>
      <style>{`
        .input-field {
          width: 100%;
          padding: 0.5rem 0.75rem;
          background-color: white;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          outline: none;
          transition: all;
        }
        .dark .input-field {
          background-color: #1e293b;
          border-color: #475569;
          color: white;
        }
        .input-field:focus {
          border-color: #5d72ad;
          box-shadow: 0 0 0 2px rgba(93, 114, 173, 0.1);
        }
        .label-text {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          color: #64748b;
          margin-bottom: 0.25rem;
        }
        .dark .label-text {
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default SettingsModal;