
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { deleteStudent, updateStudent, addStudent, moveStudentToCollection, bulkImportStudents } from '../services/studentService';
import { Student, UserRole } from '../types';
import { db, isMockMode } from '../services/firebase';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import Layout from './Layout';
import { 
  UsersGroupIcon, 
  PencilIcon, TrashIcon, Search, PlusIcon,
  Loader2, XCircleIcon, SaveIcon, 
  IdentificationIcon, ChevronDownIcon,
  PhoneIcon,
  ShieldCheckIcon,
  MapPinIcon,
  EnvelopeIcon,
  CalendarIcon,
  UserIcon,
  ArrowRightIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  BuildingLibraryIcon,
  FileSpreadsheet,
  ArrowDownTrayIcon,
  ArrowPathIcon
} from './Icons';

const StudentData: React.FC<{ onBack: () => void, userRole: UserRole }> = ({ onBack, userRole }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [classList, setClassList] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Filter
  const [globalSearch, setGlobalSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterKelas, setFilterKelas] = useState('All'); 
  const [filterStatus, setFilterStatus] = useState('All');

  const initialFormState: Partial<Student> = {
    idUnik: '', 
    namaLengkap: '', 
    nisn: '', 
    nik: '', 
    email: '',
    role: 'Siswa', 
    userlogin: '', 
    tingkatRombel: '', 
    status: 'Aktif',
    jenisKelamin: 'Laki-laki', 
    noTelepon: '', 
    alamat: '',
    tempatLahir: '',
    tanggalLahir: '',
    namaAyahKandung: '',
    namaIbuKandung: '',
    namaWali: '',
    nomorKIPP_PIP: '',
    kebutuhanKhusus: 'Tidak Ada',
    disabilitas: 'Tidak Ada'
  };

  const [formData, setFormData] = useState<Partial<Student>>(initialFormState);

  const fetchClasses = async () => {
    if (isMockMode) {
      setClassList(['10 A', '10 B', '11 A', '11 B', '12 A', '12 B']);
      return;
    }
    if (db) {
      db.collection('classes').get().then(snap => {
        const names = snap.docs.map(d => d.data().name).sort();
        setClassList(names);
      });
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchStudents = () => {
    setLoading(true);
    if (!db && !isMockMode) return;
    
    const unsubscribe = isMockMode 
        ? () => {} 
        : db!.collection('students').orderBy('namaLengkap').onSnapshot(snapshot => {
            setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
            setLoading(false);
        }, err => { setLoading(false); });

    if (isMockMode) {
        // Fix: Added isClaimed property to mock data
        setStudents([
            { id: '25002', namaLengkap: 'ADELIA SRI SUNDARI', nisn: '0086806440', idUnik: '25002', tingkatRombel: '12 A', status: 'Aktif', jenisKelamin: 'Perempuan', role: 'Siswa', noTelepon: '08123456789', isClaimed: false } as Student,
            { id: '25003', namaLengkap: 'AHMAD ZAKI', nisn: '0086806441', idUnik: '25003', tingkatRombel: '10 A', status: 'Aktif', jenisKelamin: 'Laki-laki', role: 'Siswa', isClaimed: false } as Student
        ]);
        setLoading(false);
    }
    return unsubscribe;
  };

  useEffect(() => {
    const unsub = fetchStudents();
    return () => { if(unsub) unsub(); };
  }, []);

  // Filter rombel berdasarkan tingkat yang dipilih
  const filteredClassOptions = useMemo(() => {
    if (filterLevel === 'All') return classList;
    return classList.filter(c => c.startsWith(filterLevel));
  }, [classList, filterLevel]);

  const processedStudents = useMemo(() => {
    return students.filter(s => {
        const q = globalSearch.toLowerCase().trim();
        const matchesGlobal = q === '' || 
            (s.namaLengkap || '').toLowerCase().includes(q) || 
            String(s.idUnik || '').toLowerCase().includes(q);
            
        const matchesLevel = filterLevel === 'All' || s.tingkatRombel?.startsWith(filterLevel);
        const matchesKelas = filterKelas === 'All' || s.tingkatRombel === filterKelas;
        const matchesStatus = filterStatus === 'All' || s.status === filterStatus;
        
        return matchesGlobal && matchesLevel && matchesKelas && matchesStatus;
    }).sort((a, b) => (a.namaLengkap || '').localeCompare(b.namaLengkap || ''));
  }, [students, globalSearch, filterLevel, filterKelas, filterStatus]);

  // --- LOGIKA EKSPOR EXCEL ---
  const handleExportExcel = () => {
      if (processedStudents.length === 0) {
          toast.error("Tidak ada data untuk diekspor.");
          return;
      }

      const toastId = toast.loading("Menyusun spreadsheet...");
      try {
          const exportData = processedStudents.map((s, idx) => ({
              'NO': idx + 1,
              'ID UNIK': s.idUnik,
              'NAMA LENGKAP': s.namaLengkap,
              'NISN': s.nisn,
              'NIK': s.nik || '',
              'ROMBEL': s.tingkatRombel,
              'JENIS KELAMIN': s.jenisKelamin,
              'WA/TELEPON': s.noTelepon || '',
              'ALAMAT': s.alamat || '',
              'TEMPAT LAHIR': s.tempatLahir || '',
              'TANGGAL LAHIR': s.tanggalLahir || '',
              'STATUS': s.status
          }));

          const worksheet = XLSX.utils.json_to_sheet(exportData);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Data Siswa");
          
          const dateStr = new Date().toISOString().split('T')[0];
          XLSX.writeFile(workbook, `DATABASE_SISWA_IMAM_${dateStr}.xlsx`);
          toast.success("File Excel berhasil diunduh.", { id: toastId });
      } catch (e) {
          toast.error("Gagal mengekspor data.", { id: toastId });
      }
  };

  // --- LOGIKA IMPOR EXCEL ---
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const toastId = toast.loading("Membaca file excel...");
      const reader = new FileReader();
      
      reader.onload = async (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const data = XLSX.utils.sheet_to_json(ws) as any[];

              if (data.length === 0) throw new Error("File kosong.");

              toast.loading(`Memproses ${data.length} data siswa...`, { id: toastId });

              // Fix: Added required isClaimed property to mapped students
              const formattedStudents: Student[] = data.map(item => ({
                  idUnik: String(item['ID UNIK'] || item['idUnik'] || '').trim(),
                  namaLengkap: String(item['NAMA LENGKAP'] || item['namaLengkap'] || '').toUpperCase(),
                  nisn: String(item['NISN'] || item['nisn'] || ''),
                  nik: String(item['NIK'] || item['nik'] || ''),
                  tingkatRombel: String(item['ROMBEL'] || item['tingkatRombel'] || ''),
                  jenisKelamin: ((item['JENIS KELAMIN'] || item['jenisKelamin']) === 'L' ? 'Laki-laki' : 'Perempuan') as 'Laki-laki' | 'Perempuan',
                  noTelepon: String(item['WA/TELEPON'] || item['noTelepon'] || ''),
                  alamat: String(item['ALAMAT'] || item['alamat'] || ''),
                  status: (item['STATUS'] || item['status'] || 'Aktif') as any,
                  role: 'Siswa',
                  isClaimed: false
              })).filter(s => s.idUnik && s.namaLengkap);

              if (formattedStudents.length === 0) throw new Error("Format kolom tidak sesuai. Pastikan ada kolom 'ID UNIK' dan 'NAMA LENGKAP'.");

              await bulkImportStudents(formattedStudents);
              toast.success(`Berhasil mengimpor ${formattedStudents.length} data ke database.`, { id: toastId });
              if (fileInputRef.current) fileInputRef.current.value = '';
          } catch (err: any) {
              toast.error(err.message || "Gagal memproses file.", { id: toastId });
          }
      };

      reader.readAsBinaryString(file);
  };

  const handleAddNew = () => { setEditingId(null); setFormData({ ...initialFormState }); setIsModalOpen(true); };
  
  const handleEdit = (student: Student) => { 
      setEditingId(student.id || student.idUnik || null); 
      setFormData({ ...student }); 
      setIsModalOpen(true); 
  };

  const handleMoveTo = async (target: 'alumni' | 'mutasi') => {
      if (!editingId) return;
      const confirmMsg = target === 'alumni' 
        ? `Luluskan ${formData.namaLengkap} ke database alumni?` 
        : `Pindahkan ${formData.namaLengkap} ke database mutasi?`;
        
      if (window.confirm(confirmMsg)) {
          setSaving(true);
          const toastId = toast.loading("Memindahkan data...");
          try {
              await moveStudentToCollection(editingId, target, "Pemindahan manual oleh admin");
              toast.success("Data berhasil dipindahkan.", { id: toastId });
              setIsModalOpen(false);
          } catch (e: any) {
              toast.error("Gagal memindahkan: " + e.message, { id: toastId });
          } finally {
              setSaving(false);
          }
      }
  };

  const handleDelete = async (student: Student) => {
      const idToDelete = student.id || student.idUnik;
      if (!idToDelete) return;
      if (window.confirm(`Hapus permanen data ${student.namaLengkap}?\nTindakan ini tidak dapat dibatalkan.`)) {
          const toastId = toast.loading("Menghapus data...");
          try { 
              await deleteStudent(idToDelete); 
              toast.success("Data berhasil dihapus.", { id: toastId }); 
          } catch (e) { 
              toast.error("Gagal menghapus data.", { id: toastId }); 
          }
      }
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.namaLengkap || !formData.idUnik) { 
          toast.error("Nama Lengkap dan ID UNIK wajib diisi."); 
          return; 
      }
      
      setSaving(true);
      const toastId = toast.loading(editingId ? "Memperbarui data..." : "Menyimpan data baru...");
      
      try {
          if (editingId) {
              await updateStudent(editingId, formData);
          } else {
              await addStudent(formData as Student);
          }
          toast.success("Database berhasil diperbarui.", { id: toastId });
          setIsModalOpen(false);
      } catch (e: any) { 
          toast.error("Gagal: " + (e.message || "Terjadi kesalahan"), { id: toastId }); 
      } finally { 
          setSaving(false); 
      }
  };

  // Admin dan Developer full access
  const canManage = userRole === UserRole.ADMIN || userRole === UserRole.DEVELOPER;

  return (
    <Layout title="Data Induk Siswa" subtitle="Database Terintegrasi" icon={UsersGroupIcon} onBack={onBack}>
      <div className="p-4 lg:p-6 pb-40 space-y-6">
        
        {/* --- NAVIGATION & SEARCH HEADER (SEGMENTED CONTROL STYLE) --- */}
        <div className="bg-white dark:bg-[#0B1121] p-3 md:p-2 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col lg:flex-row items-center gap-4 lg:gap-2">
            
            {/* LEVEL SELECTOR (OVERVIEW/EXPLORER STYLE) */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 w-full lg:w-fit shrink-0">
                {['All', '10', '11', '12'].map(lvl => (
                    <button 
                        key={lvl}
                        onClick={() => { setFilterLevel(lvl); setFilterKelas('All'); }}
                        className={`flex-1 lg:flex-none px-4 md:px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                            filterLevel === lvl 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                        }`}
                    >
                        {lvl === 'All' ? 'Overview' : `Kelas ${lvl}`}
                    </button>
                ))}
            </div>

            {/* SEARCH BOX */}
            <div className="relative flex-1 w-full lg:min-w-[200px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search current grid..." 
                    value={globalSearch}
                    onChange={e => setGlobalSearch(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/80 border-none rounded-2xl py-3 pl-11 pr-4 text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 dark:text-white transition-all shadow-inner"
                />
            </div>

            {/* QUICK ACTIONS */}
            <div className="flex items-center gap-2 w-full lg:w-fit shrink-0">
                {/* CLASS DROPDOWN SINKRONISASI */}
                <div className="relative flex-1 lg:w-32">
                    <select 
                        value={filterKelas} 
                        onChange={e => setFilterKelas(e.target.value)}
                        className="w-full pl-3 pr-8 py-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[10px] font-black uppercase border-none outline-none appearance-none cursor-pointer text-indigo-600 dark:text-indigo-400"
                    >
                        <option value="All">Rombel</option>
                        {filteredClassOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>

                {canManage && (
                    <button 
                        onClick={handleAddNew} 
                        className="px-5 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                    >
                        <PlusIcon className="w-4 h-4" /> <span className="hidden sm:inline">Insert Row</span>
                    </button>
                )}

                <div className="flex gap-1">
                    <button onClick={fetchStudents} className="p-3 bg-slate-50 dark:bg-slate-900 text-slate-500 rounded-2xl hover:text-indigo-600 active:rotate-180 transition-all duration-500" title="Refresh">
                        <ArrowPathIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={handleExportExcel}
                        className="p-3 bg-slate-50 dark:bg-slate-900 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all"
                        title="Export"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>

        {/* --- DATA TABLE --- */}
        <div className="bg-white dark:bg-[#151E32] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
                    <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-20">
                        <tr className="text-[10px] font-black text-slate-500 uppercase tracking-tighter border-b border-slate-200 dark:border-slate-800">
                            <th className="w-10 px-2 py-4 text-center border-r border-slate-200 dark:border-slate-800">No</th>
                            <th className="w-[180px] px-4 py-4 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 sticky left-0 z-30 text-indigo-600 dark:text-indigo-400">Nama Lengkap</th>
                            <th className="w-24 px-2 py-4 text-center border-r border-slate-200 dark:border-slate-800">ID Unik</th>
                            <th className="w-32 px-2 py-4 text-center border-r border-slate-200 dark:border-slate-800 bg-indigo-50/20 text-indigo-600">Kelas</th>
                            <th className="w-28 px-2 py-4 text-center border-r border-slate-200 dark:border-slate-800 text-emerald-600">Ponsel</th>
                            <th className="w-28 px-2 py-4 text-center border-r border-slate-200 dark:border-slate-800">Role</th>
                            <th className="w-24 px-2 py-4 text-center border-r border-slate-200 dark:border-slate-800">Gender</th>
                            <th className="w-24 px-2 py-4 text-center border-r border-slate-200 dark:border-slate-800">Status</th>
                            {canManage && <th className="w-20 px-2 py-4 text-center">Aksi</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {loading ? (
                            <tr><td colSpan={9} className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500 opacity-20" /></td></tr>
                        ) : processedStudents.map((s, idx) => (
                            <tr key={s.id || s.idUnik} className="text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-2 py-3.5 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-bold">{idx + 1}</td>
                                <td className="px-4 py-3.5 border-r border-slate-200 dark:border-slate-800 sticky left-0 bg-white dark:bg-[#151E32] font-black text-slate-700 dark:text-slate-200 uppercase truncate shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                    {s.namaLengkap}
                                </td>
                                <td className="px-2 py-3.5 border-r border-slate-200 dark:border-slate-800 text-center font-mono font-bold text-indigo-600">{s.idUnik}</td>
                                <td className="px-2 py-3.5 border-r border-slate-200 dark:border-slate-800 text-center font-black text-slate-500 bg-slate-50/20">{s.tingkatRombel || '-'}</td>
                                <td className="px-2 py-3.5 border-r border-slate-200 dark:border-slate-800 text-center">
                                    {s.noTelepon ? (
                                        <a href={`https://wa.me/${String(s.noTelepon).replace(/^0/, '62')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 text-emerald-600 font-bold hover:scale-110 transition-transform">
                                            <PhoneIcon className="w-3 h-3" /> {s.noTelepon}
                                        </a>
                                    ) : '-'}
                                </td>
                                <td className="px-2 py-3.5 border-r border-slate-200 dark:border-slate-800 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${s.role === 'Ketua Kelas' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-indigo-50 text-indigo-600'}`}>{s.role || 'Siswa'}</span>
                                </td>
                                <td className="px-2 py-3.5 border-r border-slate-200 dark:border-slate-800 text-center font-bold text-slate-400">{s.jenisKelamin === 'Perempuan' ? 'P' : 'L'}</td>
                                <td className="px-2 py-3.5 border-r border-slate-200 dark:border-slate-800 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${s.status === 'Aktif' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{s.status}</span>
                                </td>
                                {canManage && (
                                    <td className="px-2 py-3.5 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button onClick={() => handleEdit(s)} className="p-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg transition-all shadow-sm active:scale-90" title="Koreksi Data"><PencilIcon className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => handleDelete(s)} className="p-1.5 bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg transition-all shadow-sm active:scale-90" title="Hapus Permanen"><TrashIcon className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {processedStudents.length === 0 && !loading && (
                <div className="py-24 text-center opacity-30 flex flex-col items-center gap-4">
                    <UsersGroupIcon className="w-12 h-12" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">Data Tidak Ditemukan</p>
                </div>
            )}
        </div>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-3xl rounded-[3rem] shadow-2xl animate-in zoom-in duration-300 flex flex-col max-h-[92vh] border border-white/10 relative overflow-hidden">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#0B1121] z-10 shrink-0">
                      <div>
                          <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">{editingId ? 'Edit Data Lengkap Siswa' : 'Registrasi Siswa Baru'}</h3>
                          <p className="text-[9px] font-bold text-indigo-500 uppercase mt-1 tracking-widest">ID UNIK: {formData.idUnik || 'Otomatis'} • Sinkronisasi Firestore</p>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                          <XCircleIcon className="w-7 h-7" />
                      </button>
                  </div>

                  <div className="p-6 lg:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8 pb-12 bg-[#F8FAFC] dark:bg-[#0B1121]">
                      <form id="studentForm" onSubmit={handleSave} className="space-y-10">
                          
                          {/* SECTION 1: IDENTITAS UTAMA (REORDERED: ID UNIK FIRST) */}
                          <div className="space-y-4">
                              <div className="flex items-center gap-2 mb-2">
                                  <div className="w-1 bg-indigo-500 h-4 rounded-full"></div>
                                  <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Data Identitas Pokok</h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  {/* ID UNIK (StudentsID) Menjadi Input Pertama */}
                                  <div>
                                      <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest ml-1 mb-1.5 block">ID UNIK (StudentsID) *</label>
                                      <div className="relative group">
                                          <IdentificationIcon className="absolute left-4 top-3.5 w-4 h-4 text-indigo-400" />
                                          <input required disabled={!!editingId} type="text" value={formData.idUnik || ''} onChange={e => setFormData({...formData, idUnik: e.target.value})} className="w-full bg-indigo-50/50 dark:bg-slate-900 border-2 border-indigo-100 dark:border-indigo-900 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-black disabled:opacity-70 text-indigo-700 dark:text-indigo-300" placeholder="KODE UNIK SISWA" />
                                      </div>
                                  </div>
                                  <div>
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Jabatan / Role</label>
                                      <div className="relative">
                                          <ShieldCheckIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                          <select value={formData.role || 'Siswa'} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-10 text-xs font-bold appearance-none cursor-pointer">
                                              <option value="Siswa">1. Siswa</option>
                                              <option value="Ketua Kelas">2. Ketua Kelas</option>
                                          </select>
                                          <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                      </div>
                                  </div>
                                  <div className="md:col-span-2">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Nama Lengkap Sesuai Ijazah *</label>
                                      <div className="relative group">
                                          <UserIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                          <input required type="text" value={formData.namaLengkap || ''} onChange={e => setFormData({...formData, namaLengkap: e.target.value.toUpperCase()})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm" placeholder="Contoh: ADELIA SRI SUNDARI" />
                                      </div>
                                  </div>
                              </div>
                          </div>

                          {/* SECTION 2: MANAJEMEN STATUS (LULUS/MUTASI) */}
                          {editingId && canManage && (
                              <div className="space-y-4">
                                  <div className="flex items-center gap-2 mb-2">
                                      <div className="w-1 bg-amber-500 h-4 rounded-full"></div>
                                      <h4 className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Manajemen Status Data</h4>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <button type="button" onClick={() => handleMoveTo('alumni')} className="flex items-center justify-between p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-indigo-500 transition-all group active:scale-95 shadow-sm">
                                          <div className="flex items-center gap-4">
                                              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center text-indigo-600">
                                                  <AcademicCapIcon className="w-5 h-5" />
                                              </div>
                                              <div className="text-left">
                                                  <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase leading-none">Luluskan ke alumni</p>
                                                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Pindah ke koleksi alumni</p>
                                              </div>
                                          </div>
                                          <ArrowRightIcon className="w-4 h-4 text-slate-200 group-hover:text-indigo-500 transition-colors" />
                                      </button>
                                      
                                      <button type="button" onClick={() => handleMoveTo('mutasi')} className="flex items-center justify-between p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-rose-500 transition-all group active:scale-95 shadow-sm">
                                          <div className="flex items-center gap-4">
                                              <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/40 rounded-xl flex items-center justify-center text-rose-600">
                                                  <BriefcaseIcon className="w-5 h-5" />
                                              </div>
                                              <div className="text-left">
                                                  <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase leading-none">Pindahkan ke mutasi</p>
                                                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Pindah ke koleksi mutasi</p>
                                              </div>
                                          </div>
                                          <ArrowRightIcon className="w-4 h-4 text-slate-200 group-hover:text-rose-500 transition-colors" />
                                      </button>
                                  </div>
                              </div>
                          )}

                          {/* SECTION 3: DATA AKADEMIK & STATUS */}
                          <div className="space-y-4">
                              <div className="flex items-center gap-2 mb-2">
                                  <div className="w-1 bg-emerald-500 h-4 rounded-full"></div>
                                  <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Informasi Akademik</h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                  <div>
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">NISN</label>
                                      <input type="text" value={formData.nisn || ''} onChange={e => setFormData({...formData, nisn: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-xs font-bold shadow-sm" placeholder="10 Digit" />
                                  </div>
                                  <div>
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">NIK</label>
                                      <input type="text" value={formData.nik || ''} onChange={e => setFormData({...formData, nik: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-xs font-bold shadow-sm" placeholder="16 Digit NIK" />
                                  </div>
                                  <div>
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Rombongan Belajar</label>
                                      <div className="relative">
                                          <select value={formData.tingkatRombel || ''} onChange={e => setFormData({...formData, tingkatRombel: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-xs font-bold appearance-none cursor-pointer shadow-sm">
                                              <option value="">-- TANPA ROMBEL --</option>
                                              {classList.map(c => <option key={c} value={c}>{c}</option>)}
                                          </select>
                                          <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                      </div>
                                  </div>
                                  <div>
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Status Siswa</label>
                                      <select value={formData.status || 'Aktif'} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-xs font-bold appearance-none cursor-pointer shadow-sm">
                                          <option value="Aktif">Aktif</option>
                                          <option value="Nonaktif">Nonaktif</option>
                                          <option value="Lulus">Lulus</option>
                                          <option value="Mutasi">Mutasi</option>
                                          <option value="Keluar">Keluar</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Jenis Kelamin</label>
                                      <div className="grid grid-cols-2 gap-2">
                                          <button type="button" onClick={() => setFormData({...formData, jenisKelamin: 'Laki-laki'})} className={`py-3.5 rounded-xl border text-[9px] font-black uppercase transition-all ${formData.jenisKelamin === 'Laki-laki' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 text-slate-400'}`}>L</button>
                                          <button type="button" onClick={() => setFormData({...formData, jenisKelamin: 'Perempuan'})} className={`py-3.5 rounded-xl border text-[9px] font-black uppercase transition-all ${formData.jenisKelamin === 'Perempuan' ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 text-slate-400'}`}>P</button>
                                      </div>
                                  </div>
                                  <div>
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">No. KIP / PIP</label>
                                      <input type="text" value={formData.nomorKIPP_PIP || ''} onChange={e => setFormData({...formData, nomorKIPP_PIP: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-xs font-bold shadow-sm" placeholder="Jika ada" />
                                  </div>
                              </div>
                          </div>

                          {/* SECTION 4: DATA PRIBADI & KONTAK */}
                          <div className="space-y-4">
                              <div className="flex items-center gap-2 mb-2">
                                  <div className="w-1 bg-sky-500 h-4 rounded-full"></div>
                                  <h4 className="text-[10px] font-black uppercase text-sky-600 tracking-wider">Data Pribadi & Kontak</h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  <div>
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Tempat Lahir</label>
                                      <input type="text" value={formData.tempatLahir || ''} onChange={e => setFormData({...formData, tempatLahir: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-xs font-bold shadow-sm" placeholder="Kota/Kab" />
                                  </div>
                                  <div>
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Tanggal Lahir</label>
                                      <div className="relative">
                                          <CalendarIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                          <input type="date" value={formData.tanggalLahir || ''} onChange={e => setFormData({...formData, tanggalLahir: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold shadow-sm" />
                                      </div>
                                  </div>
                                  <div>
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">No. WhatsApp / HP</label>
                                      <div className="relative">
                                          <PhoneIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                          <input type="text" value={formData.noTelepon || ''} onChange={e => setFormData({...formData, noTelepon: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold shadow-sm" placeholder="08..." />
                                      </div>
                                  </div>
                                  <div>
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Email Siswa</label>
                                      <div className="relative">
                                          <EnvelopeIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                          <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value.toLowerCase()})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold shadow-sm" placeholder="nama@email.com" />
                                      </div>
                                  </div>
                                  <div className="md:col-span-2">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Alamat Domisili Lengkap</label>
                                      <div className="relative">
                                          <MapPinIcon className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                                          <textarea rows={3} value={formData.alamat || ''} onChange={e => setFormData({...formData, alamat: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold outline-none resize-none shadow-sm" placeholder="Jalan, Desa/Kelurahan, Kecamatan..."></textarea>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          {/* SECTION 5: DATA KELUARGA */}
                          <div className="space-y-4">
                              <div className="flex items-center gap-2 mb-2">
                                  <div className="w-1 bg-violet-500 h-4 rounded-full"></div>
                                  <h4 className="text-[10px] font-black uppercase text-violet-600 tracking-wider">Data Keluarga & Wali</h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  <div>
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Nama Ayah Kandung</label>
                                      <input type="text" value={formData.namaAyahKandung || ''} onChange={e => setFormData({...formData, namaAyahKandung: e.target.value.toUpperCase()})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-xs font-bold shadow-sm" />
                                  </div>
                                  <div>
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Nama Ibu Kandung</label>
                                      <input type="text" value={formData.namaIbuKandung || ''} onChange={e => setFormData({...formData, namaIbuKandung: e.target.value.toUpperCase()})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-xs font-bold shadow-sm" />
                                  </div>
                                  <div className="md:col-span-2">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Nama Wali (Jika Tidak Bersama Orang Tua)</label>
                                      <input type="text" value={formData.namaWali || ''} onChange={e => setFormData({...formData, namaWali: e.target.value.toUpperCase()})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-xs font-bold shadow-sm" />
                                  </div>
                              </div>
                          </div>

                          {/* SECTION 6: KEBUTUHAN KHUSUS */}
                          <div className="space-y-4">
                              <div className="flex items-center gap-2 mb-2">
                                  <div className="w-1 bg-rose-500 h-4 rounded-full"></div>
                                  <h4 className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Kesehatan & Kebutuhan Khusus</h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  <div>
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Kebutuhan Khusus</label>
                                      <input type="text" value={formData.kebutuhanKhusus || ''} onChange={e => setFormData({...formData, kebutuhanKhusus: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-xs font-bold shadow-sm" placeholder="Misal: Tunanetra, Lambat Belajar..." />
                                  </div>
                                  <div>
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Disabilitas</label>
                                      <input type="text" value={formData.disabilitas || ''} onChange={e => setFormData({...formData, disabilitas: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-xs font-bold shadow-sm" placeholder="Jenis disabilitas" />
                                  </div>
                              </div>
                          </div>

                      </form>
                  </div>

                  <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0B1121] flex gap-4 shrink-0 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 text-slate-500 font-black rounded-2xl border border-slate-200 dark:border-slate-700 transition-all text-[10px] uppercase tracking-widest active:scale-95">Batal</button>
                      <button type="submit" form="studentForm" disabled={saving} className="flex-[2] bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 transition-all">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <SaveIcon className="w-5 h-5" />}
                        <span className="uppercase tracking-[0.2em] text-[10px]">Simpan ke database</span>
                      </button>
                  </div>
              </div>
          </div>
      )}
    </Layout>
  );
};

const ReportStatCard = ({ val, label, color, bg, icon: Icon }: any) => (
    <div className={`p-2.5 rounded-2xl text-center border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-[#151E32] flex flex-col items-center justify-center`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 ${bg} dark:bg-opacity-10 ${color}`}>
            <Icon className="w-3.5 h-3.5" />
        </div>
        <p className={`text-sm font-black ${color} tracking-tighter leading-none`}>{val}</p>
        <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mt-1 leading-none">{label}</p>
    </div>
);

export default StudentData;
