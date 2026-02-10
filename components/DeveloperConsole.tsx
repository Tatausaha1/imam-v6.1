
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db, isMockMode } from '../services/firebase';
import { repairStudentDatabase } from '../services/studentService';
import Layout from './Layout';
import { 
  CommandLineIcon, ArrowPathIcon, UsersGroupIcon, TrashIcon, PlusIcon,
  UserIcon, Search, PencilIcon, XCircleIcon, SaveIcon, Loader2, 
  BuildingLibraryIcon, StarIcon, BookOpenIcon,
  MegaphoneIcon, BriefcaseIcon, FileSpreadsheet, RectangleStackIcon, ShieldCheckIcon,
  ClockIcon, InfoIcon, SparklesIcon
} from './Icons';
import { toast } from 'sonner';

interface DeveloperConsoleProps {
  onBack: () => void;
}

const DeveloperConsole: React.FC<DeveloperConsoleProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'database'>('overview');
  const [stats, setStats] = useState<Record<string, number>>({});
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [logs, setLogs] = useState<string[]>([]);
  const [isRepairing, setIsRepairing] = useState(false);

  // Database Explorer State
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  // CRUD Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [jsonContent, setJsonContent] = useState('');
  const [saving, setSaving] = useState(false);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const TABEL_SISTEM = [
      { id: 'users', label: 'Pengguna', icon: UserIcon },
      { id: 'students', label: 'Siswa', icon: UsersGroupIcon },
      { id: 'teachers', label: 'Guru', icon: BriefcaseIcon },
      { id: 'classes', label: 'Kelas', icon: BuildingLibraryIcon },
      { id: 'attendance', label: 'Presensi', icon: ClockIcon },
      { id: 'letters', label: 'Surat', icon: MegaphoneIcon },
      { id: 'schedules', label: 'Jadwal', icon: StarIcon },
      { id: 'journals', label: 'Jurnal', icon: BookOpenIcon },
      { id: 'assignments', label: 'Tugas', icon: RectangleStackIcon },
      { id: 'nilai', label: 'Nilai', icon: ShieldCheckIcon },
      { id: 'login_logs', label: 'Log Masuk', icon: CommandLineIcon },
      { id: 'session_configs', label: 'Jam Sesi', icon: ClockIcon }
  ];

  const checkAllCollections = async () => {
    setConnectionStatus('checking');
    if (!db && !isMockMode) return;
    try {
        const newStats: Record<string, number> = {};
        if (isMockMode) {
            TABEL_SISTEM.forEach(t => newStats[t.id] = Math.floor(Math.random() * 50));
        } else if (db) {
            for (const col of TABEL_SISTEM) {
                const snap = await db.collection(col.id).limit(1).get();
                newStats[col.id] = snap.size > 0 ? 100 : 0; 
            }
        }
        setStats(newStats);
        setConnectionStatus('connected');
        addLog(`Kernel Terhubung. Database Online.`);
    } catch (e: any) {
        setConnectionStatus('error');
        addLog(`Gagal Cek DB: ${e.message}`);
    }
  };

  const handleRepairStudents = async () => {
      if (isRepairing) return;
      setIsRepairing(true);
      addLog("MENGINISIASI PERBAIKAN SCHEMA SISWA...");
      
      try {
          const updatedCount = await repairStudentDatabase((progress) => addLog(progress));
          addLog(`SUKSES: ${updatedCount} data lama berhasil ditambal field isClaimed & authUid.`);
          toast.success(`${updatedCount} Record diperbarui.`);
      } catch (e: any) {
          addLog(`MIGRASI GAGAL: ${e.message}`);
          toast.error("Gagal melakukan migrasi data.");
      } finally {
          setIsRepairing(false);
      }
  };

  const loadCollectionData = async (colId: string) => {
      setSelectedCollection(colId);
      setTableLoading(true);
      setTableData([]);
      addLog(`QUERY: SELECT * FROM ${colId} LIMIT 100`);

      if (isMockMode) {
          setTimeout(() => {
              const mockRows = Array.from({length: 10}, (_, i) => ({
                  id: `mock_doc_${i+1}`,
                  name: `Sample Name ${i+1}`,
                  role: 'User',
                  status: 'Active'
              }));
              setTableData(mockRows);
              setTableLoading(false);
          }, 600);
          return;
      }

      try {
          if (db) {
              const snap = await db.collection(colId).limit(100).get();
              const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              setTableData(data);
              addLog(`LOADED: ${data.length} records.`);
          }
      } catch (e: any) {
          addLog(`ERROR: ${e.message}`);
          toast.error("Gagal memuat tabel.");
      } finally {
          setTableLoading(false);
      }
  };

  const handleOpenAdd = () => {
      setEditorMode('add');
      setEditingId(null);
      setJsonContent('{\n  "field": "value"\n}');
      setIsEditorOpen(true);
  };

  const handleOpenEdit = (doc: any) => {
      const { id, ...dataOnly } = doc;
      setEditorMode('edit');
      setEditingId(id);
      setJsonContent(JSON.stringify(dataOnly, null, 2));
      setIsEditorOpen(true);
  };

  const saveDocument = async () => {
      if (!selectedCollection) return;
      setSaving(true);
      
      try {
          const data = JSON.parse(jsonContent);
          const toastId = toast.loading("Syncing to Firestore...");

          if (isMockMode) {
              await new Promise(r => setTimeout(r, 600));
              if (editorMode === 'add') {
                setTableData([{ id: `mock_${Date.now()}`, ...data }, ...tableData]);
              } else {
                setTableData(tableData.map(d => d.id === editingId ? { id: editingId, ...data } : d));
              }
              toast.success("Mode Simulasi: Data disimpan.", { id: toastId });
          } else if (db) {
              if (editorMode === 'add') {
                  await db.collection(selectedCollection).add(data);
              } else if (editingId) {
                  await db.collection(selectedCollection).doc(editingId).set(data, { merge: true });
              }
              toast.success("Database Updated Successfully", { id: toastId });
              loadCollectionData(selectedCollection);
          }
          
          setIsEditorOpen(false);
          addLog(`${editorMode.toUpperCase()} SUCCESS on ${selectedCollection}`);
      } catch (e: any) {
          toast.error("Format JSON tidak valid atau database error: " + e.message);
      } finally {
          setSaving(false);
      }
  };

  const deleteDocument = async (docId: string) => {
      if (!selectedCollection || !window.confirm(`PERINGATAN KERAS: Hapus permanen dokumen ${docId}?`)) return;
      
      const toastId = toast.loading("Menghapus...");
      try {
          if (!isMockMode && db) {
              await db.collection(selectedCollection).doc(docId).delete();
          }
          setTableData(prev => prev.filter(d => d.id !== docId));
          toast.success("Dokumen dihapus", { id: toastId });
          addLog(`DELETE SUCCESS: ${docId}`);
      } catch (e: any) {
          toast.error("Gagal menghapus: " + e.message, { id: toastId });
      }
  };

  const tableHeaders = useMemo(() => {
      if (tableData.length === 0) return [];
      const keys = new Set<string>();
      keys.add('id');
      tableData.slice(0, 10).forEach(obj => {
          Object.keys(obj).forEach(k => {
              if (k !== 'id') keys.add(k);
          });
      });
      return Array.from(keys);
  }, [tableData]);

  const filteredTableData = useMemo(() => {
      const q = tableSearch.toLowerCase();
      if (!q) return tableData;
      return tableData.filter(row => 
          Object.values(row).some(val => String(val).toLowerCase().includes(q))
      );
  }, [tableData, tableSearch]);

  useEffect(() => { checkAllCollections(); }, []);

  return (
    <Layout title="System Console" subtitle="Enterprise Kernel Control" icon={CommandLineIcon} onBack={onBack}>
      <div className="flex flex-col h-full bg-[#f1f5f9] dark:bg-[#020617] overflow-hidden transition-colors">
          
          <div className="bg-white dark:bg-[#0B1121] border-b border-slate-200 dark:border-slate-800 p-2 flex items-center justify-between gap-4 z-20">
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button onClick={() => setActiveTab('overview')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-400'}`}>Overview</button>
                  <button onClick={() => setActiveTab('database')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'database' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-400'}`}>Explorer</button>
              </div>
              
              {activeTab === 'database' && selectedCollection && (
                  <div className="flex items-center gap-2 flex-1 max-w-lg">
                      <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                          <input 
                              type="text" 
                              placeholder="Search current grid..." 
                              value={tableSearch}
                              onChange={e => setTableSearch(e.target.value)}
                              className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-lg py-1.5 pl-8 pr-3 text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                      </div>
                      <button onClick={handleOpenAdd} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg active:scale-90 transition-all"><PlusIcon className="w-3 h-3" /> Insert Row</button>
                      <button onClick={() => loadCollectionData(selectedCollection)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 active:scale-90"><ArrowPathIcon className="w-4 h-4" /></button>
                      <button onClick={() => setSelectedCollection(null)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 active:scale-90"><XCircleIcon className="w-4 h-4" /></button>
                  </div>
              )}
          </div>

          <div className="flex-1 overflow-hidden relative">
              {activeTab === 'overview' && (
                <div className="h-full flex flex-col p-4 lg:p-6 space-y-6 overflow-y-auto custom-scrollbar pb-32">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {TABEL_SISTEM.slice(0, 4).map(t => (
                            <div key={t.id} className="bg-white dark:bg-[#151E32] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <t.icon className="w-5 h-5 text-indigo-500 mb-2" />
                                <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.label}</h5>
                                <p className="text-xl font-black text-slate-800 dark:text-white mt-1">{stats[t.id] ?? '...'}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white dark:bg-[#151E32] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                            <SparklesIcon className="w-5 h-5 text-amber-500" />
                            <h3 className="text-xs font-black uppercase tracking-widest">Maintenance & Migration</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button 
                                onClick={handleRepairStudents}
                                disabled={isRepairing}
                                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-indigo-500 transition-all active:scale-[0.98] group disabled:opacity-50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                                        {isRepairing ? <Loader2 className="w-5 h-5 animate-spin" /> : <UsersGroupIcon className="w-5 h-5" />}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black uppercase leading-none">Repair Students Schema</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Tambal isClaimed & authUid</p>
                                    </div>
                                </div>
                                <ArrowPathIcon className={`w-4 h-4 text-slate-300 group-hover:text-indigo-500 ${isRepairing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-3xl p-6 font-mono text-[10px] flex-1 min-h-[300px] border border-slate-800 shadow-2xl flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
                            <span className="text-indigo-400 font-black uppercase tracking-widest">Kernel Log Output</span>
                            <button onClick={() => setLogs([])} className="text-[8px] text-slate-600 hover:text-white uppercase transition-colors">Clear</button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                            {logs.map((l, i) => (
                                <p key={i} className="text-slate-400 leading-relaxed"><span className="text-slate-600">[{i}]</span> {l}</p>
                            ))}
                            {logs.length === 0 && <p className="text-slate-700 italic">Listening for system kernel messages...</p>}
                        </div>
                    </div>
                </div>
              )}

              {activeTab === 'database' && (
                <div className="h-full flex flex-col animate-in fade-in duration-300">
                    {!selectedCollection ? (
                        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto custom-scrollbar pb-32">
                            {TABEL_SISTEM.map(col => (
                                <button 
                                    key={col.id} 
                                    onClick={() => loadCollectionData(col.id)}
                                    className="bg-white dark:bg-[#151E32] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-center gap-3 text-center"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                        <col.icon className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h5 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-tight">{col.label}</h5>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">/{col.id}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#0B1121]">
                            <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                                    <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-widest">Koleksi: {selectedCollection}</span>
                                    <span className="text-[9px] text-slate-400 font-bold ml-2">({filteredTableData.length} records)</span>
                                </div>
                                <div className="text-[8px] font-mono text-slate-400 uppercase">Privileged Dev-Acess Enabled</div>
                            </div>

                            <div className="flex-1 overflow-auto relative custom-scrollbar bg-slate-200/50 dark:bg-[#020617]">
                                {tableLoading ? (
                                    <div className="absolute inset-0 z-40 bg-white/60 dark:bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center">
                                        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Executing Firestream Query...</p>
                                    </div>
                                ) : (
                                    <table className="border-collapse table-fixed min-w-full">
                                        <thead className="sticky top-0 z-30">
                                            <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-target-700">
                                                <th className="w-10 h-10 border-r border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 sticky left-0 z-40"></th>
                                                {tableHeaders.map((h, i) => (
                                                    <th key={h} className="px-4 py-2 border-r border-slate-300 dark:border-slate-700 text-[10px] font-black text-slate-500 uppercase tracking-tighter text-center min-w-[150px] bg-slate-100 dark:bg-slate-900">
                                                        {String.fromCharCode(65 + (i % 26))}{i >= 26 ? Math.floor(i/26) : ''}
                                                        <div className="text-[8px] font-bold text-slate-400 mt-0.5 truncate px-1">{h}</div>
                                                    </th>
                                                ))}
                                                <th className="w-24 px-4 py-2 border-l border-slate-300 dark:border-slate-700 text-[10px] font-black text-slate-500 uppercase sticky right-0 bg-slate-100 dark:bg-slate-900 z-30">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-300 dark:divide-slate-800">
                                            {filteredTableData.map((row, i) => (
                                                <tr key={row.id} className="group hover:bg-indigo-50 dark:hover:bg-indigo-900/10 bg-white dark:bg-[#0B1121]">
                                                    <td className="w-10 h-10 border-r border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 sticky left-0 z-20 text-center text-[9px] font-black text-slate-400 group-hover:text-indigo-600 transition-colors">
                                                        {i + 1}
                                                    </td>
                                                    {tableHeaders.map(h => {
                                                        const val = row[h];
                                                        const displayVal = typeof val === 'object' 
                                                            ? (val?.seconds ? new Date(val.seconds * 1000).toLocaleString() : JSON.stringify(val)) 
                                                            : String(val ?? '');
                                                        return (
                                                            <td key={h} className="px-4 py-2 border-r border-slate-300 dark:border-slate-700 text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate whitespace-nowrap max-w-[250px]" title={displayVal}>
                                                                {displayVal}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-4 py-2 border-l border-slate-300 dark:border-slate-700 sticky right-0 bg-white dark:bg-[#0B1121] group-hover:bg-indigo-50 dark:group-hover:bg-[#1a1f2e] text-center z-20">
                                                        <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button 
                                                                onClick={() => handleOpenEdit(row)}
                                                                className="p-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg shadow-sm active:scale-90 transition-all"
                                                                title="Edit Document"
                                                            >
                                                                <PencilIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button 
                                                                onClick={() => deleteDocument(row.id)}
                                                                className="p-2 bg-rose-50 dark:bg-rose-900/40 text-rose-500 hover:bg-rose-600 hover:text-white rounded-lg shadow-sm active:scale-90 transition-all"
                                                                title="Delete Permanently"
                                                            >
                                                                <TrashIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredTableData.length === 0 && (
                                                <tr>
                                                    <td colSpan={tableHeaders.length + 2} className="py-24 text-center text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] bg-white dark:bg-[#0B1121]">
                                                        NO RECORDS RETURNED FROM ENGINE
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}
                </div>
              )}
          </div>
      </div>

      {/* JSON DOCUMENT EDITOR MODAL - FULLSCREEN-ISH & ULTRA DENSE */}
      {isEditorOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm md:p-4">
              <div className="bg-white dark:bg-[#0B1121] w-[98vw] h-[96vh] md:w-[95vw] md:h-[94vh] rounded-3xl md:rounded-[3rem] p-3 md:p-5 shadow-2xl animate-in zoom-in duration-300 border border-white/10 relative overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center mb-2 shrink-0 px-2">
                      <div>
                          <h3 className="text-base md:text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">
                              {editorMode === 'add' ? 'New Document' : 'Patch Document'}
                          </h3>
                          <p className="text-[8px] font-bold text-indigo-500 uppercase mt-1 tracking-widest">Target: /{selectedCollection}/{editingId || 'AutoID'}</p>
                      </div>
                      <button onClick={() => setIsEditorOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"><XCircleIcon className="w-6 h-6" /></button>
                  </div>

                  <div className="flex-1 overflow-hidden flex flex-col space-y-2">
                      <div className="flex-1 relative bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
                          <div className="absolute top-2 right-4 px-2 py-0.5 bg-slate-800/80 text-[7px] font-mono text-indigo-400 rounded uppercase z-10">Format: JSON</div>
                          <textarea 
                              value={jsonContent}
                              onChange={e => setJsonContent(e.target.value)}
                              className="w-full h-full p-4 md:p-6 font-mono text-[10px] md:text-xs text-emerald-400 bg-transparent outline-none resize-none custom-scrollbar leading-relaxed"
                              spellCheck={false}
                          />
                      </div>
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800/50 flex gap-2">
                          <InfoIcon className="w-3 h-3 text-indigo-500 shrink-0 mt-0.5" />
                          <p className="text-[8px] text-indigo-700 dark:text-indigo-300 leading-tight font-medium uppercase tracking-tight">JSON valid. Commit menimpa data yang ada.</p>
                      </div>
                  </div>

                  <div className="mt-3 flex gap-2 shrink-0">
                      <button type="button" onClick={() => setIsEditorOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all">Cancel</button>
                      <button 
                        onClick={saveDocument} 
                        disabled={saving} 
                        className="flex-[3] py-3 bg-indigo-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-[0.3em] shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                      >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <SaveIcon className="w-4 h-4" />} EXECUTE COMMIT
                      </button>
                  </div>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default DeveloperConsole;
