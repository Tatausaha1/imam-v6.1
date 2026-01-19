import React, { useState, useEffect, useRef } from 'react';
import { auth, db, isMockMode } from '../services/firebase';
import Layout from './Layout';
import { 
  UserIcon, 
  ShieldCheckIcon, 
  LogOutIcon, 
  PencilIcon, 
  AcademicCapIcon, 
  UsersIcon,
  Loader2,
  PhoneIcon,
  EnvelopeIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  MapPinIcon,
  ImamLogo,
  BellIcon,
  ClockIcon,
  BriefcaseIcon,
  QrCodeIcon,
  SparklesIcon,
  CheckCircleIcon,
  StarIcon,
  ChartBarIcon,
  CameraIcon,
  XCircleIcon,
  SaveIcon
} from './Icons';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

interface UserProfile {
  displayName: string;
  email: string;
  role: string;
  photoURL?: string;
  nip?: string;
  nisn?: string;
  idUnik?: string;
  uid: string;
  phone?: string;
  class?: string;
  address?: string;
  createdAt?: string;
  studentId?: string; // Foreign Key to Students collection
  // Parent info for editing
  namaAyah?: string;
  namaIbu?: string;
}

interface Notification {
  id: string;
  title: string;
  date: string;
  type: 'alert' | 'info' | 'success';
}

