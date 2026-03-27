
import React, { useState } from 'react';
import { auth, db, isMockMode } from '../services/firebase';
import { ArrowRightIcon, ShieldCheckIcon, AcademicCapIcon, UserIcon, LockIcon, Loader2, SparklesIcon, CalendarIcon, QrCodeIcon, CheckCircleIcon, AppLogo } from './Icons';
import { UserRole } from '../types';
import { toast } from 'sonner';

interface RegisterProps {
  onLogin: (role: UserRole) => void;
  onLoginClick: () => void;
}

const Register: React.FC<RegisterProps> = ({ onLogin, onLoginClick }) => {
  const [regMode, setRegMode] = useState<'student' | 'staff'>('student');
  const [step, setStep] = useState<1 | 2>(1); 

  const [nisn, setNisn] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.GURU);
  
  const [verifiedStudent, setVerifiedStudent] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerifyStudent = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      if (!nisn || !birthDate) {
          setError('NISN dan Tanggal Lahir wajib diisi.');
          setLoading(false);
          return;
      }

      if (isMockMode) {
          setTimeout(() => {
              setVerifiedStudent({
                  id: 'mock-student-id',
                  namaLengkap: 'Siswa Simulasi (Ahmad)',
                  nisn: nisn,
                  idUnik: '15012', 
                  email: `siswa${nisn}@sekolah.id`,
                  tingkatRombel: '10 A',
                  status: 'Aktif',
                  isClaimed: false
              });
              setStep(2);
              toast.success("Data Siswa Ditemukan!");
              setLoading(false);
          }, 1000);
          return;
      }

      try {
          if (!db) throw new Error("Database offline");

          // 1. Cari data siswa berdasarkan NISN (Doc ID)
          const studentDoc = await db.collection('students').doc(nisn).get();

          if (!studentDoc.exists) {
              setError('Data siswa tidak ditemukan. Periksa NISN Anda.');
              setLoading(false);
              return;
          }

          const data = studentDoc.data();

          // 2. Validasi Tanggal Lahir sebagai PIN keamanan
          if (data?.tanggalLahir !== birthDate) {
              setError('Tanggal lahir tidak cocok dengan data NISN.');
              setLoading(false);
              return;
          }

          // 3. CEGAH KLAIM GANDA: Cek status isClaimed
          if (data?.isClaimed === true || data?.authUid) {
              setError('Akun untuk NISN ini sudah terdaftar. Silakan gunakan menu Login.');
              setLoading(false);
              return;
          }

          setVerifiedStudent({ id: studentDoc.id, ...data });
          setEmail(data?.email || '');
          setName(data?.namaLengkap);
          setStep(2);
          toast.success(`Halo, ${data?.namaLengkap}! Data terverifikasi.`);

      } catch (err: any) {
          console.error("Verification Error:", err);
          setError("Gagal memverifikasi data. Pastikan NISN sudah terdaftar di sistem.");
      } finally {
          setLoading(false);
      }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
        setError('Konfirmasi kata sandi tidak cocok');
        setLoading(false);
        return;
    }

    if (password.length < 6) {
        setError('Kata sandi minimal 6 karakter');
        setLoading(false);
        return;
    }

    const finalRole = regMode === 'student' ? UserRole.SISWA : selectedRole;
    
    if (isMockMode) {
        setTimeout(() => {
            setLoading(false);
            onLogin(finalRole);
            toast.success("Akun simulasi berhasil dibuat.");
        }, 1000);
        return;
    }

    try {
        if (auth && db) {
            // 1. Buat User di Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            if (userCredential.user) {
                const uid = userCredential.user.uid;
                const displayName = regMode === 'student' ? verifiedStudent.namaLengkap : name;

                await userCredential.user.updateProfile({ displayName });

                // 2. Simpan Data di Koleksi 'users'
                const userData: any = {
                    uid: uid,
                    displayName: displayName,
                    email: email,
                    role: finalRole,
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                    isSso: false
                };

                if (regMode === 'student' && verifiedStudent) {
                    userData.studentId = verifiedStudent.id; 
                    userData.nisn = verifiedStudent.nisn;
                    userData.idUnik = verifiedStudent.idUnik || verifiedStudent.nisn;
                    userData.class = verifiedStudent.tingkatRombel;
                }

                await db.collection('users').doc(uid).set(userData);

                // 3. UPDATE DATA INDUK (SINKRONISASI KLAIM)
                if (regMode === 'student' && verifiedStudent) {
                    await db.collection('students').doc(verifiedStudent.id).update({
                        isClaimed: true,
                        authUid: uid,
                        linkedUserId: uid,
                        email: email, // Update email induk jika tersedia
                        accountStatus: 'Active',
                        lastAccountActivity: new Date().toISOString()
                    });
                }
            }
            
            toast.success("Akun berhasil diaktifkan!");
            onLogin(finalRole);
        } else {
            throw new Error("Layanan sistem sedang offline.");
        }
    } catch (err: any) {
        console.error("Registration Error:", err);
        if (err.code === 'auth/email-already-in-use') {
            setError('Email ini sudah terdaftar. Silakan login.');
        } else {
            setError('Gagal mendaftar: ' + (err.message || 'Kesalahan sistem internal'));
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#f8fafc] dark:bg-[#020617] text-slate-900 dark:text-white relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:opacity-10 bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_80%,transparent_100%)]"></div>
      <div className="flex-1 flex flex-col justify-center px-6 z-10 relative">
        <div className="w-full max-w-md mx-auto bg-white/80 dark:bg-[#0B1121]/90 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-500/10 relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 ring-1 ring-white/50 group">
            
            <div className="mb-6 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 mb-4 shadow-sm">
                    <SparklesIcon className="w-3 h-3 text-indigo-500" />
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase">Registrasi & Klaim Akun</span>
                </div>
                <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-1">Daftar Akun</h1>
                <div className="flex justify-center gap-2 mt-6 mb-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl w-fit mx-auto">
                    <button onClick={() => { setRegMode('student'); setStep(1); setError(''); }} className={`text-xs font-bold px-5 py-2.5 rounded-xl transition-all ${regMode === 'student' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>Portal Siswa</button>
                    <button onClick={() => { setRegMode('staff'); setStep(2); setError(''); }} className={`text-xs font-bold px-5 py-2.5 rounded-xl transition-all ${regMode === 'staff' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>GTK / Staf</button>
                </div>
            </div>

            {regMode === 'student' && step === 1 && (
                <form onSubmit={handleVerifyStudent} className="space-y-4 animate-in fade-in slide-in-from-right-8">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-2xl flex gap-3 mb-2 shadow-inner">
                        <div className="w-8 h-8 rounded-full bg-white dark:bg-indigo-800 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-700 shadow-sm"><ShieldCheckIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /></div>
                        <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-tight self-center font-bold uppercase tracking-tight">Klaim identitas digital Anda menggunakan NISN & Tanggal Lahir resmi.</p>
                    </div>
                    <div className="group relative">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">Nomor Induk (NISN)</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors"><QrCodeIcon className="w-5 h-5" /></div>
                            <input type="text" value={nisn} onChange={(e) => setNisn(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm shadow-inner" placeholder="10 DIGIT NISN" required />
                        </div>
                    </div>
                    <div className="group relative">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">Tanggal Lahir</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors"><CalendarIcon className="w-5 h-5" /></div>
                            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-slate-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm cursor-pointer shadow-inner" required />
                        </div>
                    </div>
                    {error && <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-[10px] text-center font-black uppercase tracking-tight animate-shake">{error}</div>}
                    <button type="submit" disabled={loading} className="w-full mt-2 bg-indigo-600 text-white rounded-2xl py-4 font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verifikasi Identitas"}
                    </button>
                </form>
            )}

            {(step === 2 || regMode === 'staff') && (
                <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in slide-in-from-right-8">
                    {regMode === 'student' && verifiedStudent && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-2xl flex items-center gap-4 mb-2 shadow-inner border-dashed">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-700 shadow-sm"><CheckCircleIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /></div>
                            <div className="min-w-0">
                                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">Identitas Terpilih</p>
                                <p className="text-sm font-black text-slate-800 dark:text-white truncate">{verifiedStudent.namaLengkap}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{verifiedStudent.tingkatRombel}</p>
                            </div>
                        </div>
                    )}
                    {regMode === 'staff' && (
                        <div className="grid grid-cols-2 gap-2">
                            {[UserRole.GURU, UserRole.STAF, UserRole.ORANG_TUA].map(role => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => setSelectedRole(role)}
                                    className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${selectedRole === role ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                    )}
                    {regMode === 'staff' && (
                        <div className="group relative">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">Nama Lengkap & Gelar</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-5 text-slate-800 dark:text-white text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner" placeholder="MISAL: BUDI SANTOSO, S.PD" required />
                        </div>
                    )}
                    <div className="group relative">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">Alamat Email Kredensial</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-5 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm shadow-inner" placeholder="nama@email.com" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="group relative">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">Kata Sandi</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-5 text-slate-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-sm shadow-inner" placeholder="MIN. 6 CHAR" required />
                        </div>
                        <div className="group relative">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">Konfirmasi</label>
                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-5 text-slate-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-sm shadow-inner" placeholder="ULANGI SANDI" required />
                        </div>
                    </div>
                    {error && <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-[10px] text-center font-black uppercase shadow-sm">{error}</div>}
                    <div className="flex gap-3 mt-6">
                        {regMode === 'student' && <button type="button" onClick={() => setStep(1)} className="px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Kembali</button>}
                        <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 text-white rounded-2xl py-4 font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Aktifkan Akun Digital"}
                        </button>
                    </div>
                </form>
            )}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Sudah punya akses? <button onClick={onLoginClick} className="text-indigo-600 dark:text-indigo-400 hover:underline">Masuk Sesi</button></p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
