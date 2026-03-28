/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import Layout from './Layout';
import {
  ChartBarIcon, Loader2, Search,
  CalendarIcon, ArrowDownTrayIcon, BuildingLibraryIcon, ChevronDownIcon, UsersIcon
} from './Icons';
import { db, isMockMode } from '../services/firebase';
import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { id as localeID } from 'date-fns/locale/id';
import { format } from 'date-fns';
import { Student, UserRole, ViewState, ClassData } from '../types';
import { toast } from 'sonner';

const Reports: React.FC<{ onBack: () => void, onNavigate: (v: ViewState) => void, userRole: UserRole }> = ({ onBack, onNavigate, userRole }) => {
  const [reportMode, setReportMode] = useState<'harian' | 'bulanan'>('harian');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(localStorage.getItem('imam_pending_report_class') || '');
  const [filterNama, setFilterNama] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const LIMITS = { masuk: '07:30', pulang: '16:00' };

  useEffect(() => {
    const loadClasses = async () => {
      if (db || isMockMode) {
        let classesData: ClassData[] = isMockMode ? [{ id: '1', name: 'XII IPA 1', level: '12', academicYear: '2025' }] : [];
        if (!isMockMode) {
          const cSnap = await db!.collection('classes').get();
          classesData = cSnap.docs.map(d => ({ id: d.id, ...d.data() } as ClassData));
        }
        setClasses(classesData);
        if (!selectedClassFilter && classesData.length > 0) setSelectedClassFilter(classesData[0].name);
      }
    };
    loadClasses();
    return () => { localStorage.removeItem('imam_pending_report_class'); };
  }, []);

  useEffect(() => {
    if (!selectedClassFilter) return;
    setLoading(true);

    const load = async () => {
      try {
        if (isMockMode) {
          await new Promise(r => setTimeout(r, 500));
          setStudents([
            { id: 's1', namaLengkap: 'ADELIA SRI SUNDARI', tingkatRombel: selectedClassFilter, status: 'Aktif', idUnik: '25002', nisn: '0086806447', jenisKelamin: 'Perempuan', isClaimed: true } as any,
            { id: 's2', namaLengkap: 'AHMAD FAJAR', tingkatRombel: selectedClassFilter, status: 'Aktif', idUnik: '25003', nisn: '0086806448', jenisKelamin: 'Laki-laki', isClaimed: true } as any,
          ]);

          if (reportMode === 'harian') {
            setAttendanceRecords([
              { studentId: 's1', checkIn: '07:35', checkOut: '15:55', status: 'Hadir' },
              { studentId: 's2', checkIn: null, checkOut: null, status: 'Alpha' },
            ]);
          } else {
            setAttendanceRecords([
              { studentId: 's1', date: `${selectedMonth}-01`, status: 'Hadir' },
              { studentId: 's1', date: `${selectedMonth}-02`, status: 'Hadir' },
              { studentId: 's1', date: `${selectedMonth}-03`, status: 'Izin' },
              { studentId: 's2', date: `${selectedMonth}-01`, status: 'Alpha' },
              { studentId: 's2', date: `${selectedMonth}-02`, status: 'Hadir' },
            ]);
          }
          return;
        }

        const sSnap = await db!.collection('students').where('status', '==', 'Aktif').where('tingkatRombel', '==', selectedClassFilter).get();
        const mappedStudents = sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
        setStudents(mappedStudents);

        const studentIds = new Set(sSnap.docs.map(d => d.id));
        let aSnap: any;
        if (reportMode === 'harian') {
          aSnap = await db!.collection('attendance').where('date', '==', selectedDate).get();
        } else {
          const monthStart = `${selectedMonth}-01`;
          const monthEnd = `${selectedMonth}-31`;
          aSnap = await db!.collection('attendance').where('date', '>=', monthStart).where('date', '<=', monthEnd).get();
        }

        setAttendanceRecords(aSnap.docs.map(d => d.data()).filter((att: any) => studentIds.has(att.studentId)));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedDate, selectedMonth, selectedClassFilter, reportMode]);

  const calculateDiff = (timeStr: string | null, limitStr: string, type: 'masuk' | 'pulang') => {
    if (!timeStr) return null;
    const cleanTime = timeStr.split(' | ')[0];
    const [h, m] = cleanTime.split(':').map(Number);
    const [lh, lm] = limitStr.split(':').map(Number);
    const diff = (h * 60 + m) - (lh * 60 + lm);
    if (type === 'masuk' && diff > 0) return <span className="text-[7px] font-black text-amber-500 block">+{diff}m</span>;
    if (type === 'pulang' && diff < 0) return <span className="text-[7px] font-black text-rose-500 block">{diff}m</span>;
    return null;
  };

  const displayData = useMemo(() => {
    const attMap = new Map<string, any>(attendanceRecords.map(r => [r.studentId, r]));
    return students
      .filter(s => {
        const q = filterNama.toLowerCase().trim();
        return q === '' || (s.namaLengkap || '').toLowerCase().includes(q) || String(s.idUnik || '').includes(q);
      })
      .map(s => ({ ...s, att: attMap.get(s.id!) || { status: 'Alpha' } }));
  }, [students, attendanceRecords, filterNama]);

  const monthlySummary = useMemo(() => {
    const filteredStudents = students.filter(s => {
      const q = filterNama.toLowerCase().trim();
      return q === '' || (s.namaLengkap || '').toLowerCase().includes(q) || String(s.idUnik || '').includes(q);
    });

    const grouped = new Map<string, any[]>();
    attendanceRecords.forEach((r) => {
      const list = grouped.get(r.studentId) || [];
      list.push(r);
      grouped.set(r.studentId, list);
    });

    return filteredStudents.map((s) => {
      const rows = grouped.get(s.id || '') || [];
      const hadir = rows.filter(r => r.status === 'Hadir').length;
      const haid = rows.filter(r => r.status === 'Haid').length;
      const izin = rows.filter(r => r.status === 'Izin').length;
      const sakit = rows.filter(r => r.status === 'Sakit').length;
      const alpha = rows.filter(r => r.status === 'Alpha').length;
      const total = rows.length;
      const presentRate = total > 0 ? Math.round(((hadir + haid) / total) * 100) : 0;

      return { ...s, hadir, haid, izin, sakit, alpha, total, presentRate };
    });
  }, [students, attendanceRecords, filterNama]);

  const TimeCell = ({ rawValue, type }: { rawValue: string | null, type: 'masuk' | 'pulang' }) => {
    const isHaid = String(rawValue || '').includes('| H');
    const time = rawValue ? rawValue.split(' | ')[0].substring(0, 5) : '--:--';
    return (
      <td className="px-2 py-4 text-center font-mono">
        <span className={`text-[10px] font-black ${isHaid ? 'text-rose-400' : 'text-slate-400'}`}>
          {isHaid ? 'HAID' : time}
        </span>
        {!isHaid && type === 'masuk' && calculateDiff(rawValue, LIMITS.masuk, 'masuk')}
        {!isHaid && type === 'pulang' && calculateDiff(rawValue, LIMITS.pulang, 'pulang')}
      </td>
    );
  };

  return (
    <Layout
      title="Laporan Kelas"
      subtitle={selectedClassFilter ? `Monitor Rombel ${selectedClassFilter}` : 'Memuat...'}
      icon={ChartBarIcon}
      onBack={onBack}
      actions={<button onClick={() => toast.info('Fitur export segera hadir')} className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-lg active:scale-90 transition-all"><ArrowDownTrayIcon className="w-5 h-5" /></button>}
    >
      <div className="p-4 lg:p-6 space-y-5 pb-32">
        <div className="bg-white dark:bg-[#151E32] p-5 rounded-[2.2rem] shadow-sm space-y-4 border border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-1 bg-slate-50 dark:bg-slate-900 rounded-2xl flex">
              <button onClick={() => setReportMode('harian')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase ${reportMode === 'harian' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Harian</button>
              <button onClick={() => setReportMode('bulanan')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase ${reportMode === 'bulanan' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Bulanan</button>
            </div>

            <div className="relative">
              <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              {reportMode === 'harian' ? (
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full pl-11 py-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-[11px] font-black outline-none" />
              ) : (
                <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full pl-11 py-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-[11px] font-black outline-none" />
              )}
            </div>

            <div className="relative">
              <BuildingLibraryIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select value={selectedClassFilter} onChange={e => setSelectedClassFilter(e.target.value)} className="w-full pl-11 py-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-[11px] font-black outline-none appearance-none cursor-pointer">
                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input type="text" placeholder="CARI NAMA SISWA..." value={filterNama} onChange={e => setFilterNama(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-[10px] font-bold outline-none shadow-inner" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B1121] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto custom-scrollbar">
            {reportMode === 'harian' ? (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b">
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-5 w-12 text-center">#</th>
                    <th className="px-4 py-5 min-w-[160px]">Siswa</th>
                    <th className="px-2 py-5 text-center">Masuk</th>
                    <th className="px-2 py-5 text-center">Pulang</th>
                    <th className="px-6 py-5 text-center w-24">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {loading ? (
                    <tr><td colSpan={5} className="py-24 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 opacity-30" /></td></tr>
                  ) : displayData.length > 0 ? (
                    displayData.map((s, i) => (
                      <tr key={s.id} className="text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-center text-slate-400 font-bold">{i + 1}</td>
                        <td className="px-4 py-4"><div className="flex flex-col"><span className="font-black text-slate-700 dark:text-slate-200 uppercase truncate max-w-[150px]">{s.namaLengkap}</span><span className="text-[8px] font-mono text-indigo-500">ID: {s.idUnik}</span></div></td>
                        <TimeCell rawValue={s.att.checkIn} type="masuk" />
                        <TimeCell rawValue={s.att.checkOut} type="pulang" />
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                            s.att.status === 'Alpha' ? 'bg-rose-50 text-rose-600' :
                            s.att.status === 'Haid' ? 'bg-pink-50 text-pink-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {s.att.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-32 text-center opacity-30">
                        <div className="flex flex-col items-center gap-4">
                          <UsersIcon className="w-12 h-12" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Tidak ada data di rombel ini</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b">
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-5">Siswa</th>
                    <th className="px-3 py-5 text-center">Hadir</th>
                    <th className="px-3 py-5 text-center">Haid</th>
                    <th className="px-3 py-5 text-center">Izin</th>
                    <th className="px-3 py-5 text-center">Sakit</th>
                    <th className="px-3 py-5 text-center">Alpha</th>
                    <th className="px-4 py-5 text-center">% Hadir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {loading ? (
                    <tr><td colSpan={7} className="py-24 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 opacity-30" /></td></tr>
                  ) : monthlySummary.length > 0 ? (
                    monthlySummary.map((s: any) => (
                      <tr key={s.id} className="text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-4"><div className="flex flex-col"><span className="font-black text-slate-700 dark:text-slate-200 uppercase truncate max-w-[150px]">{s.namaLengkap}</span><span className="text-[8px] font-mono text-indigo-500">ID: {s.idUnik}</span></div></td>
                        <td className="px-3 py-4 text-center font-black text-emerald-600">{s.hadir}</td>
                        <td className="px-3 py-4 text-center font-black text-pink-600">{s.haid}</td>
                        <td className="px-3 py-4 text-center font-black text-amber-600">{s.izin}</td>
                        <td className="px-3 py-4 text-center font-black text-sky-600">{s.sakit}</td>
                        <td className="px-3 py-4 text-center font-black text-rose-600">{s.alpha}</td>
                        <td className="px-4 py-4 text-center"><span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 font-black">{s.presentRate}%</span></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-32 text-center opacity-30">
                        <div className="flex flex-col items-center gap-4">
                          <UsersIcon className="w-12 h-12" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Tidak ada data bulanan di rombel ini</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
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

const SessionStatPill = ({ label, value }: { label: string; value: number }) => (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-1 py-2 text-center">
        <p className="text-xs font-black text-slate-800 dark:text-slate-100 leading-none">{value}</p>
        <p className="text-[7px] mt-1 font-black uppercase tracking-tight text-slate-500">{label}</p>
    </div>
);

export default Reports;
