
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import { deleteStudent, updateStudent, addStudent } from '../services/studentService';
import { Student, UserRole } from '../types';
import { db, auth, isMockMode } from '../services/firebase';
import { toast } from 'sonner';
import Layout from './Layout';
import { 
  UsersGroupIcon, 
  PencilIcon, TrashIcon, Search, PlusIcon,
  Loader2, XCircleIcon, SaveIcon, UserIcon,
  AcademicCapIcon, PhoneIcon,
  EnvelopeIcon, MapPinIcon, ChevronDownIcon,
  SparklesIcon, IdentificationIcon, CalendarIcon,
  BriefcaseIcon, HeartIcon
} from './Icons';

const StudentData: React.FC<{ onBack: () => void, userRole: UserRole }> = ({ onBack, userRole }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [classList, setClassList] = useState<string[]>([]);

  const initialFormState: Partial<Student> = {
    namaLengkap: '',
    nisn: '',
    idUnik: '',
    nik: '',
    email: '',
    userlogin: '',
    tempatLahir: '',
    tanggalLahir: '',
    tingkatRombel: '',
    status: 'Aktif',
    jenisKelamin: 'Laki-laki',
    noTelepon: '',
    alamat: '',
    namaAyahKandung: '',
    namaIbuKandung: '',
    namaWali: ''
  };

  const [formData, setFormData] = useState<Partial<Student>>(initialFormState);

  // Load class list for form selection only
  useEffect(() => {
    if (isMockMode) {
      setClassList(['X IPA 1', 'XI IPS 1', 'XII AGAMA']);
      return;
    }
    if (db) {
      db.collection('classes').get().then(snap => {
        setClassList(snap.docs.map(d => d.data().name).sort());
      }).catch(e => console.warn("Firestore permissions: classList", e.message));
    }
  }, []);

  // Fetch ALL students from database
  useEffect(() => {
    setLoading(true);
    if (isMockMode) {
        setTimeout(() => {
            setStudents([
                { id: 'm1', namaLengkap: 'DIENDE ADELLYA AQILLA', nisn: '0086806447', idUnik: '15012', email: 'adella@imam.sch.id', userlogin: 'adella.aqilla', tingkatRombel: 'XII IPA 1', status: 'Aktif', jenisKelamin: 'Perempuan' } as Student,
                { id: 'm2', namaLengkap: 'AHMAD DAHLAN', nisn: '0011223344', idUnik: '15015', email: 'dahlan@gmail.com', userlogin: 'dahlan.88', tingkatRombel: '', status: 'Aktif', jenisKelamin: 'Laki-laki' } as Student
            ]);
            setLoading(false);
        }, 1000);
        return;
    }
    if (!db) return;
    
    // Query seluruh database (Limit 500 untuk performa mobile)
    const unsubscribe = db.collection('students')
        .orderBy('namaLengkap')
        .limit(500)
        .onSnapshot(
            snapshot => {
                setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
                setLoading(false);
            }, 
            err => {
                console.warn("Student fetch denied:", err.message);
                setLoading(false);
            }
        );
    return () => unsubscribe();
  }, []);

  // Enhanced Search Logic
  const processedStudents = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return students;
    return students.filter(s => 
        String(s.namaLengkap || '').toLowerCase().includes(query) || 
        String(s.nisn || '').toLowerCase().includes(query) ||
        String(s.idUnik || '').toLowerCase().includes(query) ||
        String(s.email || '').toLowerCase().includes(query) ||
        String(s.userlogin || '').toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  const handleAddNew = () => { 
    setEditingId(null); 
    setFormData({ ...initialFormState }); 
    setIsModalOpen(true); 
  };

  const handleEdit = (student: Student) => { 
    setEditingId(student.id || null); 
    setFormData({ ...student }); 
    setIsModalOpen(true); 
  };

  const handleDelete = async (student: Student) => {
      if (!student.id) return;
      if (window.confirm(`Hapus permanen data siswa ${student.namaLengkap}? Tindakan ini tidak dapat dibatalkan.`)) {
          const toastId = toast.loading("Menghapus data...");
          try { 
              await deleteStudent(student.id); 
              toast.success("Data berhasil dihapus.", { id: toastId }); 
          } catch (e) { 
              toast.error("Gagal menghapus data.", { id: toastId }); 
          }
      }
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.namaLengkap || !formData.nisn) {
          toast.error("Nama dan NISN wajib diisi.");
          return;
      }
      setSaving(true);
      const toastId = toast.loading("Menyimpan data...");
      try {
          if (editingId) { 
              await updateStudent(editingId, formData); 
              toast.success("Profil siswa diperbarui.", { id: toastId }); 
          }
          else { 
              await addStudent(formData as Student); 
              toast.success("Siswa baru berhasil ditambahkan.", { id: toastId }); 
          }
          setIsModalOpen(false);
      } catch (e) { 
          toast.error("Gagal menyimpan data."); 
      } finally { 
          setSaving(false); 
      }
  };

  const canManage = userRole === UserRole.ADMIN || userRole === UserRole.DEVELOPER;

  return (
    <Layout title="Master Data Siswa" subtitle="Database Induk Terpusat" icon={UsersGroupIcon} onBack={onBack}>
      <div className="p-4 lg:p-8 pb-32 space-y-6">
        
        {/* Search Header - Filter Rombel Dihapus */}
        <div className="bg-white dark:bg-[#151E32] p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4">
            <div className="relative group flex-1">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Cari Nama, NISN, ID Unik, Email, atau Login..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-transparent rounded-[1.5rem] py-4 pl-12 pr-4 text-xs font-bold outline-none text-slate-800 dark:text-white shadow-inner focus:bg-white transition-all" 
                />
            </div>
            {canManage && (
                <button 
                    onClick={handleAddNew} 
                    disabled={loading}
                    className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${loading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 active:scale-95'}`}
                >
                    <PlusIcon className="w-4 h-4" /> Tambah Siswa
                </button>
            )}
        </div>

        {/* Info Stats */}
        {!loading && (
            <div className="flex items-center justify-between px-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Menampilkan {processedStudents.length} dari {students.length} Data</p>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-800">
                    <SparklesIcon className="w-3 h-3" />
                    <span className="text-[8px] font-black uppercase">Master Sync</span>
                </div>
            </div>
        )}

        {/* Content Area */}
        {loading ? (
            <div className="text-center py-24 flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500 opacity-20" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Sinkronisasi Database...</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-700">
                {processedStudents.map((s) => (
                    <div key={s.id} className="bg-white dark:bg-[#151E32] p-5 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center group transition-all hover:shadow-xl hover:border-indigo-100 dark:hover:border-indigo-900/50">
                        <div className="flex items-center gap-4 min-w-0">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base border shadow-sm shrink-0 transition-transform group-hover:scale-110 ${s.jenisKelamin === 'Perempuan' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                {(s.namaLengkap || '?').charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <h4 className="font-black text-slate-800 dark:text-white text-[11px] uppercase truncate leading-tight">{s.namaLengkap}</h4>
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-tighter ${s.tingkatRombel ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                                        {s.tingkatRombel || 'TANPA ROMBEL'}
                                    </span>
                                    <span className="text-[9px] font-mono font-bold text-slate-400">{s.nisn}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => handleEdit(s)} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 hover:bg-white transition-all shadow-sm"><PencilIcon className="w-4 h-4"/></button>
                            <button onClick={() => handleDelete(s)} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-600 hover:bg-white transition-all shadow-sm"><TrashIcon className="w-4 h-4"/></button>
                        </div>
                    </div>
                ))}
                {processedStudents.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-white dark:bg-[#151E32] rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                         <Search className="w-12 h-12 text-slate-100 dark:text-slate-800 mx-auto mb-4" />
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tidak ada siswa yang cocok</p>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* FORM MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-2xl rounded-[2.5rem] shadow-2xl animate-in zoom-in duration-300 flex flex-col max-h-[90vh] border border-white/10 relative overflow-hidden">
                  
                  {/* Modal Header */}
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#0B1121] z-10">
                      <div>
                          <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase leading-none">{editingId ? 'Edit Profil Siswa' : 'Registrasi Siswa Baru'}</h3>
                          <p className="text-[9px] font-bold text-indigo-500 uppercase mt-2 tracking-widest">Update Informasi Master Database</p>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                          <XCircleIcon className="w-8 h-8" />
                      </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 lg:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8 pb-12">
                      <form id="studentForm" onSubmit={handleSave} className="space-y-10">
                          
                          <div className="space-y-5">
                              <h5 className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-indigo-50 dark:border-indigo-900/30 pb-2">
                                  <IdentificationIcon className="w-3.5 h-3.5" /> Data Identitas & Login
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  <div className="space-y-1.5 md:col-span-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap *</label>
                                      <input required type="text" value={formData.namaLengkap || ''} onChange={e => setFormData({...formData, namaLengkap: (e.target.value || '').toUpperCase()})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner" placeholder="NAMA LENGKAP" />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NISN *</label>
                                      <input required type="text" value={formData.nisn || ''} onChange={e => setFormData({...formData, nisn: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold" />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ID Unik Lokal</label>
                                      <input type="text" value={formData.idUnik || ''} onChange={e => setFormData({...formData, idUnik: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold" />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">User Login / Username</label>
                                      <input type="text" value={formData.userlogin || ''} onChange={e => setFormData({...formData, userlogin: e.target.value.toLowerCase()})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold" placeholder="username.siswa" />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                                      <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value.toLowerCase()})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold" placeholder="email@imam.id" />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rombel / Kelas</label>
                                      <div className="relative">
                                          <select value={formData.tingkatRombel || ''} onChange={e => setFormData({...formData, tingkatRombel: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold appearance-none cursor-pointer">
                                              <option value="">-- TANPA ROMBEL --</option>
                                              {classList.map(c => <option key={c} value={c}>{c}</option>)}
                                          </select>
                                          <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                      </div>
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                                      <select value={formData.status || 'Aktif'} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold">
                                          <option value="Aktif">Aktif</option>
                                          <option value="Lulus">Lulus</option>
                                          <option value="Mutasi">Mutasi</option>
                                          <option value="Nonaktif">Nonaktif</option>
                                      </select>
                                  </div>
                              </div>
                          </div>

                          <div className="space-y-5">
                              <h5 className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-emerald-50 dark:border-emerald-900/30 pb-2">
                                  <UserIcon className="w-3.5 h-3.5" /> Profil Personal
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jenis Kelamin</label>
                                      <div className="grid grid-cols-2 gap-2">
                                          <button type="button" onClick={() => setFormData({...formData, jenisKelamin: 'Laki-laki'})} className={`py-3.5 rounded-xl border text-[10px] font-black uppercase transition-all ${formData.jenisKelamin === 'Laki-laki' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'}`}>Laki-laki</button>
                                          <button type="button" onClick={() => setFormData({...formData, jenisKelamin: 'Perempuan'})} className={`py-3.5 rounded-xl border text-[10px] font-black uppercase transition-all ${formData.jenisKelamin === 'Perempuan' ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'}`}>Perempuan</button>
                                      </div>
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">No. WhatsApp</label>
                                      <input type="text" value={formData.noTelepon || ''} onChange={e => setFormData({...formData, noTelepon: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold" />
                                  </div>
                              </div>
                          </div>
                      </form>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1121] flex gap-4 z-10">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-500 font-black rounded-2xl border border-slate-200 dark:border-slate-700 active:scale-95 transition-all text-[10px] uppercase tracking-widest shadow-sm">Batal</button>
                      <button type="submit" form="studentForm" disabled={saving} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-2xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <SaveIcon className="w-5 h-5" />}
                        <span className="uppercase tracking-[0.2em] text-[10px]">{editingId ? 'SIMPAN PERUBAHAN' : 'DAFTARKAN SISWA'}</span>
                      </button>
                  </div>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default StudentData;
