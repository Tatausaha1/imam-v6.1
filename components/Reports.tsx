
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import Layout from './Layout';
import { 
  ChartBarIcon, Loader2, Search, 
  CalendarIcon, XCircleIcon,
  Squares2x2Icon,
  CheckCircleIcon, ClockIcon, HeartIcon,
  ArrowDownTrayIcon, BuildingLibraryIcon, UsersIcon,
  ArrowRightIcon, PhoneIcon
} from './Icons';
import { db, isMockMode } from '../services/firebase';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale/id';
import { Student, UserRole, ViewState, ClassData } from '../types';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

const Reports: React.FC<{ onBack: () => void, onNavigate: (v: ViewState) => void, userRole: UserRole }> = ({ onBack, onNavigate, userRole }) => {
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [selectedClassFilter, setSelectedClassFilter] = useState<string>('All');
    const [filterNama, setFilterNama] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDetailView, setIsDetailView] = useState(false);

    useEffect(() => {
        const loadClasses = async () => {
            if (db) {
                const cSnap = await db.collection('classes').get();
                setClasses(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as ClassData)));
            }
        };
        loadClasses();
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            if (!db) return;
            try {
                // OPTIMASI: Query difilter di server jika kelas dipilih
                let sQuery = db.collection('students').where('status', '==', 'Aktif');
                if (selectedClassFilter !== 'All') {
                    sQuery = sQuery.where('tingkatRombel', '==', selectedClassFilter);
                }
                
                const [sSnap, aSnap] = await Promise.all([
                    sQuery.get(),
                    db.collection('attendance').where('date', '==', selectedDate).get()
                ]);

                setStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
                setAttendanceRecords(aSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [selectedDate, selectedClassFilter]);

    const displayData = useMemo(() => {
        const attMap = new Map<string, any>(attendanceRecords.map(r => [r.studentId, r]));
        return students.filter(s => {
            const q = filterNama.toLowerCase().trim();
            return q === '' || (s.namaLengkap || '').toLowerCase().includes(q);
        }).map(s => ({
            ...s,
            att: attMap.get(s.id!) || { status: 'Alpha', checkIn: null, duha: null, zuhur: null, ashar: null, checkOut: null }
        }));
    }, [students, attendanceRecords, filterNama]);

    const TimeCell = ({ rawTime }: { rawTime: string | null }) => {
        const time = rawTime ? String(rawTime).split(' | ')[0].substring(0, 5) : '--:--';
        return <td className="px-2 py-3 text-center font-mono text-[10px] text-slate-500 border-r border-slate-50 dark:border-slate-800">{time}</td>;
    };

    return (
        <Layout title="Laporan" subtitle="Arsip Presensi" icon={ChartBarIcon} onBack={onBack}>
            <div className="p-4 space-y-4">
                <div className="bg-white dark:bg-[#151E32] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3">
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-bold outline-none" />
                    <select value={selectedClassFilter} onChange={e => setSelectedClassFilter(e.target.value)} className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-bold outline-none cursor-pointer">
                        <option value="All">SEMUA KELAS</option>
                        {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>

                <div className="bg-white dark:bg-[#0B1121] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                            <tr className="text-[9px] font-black text-slate-400 uppercase">
                                <th className="px-4 py-4 w-12 text-center">No</th>
                                <th className="px-4 py-4">Nama Siswa</th>
                                <th className="px-4 py-4 text-center">Masuk</th>
                                <th className="px-4 py-4 text-center">Pulang</th>
                                <th className="px-4 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 opacity-20" /></td></tr> : 
                                displayData.map((s, i) => (
                                    <tr key={s.id} className="text-[10px] hover:bg-slate-50">
                                        <td className="px-4 py-3 text-center text-slate-400">{i+1}</td>
                                        <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200 uppercase">{s.namaLengkap}</td>
                                        <TimeCell rawTime={s.att.checkIn} />
                                        <TimeCell rawTime={s.att.checkOut} />
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-[5px] text-[8px] font-black uppercase ${s.att.status === 'Alpha' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{s.att.status}</span>
                                        </td>
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
};

export default Reports;
