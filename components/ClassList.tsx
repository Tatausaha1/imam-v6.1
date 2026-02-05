
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db, isMockMode } from '../services/firebase';
import { Student, UserRole, Teacher, ClassData, ViewState } from '../types';
// Fix: Added missing CheckCircleIcon to fix "Cannot find name 'CheckCircleIcon'" error
import { 
    Loader2, PencilIcon, BookOpenIcon,
    SaveIcon, ArrowLeftIcon, 
    UsersIcon, XCircleIcon, PlusIcon,
    ChartBarIcon, CalendarIcon,
    FileText, UserIcon, ShieldCheckIcon, Search,
    PrinterIcon, ChevronDownIcon,
    CogIcon,
    HeartIcon,
    CheckCircleIcon
} from './Icons';
import { toast } from 'sonner';
import { updateStudent } from '../services/studentService';
import { addClass, updateClass } from '../services/classService';

type ClassView = 'list' | 'dashboard' | 'detail_tab';
type DetailTab = 'siswa' | 'mapel' | 'laporan' | 'poin' | 'wali_edit';
type ReportType = 'daily' | 'monthly_class';

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
      name: '', level: '10', teacherId: '', teacherName: '', academicYear: '2024/2025'
  });
  
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Partial<Student> | null>(null);

  const canManage = userRole === UserRole.ADMIN || userRole === UserRole.DEVELOPER;

  useEffect(() => {
    setLoading(true);
    if (isMockMode) {
        setClasses([
            { id: '1', name: 'X IPA 1', level: '10', teacherId: 't1', teacherName: 'Budi Santoso, S.Pd', academicYear: '2024/2025' },
            { id: '2', name: 'XI IPS 1', level: '11', teacherId: 't2', teacherName: 'Siti Aminah, M.Ag', academicYear: '2024/2025' },
            { id: '3', name: 'XII IPA 1', level: '12', teacherId: 't3', teacherName: 'H. Ahmad, M.Pd', academicYear: '2024/2025' },
            { id: '4', name: 'X IPA 2', level: '10', teacherId: 't4', teacherName: 'Drs. Hasan', academicYear: '2024/2025' },
            { id: '5', name: 'XI IPA 1', level: '11', teacherId: 't5', teacherName: 'Rina Wati, S.Pd', academicYear: '2024/2025' }
        ]);
        setAllStudents([
            { id: 's1', namaLengkap: 'ADELIA SRI SUNDARI', jenisKelamin: 'Perempuan', idUnik: '25002', tingkatRombel: 'XII IPA 1', status: 'Aktif' } as any,
            { id: 's2', namaLengkap: 'BUDI PRATAMA', jenisKelamin: 'Laki-laki', idUnik: '25003', tingkatRombel: 'XII IPA 1', status: 'Aktif' } as any
        ]);
        setTeachers([
            { id: 't1', name: 'Budi Santoso, S.Pd', nip: '19900101', subject: 'Matematika', status: 'PNS', phone: '08123456789' },
            { id: 't2', name: 'Siti Aminah, M.Ag', nip: '19900102', subject: 'PAI', status: 'PNS', phone: '08987654321' }
        ]);
        setLoading(false);
        return;
    }

    if (!db) return;
    const unsubClasses = db.collection('classes').onSnapshot(snap => setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassData))));
    const unsubStudents = db.collection('students').onSnapshot(snap => setAllStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student))));
    const unsubTeachers = db.collection('teachers').orderBy('name').onSnapshot(snap => setTeachers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher))));
    
    setLoading(false);
    return () => { unsubClasses(); unsubStudents(); unsubTeachers(); };
  }, []);

  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return allStudents.filter(s => s.tingkatRombel === selectedClass.name)
        .sort((a, b) => (a.namaLengkap || '').localeCompare(b.namaLengkap || ''));
  }, [selectedClass, allStudents]);

  const classStats = useMemo(() => {
    if (!selectedClass) return { total: 0, male: 0, female: 0 };
    const filtered = allStudents.filter(s => s.tingkatRombel === selectedClass.name);
    return {
      total: filtered.length,
      male: filtered.filter(s => s.jenisKelamin === 'Laki-laki').length,
      female: filtered.filter(s => s.jenisKelamin === 'Perempuan').length
    };
  }, [selectedClass, allStudents]);

  const classTeacher = useMemo(() => {
    if (!selectedClass) return null;
    return teachers.find(t => t.id === selectedClass.teacherId) || null;
  }, [selectedClass, teachers]);

  const handleOpenClass = (cls: ClassData) => {
    setSelectedClass(cls);
    setView('dashboard');
  };

  const handleOpenTab = (tab: DetailTab) => {
    setActiveTab(tab);
    setView('detail_tab');
  };

  const handleNavigateToReports = (type: ReportType) => {
      if (!selectedClass) return;
      localStorage.setItem('imam_pending_report_class', selectedClass.name);
      localStorage.setItem('imam_pending_report_view', type === 'daily' ? 'daily' : 'monthly');
      onNavigate(ViewState.REPORTS);
  };

  // Fix: Added missing handleSaveClass function to resolve "Cannot find name 'handleSaveClass'" error
  const handleSaveClass = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!classFormData.name || !classFormData.level) {
          toast.error("Nama Rombel dan Tingkat wajib diisi.");
          return;
      }

      setSaving(true);
      const toastId = toast.loading(classEditorMode === 'add' ? "Menambah rombel baru..." : "Memperbarui data rombel...");

      try {
          if (isMockMode) {
              await new Promise(r => setTimeout(r, 800));
          } else {
              if (classEditorMode === 'add') {
                  await addClass(classFormData as ClassData);
              } else if (selectedClass?.id) {
                  await updateClass(selectedClass.id, classFormData);
              }
          }
          toast.success("Database Rombel berhasil diperbarui.", { id: toastId });
          setIsClassModalOpen(false);
      } catch (e: any) {
          toast.error("Gagal menyimpan: " + (e.message || "Terjadi kesalahan"), { id: toastId });
      } finally {
          setSaving(false);
      }
  };

  const getLevelTheme = (level: string) => {
    const lvl = String(level);
    if (lvl === '10') return { bg: 'bg-rose-500', grad: 'from-rose-400 to-rose-700', textSub: 'text-rose-100', accent: 'text-rose-600', shadow: 'shadow-rose-500/20' };
    if (lvl === '11') return { bg: 'bg-emerald-500', grad: 'from-emerald-400 to-emerald-700', textSub: 'text-emerald-100', accent: 'text-emerald-600', shadow: 'shadow-emerald-500/20' };
    if (lvl === '12') return { bg: 'bg-indigo-600', grad: 'from-indigo-500 to-indigo-800', textSub: 'text-indigo-100', accent: 'text-indigo-600', shadow: 'shadow-indigo-500/20' };
    return { bg: 'bg-slate-500', grad: 'from-slate-400 to-slate-700', textSub: 'text-slate-100', accent: 'text-slate-600', shadow: 'shadow-slate-500/20' };
  };

  const currentTheme = selectedClass ? getLevelTheme(selectedClass.level) : getLevelTheme('10');

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#020617] overflow-hidden transition-all">
      {/* --- PREMIUM MOBILE HEADER --- */}
      <div className="bg-white/80 dark:bg-[#0B1121]/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between z-40 sticky top-0 border-b border-slate-100 dark:border-slate-800 safe-pt shadow-sm">
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
                    {view === 'list' ? 'Basis Data Rombel' : selectedClass?.name}
                  </h2>
                  <p className={`text-[8px] font-black ${currentTheme.accent} uppercase tracking-widest mt-1`}>
                      {view === 'list' ? 'Manajemen Kelas' : `Tahun Ajaran ${selectedClass?.academicYear}`}
                  </p>
              </div>
          </div>
          {view === 'list' && canManage && (
              <button onClick={() => { setClassEditorMode('add'); setClassFormData({name:'', level:'10'}); setIsClassModalOpen(true); }} className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all"><PlusIcon className="w-5 h-5" /></button>
          )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 pb-32">
          {loading ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500 opacity-20" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Basis Data...</p>
              </div>
          ) : view === 'list' ? (
              /* --- VIEW 1: PREMIUM GRID FOLDER --- */
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {classes.map(cls => {
                      const studentsInClass = allStudents.filter(s => s.tingkatRombel === cls.name);
                      const theme = getLevelTheme(cls.level);

                      return (
                        <button 
                            key={cls.id} 
                            onClick={() => handleOpenClass(cls)} 
                            className="flex flex-col items-center gap-3 group transition-all"
                        >
                            <div className={`w-full aspect-square flex flex-col items-center justify-center ${theme.bg} rounded-[2.5rem] shadow-xl ${theme.shadow} group-hover:-translate-y-1.5 transition-all duration-500 group-active:scale-90 relative overflow-hidden border-2 border-white/20`}>
                                <div className={`absolute inset-0 bg-gradient-to-br ${theme.grad} opacity-40`}></div>
                                
                                <div className="relative z-10 flex flex-col items-center text-center px-4 leading-none">
                                    <div className="text-xl md:text-2xl font-black text-white uppercase drop-shadow-lg mb-1">{cls.name.split(' ')[0]}</div>
                                    <div className="text-[10px] font-black text-white/70 uppercase tracking-widest">{cls.name.split(' ').slice(1).join(' ')}</div>
                                </div>

                                <div className="absolute bottom-4 inset-x-0 px-4 z-10">
                                    <div className="bg-white/20 backdrop-blur-md rounded-xl py-1.5 px-2 flex justify-between items-center border border-white/10 shadow-sm">
                                        <div className="flex items-center gap-1.5">
                                            <UsersIcon className="w-3 h-3 text-white" />
                                            <span className="text-[9px] font-black text-white">{studentsInClass.length}</span>
                                        </div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                                    </div>
                                </div>

                                <div className="absolute -top-4 -right-4 opacity-10">
                                    <HeartIcon className="w-24 h-24 text-white fill-current" />
                                </div>
                            </div>
                            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate w-full text-center group-hover:text-indigo-600 transition-colors">
                                {cls.name}
                            </p>
                        </button>
                      );
                  })}
              </div>
          ) : view === 'dashboard' ? (
              /* --- VIEW 2: PREMIUM CLASS HUB DASHBOARD --- */
              <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
                  <div className="bg-white dark:bg-[#151E32] rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden relative group">
                      <div className={`p-8 bg-gradient-to-br ${currentTheme.grad} text-white relative overflow-hidden flex flex-col items-center gap-6`}>
                          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none"></div>
                          
                          <div className="flex justify-between w-full relative z-20">
                             <div className="px-4 py-1.5 bg-white/20 rounded-full backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-[0.2em]">Rombel Aktif</div>
                             <div className="flex gap-2">
                                <button onClick={() => handleOpenTab('wali_edit')} className="p-2 bg-white/20 rounded-xl backdrop-blur-md border border-white/10 active:scale-90 transition-all"><CogIcon className="w-4 h-4" /></button>
                             </div>
                          </div>

                          <div className="w-24 h-24 rounded-[2rem] bg-white/10 flex items-center justify-center border-4 border-white/20 shadow-2xl relative">
                              <UserIcon className="w-12 h-12" />
                              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-[#151E32] flex items-center justify-center shadow-lg"><CheckCircleIcon className="w-4 h-4 text-white" /></div>
                          </div>
                          
                          <div className="text-center w-full px-4 relative z-20">
                              <p className={`text-[8px] font-black ${currentTheme.textSub} uppercase tracking-[0.4em] mb-2 leading-none`}>Wali Rombongan Belajar</p>
                              <h3 className="text-xl font-black uppercase tracking-tight mb-3 leading-tight">{classTeacher?.name || 'BELUM DIATUR'}</h3>
                              <div className="flex justify-center gap-2">
                                  <div className="px-3 py-1.5 bg-white/10 rounded-xl text-[8px] font-black border border-white/10 uppercase tracking-widest backdrop-blur-md">NIP: {classTeacher?.nip || '-'}</div>
                                  <div className="px-3 py-1.5 bg-white/10 rounded-xl text-[8px] font-black border border-white/10 uppercase tracking-widest backdrop-blur-md">WA: {classTeacher?.phone || '-'}</div>
                              </div>
                          </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900/50 px-8 py-5 flex items-center justify-around border-b border-slate-100 dark:border-slate-800">
                          <div className="text-center">
                              <p className="text-2xl font-black text-slate-800 dark:text-white leading-none">{classStats.total}</p>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2">Total Siswa</p>
                          </div>
                          <div className="w-[1px] h-8 bg-slate-200 dark:bg-slate-800"></div>
                          <div className="text-center">
                              <p className="text-2xl font-black text-blue-600 leading-none">{classStats.male}</p>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2">Laki-laki</p>
                          </div>
                          <div className="w-[1px] h-8 bg-slate-200 dark:bg-slate-800"></div>
                          <div className="text-center">
                              <p className={`text-2xl font-black ${currentTheme.accent} leading-none`}>{classStats.female}</p>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2">Perempuan</p>
                          </div>
                      </div>
                      
                      <div className="p-4 grid grid-cols-2 gap-3">
                          <FolderNavCard title="Data Siswa" sub="Direktori Induk" icon={UsersIcon} color="text-indigo-600" bg="bg-indigo-50 dark:bg-indigo-900/30" onClick={() => handleOpenTab('siswa')} />
                          <FolderNavCard title="Jadwal Mapel" sub="Kalender KBM" icon={CalendarIcon} color="text-orange-600" bg="bg-orange-50 dark:bg-orange-900/30" onClick={() => handleOpenTab('mapel')} />
                          <FolderNavCard title="Log Presensi" sub="Laporan Harian" icon={ChartBarIcon} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-900/30" onClick={() => handleNavigateToReports('daily')} />
                          <FolderNavCard title="Poin Sikap" sub="Kedisiplinan" icon={ShieldCheckIcon} color="text-rose-600" bg="bg-rose-50 dark:bg-rose-900/30" onClick={() => handleOpenTab('poin')} />
                      </div>

                      <div className="px-4 pb-4">
                          <button 
                            onClick={() => handleNavigateToReports('monthly_class')}
                            className="w-full py-4 bg-slate-100 dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center gap-3 active:scale-95 transition-all group border border-slate-200/50 dark:border-slate-700"
                          >
                              <PrinterIcon className="w-5 h-5 text-slate-500 group-hover:text-indigo-600" />
                              <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.2em]">Rekap Bulanan Landscape</span>
                          </button>
                      </div>
                  </div>
              </div>
          ) : (
              /* --- VIEW 3: DETAIL TAB CONTENT --- */
              <div className="animate-in fade-in duration-300 max-w-3xl mx-auto space-y-4">
                  {activeTab === 'siswa' && (
                      <div className="space-y-4">
                          <div className="flex justify-between items-center px-2">
                               <div>
                                   <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Daftar Peserta Didik</h3>
                                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{classStudents.length} Records Terdaftar</p>
                               </div>
                               <button onClick={() => onNavigate(ViewState.STUDENTS)} className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg active:scale-90 transition-all"><PlusIcon className="w-5 h-5" /></button>
                          </div>
                          
                          <div className="bg-white dark:bg-[#151E32] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
                               <div className="overflow-x-auto">
                                   <table className="w-full text-left border-collapse table-fixed min-w-[500px]">
                                       <thead className="bg-slate-50 dark:bg-slate-900/50 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                           <tr>
                                               <th className="w-12 px-4 py-4 text-center">#</th>
                                               <th className="px-4 py-4 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">Nama Lengkap</th>
                                               <th className="w-16 px-4 py-4 text-center">Gender</th>
                                               <th className="w-24 px-4 py-4 text-center">ID Lokal</th>
                                               <th className="w-16 px-4 py-4 text-center">Aksi</th>
                                           </tr>
                                       </thead>
                                       <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                           {classStudents.map((s, i) => (
                                               <tr key={s.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group">
                                                   <td className="px-4 py-4 text-[9px] font-bold text-slate-400 text-center">{i+1}</td>
                                                   <td className="px-4 py-4 font-black text-slate-700 dark:text-slate-300 text-[10px] uppercase truncate sticky left-0 bg-white dark:bg-[#151E32] z-10 border-r border-slate-100 dark:border-slate-800 group-hover:text-indigo-600">{s.namaLengkap}</td>
                                                   <td className="px-4 py-4 text-center text-[9px] font-black text-slate-500 uppercase">{s.jenisKelamin === 'Perempuan' ? 'P' : 'L'}</td>
                                                   <td className="px-4 py-4 font-mono text-[10px] text-indigo-600 text-center font-black">{s.idUnik}</td>
                                                   <td className="px-4 py-4 text-center">
                                                       <button onClick={() => { setEditingStudent({...s}); setIsStudentModalOpen(true); }} className="p-2 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl active:scale-90 transition-all"><PencilIcon className="w-4 h-4"/></button>
                                                   </td>
                                               </tr>
                                           ))}
                                       </tbody>
                                   </table>
                               </div>
                               {classStudents.length === 0 && (
                                   <div className="p-20 text-center flex flex-col items-center gap-4 opacity-40">
                                       <UsersIcon className="w-12 h-12" />
                                       <p className="text-[10px] font-black uppercase tracking-widest">Belum Ada Siswa</p>
                                   </div>
                               )}
                          </div>
                      </div>
                  )}

                  {activeTab === 'wali_edit' && (
                       <div className="bg-white dark:bg-[#151E32] p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">Pengaturan Rombel</h3>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Nama & Tingkat Aktif</p>
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase leading-none">{selectedClass?.name}</h4>
                                        <span className={`px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-[9px] font-black ${currentTheme.accent} uppercase tracking-widest`}>Tingkat {selectedClass?.level}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Pilih Wali Rombel</label>
                                    <div className="relative">
                                        <select 
                                            value={selectedClass?.teacherId || ''} 
                                            onChange={async (e) => { 
                                                const tid = e.target.value; 
                                                const t = teachers.find(x=>x.id===tid); 
                                                if(db && selectedClass?.id) await db.collection('classes').doc(selectedClass.id).update({ teacherId: tid, teacherName: t?.name || '' }); 
                                                setSelectedClass(prev => prev ? ({...prev, teacherId: tid, teacherName: t?.name || ''}) : null); 
                                                toast.success("Wali Rombel Diperbarui");
                                            }} 
                                            className="w-full p-4 pr-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black outline-none uppercase appearance-none cursor-pointer shadow-inner"
                                        >
                                            <option value="">-- PILIH WALI --</option>
                                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setView('dashboard')} className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Selesai & Simpan</button>
                       </div>
                  )}

                  {activeTab === 'mapel' && (
                      <div className="py-32 text-center bg-white dark:bg-[#151E32] rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800 shadow-inner flex flex-col items-center gap-6">
                          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-[2rem] flex items-center justify-center text-indigo-600">
                             <CalendarIcon className="w-10 h-10" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Struktur KBM {selectedClass?.name}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Menunggu integrasi modul jadwal...</p>
                          </div>
                      </div>
                  )}

                  {activeTab === 'poin' && (
                      <div className="bg-white dark:bg-[#151E32] p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl space-y-6">
                           <div className="flex items-center gap-4 mb-2">
                               <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shadow-inner"><ShieldCheckIcon className="w-6 h-6" /></div>
                               <div>
                                   <h3 className="text-sm font-black uppercase tracking-tight">Kredit Kedisiplinan</h3>
                                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Dataset Sikap Rombel</p>
                               </div>
                           </div>
                           <div className="space-y-2">
                               {classStudents.slice(0, 5).map(s => (
                                   <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                       <p className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 truncate pr-4">{s.namaLengkap}</p>
                                       <div className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg text-[8px] font-black uppercase tracking-widest">Normal</div>
                                   </div>
                               ))}
                           </div>
                      </div>
                  )}
              </div>
          )}
      </div>

      {/* --- MODAL EDIT KELAS (GLOBAL CONFIG) --- */}
      {isClassModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-[360px] rounded-[3rem] p-8 shadow-2xl animate-in zoom-in duration-300 border border-white/10 flex flex-col relative overflow-hidden">
                  <div className="flex justify-between items-center mb-8">
                      <div>
                        <h3 className="text-base font-black text-slate-800 dark:text-white uppercase leading-none">{classEditorMode === 'add' ? 'Rombel Baru' : 'Edit Rombel'}</h3>
                        <p className="text-[8px] font-black text-indigo-500 uppercase mt-2">Sinkronisasi Enterprise</p>
                      </div>
                      <button onClick={() => setIsClassModalOpen(false)} className="p-2 text-slate-400 active:scale-90 transition-all"><XCircleIcon className="w-7 h-7" /></button>
                  </div>
                  <form onSubmit={handleSaveClass} className="space-y-6">
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nama Rombel *</label><input required type="text" value={classFormData.name} onChange={e => setClassFormData({...classFormData, name: e.target.value.toUpperCase()})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-black outline-none shadow-inner" placeholder="CONTOH: XII IPA 1" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tingkat</label><div className="relative"><select value={classFormData.level} onChange={e => setClassFormData({...classFormData, level: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-4 text-xs font-black outline-none appearance-none cursor-pointer shadow-inner"><option value="10">10</option><option value="11">11</option><option value="12">12</option></select><ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /></div></div>
                        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">TA</label><input type="text" value={classFormData.academicYear} onChange={e => setClassFormData({...classFormData, academicYear: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-4 text-xs font-black outline-none shadow-inner" /></div>
                      </div>
                      <button type="submit" disabled={saving} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                          {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : <SaveIcon className="w-5 h-5" />} SIMPAN DATABASE
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* --- MODAL EDIT SISWA CEPAT --- */}
      {isStudentModalOpen && editingStudent && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-[360px] rounded-[3rem] p-8 shadow-2xl border border-white/10 flex flex-col animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-8">
                      <div>
                        <h3 className="text-base font-black text-slate-800 dark:text-white uppercase leading-none">Koreksi Record</h3>
                        <p className="text-[8px] font-black text-indigo-500 uppercase mt-2">ID UNIK: {editingStudent.idUnik}</p>
                      </div>
                      <button onClick={() => setIsStudentModalOpen(false)} className="p-2 text-slate-400 active:scale-90 transition-all"><XCircleIcon className="w-7 h-7" /></button>
                  </div>
                  <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await updateStudent(editingStudent.id!, editingStudent); toast.success("Data Sinkron."); setIsStudentModalOpen(false); setSaving(false); }} className="space-y-6">
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nama Lengkap *</label><input required type="text" value={editingStudent.namaLengkap} onChange={e => setEditingStudent({...editingStudent, namaLengkap: e.target.value.toUpperCase()})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-[11px] font-black outline-none shadow-inner" /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">NISN</label><input type="text" value={editingStudent.nisn || ''} onChange={e => setEditingStudent({...editingStudent, nisn: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-4 text-[11px] font-bold outline-none shadow-inner" /></div>
                          <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">ID Lokal</label><input type="text" disabled value={editingStudent.idUnik || ''} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-4 text-[11px] font-black opacity-60" /></div>
                      </div>
                      <button type="submit" disabled={saving} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : <SaveIcon className="w-5 h-5" />} UPDATE DATA
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

const FolderNavCard = ({ title, sub, icon: Icon, color, bg, onClick }: any) => (
    <button 
        onClick={onClick} 
        className="flex flex-col items-center gap-2 p-5 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0B1121] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 group relative overflow-hidden"
    >
        <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center transition-all group-hover:scale-110 shadow-sm relative z-10 ${bg} ${color}`}>
            <Icon className="w-6 h-6" />
        </div>
        <div className="text-center relative z-10">
            <p className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-tighter leading-none">{title}</p>
            <p className="text-[7px] font-bold uppercase text-slate-400 tracking-widest mt-1.5 leading-none">{sub}</p>
        </div>
    </button>
);

export default ClassList;
