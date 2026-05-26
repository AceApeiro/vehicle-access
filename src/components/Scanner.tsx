import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import Papa from 'papaparse';
import { Camera, RefreshCw, CheckCircle, AlertTriangle, CloudRain, Clock } from 'lucide-react';
import { uploadToDrive, fetchSheetRows, appendToSheet, appendResidentToMasterSheet } from '../lib/workspace';

export function Scanner({ token }: { token: string }) {
  const webcamRef = useRef<Webcam>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<{ plate: string, status: 'Resident' | 'Visitor' | 'New Entrant' | 'Error', driveLink?: string } | null>(null);

  const [isRegistering, setIsRegistering] = useState(false);
  const [entrantCategory, setEntrantCategory] = useState('Guest');
  const [apartmentNo, setApartmentNo] = useState('');
  const [towerAddress, setTowerAddress] = useState('Tower 1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
      setIsSubmitting(true);
      try {
          const serialNo = 'R' + Math.floor(Math.random() * 10000);
          const timestamp = new Date().toISOString();
          
          await fetch('/api/register-entrant', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  serialNo,
                  apartmentNo,
                  towerAddress,
                  plate: result?.plate || '',
                  contactNo: '',
                  category: entrantCategory,
                  timestamp
              })
          });

          await appendResidentToMasterSheet(token, [
              serialNo,
              apartmentNo,
              towerAddress,
              result?.plate || '',
              '',
              entrantCategory,
              timestamp
          ]);
          setIsRegistering(false);
          setResult(prev => prev ? { ...prev, status: entrantCategory as any } : null);
      } catch(e: any) {
          console.error("Failed to register:", e);
          alert("Failed to register: " + e.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const captureAndScan = useCallback(async () => {
    if (!webcamRef.current) return;
    const imageBase64 = webcamRef.current.getScreenshot();
    if (!imageBase64) return;

    setIsScanning(true);
    setResult(null);

    try {
      // 1. Send to our backend Gemini route
      const res = await fetch('/api/scan-plate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 })
      });
      if (!res.ok) throw new Error("Failed to scan plate");
      const data = await res.json();
      const plateNumber = data.plateNumber;

      if (plateNumber === "NONE") {
        setResult({ plate: "NONE", status: 'Error' });
        setIsScanning(false);
        return;
      }

      // 2. Upload to Drive
      const driveInfo = await uploadToDrive(imageBase64, `Plate_${plateNumber}_${Date.now()}.jpg`, token);

      // 3. Look up in Master Vehicles CSV
      let status: 'Resident' | 'Visitor' | 'New Entrant' | string = 'New Entrant';
      try {
        const vRes = await fetch('/api/vehicles-csv');
        if (vRes.ok) {
          const csvText = await vRes.text();
          const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
          const matchedRow = parsed.data.find((row: any) => {
            const vNo = row['VEHICLE NO'] || '';
            return vNo.replace(/[^A-Z0-9]/g, '') === plateNumber;
          });
          if (matchedRow) {
            status = matchedRow['CATEGORY'] || 'Resident';
          }
        }
      } catch (e) {
        console.warn("Failed to check vehicles CSV", e);
      }

      // 4. Look up in User's Spreadsheet for previous visitors and log entry
      const sheetId = localStorage.getItem('ACCESS_GUARDIAN_SHEET_ID');
      
      if (sheetId) {
        try {
          if (status === 'New Entrant') {
            const rowsRes = await fetchSheetRows(sheetId, token);
            const rows = rowsRes.values || [];
            
            const existingRow = rows.find((row: any[]) => row[1] === plateNumber);
            if (existingRow) {
              const savedType = existingRow[2];
              status = savedType && savedType !== 'New Entrant' ? savedType : 'Visitor';
            }
          }
           
          // write back
          await appendToSheet(sheetId, token, [
            new Date().toISOString(),
            plateNumber,
            status,
            driveInfo.link
          ]);

        } catch (e) {
          console.error("Sheet error", e);
          // if sheet fails, still continue showing plate
        }
      }

      setResult({ plate: plateNumber, status, driveLink: driveInfo.link });
      setIsRegistering(false);
      setApartmentNo('');
      setTowerAddress('Tower 1');
    } catch (err) {
      console.error(err);
      setResult({ plate: "Error", status: 'Error' });
    } finally {
      setIsScanning(false);
    }
  }, [token]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-4 gap-6 min-h-[600px] flex-1">
      <div className="lg:col-span-8 lg:row-span-4 bg-black rounded-3xl relative overflow-hidden border border-slate-800 shadow-2xl flex flex-col group">
        <h2 className="absolute top-4 left-4 z-10 text-[10px] font-bold text-slate-400 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 uppercase tracking-widest">
           <Camera className="w-3 h-3" /> Live Feed
        </h2>
        
        <div className="relative flex-1 w-full bg-slate-900 border-b border-slate-800/80">
            {/* @ts-ignore - react-webcam type definitions are strict on optional props */}
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              width="100%"
              videoConstraints={{ facingMode: "environment" }}
              className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-80"
            />
            
            {/* HUD Overlay */}
            <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #333 0px, #333 1px, transparent 1px, transparent 2px)', backgroundSize: '100% 4px' }}></div>
            <div className="absolute inset-0 border-2 border-yellow-400/20 m-6 rounded-xl border-dashed pointer-events-none transition-all duration-700" />
            
            <div className="absolute top-4 right-4 bg-red-600/90 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.5)]">
               <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
               REC
            </div>
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 hidden sm:block">
              <p className="text-[10px] text-slate-300 uppercase">CAMERA ID: CAM-01-N</p>
              <p className="text-[10px] text-slate-300 uppercase">ENGINE: AI-V2.4</p>
            </div>
        </div>

        <div className="p-4 sm:p-6 shrink-0 bg-slate-950">
          <button 
            onClick={captureAndScan}
            disabled={isScanning}
            className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-slate-800 disabled:text-slate-500 text-black font-bold py-4 px-4 rounded-2xl transition-colors flex items-center justify-center gap-3 tracking-widest shadow-[0_0_20px_rgba(250,204,21,0.3)] shadow-yellow-400/20"
          >
            {isScanning ? (
               <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
               <Camera className="w-5 h-5" />
            )}
            {isScanning ? 'SCANNING NETWORK...' : 'SCAN VEHICLE PLATE'}
          </button>
        </div>
      </div>

      <div className={`lg:col-span-4 lg:row-span-4 flex flex-col gap-6 p-6 rounded-3xl shadow-lg border relative overflow-hidden transition-all duration-500 ${result && result.status !== 'Error' ? 'bg-[#1a1a1a] border-yellow-400/30' : 'bg-[#111111] border-white/10'}`}>
        {(result && result.status !== 'Error') && <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-yellow-400/5 rounded-full blur-2xl"></div>}
        <h2 className={`text-xs font-bold uppercase tracking-widest mb-4 ${result && result.status !== 'Error' ? 'text-yellow-400' : 'text-slate-500'}`}>Current Detection</h2>
        
        {(!result && !isScanning) && (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600/50 gap-3">
             <CloudRain className="w-12 h-12 stroke-1" />
             <p className="text-sm font-medium uppercase tracking-widest">Awaiting Scan</p>
          </div>
        )}

        {isScanning && (
          <div className="flex-1 flex flex-col items-center justify-center text-yellow-400 gap-4">
             <RefreshCw className="w-10 h-10 animate-spin" />
             <p className="text-xs font-mono tracking-widest text-yellow-400 uppercase">Processing Frame...</p>
          </div>
        )}

        {result && (
           <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
             
             {result.status === 'Error' ? (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-2">Detected Plate</h3>
                  <div className="text-4xl font-mono font-bold text-white tracking-tight mb-8">
                    {result.plate}
                  </div>
                  <div className="inline-flex items-center gap-2 bg-red-900/30 border border-red-500/30 text-red-400 px-4 py-2 rounded-full text-xs font-bold uppercase">
                    <AlertTriangle className="w-4 h-4" />
                    No Plate Detected
                  </div>
                </div>
             ) : (
                <>
                  <div className="flex flex-col items-center justify-center py-6">
                    <p className="text-4xl md:text-5xl font-mono font-bold text-white mb-2 tracking-tighter text-center">{result.plate}</p>
                    <span className="bg-white/20 text-white text-[10px] md:text-xs font-bold px-4 py-1.5 rounded-full border border-white/20">PLATE DETECTED</span>
                  </div>

                  <div className="mt-4 border-t border-white/10 pt-6">
                    <div className="flex justify-between items-center mb-6">
                      <p className="text-slate-400 text-sm font-medium">Classification</p>
                      
                      {result.status === 'Resident' && <span className="bg-emerald-400 text-slate-900 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase">RESIDENT</span>}
                      {result.status !== 'Resident' && result.status !== 'New Entrant' && <span className="bg-amber-400 text-slate-900 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase">{result.status}</span>}
                      {result.status === 'New Entrant' && <span className="bg-red-400 text-slate-900 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase">NEW ENTRANT</span>}
                      
                    </div>
                    {result.status !== 'New Entrant' && (
                      <div className="flex justify-between items-center text-sm">
                        <p className="text-slate-400 font-medium">Clearance</p>
                        <p className="text-emerald-400 font-bold uppercase text-[10px] tracking-widest">Auto-Approved</p>
                      </div>
                    )}
                     {result.status === 'New Entrant' && !isRegistering && (
                      <div className="flex justify-between items-center text-sm">
                        <p className="text-slate-400 font-medium">Clearance</p>
                        <p className="text-yellow-400 font-bold uppercase text-[10px] tracking-widest">ID Check Req.</p>
                      </div>
                    )}
                  </div>

                  {result.status === 'New Entrant' && (
                    <div className="mt-4 border-t border-white/10 pt-6">
                      {!isRegistering ? (
                         <button 
                           onClick={() => setIsRegistering(true)}
                           className="w-full bg-[#222222] hover:bg-[#333333] text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                         >
                           + Register to Database
                         </button>
                      ) : (
                         <div className="flex flex-col gap-3">
                           <select 
                             value={entrantCategory} 
                             onChange={e => setEntrantCategory(e.target.value)} 
                             className="bg-[#0a0a0a] text-white px-4 py-3 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-yellow-400 font-bold uppercase tracking-widest"
                           >
                             <option value="Guest">Guest</option>
                             <option value="Delivery Personnel">Delivery Personnel</option>
                             <option value="Supplier">Supplier</option>
                           </select>
                           <input type="text" placeholder="Apartment No (e.g. APT 26)" value={apartmentNo} onChange={e => setApartmentNo(e.target.value)} className="bg-[#0a0a0a] text-white px-4 py-3 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-yellow-400" />
                           <select 
                             value={towerAddress} 
                             onChange={e => setTowerAddress(e.target.value)} 
                             className="bg-[#0a0a0a] text-white px-4 py-3 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-yellow-400 font-bold uppercase tracking-widest"
                           >
                             <option value="Tower 1">Tower 1</option>
                             <option value="Tower 2">Tower 2</option>
                             <option value="Tower 3">Tower 3</option>
                             <option value="Tower 4">Tower 4</option>
                             <option value="Tower 5">Tower 5</option>
                           </select>
                           <div className="flex gap-3 mt-2">
                             <button onClick={() => setIsRegistering(false)} className="flex-1 bg-[#222222] hover:bg-[#333333] text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-colors">Cancel</button>
                             <button onClick={handleRegister} disabled={isSubmitting || !apartmentNo || !towerAddress} className="flex-[2] bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-900/50 disabled:text-yellow-600 text-black font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                               {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Save
                             </button>
                           </div>
                         </div>
                      )}
                    </div>
                  )}
                </>
             )}

             <div className="mt-auto flex flex-col sm:flex-row items-center justify-center gap-3 pt-8">
                <button 
                  onClick={() => setResult(null)}
                  className={`flex-1 w-full py-4 rounded-2xl shadow-xl font-bold text-xs uppercase tracking-widest transition-colors ${result.status === 'Error' ? 'bg-[#222222] text-slate-300 hover:bg-[#333333]' : 'bg-yellow-400 text-black hover:bg-yellow-300'}`}
                >
                  Clear Entry
                </button>
                {result.driveLink && (
                  <a 
                    href={result.driveLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 py-4 px-4 rounded-2xl shadow-xl font-bold text-[10px] uppercase tracking-widest transition-colors ${result.status === 'Error' ? 'bg-[#222222] text-slate-300 hover:bg-[#333333] border border-transparent' : 'bg-[#222222] text-slate-300 hover:bg-[#333333] border border-white/10'}`}
                  >
                     Source ↗
                  </a>
                )}
             </div>
           </div>
        )}
      </div>
    </div>
  );
}
