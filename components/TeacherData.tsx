
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getTeachers, addTeacher, updateTeacher, deleteTeacher, bulkImportTeachers } from '../services/teacherService';
import { Teacher, UserRole } from '../types';
import { db, isMockMode } from '../services/firebase';
import { toast } from 'sonner';
import Layout from './Layout';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  BriefcaseIcon, Search, PlusIcon, PencilIcon, TrashIcon, 
  UserIcon, PhoneIcon, EnvelopeIcon, CheckCircleIcon, XCircleIcon, 
  MapPinIcon, AcademicCapIcon, ArrowPathIcon, FileSpreadsheet,
  FileText, ArrowDownTrayIcon, ArrowRightIcon, Loader2, SaveIcon,
  ChevronDownIcon, IdentificationIcon, BookOpenIcon
} from './Icons';

interface TeacherDataProps {
  onBack: () => void;
  userRole: UserRole;
}

const TeacherData: React.FC<TeacherDataProps> = ({ onBack, userRole }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Teacher>>({
      name: '', nip: '', subject: '', status: 'PNS', phone: '', email: '', birthDate: '', address: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canManage = userRole === UserRole.ADMIN || userRole === UserRole.DEVELOPER;

  useEffect(() => {
    setLoading(true);

    if (isMockMode) {
        getTeachers().then(data => {
            setTeachers(data);
            setLoading(false);
        });
        return;
    }

    if (!db) {
        setLoading(false);
        return;
    }

    const unsubscribe = db.collection('teachers')
        .orderBy('name')
        .onSnapshot(
            snapshot => {
                const liveData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher));
                setTeachers(liveData);
                setLoading(false);
            },
            err => {
                console.warn("Teacher fetch denied:", err.message);
                setLoading(false);
            }
        );

    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => {
      return {
          total: teachers.length,
          pns: teachers.filter(t => t.status === 'PNS').length,
          honorer: teachers.filter(t => t.status === 'Honorer').length,
          pppk: teachers.filter(t => t.status === 'PPPK').length,
          gty: teachers.filter(t => t.status === 'GTY').length
      };
  }, [teachers]);

  const uniqueSubjects = useMemo(() => {
      const subjects = teachers.map(t => t.subject).filter(Boolean);
      return Array.from(new Set(subjects)).sort();
  }, [teachers]);

  const processedTeachers = useMemo(() => {
      const lowerQuery = searchQuery.toLowerCase().trim();
      return teachers.filter(t => {
          const name = String(t.name || '').toLowerCase();
          const nip = String(t.nip || '').toLowerCase();
          const subject = String(t.subject || '').toLowerCase();
          
          const matchesSearch = lowerQuery === '' || 
                                name.includes(lowerQuery) || 
                                nip.includes(lowerQuery) ||
                                subject.includes(lowerQuery);
          const matchesSubject = selectedSubject === 'All' || t.subject === selectedSubject;
          const matchesStatus = selectedStatus === 'All' || t.status === selectedStatus;
          return matchesSearch && matchesSubject && matchesStatus;
      });
  }, [teachers, searchQuery, selectedSubject, selectedStatus]);

  const handleExportPDF = () => {
    if (loading) return;
    if (processedTeachers.length === 0) {
      toast.error("Tidak ada data untuk dicetak.");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Daftar Guru & Tenaga Kependidikan", 14, 20);
    doc.setFontSize(11);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [['No', 'Nama Lengkap', 'NIP/NIY', 'Mata Pelajaran', 'Status']],
      body: processedTeachers.map((t, i) => [
        i + 1,
        (t.name || '').toUpperCase(),
        t.nip || '-',
        (t.subject || '').toUpperCase(),
        t.status
      ]),
      headStyles: { fillColor: [67, 56, 202] },
    });

    doc.save(`Daftar_Guru_${new Date().getTime()}.pdf`);
    toast.success("Laporan PDF berhasil diunduh.");
  };

  const handleExportExcel = () => {
    if (loading) return;
    if (processedTeachers.length === 0) {
      toast.error("Tidak ada data untuk diekspor.");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(processedTeachers.map((t, i) => ({
      'No': i + 1,
      'Nama Lengkap': t.name,
      'NIP/NIY': t.nip,
      'Mata Pelajaran': t.subject,
      'Status': t.status,
      'Telepon': t.phone || '-',
      'Email': t.email || '-'
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Guru");
    XLSX.writeFile(workbook, `Data_Guru_${new Date().getTime()}.xlsx`);
    toast.success("Excel berhasil diunduh.");
  };

  const handleEdit = (teacher: Teacher) => {
      setEditingId(teacher.id || null);
      setFormData({ ...teacher });
      setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
      if (window.confirm(`Hapus data guru ${name}?`)) {
          try {
              if (isMockMode) {
                  setTeachers(prev => prev.filter(t => t.id !== id));
              } else {
                  await deleteTeacher(id);
              }
              toast.success("Data guru berhasil dihapus");
          } catch (e) {
              toast.error("Gagal menghapus data");
          }
      }
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name || !formData.subject) {
          toast.error("Nama dan Mata Pelajaran wajib diisi");
          return;
      }

      const toastId = toast.loading("Menyimpan data...");
      try {
          if (editingId) {
              await updateTeacher(editingId, formData);
              toast.success("Data diperbarui", { id: toastId });
          } else {
              const newTeacher = { ...formData, nip: formData.nip || '-' } as Teacher;
              await addTeacher(newTeacher);
              toast.success("Guru ditambahkan", { id: toastId });
          }
          setIsModalOpen(false);
          setEditingId(null);
          setFormData({ name: '', nip: '', subject: '', status: 'PNS' });
      } catch (e) {
          console.error(e);
          toast.error("Gagal menyimpan", { id: toastId });
      }
  };

  return (
    <Layout
      title="Data Guru"
      subtitle={`Direktori Pengajar • ${teachers.length} Total`}
      icon={BriefcaseIcon}
      onBack={onBack}
      actions={
          <div className="flex gap-2">
                <button 
                    onClick={handleExportPDF}
                    disabled={loading}
                    className={`p-2.5 rounded-xl transition-all shadow-sm ${loading ? 'bg-slate-100 text-slate-300' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100'}`}
                    title="Export PDF"
                >
                    <FileText className="w-5 h-5" />
                </button>
                <button 
                    onClick={handleExportExcel}
                    disabled={loading}
                    className={`p-2.5 rounded-xl transition-all shadow-sm ${loading ? 'bg-slate-100 text-slate-300' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'}`}
                    title="Export Excel"
                >
                    <FileSpreadsheet className="w-5 h-5" />
                </button>
          </div>
      }
    >
      <div className="p-4 lg:p-6 pb-32 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-[1.8rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Total Guru</p>
                  <div className="flex items-center gap-2 mt-1">
                      <BriefcaseIcon className="w-5 h-5 text-indigo-500" />
                      <span className="text-xl font-black text-slate-800 dark:text-white">{stats.total}</span>
                  </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-[1.8rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">ASN</p>
                  <div className="flex items-center gap-2 mt-1">
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                      <span className="text-xl font-black text-slate-800 dark:text-white">{stats.pns + stats.pppk}</span>
                  </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-[1.8rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Non-ASN</p>
                  <div className="flex items-center gap-2 mt-1">
                      <AcademicCapIcon className="w-5 h-5 text-orange-500" />
                      <span className="text-xl font-black text-slate-800 dark:text-white">{stats.honorer}</span>
                  </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-[1.8rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Tetap Yayasan</p>
                  <div className="flex items-center gap-2 mt-1">
                      <UserIcon className="w-5 h-5 text-blue-500" />
                      <span className="text-xl font-black text-slate-800 dark:text-white">{stats.gty}</span>
                  </div>
              </div>
          </div>

          <div className="bg-white dark:bg-[#151E32] p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                      type="text" 
                      placeholder="Cari Nama, NIP, atau Mapel..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-transparent rounded-[1.5rem] py-4 pl-12 pr-4 text-[11px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800 dark:text-white shadow-inner"
                  />
              </div>
              
              <div className="flex flex-wrap gap-2">
                  <div className="flex-1 relative">
                      <select
                          value={selectedSubject}
                          onChange={(e) => setSelectedSubject(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-[9px] font-black uppercase appearance-none cursor-pointer"
                      >
                          <option value="All">SEMUA MATA PELAJARAN</option>
                          {uniqueSubjects.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                      </select>
                      <ChevronDownIcon className="absolute right-3 top-3 pointer-events-none text-slate-400 w-3 h-3" />
                  </div>
                  <div className="flex-1 relative">
                      <select
                          value={selectedStatus}
                          onChange={(e) => setSelectedStatus(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-[9px] font-black uppercase appearance-none cursor-pointer"
                      >
                          <option value="All">SEMUA STATUS</option>
                          <option value="PNS">PNS</option>
                          <option value="PPPK">PPPK</option>
                          <option value="GTY">GTY</option>
                          <option value="Honorer">HONORER</option>
                      </select>
                      <ChevronDownIcon className="absolute right-3 top-3 pointer-events-none text-slate-400 w-3 h-3" />
                  </div>
              </div>
          </div>

          {canManage && (
              <div className="flex items-center justify-between gap-3 bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-[2rem] border border-indigo-100 dark:border-indigo-800 shadow-sm">
                  <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center"><PlusIcon className="w-4 h-4"/></div>
                      <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">Manajemen GTK</span>
                  </div>
                  <button 
                      onClick={() => { setEditingId(null); setFormData({ name: '', nip: '', subject: '', status: 'PNS' }); setIsModalOpen(true); }}
                      disabled={loading}
                      className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${loading ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white shadow-indigo-500/20 active:scale-95'}`}
                  >
                      Tambah Guru
                  </button>
              </div>
          )}

          {loading ? (
              <div className="text-center py-20 flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-500 opacity-20 mb-3" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Kepegawaian...</p>
              </div>
          ) : processedTeachers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-500">
                  {processedTeachers.map((t) => (
                      <div key={t.id} className="bg-white dark:bg-[#151E32] p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-xl transition-all relative overflow-hidden flex flex-col">
                          <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-800">
                                      <UserIcon className="w-6 h-6 text-slate-300" />
                                  </div>
                                  <div className="min-w-0">
                                      <h4 className="font-black text-slate-800 dark:text-white text-[11px] uppercase truncate tracking-tight">{(t.name || '').toUpperCase()}</h4>
                                      <p className="text-[9px] font-mono font-bold text-slate-400 mt-1">{t.nip || '-'}</p>
                                  </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-tighter ${t.status === 'PNS' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{t.status}</span>
                          </div>
                          
                          <div className="space-y-2 mb-4 flex-1">
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                  <BookOpenIcon className="w-3.5 h-3.5 text-indigo-500" />
                                  <span className="truncate">{t.subject}</span>
                              </div>
                              {t.phone && (
                                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                      <PhoneIcon className="w-3.5 h-3.5 text-slate-300" />
                                      {t.phone}
                                  </div>
                              )}
                          </div>

                          {canManage && (
                              <div className="flex gap-2 pt-4 border-t border-slate-50 dark:border-slate-800/50 mt-auto">
                                  <button onClick={() => handleEdit(t)} className="flex-1 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all">
                                      <PencilIcon className="w-3.5 h-3.5" /> Edit
                                  </button>
                                  <button onClick={() => handleDelete(t.id || '', t.name)} className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-600 transition-all">
                                      <TrashIcon className="w-3.5 h-3.5" />
                                  </button>
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          ) : (
              <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-700">
                  <BriefcaseIcon className="w-16 h-16 text-slate-100 dark:text-slate-700 mx-auto mb-4" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tidak ada data guru ditemukan</p>
              </div>
          )}

          {isModalOpen && (
              <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                  <div className="bg-white dark:bg-[#0B1121] w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh] border border-white/10">
                      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center relative z-10">
                          <div>
                              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-base leading-none">{editingId ? 'Edit Data Guru' : 'Tambah Guru Baru'}</h3>
                              <p className="text-[8px] font-bold text-indigo-500 uppercase mt-2">Database Kepegawaian Digital</p>
                          </div>
                          <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><XCircleIcon className="w-6 h-6 text-slate-400" /></button>
                      </div>
                      <div className="p-6 overflow-y-auto scrollbar-hide flex-1 relative z-10">
                          <form id="teacherForm" onSubmit={handleSave} className="space-y-6">
                              <InputField label="Nama Lengkap & Gelar *" icon={UserIcon} value={formData.name} onChange={(v: string) => setFormData({...formData, name: (v || '').toUpperCase()})} placeholder="BUDI SANTOSO, S.PD" />
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                  <InputField label="NIP / NIY" icon={IdentificationIcon} value={formData.nip} onChange={(v: string) => setFormData({...formData, nip: v})} placeholder="1980..." />
                                  <InputField label="Mata Pelajaran *" icon={BookOpenIcon} value={formData.subject} onChange={(v: string) => setFormData({...formData, subject: (v || '').toUpperCase()})} placeholder="FISIKA" />
                              </div>
                              <div className="space-y-1.5">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Kepegawaian</label>
                                  <div className="relative">
                                      <select value={formData.status || 'PNS'} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 px-4 text-[11px] font-bold outline-none cursor-pointer appearance-none shadow-inner">
                                          <option value="PNS">PNS</option>
                                          <option value="PPPK">PPPK</option>
                                          <option value="GTY">GTY</option>
                                          <option value="Honorer">HONORER</option>
                                      </select>
                                      <ChevronDownIcon className="absolute right-4 top-3.5 w-4 h-4 text-slate-400" />
                                  </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                  <InputField label="No. WhatsApp" icon={PhoneIcon} value={formData.phone} onChange={(v: string) => setFormData({...formData, phone: v})} placeholder="08..." />
                                  <InputField label="Email Resmi" icon={EnvelopeIcon} value={formData.email} onChange={(v: string) => setFormData({...formData, email: (v || '').toLowerCase()})} placeholder="guru@madrasah.id" />
                              </div>
                          </form>
                      </div>
                      <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 relative z-10">
                          <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 text-slate-500 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Batal</button>
                          <button type="submit" form="teacherForm" className="flex-[2] py-4 rounded-[1.5rem] bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"><SaveIcon className="w-4 h-4" /> Simpan Permanen</button>
                      </div>
                  </div>
              </div>
          )}
      </div>
    </Layout>
  );
};

const InputField = ({ label, icon: Icon, value, onChange, placeholder }: any) => (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group">
        <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
          <Icon className="w-4 h-4" />
        </div>
        <input 
            type="text" 
            value={value || ''} 
            onChange={e => onChange(e.target.value)} 
            placeholder={placeholder}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-[11px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
        />
      </div>
    </div>
  );

export default TeacherData;
