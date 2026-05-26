import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Clock, Download, HardHat, FileText, Check, DollarSign } from 'lucide-react';
import { USER_CSV_URL } from '../lib/constants';
import { fetchSheetRows, appendToSheet } from '../lib/workspace';

type AgentData = {
  UID: string;
  NAME: string;
  PAYPERHR: string;
  NOOFDAY: string;
  NOOFNIGHT: string;
  NOOFSHIFTS: string;
  BASICSALARY: string;
  EPF: string;
  GROSS: string;
  ADVANCE: string;
  MEAL: string;
  NOPAY: string;
  UNIFORM: string;
  FINES: string;
  OTHER: string;
  NETTSALARY: string;
};

export function AgentHub({ token }: { token: string }) {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  // local clock system
  const [clockingState, setClockingState] = useState<'idle' | 'loading' | 'success'>('idle');

  useEffect(() => {
    async function loadData() {
       try {
         const response = await fetch('/api/agents-csv');
         if (!response.ok) {
           throw new Error(`HTTP error! status: ${response.status}`);
         }
         const csvText = await response.text();
         const results = Papa.parse(csvText, { header: true, skipEmptyLines: true });
         setAgents(results.data as AgentData[]);
         if (results.data.length > 0) {
            setSelectedAgentId((results.data[0] as AgentData).UID);
         }
       } catch(e) {
         console.error("Failed to load CSV", e);
       } finally {
         setIsLoading(false);
       }
    }
    loadData();
  }, []);

  const handleClockAction = async (actionType: 'Clock In' | 'Clock Out') => {
      const sheetId = localStorage.getItem('ACCESS_GUARDIAN_SHEET_ID');
      if (!sheetId) {
        alert("Please set up a Master Google Sheet ID in the Settings tab first.");
        return;
      }
      const agent = agents.find(a => a.UID === selectedAgentId);
      if (!agent) return;

      setClockingState('loading');
      try {
         await appendToSheet(sheetId, token, [
           new Date().toISOString(),
           `Agent: ${agent.NAME} (${agent.UID})`,
           actionType,
           "N/A"
         ]);
         setClockingState('success');
         setTimeout(() => setClockingState('idle'), 2000);
      } catch (err: any) {
         alert("Error clocking in: " + err.message);
         setClockingState('idle');
      }
  };

  const selectedAgent = agents.find(a => a.UID === selectedAgentId);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Top controls */}
      <div className="bg-[#111111] p-6 rounded-3xl shadow-sm border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div className="flex-1 max-w-sm">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Select Agent</label>
            <select 
              value={selectedAgentId} 
              onChange={e => setSelectedAgentId(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/10 text-white rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400 font-medium font-mono text-sm"
            >
              {agents.map(a => (
                 <option key={a.UID} value={a.UID}>{a.NAME} ({a.UID})</option>
              ))}
            </select>
         </div>

         <div className="flex items-center gap-3">
             <a href={USER_CSV_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-2xl font-bold transition-colors text-[10px] uppercase tracking-widest">
               <FileText className="w-4 h-4" />
               Source Data
             </a>
             <a href={`https://docs.google.com/spreadsheets/d/${localStorage.getItem('ACCESS_GUARDIAN_SHEET_ID') || ''}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-3 bg-yellow-400/20 hover:bg-yellow-400/30 border border-yellow-500/30 text-yellow-400 rounded-2xl font-bold transition-colors text-[10px] uppercase tracking-widest">
               <Download className="w-4 h-4" />
               Target Sheet
             </a>
         </div>
      </div>

      <div className="flex justify-center mt-8">
         {/* Shift Control */}
         <div className="bg-[#111111] p-8 rounded-3xl shadow-sm border border-white/10 flex flex-col w-full max-w-lg">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-amber-400/10 text-amber-400 p-3 rounded-2xl"><HardHat className="w-6 h-6"/></div>
              <h2 className="text-base font-bold tracking-widest uppercase text-white">Shift Log</h2>
            </div>
            
            <div className="flex-1 flex flex-col justify-center gap-5 mb-8">
               <button 
                 onClick={() => handleClockAction('Clock In')} 
                 disabled={clockingState === 'loading'}
                 className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold tracking-widest uppercase text-sm py-5 rounded-2xl flex justify-center items-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-yellow-400/20"
               >
                 {clockingState === 'loading' ? <Clock className="w-5 h-5 animate-spin" /> : <Clock className="w-5 h-5" />}
                 Clock In
               </button>
               <button 
                 onClick={() => handleClockAction('Clock Out')} 
                 disabled={clockingState === 'loading'}
                 className="w-full bg-[#222222] hover:bg-[#333333] border border-white/10 text-white font-bold tracking-widest uppercase text-sm py-5 rounded-2xl flex justify-center items-center gap-3 transition-all active:scale-[0.98]"
               >
                 Clock Out
               </button>

               {clockingState === 'success' && (
                  <p className="text-emerald-400 font-bold tracking-widest uppercase flex items-center justify-center gap-2 text-[10px] mt-2 animate-in fade-in">
                    <Check className="w-4 h-4" /> Successfully logged to Sheet
                  </p>
               )}
            </div>

            <p className="text-[10px] text-slate-500 mt-auto text-center leading-relaxed uppercase tracking-wide font-medium border-t border-white/10 pt-6">
               Shift cycles are calculated strictly on a 24-hr sequence starting at 07:00 AM each day.
            </p>
         </div>
      </div>
    </div>
  );
}
