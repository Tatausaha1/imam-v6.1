
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
  BellIcon,
  ClockIcon,
  BriefcaseIcon,
  SparklesIcon,
  CheckCircleIcon,
  StarIcon,
  ChartBarIcon,
  CameraIcon,
  XCircleIcon,
  SaveIcon,
  // Fix: Added missing IdentificationIcon import to fix "Cannot find name 'IdentificationIcon'"
  IdentificationIcon
} from './Icons';
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
  studentId?: string;
  namaAyah?: string;
  namaIbu?: string;
  teacherId?: string;
}

interface Notification {
  id: string;
  title: string;
  date: string;
  type: 'alert' | 'info' | 'success';
}

interface ProfileProps {
  onBack: () => void;
  onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ onBack, onLogout }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setTimeout(() => {
          const storedRole = localStorage.getItem('mock_user_role') || 'GTK';
          let mockName = 'Budi Santoso, S.Pd';
          if (storedRole === 'SISWA') mockName = 'Diende Adellya Aqilla';

          setProfile({
            uid: 'mock-user-123',
            displayName: mockName,
            email: `${storedRole.toLowerCase()}@imam.sch.id`,
            role: storedRole,
            nip: storedRole === 'SISWA' ? '-' : '19850101 201001 1 001',
            nisn: storedRole === 'SISWA' ? '0086806447' : '-',
            idUnik: storedRole === 'SISWA' ? '15012' : undefined,
            phone: '081234567890',
            class: storedRole === 'SISWA' ? 'XII IPA 1' : 'Wali Kelas X IPA 1',
            address: 'Jl. Merdeka No. 45, Barabai',
            createdAt: new Date('2020-07-15').toISOString()
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
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
              const data = doc.data();
              if (data) {
                userRole = data.role || 'GTK';
                additionalData = { ...data };
                if (data.studentId) {
                    try {
                        const studentDoc = await db.collection('students').doc(data.studentId).get();
                        if (studentDoc.exists) {
                            const s = studentDoc.data();
                            additionalData.nisn = s?.nisn || additionalData.nisn;
                            additionalData.idUnik = s?.idUnik || additionalData.idUnik;
                            additionalData.class = s?.tingkatRombel || additionalData.class;
                            additionalData.address = s?.alamat || additionalData.address;
                            additionalData.phone = s?.noTelepon || additionalData.phone;
                            additionalData.displayName = s?.namaLengkap || additionalData.displayName;
                            additionalData.namaAyah = s?.namaAyahKandung || additionalData.namaAyah;
                            additionalData.namaIbu = s?.namaIbuKandung || additionalData.namaIbu;
                        }
                    } catch (err) {}
                }
              }
            }
          }
        } catch (e) {}

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
    const role = String(profile.role || 'GTK').toUpperCase();
    let notifs: Notification[] = [];
    
    if (role === 'SISWA') {
      notifs = [
        { id: '1', title: 'Tugas Matematika: Aljabar Linear', date: 'Batas: Besok, 23:59', type: 'alert' },
        { id: '2', title: 'Jadwal Ujian Semester Ganjil', date: 'Mulai Senin Depan', type: 'info' },
      ];
    } else {
      notifs = [
        { id: '1', title: 'Rapat Dewan Guru (Evaluasi KBM)', date: 'Besok, 09:00 - Ruang Guru', type: 'info' },
        { id: '2', title: 'Batas Input Nilai Rapor Semester 1', date: '3 Hari lagi', type: 'info' },
      ];
    }
    setNotifications(notifs);
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
          if (!isMockMode && db && profile) {
              const batch = db.batch();
              batch.update(db.collection('users').doc(profile.uid), {
                phone: editForm.phone,
                address: editForm.address,
                namaAyah: editForm.namaAyah,
                namaIbu: editForm.namaIbu
              });
              if (profile.studentId) {
                  batch.update(db.collection('students').doc(profile.studentId), {
                    noTelepon: editForm.phone,
                    alamat: editForm.address,
                    namaAyahKandung: editForm.namaAyah,
                    namaIbuKandung: editForm.namaIbu,
                    lastModified: new Date().toISOString()
                  });
              }
              await batch.commit();
              setProfile(prev => prev ? ({ ...prev, ...editForm }) : null);
              toast.success("Profil diperbarui.");
              setIsEditOpen(false);
          }
      } catch (error) { toast.error("Gagal menyimpan."); } finally { setSaving(false); }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async (event) => {
            const base64Image = event.target?.result as string;
            if (auth?.currentUser && db) {
                await auth.currentUser.updateProfile({ photoURL: base64Image });
                await db.collection('users').doc(auth.currentUser.uid).update({ photoURL: base64Image });
                setProfile(prev => prev ? ({ ...prev, photoURL: base64Image }) : null);
                toast.success("Foto profil diperbarui!");
            }
            setUploading(false);
        };
    } catch (error) { setUploading(false); }
  };

  const getRoleTheme = (role: string) => {
    const normalized = String(role || 'GTK').toUpperCase();
    switch (normalized) {
        case 'ADMIN': return { label: 'Administrator', icon: ShieldCheckIcon, gradient: 'from-rose-500 to-red-600', bgLight: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400' };
        case 'SISWA': return { label: 'Siswa', icon: AcademicCapIcon, gradient: 'from-teal-400 to-emerald-600', bgLight: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400' };
        default: return { label: role, icon: BriefcaseIcon, gradient: 'from-indigo-500 to-violet-600', bgLight: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400' };
    }
  };

  const theme = profile ? getRoleTheme(profile.role) : getRoleTheme('GTK');
  const getInitials = (name: string) => (name || '?').split(' ').map(n => n ? n[0] : '').slice(0, 2).join('').toUpperCase();

  const InfoItem = ({ icon: Icon, label, value }: any) => (
    <div className="flex items-center gap-4 p-4 rounded-2xl border bg-white dark:bg-slate-800/80 border-slate-100 dark:border-slate-700 shadow-sm">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme.bgLight} ${theme.text}`}><Icon className="w-5 h-5" /></div>
        <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-0.5">{label}</p>
            <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">{value || '-'}</p>
        </div>
    </div>
  );

  return (
    <Layout title="Profil Saya" subtitle="Identitas & Pengaturan" icon={UserIcon} onBack={onBack}>
      <div className="p-4 lg:p-8 pb-32 max-w-6xl mx-auto w-full space-y-6">
        {loading ? (
           <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500 mb-3" /></div>
        ) : profile ? (
          <>
            {/* --- HEADER BANNER --- */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700">
                <div className={`absolute top-0 inset-x-0 h-48 bg-gradient-to-r ${theme.gradient}`}>
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                </div>
                <div className="relative pt-24 px-6 pb-6 flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
                    <div className="relative shrink-0 group">
                        <div className="w-32 h-32 rounded-full p-1 bg-white dark:bg-slate-800 shadow-2xl relative">
                            <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center relative">
                                {profile.photoURL ? <img src={profile.photoURL} alt="" className="w-full h-full object-cover" /> : <span className={`text-4xl font-black ${theme.text}`}>{getInitials(profile.displayName)}</span>}
                                <button onClick={handleAvatarClick} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><CameraIcon className="w-6 h-6 text-white" /></button>
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                    <div className="flex-1 pb-2">
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{profile.displayName}</h1>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-1">{theme.label} • MAN 1 HST</p>
                    </div>
                    <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => {
                            setEditForm({
                              phone: profile.phone || '',
                              address: profile.address || '',
                              namaAyah: profile.namaAyah || '',
                              namaIbu: profile.namaIbu || ''
                            });
                            setIsEditOpen(true);
                          }}
                          className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-widest border border-slate-100 dark:border-slate-600 shadow-sm"
                        >
                          Edit Profil
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* --- KOLOM KIRI: INFO PRIBADI --- */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <UsersIcon className="w-4 h-4 text-indigo-500" /> Data Personal
                        </h3>
                        <div className="space-y-3">
                            <InfoItem icon={IdentificationIcon} label="ID Lokal" value={profile.idUnik} />
                            <InfoItem icon={PhoneIcon} label="WhatsApp" value={profile.phone} />
                            <InfoItem icon={MapPinIcon} label="Alamat" value={profile.address} />
                            <InfoItem icon={UsersIcon} label="Nama Ayah" value={profile.namaAyah} />
                            <InfoItem icon={UsersIcon} label="Nama Ibu" value={profile.namaIbu} />
                            <InfoItem icon={EnvelopeIcon} label="Email" value={profile.email} />
                        </div>
                    </div>
                </div>

                {/* --- KOLOM KANAN: STATS & NOTIF --- */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-3 gap-3">
                        <StatBox label="Kehadiran" val="98%" icon={ClockIcon} bg="bg-blue-50 text-blue-600" />
                        <StatBox label="Poin Sikap" val="100" icon={StarIcon} bg="bg-amber-50 text-amber-600" />
                        <StatBox label="Status" val="Aktif" icon={CheckCircleIcon} bg="bg-emerald-50 text-emerald-600" />
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[2.2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <BellIcon className="w-4 h-4 text-rose-500" /> Notifikasi
                            </h3>
                            <span className="text-[8px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full uppercase">Penting</span>
                        </div>
                        <div className="space-y-3">
                            {notifications.map(n => (
                                <div key={n.id} className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700/50">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.type === 'alert' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}><BellIcon className="w-5 h-5" /></div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">{n.title}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{n.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <button onClick={onLogout} className="w-full py-4 bg-rose-50 text-rose-600 font-black rounded-2xl border border-rose-100 active:scale-[0.98] transition-all text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                        <LogOutIcon className="w-4 h-4" /> Keluar Akun
                    </button>
                </div>
            </div>

            {/* Modal Edit */}
            {isEditOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-[#0B1121] w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-white/10 animate-in zoom-in duration-200">
                        <h3 className="font-black text-sm uppercase tracking-[0.2em] mb-8 text-center">Koreksi Biodata</h3>
                        <form onSubmit={handleSaveProfile} className="space-y-5">
                            <div><label className="text-[9px] font-black text-slate-400 uppercase ml-1">No. WhatsApp</label><input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl text-xs font-bold outline-none" /></div>
                            <div><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Alamat Domisili</label><textarea rows={3} value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl text-xs font-bold outline-none resize-none" /></div>
                            <div><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nama Ayah</label><input type="text" value={editForm.namaAyah} onChange={e => setEditForm({...editForm, namaAyah: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl text-xs font-bold outline-none" /></div>
                            <div><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nama Ibu</label><input type="text" value={editForm.namaIbu} onChange={e => setEditForm({...editForm, namaIbu: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-2xl text-xs font-bold outline-none" /></div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl text-[9px] uppercase tracking-widest">Batal</button>
                                <button type="submit" disabled={saving} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <SaveIcon className="w-4 h-4" />} Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
          </>
        ) : null}
      </div>
    </Layout>
  );
};

const StatBox = ({ label, val, icon: Icon, bg }: any) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${bg}`}><Icon className="w-5 h-5" /></div>
        <p className="text-lg font-black text-slate-800 dark:text-white leading-none">{val}</p>
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2">{label}</p>
    </div>
);

export default Profile;
