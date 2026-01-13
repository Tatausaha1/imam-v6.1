
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
  // Mode Pendaftaran: 'student' (Verifikasi Data) atau 'staff' (Manual/Umum)
  const [regMode, setRegMode] = useState<'student' | 'staff'>('student');
  const [step, setStep] = useState<1 | 2>(1); // 1: Verifikasi, 2: Buat Akun

  // Form State
  const [nisn, setNisn] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.GURU);
  
  // Verification Data Holder
  const [verifiedStudent, setVerifiedStudent] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- LOGIKA 1: VERIFIKASI DATA SISWA ---
  const handleVerifyStudent = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      if (!nisn || !birthDate) {
          setError('NISN dan Tanggal Lahir wajib diisi.');
          setLoading(false);
          return;
      }

      // MODE SIMULASI
      if (isMockMode) {
          setTimeout(() => {
              // Simulasi data ditemukan
              setVerifiedStudent({
                  id: 'mock-student-id', // Ini akan menjadi studentId
                  namaLengkap: 'Siswa Simulasi (Ahmad)',
                  nisn: nisn,
                  email: `siswa${nisn}@sekolah.id`, // Auto generate suggestion
                  tingkatRombel: '10 A',
                  status: 'Aktif',
                  accountStatus: 'Inactive'
              });
              setStep(2);
              toast.success("Data Siswa Ditemukan!");
              setLoading(false);
          }, 1000);
          return;
      }

      // MODE REAL (FIRESTORE)
      try {
          if (!db) throw new Error("Database offline");

          // Cari siswa berdasarkan NISN
          const snapshot = await db.collection('students').where('nisn', '==', nisn).limit(1).get();

          if (snapshot.empty) {
              setError('Data siswa tidak ditemukan. Periksa NISN Anda.');
              setLoading(false);
              return;
          }

          const doc = snapshot.docs[0];
          const data = doc.data();

          // Validasi Tanggal Lahir (Security Check)
          if (data.tanggalLahir !== birthDate) {
              setError('Tanggal lahir tidak cocok dengan data NISN.');
              setLoading(false);
              return;
          }

          // Cek apakah akun sudah aktif
          if (data.accountStatus === 'Active') {
              setError('Akun untuk siswa ini sudah aktif. Silakan Login.');
              setLoading(false);
              return;
          }

          // Simpan ID Dokumen Siswa
          setVerifiedStudent({ id: doc.id, ...data });
          
          // Auto fill email suggestion jika ada
          setEmail(data.email || '');
          setName(data.namaLengkap); // Kunci nama sesuai database
          setStep(2);
          toast.success(`Halo, ${data.namaLengkap}! Silakan buat akun.`);

      } catch (err: any) {
          console.error("Verification Error:", err);
          setError("Gagal memverifikasi data. " + err.message);
      } finally {
          setLoading(false);
      }
  };

  // --- LOGIKA 2: FINALISASI PEMBUATAN AKUN ---
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

    // Role Logic
    const finalRole = regMode === 'student' ? UserRole.SISWA : selectedRole;
    
    // MODE SIMULASI
    if (isMockMode) {
        setTimeout(() => {
            setLoading(false);
            onLogin(finalRole);
            toast.success("Akun berhasil dibuat (Simulasi)");
        }, 1000);
        return;
    }

    try {
        if (auth) {
            // 1. Buat User Authentication (UID)
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            if (userCredential.user) {
                const uid = userCredential.user.uid;
                const displayName = regMode === 'student' ? verifiedStudent.namaLengkap : name;

                // 2. Update Profile Auth
                await userCredential.user.updateProfile({
                    displayName: displayName
                });

                // 3. Siapkan Data User untuk Firestore (Users Collection)
                const userData: any = {
                    uid: uid,
                    displayName: displayName,
                    email: email,
                    role: finalRole,
                    createdAt: new Date().toISOString(),
                    phone: "",
                    address: "",
                };

                // KUNCI HUBUNGAN (FOREIGN KEY)
                if (regMode === 'student' && verifiedStudent) {
                    userData.studentId = verifiedStudent.id; 
                    userData.nisn = verifiedStudent.nisn;
                    userData.class = verifiedStudent.tingkatRombel;
                    userData.idUnik = verifiedStudent.idUnik || verifiedStudent.nisn;
                } else {
                    userData.nip = ""; // Untuk guru
                }

                // 4. Simpan ke Collection 'users'
                if (db) {
                    await db.collection('users').doc(uid).set(userData);

                    // 5. Update Reverse Link di Collection 'students'
                    if (regMode === 'student' && verifiedStudent) {
                        await db.collection('students').doc(verifiedStudent.id).update({
                            accountStatus: 'Active',
                            linkedUserId: uid,
                            email: email
                        });
                    }
                }
            }
            
            toast.success("Akun berhasil dibuat! Mengalihkan...");
            onLogin(finalRole);
        } else {
            throw new Error("Database offline.");
        }
    } catch (err: any) {
        console.error("Registration Error:", err);
        if (err.code === 'auth/email-already-in-use') {
            setError('Email ini sudah terdaftar. Silakan masuk.');
        } else {
            setError('Gagal mendaftar: ' + (err.message || 'Kesalahan sistem'));
        }
    } finally {
        setLoading(false);
    }
  };

  const staffRoles = [
    { id: UserRole.GURU, label: 'Guru', icon: AcademicCapIcon },
    { id: UserRole.ORANG_TUA, label: 'Wali', icon: UserIcon },
    { id: UserRole.ADMIN, label: 'Admin', icon: ShieldCheckIcon },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-[#f8fafc] text-slate-900 relative overflow-hidden font-sans">
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_80%,transparent_100%)]"></div>
      
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-200/40 rounded-full blur-[100px] animate-blob mix-blend-multiply pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-multiply pointer-events-none"></div>
      
      <div className="flex-1 flex flex-col justify-center px-6 z-10 relative">
        
        {/* Glass Card */}
        <div className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-500/10 relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 ring-1 ring-white/50 group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white to-transparent"></div>

            {/* Header */}
            <div className="mb-6 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-4 shadow-sm">
                    <SparklesIcon className="w-3 h-3 text-indigo-500" />
                    <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase">Pendaftaran Akun</span>
                </div>
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-1">
                  Buat Akun Baru
                </h1>
                
                {/* Mode Switcher */}
                <div className="flex justify-center gap-2 mt-6 mb-2 bg-slate-100 p-1 rounded-2xl w-fit mx-auto">
                    <button 
                        onClick={() => { setRegMode('student'); setStep(1); setError(''); }}
                        className={`text-xs font-bold px-5 py-2.5 rounded-xl transition-all ${regMode === 'student' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Siswa
                    </button>
                    <button 
                        onClick={() => { setRegMode('staff'); setStep(2); setError(''); }}
                        className={`text-xs font-bold px-5 py-2.5 rounded-xl transition-all ${regMode === 'staff' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Guru & Staf
                    </button>
                </div>
            </div>

            {/* --- FORM SISWA (STEP 1: VERIFIKASI) --- */}
            {regMode === 'student' && step === 1 && (
                <form onSubmit={handleVerifyStudent} className="space-y-4 animate-in fade-in slide-in-from-right-8">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <ShieldCheckIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <p className="text-[10px] text-blue-700 leading-tight self-center font-medium">
                            Demi keamanan, verifikasi data diri Anda menggunakan NISN dan Tanggal Lahir.
                        </p>
                    </div>

                    <div className="group relative">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1 tracking-wider">NISN</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                <QrCodeIcon className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                value={nisn}
                                onChange={(e) => setNisn(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm shadow-sm"
                                placeholder="Nomor Induk Siswa Nasional"
                                required
                            />
                        </div>
                    </div>

                    <div className="group relative">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1 tracking-wider">Tanggal Lahir</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                <CalendarIcon className="w-5 h-5" />
                            </div>
                            <input
                                type="date"
                                value={birthDate}
                                onChange={(e) => setBirthDate(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm shadow-sm cursor-pointer"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs text-center font-bold animate-pulse">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 relative overflow-hidden rounded-2xl group active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-xl shadow-indigo-500/20"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 transition-all group-hover:scale-105"></div>
                        <div className="relative py-4 flex items-center justify-center gap-2 text-white font-bold tracking-wide text-sm">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cek Data Saya"}
                        </div>
                    </button>
                </form>
            )}

            {/* --- FORM CREATE ACCOUNT (SISWA STEP 2 OR STAFF) --- */}
            {(step === 2 || regMode === 'staff') && (
                <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in slide-in-from-right-8">
                    
                    {regMode === 'student' && verifiedStudent && (
                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">Data Terverifikasi</p>
                                <p className="text-sm font-bold text-slate-800">{verifiedStudent.namaLengkap}</p>
                                <p className="text-[10px] text-slate-500">{verifiedStudent.tingkatRombel} • {verifiedStudent.nisn}</p>
                            </div>
                        </div>
                    )}

                    {regMode === 'staff' && (
                        <div className="group relative">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1 tracking-wider">Nama Lengkap</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                    <UserIcon className="w-5 h-5" />
                                </div>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-800 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium outline-none shadow-sm"
                                    placeholder="Nama Lengkap"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div className="group relative">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1 tracking-wider">Email (Untuk Login)</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors font-bold text-sm">
                                @
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm shadow-sm"
                                placeholder="nama@email.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="group relative">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1 tracking-wider">Kata Sandi</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                    <LockIcon className="w-4 h-4" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-10 pr-3 text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm shadow-sm"
                                    placeholder="Min. 6 char"
                                    required
                                />
                            </div>
                        </div>
                        <div className="group relative">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1 tracking-wider">Ulangi Sandi</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                    <LockIcon className="w-4 h-4" />
                                </div>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-10 pr-3 text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm shadow-sm"
                                    placeholder="Konfirmasi"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {regMode === 'staff' && (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1 tracking-wider">
                                Pilih Peran
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {staffRoles.map((role) => (
                                    <button
                                        key={role.id}
                                        type="button"
                                        onClick={() => setSelectedRole(role.id)}
                                        className={`flex flex-col items-center justify-center py-3 px-1 rounded-2xl transition-all duration-300 relative overflow-hidden group border ${
                                            selectedRole === role.id 
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 border-indigo-600' 
                                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                        }`}
                                    >
                                        <role.icon className="w-5 h-5 mb-1" />
                                        <span className="text-[9px] font-bold tracking-wide">{role.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs text-center font-bold animate-pulse flex items-center justify-center gap-2">
                            <ShieldCheckIcon className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="flex gap-2 mt-4">
                        {regMode === 'student' && (
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="px-5 py-4 rounded-2xl bg-slate-100 text-slate-500 font-bold text-sm hover:bg-slate-200 transition-colors"
                            >
                                Kembali
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 relative overflow-hidden rounded-2xl group active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-xl shadow-indigo-500/20"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-r ${regMode === 'student' ? 'from-violet-600 to-indigo-600' : 'from-indigo-600 to-blue-600'} transition-all group-hover:scale-105`}></div>
                            <div className="relative py-4 flex items-center justify-center gap-2 text-white font-bold tracking-wide text-sm">
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Proses Database...</span>
                                    </>
                                ) : (
                                    <>
                                        Daftar Sekarang
                                        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </div>
                        </button>
                    </div>
                </form>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <p className="text-slate-500 text-xs font-medium">
                    Sudah punya akun? <button onClick={onLoginClick} className="text-indigo-600 hover:text-indigo-700 font-bold transition-colors hover:underline underline-offset-4 decoration-indigo-300">Masuk di sini</button>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
