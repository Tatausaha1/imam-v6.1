
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db, auth, isMockMode } from '../services/firebase';
import { UserRole, Student, Teacher } from '../types';
import Layout from './Layout';
// Fix: Added missing InfoIcon to the list of imports from './Icons'
import { 
    UserPlusIcon, UserIcon, EnvelopeIcon, LockIcon, ShieldCheckIcon, 
    UsersGroupIcon, TrashIcon, Search, Loader2, BriefcaseIcon, 
    AcademicCapIcon, PencilIcon, XCircleIcon, ChevronDownIcon, 
    IdentificationIcon, SaveIcon, CheckCircleIcon, SparklesIcon,
    CommandLineIcon, StarIcon, BuildingLibraryIcon, HeartIcon,
    RectangleStackIcon, PlusIcon, InfoIcon
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
    
    // Fix: Menambahkan error handler pada onSnapshot
    const unsubUsers = db.collection('users').onSnapshot(
        snap => {
            setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData)));
            setLoading(false);
        },
        err => {
            console.warn("Firestore: Gagal memuat data pengguna.", err.message);
            setLoading(false);
        }
    );

    // 2. Fetch only Unclaimed students/teachers to prevent double accounts
    const loadMasterData = async () => {
        try {
            const [sSnap, tSnap] = await Promise.all([
                db.collection('students').where('status', '==', 'Aktif').get(),
                db.collection('teachers').get()
            ]);
            setStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
            setTeachers(tSnap.docs.map(d => ({ id: d.id, ...d.data() } as Teacher)));
        } catch (e) {}
    };
    loadMasterData();

    return () => unsubUsers();
  }, []);

  // Filter students/teachers yang belum punya linked account
  const availableLinks = useMemo(() => {
    if ([UserRole.SISWA, UserRole.ORANG_TUA].includes(formData.role)) {
        return students.filter(s => !s.isClaimed && !s.authUid);
    }
    return teachers.filter(t => !t.linkedUserId);
  }, [formData.role, students, teachers]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const isPublicRole = [UserRole.SISWA, UserRole.ORANG_TUA, UserRole.GURU, UserRole.WALI_KELAS, UserRole.STAF, UserRole.KETUA_KELAS].includes(formData.role);

    if (!formData.email || !formData.password || (isPublicRole && !formData.linkId)) {
        toast.error("Mohon pilih data induk yang akan dihubungkan.");
        return;
    }

    setSaving(true);
    const toastId = toast.loading("Memproses pendaftaran sistem...");
    try {
        if (isMockMode) {
            toast.success("Akses berhasil diaktifkan (Mode Simulasi)");
            setActiveTab('list');
            return;
        }

        // 1. Create Auth User
        const userCredential = await auth!.createUserWithEmailAndPassword(formData.email, formData.password);
        const uid = userCredential.user?.uid;
        
        if (uid) {
            // 2. Prepare User Profile
            const userDoc: any = { 
                uid, 
                displayName: formData.displayName, 
                email: formData.email, 
                role: formData.role, 
                idUnik: formData.idUnik || '', 
                status: 'Active', 
                createdAt: new Date().toISOString(),
                isSso: false
            };
            
            const batch = db!.batch();

            // 3. Update Master Data Induk (Siswa/Guru)
            if (formData.role === UserRole.SISWA) {
                userDoc.studentId = formData.linkId;
                const studentRef = db!.collection('students').doc(formData.linkId);
                batch.update(studentRef, { 
                    isClaimed: true, 
                    authUid: uid, 
                    linkedUserId: uid, 
                    accountStatus: 'Active',
                    email: formData.email 
                });
            } else if (formData.role === UserRole.ORANG_TUA) {
                userDoc.studentId = formData.linkId;
                const studentRef = db!.collection('students').doc(formData.linkId);
                batch.update(studentRef, {
                    parentUserId: uid,
                    parentEmail: formData.email,
                    parentLinkedAt: new Date().toISOString()
                });
            } else if (![UserRole.DEVELOPER, UserRole.ADMIN, UserRole.ORANG_TUA].includes(formData.role)) {
                userDoc.teacherId = formData.linkId;
                const teacherRef = db!.collection('teachers').doc(formData.linkId);
                batch.update(teacherRef, { 
                    linkedUserId: uid,
                    authUid: uid 
                });
            }
            
            // 4. Set User Doc
            batch.set(db!.collection('users').doc(uid), userDoc);
            
            await batch.commit();
            toast.success(`Akses untuk ${formData.displayName} berhasil diaktifkan!`, { id: toastId });
            setActiveTab('list');
            
            // Reset form
            setFormData({ displayName: '', email: '', password: '', role: UserRole.SISWA, linkId: '', idUnik: '' });
        }
    } catch (err: any) {
        toast.error("Gagal aktivasi: " + err.message, { id: toastId });
    } finally {
        setSaving(false);
    }
  };

  const handleDeleteUser = async (user: UserData) => {
      if (user.uid === auth?.currentUser?.uid) {
          toast.error("Anda tidak dapat menghapus akun sendiri.");
          return;
      }
      
      if (window.confirm(`Hapus permanen akses login untuk ${user.displayName}?\n\nCATATAN: Data induk tetap ada, namun status KLAIM akan direset sehingga data bisa dihubungkan ke akun lain.`)) {
          const toastId = toast.loading("Mereset status klaim & menghapus user...");
          try {
              if (!isMockMode && db) {
                  const batch = db.batch();
                  
                  // Reset status di data induk
                  if (user.studentId) {
                      batch.update(db.collection('students').doc(user.studentId), {
                          isClaimed: false,
                          authUid: "",
                          linkedUserId: "",
                          accountStatus: "Inactive"
                      });
                  } else if (user.teacherId) {
                      batch.update(db.collection('teachers').doc(user.teacherId), {
                          linkedUserId: "",
                          authUid: ""
                      });
                  }

                  // Hapus dari koleksi users
                  batch.delete(db.collection('users').doc(user.uid));
                  
                  await batch.commit();
                  // Note: Firebase Auth deletion typically requires admin SDK or re-auth, handled manually or via admin console
              }
              toast.success("User & status klaim berhasil direset.", { id: toastId });
          } catch (e: any) {
              toast.error("Gagal menghapus: " + e.message, { id: toastId });
          }
      }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;
      
      setSaving(true);
      const toastId = toast.loading("Memperbarui profil akses...");
      try {
          if (!isMockMode && db) {
              await db.collection('users').doc(editingUser.uid).update({
                  displayName: editingUser.displayName,
                  role: editingUser.role
              });
          }
          toast.success("Informasi akses diperbarui.", { id: toastId });
          setIsEditModalOpen(false);
      } catch (e: any) {
          toast.error("Gagal memperbarui: " + e.message, { id: toastId });
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
    <Layout title="Otoritas User" subtitle="Manajemen Hak Akses & Klaim" icon={ShieldCheckIcon} onBack={onBack}>
      <div className="p-4 lg:p-8 pb-32 max-w-5xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#151E32] p-4 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit shadow-inner">
                <button onClick={() => setActiveTab('list')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-400'}`}>
                    <RectangleStackIcon className="w-3.5 h-3.5" /> Database User
                </button>
                <button onClick={() => setActiveTab('create')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'create' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>
                    <PlusIcon className="w-3.5 h-3.5" /> Aktivasi Akun
                </button>
            </div>
            
            <div className="relative flex-1 md:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Cari pengguna..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-[10px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" 
                />
            </div>
        </div>

        {activeTab === 'list' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-500">
                {loading ? (
                    <div className="col-span-full py-24 text-center flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 opacity-30" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Querying Neural Core...</p>
                    </div>
                ) : filteredUsers.map(user => (
                    <div key={user.uid} className="bg-white dark:bg-[#151E32] p-5 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 flex items-center gap-4 group hover:border-indigo-300 transition-all relative overflow-hidden shadow-sm">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-black text-lg shrink-0 border border-indigo-100 dark:border-indigo-800">
                            {(user.displayName || '?').charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="font-black text-slate-800 dark:text-white text-[11px] uppercase truncate tracking-tight leading-none mb-1">{user.displayName}</h4>
                            <p className="text-[9px] font-bold text-slate-400 truncate opacity-70 mb-2">{user.email}</p>
                            <span className="inline-block px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-md text-[7px] font-black uppercase tracking-[0.2em]">{user.role}</span>
                        </div>
                        
                        <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0 translate-x-4">
                            <button 
                                onClick={() => { setEditingUser({...user}); setIsEditModalOpen(true); }}
                                className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100"
                                title="Edit Akses"
                            >
                                <PencilIcon className="w-3.5 h-3.5" />
                            </button>
                            <button 
                                onClick={() => handleDeleteUser(user)}
                                className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100"
                                title="Hapus User"
                            >
                                <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
                {filteredUsers.length === 0 && !loading && (
                    <div className="col-span-full py-32 text-center opacity-30 flex flex-col items-center gap-4">
                        <XCircleIcon className="w-12 h-12" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Tidak ada data ditemukan</p>
                    </div>
                )}
            </div>
        ) : (
            <div className="max-w-xl mx-auto bg-white dark:bg-[#151E32] p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
                <form onSubmit={handleCreateAccount} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <ShieldCheckIcon className="w-3.5 h-3.5" /> Pilih Peran Otoritas
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[UserRole.ADMIN, UserRole.WALI_KELAS, UserRole.GURU, UserRole.STAF, UserRole.SISWA, UserRole.ORANG_TUA, UserRole.KEPALA_MADRASAH].map(r => (
                                <button key={r} type="button" onClick={() => setFormData({...formData, role: r as UserRole, linkId: '', displayName: ''})} className={`py-3.5 rounded-xl text-[8px] font-black uppercase border transition-all ${formData.role === r ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-900 border-transparent text-slate-400'}`}>{r}</button>
                            ))}
                        </div>
                    </div>

                    {![UserRole.ADMIN, UserRole.DEVELOPER].includes(formData.role) && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <IdentificationIcon className="w-3.5 h-3.5" /> Hubungkan Data Induk (Unclaimed)
                            </label>
                            <div className="relative group">
                                <select required value={formData.linkId} onChange={e => {
                                    const id = e.target.value;
                                    const sel = [UserRole.SISWA, UserRole.ORANG_TUA].includes(formData.role) ? students.find(s=>s.id===id) : teachers.find(t=>t.id===id);
                                    setFormData({
                                        ...formData, 
                                        linkId: id, 
                                        displayName: [UserRole.SISWA, UserRole.ORANG_TUA].includes(formData.role) ? (sel as Student)?.namaLengkap : (sel as Teacher)?.name, 
                                        idUnik: [UserRole.SISWA, UserRole.ORANG_TUA].includes(formData.role) ? (sel as Student)?.idUnik : (sel as Teacher)?.nip 
                                    });
                                }} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black outline-none border border-slate-200 dark:border-slate-700 appearance-none cursor-pointer uppercase shadow-inner group-focus-within:border-indigo-500 transition-all">
                                    <option value="">-- PILIH DATA BELUM TERHUBUNG --</option>
                                    {availableLinks.length > 0 ? (
                                        [UserRole.SISWA, UserRole.ORANG_TUA].includes(formData.role) ? 
                                        (availableLinks as Student[]).map(s => <option key={s.id} value={s.id!}>{s.namaLengkap} ({s.idUnik})</option>) : 
                                        (availableLinks as Teacher[]).map(t => <option key={t.id} value={t.id!}>{t.name} ({t.nip})</option>)
                                    ) : (
                                        <option disabled value="">TIDAK ADA DATA TERSEDIA</option>
                                    )}
                                </select>
                                <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    )}

                    {([UserRole.ADMIN, UserRole.DEVELOPER].includes(formData.role)) && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Tampilan Identitas</label>
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input required type="text" placeholder="NAMA LENGKAP ADMIN" value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value.toUpperCase()})} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none shadow-inner uppercase" />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Kredensial</label>
                            <div className="relative">
                                <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input required type="email" placeholder="email@sekolah.id" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value.toLowerCase()})} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none shadow-inner" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password Akses</label>
                            <div className="relative">
                                <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input required type="password" placeholder="MIN. 6 KARAKTER" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none shadow-inner" />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex gap-3">
                        <InfoIcon className="w-5 h-5 text-indigo-500 shrink-0" />
                        <p className="text-[9px] text-indigo-700 dark:text-indigo-300 font-bold uppercase leading-relaxed tracking-tight">Menghubungkan akun akan secara otomatis memperbarui status keterkaitan pada data induk (Siswa/Guru/Orang Tua) agar relasi akun terjaga.</p>
                    </div>

                    <button type="submit" disabled={saving} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.3em] shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 transition-all">
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
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-md rounded-[3rem] p-8 shadow-2xl animate-in zoom-in duration-300 border border-white/10 relative overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="flex justify-between items-center mb-8">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Koreksi Akses</h3>
                          <p className="text-[9px] font-bold text-indigo-500 uppercase mt-2 tracking-widest">UID: {editingUser.uid.substring(0,12)}...</p>
                      </div>
                      <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"><XCircleIcon className="w-8 h-8" /></button>
                  </div>

                  <form onSubmit={handleUpdateUser} className="space-y-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Tampilan Identitas</label>
                          <input required type="text" value={editingUser.displayName} onChange={e => setEditingUser({...editingUser, displayName: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none shadow-inner" />
                      </div>
                      
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Peran Otoritas Sistem</label>
                          <div className="relative">
                            <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black outline-none uppercase appearance-none cursor-pointer shadow-inner">
                                {[UserRole.ADMIN, UserRole.WALI_KELAS, UserRole.GURU, UserRole.STAF, UserRole.SISWA, UserRole.KEPALA_MADRASAH, UserRole.DEVELOPER].map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                            <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          </div>
                      </div>

                      <div className="pt-4 flex gap-4">
                          <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Batalkan</button>
                          <button type="submit" disabled={saving} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50">
                              {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <SaveIcon className="w-4 h-4" />} KOMIT PERUBAHAN
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
