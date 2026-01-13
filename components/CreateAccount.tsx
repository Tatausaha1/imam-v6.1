import React, { useState, useEffect } from 'react';
import { db, auth, isMockMode } from '../services/firebase';
import { UserRole, Student, Teacher } from '../types';
import Layout from './Layout';
import { 
    UserPlusIcon, UserIcon, EnvelopeIcon, LockIcon, ShieldCheckIcon, 
    UsersGroupIcon, TrashIcon, Search, Loader2, BriefcaseIcon, 
    AcademicCapIcon, PencilIcon, XCircleIcon, ChevronDownIcon, 
    IdentificationIcon, SaveIcon, CheckCircleIcon, SparklesIcon,
    ArrowRightIcon
} from './Icons';
import { toast } from 'sonner';

interface UserData {
    uid: string;
    displayName: string;
    email: string;
    role: string;
    studentId?: string;
    teacherId?: string;
    status?: string;
    createdAt?: string;
}

const CreateAccount: React.FC<{ onBack: () => void, userRole: UserRole }> = ({ onBack, userRole }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create Form State
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    role: UserRole.SISWA,
    linkId: '' 
  });

  // Source Data for Linking
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    if (isMockMode) {
        setUsers([
            { uid: '1', displayName: 'Admin Hub', email: 'admin@madrasah.id', role: UserRole.ADMIN, status: 'Active' },
            { uid: '2', displayName: 'Ahmad Dahlan', email: 'ahmad@siswa.id', role: UserRole.SISWA, studentId: 's1', status: 'Active' }
        ]);
        setStudents([{ id: 's1', namaLengkap: 'Ahmad Dahlan', tingkatRombel: 'X IPA 1', nisn: '12345', status: 'Aktif', jenisKelamin: 'Laki-laki' }]);
        setTeachers([{ id: 't1', name: 'Budi Santoso, S.Pd', nip: '1980...', subject: 'Matematika', status: 'PNS', phone: '', email: '', birthDate: '', address: '' }]);
        setLoading(false);
        return;
    }

    if (!db) return;
    setLoading(true);
    
    const unsubUsers = db.collection('users').onSnapshot(snap => {
        setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData)));
        setLoading(false);
    });

    db.collection('students').get().then(snap => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Student))));
    db.collection('teachers').get().then(snap => setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Teacher))));

    return () => unsubUsers();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || ( (formData.role === UserRole.SISWA || formData.role === UserRole.GURU) && !formData.linkId )) {
        toast.error("Mohon lengkapi seluruh data formulir");
        return;
    }

    const toastId = toast.loading("Memproses pendaftaran akun...");
    try {
        if (isMockMode) {
            await new Promise(r => setTimeout(r, 1000));
            toast.success("Akun berhasil dibuat (Mode Simulasi)", { id: toastId });
            setActiveTab('list');
            return;
        }

        const userCredential = await auth!.createUserWithEmailAndPassword(formData.email, formData.password);
        const uid = userCredential.user?.uid;

        if (uid) {
            const userDoc: any = {
                uid,
                displayName: formData.displayName,
                email: formData.email,
                role: formData.role,
                status: 'Active',
                createdAt: new Date().toISOString()
            };

            if (formData.role === UserRole.SISWA) {
                userDoc.studentId = formData.linkId;
                const student = students.find(s => s.id === formData.linkId);
                userDoc.class = student?.tingkatRombel || '';
                await db!.collection('students').doc(formData.linkId).update({ linkedUserId: uid, accountStatus: 'Active' });
            } else if (formData.role === UserRole.GURU) {
                userDoc.teacherId = formData.linkId;
                await db!.collection('teachers').doc(formData.linkId).update({ linkedUserId: uid });
            }

            await db!.collection('users').doc(uid).set(userDoc);
            toast.success("Akun berhasil diaktifkan & terhubung!", { id: toastId });
            setActiveTab('list');
            setFormData({ displayName: '', email: '', password: '', role: UserRole.SISWA, linkId: '' });
        }
    } catch (err: any) {
        toast.error("Gagal: " + err.message, { id: toastId });
    }
  };

  const filteredUsers = users.filter(u => {
      // FIX: Proteksi jika displayName atau email undefined
      const name = String(u.displayName || '').toLowerCase();
      const email = String(u.email || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      return name.includes(query) || email.includes(query);
  });

  const selectedLinkData = formData.role === UserRole.SISWA 
    ? students.find(s => s.id === formData.linkId) 
    : teachers.find(t => t.id === formData.linkId);

  return (
    <Layout title="Manajemen Akses" subtitle="Otoritas Pengguna Sistem" icon={ShieldCheckIcon} onBack={onBack}>
      <div className="p-4 lg:p-8 pb-32 max-w-5xl mx-auto space-y-8">
        
        {/* --- HEADER CONTROLS --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit border border-slate-200 dark:border-slate-700 shadow-inner">
                <button 
                    onClick={() => setActiveTab('list')} 
                    className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Daftar Pengguna
                </button>
                <button 
                    onClick={() => setActiveTab('create')} 
                    className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'create' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Tambah Akun
                </button>
            </div>

            {activeTab === 'list' && (
                <div className="relative group min-w-[300px]">
                    <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                    <input 
                        type="text" placeholder="Cari Nama, Email, atau Peran..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-bold shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    />
                </div>
            )}
        </div>

        {activeTab === 'list' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {loading ? (
                    <div className="col-span-full py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500 opacity-50" /></div>
                ) : filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                        <div key={user.uid} className="bg-white dark:bg-[#151E32] p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-transform"><ShieldCheckIcon className="w-16 h-16"/></div>
                            
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 shadow-inner">
                                    <UserIcon className="w-6 h-6" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-tight truncate">{user.displayName}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 truncate">{user.email}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800/50">
                                <div className="flex items-center gap-2">
                                    <span className="text-[8px] font-black uppercase bg-indigo-600 text-white px-2 py-0.5 rounded-md tracking-widest">{user.role}</span>
                                    {(user.studentId || user.teacherId) && (
                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-100 dark:border-emerald-800/50">
                                            <CheckCircleIcon className="w-3 h-3" />
                                            <span className="text-[7px] font-black uppercase tracking-tighter">Linked</span>
                                        </div>
                                    )}
                                </div>
                                <button className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all"><TrashIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center py-20 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-700">
                        <UsersGroupIcon className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Pengguna tidak ditemukan</p>
                    </div>
                )}
            </div>
        ) : (
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="bg-white dark:bg-[#151E32] p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.02]"><SparklesIcon className="w-40 h-40" /></div>
                    
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg"><UserPlusIcon className="w-5 h-5"/></div>
                        <div>
                            <h3 className="font-black text-slate-800 dark:text-white text-lg uppercase tracking-tight">Buat Akses Pengguna</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lengkapi kredensial login akun baru</p>
                        </div>
                    </div>

                    <form onSubmit={handleCreateAccount} className="space-y-6 relative z-10">
                        {/* Peran Selection */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Pilih Level Akses</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: UserRole.SISWA, label: 'Siswa', icon: AcademicCapIcon },
                                    { id: UserRole.GURU, label: 'Guru', icon: BriefcaseIcon },
                                    { id: UserRole.ADMIN, label: 'Staf TU', icon: ShieldCheckIcon }
                                ].map(r => (
                                    <button 
                                        key={r.id} type="button" 
                                        onClick={() => setFormData({...formData, role: r.id as UserRole, linkId: '', displayName: ''})}
                                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all ${formData.role === r.id ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:bg-white'}`}
                                    >
                                        <r.icon className="w-5 h-5" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">{r.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Connection Logic */}
                        {(formData.role === UserRole.SISWA || formData.role === UserRole.GURU) && (
                            <div className="space-y-3 animate-in fade-in duration-300">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Hubungkan ke Data {formData.role === UserRole.SISWA ? 'Siswa' : 'GTK'}</label>
                                <div className="relative">
                                    <select 
                                        required value={formData.linkId} 
                                        onChange={e => {
                                            const id = e.target.value;
                                            const selected = formData.role === UserRole.SISWA ? students.find(s=>s.id===id) : teachers.find(t=>t.id===id);
                                            // FIX: Properly narrow the type of 'selected' to avoid property access errors on union types
                                            let name = '';
                                            if (selected) {
                                                if (formData.role === UserRole.SISWA) {
                                                    name = (selected as Student).namaLengkap;
                                                } else {
                                                    name = (selected as Teacher).name;
                                                }
                                            }
                                            setFormData({...formData, linkId: id, displayName: name});
                                        }} 
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none cursor-pointer"
                                    >
                                        <option value="">-- Cari Nama di Database --</option>
                                        {formData.role === UserRole.SISWA ? 
                                            students.map(s => <option key={s.id} value={s.id}>{s.namaLengkap} ({s.tingkatRombel})</option>) :
                                            teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                                        }
                                    </select>
                                    <ChevronDownIcon className="absolute right-4 top-4.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>

                                {selectedLinkData && (
                                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-indigo-500 shadow-sm border border-slate-100 dark:border-slate-700"><CheckCircleIcon className="w-6 h-6"/></div>
                                        <div>
                                            <p className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.2em]">Data Ditemukan</p>
                                            <h4 className="font-bold text-slate-800 dark:text-white text-xs">{formData.displayName}</h4>
                                            <p className="text-[9px] text-slate-500">{formData.role === UserRole.SISWA ? `NISN: ${(selectedLinkData as Student).nisn}` : `Mapel: ${(selectedLinkData as Teacher).subject}`}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Email Login</label>
                                <div className="relative group">
                                    <EnvelopeIcon className="absolute left-4 top-4 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="user@madrasah.id" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Kata Sandi</label>
                                <div className="relative group">
                                    <LockIcon className="absolute left-4 top-4 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="••••••••" />
                                </div>
                            </div>
                        </div>

                        {formData.role === UserRole.ADMIN && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Nama Tampilan</label>
                                <input required type="text" value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white outline-none" placeholder="Masukkan Nama Terang Staf" />
                            </div>
                        )}

                        <button 
                            type="submit" disabled={loading}
                            className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black py-5 rounded-[2rem] text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-indigo-500/30 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><UserPlusIcon className="w-5 h-5"/> Daftar Akun Sekarang</>}
                        </button>
                    </form>
                </div>

                <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] leading-relaxed">
                        Setiap akun yang dibuat akan secara otomatis mendapatkan peran yang dipilih. <br/> Pastikan data email valid untuk keperluan pemulihan sandi.
                    </p>
                </div>
            </div>
        )}
      </div>
    </Layout>
  );
};

export default CreateAccount;