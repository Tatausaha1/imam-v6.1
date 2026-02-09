
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db, isMockMode } from '../services/firebase';
import { Student, UserRole, Teacher, ClassData, ViewState } from '../types';
import { 
    Loader2, PencilIcon, BookOpenIcon,
    SaveIcon, ArrowLeftIcon, 
    UsersIcon, XCircleIcon, PlusIcon,
    ChartBarIcon, CalendarIcon,
    FileText, UserIcon, ShieldCheckIcon, Search,
    PrinterIcon, ChevronDownIcon,
    CogIcon,
    IdentificationIcon,
    StarIcon,
    TrashIcon,
    AcademicCapIcon
} from './Icons';
import { toast } from 'sonner';
import { addClass, updateClass, deleteClass } from '../services/classService';

type ClassView = 'list' | 'dashboard' | 'detail_tab';
type DetailTab = 'siswa' | 'mapel' | 'laporan' | 'poin' | 'wali_edit';

interface ClassListProps {
    onBack: () => void;
    onNavigate: (view: ViewState) => void;
    userRole: UserRole;
}

const ClassList: React.FC<ClassListProps> = ({ onBack, onNavigate, userRole }) => {
  const [view, setView] = useState<ClassView>('list');
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('siswa');
  
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classEditorMode, setClassEditorMode] = useState<'add' | 'edit'>('add');
  
  const [classFormData, setClassFormData] = useState<Partial<ClassData>>({
      id: '',
      name: '',
      level: '10',
      academicYear: '2025/2026',
      teacherId: '',
      teacherName: '',
  });

  const canManage = userRole === UserRole.ADMIN || userRole === UserRole.DEVELOPER;

  useEffect(() => {
    setLoading(true);
    if (isMockMode) {
        setClasses([
            { id: '10_A_2025', name: '10 A', level: '10', teacherName: 'Alfi Syahrin S.Sos', academicYear: '2025/2026' },
            { id: '10_B_2025', name: '10 B', level: '10', teacherName: 'Budi Santoso S.Pd', academicYear: '2025/2026' },
            { id: '11_B_2025', name: '11 B', level: '11', teacherName: 'H. Ahmad M.Pd', academicYear: '2025/2026' },
            { id: '12_C_2025', name: '12 C', level: '12', teacherName: 'Siti Aminah S.Ag', academicYear: '2025/2026' }
        ]);
        setLoading(false);
        return;
    }

    if (!db) return;
    
    // Fix: Menambahkan error handler pada onSnapshot
    const unsubClasses = db.collection('classes').onSnapshot(
        snap => setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassData))),
        err => console.warn("Firestore: Gagal memuat data kelas.", err.message)
    );
    
    const unsubStudents = db.collection('students').onSnapshot(
        snap => setAllStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student))),
        err => console.warn("Firestore: Gagal memuat data siswa.", err.message)
    );
    
    const unsubTeachers = db.collection('teachers').orderBy('name').onSnapshot(
        snap => setTeachers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher))),
        err => console.warn("Firestore: Gagal memuat data guru.", err.message)
    );
    
    setLoading(false);
    return () => { unsubClasses(); unsubStudents(); unsubTeachers(); };
  }, []);

  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return allStudents.filter(s => s.tingkatRombel === selectedClass.name)
        .sort((a, b) => (a.namaLengkap || '').localeCompare(b.namaLengkap || ''));
  }, [selectedClass, allStudents]);

  const handleOpenClass = (cls: ClassData) => {
    setSelectedClass(cls);
    setView('dashboard');
  };

  const handleOpenTab = (tab: DetailTab) => {
    setActiveTab(tab);
    setView('detail_tab');
  };

  const handleOpenAddClass = () => {
      setClassEditorMode('add');
      setClassFormData({
          id: '',
          name: '',
          level: '10',
          academicYear: '2025/2026',
      });
      setIsClassModalOpen(true);
  };

  const handleEditClass = (cls: ClassData) => {
      setClassEditorMode('edit');
      setSelectedClass(cls);
      setClassFormData({ ...cls });
      setIsClassModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!classFormData.name || !classFormData.level) {
          toast.error("Nama Kelas dan Tingkat wajib diisi.");
          return;
      }

      setSaving(true);
      try {
          if (classEditorMode === 'add') {
              await addClass(classFormData as ClassData);
              toast.success("Rombel baru berhasil ditambahkan.");
          } else if (selectedClass?.id) {
              await updateClass(selectedClass.id, classFormData);
              toast.success("Informasi rombel diperbarui.");
          }
          setIsClassModalOpen(false);
      } catch (err: any) {
          toast.error("Gagal menyimpan: " + err.message);
      } finally {
          setSaving(false);
      }
  };

  const handleDeleteClass = async (id: string | undefined, name: string) => {
      if (!id) return;
      if (window.confirm(`Hapus permanen rombel ${name}?`)) {
          const toastId = toast.loading(`Menghapus rombel ${name}...`);
          try {
              await deleteClass(id);
              toast.success("Rombel berhasil dihapus.", { id: toastId });
              if (view === 'dashboard') setView('list');
              if (selectedClass?.id === id) setSelectedClass(null);
          } catch (e: any) {
              toast.error("Gagal menghapus: " + e.message, { id: toastId });
          }
      }
  };

  const getLevelTheme = (level: string) => {
    const lvl = String(level);
    if (lvl === '10') return { 
        bg: 'bg-indigo-600', 
        bgLight: 'bg-indigo-50 dark:bg-indigo-900/30', 
        text: 'text-indigo-600 dark:text-indigo-400',
        shadow: 'shadow-indigo-500/20'
    };
    if (lvl === '11') return { 
        bg: 'bg-emerald-600', 
        bgLight: 'bg-emerald-50 dark:bg-emerald-900/30', 
        text: 'text-emerald-600 dark:text-emerald-400',
        shadow: 'shadow-emerald-500/20'
    };
    if (lvl === '12') return { 
        bg: 'bg-rose-600', 
        bgLight: 'bg-rose-50 dark:bg-rose-900/30', 
        text: 'text-rose-600 dark:text-rose-400',
        shadow: 'shadow-rose-500/20'
    };
    return { 
        bg: 'bg-slate-600', 
        bgLight: 'bg-slate-50 dark:bg-slate-800', 
        text: 'text-slate-600 dark:text-slate-400',
        shadow: 'shadow-slate-500/20'
    };
  };

  const currentTheme = selectedClass ? getLevelTheme(selectedClass.level) : getLevelTheme('10');

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#020617] overflow-hidden transition-all">
      {/* HEADER */}
      <div className="bg-white/95 dark:bg-[#0B1121]/95 backdrop-blur-xl px-4 py-3 flex items-center justify-between z-40 sticky top-0 border-b border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                    if (view === 'detail_tab') setView('dashboard');
                    else if (view === 'dashboard') setView('list');
                    else onBack();
                }} 
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 active:scale-90 transition-all border border-slate-100 dark:border-slate-700"
              >
                  <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                  <h2 className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                    {view === 'list' ? 'Direktori Rombel' : selectedClass?.name}
                  </h2>
                  <p className={`text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1`}>
                      {view === 'list' ? 'Basis Data Madrasah' : `Tahun Ajaran ${selectedClass?.academicYear}`}
                  </p>
              </div>
          </div>
          {view === 'list' && canManage && (
              <button 
                onClick={handleOpenAddClass}
                className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 active:scale-90 transition-all flex items-center gap-2"
              >
                  <PlusIcon className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden xs:inline">Tambah</span>
              </button>
          )}
          {view === 'dashboard' && canManage && (
              <div className="flex gap-2">
                <button onClick={() => handleEditClass(selectedClass!)} className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl"><PencilIcon className="w-4 h-4"/></button>
                <button onClick={() => handleDeleteClass(selectedClass?.id, selectedClass?.name || 'Kelas')} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-colors">
                    <TrashIcon className="w-4 h-4"/>
                </button>
              </div>
          )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 pb-40">
          {loading ? (
              <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 opacity-20" /></div>
          ) : view === 'list' ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4 md:gap-6">
                  {classes.map(cls => {
                      const theme = getLevelTheme(cls.level);
                      const parts = (cls.name || 'Kelas ?').split(' ');
                      const gradeNum = parts[0];
                      const sectionChar = parts.slice(1).join(' ');
                      
                      return (
                        <div key={cls.id} className="flex flex-col items-center gap-2 group relative">
                            <button 
                                onClick={() => handleOpenClass(cls)} 
                                className="flex flex-col items-center gap-2 w-full transition-all active:scale-90 group"
                            >
                                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-[1.8rem] flex flex-col items-center justify-center transition-all duration-300 shadow-lg border border-white dark:border-slate-800 relative overflow-hidden group-hover:-translate-y-1 ${theme.bgLight}`}>
                                    
                                    <div className="absolute top-1.5 right-1.5 opacity-20 group-hover:opacity-40 transition-opacity">
                                        <BookOpenIcon className="w-6 h-6 text-current" />
                                    </div>

                                    <span className={`text-2xl md:text-3xl font-black tracking-tighter leading-none ${theme.text}`}>
                                        {gradeNum}
                                    </span>
                                    {sectionChar && (
                                        <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-60 mt-0.5">Unit {sectionChar}</span>
                                    )}

                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </div>
                                
                                <div className="text-center w-full px-0.5 overflow-hidden">
                                    <p className="text-[8px] md:text-[9px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tighter truncate leading-tight transition-colors group-hover:text-indigo-600">
                                        {cls.name}
                                    </p>
                                </div>
                            </button>
                            
                            {canManage && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id, cls.name); }}
                                    className="absolute -top-1 -right-1 p-1.5 bg-white dark:bg-slate-800 text-rose-500 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white border border-slate-100 dark:border-slate-700 active:scale-75 z-20"
                                >
                                    <TrashIcon className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                      );
                  })}

                  {canManage && (
                      <button 
                        onClick={handleOpenAddClass}
                        className="flex flex-col items-center gap-2 group"
                      >
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-[1.8rem] flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all text-slate-300 hover:text-indigo-500 group-hover:-translate-y-1">
                             <PlusIcon className="w-7 h-7 md:w-8 md:h-8" />
                        </div>
                        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-tighter">Baru</p>
                      </button>
                  )}
              </div>
          ) : view === 'dashboard' ? (
              <div className="max-w-xl mx-auto space-y-4 animate-in fade-in duration-500">
                  <div className="bg-white dark:bg-[#151E32] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
                      <div className={`p-8 bg-gradient-to-br ${currentTheme.bg === 'bg-indigo-600' ? 'from-indigo-500 to-indigo-700' : currentTheme.bg === 'bg-rose-600' ? 'from-rose-500 to-rose-700' : 'from-emerald-500 to-emerald-700'} text-white flex flex-col items-center gap-4 relative overflow-hidden`}>
                          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
                          <div className="w-20 h-20 rounded-[1.8rem] bg-white/20 flex items-center justify-center border-2 border-white/20 shadow-inner relative z-10 backdrop-blur-sm">
                              <UserIcon className="w-10 h-10" />
                          </div>
                          <div className="text-center relative z-10">
                              <p className="text-[8px] font-black opacity-60 uppercase tracking-[0.4em] mb-1">Wali Rombel</p>
                              <h3 className="text-lg font-black uppercase leading-tight">{selectedClass?.teacherName || 'BELUM DIATUR'}</h3>
                              {selectedClass?.captainName && (
                                  <p className="text-[9px] font-bold opacity-80 uppercase mt-2">Ketua: {selectedClass.captainName}</p>
                              )}
                          </div>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                          <NavCard title="Data Siswa" sub="Direktori Induk" icon={UsersIcon} color="text-indigo-600" bg="bg-indigo-50 dark:bg-indigo-900/20" onClick={() => handleOpenTab('siswa')} />
                          <NavCard title="Log Presensi" sub="Laporan Cerdas" icon={ChartBarIcon} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-900/20" onClick={() => { localStorage.setItem('imam_pending_report_class', selectedClass!.name); onNavigate(ViewState.REPORTS); }} />
                      </div>
                  </div>
              </div>
          ) : (
              <div className="animate-in fade-in duration-300 max-w-2xl mx-auto space-y-3">
                  <div className="bg-white dark:bg-[#151E32] rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
                      <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Peserta Didik ({classStudents.length})</span>
                      </div>
                      <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                          {classStudents.map((s) => (
                              <div key={s.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                  <div className="flex flex-col min-w-0 flex-1">
                                      <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-200 truncate uppercase leading-none mb-1">
                                          {s.namaLengkap}
                                      </h4>
                                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                          {s.idUnik} • {s.jenisKelamin === 'Perempuan' ? 'PEREMPUAN' : 'LAKI-LAKI'}
                                      </p>
                                  </div>
                                  <button className="p-2.5 text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl active:scale-75 transition-transform"><ArrowRightIcon className="w-4 h-4" /></button>
                              </div>
                          ))}
                          {classStudents.length === 0 && (
                               <div className="py-20 text-center opacity-20">
                                   <UsersIcon className="w-12 h-12 mx-auto mb-2" />
                                   <p className="text-[10px] font-black uppercase">Belum ada siswa terdaftar</p>
                               </div>
                          )}
                      </div>
                  </div>
              </div>
          )}
      </div>

      {/* MODAL KELAS */}
      {isClassModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl border border-white/10 animate-in zoom-in duration-300 flex flex-col max-h-[92vh] relative overflow-hidden">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#0B1121] z-10 shrink-0">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase leading-none">{classEditorMode === 'add' ? 'Tambah Rombel' : 'Edit Rombel'}</h3>
                          <p className="text-[9px] font-bold text-indigo-500 uppercase mt-2 tracking-widest">Master Data Kelas</p>
                      </div>
                      <button onClick={() => setIsClassModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"><XCircleIcon className="w-8 h-8" /></button>
                  </div>

                  <div className="p-6 lg:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6 pb-12 bg-[#F8FAFC] dark:bg-[#0B1121]">
                      <form id="classForm" onSubmit={handleSaveClass} className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ID Dokumen</label>
                                <input 
                                    disabled={classEditorMode === 'edit'} 
                                    type="text" 
                                    value={classFormData.id || ''} 
                                    onChange={e => setClassFormData({...classFormData, id: e.target.value.toUpperCase()})} 
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-xs font-black border border-slate-200 dark:border-slate-700 outline-none uppercase shadow-inner" 
                                    placeholder="OTOMATIS / MANUAL" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tingkat</label>
                                <select value={classFormData.level || '10'} onChange={e => setClassFormData({...classFormData, level: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-xs font-black border border-slate-200 dark:border-slate-700 outline-none appearance-none cursor-pointer">
                                    <option value="10">Grade 10</option>
                                    <option value="11">Grade 11</option>
                                    <option value="12">Grade 12</option>
                                </select>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Kelas *</label>
                              <input 
                                required 
                                type="text" 
                                value={classFormData.name || ''} 
                                onChange={e => {
                                    const newName = e.target.value.toUpperCase();
                                    const yearStart = (classFormData.academicYear || '2025').split('/')[0];
                                    const autoId = newName.trim().replace(/\s+/g, '_') + '_' + yearStart;
                                    
                                    setClassFormData({
                                        ...classFormData, 
                                        name: newName,
                                        id: classEditorMode === 'add' ? autoId : classFormData.id
                                    });
                                }} 
                                className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black outline-none focus:ring-4 focus:ring-indigo-500/10" 
                                placeholder="MISAL: 10 D" 
                              />
                          </div>

                          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex gap-3">
                              <ShieldCheckIcon className="w-5 h-5 text-indigo-500 shrink-0" />
                              <p className="text-[9px] text-indigo-700 dark:text-indigo-300 font-bold leading-relaxed uppercase">
                                Bidang ID Dokumen akan terisi secara otomatis mengikuti format (Nama_Kelas_Tahun) untuk mempermudah manajemen basis data.
                              </p>
                          </div>

                          <div className="pt-4 flex gap-4">
                              <button type="button" onClick={() => setIsClassModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest active:scale-95">Batal</button>
                              <button type="submit" disabled={saving} className="flex-[2] py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all">
                                  {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <SaveIcon className="w-4 h-4" />} SIMPAN
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const NavCard = ({ title, sub, icon: Icon, color, bg, onClick }: any) => (
    <button onClick={onClick} className="flex flex-col items-center gap-3 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#151E32] shadow-sm active:scale-95 transition-all group hover:border-indigo-200">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${bg} ${color}`}>
            <Icon className="w-6 h-6" />
        </div>
        <div className="text-center">
            <p className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 leading-none">{title}</p>
            <p className="text-[7px] font-bold uppercase text-slate-400 mt-1.5 leading-none tracking-widest">{sub}</p>
        </div>
    </button>
);

const ArrowRightIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
);

export default ClassList;
