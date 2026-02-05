
import React, { useState, useEffect } from 'react';
import { LockIcon, ArrowRightIcon, Loader2, ShieldCheckIcon, AppLogo, EnvelopeIcon, ArrowPathIcon } from './Icons';
import { UserRole } from '../types';
import { auth, db, isMockMode } from '../services/firebase';
import { toast } from 'sonner';

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('dgt.3652@gmail.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const mobileBgImage = "https://lh3.googleusercontent.com/d/1o8KomVWrJbSQi4m3JdJO1WbbeZHWyrrW";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const u = email.trim();
    const p = password.trim();

    if (isMockMode) {
      setTimeout(() => {
        const lowerU = u.toLowerCase();
        let detectedRole = UserRole.GURU;
        if (lowerU.includes('admin')) detectedRole = UserRole.ADMIN;
        else if (lowerU.includes('siswa')) detectedRole = UserRole.SISWA;
        
        onLogin(detectedRole);
        toast.success(`Mode Simulasi: Masuk sebagai ${detectedRole}`);
      }, 800);
      return;
    }

    try {
        if (!auth || !db) throw new Error("Layanan database tidak tersedia.");
        
        const userCredential = await auth.signInWithEmailAndPassword(u, p);
        const user = userCredential.user;

        if (user) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const role = userDoc.data()?.role as UserRole || UserRole.GURU;
                onLogin(role);
                toast.success(`Selamat datang, ${user.displayName || 'Pengguna'}`);
            } else {
                onLogin(UserRole.GURU);
            }
        }
    } catch (err: any) {
        setLoading(false);
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            setError('Email atau Password salah.');
        } else if (err.code === 'auth/too-many-requests') {
            setError('Terlalu banyak percobaan. Coba lagi nanti.');
        } else {
            setError('Gagal masuk ke sistem. Periksa koneksi.');
        }
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#020617] transition-colors duration-500 relative overflow-hidden">
      
      {/* --- BACKGROUND IMAGE UNTUK MOBILE (Dibuat Lebih Jelas) --- */}
      <div className="absolute inset-0 lg:hidden z-0">
          <img 
            src={mobileBgImage} 
            className="w-full h-full object-cover opacity-100 scale-100" 
            alt="Background" 
          />
          {/* Overlay Hitam 30% agar background terlihat jelas namun form tetap kontras */}
          <div className="absolute inset-0 bg-black/30"></div>
          {/* Gradasi halus di bagian bawah untuk keterbacaan teks kecil */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent opacity-80"></div>
      </div>

      {loading && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/90 dark:bg-[#020617]/95 backdrop-blur-xl animate-in fade-in duration-500">
              <div className="w-20 h-20 mb-8 animate-pulse">
                  <AppLogo className="w-full h-full drop-shadow-[0_0_20px_rgba(79,70,229,0.3)]" />
              </div>
              <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.4em]">Memverifikasi Akun...</p>
              </div>
          </div>
      )}

      {/* --- SIDEBAR DESKTOP --- */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-700 via-blue-600 to-indigo-900 relative items-center justify-center p-12 overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
          <div className="relative z-10 text-center max-w-lg">
              <div className="inline-flex mb-8">
                <AppLogo className="w-32 h-32" />
              </div>
              <h1 className="text-5xl font-black text-white mb-6 leading-tight tracking-tight">IMAM <br/>Selamat Datang</h1>
              <p className="text-indigo-100 text-lg opacity-80 font-medium">Informasi Manajemen Akademik Madrasah.</p>
          </div>
      </div>

      {/* --- FORM LOGIN --- */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative h-full z-10">
        <div className="w-full max-w-sm z-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="lg:hidden text-center mb-10">
                <div className="w-20 h-20 mx-auto bg-white/10 backdrop-blur-xl rounded-[2.5rem] p-3 border border-white/30 shadow-2xl">
                    <AppLogo className="w-full h-full" />
                </div>
            </div>

            <div className="text-center lg:text-left drop-shadow-lg">
                <h2 className="text-2xl font-black text-white lg:text-slate-900 lg:dark:text-white tracking-tight uppercase">Masuk ke Sistem</h2>
                <p className="text-indigo-100 lg:text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 opacity-90">IMAM Management v6.2 • Akses Privat</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-4">
                    <div className="group">
                        <label className="block text-[9px] font-black text-white lg:text-slate-400 uppercase tracking-widest mb-2 ml-1 drop-shadow-md">Email / Akun</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 group-focus-within:text-white transition-colors">
                                <EnvelopeIcon className="w-5 h-5" />
                            </div>
                            <input 
                                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/20 backdrop-blur-md lg:bg-white lg:dark:bg-slate-900 border border-white/30 lg:border-slate-200 lg:dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white lg:text-slate-900 lg:dark:text-white placeholder-white/50 lg:placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-white/20 focus:border-white transition-all font-bold text-sm shadow-xl"
                                placeholder="Email Anda" required
                            />
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-[9px] font-black text-white lg:text-slate-400 uppercase tracking-widest mb-2 ml-1 drop-shadow-md">Password</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 group-focus-within:text-white transition-colors">
                                <LockIcon className="w-5 h-5" />
                            </div>
                            <input 
                                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/20 backdrop-blur-md lg:bg-white lg:dark:bg-slate-900 border border-white/30 lg:border-slate-200 lg:dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white lg:text-slate-900 lg:dark:text-white placeholder-white/50 lg:placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-white/20 focus:border-white transition-all font-bold text-sm shadow-xl"
                                placeholder="••••••••" required
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-4 rounded-2xl bg-red-600/40 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-bounce border border-red-400/50 shadow-lg">
                        <ShieldCheckIcon className="w-4 h-4" /> {error}
                    </div>
                )}

                <button 
                    type="submit" disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-[0_15px_30px_rgba(79,70,229,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-3 group relative overflow-hidden"
                >
                    <span className="uppercase tracking-[0.2em] text-xs relative z-10">Aktivasi Sesi</span>
                    <ArrowRightIcon className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </button>
            </form>
            
            <div className="lg:hidden text-center mt-6">
                <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.3em]">MAN 1 Hulu Sungai Tengah • 2025</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
