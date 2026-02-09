
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import { 
  CalendarIcon, ClockIcon, Loader2, 
  RectangleStackIcon, ChevronDownIcon,
  CogIcon, BriefcaseIcon, ChartBarIcon,
  ShieldCheckIcon, ArrowLeftIcon, 
  SaveIcon, HeartIcon, ArrowRightIcon
} from './Icons';
import { db, isMockMode } from '../services/firebase';
import { toast } from 'sonner';

interface ScheduleProps {
  onBack: () => void;
}

type SubView = 'dashboard' | 'timetable' | 'session_config' | 'loading';

interface SessionConfig {
    workingDays: number[];
    masukLimit: string;
    duhaStart: string;
    duhaEnd: string;
    zuhurStart: string;
    zuhurEnd: string;
    asharStart: string;
    asharEnd: string;
    pulangLimit: string;
    pulangLimitJumat: string;
}

const Schedule: React.FC<ScheduleProps> = ({ onBack }) => {
  const [view, setView] = useState<SubView>('dashboard');
  const [saving, setSaving] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [activeYearDocId, setActiveYearDocId] = useState<string | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>({
      workingDays: [1, 2, 3, 4, 5],
      masukLimit: '07:30',
      duhaStart: '07:31',
      duhaEnd: '10:00',
      zuhurStart: '12:00',
      zuhurEnd: '14:00',
      asharStart: '15:30',
      asharEnd: '16:30',
      pulangLimit: '16:00',
      pulangLimitJumat: '11:30'
  });

  useEffect(() => {
    if (isMockMode) {
      setClasses([{ id: '1', name: 'X IPA 1' }]);
      return;
    }
    if (db) {
      db.collection('classes').get().then(snap => setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      
      // Ambil tahun ajaran yang aktif untuk mendapatkan config
      db.collection('academic_years').where('isActive', '==', true).limit(1).get().then(snap => {
          if (!snap.empty) {
              const doc = snap.docs[0];
              setActiveYearDocId(doc.id);
              const data = doc.data();
              if (data.config) {
                  setSessionConfig(prev => ({ ...prev, ...data.config }));
              }
          }
      });
    }
  }, []);

  const toggleWorkingDay = (day: number) => {
    setSessionConfig(prev => {
        const current = [...prev.workingDays];
        if (current.includes(day)) {
            return { ...prev, workingDays: current.filter(d => d !== day) };
        } else {
            return { ...prev, workingDays: [...current, day].sort() };
        }
    });
  };

  const handleSaveSessions = async () => {
      if (!activeYearDocId) {
          toast.error("Tidak ada Tahun Ajaran aktif yang ditemukan.");
          return;
      }
      setSaving(true);
      const toastId = toast.loading("Sinkronisasi Sesi ke Tahun Ajaran Aktif...");
      try {
          if (!isMockMode && db) {
              await db.collection('academic_years').doc(activeYearDocId).set({
                  config: sessionConfig
              }, { merge: true });
          }
          toast.success("Konfigurasi Jadwal Global Diperbarui.", { id: toastId });
          setView('dashboard');
      } catch (e: any) {
          toast.error("Gagal menyimpan: " + e.message, { id: toastId });
      } finally {
          setSaving(false);
      }
  };

  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  const renderDashboard = () => (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600"><ClockIcon className="w-4.5 h-4.5" /></div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Pengaturan Sesi</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MenuTile title="Jam Sesi & Hari Aktif" desc="Window waktu scan & kalender efektif" icon={ClockIcon} color="indigo" onClick={() => setView('session_config')} />
            <MenuTile title="Lihat Jadwal Mingguan" desc="Dasbor jadwal KBM per rombel" icon={RectangleStackIcon} color="indigo" onClick={() => setView('timetable')} />
        </div>
      </section>

      <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 text-center opacity-60">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
              Konfigurasi ini bertindak sebagai Master Kernel untuk validasi presensi harian <br/>yang disimpan langsung di dokumen Tahun Ajaran aktif.
          </p>
      </div>
    </div>
  );

  const renderSessionConfig = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-[#151E32] p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600"><ClockIcon className="w-6 h-6" /></div>
                <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Konfigurasi Jam Sesi</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Referensikan ke Tahun Ajaran Aktif</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-4">
                        <CalendarIcon className="w-4 h-4 text-indigo-500" />
                        <h4 className="text-[11px] font-black uppercase text-indigo-600 tracking-wider">Kalender Efektif (Hari Kerja)</h4>
                    </div>
                    <div className="flex justify-between gap-2">
                        {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                            <button 
                                key={day}
                                type="button"
                                onClick={() => toggleWorkingDay(day)}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all border-2 ${
                                    sessionConfig.workingDays.includes(day)
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                                }`}
                            >
                                {dayNames[day]}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-white dark:bg-[#151E32] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <ArrowRightIcon className="w-4 h-4 text-emerald-500 rotate-180" />
                        <h4 className="text-[11px] font-black uppercase text-emerald-600 tracking-wider">Batas Sesi Masuk</h4>
                    </div>
                    <input type="time" value={sessionConfig.masukLimit} onChange={e => setSessionConfig({...sessionConfig, masukLimit: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 px-5 text-sm font-black" />
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-4">
                        <HeartIcon className="w-4 h-4 text-rose-500" />
                        <h4 className="text-[11px] font-black uppercase text-rose-600 tracking-wider">Window Sesi Ibadah</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Duha Mulai</label><input type="time" value={sessionConfig.duhaStart} onChange={e => setSessionConfig({...sessionConfig, duhaStart: e.target.value})} className="w-full bg-white dark:bg-slate-800 border-slate-200 rounded-xl py-2 px-3 text-xs font-black" /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Duha Selesai</label><input type="time" value={sessionConfig.duhaEnd} onChange={e => setSessionConfig({...sessionConfig, duhaEnd: e.target.value})} className="w-full bg-white dark:bg-slate-800 border-slate-200 rounded-xl py-2 px-3 text-xs font-black" /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Zuhur Mulai</label><input type="time" value={sessionConfig.zuhurStart} onChange={e => setSessionConfig({...sessionConfig, zuhurStart: e.target.value})} className="w-full bg-white dark:bg-slate-800 border-slate-200 rounded-xl py-2 px-3 text-xs font-black" /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Zuhur Selesai</label><input type="time" value={sessionConfig.zuhurEnd} onChange={e => setSessionConfig({...sessionConfig, zuhurEnd: e.target.value})} className="w-full bg-white dark:bg-slate-800 border-slate-200 rounded-xl py-2 px-3 text-xs font-black" /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Ashar Mulai</label><input type="time" value={sessionConfig.asharStart} onChange={e => setSessionConfig({...sessionConfig, asharStart: e.target.value})} className="w-full bg-white dark:bg-slate-800 border-slate-200 rounded-xl py-2 px-3 text-xs font-black" /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Ashar Selesai</label><input type="time" value={sessionConfig.asharEnd} onChange={e => setSessionConfig({...sessionConfig, asharEnd: e.target.value})} className="w-full bg-white dark:bg-slate-800 border-slate-200 rounded-xl py-2 px-3 text-xs font-black" /></div>
                    </div>
                </div>

                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-800/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <ArrowRightIcon className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-[11px] font-black uppercase text-indigo-700 dark:text-indigo-300 tracking-wider">Batas Sesi Pulang</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Senin - Kamis</label><input type="time" value={sessionConfig.pulangLimit} onChange={e => setSessionConfig({...sessionConfig, pulangLimit: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-black" /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black text-indigo-500 uppercase tracking-widest ml-1">Khusus Jumat</label><input type="time" value={sessionConfig.pulangLimitJumat} onChange={e => setSessionConfig({...sessionConfig, pulangLimitJumat: e.target.value})} className="w-full bg-white dark:bg-slate-900 border-2 border-indigo-200 rounded-xl py-2.5 px-4 text-xs font-black text-indigo-600" /></div>
                    </div>
                </div>
            </div>

            <div className="pt-4 flex gap-4">
                <button onClick={() => setView('dashboard')} className="flex-1 py-4 rounded-[1.8rem] bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Batal</button>
                <button onClick={handleSaveSessions} disabled={saving} className="flex-[2] py-4 rounded-[1.8rem] bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <SaveIcon className="w-5 h-5" />} SIMPAN KE TAHUN AJARAN
                </button>
            </div>
        </div>
    </div>
  );

  return (
    <Layout title="Jadwal Sistem" subtitle={view === 'dashboard' ? 'Arsitektur Modular' : 'Konfigurasi Sesi'} icon={CalendarIcon} onBack={view === 'dashboard' ? onBack : () => setView('dashboard')}>
      <div className="p-5 lg:p-8 pb-32 max-w-5xl mx-auto w-full">
        {view === 'dashboard' && renderDashboard()}
        {view === 'session_config' && renderSessionConfig()}
        {view === 'timetable' && (
             <div className="py-20 text-center animate-in zoom-in">
                <RectangleStackIcon className="w-16 h-16 mx-auto mb-4 text-indigo-200" />
                <h4 className="text-sm font-black uppercase text-slate-400">Pilih Model Jadwal di Menu Developer</h4>
                <button onClick={() => setView('dashboard')} className="mt-6 text-indigo-600 font-black text-[10px] uppercase tracking-widest">Kembali</button>
             </div>
        )}
      </div>
    </Layout>
  );
};

const MenuTile = ({ title, desc, icon: Icon, color, onClick }: any) => {
    const colors: Record<string, string> = {
        indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
    };
    return (
        <button onClick={onClick} className="bg-white dark:bg-[#151E32] p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm text-left flex items-center gap-6 group hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${colors[color]}`}><Icon className="w-7 h-7" /></div>
            <div className="flex-1 min-w-0"><h4 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-tight leading-none mb-1.5">{title}</h4><p className="text-[9px] font-bold text-slate-400 uppercase truncate tracking-wider">{desc}</p></div>
            <ArrowRightIcon className="w-4 h-4 text-slate-200 group-hover:text-indigo-500 transition-colors" />
        </button>
    );
};

export default Schedule;
