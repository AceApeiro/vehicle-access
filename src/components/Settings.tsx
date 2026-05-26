import React, { useState, useEffect } from 'react';
import { Database, Save, Check } from 'lucide-react';
import { createSpreadsheet } from '../lib/workspace';

export function Settings({ token }: { token: string }) {
  const [sheetId, setSheetId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedId = localStorage.getItem('ACCESS_GUARDIAN_SHEET_ID');
    if (savedId) setSheetId(savedId);
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    localStorage.setItem('ACCESS_GUARDIAN_SHEET_ID', sheetId);
    setTimeout(() => {
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 500);
  };

  const handleCreate = async () => {
    if (!window.confirm("This will create a new Spreadsheet in your Google Drive. Continue?")) return;
    setIsCreating(true);
    try {
      const data = await createSpreadsheet(token);
      setSheetId(data.id);
      localStorage.setItem('ACCESS_GUARDIAN_SHEET_ID', data.id);
      alert(`Created sheet successfully! Opening in new tab...`);
      window.open(data.url, '_blank');
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-[#111111] p-6 sm:p-8 rounded-3xl shadow-sm border border-white/10">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-[#222222] p-3 rounded-2xl text-yellow-400 relative overflow-hidden border border-white/10">
          <Database className="w-6 h-6 relative z-10" />
          <div className="absolute inset-0 bg-yellow-500/10 blur-xl"></div>
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-widest uppercase text-white">System Integration</h2>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">Link Google Workspace Data Storage</p>
        </div>
      </div>

      <div className="space-y-6 max-w-xl">
        <div className="p-6 bg-[#0a0a0a] rounded-3xl border border-white/10">
          <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-2">Target Remote Database</h3>
          <p className="text-[10px] text-slate-500 font-bold tracking-wide uppercase leading-relaxed mb-6">
            Enter the ID of the Google Sheet where vehicle logs and agent shifts will be stored.
            Alternatively, provision a fresh sheet automatically.
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Google Sheet Document ID</label>
              <input 
                 type="text" 
                 value={sheetId}
                 onChange={e => setSheetId(e.target.value)}
                 placeholder="e.g. 1BxiMVs0XRX5nZYz..."
                 className="w-full px-4 py-4 bg-[#111111] border border-white/10 rounded-2xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all text-slate-300 font-mono text-sm shadow-inner"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button 
                onClick={handleSave}
                disabled={isSaving || !sheetId}
                className="w-full sm:w-auto flex justify-center items-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:bg-[#222222] disabled:text-slate-600 text-black px-6 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(250,204,21,0.3)] shadow-yellow-500/10"
              >
                {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? 'Saved!' : 'Save ID'}
              </button>

              <div className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">or</div>

              <button 
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full sm:w-auto flex justify-center items-center gap-2 bg-[#222222] hover:bg-[#333333] border border-white/10 text-white px-6 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-colors disabled:opacity-50 shadow-lg"
              >
                {isCreating ? 'Provisioning...' : 'Provision New Document'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
