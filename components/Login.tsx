import React, { useState, useEffect } from 'react';
import { LockIcon, ArrowRightIcon, Loader2, ShieldCheckIcon, AppLogo, SparklesIcon, EnvelopeIcon, ArrowPathIcon } from './Icons';
import { UserRole } from '../types';
import { auth, db, isMockMode } from '../services/firebase';
import { toast } from 'sonner';

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [syncPhase, setSyncPhase] = useState<'auth' | 'data'>('auth');
  const [error, setError] = useState('');

  const loadingMessages = [
    "Mengautentikasi Sinyal...",
    "Mendekripsi Kredensial...",
    "Sinkronisasi Cloud Data...",
    "Menghubungkan Core Engine...",
    "Mempersiapkan Workspace..."
  ];

  const dataSyncMessages = [
    "Sinkronisasi Data Siswa...",
    "Memuat Direktori Guru...",
    "Memetakan Data Kelas...",
    "Konfigurasi Tahun Akademik...",
    "Finishing: Membangun Dashboard..."
  ];

  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingMessages.length);
      }, 700);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const preloadAllData = async () => {
    if (isMockMode) {
        // Simulate progress for UX consistency
        for (let i = 0; i < 5; i++) {
            setLoadingStep(i);
            await new Promise(r => setTimeout(r, 400));
        }
        return;
    }

    if (!db) return;

    try {
        setLoadingStep(0);
        // Pre-fetch critical collections to leverage Firestore local persistence
        // 1. Students
        setLoadingStep(0);
        await db.collection('students').where('status', '==', 'Aktif').limit(500).get();
        
        // 2. Teachers
        setLoadingStep(1);
        await db.collection('teachers').get();
        
        // 3. Classes
        setLoadingStep(2);
        await db.collection('classes').get();
        
        // 4. Settings & Academic Years
        setLoadingStep(3);
        await db.collection('academic_years').get();
        await db.collection('settings').doc('madrasahInfo').get();
        
        setLoadingStep(4);
        await new Promise(r => setTimeout(r, 300));
    } catch (e) {
        console.warn("Preload warning (non-critical):", e);
    }
  };

  const handleQuickLogin = (role: 'admin' | 'guru' | 'siswa') => {
      setEmail(role);
      setPassword(role);
      toast.info(`Simulasi: Masuk sebagai ${role.toUpperCase()}`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSyncPhase('auth');
    setError('');

    const u = email.trim();
    const p = password.trim();

    if (isMockMode) {
      setTimeout(async () => {
        const lowerU = u.toLowerCase();
        let detectedRole: UserRole | null = null;

        if (lowerU === 'admin' && p === 'admin') detectedRole = UserRole.ADMIN;
        else if (lowerU === 'guru' && p === 'guru') detectedRole = UserRole.GURU;
        else if (lowerU === 'siswa' && p === 'siswa') detectedRole = UserRole.SISWA;
        else if (lowerU.includes('admin')) detectedRole = UserRole.ADMIN;
        else if (lowerU.includes('guru')) detectedRole = UserRole.GURU;
        else if (lowerU.includes('staf')) detectedRole = UserRole.STAF;
        else if (lowerU.includes('siswa')) detectedRole = UserRole.SISWA;

        if (detectedRole) {
            setSyncPhase('data');
            await preloadAllData();
            onLogin(detectedRole);
        } else {
            setLoading(false);
            setError('Kredensial tidak valid (Gunakan: admin/guru/siswa)');
        }
      }, 1500); 
      return;
    }

    try {
        const userCredential = await auth!.signInWithEmailAndPassword(u, p);
        const user = userCredential.user;
        if (user && db) {
            setSyncPhase('data');
            // Heavy lifting: Load all data while showing progress
            await preloadAllData();
            
            const doc = await db.collection('users').doc(user.uid).get();
            onLogin(doc.data()?.role as UserRole || UserRole.GURU);
        }
    } catch (err: any) {
        setLoading(false);
        setError("Gagal masuk. Silakan periksa kembali email dan password Anda.");
    }
  };

  return (
    <div className="flex h-full w-full bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-500 relative overflow-hidden">
      
      {/* --- DATA-SYNC LOADING OVERLAY --- */}
      {loading && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 dark:bg-[#020617]/98 backdrop-blur-2xl animate-in fade-in duration-700 overflow-hidden">
              
              <div className="absolute inset-0 pointer-events-none opacity-20">
                  {[...Array(20)].map((_, i) => (
                      <div 
                        key={i}
                        className="absolute text-[8px] font-mono text-indigo-500 animate-[float-up_4s_linear_infinite]"
                        style={{ 
                            left: `${Math.random() * 100}%`, 
                            animationDelay: `${Math.random() * 5}s`,
                            opacity: Math.random() * 0.5 + 0.2
                        }}
                      >
                        {syncPhase === 'auth' ? '010110' : 'FETCH_DATA'}
                      </div>
                  ))}
              </div>

              <div className="relative mb-12 flex items-center justify-center">
                  <div className="absolute w-44 h-44 border-[1px] border-indigo-500/20 rounded-full"></div>
                  <div className="absolute w-44 h-44 border-t-2 border-indigo-500 rounded-full animate-spin [animation-duration:3s]"></div>
                  <div className="absolute w-36 h-36 border-b-2 border-blue-500 rounded-full animate-spin [animation-duration:2s] [animation-direction:reverse]"></div>
                  
                  <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
                  
                  <div className="w-24 h-24 relative z-10 animate-[bounce_3s_infinite_ease-in-out]">
                      <AppLogo className="w-full h-full drop-shadow-[0_0_20px_rgba(79,70,229,0.4)]" />
                  </div>
              </div>
              
              <div className="flex flex-col items-center gap-6 max-w-xs text-center">
                  <div className="space-y-2">
                      <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-[0.4em] animate-pulse">
                          {syncPhase === 'auth' ? loadingMessages[loadingStep] : dataSyncMessages[loadingStep]}
                      </p>
                      <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest opacity-60">
                          {syncPhase === 'auth' ? 'Securing your session...' : 'Synchronizing local cache for offline speed...'}
                      </p>
                  </div>
                  
                  <div className="w-56 h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600 transition-all duration-700 ease-in-out relative" 
                        style={{ width: `${((loadingStep + 1) / 5) * 100}%` }}
                      >
                          <div className="absolute top-0 right-0 h-full w-4 bg-white/40 blur-sm"></div>
                      </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-white/5 w-full justify-center">
                    <div className="flex items-center gap-1.5 opacity-40">
                        <ShieldCheckIcon className="w-3 h-3 text-indigo-500" />
                        <span className="text-[7px] font-black uppercase tracking-widest text-slate-500">AES-256</span>
                    </div>
                    <div className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                    <div className="flex items-center gap-1.5 opacity-40">
                        <ArrowPathIcon className="w-3 h-3 text-blue-500 animate-spin" />
                        <span className="text-[7px] font-black uppercase tracking-widest text-slate-500">Live Sync</span>
                    </div>
                  </div>
              </div>

              <style>{`
                @keyframes float-up {
                    0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
                    10% { opacity: 0.5; }
                    90% { opacity: 0.5; }
                    100% { transform: translateY(-20vh) rotate(360deg); opacity: 0; }
                }
              `}</style>
          </div>
      )}

      {/* --- LEFT DECORATIVE PANEL (Desktop Only) --- */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 relative items-center justify-center p-12 overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-white/10 rounded-full blur-[100px]"></div>
          
          <div className="relative z-10 text-center max-w-lg">
              <div className="inline-flex mb-8 animate-[bounce_4s_infinite_ease-in-out]">
                <AppLogo className="w-40 h-40" />
              </div>
              <h1 className="text-5xl font-black text-white mb-6 leading-tight tracking-tight">
                  Sistem Informasi <br/> Akademik Madrasah
              </h1>
              <p className="text-indigo-100 text-lg opacity-80 leading-relaxed font-medium">
                  Selamat datang di platform digital MAN 1 Hulu Sungai Tengah. Akses presensi, nilai, dan layanan administrasi dalam satu pintu.
              </p>
              
              <div className="mt-12 flex justify-center gap-8">
                  <div className="text-white">
                      <p className="text-2xl font-bold">800+</p>
                      <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">Siswa Aktif</p>
                  </div>
                  <div className="w-px h-10 bg-white/20"></div>
                  <div className="text-white">
                      <p className="text-2xl font-bold">50+</p>
                      <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">Tenaga Pendidik</p>
                  </div>
              </div>
          </div>
      </div>

      {/* --- RIGHT LOGIN PANEL --- */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 lg:hidden">
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-indigo-500/5 rounded-full blur-[80px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-500/5 rounded-full blur-[80px]"></div>
        </div>

        <div className="w-full max-sm z-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="lg:hidden text-center">
                <div className="inline-flex mb-4">
                    <AppLogo className="w-24 h-24" />
                </div>
            </div>

            <div className="text-center lg:text-left">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                     <span className="text-indigo-600 dark:text-indigo-400">IMAM</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-bold tracking-wider mt-1 opacity-80 uppercase">
                    Pusat Layanan Digital Madrasah
                </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-4">
                    <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1 group-focus-within:text-indigo-500 transition-colors">Surel / ID Pengguna</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                <EnvelopeIcon className="w-5 h-5" />
                            </div>
                            <input 
                                type="text" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm shadow-sm"
                                placeholder="Masukkan email atau username"
                                required
                            />
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1 group-focus-within:text-indigo-500 transition-colors">Kata Sandi</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                <LockIcon className="w-5 h-5" />
                            </div>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm shadow-sm"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button type="button" className="text-xs font-bold text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 hover:underline underline-offset-4 decoration-indigo-300">
                        Lupa kata sandi?
                    </button>
                </div>

                {error && (
                    <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-3 animate-[shake_0.5s_ease-in-out]">
                        <ShieldCheckIcon className="w-5 h-5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3 relative overflow-hidden group disabled:opacity-70"
                >
                    <span className="uppercase tracking-widest text-sm">Masuk Sekarang</span>
                    <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </button>
            </form>

            {isMockMode && (
                <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 text-center uppercase tracking-[0.25em] mb-4">Akses Cepat Pengembang</p>
                    <div className="flex gap-2 flex-wrap justify-center">
                        <button onClick={() => handleQuickLogin('admin')} className="px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-rose-100 transition-colors border border-rose-100 dark:border-rose-900/30">Admin</button>
                        <button onClick={() => handleQuickLogin('guru')} className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-colors border border-indigo-100 dark:border-indigo-900/30">Guru</button>
                        <button onClick={() => handleQuickLogin('siswa')} className="px-4 py-2 bg-teal-50 dark:bg-teal-900/20 text-teal-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-teal-100 transition-colors border border-teal-100 dark:border-teal-900/30">Siswa</button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Login;