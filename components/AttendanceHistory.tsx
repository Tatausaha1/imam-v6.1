import React, { useState, useEffect, useMemo } from 'react';
import Layout from './Layout';
import { db, isMockMode } from '../services/firebase';
import { 
  CalendarIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  BuildingLibraryIcon,
  Search,
  ArrowPathIcon,
  PencilIcon,
  FileSpreadsheet,
  FileText,
  PrinterIcon,
  ChartBarIcon,
  ChevronDownIcon,
  // Fix: Added missing Loader2 import to resolve "Cannot find name 'Loader2'" error
  Loader2
} from './Icons';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ViewState } from '../types';

interface AttendanceHistoryProps {
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
}

interface AttendanceRecord {
    id: string;
    studentName: string;
    class: string;
    date: string;
    status: 'Hadir' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpha';
    checkIn: string | null;
    checkOut: string | null;
    duha: string | null;
    zuhur: string | null;
    ashar: string | null;
}

const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({ onBack, onNavigate }) => {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState<Partial<AttendanceRecord>>({});

  useEffect(() => {
    if (isMockMode) {
        setClasses(['X IPA 1', 'X IPA 2', 'XI IPS 1', 'XI IPS 2', 'XII AGAMA']);
        return;
    }
    if (db) {
        db.collection('classes').get().then(s => setClasses(s.docs.map(d => d.data().name).sort()));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    if (isMockMode) {
        setTimeout(() => {
            const mockData: AttendanceRecord[] = [];
            for (let i = 0; i < 15; i++) {
                mockData.push({
                    id: `rec-${i}`,
                    studentName: `SISWA SIMULASI ${i + 1}`,
                    class: selectedClass === 'All' ? 'X IPA 1' : selectedClass,
                    date: selectedDate,
                    status: 'Hadir',
                    checkIn: '07:15',
                    duha: null, zuhur: null, ashar: null, checkOut: '16:00'
                });
            }
            setRecords(mockData);
            setLoading(false);
        }, 500);
        return;
    }
    if (!db) return;
    let query = db.collection('attendance').where('date', '==', selectedDate);
    if (selectedClass !== 'All') query = query.where('class', '==', selectedClass);

    const unsubscribe = query.onSnapshot(snapshot => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
        data.sort((a, b) => (b.checkIn || '').localeCompare(a.checkIn || ''));
        setRecords(data);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedDate, selectedClass]);

  const filteredRecords = useMemo(() => {
      return records.filter(r => {
          const name = String(r.studentName || '').toLowerCase();
          const query = searchQuery.toLowerCase();
          const matchesSearch = name.includes(query);
          const matchesStatus = filterStatus === 'All' || r.status === filterStatus;
          return matchesSearch && matchesStatus;
      });
  }, [records, searchQuery, filterStatus]);

  const stats = useMemo(() => ({
      present: records.filter(r => r.status === 'Hadir').length,
      late: records.filter(r => r.status === 'Terlambat').length,
      alpha: records.filter(r => r.status === 'Alpha').length,
  }), [records]);

  const handleEditClick = (record: AttendanceRecord) => {
      setEditingRecord(record);
      setEditForm({
          status: record.status,
          checkIn: record.checkIn?.substring(0,5),
          checkOut: record.checkOut?.substring(0,5)
      });
      setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
      if (!editingRecord) return;
      if (isMockMode) {
          toast.success("Simulasi Update Berhasil");
      } else {
          try {
              await db!.collection('attendance').doc(editingRecord.id).update(editForm);
              toast.success("Data Diperbarui");
          } catch (e) { toast.error("Gagal update"); }
      }
      setIsEditModalOpen(false);
  };

  const statusChips = [
      { id: 'All', label: 'Semua' },
      { id: 'Hadir', label: 'Hadir' },
      { id: 'Terlambat', label: 'Telat' },
      { id: 'Alpha', label: 'Alpa' },
      { id: 'Izin', label: 'Izin/Sakit' },
  ];

  return (
    <Layout title="Riwayat Absensi" subtitle="Database Realtime" icon={CalendarIcon} onBack={onBack}>
      <div className="p-3 lg:p-6 pb-24 space-y-4">
        
        {/* --- SMART FILTER HUB --- */}
        <div className="bg-white dark:bg-[#151E32] p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <CalendarIcon className="w-4 h-4" />
                    </div>
                    <input 
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all uppercase"
                    />
                </div>
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <BuildingLibraryIcon className="w-4 h-4" />
                    </div>
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full pl-11 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black outline-none appearance-none focus:ring-4 focus:ring-indigo-500/10 transition-all uppercase"
                    >
                        <option value="All">SEMUA KELAS</option>
                        {classes.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                    </select>
                    <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-50 dark:border-slate-800 pt-3">
                {statusChips.map((chip) => (
                    <button
                        key={chip.id}
                        onClick={() => setFilterStatus(chip.id)}
                        className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${
                            filterStatus === chip.id 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                            : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700 hover:border-indigo-300'
                        }`}
                    >
                        {chip.label}
                    </button>
                ))}
            </div>
            
            <div className="relative pt-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="CARI NAMA SISWA..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-transparent rounded-2xl text-[10px] font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all"
                />
            </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter">Hadir</p>
                <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 leading-none mt-1">{stats.present}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-2xl border border-amber-100 dark:border-amber-800">
                <p className="text-[8px] font-black text-amber-600 uppercase tracking-tighter">Telat</p>
                <p className="text-xl font-black text-amber-700 dark:text-amber-300 leading-none mt-1">{stats.late}</p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-2xl border border-rose-100 dark:border-rose-800">
                <p className="text-[8px] font-black text-rose-600 uppercase tracking-tighter">Alpa</p>
                <p className="text-xl font-black text-rose-700 dark:text-emerald-300 leading-none mt-1">{stats.alpha}</p>
            </div>
        </div>

        {/* Data List */}
        <div className="bg-white dark:bg-[#151E32] rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[300px]">
            {loading ? (
                <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></div>
            ) : filteredRecords.length > 0 ? (
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                    {filteredRecords.map((r) => (
                        <div key={r.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors flex items-center justify-between group">
                            <div className="flex-1 min-w-0 pr-4">
                                <h4 className="font-black text-slate-800 dark:text-white text-[10px] uppercase truncate">{r.studentName}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${
                                        r.status === 'Hadir' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                    }`}>{r.status}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{r.class}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-right">
                                <div className="hidden sm:block">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Masuk</p>
                                    <p className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">{r.checkIn || '--:--'}</p>
                                </div>
                                <button onClick={() => handleEditClick(r)} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors">
                                    <PencilIcon className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center text-slate-400 uppercase text-[9px] font-black tracking-widest">Data Tidak Ditemukan</div>
            )}
        </div>
      </div>

      {/* Edit Modal Mini */}
      {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-[2rem] p-6 shadow-2xl animate-in zoom-in duration-200">
                  <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase mb-4">Edit Absensi</h3>
                  <div className="space-y-4">
                      <select 
                        value={editForm.status} 
                        onChange={(e) => setEditForm({...editForm, status: e.target.value as any})}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase"
                      >
                          <option value="Hadir">Hadir</option>
                          <option value="Terlambat">Terlambat</option>
                          <option value="Sakit">Sakit</option>
                          <option value="Izin">Izin</option>
                          <option value="Alpha">Alpha</option>
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl text-xs font-black uppercase">Batal</button>
                        <button onClick={handleSaveEdit} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase">Simpan</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default AttendanceHistory;