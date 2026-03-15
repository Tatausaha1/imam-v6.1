
import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import { 
    AcademicCapIcon, PlusIcon, CalendarIcon, UserIcon, 
    ArrowRightIcon, CheckCircleIcon, ArrowTrendingUpIcon, 
    ClockIcon, CalendarDaysIcon, BuildingLibraryIcon, Loader2,
    ShieldCheckIcon, BriefcaseIcon, SparklesIcon, ChartBarIcon
} from './Icons';
import { UserRole, Assignment } from '../types';
import { getAssignments, addAssignment } from '../services/academicService';
import { auth, db, isMockMode } from '../services/firebase';
import { toast } from 'sonner';

interface AssignmentsProps {
  onBack: () => void;
  userRole: UserRole;
}

const Assignments: React.FC<AssignmentsProps> = ({ onBack, userRole }) => {
  const monitoredClass = '10 A';
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tugas' | 'agenda'>('tugas');
  const [userContext, setUserContext] = useState<{class?: string, name?: string}>({});

  // Role grouping
  const isSiswa = userRole === UserRole.SISWA;
  const isGuru = userRole === UserRole.GURU || userRole === UserRole.WALI_KELAS;
  const isSuperUser = [UserRole.ADMIN, UserRole.KEPALA_MADRASAH, UserRole.STAF, UserRole.DEVELOPER].includes(userRole);

  useEffect(() => {
    const init = async () => {
        setLoading(true);
        const user = auth?.currentUser;
        let targetClass = '';
        
        if (!isMockMode && user && db) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                targetClass = userData?.class || '';
                setUserContext({ class: targetClass, name: userData?.displayName });
            }
        } else {
            targetClass = 'XII IPA 1'; // Mock
            setUserContext({ class: targetClass, name: 'User Simulasi' });
        }

        try {
            // Logic Filter per Role
            let data: Assignment[] = [];
            if (isSiswa) {
                // Siswa: Filter per kelas
                data = await getAssignments(targetClass);
            } else if (isGuru) {
                // Guru: Filter buatan sendiri (Logic di service atau filter client)
                const all = await getAssignments();
                data = all.filter(a => a.teacherId === (user?.uid || 'mock-teacher-1'));
            } else if (isSuperUser) {
                // SuperUser: Monitoring fokus kelas 10 A
                data = await getAssignments(monitoredClass);
            }
            setAssignments(data);
        } catch (error) {
            toast.error("Gagal sinkronisasi tugas.");
        } finally {
            setLoading(false);
        }
    };
    init();
  }, [userRole]);

  const getPriorityBadge = (priority: string | undefined) => {
      switch (priority) {
          case 'High': return <span className="text-[6px] font-black text-white bg-rose-600 px-1.5 py-0.5 rounded-md">TINGGI</span>;
          case 'Medium': return <span className="text-[6px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md">SEDANG</span>;
          default: return <span className="text-[6px] font-black text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-md">RENDAH</span>;
      }
  };

  const getPageConfig = () => {
    if (isSiswa) return { title: `Tugas Kelas ${userContext.class}`, icon: AcademicCapIcon, label: 'Tugas Saya' };
    if (isGuru) return { title: "Manajemen Tugas", icon: BriefcaseIcon, label: 'Koleksi Saya' };
    if (isSuperUser) return { title: `Monitoring Akademik - ${monitoredClass}`, icon: ShieldCheckIcon, label: `Rombel ${monitoredClass}` };
    return { title: "Daftar Tugas", icon: AcademicCapIcon, label: 'Tugas' };
  };

  const config = getPageConfig();

  return (
    <Layout
      title="Akademik"
      subtitle={config.title}
      icon={config.icon}
      onBack={onBack}
      actions={
          isGuru && activeTab === 'tugas' && (
            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg active:scale-90 transition-all flex items-center gap-2"
            >
                <PlusIcon className="w-4 h-4" />
                <span className="text-[8px] font-black uppercase tracking-widest hidden sm:inline">Baru</span>
            </button>
          )
      }
    >
      <div className="p-3 lg:p-6 pb-32 space-y-4">
          
          {/* Dashboard Header for Admin/Kamad */}
          {isSuperUser && (
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12"><ChartBarIcon className="w-24 h-24" /></div>
                  <div className="relative z-10">
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-70">Supervisi Global</p>
                      <h3 className="text-xl font-black mt-1">{assignments.length} Tugas Aktif</h3>
                      <div className="flex gap-2 mt-4">
                          <div className="px-3 py-1 bg-white/20 rounded-lg text-[7px] font-black uppercase border border-white/10">Kelas {monitoredClass}</div>
                          <div className="px-3 py-1 bg-white/20 rounded-lg text-[7px] font-black uppercase border border-white/10">Pantauan Realtime</div>
                      </div>
                  </div>
              </div>
          )}

          {/* Tab Selector */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full border border-slate-200 dark:border-slate-700">
              <button onClick={() => setActiveTab('tugas')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'tugas' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-md' : 'text-slate-400'}`}>
                  {config.label}
              </button>
              <button onClick={() => setActiveTab('agenda')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'agenda' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-md' : 'text-slate-400'}`}>
                  Agenda Hari Ini
              </button>
          </div>

          {activeTab === 'tugas' ? (
              loading ? <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 opacity-20" /></div> : (
              <div className="grid grid-cols-1 gap-3">
                  {assignments.map((assignment) => (
                      <div key={assignment.id} className="bg-white dark:bg-[#151E32] p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group transition-all hover:border-indigo-200">
                          <div className={`absolute top-0 left-0 w-1 h-full ${assignment.priority === 'High' ? 'bg-rose-500' : 'bg-indigo-500'}`}></div>
                          
                          <div className="flex justify-between items-start mb-3 pl-2">
                              <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                      <span className="text-[6px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded uppercase tracking-tighter">{assignment.subject}</span>
                                      {getPriorityBadge(assignment.priority)}
                                      {isSuperUser && (
                                          <span className="text-[6px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">{assignment.className}</span>
                                      )}
                                  </div>
                                  <h3 className="font-black text-slate-800 dark:text-white text-[12px] truncate uppercase tracking-tight leading-none">{assignment.title}</h3>
                              </div>
                              <div className="flex flex-col items-end shrink-0 ml-2">
                                  <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Deadline</span>
                                  <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md mt-0.5 border border-rose-100 uppercase">
                                      {new Date(assignment.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                  </span>
                              </div>
                          </div>

                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed pl-2 mb-4 font-medium italic">"{assignment.description}"</p>
                          
                          <div className="flex items-center justify-between pl-2 pt-3 border-t border-slate-50 dark:border-slate-800/50">
                              <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                                      <UserIcon className="w-3 h-3 text-slate-400" />
                                  </div>
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[120px]">{assignment.teacherName}</span>
                              </div>
                              <div className="flex items-center gap-1 text-indigo-600 group-hover:translate-x-1 transition-transform">
                                  <span className="text-[8px] font-black uppercase">Detail</span>
                                  <ArrowRightIcon className="w-3.5 h-3.5" />
                              </div>
                          </div>
                      </div>
                  ))}
                  {assignments.length === 0 && (
                    <div className="text-center py-16 bg-white dark:bg-[#151E32] rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 opacity-60">
                        <AcademicCapIcon className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Belum Ada Daftar Tugas</p>
                    </div>
                  )}
              </div>
              )
          ) : (
             <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="px-1"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kalender Harian</p></div>
                  <div className="p-5 bg-white dark:bg-[#151E32] rounded-[2.2rem] border border-indigo-50 dark:border-indigo-900/30 shadow-sm flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 flex flex-col items-center justify-center shrink-0 border border-indigo-100 shadow-inner">
                          <span className="text-[11px] font-black">07:30</span>
                          <div className="w-4 h-[1px] bg-indigo-200 my-1"></div>
                          <span className="text-[8px] font-bold opacity-60">WIB</span>
                      </div>
                      <div className="flex-1 min-w-0">
                          <h4 className="font-black text-slate-800 dark:text-white text-[12px] truncate uppercase">KBM Reguler</h4>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-1">Sesuai Kalender Akademik 2025</p>
                      </div>
                      <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                  </div>
             </div>
          )}
      </div>
    </Layout>
  );
};

export default Assignments;
