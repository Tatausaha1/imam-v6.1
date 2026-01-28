
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db, auth, isMockMode } from '../services/firebase';
import { UserRole, Student, Teacher } from '../types';
import Layout from './Layout';
import { 
    UserPlusIcon, UserIcon, EnvelopeIcon, LockIcon, ShieldCheckIcon, 
    UsersGroupIcon, TrashIcon, Search, Loader2, BriefcaseIcon, 
    AcademicCapIcon, PencilIcon, XCircleIcon, ChevronDownIcon, 
    IdentificationIcon, SaveIcon, CheckCircleIcon, SparklesIcon,
    CommandLineIcon, StarIcon, BuildingLibraryIcon, HeartIcon
} from './Icons';
import { toast } from 'sonner';

interface UserData {
    uid: string;
    displayName: string;
    email: string;
    role: string;
    studentId?: string;
    teacherId?: string;
    idUnik?: string;
    status?: string;
    createdAt?: string;
}

const CreateAccount: React.FC<{ onBack: () => void, userRole: UserRole }> = ({ onBack, userRole }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'bulk'>('list');
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    displayName: '', email: '', password: '', role: UserRole.SISWA, linkId: '', idUnik: ''
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    if (isMockMode) {
        setUsers([
            { uid: '1', displayName: 'SYSTEM ARCHITECT', email: 'dev@imam.id', role: UserRole.DEVELOPER, status: 'Active' },
            { uid: '2', displayName: 'Admin Madrasah', email: 'admin@madrasah.id', role: UserRole.ADMIN, status: 'Active' },
            { uid: '3', displayName: 'H. Syamsul Arifin', email: 'kamad@madrasah.id', role: UserRole.KEPALA_MADRASAH, idUnik: '19680817', status: 'Active' },
            { uid: '4', displayName: 'Ahmad Dahlan', email: 'ahmad@siswa.id', role: UserRole.SISWA, studentId: 's1', idUnik: '15012', status: 'Active' }
        ]);
        setStudents([
            { id: 's1', namaLengkap: 'Ahmad Dahlan', tingkatRombel: 'X IPA 1', nisn: '12345', idUnik: '15012', status: 'Aktif', jenisKelamin: 'Laki-laki', email: 'ahmad@siswa.id', linkedUserId: '4' },
            { id: 's2', namaLengkap: 'Siti Rahma', tingkatRombel: 'X IPA 1', nisn: '12346', idUnik: '15013', status: 'Aktif', jenisKelamin: 'Perempuan', email: 'siti@siswa.id' }
        ]);
        setTeachers([
            { id: 't1', name: 'H. Syamsul Arifin, M.Pd', nip: '196808171995031002', subject: 'Kepala Madrasah', status: 'PNS', phone: '0811', email: 'kamad@madrasah.id', birthDate: '', address: '' },
            { id: 't2', name: 'Budi Santoso, S.Pd', nip: '198001012005011001', subject: 'Guru Matematika', status: 'PNS', phone: '0812', email: 'budi@guru.id', birthDate: '', address: '' },
            { id: 't3', name: 'Aminah, S.Kom', nip: '199201012023012001', subject: 'Staf IT', status: 'PPPK', phone: '0813', email: 'aminah@staf.id', birthDate: '', address: '' }
        ]);
        setLoading(false);
        return;
    }

    if (!db) return;
    setLoading(true);
    
    const unsubUsers = db.collection('users').onSnapshot(snap => {
        setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData)));
        setLoading(false);
    });

    db.collection('students').orderBy('namaLengkap').get().then(snap => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Student))));
    db.collection('teachers').orderBy('name').get().then(snap => setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Teacher))));

    return () => unsubUsers();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || (formData.role !== UserRole.DEVELOPER && formData.role !== UserRole.ADMIN && !formData.linkId)) {
        toast.error("Mohon lengkapi seluruh data formulir");
        return;
    }

    const toastId = toast.loading("Memproses pendaftaran akses...");
    try {
        if (isMockMode) {
            await new Promise(r => setTimeout(r, 1000));
            const newUid = `mock-${Date.now()}`;
            setUsers(prev => [{ uid: newUid, displayName: formData.displayName, email: formData.email, role: formData.role, idUnik: formData.idUnik, status: 'Active', createdAt: new Date().toISOString() }, ...prev]);
            toast.success("Akses berhasil diaktifkan (Mode Simulasi)", { id: toastId });
            setActiveTab('list');
            return;
        }

        const userCredential = await auth!.createUserWithEmailAndPassword(formData.email, formData.password);
        const uid = userCredential.user?.uid;
        if (uid) {
            const userDoc: any = { uid, displayName: formData.displayName, email: formData.email, role: formData.role, idUnik: formData.idUnik || '', status: 'Active', createdAt: new Date().toISOString() };
            
            if (formData.role === UserRole.SISWA) {
                userDoc.studentId = formData.linkId;
                await db!.collection('students').doc(formData.linkId).update({ linkedUserId: uid, accountStatus: 'Active' });
            } else if (formData.role !== UserRole.DEVELOPER && formData.role !== UserRole.ADMIN) {
                userDoc.teacherId = formData.linkId;
                await db!.collection('teachers').doc(formData.linkId).update({ linkedUserId: uid });
            }
            
            await db!.collection('users').doc(uid).set(userDoc);
            toast.success(`Akun ${formData.displayName} berhasil diaktifkan!`, { id: toastId });
            setActiveTab('list');
            setFormData({ displayName: '', email: '', password: '', role: UserRole.SISWA, linkId: '', idUnik: '' });
        }
    } catch (err: any) {
        toast.error("Gagal: " + err.message, { id: toastId });
    }
  };

  const filteredUsers = useMemo(() => {
      const q = searchQuery.toLowerCase();
      return users.filter(u => 
          (u.displayName || '').toLowerCase().includes(q) || 
          (u.email || '').toLowerCase().includes(q) || 
          (u.role || '').toLowerCase().includes(q)
      );
  }, [users, searchQuery]);

  const getRoleIcon = (role: string) => {
    switch(role) {
        case UserRole.DEVELOPER: return <CommandLineIcon className="w-6 h-6" />;
        case UserRole.ADMIN: return <ShieldCheckIcon className="w-6 h-6" />;
        case UserRole.KEPALA_MADRASAH: return <StarIcon className="w-6 h-6 text-amber-500" />;
        case UserRole.GURU: return <BriefcaseIcon className="w-6 h-6" />;
        case UserRole.STAF: return <BuildingLibraryIcon className="w-6 h-6" />;
        case UserRole.SISWA: return <AcademicCapIcon className="w-6 h-6" />;
        default: return <UserIcon className="w-6 h-6" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch(role) {
        case UserRole.DEVELOPER: return 'bg-slate-900 text-indigo-400 border-slate-700';
        case UserRole.ADMIN: return 'bg-rose-50 text-rose-600 border-rose-100';
        case UserRole.KEPALA_MADRASAH: return 'bg-amber-50 text-amber-600 border-amber-100';
        case UserRole.GURU: return 'bg-indigo-50 text-indigo-600 border-indigo-100';
        case UserRole.STAF: return 'bg-blue-50 text-blue-600 border-blue-100';
        case UserRole.SISWA: return 'bg-teal-50 text-teal-600 border-teal-100';
        default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <Layout title="Manajemen User" subtitle="Otoritas & Akses Sistem" icon={ShieldCheckIcon} onBack={onBack}>
      <div className="p-4 lg:p-8 pb-32 max-w-5xl mx-auto space-y-8">
        
        {/* TABS NAVIGATION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit border border-slate-200 dark:border-slate-700 shadow-inner">
                <button onClick={() => setActiveTab('list')} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Daftar Pengguna</button>
                <button onClick={() => setActiveTab('create')} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'create' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Aktivasi Akses</button>
            </div>

            {activeTab === 'list' && (
                <div className="relative group min-w-[300px]">
                    <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
                    <input type="text" placeholder="Cari Nama, Email, atau Level..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-bold shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                </div>
            )}
        </div>

        {activeTab === 'list' ? (
            /* LIST VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4">
                {loading ? (
                    <div className="col-span-full py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500 opacity-50" /></div>
                ) : filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                        <div key={user.uid} className="bg-white dark:bg-[#151E32] p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center border transition-transform group-hover:scale-110 ${getRoleColor(user.role)}`}>
                                    {getRoleIcon(user.role)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-tight truncate">{user.displayName}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 truncate">{user.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800/50">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md tracking-widest ${user.role === UserRole.DEVELOPER ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                        {user.role === 'kepala_madrasah' ? 'KAMAD' : user.role.toUpperCase()}
                                    </span>
                                    {user.idUnik && <span className="text-[8px] font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-500">ID: {user.idUnik}</span>}
                                </div>
                                <button className="p-2 text-slate-200 hover:text-red-500 transition-all"><TrashIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center py-20 bg-white dark:bg-slate-800 rounded-[3rem] border border-dashed border-slate-200">
                        <UsersGroupIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tidak ada pengguna ditemukan</p>
                    </div>
                )}
            </div>
        ) : (
            /* CREATE FORM VIEW */
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8">
                <div className="bg-white dark:bg-[#151E32] p-8 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30"><UserPlusIcon className="w-6 h-6"/></div>
                        <div>
                            <h3 className="font-black text-slate-800 dark:text-white text-xl uppercase tracking-tight">Aktifkan Level Akses</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registrasi Akun Login Terintegrasi Data Induk</p>
                        </div>
                    </div>

                    <form onSubmit={handleCreateAccount} className="space-y-8">
                        {/* ROLE SELECTION GRID */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Pilih Kategori Akses</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {[
                                    { id: UserRole.DEVELOPER, label: 'Developer', icon: CommandLineIcon, color: 'indigo' },
                                    { id: UserRole.ADMIN, label: 'Administrator', icon: ShieldCheckIcon, color: 'rose' },
                                    { id: UserRole.KEPALA_MADRASAH, label: 'Kepala Madrasah', icon: StarIcon, color: 'amber' },
                                    { id: UserRole.GURU, label: 'Guru', icon: BriefcaseIcon, color: 'indigo' },
                                    { id: UserRole.STAF, label: 'Staff / TU', icon: BuildingLibraryIcon, color: 'blue' },
                                    { id: UserRole.SISWA, label: 'Siswa', icon: AcademicCapIcon, color: 'teal' },
                                ].map(r => (
                                    <button 
                                        key={r.id} type="button" 
                                        onClick={() => setFormData({...formData, role: r.id as UserRole, linkId: '', displayName: '', idUnik: ''})}
                                        className={`flex flex-col items-center justify-center gap-3 p-5 rounded-[1.8rem] border-2 transition-all group ${
                                            formData.role === r.id 
                                            ? `bg-${r.color}-50 dark:bg-${r.color}-900/20 border-${r.color}-500 text-${r.color}-600 shadow-lg scale-[1.02]` 
                                            : 'bg-slate-50 dark:bg-slate-900 border-transparent text-slate-400 grayscale hover:grayscale-0'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${formData.role === r.id ? `bg-${r.color}-600 text-white` : 'bg-white dark:bg-slate-800'}`}>
                                            <r.icon className="w-5 h-5" />
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">{r.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* LINKING SECTION */}
                        {formData.role !== UserRole.DEVELOPER && formData.role !== UserRole.ADMIN && (
                            <div className="space-y-3 animate-in slide-in-from-top-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">
                                    Hubungkan dengan Data Master {formData.role === UserRole.SISWA ? 'Siswa' : 'GTK / Pegawai'}
                                </label>
                                <div className="relative">
                                    <select 
                                        required value={formData.linkId} 
                                        onChange={e => {
                                            const id = e.target.value;
                                            const selected = formData.role === UserRole.SISWA ? students.find(s=>s.id===id) : teachers.find(t=>t.id===id);
                                            let name = ''; let uniqueId = '';
                                            if (selected) {
                                                name = formData.role === UserRole.SISWA ? (selected as Student).namaLengkap : (selected as Teacher).name;
                                                uniqueId = formData.role === UserRole.SISWA ? ((selected as Student).idUnik || (selected as Student).nisn || '') : ((selected as Teacher).nip || '');
                                            }
                                            setFormData({...formData, linkId: id, displayName: name, idUnik: uniqueId});
                                        }} 
                                        className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[1.8rem] text-[11px] font-black uppercase outline-none appearance-none cursor-pointer shadow-inner focus:bg-white transition-colors"
                                    >
                                        <option value="">-- CARI NAMA DI DATABASE INDUK --</option>
                                        {formData.role === UserRole.SISWA ? 
                                            students.map(s => <option key={s.id} value={s.id}>{s.namaLengkap} ({s.tingkatRombel})</option>) :
                                            teachers.map(t => <option key={t.id} value={t.id}>{t.name} - {t.subject}</option>)
                                        }
                                    </select>
                                    <ChevronDownIcon className="absolute right-5 top-5.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        )}

                        {/* MANUAL ENTRY FOR ADMIN/DEV */}
                        {(formData.role === UserRole.DEVELOPER || formData.role === UserRole.ADMIN) && (
                            <div className="space-y-2 animate-in slide-in-from-top-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Identitas {formData.role === UserRole.DEVELOPER ? 'Developer' : 'Administrator'}</label>
                                <div className="relative group">
                                    <UserIcon className="absolute left-5 top-4.5 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                                    <input required type="text" value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value.toUpperCase()})} className="w-full pl-12 pr-6 py-4.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] text-[11px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner" placeholder="CONTOH: SYSTEM ADMINISTRATOR" />
                                </div>
                            </div>
                        )}

                        {/* CREDENTIALS SECTION */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Email Login</label>
                                <div className="relative group">
                                    <EnvelopeIcon className="absolute left-5 top-4.5 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: (e.target.value || '').toLowerCase()})} className="w-full pl-12 pr-6 py-4.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] text-[11px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner" placeholder="email@madrasah.id" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Kata Sandi</label>
                                <div className="relative group">
                                    <LockIcon className="absolute left-5 top-4.5 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                                    <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full pl-12 pr-6 py-4.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] text-[11px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner" placeholder="••••••••" />
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-[2.2rem] text-[10px] uppercase tracking-[0.35em] shadow-2xl shadow-indigo-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-4 group">
                            <CheckCircleIcon className="w-6 h-6 group-hover:scale-110 transition-transform"/> Aktivasi Akses Terintegrasi
                        </button>
                    </form>
                </div>
            </div>
        )}
      </div>
    </Layout>
  );
};

const StatBox = ({ label, value, icon: Icon, color, bg }: any) => (
    <div className={`p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[120px] ${bg}/20`}>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${bg} ${color} mb-3 shadow-sm`}><Icon className="w-5 h-5" /></div>
        <div>
            <h4 className="text-2xl font-black text-slate-800 dark:text-white leading-none">{value}</h4>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{label}</p>
        </div>
    </div>
);

export default CreateAccount;