// Added missing ProfileProps interface definition
interface ProfileProps {
  onBack: () => void;
  onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ onBack, onLogout }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Image Upload State
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Profile State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
      phone: '',
      address: '',
      namaAyah: '',
      namaIbu: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      
      if (isMockMode) {
        // Mock Data
        setTimeout(() => {
          const storedRole = localStorage.getItem('mock_user_role') || 'GTK';
          
          let mockName = 'Budi Santoso, S.Pd';
          if (storedRole === 'SISWA') mockName = 'Diende Adellya Aqilla';
          if (storedRole === 'STAFF') mockName = 'Siti Aminah, S.Kom';
          if (storedRole === 'ADMIN') mockName = 'Administrator Sistem';

          setProfile({
            uid: 'mock-user-123',
            studentId: storedRole === 'SISWA' ? '25039' : undefined,
            displayName: mockName,
            email: `${storedRole.toLowerCase()}@imam.sch.id`,
            role: storedRole,
            nip: storedRole === 'SISWA' ? '-' : '19850101 201001 1 001',
            nisn: storedRole === 'SISWA' ? '0086806447' : '-',
            idUnik: storedRole === 'SISWA' ? '15012' : undefined,
            phone: '081234567890',
            class: storedRole === 'SISWA' ? 'XII IPA 1' : storedRole === 'GTK' ? 'Wali Kelas X IPA 1' : 'Staff TU',
            address: 'Jl. Merdeka No. 45, Barabai',
            createdAt: new Date('2020-07-15').toISOString(),
            namaAyah: 'H. Abdullah',
            namaIbu: 'Hj. Siti'
          });
          setLoading(false);
        }, 800);
        return;
      }

      if (auth && auth.currentUser) {
        const user = auth.currentUser;
        let userRole = 'GTK';
        let additionalData: any = {};

        try {
          if (db) {
            // 1. Fetch User Document
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
              const data = doc.data();
              if (data) {
                userRole = data.role || 'GTK';
                additionalData = { ...data };

                // 2. Fetch Linked Student Data if 'studentId' exists (The "Hop")
                if (data.studentId) {
                    try {
                        const studentDoc = await db.collection('students').doc(data.studentId).get();
                        if (studentDoc.exists) {
                            const studentData = studentDoc.data();
                            // Merge student data into profile view, prioritizing fresh data from student doc
                            additionalData.nisn = studentData?.nisn || additionalData.nisn;
                            additionalData.idUnik = studentData?.idUnik || additionalData.idUnik;
                            additionalData.class = studentData?.tingkatRombel || additionalData.class;
                            additionalData.address = studentData?.alamat || additionalData.address;
                            additionalData.phone = studentData?.noTelepon || additionalData.phone;
                            additionalData.displayName = studentData?.namaLengkap || additionalData.displayName;
                            additionalData.namaAyah = studentData?.namaAyahKandung || '';
                            additionalData.namaIbu = studentData?.namaIbuKandung || '';
                        }
                    } catch (err) {
                        console.warn("Could not fetch linked student details:", err);
                    }
                }
              }
            }
          }
        } catch (e) {
          console.error("Error fetching profile:", e);
        }

        setProfile({
          uid: user.uid,
          displayName: user.displayName || 'Pengguna',
          email: user.email || '',
          role: userRole,
          photoURL: user.photoURL || undefined,
          createdAt: user.metadata.creationTime,
          ...additionalData
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    if (!profile) return;

    // FIX: Gunakan pengamanan role yang kuat
    const role = String(profile.role || 'GTK').toUpperCase();
    let notifs: Notification[] = [];
    
    if (role === 'SISWA') {
      notifs = [
        { id: '1', title: 'Tugas Matematika: Aljabar Linear', date: 'Batas: Besok, 23:59', type: 'alert' },
        { id: '2', title: 'Jadwal Ujian Semester Ganjil', date: 'Mulai Senin Depan', type: 'info' },
        { id: '3', title: 'Pengembalian Buku Paket Fisika', date: 'Jatuh Tempo: Hari ini', type: 'alert' },
      ];
    } else if (role === 'GTK' || role === 'GURU') {
      const daysUntilExpiry = 2; 
      notifs = [
        { 
            id: 'cuti-alert', 
            title: `Masa Cuti Tahunan Berakhir dalam ${daysUntilExpiry} Hari`, 
            date: 'Harap lapor diri ke Tata Usaha pada hari Senin.', 
            type: 'alert' 
        },
        { id: '1', title: 'Rapat Dewan Guru (Evaluasi KBM)', date: 'Besok, 09:00 - Ruang Guru', type: 'info' },
        { id: '2', title: 'Batas Input Nilai Rapor Semester 1', date: '3 Hari lagi', type: 'info' },
      ];
    } else if (role === 'STAFF') {
      notifs = [
        { id: '1', title: 'Verifikasi Surat Masuk (PTSP)', date: '3 Permohonan Baru', type: 'alert' },
        { id: '2', title: 'Rekap Absensi Bulanan', date: 'Segera Finalisasi', type: 'info' },
      ];
    } else if (role === 'ADMIN') {
      notifs = [
        { id: '1', title: 'Backup Database Bulanan', date: 'Terjadwal: Minggu, 02:00', type: 'info' },
        { id: '2', title: '5 Permohonan Surat Menunggu Verifikasi', date: 'Hari ini', type: 'alert' },
      ];
    } else if (role === 'ORANG_TUA' || role === 'WALI') {
      notifs = [
        { id: '1', title: 'Undangan Pengambilan Rapor', date: 'Sabtu, 08:00', type: 'info' },
        { id: '2', title: 'Tagihan Administrasi Sekolah', date: 'Jatuh Tempo 20 Nov', type: 'alert' },
      ];
    }

    setNotifications(notifs);
  }, [profile]);

  const handleEditClick = () => {
      if (!profile) return;
      setEditForm({
          phone: profile.phone || '',
          address: profile.address || '',
          namaAyah: profile.namaAyah || '',
          namaIbu: profile.namaIbu || ''
      });
      setIsEditOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);

      try {
          if (isMockMode) {
              await new Promise(r => setTimeout(r, 1000));
              setProfile(prev => prev ? ({ ...prev, ...editForm }) : null);
              toast.success("Profil diperbarui (Simulasi)");
              setIsEditOpen(false);
              setSaving(false);
              return;
          }

          if (db && profile) {
              const batch = db.batch();
              const userRef = db.collection('users').doc(profile.uid);
              batch.update(userRef, {
                  phone: editForm.phone,
                  address: editForm.address
              });

              if (profile.studentId) {
                  const studentRef = db.collection('students').doc(profile.studentId);
                  batch.update(studentRef, {
                      noTelepon: editForm.phone,
                      alamat: editForm.address,
                      namaAyahKandung: editForm.namaAyah,
                      namaIbuKandung: editForm.namaIbu
                  });
              }

              await batch.commit();
              setProfile(prev => prev ? ({ ...prev, ...editForm }) : null);
              toast.success("Data profil berhasil disimpan.");
              setIsEditOpen(false);
          }
      } catch (error: any) {
          console.error("Save profile error:", error);
          toast.error("Gagal menyimpan perubahan.");
      } finally {
          setSaving(false);
      }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 512;
          const MAX_HEIGHT = 512;
          let width = img.width;
          let height = img.height;
          if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
          else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Ukuran file terlalu besar (Maks 5MB)"); return; }
    setUploading(true);
    try {
        const base64Image = await compressImage(file);
        if (isMockMode) { setProfile(prev => prev ? ({ ...prev, photoURL: base64Image }) : null); toast.success("Foto profil diperbarui (Simulasi)"); setUploading(false); return; }
        if (auth && auth.currentUser && db) {
            await auth.currentUser.updateProfile({ photoURL: base64Image });
            await db.collection('users').doc(auth.currentUser.uid).update({ photoURL: base64Image });
            setProfile(prev => prev ? ({ ...prev, photoURL: base64Image }) : null);
            toast.success("Foto profil berhasil diperbarui!");
        }
    } catch (error) { toast.error("Gagal mengunggah foto."); } finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const getRoleTheme = (role: string) => {
    // FIX: Tambahkan pengamanan String() dan fallback jika role undefined
    const normalized = String(role || 'GTK').toUpperCase();
    switch (normalized) {
        case 'ADMIN': return { label: 'Administrator', icon: ShieldCheckIcon, gradient: 'from-rose-500 to-red-600', bgLight: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-900/30', cardHeader: 'bg-rose-600' };
        case 'GTK':
        case 'GURU': return { label: 'Guru / Pengajar', icon: BriefcaseIcon, gradient: 'from-indigo-500 to-violet-600', bgLight: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-100 dark:border-indigo-900/30', cardHeader: 'bg-indigo-600' };
        case 'STAFF': return { label: 'Staf Tata Usaha / PTSP', icon: BuildingLibraryIcon, gradient: 'from-orange-500 to-amber-600', bgLight: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-900/30', cardHeader: 'bg-orange-600' };
        case 'SISWA': return { label: 'Siswa', icon: AcademicCapIcon, gradient: 'from-teal-400 to-emerald-600', bgLight: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-100 dark:border-teal-900/30', cardHeader: 'bg-teal-600' };
        case 'ORANG_TUA':
        case 'WALI': return { label: 'Wali Murid', icon: UsersIcon, gradient: 'from-cyan-400 to-blue-600', bgLight: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-100 dark:border-cyan-900/30', cardHeader: 'bg-cyan-600' };
        default: return { label: role, icon: UserIcon, gradient: 'from-slate-500 to-slate-700', bgLight: 'bg-slate-50 dark:bg-slate-900/50', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-800', cardHeader: 'bg-slate-600' };
    }
  };

  const getInitials = (name: string) => (name || '?').split(' ').map(n => n ? n[0] : '').slice(0, 2).join('').toUpperCase();
  const theme = profile ? getRoleTheme(profile.role) : getRoleTheme('GTK');

  const InfoItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: string }) => (
    <div className={`flex items-center gap-4 p-3 rounded-2xl border bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${theme.bgLight} ${theme.text}`}>
            <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{value || '-'}</p>
        </div>
    </div>
  );

  const getStats = () => {
      const role = String(profile?.role || '').toUpperCase();
      if (role === 'SISWA') {
          return [
              { label: 'Kehadiran', value: '98%', icon: ClockIcon, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
              { label: 'Poin Sikap', value: '100', icon: StarIcon, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
              { label: 'Ranking', value: '#5', icon: ChartBarIcon, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
          ];
      }
      if (role === 'GTK' || role === 'GURU') {
          return [
              { label: 'Jam Ajar', value: '24 Jam', icon: ClockIcon, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
              { label: 'Siswa Binaan', value: '32', icon: UsersIcon, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
              { label: 'Performa', value: 'A', icon: CheckCircleIcon, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
          ];
      }
      return [
          { label: 'Status', value: 'Aktif', icon: CheckCircleIcon, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
          { label: 'Bergabung', value: '2024', icon: CalendarDaysIcon, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800' },
          { label: 'Akses', value: 'Full', icon: ShieldCheckIcon, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/30' },
      ];
  };

  const stats = getStats();
  const cardStyle = { perspective: '1000px' };
  const innerStyle = { transformStyle: 'preserve-3d' as const, transition: 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' };
  const frontStyle = { backfaceVisibility: 'hidden' as const, WebkitBackfaceVisibility: 'hidden' as const, position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%' };
  const backStyle = { ...frontStyle, transform: 'rotateY(180deg)' };

  // DATA QR UNTUK SCANNER: Hanya gunakan idUnik secara ketat sesuai permintaan
  const qrValue = profile?.idUnik || "000";

  return (
    <Layout title="Profil Saya" subtitle="Identitas & Notifikasi Personal" icon={UserIcon} onBack={onBack}>
      <div className="p-4 lg:p-8 pb-32 max-w-6xl mx-auto w-full space-y-6">
        {loading ? (
           <div className="flex flex-col items-center justify-center py-20 text-slate-400">
               <Loader2 className="w-10 h-10 animate-spin mb-3" />
               <p className="text-sm font-medium">Memuat profil...</p>
           </div>
        ) : profile ? (
          <>
            <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 group">
                <div className={`absolute top-0 inset-x-0 h-48 bg-gradient-to-r ${theme.gradient} transition-all duration-500`}>
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                    <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                </div>
                <div className="relative pt-24 px-6 pb-6 flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
                    <div className="relative shrink-0 group/avatar">
                        <div className="w-36 h-36 rounded-full p-1.5 bg-white dark:bg-slate-800 shadow-2xl ring-4 ring-white/10 backdrop-blur-sm relative">
                            <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center relative">
                                {profile.photoURL ? <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" /> : <span className={`text-4xl font-bold ${theme.text}`}>{getInitials(profile.displayName)}</span>}
                                <button onClick={handleAvatarClick} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 cursor-pointer">
                                    <div className="bg-white/20 backdrop-blur-md p-2 rounded-full border border-white/50">{uploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <CameraIcon className="w-6 h-6 text-white" />}</div>
                                </button>
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                        <div className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg border-[3px] border-white dark:border-slate-800 bg-gradient-to-br ${theme.gradient}`}><theme.icon className="w-4 h-4" /></div>
                    </div>
                    <div className="flex-1 mb-2 pt-10 md:pt-0">
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-tight mb-2">{profile.displayName}</h1>
                        <div className="flex flex-col md:flex-row items-center gap-3">
                            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700"><p className="text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5"><EnvelopeIcon className="w-3.5 h-3.5" /> {profile.email}</p></div>
                            <span className="hidden md:inline text-slate-300">•</span>
                            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700"><p className="text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5"><CalendarDaysIcon className="w-3.5 h-3.5" /> Sejak {profile.createdAt ? new Date(profile.createdAt).getFullYear() : '-'}</p></div>
                        </div>
                    </div>
                    <div className="mb-3 hidden md:block"><div className={`px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest border shadow-sm ${theme.bgLight} ${theme.text} ${theme.border}`}>{theme.label}</div></div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm"><QrCodeIcon className="w-4 h-4 text-slate-400" /> ID Card Digital</h3>
                            <button onClick={() => setIsFlipped(!isFlipped)} className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-100 transition-colors">Putar Kartu</button>
                        </div>
                        <div className="w-full aspect-[3/4.6] cursor-pointer group" style={cardStyle} onClick={() => setIsFlipped(!isFlipped)}>
                            <div className="relative w-full h-full" style={innerStyle}>
                                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200" style={frontStyle}>
                                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-800/80 rounded-full z-20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"></div>
                                    <div className={`h-[28%] ${theme.cardHeader} relative flex flex-col items-center justify-center text-white p-4`}>
                                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay"></div>
                                        <div className="flex items-center gap-2.5 mb-1 relative z-10"><span className="font-bold tracking-[0.2em] text-sm">IMAM</span></div>
                                        <p className="text-[8px] font-medium tracking-[0.2em] uppercase relative z-10 opacity-90">MAN 1 Hulu Sungai Tengah</p>
                                    </div>
                                    <div className="flex-1 p-6 flex flex-col items-center text-center bg-white relative">
                                        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>
                                        <div className="w-28 h-28 rounded-full border-4 border-white shadow-xl overflow-hidden -mt-14 mb-4 bg-slate-100 relative z-10">
                                             {profile.photoURL ? <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" /> : <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${theme.gradient}`}><span className="text-3xl font-bold text-white">{getInitials(profile.displayName)}</span></div>}
                                        </div>
                                        <h2 className="font-extrabold text-slate-900 text-sm uppercase leading-tight mb-2 px-1 line-clamp-2">{profile.displayName}</h2>
                                        <span className={`text-[9px] font-bold uppercase tracking-wider mb-6 px-3 py-1 rounded-md ${theme.bgLight} ${theme.text}`}>{theme.label}</span>
                                        
                                        {/* QR CODE REALTIME - Menggunakan idUnik untuk presensi (Ketat tanpa fallback) */}
                                        <div className="mt-auto bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                                            <QRCodeSVG value={qrValue} size={90} level="M" />
                                        </div>
                                        
                                        <p className="text-[8px] text-slate-400 mt-2 font-medium">Scan untuk Presensi</p>
                                        <p className="text-[9px] font-mono text-slate-400 mt-1 font-bold tracking-widest">{qrValue}</p>
                                    </div>
                                    <div className={`h-2 ${theme.cardHeader} w-full`}></div>
                                </div>
                                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 p-6 relative" style={backStyle}>
                                     <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-200 rounded-full z-20 shadow-inner"></div>
                                     <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                                     <div className="mt-8 text-center border-b border-slate-100 pb-4 mb-4 relative z-10"><h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest">Tata Tertib</h3></div>
                                     <ul className="text-[10px] text-slate-600 list-disc list-outside ml-4 space-y-2.5 leading-relaxed flex-1 text-left relative z-10">
                                        <li>Kartu ini adalah identitas resmi warga sekolah.</li>
                                        <li>Wajib dibawa setiap hari dan ditunjukkan saat diminta petugas.</li>
                                        <li>Gunakan untuk presensi digital dan akses perpustakaan.</li>
                                        <li>Kehilangan kartu harap segera lapor ke Tata Usaha.</li>
                                     </ul>
                                     <div className="mt-4 flex flex-col items-center relative z-10"><p className="text-[9px] text-slate-400 mt-auto">Berlaku selama menjadi warga sekolah aktif.</p></div>
                                     <div className={`h-2 ${theme.cardHeader} w-full absolute bottom-0 left-0`}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-3 gap-3 md:gap-4">
                        {stats.map((stat, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${stat.bg} ${stat.color}`}><stat.icon className="w-5 h-5" /></div>
                                <p className="text-xl font-extrabold text-slate-800 dark:text-white">{stat.value}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden">
                        <div className="absolute -top-6 -right-6 opacity-[0.03] rotate-12"><BellIcon className="w-40 h-40" /></div>
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div><h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg"><SparklesIcon className="w-5 h-5 text-yellow-500" />Pemberitahuan</h3><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Info terbaru untuk <span className="font-bold">{theme.label}</span></p></div>
                            {notifications.length > 0 && <span className="text-[10px] font-bold bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-full animate-pulse border border-red-100 dark:border-red-900/50">{notifications.length} Penting</span>}
                        </div>
                        <div className="space-y-3 relative z-10">
                            {notifications.map((notif) => (
                                <div key={notif.id} className="group flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform ${notif.type === 'alert' ? 'bg-red-100 text-red-600 dark:bg-red-900/20' : notif.type === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-900/20' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/20'}`}>{notif.type === 'alert' ? <ClockIcon className="w-5 h-5" /> : <BellIcon className="w-5 h-5" />}</div>
                                    <div className="flex-1 min-w-0 py-0.5"><div className="flex justify-between items-start mb-1"><p className="text-sm font-bold text-slate-800 dark:text-white leading-tight pr-2">{notif.title}</p>{notif.type === 'alert' && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1"></span>}</div><p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{notif.date}</p></div>
                                </div>
                            ))}
                            {notifications.length === 0 && <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700"><p className="text-slate-400 text-sm">Tidak ada pemberitahuan baru.</p></div>}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><UsersIcon className="w-5 h-5 text-teal-500" />Informasi Pribadi</h3><div className="flex gap-2"><button onClick={handleEditClick} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-indigo-500 transition-colors bg-indigo-50 dark:bg-indigo-900/30" title="Edit Data Pribadi"><PencilIcon className="w-4 h-4" /></button><button onClick={() => handleAvatarClick()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors" title="Ganti Foto Profil"><CameraIcon className="w-4 h-4" /></button></div></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoItem icon={PhoneIcon} label="No. Telepon" value={profile.phone || ''} />
                            {(profile.role === 'SISWA' || profile.role === 'GTK' || profile.role === 'STAFF') && <InfoItem icon={BuildingLibraryIcon} label={profile.role === 'SISWA' ? "Kelas" : "Jabatan"} value={profile.class || ''} />}
                            <InfoItem icon={MapPinIcon} label="Alamat Domisili" value={profile.address || ''} />
                            <InfoItem icon={AcademicCapIcon} label={profile.role === 'SISWA' ? "NISN" : "NIP / NIY"} value={profile.nip || profile.nisn || '-'} />
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-full py-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold rounded-2xl border border-red-100 dark:border-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-95 text-sm"><LogOutIcon className="w-4 h-4" /> Keluar Aplikasi</button>
                </div>
            </div>
            {isEditOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><PencilIcon className="w-5 h-5 text-indigo-500" />Edit Data Pribadi</h3><button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircleIcon className="w-6 h-6" /></button></div>
                        <form onSubmit={handleSaveProfile} className="space-y-4">
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase ml-1">No. Telepon</label><input type="text" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="08..." /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase ml-1">Alamat Domisili</label><textarea rows={2} value={editForm.address} onChange={(e) => setEditForm({...editForm, address: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="Jl..." /></div>
                            {profile.role === 'SISWA' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase ml-1">Nama Ayah</label><input type="text" value={editForm.namaAyah} onChange={(e) => setEditForm({...editForm, namaAyah: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase ml-1">Nama Ibu</label><input type="text" value={editForm.namaIbu} onChange={(e) => setEditForm({...editForm, namaIbu: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                                </div>
                            )}
                            <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm">Batal</button><button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4" />}Simpan</button></div>
                        </form>
                    </div>
                </div>
            )}
          </>
        ) : (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-700"><p className="text-slate-500 dark:text-slate-400">Data profil tidak ditemukan.</p></div>
        )}
      </div>
    </Layout>
  );
};

export default Profile;