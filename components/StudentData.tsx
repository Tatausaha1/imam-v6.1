import React, { useState, useEffect, useMemo } from 'react';
import { getStudents, bulkImportStudents, deleteStudent, updateStudent, addStudent } from '../services/studentService';
import { Student, UserRole } from '../types';
import { db, isMockMode } from '../services/firebase';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import Layout from './Layout';
import { 
  UsersGroupIcon, 
  PencilIcon, TrashIcon, Search, PlusIcon,
  Loader2, XCircleIcon, SaveIcon, UserIcon,
  BuildingLibraryIcon, AcademicCapIcon, PhoneIcon,
  EnvelopeIcon, MapPinIcon, ChevronDownIcon, QrCodeIcon
} from './Icons';

const StudentData: React.FC<{ onBack: () => void, userRole: UserRole }> = ({ onBack, userRole }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Student>>({
      namaLengkap: '',
      nisn: '',
      idUnik: '',
      tingkatRombel: '',
      status: 'Aktif',
      jenisKelamin: 'Laki-laki',
      email: '',
      noTelepon: '',
      alamat: ''
  });

  useEffect(() => {
    setLoading(true);
    if (isMockMode) { 
        getStudents().then(data => { setStudents(data); setLoading(false); }); 
        return; 
    }
    if (!db) { setLoading(false); return; }

    const unsubscribe = db.collection('students').orderBy('namaLengkap').onSnapshot(snapshot => {
        const liveData = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            idUnik: doc.data().idUnik || doc.data().nisn || doc.id
        } as Student));
        setStudents(liveData);
        setLoading(false);
    }, err => {
        console.error(err);
        toast.error("Gagal memuat data dari server.");
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.tingkatRombel).filter(Boolean))).sort(), [students]);

  const processedStudents = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return students.filter(s => {
      const nama = String(s.namaLengkap || '').toLowerCase();
      const nisn = String(s.nisn || '').toLowerCase();
      const matchSearch = query === '' || nama.includes(query) || nisn.includes(query);
      const matchClass = selectedClass === 'All' || s.tingkatRombel === selectedClass;
      return matchSearch && matchClass;
    });
  }, [students, searchQuery, selectedClass]);

  const handleAddNew = () => {
      setEditingId(null);
      setFormData({
          namaLengkap: '',
          nisn: '',
          idUnik: '',
          tingkatRombel: selectedClass !== 'All' ? selectedClass : '',
          status: 'Aktif',
          jenisKelamin: 'Laki-laki',
          email: '',
          noTelepon: '',
          alamat: ''
      });
      setIsModalOpen(true);
  };

  const handleEdit = (student: Student) => {
      setEditingId(student.id || null);
      setFormData({ ...student });
      setIsModalOpen(true);
  };

  const handleDelete = async (student: Student) => {
      if (!student.id) return;
      if (window.confirm(`Hapus data siswa ${student.namaLengkap}? Tindakan ini tidak dapat dibatalkan.`)) {
          const toastId = toast.loading("Menghapus data...");
          try {
              await deleteStudent(student.id);
              toast.success("Data siswa berhasil dihapus.", { id: toastId });
          } catch (e) {
              toast.error("Gagal menghapus data.", { id: toastId });
          }
      }
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.namaLengkap || !formData.nisn || !formData.tingkatRombel) {
          toast.error("Mohon lengkapi Nama, NISN, dan Kelas.");
          return;
      }

      setSaving(true);
      try {
          if (editingId) {
              await updateStudent(editingId, formData);
              toast.success("Data siswa diperbarui.");
          } else {
              await addStudent(formData as Student);
              toast.success("Siswa baru berhasil ditambahkan.");
          }
          setIsModalOpen(false);
      } catch (e) {
          console.error(e);
          toast.error("Gagal menyimpan data.");
      } finally {
          setSaving(false);
      }
  };

  const getStatusColor = (s: string) => {
      if(s === 'Aktif') return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30';
      if(s === 'Lulus') return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30';
      return 'bg-rose-50 text-rose-600 dark:bg-rose-900/30';
  };

  return (
    <Layout title="Database Siswa" subtitle={`${students.length} Total Data Terdaftar`} icon={UsersGroupIcon} onBack={onBack}>
      <div className="p-3 lg:p-6 pb-32 space-y-4">
        
        {/* FILTERS & SEARCH */}
        <div className="bg-white dark:bg-[#151E32] p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
            <div className="relative group">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Cari Nama atau NISN..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-transparent rounded-2xl py-3 pl-11 pr-4 text-xs font-bold focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                />
            </div>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <select 
                        value={selectedClass} 
                        onChange={(e) => setSelectedClass(e.target.value)} 
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl py-3 px-4 text-[10px] font-black uppercase outline-none appearance-none cursor-pointer"
                    >
                        <option value="All">Semua Kelas</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                <button 
                    onClick={handleAddNew}
                    className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                >
                    <PlusIcon className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* LIST TABLE */}
        <div className="bg-white dark:bg-[#151E32] rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm min-h-[400px]">
            {loading ? (
                <div className="py-32 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500 opacity-30" /></div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-5 py-4">Informasi Siswa</th>
                                <th className="px-4 py-4 text-center">Rombel</th>
                                <th className="px-4 py-4 text-center">Status</th>
                                <th className="px-5 py-4 text-right">Kelola</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {processedStudents.length > 0 ? (
                                processedStudents.map((s) => (
                                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-black text-xs shadow-inner">
                                                    {s.namaLengkap.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-black text-slate-800 dark:text-white text-[11px] truncate uppercase tracking-tight">{s.namaLengkap}</div>
                                                    <div className="text-[9px] text-slate-400 font-mono mt-0.5">{s.nisn}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">{s.tingkatRombel}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${getStatusColor(s.status)}`}>{s.status}</span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleEdit(s)}
                                                    className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors"
                                                >
                                                    <PencilIcon className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(s)}
                                                    className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-600 transition-colors"
                                                >
                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-32 text-center">
                                        <XCircleIcon className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Siswa tidak ditemukan</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>

        {/* EDITOR MODAL */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
                        <div>
                            <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                {editingId ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
                            </h3>
                            <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Entri Database Madrasah</p>
                        </div>
                        <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                            <XCircleIcon className="w-7 h-7 text-slate-400" />
                        </button>
                    </div>

                    {/* Form Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <form id="studentForm" onSubmit={handleSave} className="space-y-6">
                            
                            {/* Identitas Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <UserIcon className="w-4 h-4 text-indigo-500" />
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identitas Utama</h4>
                                </div>
                                
                                <div className="group">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 group-focus-within:text-indigo-500 transition-colors">Nama Lengkap Siswa</label>
                                    <input 
                                        required type="text" value={formData.namaLengkap || ''}
                                        onChange={e => setFormData({...formData, namaLengkap: e.target.value.toUpperCase()})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                        placeholder="CONTOH: AHMAD DAHLAN"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="group">
                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">NISN (Wajib)</label>
                                        <input 
                                            required type="text" value={formData.nisn || ''}
                                            onChange={e => setFormData({...formData, nisn: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-xs font-mono font-bold outline-none"
                                            placeholder="008..."
                                        />
                                    </div>
                                    <div className="group">
                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                                            <QrCodeIcon className="w-3 h-3"/> ID Scan (Auto)
                                        </label>
                                        <input 
                                            type="text" value={formData.idUnik || ''}
                                            onChange={e => setFormData({...formData, idUnik: e.target.value})}
                                            className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-xs font-mono font-bold outline-none opacity-70"
                                            placeholder="Gunakan NISN jika kosong"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Akademik Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <BuildingLibraryIcon className="w-4 h-4 text-emerald-500" />
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Akademik & Status</h4>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="group">
                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Rombel / Kelas</label>
                                        <input 
                                            required type="text" value={formData.tingkatRombel || ''}
                                            onChange={e => setFormData({...formData, tingkatRombel: e.target.value.toUpperCase()})}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none"
                                            placeholder="X IPA 1"
                                        />
                                    </div>
                                    <div className="group">
                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Status Aktif</label>
                                        <select 
                                            value={formData.status}
                                            onChange={e => setFormData({...formData, status: e.target.value as any})}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none cursor-pointer"
                                        >
                                            <option value="Aktif">Aktif</option>
                                            <option value="Lulus">Lulus</option>
                                            <option value="Mutasi">Mutasi</option>
                                            <option value="Keluar">Keluar</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="group">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Jenis Kelamin</label>
                                    <select 
                                        value={formData.jenisKelamin}
                                        onChange={e => setFormData({...formData, jenisKelamin: e.target.value as any})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none cursor-pointer"
                                    >
                                        <option value="Laki-laki">Laki-laki</option>
                                        <option value="Perempuan">Perempuan</option>
                                    </select>
                                </div>
                            </div>

                            {/* Kontak Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <PhoneIcon className="w-4 h-4 text-blue-500" />
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informasi Kontak</h4>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="group">
                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nomor Telepon</label>
                                        <input 
                                            type="tel" value={formData.noTelepon || ''}
                                            onChange={e => setFormData({...formData, noTelepon: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none"
                                            placeholder="08..."
                                        />
                                    </div>
                                    <div className="group">
                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Email</label>
                                        <input 
                                            type="email" value={formData.email || ''}
                                            onChange={e => setFormData({...formData, email: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none"
                                            placeholder="nama@email.com"
                                        />
                                    </div>
                                </div>

                                <div className="group">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Alamat Lengkap</label>
                                    <textarea 
                                        rows={3} value={formData.alamat || ''}
                                        onChange={e => setFormData({...formData, alamat: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none resize-none"
                                        placeholder="Jl. Merdeka No..."
                                    />
                                </div>
                            </div>

                        </form>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-slate-50/50 dark:bg-slate-900 sticky bottom-0">
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                        >
                            Batal
                        </button>
                        <button 
                            type="submit" form="studentForm" disabled={saving}
                            className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4" />}
                            Simpan Data
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </Layout>
  );
};

export default StudentData;