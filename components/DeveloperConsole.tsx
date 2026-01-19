
import React, { useState, useEffect } from 'react';
import { db, auth, isMockMode } from '../services/firebase';
import Layout from './Layout';
import { 
  CommandLineIcon, ArrowPathIcon, UsersGroupIcon, TrashIcon, PlusIcon,
  UserIcon, Search, KeyIcon, BanknotesIcon, RectangleStackIcon,
  PencilIcon, ShieldCheckIcon, XCircleIcon, SaveIcon, Loader2, SparklesIcon
} from './Icons';
import { toast } from 'sonner';

interface DeveloperConsoleProps {
  onBack: () => void;
}

const DeveloperConsole: React.FC<DeveloperConsoleProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'database'>('overview');
  const [stats, setStats] = useState<Record<string, number>>({});
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [logs, setLogs] = useState<string[]>([]);
  const [loadingAction, setLoadingAction] = useState(false);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const checkAllCollections = async () => {
    setConnectionStatus('checking');
    if (!db) return;
    try {
        const collections = ['users', 'students', 'teachers', 'classes', 'attendance', 'letters', 'schedules', 'academic_years'];
        const newStats: Record<string, number> = {};
        
        for (const col of collections) {
            const snap = await db.collection(col).limit(1).get();
            newStats[col] = snap.size; // Just checking if they exist
            // Real size fetch in background or omitted for performance
        }
        
        setStats(newStats);
        setConnectionStatus('connected');
        addLog("Database Infrastructure Verified: 8 Collections Online.");
    } catch (e: any) {
        setConnectionStatus('error');
        addLog(`DB Check Error: ${e.message}`);
    }
  };

  const handleMasterConnect = async () => {
    if (!db) return;
    if (!window.confirm("MASTER CONNECT: Inisialisasi struktur database lengkap dan seed data awal jika kosong?")) return;
    
    setLoadingAction(true);
    addLog("Master Connection Protocol Started...");

    try {
        const batch = db.batch();
        let ops = 0;

        // 1. Academic Year Seed
        const acYear = await db.collection('academic_years').limit(1).get();
        if (acYear.empty) {
            batch.set(db.collection('academic_years').doc('2024-2025-GANJIL'), {
                name: '2024/2025', semester: 'Ganjil', isActive: true, startDate: '2024-07-15', endDate: '2024-12-20'
            });
            addLog("Seeded: Default Academic Year.");
            ops++;
        }

        // 2. Madrasah Info Seed
        const info = await db.collection('settings').doc('madrasahInfo').get();
        if (!info.exists) {
            batch.set(db.collection('settings').doc('madrasahInfo'), {
                nama: 'MAN 1 HULU SUNGAI TENGAH',
                nsm: '131163070001', npsn: '30315354',
                alamat: 'Jl. H. Damanhuri No. 12 Barabai',
                kepalaNama: 'Drs. H. Syamsul Arifin', kepalaNip: '196808171995031002'
            });
            addLog("Seeded: Madrasah Identity.");
            ops++;
        }

        if (ops > 0) {
            await batch.commit();
            toast.success("Database Master Connected & Initialized!");
        } else {
            toast.info("Database Structure Already Intact.");
        }
        checkAllCollections();
    } catch (e: any) {
        addLog(`Master Connect Failed: ${e.message}`);
        toast.error("Gagal menghubungkan master database.");
    } finally {
        setLoadingAction(false);
    }
  };

  useEffect(() => { checkAllCollections(); }, []);

  return (
    <Layout title="Developer Console" subtitle="System Core Control" icon={CommandLineIcon} onBack={onBack}>
      <div className="p-4 lg:p-6 pb-24 space-y-6">
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit mb-4">
              <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500'}`}>System Health</button>
              <button onClick={() => setActiveTab('database')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'database' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500'}`}>Structure</button>
          </div>

          {activeTab === 'overview' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className={`p-6 rounded-[2rem] border flex items-center justify-between ${connectionStatus === 'connected' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${connectionStatus === 'connected' ? 'bg-white/20' : 'bg-slate-200'}`}>
                            <ShieldCheckIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-black text-sm uppercase tracking-tight">Main Database Connection</h4>
                            <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{connectionStatus === 'connected' ? 'Cloud Firestore Synchronized' : 'Reconnecting...'}</p>
                        </div>
                    </div>
                    <button onClick={handleMasterConnect} disabled={loadingAction} className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                        {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sync All Tables"}
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Fixed: Cast Object.entries to [string, number][] to avoid 'unknown' operator error */}
                    {(Object.entries(stats) as [string, number][]).map(([key, val]) => (
                        <div key={key} className="bg-white dark:bg-[#151E32] p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{key}</p>
                            <div className="flex items-center justify-between mt-2">
                                <p className="text-xl font-black text-slate-800 dark:text-white">{val > 0 ? 'Active' : 'Empty'}</p>
                                <div className={`w-2 h-2 rounded-full ${val > 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-slate-950 rounded-[2rem] p-6 font-mono text-[10px] h-64 overflow-y-auto border border-slate-800 shadow-inner">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2 sticky top-0 bg-slate-950">
                        <span className="text-indigo-400 font-black uppercase tracking-widest">Terminal Output</span>
                        <button onClick={() => setLogs([])} className="text-slate-600 hover:text-slate-300">Clear</button>
                    </div>
                    {logs.map((log, i) => <p key={i} className="text-slate-400 mb-1 leading-relaxed">{log}</p>)}
                </div>
            </div>
          ) : (
              <div className="py-20 text-center bg-white dark:bg-[#151E32] rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                  <SparklesIcon className="w-12 h-12 text-slate-100 dark:text-slate-700 mx-auto mb-4" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Database Schema Browser Locked</p>
                  <p className="text-[8px] text-slate-500 mt-2">Security protocols prevent direct schema browsing from this view.</p>
              </div>
          )}
      </div>
    </Layout>
  );
};

export default DeveloperConsole;
