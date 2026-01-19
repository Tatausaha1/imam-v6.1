
import React, { useState, useMemo, useEffect } from 'react';
import { db, auth, isMockMode } from '../services/firebase';
import { Student, UserRole, Teacher } from '../types';
import { 
    BuildingLibraryIcon, UserIcon, ArrowPathIcon, Loader2, ChevronDownIcon,
    PlusIcon, PencilIcon, TrashIcon, BookOpenIcon,
    StarIcon, SaveIcon, ArrowLeftIcon, ArrowRightIcon, BriefcaseIcon, 
    CheckCircleIcon, UsersIcon, Search, XCircleIcon,
    SparklesIcon, IdentificationIcon, ChartBarIcon
} from './Icons';
import { toast } from 'sonner';

interface ClassData {
    id: string;
    name: string;
    level: string; // Explicit level: '10', '11', '12'
    teacherId?: string; 
    teacherName?: string;
    captainId?: string;
    captainName?: string;
    subjects?: string[];
}

const ClassList: React.FC<{ onBack: () => void, userRole: UserRole }> = ({ onBack, userRole }) => {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedGradeTab, setSelectedGradeTab] = useState<string>('All');
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [activeTab, setActiveTab] = useState<'personalia' | 'students' | 'subjects'>('personalia');
  const [classSearch, setClassSearch] = useState('');
  
  // Data State
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClassData, setNewClassData] = useState({ name: '', level: '10', teacherId: '' });

  // Edit State for Detail
  const [editDetail, setEditDetail] = useState<Partial<ClassData>>({});

  useEffect(() => {
      const unsubscribeAuth = auth?.onAuthStateChanged(user => {
          if (!user && !isMockMode) {
              setLoading(false);
              return;
          }

          if (isMockMode) {
              setClasses([
                  { id: '1', name: 'X IPA 1', level: '10', teacherId: 't1', teacherName: 'Budi Santoso, S.Pd' },
                  { id: '2', name: 'XI IPS 2', level: '11', teacherId: 't2', teacherName: 'Siti Aminah, M.Ag' },
                  { id: '3', name: 'XII AGAMA 1', level: '12', teacherId: 't3', teacherName: 'H. Abdullah, Lc' },
              ]);
              setLoading(false);
              return;
          }

          if (!db) return;

          const unsubClasses = db.collection('classes').onSnapshot(
              snap => setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassData))),
              err => { console.warn("Class Sync Error:", err.message); setLoading(false); }
          );

          const unsubStudents = db.collection('students').onSnapshot(
              snap => setAllStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student))),
              err => console.warn("Student Sync Error:", err.message)
          );

          const unsubTeachers = db.collection('teachers').onSnapshot(
              snap => {
                  setTeachers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher)));
                  setLoading(false);
              },
              err => { console.warn("Teacher Sync Error:", err.message); setLoading(false); }
          );

          return () => { unsubClasses(); unsubStudents(); unsubTeachers(); };
      });

      return () => unsubscribeAuth?.();
  }, []);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassData.name) return;
    
    setSaving(true);
    const toastId = toast.loading("Mendaftarkan Rombel Baru...");
    
    try {
        const teacher = teachers.find(t => t.id === newClassData.teacherId);
        const rawName = newClassData.name || '';
        const levelPrefix = newClassData.level === '10' ? 'X' : newClassData.level === '11' ? 'XI' : 'XII';
        const fullName = `${levelPrefix} ${rawName.toUpperCase()}`;
        
        const payload = {
            name: fullName,
            level: newClassData.level,
            teacherId: newClassData.teacherId,
            teacherName: teacher?.name || '',
            createdAt: new Date().toISOString()
        };

        if (isMockMode) {
            await new Promise(r => setTimeout(r, 800));
            setClasses(prev => [...prev, { id: Date.now().toString(), ...payload }]);
        } else if (db) {
            await db.collection('classes').add(payload);
        }

        toast.success(`Rombel ${fullName} berhasil ditambahkan!`, { id: toastId });
        setIsAddModalOpen(false);
        setNewClassData({ name: '', level: '10', teacherId: '' });
    } catch (e) {
        toast.error("Gagal menambahkan rombel.", { id: toastId });
    } finally {
        setSaving(false);
    }
  };

  const handleOpenDetail = (cls: ClassData) => {
      setSelectedClass(cls);
      setEditDetail({ ...cls });
      setView('detail');
      setActiveTab('personalia');
  };

  const handleDeleteClass = async (e: React.MouseEvent, cls: ClassData) => {
      e.stopPropagation(); 
      if (!cls.id) return;
      const confirmDelete = window.confirm(`Hapus seluruh data rombel ${cls.name}? Tindakan ini permanen.`);
      if (confirmDelete) {
          const toastId = toast.loading(`Menghapus ${cls.name}...`);
          try {
              if (isMockMode) {
                  setClasses(prev => prev.filter(c => c.id !== cls.id));
              } else if (db) {
                  await db.collection('classes').doc(cls.id).delete();
              }
              toast.success("Rombel berhasil dihapus.", { id: toastId });
          } catch (err) { toast.error("Gagal menghapus rombel.", { id: toastId }); }
      }
  };

  const filteredClasses = useMemo(() => {
      let filtered = classes;
      if (classSearch) filtered = filtered.filter(c => (c.name || '').toLowerCase().includes(classSearch.toLowerCase()));
      if (selectedGradeTab !== 'All') filtered = filtered.filter(c => c.level === selectedGradeTab);
      return filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true }));
  }, [classes, classSearch, selectedGradeTab]);

  const levelStats = useMemo(() => {
      const stats = { 
          '10': { classCount: 0, studentCount: 0 }, 
          '11': { classCount: 0, studentCount: 0 }, 
          '12': { classCount: 0, studentCount: 0 } 
      };
      
      classes.forEach(c => { 
          const lvl = c.level as keyof typeof stats;
          if (stats[lvl]) stats[lvl].classCount++; 
      });
      
      allStudents.forEach(s => { 
          const cls = classes.find(c => c.name === s.tingkatRombel);
          if (cls) {
              const lvl = cls.level as keyof typeof stats;
              if (stats[lvl]) stats[lvl].studentCount++;
          }
      });
      return stats;
  }, [classes, allStudents]);

  const canManage = userRole === UserRole.ADMIN || userRole === UserRole.DEVELOPER;

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#020617] overflow-hidden transition-colors duration-500">
      {/* Header */}
      <div className="bg-white/80 dark:bg-[#0B1121]/80 backdrop-blur-xl px-5 py-4 flex items-center justify-between z-40 sticky top-0 border-b border-slate-100 dark:border-slate-800 safe-pt">
          <div className="flex items-center gap-4">
              <button onClick={view === 'detail' ? () => setView('list') : onBack} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-all active:scale-90"><ArrowLeftIcon className="w-5 h-5" /></button>
              <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                    {view === 'detail' ? (selectedClass?.name || 'Detail Rombel') : 'Rombel Madrasah'}
                  </h2>
                  <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1.5">DATABASE AKADEMIK</p>
              </div>
          </div>
          {view === 'list' && canManage && (
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
              >
                  <PlusIcon className="w-4 h-4" /> Tambah
              </button>
          )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
              <div className="py-20 text-center flex flex-col items-center gap-3"><Loader2 className="w-10 h-10 animate-spin text-indigo-500 opacity-20" /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Data...</p></div>
          ) : view === 'list' ? (
              <div className="p-5 lg:p-8 space-y-6 pb-40 animate-in fade-in duration-700">
                  {/* Grade Tabs */}
                  <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-[#151E32] rounded-[1.8rem] border border-slate-200 dark:border-slate-800">
                      {['All', '10', '11', '12'].map((grade) => (
                          <button 
                            key={grade} 
                            onClick={() => setSelectedGradeTab(grade)} 
                            className={`flex-1 py-3 rounded-[1.3rem] text-[10px] font-black uppercase tracking-widest transition-all ${selectedGradeTab === grade ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            {grade === 'All' ? 'Semua' : `TK ${grade}`}
                          </button>
                      ))}
                  </div>

                  {/* Summary Header per Grade */}
                  {selectedGradeTab !== 'All' && (
                      <div className="bg-indigo-600 rounded-[2.5rem] p-6 text-white shadow-xl shadow-indigo-500/10 relative overflow-hidden animate-in zoom-in-95 duration-500">
                          <div className="absolute top-0 right-0 p-8 opacity-10 -rotate-12"><BuildingLibraryIcon className="w-24 h-24" /></div>
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">Rangkuman Tingkat {selectedGradeTab}</p>
                          <div className="flex items-end gap-8">
                              <div><h3 className="text-3xl font-black">{levelStats[selectedGradeTab as '10'|'11'|'12']?.classCount || 0}</h3><p className="text-[8px] font-bold uppercase tracking-widest opacity-60">Unit Kelas</p></div>
                              <div className="w-px h-10 bg-white/20"></div>
                              <div><h3 className="text-3xl font-black">{levelStats[selectedGradeTab as '10'|'11'|'12']?.studentCount || 0}</h3><p className="text-[8px] font-bold uppercase tracking-widest opacity-60">Peserta Didik</p></div>
                          </div>
                      </div>
                  )}

                  {/* Search bar */}
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Cari Nama Rombel..." 
                        value={classSearch} 
                        onChange={(e) => setClassSearch(e.target.value)} 
                        className="w-full bg-white dark:bg-[#151E32] border border-slate-100 dark:border-slate-800 rounded-[1.5rem] py-4 pl-12 pr-4 text-xs font-bold focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm outline-none text-slate-800 dark:text-white" 
                    />
                  </div>

                  {/* Class Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filteredClasses.map(cls => {
                          const classStudents = allStudents.filter(s => s.tingkatRombel === cls.name);
                          const maleCount = classStudents.filter(s => s.jenisKelamin === 'Laki-laki').length;
                          const femaleCount = classStudents.filter(s => s.jenisKelamin === 'Perempuan').length;
                          
                          return (
                          <div key={cls.id} onClick={() => handleOpenDetail(cls)} className="bg-white dark:bg-[#151E32] p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all cursor-pointer group relative overflow-hidden flex flex-col min-h-[160px]">
                              <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/5 blur-2xl group-hover:bg-indigo-500/10 transition-all"></div>
                              <div className="flex justify-between items-start mb-6">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${cls.level === '12' ? 'bg-rose-50 text-rose-600' : cls.level === '11' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>TK {cls.level}</span>
                                        <span className="text-[9px] font-black text-slate-300">•</span>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{classStudents.length} SISWA</span>
                                    </div>
                                    <h4 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight truncate group-hover:text-indigo-600 transition-colors">{cls.name}</h4>
                                    
                                    {/* GENDER COUNT BADGES */}
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800/50">
                                            <span className="text-[7px] font-black text-blue-400 uppercase">L:</span>
                                            <span className="text-[9px] font-black text-blue-600 dark:text-blue-400">{maleCount}</span>
                                        </div>
                                        <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-md border border-rose-100 dark:border-rose-800/50">
                                            <span className="text-[7px] font-black text-rose-400 uppercase">P:</span>
                                            <span className="text-[9px] font-black text-rose-600 dark:text-rose-400">{femaleCount}</span>
                                        </div>
                                    </div>
                                  </div>
                                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner"><ArrowRightIcon className="w-4 h-4" /></div>
                              </div>
                              <div className="flex items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800 group-hover:border-indigo-500/20 transition-all mt-auto">
                                  <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm"><BriefcaseIcon className="w-3.5 h-3.5 text-indigo-500" /></div>
                                  <div className="min-w-0 flex-1"><p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Wali Rombel</p><p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 truncate leading-none mt-0.5">{cls.teacherName || 'BELUM DIATUR'}</p></div>
                                  {canManage && (<button onClick={(e) => handleDeleteClass(e, cls)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-all"><TrashIcon className="w-3.5 h-3.5" /></button>)}
                              </div>
                          </div>
                      );
                      })}
                  </div>

                  {canManage && (
                      <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-10 flex flex-col items-center justify-center gap-4 text-slate-400 hover:text-indigo-600 hover:border-indigo-500 transition-all group bg-white/50 dark:bg-[#151E32]/20 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10"
                      >
                          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-100 transition-all"><PlusIcon className="w-8 h-8" /></div>
                          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Tambah Unit Rombel Baru</span>
                      </button>
                  )}
              </div>
          ) : (
              /* Detail View */
              <div className="max-w-4xl mx-auto p-5 lg:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12"><BuildingLibraryIcon className="w-40 h-40" /></div>
                      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                          <div>
                              <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20"><StarIcon className="w-4 h-4 text-yellow-300" /></div><span className="text-[10px] font-black uppercase tracking-widest">Tingkat {selectedClass?.level}</span></div>
                              <h2 className="text-3xl font-black uppercase tracking-tight">{selectedClass?.name}</h2>
                              <p className="text-xs text-indigo-100 font-medium mt-1">Populasi: <span className="font-black text-white">{allStudents.filter(s => s.tingkatRombel === selectedClass?.name).length} Peserta Didik</span></p>
                          </div>
                          <div className="flex gap-4">
                              <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 text-center"><p className="text-[8px] font-black uppercase tracking-widest opacity-60">Laki-laki</p><p className="text-lg font-black">{allStudents.filter(s => s.tingkatRombel === selectedClass?.name && s.jenisKelamin === 'Laki-laki').length}</p></div>
                              <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 text-center"><p className="text-[8px] font-black uppercase tracking-widest opacity-60">Perempuan</p><p className="text-lg font-black">{allStudents.filter(s => s.tingkatRombel === selectedClass?.name && s.jenisKelamin === 'Perempuan').length}</p></div>
                          </div>
                      </div>
                  </div>
                  
                  <div className="flex p-1.5 bg-slate-100 dark:bg-[#151E32] rounded-[1.8rem] w-full border border-slate-200 dark:border-slate-800 shadow-inner">
                      <button onClick={() => setActiveTab('personalia')} className={`flex-1 py-3.5 rounded-[1.3rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'personalia' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-lg ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}><BriefcaseIcon className="w-3.5 h-3.5" /> Personalia</button>
                      <button onClick={() => setActiveTab('students')} className={`flex-1 py-3.5 rounded-[1.3rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'students' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-lg ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}><UsersIcon className="w-3.5 h-3.5" /> Siswa</button>
                      <button onClick={() => setActiveTab('subjects')} className={`flex-1 py-3.5 rounded-[1.3rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'subjects' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-lg ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}><BookOpenIcon className="w-3.5 h-3.5" /> Mapel</button>
                  </div>

                  {activeTab === 'personalia' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4">
                          <div className="bg-white dark:bg-[#151E32] p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600"><BriefcaseIcon className="w-5 h-5" /></div><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Wali Kelas</h4></div>
                              <div className="relative group">
                                  <select value={editDetail.teacherId || ''} onChange={e => setEditDetail({...editDetail, teacherId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-black text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none cursor-pointer uppercase transition-all shadow-inner">
                                      <option value="">-- PILIH GURU --</option>
                                      {teachers.map(t => <option key={t.id} value={t.id}>{(t.name || '').toUpperCase()}</option>)}
                                  </select>
                                  <ChevronDownIcon className="absolute right-4 top-4.5 w-4 h-4 text-slate-400 pointer-events-none" />
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          )}
      </div>

      {/* ADD CLASS MODAL */}
      {isAddModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300 border border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03]"><BuildingLibraryIcon className="w-40 h-40"/></div>
                  
                  <div className="flex justify-between items-center mb-8 relative z-10">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase leading-none">Registrasi Rombel</h3>
                          <p className="text-[9px] font-bold text-indigo-500 uppercase mt-2">Database Akademik Madrasah</p>
                      </div>
                      <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                          <XCircleIcon className="w-8 h-8" />
                      </button>
                  </div>

                  <form onSubmit={handleAddClass} className="space-y-6 relative z-10">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Tingkat</label>
                          <div className="grid grid-cols-3 gap-3">
                              {['10', '11', '12'].map(lvl => (
                                  <button 
                                    key={lvl} type="button" 
                                    onClick={() => setNewClassData({...newClassData, level: lvl})}
                                    className={`py-4 rounded-2xl border font-black text-xs transition-all ${newClassData.level === lvl ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'}`}
                                  >
                                      TK {lvl}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Rombel</label>
                          <div className="relative">
                            <input 
                                required type="text" 
                                value={newClassData.name} 
                                onChange={e => setNewClassData({...newClassData, name: (e.target.value || '').toUpperCase()})} 
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-5 pr-4 text-xs font-black text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-inner" 
                                placeholder="CONTOH: IPA 1 / IPS 2 / AGAMA" 
                            />
                          </div>
                          <p className="text-[8px] text-slate-400 italic ml-1">* Sistem akan otomatis menambahkan prefiks (X, XI, atau XII).</p>
                      </div>

                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Wali Rombel (Opsional)</label>
                          <div className="relative">
                              <select 
                                value={newClassData.teacherId} 
                                onChange={e => setNewClassData({...newClassData, teacherId: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-5 pr-10 text-xs font-bold text-slate-800 dark:text-white outline-none appearance-none cursor-pointer shadow-inner"
                              >
                                  <option value="">-- PILIH GURU --</option>
                                  {teachers.map(t => <option key={t.id} value={t.id}>{(t.name || '').toUpperCase()}</option>)}
                              </select>
                              <ChevronDownIcon className="absolute right-4 top-5 w-4 h-4 text-slate-400 pointer-events-none" />
                          </div>
                      </div>

                      <button 
                        type="submit" disabled={saving}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[2rem] text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-indigo-500/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                      >
                          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><SaveIcon className="w-4 h-4"/> Daftarkan Unit Rombel</>}
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default ClassList;
