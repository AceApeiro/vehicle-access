import React, { useState, useEffect } from 'react';
import { fetchSheetRows } from '../lib/workspace';
import { Database, FileSpreadsheet, Download, Clock, AlertTriangle, CheckCircle, Car, ArrowUpRight } from 'lucide-react';

export function DatabaseView({ token }: { token: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const sheetId = localStorage.getItem('ACCESS_GUARDIAN_SHEET_ID');

  useEffect(() => {
    if (!sheetId) {
      setLoading(false);
      return;
    }
    
    async function getLogs() {
      try {
        const res = await fetchSheetRows(sheetId!, token);
        const rows = res.values || [];
        setLogs(rows.reverse()); // Show newest first
      } catch (err: any) {
         setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    getLogs();
  }, [sheetId, token]);

  const downloadCSV = () => {
    if (logs.length === 0) return;
    
    const header = ['Timestamp', 'Plate Number', 'Category/Status', 'Image Link'];
    const csvContent = [
      header.join(','),
      ...logs.map(row => row.map((cell: any) => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vehicle_logs_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!sheetId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4 mt-20">
        <Database className="w-12 h-12 stroke-1" />
        <p className="font-bold tracking-widest uppercase text-sm">Database Not Configured</p>
        <p className="text-xs">Please configure your Target Remote Database in Settings first.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#111111] rounded-3xl shadow-sm border border-white/10 flex flex-col min-h-[600px] overflow-hidden">
      <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/10 bg-[#0a0a0a]">
        <div className="flex items-center gap-4">
          <div className="bg-yellow-400/20 p-3 rounded-2xl text-yellow-500 border border-yellow-500/30">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-widest uppercase text-white leading-tight">Access Database</h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Vehicle Logs & Entrants</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <button 
             onClick={downloadCSV}
             disabled={logs.length === 0}
             className="flex items-center gap-2 px-4 py-3 bg-[#222222] hover:bg-[#333333] disabled:opacity-50 border border-white/10 text-white rounded-2xl font-bold transition-colors text-[10px] uppercase tracking-widest"
           >
             <Download className="w-4 h-4" />
             Export CSV
           </button>
           <a 
             href={`https://docs.google.com/spreadsheets/d/${sheetId}`} 
             target="_blank" 
             rel="noopener noreferrer" 
             className="flex items-center gap-2 px-4 py-3 bg-yellow-400 hover:bg-yellow-300 border border-yellow-400/50 text-black rounded-2xl font-bold transition-colors text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(250,204,21,0.3)] shadow-yellow-500/20"
           >
             <FileSpreadsheet className="w-4 h-4" />
             Open Sheet <ArrowUpRight className="w-3 h-3 text-black" />
           </a>
        </div>
      </div>

      <div className="flex-1 p-6 sm:p-8 flex flex-col overflow-hidden">
        {loading ? (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
               <Clock className="w-8 h-8 animate-spin text-slate-600" />
               <p className="font-bold tracking-widest uppercase text-xs">Loading Database Logs...</p>
           </div>
        ) : error ? (
           <div className="flex-1 flex flex-col items-center justify-center text-red-400 gap-4">
               <AlertTriangle className="w-8 h-8" />
               <p className="font-bold tracking-widest uppercase text-xs">Error Loading Data</p>
               <p className="text-[10px] bg-red-950/50 p-4 rounded-xl border border-red-900/50 block font-mono max-w-md text-center">{error}</p>
           </div>
        ) : logs.length === 0 ? (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
               <Car className="w-10 h-10 stroke-1" />
               <p className="font-bold tracking-widest uppercase text-xs">No records found</p>
               <p className="text-[10px] tracking-wide">Scanned vehicles will appear here.</p>
           </div>
        ) : (
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="text-[10px] text-slate-500 uppercase border-b border-white/10">
                   <th className="pb-3 font-bold whitespace-nowrap">Timestamp</th>
                   <th className="pb-3 font-bold">Plate</th>
                   <th className="pb-3 font-bold">Category</th>
                   <th className="pb-3 font-bold text-right">Photo</th>
                 </tr>
               </thead>
               <tbody className="text-sm">
                 {logs.map((row, i) => {
                   const [timestamp, plate, status, link] = row;
                   let statusClass = "text-slate-400 bg-slate-400/10";
                   
                   if (status === 'Resident') statusClass = "text-emerald-400 bg-emerald-400/10";
                   else if (status === 'New Entrant') statusClass = "text-red-400 bg-red-400/10";
                   else if (status) statusClass = "text-amber-400 bg-amber-400/10"; // Visitors, Guests, etc.
                   
                   const dateObj = new Date(timestamp);
                   const dateStr = isNaN(dateObj.getTime()) ? timestamp : dateObj.toLocaleString();

                   return (
                     <tr key={i} className="border-b border-white/10 last:border-0 hover:bg-white/5 transition-colors">
                       <td className="py-4 pr-4">
                         <div className="text-slate-300 font-medium text-xs">{dateStr}</div>
                       </td>
                       <td className="py-4 pr-4">
                         <span className="font-mono font-bold text-white bg-[#0a0a0a] px-2 py-1 rounded border border-white/10">{plate || 'UNKNOWN'}</span>
                       </td>
                       <td className="py-4 pr-4">
                         <span className={`px-2 py-1 rounded text-[10px] font-extrabold uppercase tracking-widest border border-white/5 ${statusClass}`}>
                           {status || 'Unknown'}
                         </span>
                       </td>
                       <td className="py-4 text-right">
                         {link ? (
                           <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 font-bold uppercase tracking-widest">
                             View <ArrowUpRight className="w-3 h-3" />
                           </a>
                         ) : (
                           <span className="text-slate-600 text-xs">-</span>
                         )}
                       </td>
                     </tr>
                   )
                 })}
               </tbody>
             </table>
           </div>
        )}
      </div>
    </div>
  );
}
