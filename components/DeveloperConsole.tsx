
import React, { useState, useEffect } from 'react';
import { db, auth, isMockMode } from '../services/firebase';
import Layout from './Layout';
import { 
  CommandLineIcon, 
  ArrowPathIcon, 
  UsersGroupIcon, 
  TrashIcon, 
  PlusIcon,
  UserIcon,
  Search,
  KeyIcon,
  BanknotesIcon,
  RectangleStackIcon
} from './Icons';
import { toast } from 'sonner';

interface DeveloperConsoleProps {
  onBack: () => void;
}

interface UserData {
    uid: string;
    displayName: string;
    email: string;
    role: string;
    createdAt?: string;
    lastLogin?: string;
}

const DeveloperConsole: React.FC<DeveloperConsoleProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');
  
  // Overview Stats
  const [stats, setStats] = useState({ users: 0, students: 0, teachers: 0, attendance: 0, payments: 0, inventory: 0 });
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [logs, setLogs] = useState<string[]>([]);
  const [loadingAction, setLoadingAction] = useState(false);

  // User List State
  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const checkConnection = async () => {
    setConnectionStatus('checking');
    try {
        if (!db) throw new Error("Firebase SDK not initialized");
        // Simple write check to see if we have access
        await db.collection('system_check').doc('ping').set({ timestamp: new Date() });
        setConnectionStatus('connected');
        addLog("Connected to Firestore successfully (Read/Write OK).");
    } catch (e: any) {
        console.error(e);
        setConnectionStatus('error');
        addLog(`Connection Failed: ${e.message}`);
        if (e.code === 'permission-denied') {
            addLog("ERROR: Permission Denied. Check Firestore Rules!");
        }
    }
  };

  const fetchStats = async () => {
    if (!db) return;
    try {
        const u = await db.collection('users').get();
        const s = await db.collection('students').get();
        const t = await db.collection('teachers').get();
        const a = await db.collection('attendance').get();
        const p = await db.collection('payments').get();
        const i = await db.collection('inventory').get(); // Check new collection
        setStats({
            users: u.size,
            students: s.size,
            teachers: t.size,
            attendance: a.size,
            payments: p.size,
            inventory: i.size
        });
        addLog("Statistics refreshed.");
    } catch (e: any) {
        addLog(`Failed to fetch stats: ${e.message}`);
    }
  };

  const fetchUsersList = async () => {
      setLoadingUsers(true);
      if (isMockMode) {
          setTimeout(() => {
              setUsersList([
                  { uid: 'mock-1', displayName: 'Admin Simulasi', email: 'admin@test.com', role: 'ADMIN', createdAt: new Date().toISOString() },
                  { uid: 'mock-2', displayName: 'Guru Simulasi', email: 'guru@test.com', role: 'GURU', createdAt: new Date().toISOString() }
              ]);
              setLoadingUsers(false);
          }, 500);
          return;
      }

      if (!db) return;

      try {
          // Fetch users directly from Firestore 'users' collection
          const snapshot = await db.collection('users').limit(50).get();
          const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData));
          
          // Client-side sort by createdAt to handle potential missing fields in older docs
          data.sort((a, b) => {
              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return dateB - dateA;
          });

          setUsersList(data);
          addLog(`Fetched ${data.length} users from database.`);
      } catch (e: any) {
          addLog(`Error fetching users: ${e.message}`);
          toast.error("Gagal memuat daftar user.");
      } finally {
          setLoadingUsers(false);
      }
  };

  useEffect(() => {
      checkConnection();
      fetchStats();
  }, []);

  useEffect(() => {
      if (activeTab === 'users') {
          fetchUsersList();
      }
  }, [activeTab]);

  const initializeDatabase = async () => {
      if (!db || !auth?.currentUser) return;
      if (!window.confirm("Proses ini akan mengecek database dan menambahkan tabel/koleksi serta data awal jika KOSONG. Lanjutkan?")) return;
      
      setLoadingAction(true);
      addLog("Starting System Initialization...");

      try {
          const batch = db.batch();
          let operationsCount = 0;

          // 1. Initialize Academic Year (If Empty)
          const academicRef = await db.collection('academic_years').limit(1).get();
          if (academicRef.empty) {
              const ref = db.collection('academic_years').doc();
              batch.set(ref, { 
                  name: '2024/2025', 
                  semester: 'Ganjil', 
                  isActive: true, 
                  startDate: '2024-07-15', 
                  endDate: '2024-12-20' 
              });
              addLog("Added: Academic Year 2024/2025");
              operationsCount++;
          } else {
              addLog("Skipped: Academic Year (Data exists)");
          }

          // 2. Initialize Classes (If Empty)
          const classesRef = await db.collection('classes').limit(1).get();
          if (classesRef.empty) {
              const defaultClasses = ['X IPA 1', 'X IPA 2', 'XI IPS 1', 'XI IPS 2', 'XII AGAMA'];
              defaultClasses.forEach(cls => {
                  const ref = db.collection('classes').doc();
                  batch.set(ref, { name: cls, teacherId: '', teacherName: '-' });
              });
              addLog(`Added: ${defaultClasses.length} Classes`);
              operationsCount++;
          } else {
              addLog("Skipped: Classes (Data exists)");
          }

          // 3. Initialize Teachers (If Empty)
          const teachersRef = await db.collection('teachers').limit(1).get();
          if (teachersRef.empty) {
              const teachers = [
                  { name: 'Budi Santoso, S.Pd', nip: '19800101', subject: 'Matematika', status: 'PNS', email: 'budi@sekolah.id' },
                  { name: 'Siti Aminah, M.Ag', nip: '19850505', subject: 'Fikih', status: 'PNS', email: 'siti@sekolah.id' },
                  { name: 'Rina Wati, S.Si', nip: '-', subject: 'Kimia', status: 'Honorer', email: 'rina@sekolah.id' }
              ];
              teachers.forEach(t => {
                  const ref = db!.collection('teachers').doc();
                  batch.set(ref, { ...t, phone: '', address: 'Barabai' });
              });
              addLog(`Added: ${teachers.length} Teachers`);
              operationsCount++;
          } else {
              addLog("Skipped: Teachers (Data exists)");
          }

          // 4. Initialize Settings (If Empty)
          const settingsRef = await db.collection('settings').doc('attendanceSchedule').get();
          if (!settingsRef.exists) {
              const ref = db.collection('settings').doc('attendanceSchedule');
              batch.set(ref, {
                  checkInStart: '06:30',
                  checkInEnd: '07:30',
                  checkOutStart: '14:00',
                  checkOutEnd: '17:00'
              });
              addLog("Added: System Settings");
              operationsCount++;
          }

          // 5. Initialize Students (If Empty)
          const studentsRef = await db.collection('students').limit(1).get();
          if (studentsRef.empty) {
              const students = [
                  { namaLengkap: 'Ahmad Dahlan', nisn: '1234567890', tingkatRombel: 'X IPA 1', status: 'Aktif', jenisKelamin: 'Laki-laki', email: 'ahmad@siswa.id' },
                  { namaLengkap: 'Siti Aminah', nisn: '1234567891', tingkatRombel: 'X IPA 1', status: 'Aktif', jenisKelamin: 'Perempuan', email: 'siti@siswa.id' },
              ];
              students.forEach(s => {
                  const ref = db!.collection('students').doc();
                  batch.set(ref, { ...s, createdAt: new Date().toISOString() });
              });
              addLog(`Added: ${students.length} Students`);
              operationsCount++;
          } else {
              addLog("Skipped: Students (Data exists)");
          }

          // 6. Initialize Payments/SPP (If Empty)
          const paymentsRef = await db.collection('payments').limit(1).get();
          if (paymentsRef.empty) {
              const payments = [
                  {
                      studentName: 'Ahmad Dahlan',
                      type: 'SPP',
                      month: 'Juli 2024',
                      amount: 150000,
                      status: 'Lunas',
                      date: new Date().toISOString(),
                      academicYear: '2024/2025'
                  },
                  {
                      studentName: 'Ahmad Dahlan',
                      type: 'Uang Gedung',
                      month: '-',
                      amount: 500000,
                      status: 'Lunas',
                      date: new Date(Date.now() - 86400000 * 30).toISOString(),
                      academicYear: '2024/2025'
                  }
              ];

              payments.forEach(p => {
                  const ref = db!.collection('payments').doc();
                  batch.set(ref, p);
              });
              addLog(`Added: ${payments.length} Payment Records`);
              operationsCount++;
          } else {
              addLog("Skipped: Payments (Data exists)");
          }

          if (operationsCount > 0) {
              await batch.commit();
              toast.success("Database berhasil diinisialisasi dengan data dasar!");
              addLog("Initialization Complete.");
              fetchStats();
          } else {
              toast.info("Database sudah berisi data. Tidak ada perubahan.");
              addLog("Initialization skipped: Database not empty.");
          }

      } catch (e: any) {
          addLog(`Initialization failed: ${e.message}`);
          toast.error("Gagal inisialisasi data.");
      } finally {
          setLoadingAction(false);
      }
  };

  // --- NEW FEATURE: CREATE CUSTOM COLLECTION ---
  const createInventoryCollection = async () => {
      if (!db) return;
      setLoadingAction(true);
      try {
          const snapshot = await db.collection('inventory').limit(1).get();
          if (!snapshot.empty) {
              toast.info("Koleksi 'inventory' sudah ada. Tidak perlu dibuat ulang.");
              setLoadingAction(false);
              return;
          }

          const batch = db.batch();
          const items = [
              { name: 'Laptop Guru', category: 'Elektronik', condition: 'Baik', qty: 15, location: 'Ruang Guru' },
              { name: 'Proyektor LCD', category: 'Elektronik', condition: 'Perlu Servis', qty: 5, location: 'TU' },
              { name: 'Meja Siswa', category: 'Furniture', condition: 'Baik', qty: 120, location: 'Kelas' },
              { name: 'Papan Tulis Whiteboard', category: 'Furniture', condition: 'Baik', qty: 24, location: 'Kelas' },
          ];

          items.forEach(item => {
              const ref = db.collection('inventory').doc();
              batch.set(ref, { ...item, createdAt: new Date().toISOString() });
          });

          await batch.commit();
          addLog("Created new collection: 'inventory' with sample data.");
          toast.success("Koleksi 'inventory' berhasil dibuat!");
          fetchStats();
      } catch (e: any) {
          addLog(`Error creating inventory: ${e.message}`);
          toast.error("Gagal membuat koleksi.");
      } finally {
          setLoadingAction(false);
      }
  };

  const nukeDatabase = async (collection: string) => {
      if (!window.confirm(`YAKIN MENGHAPUS SEMUA DATA DI '${collection}'? TIDAK BISA DIBATALKAN!`)) return;
      if (!db) return;
      setLoadingAction(true);
      addLog(`Nuking collection: ${collection}...`);

      try {
          const snapshot = await db.collection(collection).get();
          const batch = db.batch();
          snapshot.docs.forEach(doc => {
              batch.delete(doc.ref);
          });
          await batch.commit();
          addLog(`Deleted ${snapshot.size} documents from ${collection}.`);
          toast.success(`Koleksi ${collection} dikosongkan.`);
          fetchStats();
      } catch (e: any) {
          addLog(`Delete failed: ${e.message}`);
          toast.error("Gagal menghapus data.");
      } finally {
          setLoadingAction(false);
      }
  };

  const handleDeleteUser = async (uid: string, email: string) => {
      if(!window.confirm(`Hapus user ${email} dari Firestore? (Auth login mungkin masih aktif)`)) return;
      
      if (!db) return;
      try {
          await db.collection('users').doc(uid).delete();
          setUsersList(prev => prev.filter(u => u.uid !== uid));
          addLog(`Deleted user document: ${uid}`);
          toast.success("User dihapus dari database.");
      } catch (e: any) {
          addLog(`Failed delete user: ${e.message}`);
          toast.error("Gagal menghapus user.");
      }
  };

  const filteredUsers = usersList.filter(u => 
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout
      title="Developer Console"
      subtitle="Database Control Center"
      icon={CommandLineIcon}
      onBack={onBack}
    >
      <div className="p-4 lg:p-6 pb-24 space-y-6">
          
          {/* Tab Navigation */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit mb-4">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
              >
                  Dashboard Overview
              </button>
              <button 
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
              >
                  User Database
              </button>
          </div>

          {activeTab === 'overview' ? (
            <>
                {/* Connection Status */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    connectionStatus === 'connected' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 
                    connectionStatus === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                    'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                            connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                            connectionStatus === 'error' ? 'bg-red-500' : 'bg-slate-400'
                        }`}></div>
                        <div>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-white">Firestore Connection</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {connectionStatus === 'connected' ? 'Connected (Real Data Active)' : 
                                connectionStatus === 'error' ? 'Connection Failed' : 'Checking...'}
                            </p>
                        </div>
                    </div>
                    <button onClick={checkConnection} className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 hover:scale-105 transition-transform">
                        <ArrowPathIcon className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${connectionStatus === 'checking' ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Database Stats */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Users</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.users}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Students</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.students}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Teachers</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.teachers}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Attendance</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.attendance}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">SPP</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.payments}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Inventory</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.inventory}</p>
                    </div>
                </div>

                {/* Actions */}
                <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider mt-4">Database Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <button 
                        onClick={initializeDatabase}
                        disabled={loadingAction || connectionStatus !== 'connected'}
                        className="p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg">
                                <PlusIcon className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-sm">Inisialisasi Sistem</p>
                                <p className="text-[10px] text-indigo-200">Reset Data Dasar Sekolah</p>
                            </div>
                        </div>
                    </button>

                    <button 
                        onClick={createInventoryCollection}
                        disabled={loadingAction || connectionStatus !== 'connected'}
                        className="p-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-lg shadow-teal-200 dark:shadow-none flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg">
                                <RectangleStackIcon className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-sm">Buat Koleksi 'Inventory'</p>
                                <p className="text-[10px] text-teal-200">Demo Buat Tabel Baru</p>
                            </div>
                        </div>
                    </button>

                    <button 
                        onClick={() => nukeDatabase('students')}
                        disabled={loadingAction || connectionStatus !== 'connected'}
                        className="p-4 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-between group disabled:opacity-50"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
                                <TrashIcon className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-sm">Hapus Semua Siswa</p>
                                <p className="text-[10px] opacity-70">Kosongkan 'students'</p>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Console Output */}
                <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs h-64 overflow-y-auto border border-slate-800 shadow-inner">
                    <div className="flex justify-between items-center mb-2 border-b border-slate-800 pb-2 sticky top-0 bg-slate-950">
                        <span className="text-green-400 font-bold">$ System Logs</span>
                        <button onClick={() => setLogs([])} className="text-slate-500 hover:text-slate-300">Clear</button>
                    </div>
                    {logs.length === 0 && <p className="text-slate-600 italic">No logs yet...</p>}
                    {logs.map((log, i) => (
                        <p key={i} className="text-slate-300 mb-1 border-l-2 border-slate-800 pl-2">{log}</p>
                    ))}
                </div>
            </>
          ) : (
            /* USER DATABASE TAB */
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input 
                            type="text" 
                            placeholder="Cari user (nama, email, role, uid)..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 dark:text-slate-200"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    </div>
                    <button onClick={fetchUsersList} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                        <ArrowPathIcon className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${loadingUsers ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3">User ID & Nama</th>
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3 text-right">Registered</th>
                                    <th className="px-4 py-3 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {loadingUsers ? (
                                    <tr><td colSpan={5} className="py-8 text-center text-slate-400">Loading users...</td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan={5} className="py-8 text-center text-slate-400">Tidak ada user ditemukan.</td></tr>
                                ) : (
                                    filteredUsers.map(user => (
                                        <tr key={user.uid} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                        <UserIcon className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-white line-clamp-1">{user.displayName}</p>
                                                        <p className="text-[10px] font-mono text-slate-400">{user.uid}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{user.email}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                                    user.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                    user.role === 'Guru' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                                }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs text-slate-500 dark:text-slate-400">
                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button 
                                                    onClick={() => handleDeleteUser(user.uid, user.email)}
                                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                                                    title="Hapus Data User"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <p className="text-[10px] text-slate-400 text-center">
                    Note: Menghapus data di sini hanya menghapus dokumen profil di Firestore. Akun login (Auth) harus dihapus terpisah via Firebase Console.
                </p>
            </div>
          )}

      </div>
    </Layout>
  );
};

export default DeveloperConsole;
