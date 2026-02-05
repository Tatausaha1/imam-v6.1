
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import Layout from './Layout';
import { 
  CalendarIcon, ClockIcon, BuildingLibraryIcon, Loader2, 
  RectangleStackIcon, ChevronDownIcon,
  SparklesIcon, BookOpenIcon, CogIcon, StarIcon,
  CheckCircleIcon, InfoIcon, ArrowRightIcon,
  BriefcaseIcon, AcademicCapIcon, ChartBarIcon,
  ShieldCheckIcon, ArrowLeftIcon, PlusIcon
} from './Icons';
import { db, isMockMode } from '../services/firebase';
import { toast } from 'sonner';

interface ScheduleProps {
  onBack: () => void;
}

type SubView = 'dashboard' | 'calendar' | 'timetable' | 'workhours' | 'jjm' | 'models' | 'curriculum';

const Schedule: React.FC<ScheduleProps> = ({ onBack }) => {
  const [view, setView] = useState<SubView>('dashboard');
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [semester, setSemester] = useState<'Gasal' | 'Genap'>('Gasal');
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    if (isMockMode) {
      setClasses([
        { id: '1', name: 'X IPA 1' },
        { id: '2', name: 'XI IPS 1' },
        { id: '3', name: 'XII AGAMA 1' }
      ]);
      return;
    }
    if (db) {
      db.collection('classes').get().then(snap => {
        setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  }, []);

  const renderDashboard = () => (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* PILAR 1: KALENDER AKADEMIK */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                <CalendarIcon className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Kalender Akademik</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MenuTile 
                title="Lihat Kalender Akademik" 
                desc="Agenda pendidikan & hari libur" 
                icon={CalendarIcon} 
                color="emerald" 
                onClick={() => setView('calendar')} 
            />
            <MenuTile 
                title="Lihat Jam Kerja" 
                desc="Jam operasional & shift pegawai" 
                icon={ClockIcon} 
                color="emerald" 
                onClick={() => setView('workhours')} 
            />
        </div>
      </section>

      {/* PILAR 2: JADWAL KELAS */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                <BookOpenIcon className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Jadwal Kelas</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MenuTile 
                title="Lihat Jadwal Mingguan" 
                desc="Dasbor jadwal KBM per rombel" 
                icon={RectangleStackIcon} 
                color="indigo" 
                onClick={() => setView('timetable')} 
            />
            <MenuTile 
                title="Ekuivalensi Pembelajaran" 
                desc="Edit beban kerja guru & pembimbingan" 
                icon={BriefcaseIcon} 
                color="indigo" 
                onClick={() => setView('jjm')} 
            />
            <MenuTile 
                title="Edit JJM Guru BK/TIK" 
                desc="Kelola jam mengajar khusus" 
                icon={AcademicCapIcon} 
                color="indigo" 
                onClick={() => setView('jjm')} 
            />
        </div>
      </section>

      {/* PILAR 3: PENGATURAN */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center text-violet-600">
                <CogIcon className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Pengaturan</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MenuTile 
                title="Kelola Model Jadwal" 
                desc="Template durasi sesi & jam istirahat" 
                icon={ChartBarIcon} 
                color="violet" 
                onClick={() => setView('models')} 
            />
            <MenuTile 
                title="Kelola Kurikulum Tingkat" 
                desc="Struktur kurikulum per jenjang" 
                icon={ShieldCheckIcon} 
                color="violet" 
                onClick={() => setView('curriculum')} 
            />
        </div>
      </section>

      <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 text-center opacity-60">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
              Seluruh perubahan pada modul jadwal akan berdampak <br/>langsung pada Jurnal Harian Guru dan Lensa Presensi.
          </p>
      </div>
    </div>
  );

  const renderTimetable = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        {/* Header Rombel */}
        <div className="bg-white dark:bg-[#151E32] p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Jadwal Kelas Mingguan</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Dasbor Jadwal Kelas</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Tahun Ajaran</span>
                    <span className="text-xl font-black text-indigo-600">2025 / 2026</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Kelas</label>
                    <div className="relative">
                        <select 
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-5 pr-10 text-xs font-black text-slate-800 dark:text-white outline-none appearance-none cursor-pointer shadow-inner"
                        >
                            <option value="">-- PILIH KELAS TERHUBUNG --</option>
                            {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                        <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Semester Aktif</label>
                    <div className="flex p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
                        <button 
                            onClick={() => setSemester('Gasal')}
                            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${semester === 'Gasal' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md ring-1 ring-black/5' : 'text-slate-400'}`}
                        >Semester I (Gasal)</button>
                        <button 
                            onClick={() => setSemester('Genap')}
                            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${semester === 'Genap' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md ring-1 ring-black/5' : 'text-slate-400'}`}
                        >Semester II (Genap)</button>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between p-5 bg-indigo-50 dark:bg-indigo-900/10 rounded-[2rem] border border-indigo-100 dark:border-indigo-800/50">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                        <ShieldCheckIcon className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Kurikulum Terdeteksi</p>
                        <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase">Kurikulum Merdeka v2</p>
                    </div>
                </div>
                <button onClick={() => setView('models')} className="p-3 rounded-xl bg-white dark:bg-slate-800 text-indigo-600 shadow-sm border border-indigo-100 dark:border-slate-700 active:scale-90 transition-all">
                    <CogIcon className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* Empty State / Prompt */}
        <div className="py-20 text-center bg-white dark:bg-[#151E32] rounded-[4rem] border border-dashed border-slate-200 dark:border-slate-800 shadow-inner">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-sm border border-slate-100 dark:border-slate-800">
                <RectangleStackIcon className="w-10 h-10 text-slate-300" />
            </div>
            <div className="max-w-sm mx-auto space-y-4 px-8">
                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase">Konfigurasi Model Diperlukan</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    Silakan pilih Model (Template) Jadwal Kelas Mingguan. <br/>
                    Klik pada tombol pengaturaan model jadwal untuk memilih Model.
                </p>
            </div>
            <button onClick={() => setView('models')} className="mt-10 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">
                PILIH MODEL JADWAL
            </button>
        </div>
    </div>
  );

  return (
    <Layout 
        title={view === 'dashboard' ? 'Jadwal Dasbor' : view === 'timetable' ? 'Jadwal Mingguan' : 'Jadwal Sistem'} 
        subtitle={view === 'dashboard' ? 'Arsitektur Modular v2.1' : 'Kembali ke Dasbor'} 
        icon={CalendarIcon} 
        onBack={view === 'dashboard' ? onBack : () => setView('dashboard')}
    >
      <div className="p-5 lg:p-8 pb-32 max-w-5xl mx-auto w-full">
        {view === 'dashboard' && renderDashboard()}
        {view === 'timetable' && renderTimetable()}
        
        {/* Placeholder Views for other tiles */}
        {['calendar', 'workhours', 'jjm', 'models', 'curriculum'].includes(view) && view !== 'timetable' && (
             <div className="py-32 text-center animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] flex items-center justify-center mx-auto mb-8 shadow-inner border border-slate-100 dark:border-slate-800">
                    <Loader2 className="w-10 h-10 text-indigo-500 opacity-20 animate-spin" />
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Memuat Modul {view.toUpperCase()}</h3>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.2em] mt-2 px-8">Sinkronisasi Basis Data Enterprise...</p>
                <button onClick={() => setView('dashboard')} className="mt-12 flex items-center gap-2 mx-auto text-indigo-600 font-black text-[10px] uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-6 py-3 rounded-xl">
                    <ArrowLeftIcon className="w-4 h-4"/> Kembali
                </button>
            </div>
        )}
      </div>
    </Layout>
  );
};

const MenuTile = ({ title, desc, icon: Icon, color, onClick }: any) => {
    const colors: Record<string, string> = {
        emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
        indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
        violet: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
    };
    return (
        <button 
            onClick={onClick}
            className="bg-white dark:bg-[#151E32] p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm text-left flex items-center gap-6 group hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95"
        >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${colors[color]}`}>
                <Icon className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-tight leading-none mb-1.5">{title}</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase truncate tracking-wider">{desc}</p>
            </div>
            <ArrowRightIcon className="w-4 h-4 text-slate-200 group-hover:text-indigo-500 transition-colors" />
        </button>
    );
};

export default Schedule;
