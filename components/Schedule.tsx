
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CalendarIcon, ClockIcon, BuildingLibraryIcon, Loader2, ArrowDownTrayIcon, ArrowPathIcon, CalendarDaysIcon, RectangleStackIcon, ChevronDownIcon } from './Icons';
import { toast } from 'sonner';
import Layout from './Layout';
import * as XLSX from 'xlsx';
import { db, isMockMode } from '../services/firebase';
import { bulkImportSchedule, ScheduleItem } from '../services/scheduleService';

interface ScheduleProps {
  onBack: () => void;
}

export default function Schedule({ onBack }: ScheduleProps) {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [activeDay, setActiveDay] = useState('Senin');
  
  // Data State
  const [allItems, setAllItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  
  // Filter State
  const [selectedClass, setSelectedClass] = useState('All');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const daysOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // Update active day based on today on first load
  useEffect(() => {
      const today = new Date();
      const dayIndex = today.getDay();
      const fullNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const todayName = fullNames[dayIndex];
      if (todayName && todayName !== 'Minggu') {
          setActiveDay(todayName);
      } else {
          setActiveDay('Senin');
      }
  }, []);

  // Real-time Fetch
  useEffect(() => {
      setLoading(true);

      if (isMockMode) {
          // Mock data logic (kept separate to avoid flicker if mock mode toggled)
          setTimeout(() => {
              // ... mock data logic from service ...
              // For simplicity, using a hardcoded small set here as a fallback
              setAllItems([
                  { id: '1', day: 'Senin', time: '07:30 - 09:00', subject: 'Matematika (Simulasi)', class: 'XII IPA 1', room: 'R. 12' }
              ]);
              setLoading(false);
          }, 500);
          return;
      }

      if (!db) {
          setLoading(false);
          return;
      }

      const unsubscribe = db.collection('schedules').onSnapshot(snapshot => {
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleItem));
          setAllItems(items);
          setLoading(false);
      }, err => {
          console.error("Error fetching schedules:", err);
          setLoading(false);
      });

      return () => unsubscribe();
  }, []);

  // Extract Unique Classes for Dropdown
  const uniqueClasses = useMemo(() => {
      const classes = new Set(allItems.map(item => item.class).filter(Boolean));
      return Array.from(classes).sort();
  }, [allItems]);

  // Filter and Group Data
  const filteredSchedule = useMemo(() => {
      // 1. Filter by Class
      const filtered = allItems.filter(item => 
          selectedClass === 'All' || item.class === selectedClass
      );

      // 2. Group by Day
      const grouped: Record<string, ScheduleItem[]> = {};
      filtered.forEach(item => {
          if (!grouped[item.day]) grouped[item.day] = [];
          grouped[item.day].push(item);
      });

      // 3. Sort by Time
      Object.keys(grouped).forEach(day => {
          grouped[day].sort((a, b) => a.time.localeCompare(b.time));
      });

      return grouped;
  }, [allItems, selectedClass]);

  const handleDownloadTemplate = () => {
      const templateData = [
          {
              "Hari": "Senin",
              "Jam": "07:30 - 09:00",
              "Mata Pelajaran": "Matematika Wajib",
              "Kelas": "XII IPA 1",
              "Ruang": "R. 12"
          },
          {
              "Hari": "Senin",
              "Jam": "09:15 - 10:45",
              "Mata Pelajaran": "Bahasa Indonesia",
              "Kelas": "XII IPA 1",
              "Ruang": "R. 12"
          }
      ];
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Jadwal");
      XLSX.writeFile(workbook, "Template_Jadwal_Pelajaran.xlsx");
      toast.success("Template berhasil diunduh");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setImporting(true);
      const toastId = toast.loading("Mengimpor jadwal...");

      try {
          const data = await file.arrayBuffer();
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newSchedules: Omit<ScheduleItem, 'id'>[] = jsonData.map((row: any) => ({
              day: row["Hari"] || "Senin",
              time: row["Jam"] || "00:00 - 00:00",
              subject: row["Mata Pelajaran"] || "-",
              class: row["Kelas"] || "-",
              room: row["Ruang"] || "-"
          }));

          if (newSchedules.length > 0) {
              await bulkImportSchedule(newSchedules);
              toast.success(`Berhasil mengimpor ${newSchedules.length} jadwal`, { id: toastId });
              // Automatic update via onSnapshot
          } else {
              toast.error("File kosong atau format salah", { id: toastId });
          }
      } catch (error) {
          console.error("Import Error:", error);
          toast.error("Gagal mengimpor file", { id: toastId });
      } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
      }
  };

  const renderScheduleCard = (item: ScheduleItem) => (
      <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs flex-col">
              <span>{item.time.split('-')[0].trim()}</span>
          </div>
          <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-1">{item.subject}</h3>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                      <ClockIcon className="w-3 h-3" /> {item.time}
                  </span>
                  <span className="flex items-center gap-1">
                      <BuildingLibraryIcon className="w-3 h-3" /> {item.room} ({item.class})
                  </span>
              </div>
          </div>
      </div>
  );

  return (
    <Layout
      title="Jadwal Pelajaran"
      subtitle={selectedClass !== 'All' ? `Jadwal Kelas ${selectedClass}` : "Jadwal Seluruh Kelas"}
      icon={CalendarIcon}
      onBack={onBack}
      actions={
          <div className="flex gap-2">
              <button 
                  onClick={handleDownloadTemplate}
                  className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                  title="Download Template"
              >
                  <ArrowDownTrayIcon className="w-5 h-5" />
              </button>
              <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="p-2.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                  title="Import Excel"
              >
                  {importing ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <ArrowPathIcon className="w-5 h-5" />}
              </button>
              <input 
                  type="file" 
                  ref={fileInputRef}
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={handleFileUpload}
              />
          </div>
      }
    >
        <div className="p-4 lg:p-6 pb-24 space-y-6">
            
            {/* Filter & View Controls */}
            <div className="flex flex-col gap-3">
                {/* Class Filter */}
                <div className="relative w-full">
                    <div className="absolute left-3 top-3.5 text-slate-400 pointer-events-none">
                        <RectangleStackIcon className="w-5 h-5" />
                    </div>
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 px-5 pl-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-700 dark:text-slate-200 appearance-none cursor-pointer shadow-sm font-medium"
                    >
                        <option value="All">Semua Kelas</option>
                        {uniqueClasses.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                        ))}
                    </select>
                    <div className="absolute right-4 top-3.5 text-slate-400 pointer-events-none">
                        <ChevronDownIcon className="w-4 h-4" />
                    </div>
                </div>

                {/* View Mode Toggle */}
                <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex relative">
                    <button 
                        onClick={() => setViewMode('daily')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all relative z-10 ${
                            viewMode === 'daily' 
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                        }`}
                    >
                        <ClockIcon className="w-4 h-4" /> Harian
                    </button>
                    <button 
                        onClick={() => setViewMode('weekly')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all relative z-10 ${
                            viewMode === 'weekly' 
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                        }`}
                    >
                        <CalendarDaysIcon className="w-4 h-4" /> Mingguan
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p className="text-sm">Memuat jadwal...</p>
                </div>
            ) : viewMode === 'daily' ? (
                /* DAILY VIEW */
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Day Selector */}
                    <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide mb-4">
                        {daysOrder.map((day) => (
                            <button
                                key={day}
                                onClick={() => setActiveDay(day)}
                                className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                                    activeDay === day 
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' 
                                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>

                    {/* Schedule List */}
                    {filteredSchedule[activeDay]?.length > 0 ? (
                        <div className="space-y-3">
                            {filteredSchedule[activeDay].map(renderScheduleCard)}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                {selectedClass !== 'All' ? `Tidak ada jadwal untuk kelas ${selectedClass} hari ini.` : "Tidak ada jadwal untuk hari ini."}
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                /* WEEKLY VIEW */
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {daysOrder.map((day) => {
                        const daySchedule = filteredSchedule[day];
                        if (!daySchedule || daySchedule.length === 0) return null;

                        return (
                            <div key={day} className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
                                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                                        {day}
                                    </span>
                                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {daySchedule.map(renderScheduleCard)}
                                </div>
                            </div>
                        );
                    })}
                    
                    {Object.keys(filteredSchedule).length === 0 && (
                         <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                            <RectangleStackIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                {selectedClass !== 'All' ? `Jadwal untuk kelas ${selectedClass} belum tersedia.` : "Jadwal mingguan belum tersedia."}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    </Layout>
  );
}
