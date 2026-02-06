
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import { deleteStudent, updateStudent, addStudent, moveStudentToCollection } from '../services/studentService';
import { Student, UserRole } from '../types';
import { db, isMockMode } from '../services/firebase';
import { toast } from 'sonner';
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
  HeartIcon,
  ArrowRightIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  BuildingLibraryIcon
} from './Icons';

const StudentData: React.FC<{ onBack: () => void, userRole: UserRole }> = ({ onBack, userRole }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [classList, setClassList] = useState<string[]>([]);

  // State Filter
  const [filterNama, setFilterNama] = useState('');
  const [filterID, setFilterID] = useState('');
  const [filterKelas, setFilterKelas] = useState('All'); 
  const [filterRole, setFilterRole] = useState('All');
  const [filterGender, setFilterGender] = useState('All');
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

  useEffect(() => {
    if (isMockMode) {
      setClassList(['X IPA 1', 'XI IPS 1', 'XII AGAMA']);
      return;
    }
    if (db) {
      db.collection('classes').get().then(snap => {
        const names = snap.docs.map(d => d.data().name).sort();
        setClassList(names);
      });
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    if (!db && !isMockMode) return;
    
    const unsubscribe = isMockMode 
        ? () => {} 
        : db!.collection('students').orderBy('namaLengkap').onSnapshot(snapshot => {
            setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
            setLoading(false);
        }, err => { setLoading(false); });

    if (isMockMode) {
        setStudents([
            { id: '25002', namaLengkap: 'ADELIA SRI SUNDARI', nisn: '0086806440', idUnik: '25002', tingkatRombel: 'XII IPA 1', status: 'Aktif', jenisKelamin: 'Perempuan', role: 'Siswa', noTelepon: '08123456789' } as Student
        ]);
        setLoading(false);
    }
    return () => unsubscribe();
  }, []);

  const processedStudents = useMemo(() => {
    return students.filter(s => {
        const matchesNama = filterNama === '' || (s.namaLengkap || '').toLowerCase().includes(filterNama.toLowerCase());
        const matchesID = filterID === '' || String(s.idUnik || '').toLowerCase().includes(filterID.toLowerCase());
        const matchesKelas = filterKelas === 'All' || s.tingkatRombel === filterKelas;
        const matchesRole = filterRole === 'All' || s.role === filterRole;
        const matchesGender = filterGender === 'All' || (filterGender === 'L' ? s.jenisKelamin === 'Laki-laki' : s.jenisKelamin === 'Perempuan');
        const matchesStatus = filterStatus === 'All' || s.status === filterStatus;
        
        return matchesNama && matchesID && matchesKelas && matchesRole && matchesGender && matchesStatus;
    }).sort((a, b) => (a.namaLengkap || '').localeCompare(b.namaLengkap || ''));
  }, [students, filterNama, filterID, filterKelas, filterRole, filterGender, filterStatus]);

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
        
        {/* --- HEADER ACTIONS --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#151E32] p-4 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600"><UsersGroupIcon className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white leading-none">Daftar Peserta Didik</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{processedStudents.length} Records Terfilter</p>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
                {/* QUICK FILTER KELAS */}
                <div className="relative group min-w-[140px]">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500">
                    <BuildingLibraryIcon className="w-3.5 h-3.5" />
                  </div>
                  <select 
                    value={filterKelas} 
                    onChange={e => setFilterKelas(e.target.value)} 
                    className="w-full pl-8 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer text-indigo-600"
                  >
                    <option value="All">Semua Kelas</option>
                    {classList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>

                {canManage && (
                    <button onClick={handleAddNew} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 hover:bg-indigo-700 transition-all border border-indigo-500">
                      <PlusIcon className="w-4 h-4" /> Tambah Siswa
                    </button>
                )}
            </div>
        </div>

        {/* --- DATA TABLE --- */}
        <div className="bg-white dark:bg-[#151E32] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
                    <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-20">
                        <tr className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                            <th className="w-10 px-2 py-3 text-center border-b border-r border-slate-200 dark:border-slate-800">No</th>
                            <th className="w-[160px] px-3 py-3 border-b border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 sticky left-0 z-30 text-indigo-600 dark:text-indigo-400">Nama Lengkap</th>
                            <th className="w-24 px-2 py-3 text-center border-b border-r border-slate-200 dark:border-slate-800">ID Unik</th>
                            <th className="w-32 px-2 py-3 text-center border-b border-r border-slate-200 dark:border-slate-800 bg-indigo-50/20 text-indigo-600">Kelas</th>
                            <th className="w-28 px-2 py-3 text-center border-b border-r border-slate-200 dark:border-slate-800 text-emerald-600">Ponsel</th>
                            <th className="w-28 px-2 py-3 text-center border-b border-r border-slate-200 dark:border-slate-800">Role</th>
                            <th className="w-24 px-2 py-3 text-center border-b border-r border-slate-200 dark:border-slate-800">Gender</th>
                            <th className="w-24 px-2 py-3 text-center border-b border-r border-slate-200 dark:border-slate-800">Status</th>
                            {canManage && <th className="w-20 px-2 py-3 text-center border-b border-slate-200 dark:border-slate-800">Aksi</th>}
                        </tr>
                        {/* --- IN-TABLE FILTERS --- */}
                        <tr className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
                            <th className="border-r border-slate-200 dark:border-slate-800"></th>
                            <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-800 sticky left-0 bg-white dark:bg-slate-800 z-30">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
                                    <input type="text" placeholder="Cari Nama..." value={filterNama} onChange={e => setFilterNama(e.target.value)} className="w-full pl-6 pr-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded text-[9px] font-bold outline-none focus:border-indigo-300" />
                                </div>
                            </th>
                            <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-800">
                                <input type="text" placeholder="ID..." value={filterID} onChange={e => setFilterID(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded text-[9px] font-bold outline-none text-center" />
                            </th>
                            <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-800 bg-indigo-50/10">
                                <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className="w-full bg-transparent border-none rounded text-[8px] font-black uppercase text-center outline-none cursor-pointer">
                                    <option value="All">SEMUA</option>
                                    {classList.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </th>
                            <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-800"></th>
                            <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-800">
                                <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded text-[8px] font-black uppercase text-center outline-none cursor-pointer text-indigo-600">
                                    <option value="All">SEMUA</option>
                                    <option value="Siswa">SISWA</option>
                                    <option value="Ketua Kelas">KETUA KELAS</option>
                                </select>
                            </th>
                            <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-800">
                                <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded text-[8px] font-black uppercase text-center outline-none cursor-pointer">
                                    <option value="All">ALL</option>
                                    <option value="L">L</option>
                                    <option value="P">P</option>
                                </select>
                            </th>
                            <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-800">
                                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded text-[8px] font-black uppercase text-center outline-none cursor-pointer">
                                    <option value="All">ALL</option>
                                    <option value="Aktif">AKTIF</option>
                                    <option value="Lulus">LULUS</option>
                                    <option value="Mutasi">MUTASI</option>
                                    <option value="Keluar">KELUAR</option>
                                    <option value="Nonaktif">OFF</option>
                                </select>
                            </th>
                            {canManage && <th className="border-r border-slate-200 dark:border-slate-800"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {loading ? (
                            <tr><td colSpan={10} className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500 opacity-20" /></td></tr>
                        ) : processedStudents.map((s, idx) => (
                            <tr key={s.id || s.idUnik} className="text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-2 py-3 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-bold">{idx + 1}</td>
                                <td className="px-3 py-3 border-r border-slate-200 dark:border-slate-800 sticky left-0 bg-white dark:bg-[#151E32] font-black text-slate-700 dark:text-slate-200 uppercase truncate">
                                    {s.namaLengkap}
                                </td>
                                <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-800 text-center font-mono font-bold text-indigo-600">{s.idUnik}</td>
                                <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-800 text-center font-black text-slate-500 bg-slate-50/20">{s.tingkatRombel || '-'}</td>
                                <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-800 text-center">
                                    {s.noTelepon ? (
                                        <a href={`https://wa.me/${String(s.noTelepon).replace(/^0/, '62')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 text-emerald-600 font-bold hover:scale-110 transition-transform">
                                            <PhoneIcon className="w-3 h-3" /> {s.noTelepon}
                                        </a>
                                    ) : '-'}
                                </td>
                                <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-800 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${s.role === 'Ketua Kelas' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-indigo-50 text-indigo-600'}`}>{s.role || 'Siswa'}</span>
                                </td>
                                <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-800 text-center font-bold text-slate-400">{s.jenisKelamin === 'Perempuan' ? 'P' : 'L'}</td>
                                <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-800 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${s.status === 'Aktif' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{s.status}</span>
                                </td>
                                {canManage && (
                                    <td className="px-2 py-3 text-center">
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
                                          {/* Fix: Changed property name from 'parseInt' to 'tanggalLahir' in setFormData */}
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

export default StudentData;
