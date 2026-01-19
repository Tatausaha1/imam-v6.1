
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
  SparklesIcon,
  FileText, Squares2x2Icon, RectangleStackIcon,
  HeartIcon,
  AppLogo,
  ShieldCheckIcon
} from './Icons';

const StudentData: React.FC<{ onBack: () => void, userRole: UserRole }> = ({ onBack, userRole }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [classList, setClassList] = useState<string[]>([]);

  const initialFormState: Partial<Student> = {
    namaLengkap: '', nisn: '', idUnik: '', nik: '', email: '', tingkatRombel: '', status: 'Aktif', jenisKelamin: 'Laki-laki',
    noTelepon: '', alamat: ''
  };

  const [formData, setFormData] = useState<Partial<Student>>(initialFormState);

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

  useEffect(() => {
    setLoading(true);
    if (isMockMode) {
        setTimeout(() => {
            setStudents([{ id: 'm1', namaLengkap: 'DIENDE ADELLYA AQILLA', nisn: '0086806447', tingkatRombel: 'XII A', status: 'Aktif', jenisKelamin: 'Perempuan' } as Student]);
            setLoading(false);
        }, 1000);
        return;
    }
    if (!db) return;
    let query: any = db.collection('students');
    if (selectedClass !== 'All') { query = query.where('tingkatRombel', '==', selectedClass); } else { query = query.orderBy('namaLengkap').limit(100); }

    const unsubscribe = query.onSnapshot(
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
  }, [selectedClass]);

  const processedStudents = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return students;
    return students.filter(s => String(s.namaLengkap || '').toLowerCase().includes(query) || String(s.nisn || '').toLowerCase().includes(query));
  }, [students, searchQuery]);

  const handleAddNew = () => { setEditingId(null); setFormData({ ...initialFormState, tingkatRombel: selectedClass !== 'All' ? selectedClass : '' }); setIsModalOpen(true); };
  const handleEdit = (student: Student) => { setEditingId(student.id || null); setFormData({ ...student }); setIsModalOpen(true); };
  const handleDelete = async (student: Student) => {
      if (!student.id) return;
      if (window.confirm(`Hapus data siswa ${student.namaLengkap}?`)) {
          const toastId = toast.loading("Menghapus...");
          try { await deleteStudent(student.id); toast.success("Berhasil dihapus.", { id: toastId }); } catch (e) { toast.error("Gagal.", { id: toastId }); }
      }
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
          if (editingId) { await updateStudent(editingId, formData); toast.success("Data diperbarui."); }
          else { await addStudent(formData as Student); toast.success("Berhasil."); }
          setIsModalOpen(false);
      } catch (e) { toast.error("Gagal menyimpan."); } finally { setSaving(false); }
  };

  return (
    <Layout title="Data Siswa" subtitle={selectedClass === 'All' ? "Seluruh Siswa" : `Kelas ${selectedClass}`} icon={UsersGroupIcon} onBack={onBack}>
      <div className="p-4 lg:p-8 pb-32 space-y-6">
        <div className="bg-white dark:bg-[#151E32] p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="relative group"><Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Cari Nama atau NISN..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold outline-none text-slate-800 dark:text-white" /></div>
            <div className="flex gap-3">
                <div className="relative flex-1"><select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-[10px] font-black uppercase outline-none appearance-none cursor-pointer text-slate-700 dark:text-slate-300"><option value="All">Semua Rombel</option>{classList.map(c => <option key={c} value={c}>{c}</option>)}</select><ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" /></div>
                {(userRole === UserRole.ADMIN || userRole === UserRole.DEVELOPER) && (
                    <button 
                        onClick={handleAddNew} 
                        disabled={loading}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${loading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'}`}
                    >
                        <PlusIcon className="w-4 h-4" /> Tambah
                    </button>
                )}
            </div>
        </div>
        {loading ? (
            <div className="text-center py-20 flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500 opacity-20" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memetakan Siswa...</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-500">
                {processedStudents.map((s) => (
                    <div key={s.id} className="bg-white dark:bg-[#151E32] p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center group transition-all">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border ${s.jenisKelamin === 'Perempuan' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{(s.namaLengkap || '?').charAt(0)}</div>
                            <div className="min-w-0"><h4 className="font-black text-slate-800 dark:text-white text-[11px] uppercase truncate max-w-[120px]">{s.namaLengkap}</h4><p className="text-[9px] font-bold text-slate-400 uppercase">{s.nisn}</p></div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleEdit(s)} className="p-2 text-slate-400 hover:text-indigo-600"><PencilIcon className="w-4 h-4"/></button><button onClick={() => handleDelete(s)} className="p-2 text-slate-400 hover:text-rose-600"><TrashIcon className="w-4 h-4"/></button></div>
                    </div>
                ))}
            </div>
        )}
      </div>
      {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-8"><div><h3 className="text-xl font-black text-slate-800 dark:text-white uppercase leading-none">Profil Siswa</h3><p className="text-[9px] font-bold text-indigo-500 uppercase mt-2">Sinkronisasi Database</p></div><button onClick={() => setIsModalOpen(false)}><XCircleIcon className="w-8 h-8 text-slate-400" /></button></div>
                  <form onSubmit={handleSave} className="space-y-5">
                      <input required type="text" value={formData.namaLengkap || ''} onChange={e => setFormData({...formData, namaLengkap: (e.target.value || '').toUpperCase()})} className="w-full bg-slate-50 dark:bg-slate-900 border rounded-2xl px-5 py-3.5 text-xs font-bold" placeholder="NAMA LENGKAP" />
                      <input required type="text" value={formData.nisn || ''} onChange={e => setFormData({...formData, nisn: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border rounded-2xl px-5 py-3.5 text-xs font-bold" placeholder="NISN" />
                      <button type="submit" disabled={saving} className="w-full py-4 bg-indigo-600 text-white font-black rounded-[2rem] shadow-xl">{saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "SIMPAN DATA"}</button>
                  </form>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default StudentData;
