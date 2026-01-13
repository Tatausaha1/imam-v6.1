import React, { useState, useMemo, useEffect } from 'react';
import { db, isMockMode } from '../services/firebase';
import { deleteClass } from '../services/classService';
import { Student, UserRole, Teacher } from '../types';
import { 
    BuildingLibraryIcon, UserIcon, ArrowPathIcon, Loader2, ChevronDownIcon,
    PlusIcon, PencilIcon, TrashIcon, BookOpenIcon,
    StarIcon, SaveIcon, ArrowLeftIcon, BriefcaseIcon, 
    CheckCircleIcon, UsersIcon
} from './Icons';
import { toast } from 'sonner';

interface ClassData {
    id: string;
    name: string;
    teacherId?: string; 
    teacherName?: string;
    captainId?: string;
    captainName?: string;
    subjects?: string[];
}

const ClassList: React.FC<{ onBack: () => void, userRole: UserRole }> = ({ onBack, userRole }) => {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [activeTab, setActiveTab] = useState<'personalia' | 'students' | 'subjects'>('personalia');
  
  // Data State
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit State for Detail
  const [editDetail, setEditDetail] = useState<Partial<ClassData>>({});

  useEffect(() => {
      if (isMockMode) {
          setClasses([
              { id: '1', name: 'XII IPA 1', teacherId: 't1', teacherName: 'Budi Santoso, S.Pd', captainId: 's1', captainName: 'Ahmad Dahlan', subjects: ['Matematika', 'Fisika', 'Kimia'] },
              { id: '2', name: 'XI IPS 2', teacherId: 't2', teacherName: 'Siti Aminah, M.Ag', subjects: ['Ekonomi', 'Sosiologi'] }
          ]);
          setAllStudents([
              { id: 's1', namaLengkap: 'Ahmad Dahlan', tingkatRombel: 'XII IPA 1', nisn: '0086806447' } as any,
              { id: 's2', namaLengkap: 'Siti Badriah', tingkatRombel: 'XII IPA 1', nisn: '0086806448' } as any,
              { id: 's3', namaLengkap: 'Budi Doremi', tingkatRombel: 'XI IPS 2', nisn: '0086806449' } as any,
          ]);
          setTeachers([
              { id: 't1', name: 'Budi Santoso, S.Pd' } as any,
              { id: 't2', name: 'Siti Aminah, M.Ag' } as any,
          ]);
          setLoading(false);
          return;
      }

      if (!db) return;

      const unsubClasses = db.collection('classes').onSnapshot(snap => {
          setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassData)));
      });

      const unsubStudents = db.collection('students').onSnapshot(snap => {
          setAllStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
      });

      const unsubTeachers = db.collection('teachers').onSnapshot(snap => {
          setTeachers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher)));
          setLoading(false);
      });

      return () => { unsubClasses(); unsubStudents(); unsubTeachers(); };
  }, []);

  const handleOpenDetail = (cls: ClassData) => {
      setSelectedClass(cls);
      setEditDetail({ ...cls });
      setView('detail');
  };

  const handleDeleteClass = async (e: React.MouseEvent, cls: ClassData) => {
      e.stopPropagation(); // Mencegah pemicu handleOpenDetail
      
      if (!cls.id) return;

      const confirmDelete = window.confirm(
          `Hapus kelas ${cls.name}?\n\nTindakan ini tidak akan menghapus data siswa, namun hubungan wali kelas akan terputus.`
      );

      if (confirmDelete) {
          const toastId = toast.loading(`Menghapus kelas ${cls.name}...`);
          try {
              await deleteClass(cls.id);
              if (isMockMode) {
                  setClasses(prev => prev.filter(c => c.id !== cls.id));
              }
              toast.success("Kelas berhasil dihapus.", { id: toastId });
          } catch (err) {
              console.error(err);
              toast.error("Gagal menghapus kelas.", { id: toastId });
          }
      }
  };

  const handleSaveDetail = async () => {
      if (!selectedClass) return;
      
      setSaving(true);
      try {
          const teacherName = teachers.find(t => t.id === editDetail.teacherId)?.name || '';
          const captainName = allStudents.find(s => s.id === editDetail.captainId)?.namaLengkap || '';

          if (!isMockMode && db) {
              await db.collection('classes').doc(selectedClass.id).update({
                  ...editDetail,
                  teacherName,
                  captainName
              });
          } else {
              await new Promise(r => setTimeout(r, 800));
          }
          
          toast.success("DATA KELAS BERHASIL DIPERBARUI");
          setView('list');
      } catch (e) {
          toast.error("GAGAL MENYIMPAN DATA");
      } finally {
          setSaving(false);
      }
  };

  const classStudents = useMemo(() => {
      if (!selectedClass) return [];
      return allStudents.filter(s => s.tingkatRombel === selectedClass.name);
  }, [selectedClass, allStudents]);

  const canManage = userRole === UserRole.ADMIN || userRole === UserRole.DEVELOPER;

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#020617] overflow-hidden transition-colors duration-500">
      
      {/* --- STICKY HEADER --- */}
      <div className="bg-white/80 dark:bg-[#0B1121]/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between z-30 sticky top-0 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
              <button onClick={view === 'detail' ? () => setView('list') : onBack} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-colors">
                  <ArrowLeftIcon className="w-4 h-4" />
              </button>
              <div>
                  <h2 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] leading-tight">
                      {view === 'detail' ? `KONTROL ${selectedClass?.name}` : 'DIREKTORI KELAS'}
                  </h2>
                  <p className="text-[8px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                      MAN 1 HULU SUNGAI TENGAH
                  </p>
              </div>
          </div>
          {view === 'detail' && (
              <button 
                onClick={handleSaveDetail} 
                disabled={saving}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-90 transition-all disabled:opacity-50"
              >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <SaveIcon className="w-3 h-3" />}
                  SIMPAN
              </button>
          )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 pb-32 scrollbar-hide">
          
          {loading ? (
              <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500 opacity-20" /></div>
          ) : view === 'list' ? (
              /* --- VIEW: LIST KELAS --- */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-500">
                  {classes.map(cls => (
                      <div 
                        key={cls.id} 
                        onClick={() => handleOpenDetail(cls)}
                        className="bg-white dark:bg-[#151E32] p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                      >
                          <div className="flex justify-between items-start mb-6">
                              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-lg border border-indigo-100 dark:border-indigo-800 group-hover:scale-110 transition-transform">
                                  {cls.name.charAt(0)}
                              </div>
                              <div className="flex gap-2 items-start">
                                  <div className="text-right">
                                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Siswa Aktif</span>
                                      <p className="text-xl font-black text-slate-800 dark:text-white leading-none mt-1">{allStudents.filter(s => s.tingkatRombel === cls.name).length}</p>
                                  </div>
                                  {canManage && (
                                      <button 
                                        onClick={(e) => handleDeleteClass(e, cls)}
                                        className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-100 dark:hover:bg-rose-900/40"
                                      >
                                          <TrashIcon className="w-4 h-4" />
                                      </button>
                                  )}
                              </div>
                          </div>
                          
                          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight mb-4">{cls.name}</h3>
                          
                          <div className="space-y-2.5">
                              <div className="flex items-center gap-2.5 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                  <BriefcaseIcon className="w-3.5 h-3.5 text-indigo-500" />
                                  <div className="min-w-0">
                                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Wali Kelas</p>
                                      <p className="text-[9px] font-bold text-slate-600 dark:text-slate-300 truncate">{cls.teacherName || 'BELUM DIATUR'}</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2.5 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                  <StarIcon className="w-3.5 h-3.5 text-amber-500" />
                                  <div className="min-w-0">
                                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Ketua Kelas</p>
                                      <p className="text-[9px] font-bold text-slate-600 dark:text-slate-300 truncate">{cls.captainName || 'BELUM DIATUR'}</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  ))}
                  {canManage && (
                      <button className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-indigo-500 hover:border-indigo-500 transition-all group bg-white/50 dark:bg-white/5">
                          <PlusIcon className="w-10 h-10 group-hover:scale-110 transition-transform" />
                          <span className="text-[9px] font-black uppercase tracking-[0.2em]">TAMBAH ROMBEL</span>
                      </button>
                  )}
              </div>
          ) : (
              /* --- VIEW: DETAIL MANAJEMEN KELAS --- */
              <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* Tab Navigation (Nav-Style) */}
                  <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full border border-slate-200 dark:border-slate-700">
                      <button onClick={() => setActiveTab('personalia')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'personalia' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400'}`}>Personalia</button>
                      <button onClick={() => setActiveTab('students')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'students' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400'}`}>Siswa</button>
                      <button onClick={() => setActiveTab('subjects')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'subjects' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400'}`}>Mapel</button>
                  </div>

                  {activeTab === 'personalia' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white dark:bg-[#151E32] p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                  <BriefcaseIcon className="w-4 h-4 text-indigo-500" /> WALI KELAS
                              </h4>
                              <div className="relative group">
                                  <select 
                                    value={editDetail.teacherId || ''} 
                                    onChange={e => setEditDetail({...editDetail, teacherId: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-[11px] font-black text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none cursor-pointer uppercase transition-all"
                                  >
                                      <option value="">-- PILIH GURU --</option>
                                      {teachers.map(t => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}
                                  </select>
                                  <ChevronDownIcon className="absolute right-4 top-4.5 w-4 h-4 text-slate-400 pointer-events-none" />
                              </div>
                              <p className="text-[8px] text-slate-400 font-bold uppercase italic">Guru terpilih akan bertanggung jawab atas administrasi kelas ini.</p>
                          </div>

                          <div className="bg-white dark:bg-[#151E32] p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                  <StarIcon className="w-4 h-4 text-amber-500" /> KETUA KELAS
                              </h4>
                              <div className="relative group">
                                  <select 
                                    value={editDetail.captainId || ''} 
                                    onChange={e => setEditDetail({...editDetail, captainId: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-[11px] font-black text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none cursor-pointer uppercase transition-all"
                                  >
                                      <option value="">-- PILIH SISWA --</option>
                                      {classStudents.map(s => <option key={s.id} value={s.id}>{s.namaLengkap.toUpperCase()}</option>)}
                                  </select>
                                  <ChevronDownIcon className="absolute right-4 top-4.5 w-4 h-4 text-slate-400 pointer-events-none" />
                              </div>
                              <p className="text-[8px] text-slate-400 font-bold uppercase italic">Daftar siswa di atas difilter otomatis berdasarkan data Rombel.</p>
                          </div>
                      </div>
                  )}

                  {activeTab === 'students' && (
                      <div className="space-y-3">
                          <div className="flex justify-between items-center px-1">
                              <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">DAFTAR PESERTA DIDIK ({classStudents.length})</h3>
                              <button className="text-[8px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800 active:scale-95 transition-all">
                                  <PlusIcon className="w-3 h-3" /> TAMBAH SISWA
                              </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {classStudents.map(s => (
                                  <div key={s.id} className="bg-white dark:bg-[#151E32] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:shadow-md transition-all">
                                      <div className="flex items-center gap-3">
                                          <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-black text-[10px] border border-slate-100 dark:border-slate-700">{s.namaLengkap.charAt(0)}</div>
                                          <div className="min-w-0">
                                              <p className="font-black text-slate-800 dark:text-white text-[10px] uppercase truncate">{s.namaLengkap}</p>
                                              <p className="text-[8px] text-slate-400 font-mono tracking-tighter font-bold uppercase">{s.nisn}</p>
                                          </div>
                                      </div>
                                      {s.id === editDetail.captainId && (
                                          <div className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[7px] font-black uppercase rounded-md border border-amber-100 dark:border-amber-800">KETUA</div>
                                      )}
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {activeTab === 'subjects' && (
                      <div className="space-y-4">
                          <div className="flex justify-between items-center px-1">
                              <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">KURIKULUM & MAPEL</h3>
                              <button 
                                onClick={() => {
                                    const sub = prompt("MASUKKAN NAMA MATA PELAJARAN:");
                                    if (sub) setEditDetail({...editDetail, subjects: [...(editDetail.subjects || []), sub]});
                                }}
                                className="text-[8px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800 active:scale-95 transition-all"
                              >
                                  <PlusIcon className="w-3 h-3" /> TAMBAH MAPEL
                              </button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {(editDetail.subjects || []).map((sub, idx) => (
                                  <div key={idx} className="bg-white dark:bg-[#151E32] p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-3 text-center relative group hover:shadow-lg transition-all">
                                      <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-800 group-hover:rotate-12 transition-transform">
                                          <BookOpenIcon className="w-6 h-6" />
                                      </div>
                                      <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-tight">{sub}</p>
                                      <button 
                                        onClick={() => setEditDetail({...editDetail, subjects: editDetail.subjects?.filter((_, i) => i !== idx)})}
                                        className="absolute top-3 right-3 p-1.5 bg-red-50 dark:bg-red-900/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                          <TrashIcon className="w-3.5 h-3.5 text-red-500" />
                                      </button>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

              </div>
          )}
      </div>
    </div>
  );
};

export default ClassList;