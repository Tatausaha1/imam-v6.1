import React, { useState } from 'react';
import { LockIcon, ArrowRightIcon, Loader2, ShieldCheckIcon, AppLogo, SparklesIcon, EnvelopeIcon } from './Icons';
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
  const [error, setError] = useState('');

  const handleQuickLogin = (role: 'admin' | 'guru' | 'siswa') => {
      setEmail(role);
      setPassword(role);
      toast.info(`Simulasi: Masuk sebagai ${role.toUpperCase()}`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const u = email.trim();
    const p = password.trim();

    if (isMockMode) {
      setTimeout(() => {
        setLoading(false);
        const lowerU = u.toLowerCase();
        if (lowerU === 'admin' && p === 'admin') onLogin(UserRole.ADMIN);
        else if (lowerU === 'guru' && p === 'guru') onLogin(UserRole.GURU);
        else if (lowerU === 'siswa' && p === 'siswa') onLogin(UserRole.SISWA);
        else {
           if (lowerU.includes('admin')) onLogin(UserRole.ADMIN);
           else if (lowerU.includes('guru')) onLogin(UserRole.GURU);
           else if (lowerU.includes('staf')) onLogin(UserRole.STAF);
           else if (lowerU.includes('siswa')) onLogin(UserRole.SISWA);
           else setError('Kredensial tidak valid (Gunakan: admin/guru/siswa)');
        }
      }, 800);
      return;
    }

    try {
        const userCredential = await auth!.signInWithEmailAndPassword(u, p);
        const user = userCredential.user;
        if (user && db) {
            const doc = await db.collection('users').doc(user.uid).get();
            onLogin(doc.data()?.role as UserRole || UserRole.GURU);
        }
    } catch (err: any) {
        setError("Gagal masuk. Silakan periksa kembali email dan password Anda.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-500">
      
      {/* --- LEFT DECORATIVE PANEL (Desktop Only) --- */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 relative items-center justify-center p-12 overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-white/10 rounded-full blur-[100px]"></div>
          
          <div className="relative z-10 text-center max-w-lg">
              <div className="inline-flex mb-8 animate-bounce duration-[3000ms]">
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
            {/* Mobile Logo Only */}
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
                    <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-3 animate-shake">
                        <ShieldCheckIcon className="w-5 h-5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3 relative overflow-hidden group disabled:opacity-70"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="uppercase tracking-widest text-sm">Otentikasi...</span>
                        </>
                    ) : (
                        <>
                            <span className="uppercase tracking-widest text-sm">Masuk Sekarang</span>
                            <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                        </>
                    )}
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