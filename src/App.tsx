import React, { useState, useEffect } from 'react';
import { Camera, Clock, Settings as SettingsIcon, LogOut, Database } from 'lucide-react';
import { Settings } from './components/Settings';
import { Scanner } from './components/Scanner';
import { AgentHub } from './components/AgentHub';
import { DatabaseView } from './components/DatabaseView';
import { initAuth, googleSignIn, logout, auth } from './lib/firebase';
import { User } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'hub' | 'records' | 'settings'>('hub');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (u, t) => {
        setUser(u);
        setToken(t);
        setIsReady(true);
      },
      () => {
        setUser(null);
        setToken(null);
        setIsReady(true);
      }
    );
    return () => unsubscribe();
  }, []);

  if (!isReady) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">Initializing...</div>;
  }

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setIsReady(true);
      }
    } catch (e) {
      console.warn("Sign in cancelled or failed:", e);
    } finally {
      setIsSigningIn(false);
    }
  };

  if (!user || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="bg-[#111111] border border-white/10 p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <div className="w-32 h-32 flex items-center justify-center mx-auto mb-6">
            <img src="https://i.imgur.com/qMyDS4j.png" alt="Vehicle & Access Scanner" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-yellow-400 tracking-tight">Vehicle & Access Scanner</h1>
          <p className="text-slate-400 mb-8 font-medium">Please sign in to access the vehicle scanner and agent hub.</p>
          <button 
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-slate-800 disabled:text-slate-500 text-black font-bold py-4 px-4 rounded-2xl transition-colors tracking-wide flex items-center justify-center shadow-xl uppercase text-sm tracking-widest"
          >
            {isSigningIn ? 'Signing In...' : 'Sign In with Google'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-slate-200 font-sans">
      <header className="bg-[#111111]/80 border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-10 m-4 rounded-2xl backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10">
            <img src="https://i.imgur.com/qMyDS4j.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white block leading-tight">VEHICLE & ACCESS SCANNER</span>
            <span className="text-[10px] text-yellow-400 uppercase tracking-widest block leading-tight">Security Protocol</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-yellow-400/50" />
          <button onClick={logout} className="p-2 text-slate-400 hover:text-white transition-colors" title="Log out">
             <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {activeTab === 'hub' && <AgentHub token={token} />}
        {activeTab === 'scanner' && <Scanner token={token} />}
        {activeTab === 'records' && <DatabaseView token={token} />}
        {activeTab === 'settings' && <Settings token={token} />}
      </main>

      <nav className="bg-[#111111]/90 border-t border-white/10 sticky bottom-0 z-10 px-6 py-3 flex justify-evenly sm:hidden backdrop-blur-md">
         <NavButton icon={<Clock className="w-6 h-6" />} label="Hub" active={activeTab === 'hub'} onClick={() => setActiveTab('hub')} />
         <NavButton icon={<Camera className="w-6 h-6" />} label="Scan" active={activeTab === 'scanner'} onClick={() => setActiveTab('scanner')} />
         <NavButton icon={<Database className="w-6 h-6" />} label="Data" active={activeTab === 'records'} onClick={() => setActiveTab('records')} />
         <NavButton icon={<SettingsIcon className="w-6 h-6" />} label="Opt" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>

      <nav className="fixed left-6 top-1/2 -translate-y-1/2 hidden sm:flex flex-col gap-4 bg-[#111111] p-3 rounded-3xl shadow-2xl border border-white/10">
         <SidebarButton icon={<Clock className="w-5 h-5" />} label="Hub" active={activeTab === 'hub'} onClick={() => setActiveTab('hub')} />
         <SidebarButton icon={<Camera className="w-5 h-5" />} label="Scan" active={activeTab === 'scanner'} onClick={() => setActiveTab('scanner')} />
         <SidebarButton icon={<Database className="w-5 h-5" />} label="Data" active={activeTab === 'records'} onClick={() => setActiveTab('records')} />
         <SidebarButton icon={<SettingsIcon className="w-5 h-5" />} label="Opt" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 transition-colors ${active ? 'text-yellow-400' : 'text-slate-500 hover:text-slate-300'}`}>
      {icon}
      <span className="text-[10px] uppercase font-bold tracking-widest">{label}</span>
    </button>
  );
}

function SidebarButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 p-4 rounded-2xl transition-all ${active ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-500/30' : 'text-slate-500 hover:text-slate-300 hover:bg-[#222222] border border-transparent'}`}>
      {icon}
      <span className="text-[10px] uppercase font-bold tracking-widest mt-1">{label}</span>
    </button>
  );
}
