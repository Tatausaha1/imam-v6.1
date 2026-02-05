
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
    CommandLineIcon, StarIcon, BuildingLibraryIcon, HeartIcon,
    // Fix: Added missing RectangleStackIcon and PlusIcon to imports
    RectangleStackIcon, PlusIcon
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
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Modal Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);

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
            { uid: '3', displayName: 'Budi Santoso', email: 'budi@madrasah.id', role: UserRole.WALI_KELAS, idUnik: '19800101', status: 'Active' }
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
    if (!formData.email || !formData.password || (!formData.linkId && ![UserRole.ADMIN, UserRole.DEVELOPER].includes(formData.role))) {
        toast.error("Mohon lengkapi seluruh data formulir");
        return;
    }

    setSaving(true);
    const toastId = toast.loading("Memproses pendaftaran...");
    try {
        if (isMockMode) {
            toast.success("Akses berhasil diaktifkan (Mode Simulasi)");
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
            } else if (![UserRole.DEVELOPER, UserRole.ADMIN].includes(formData.role)) {
                userDoc.teacherId = formData.linkId;
                await db!.collection('teachers').doc(formData.linkId).update({ linkedUserId: uid });
            }
            
            await db!.collection('users').doc(uid).set(userDoc);
            toast.success(`Akun ${formData.displayName} aktif!`, { id: toastId });
            setActiveTab('list');
        }
    } catch (err: any) {
        toast.error("Gagal: " + err.message, { id: toastId });
    } finally {
        setSaving(false);
    }
  };

  const handleDeleteUser = async (user: UserData) => {
      if (user.uid === auth?.currentUser?.uid) {
          toast.error("Anda tidak dapat menghapus akun sendiri.");
          return;
      }
      
      if (window.confirm(`Hapus permanen akses sistem untuk ${user.displayName}?\nData terkait siswa/guru tetap ada, hanya akun login yang dihapus.`)) {
          const toastId = toast.loading("Menghapus user...");
          try {
              if (!isMockMode && db) {
                  await db.collection('users').doc(user.uid).delete();
                  // Note: Firebase Auth deletion typically requires admin SDK or re-auth
              }
              toast.success("User berhasil dihapus.", { id: toastId });
          } catch (e: any) {
              toast.error("Gagal menghapus: " + e.message, { id: toastId });
          }
      }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;
      
      setSaving(true);
      const toastId = toast.loading("Memperbarui data...");
      try {
          if (!isMockMode && db) {
              await db.collection('users').doc(editingUser.uid).update({
                  displayName: editingUser.displayName,
                  role: editingUser.role
              });
          }
          toast.success("Profil user diperbarui.", { id: toastId });
          setIsEditModalOpen(false);
      } catch (e: any) {
          toast.error("Gagal: " + e.message, { id: toastId });
      } finally {
          setSaving(false);
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

  return (
    <Layout title="Manajemen User" subtitle="Otoritas & Akses Sistem" icon={ShieldCheckIcon} onBack={onBack}>
      <div className="p-4 lg:p-8 pb-32 max-w-5xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#151E32] p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit shadow-inner">
                <button onClick={() => setActiveTab('list')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-400'}`}>
                    <RectangleStackIcon className="w-3.5 h-3.5" /> Daftar Pengguna
                </button>
                <button onClick={() => setActiveTab('create')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'create' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>
                    <PlusIcon className="w-3.5 h-3.5" /> Aktivasi Akses
                </button>
            </div>
            
            <div className="relative flex-1 md:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Cari user..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-[10px] font-bold outline-none" 
                />
            </div>
        </div>

        {activeTab === 'list' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-500">
                {loading ? (
                    <div className="col-span-full py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500 opacity-20" /></div>
                ) : filteredUsers.map(user => (
                    <div key={user.uid} className="bg-white dark:bg-[#151E32] p-5 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 flex items-center gap-4 group hover:border-indigo-300 transition-all relative overflow-hidden">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-black text-lg shrink-0">
                            {(user.displayName || '?').charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="font-black text-slate-800 dark:text-white text-[11px] uppercase truncate tracking-tight">{user.displayName}</h4>
                            <p className="text-[9px] font-bold text-slate-400 mt-0.5 truncate">{user.email}</p>
                            <span className="inline-block mt-2 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-md text-[7px] font-black uppercase tracking-widest">{user.role}</span>
                        </div>
                        
                        <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                                onClick={() => { setEditingUser({...user}); setIsEditModalOpen(true); }}
                                className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                title="Edit Akses"
                            >
                                <PencilIcon className="w-3.5 h-3.5" />
                            </button>
                            <button 
                                onClick={() => handleDeleteUser(user)}
                                className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                title="Hapus User"
                            >
                                <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="max-w-xl mx-auto bg-white dark:bg-[#151E32] p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
                <form onSubmit={handleCreateAccount} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Peran Akses</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[UserRole.ADMIN, UserRole.WALI_KELAS, UserRole.GURU, UserRole.STAF, UserRole.SISWA, UserRole.KEPALA_MADRASAH].map(r => (
                                <button key={r} type="button" onClick={() => setFormData({...formData, role: r as UserRole, linkId: '', displayName: ''})} className={`py-3 rounded-xl text-[8px] font-black uppercase border transition-all ${formData.role === r ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-900 border-transparent text-slate-400'}`}>{r}</button>
                            ))}
                        </div>
                    </div>

                    {![UserRole.ADMIN, UserRole.DEVELOPER].includes(formData.role) && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hubungkan ke Data Induk</label>
                            <div className="relative">
                                <select required value={formData.linkId} onChange={e => {
                                    const id = e.target.value;
                                    const sel = formData.role === UserRole.SISWA ? students.find(s=>s.id===id) : teachers.find(t=>t.id===id);
                                    setFormData({
                                        ...formData, 
                                        linkId: id, 
                                        displayName: formData.role === UserRole.SISWA ? (sel as Student)?.namaLengkap : (sel as Teacher)?.name, 
                                        idUnik: formData.role === UserRole.SISWA ? (sel as Student)?.idUnik : (sel as Teacher)?.nip 
                                    });
                                }} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black outline-none border border-slate-200 dark:border-slate-700 appearance-none cursor-pointer uppercase shadow-inner">
                                    <option value="">-- PILIH DATA --</option>
                                    {formData.role === UserRole.SISWA ? students.map(s => <option key={s.id} value={s.id!}>{s.namaLengkap} ({s.idUnik})</option>) : teachers.map(t => <option key={t.id} value={t.id!}>{t.name} ({t.nip})</option>)}
                                </select>
                                <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            </div>
                        </div>
                    )}

                    {([UserRole.ADMIN, UserRole.DEVELOPER].includes(formData.role)) && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Tampilan</label>
                            <input required type="text" placeholder="Nama Lengkap Admin" value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none shadow-inner" />
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Kredensial</label>
                            <input required type="email" placeholder="email@sekolah.id" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value.toLowerCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none shadow-inner" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password Akses</label>
                            <input required type="password" placeholder="Min. 6 Karakter" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none shadow-inner" />
                        </div>
                    </div>

                    <button type="submit" disabled={saving} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition-all">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheckIcon className="w-5 h-5" />}
                        AKTIVASI AKSES USER
                    </button>
                </form>
            </div>
        )}
      </div>

      {/* MODAL EDIT USER */}
      {isEditModalOpen && editingUser && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-md rounded-[3rem] p-8 shadow-2xl animate-in zoom-in duration-300 border border-white/10 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-8">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase leading-none">Koreksi Akses</h3>
                          <p className="text-[9px] font-bold text-indigo-500 uppercase mt-2 tracking-widest">UID: {editingUser.uid.substring(0,8)}...</p>
                      </div>
                      <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"><XCircleIcon className="w-8 h-8" /></button>
                  </div>

                  <form onSubmit={handleUpdateUser} className="space-y-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Tampilan</label>
                          <input required type="text" value={editingUser.displayName} onChange={e => setEditingUser({...editingUser, displayName: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none" />
                      </div>
                      
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Peran Sistem</label>
                          <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black outline-none uppercase appearance-none cursor-pointer">
                              {[UserRole.ADMIN, UserRole.WALI_KELAS, UserRole.GURU, UserRole.STAF, UserRole.SISWA, UserRole.KEPALA_MADRASAH, UserRole.DEVELOPER].map(r => (
                                  <option key={r} value={r}>{r}</option>
                              ))}
                          </select>
                      </div>

                      <div className="pt-4 flex gap-3">
                          <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">Batal</button>
                          <button type="submit" disabled={saving} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                              {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <SaveIcon className="w-4 h-4" />} SIMPAN PERUBAHAN
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default CreateAccount;
