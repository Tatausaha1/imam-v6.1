
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

export enum ViewState {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  PRESENSI = 'PRESENSI',
  CONTENT_GENERATION = 'CONTENT_GENERATION',
  REPORTS = 'REPORTS',
  PROFILE = 'PROFILE',
  CLASSES = 'CLASSES',
  PROMOTION = 'PROMOTION',
  SCHEDULE = 'SCHEDULE',
  SCANNER = 'SCANNER',
  ALL_FEATURES = 'ALL_FEATURES',
  ATTENDANCE_HISTORY = 'ATTENDANCE_HISTORY',
  ACADEMIC_YEAR = 'ACADEMIC_YEAR',
  JOURNAL = 'JOURNAL',
  ASSIGNMENTS = 'ASSIGNMENTS',
  GRADES = 'GRADES',
  REPORT_CARDS = 'REPORT_CARDS',
  STUDENTS = 'STUDENTS',
  ALUMNI = 'ALUMNI',
  MUTATION = 'MUTATION',
  TEACHERS = 'TEACHERS',
  ID_CARD = 'ID_CARD',
  LETTERS = 'LETTERS',
  CREATE_ACCOUNT = 'CREATE_ACCOUNT',
  DEVELOPER = 'DEVELOPER',
  LOGIN_HISTORY = 'LOGIN_HISTORY',
  ABOUT = 'ABOUT',
  HISTORY = 'HISTORY', 
  PREMIUM = 'PREMIUM', 
  NEWS = 'NEWS',
  MADRASAH_INFO = 'MADRASAH_INFO',
  ADVISOR = 'ADVISOR',
  SETTINGS = 'SETTINGS',
  PUSAKA = 'PUSAKA',
  GUIDE = 'GUIDE',
  POINTS = 'POINTS',
  KEMENAG_HUB = 'KEMENAG_HUB',
  NOTIFICATIONS = 'NOTIFICATIONS',
}

export enum UserRole {
  ADMIN = 'admin',
  DEVELOPER = 'developer',
  KEPALA_MADRASAH = 'kepala_madrasah',
  GURU = 'Guru',
  WALI_KELAS = 'Wali Kelas',
  STAF = 'Staf',
  KETUA_KELAS = 'Ketua Kelas',
  SISWA = 'siswa',
  ORANG_TUA = 'orangtua',
  // Added GTK role as it is used in some components
  GTK = 'GTK'
}

export interface Student {
  id?: string;               // Database Auto-ID atau NISN
  idUnik?: string;           // ID Lokal Sekolah
  namaLengkap: string;
  nisn: string;              // Digunakan untuk verifikasi klaim
  nik?: string;
  email?: string;
  tingkatRombel: string;     // Relasi ke koleksi 'classes'
  status: 'Aktif' | 'Lulus' | 'Mutasi' | 'Keluar' | 'Nonaktif';
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  tanggalLahir?: string;     // Format YYYY-MM-DD (Kunci Verifikasi Klaim)
  
  // --- SCHEMA KLAIM AKUN ---
  isClaimed: boolean;        // true jika sudah punya akun login
  authUid?: string;          // Link ke UID Firebase Auth
  linkedUserId?: string;     // Link ke Document ID koleksi 'users'
  accountStatus?: 'Active' | 'Suspended';
  // -------------------------

  noTelepon?: string;
  alamat?: string;
  lastModified?: string;

  // Fix: Added missing properties requested by StudentData component and StudentService
  role?: string;
  userlogin?: string;
  tempatLahir?: string;
  namaAyahKandung?: string;
  namaIbuKandung?: string;
  namaWali?: string;
  nomorKIPP_PIP?: string;
  kebutuhanKhusus?: string;
  disabilitas?: string;
  createdAt?: string;
  lastAccountActivity?: string;
  movedAt?: string;
  moveReason?: string;
}

export interface UserData {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  
  // --- LINK KE DATA INDUK ---
  studentId?: string;        // Merujuk ke Doc ID di koleksi 'students'
  teacherId?: string;        // Merujuk ke Doc ID di koleksi 'teachers'
  idUnik?: string;           // Mirror dari data induk
  // -------------------------

  photoURL?: string;
  createdAt: string;
  lastLogin: string;
  isSso: boolean;
}

export interface ClassData {
    id?: string;
    name: string;
    level: string; 
    teacherId?: string; 
    teacherName?: string;
    academicYear: string;
    // Fix: Added missing property requested by ClassList component
    captainName?: string;
}

export type AttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpha' | 'Haid' | 'Terlambat';

export interface AttendanceRecord {
    id: string;
    studentId: string;
    studentName: string;
    class: string;
    date: string;
    status: AttendanceStatus;
    checkIn: string | null;
    duha: string | null;
    zuhur: string | null;
    ashar: string | null;
    checkOut: string | null;
}

export interface Teacher {
  id?: string;
  name: string;
  nip: string;
  subject: string;
  status: 'PNS' | 'PPPK' | 'GTY' | 'Honorer';
  linkedUserId?: string;
  // Fix: Added missing properties requested by TeacherData component
  phone?: string;
  email?: string;
  birthDate?: string;
  address?: string;
}

// Fix: Added missing interfaces requested by various components and services
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface AboutContent {
  engineVersion: string;
  brandingText: string;
  devName: string;
  devNip: string;
  devQuote: string;
  faqs: FAQItemData[];
}

export interface FAQItemData {
  iconName: string;
  question: string;
  answer: string;
}

export type LetterStatus = 'Pending' | 'Verified' | 'Validated' | 'Signed' | 'Ditolak';

export interface LetterRequest {
  id?: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  type: string;
  description: string;
  date: string;
  status: LetterStatus;
  letterNumber?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  validatedBy?: string;
  validatedAt?: string;
  signedBy?: string;
  signedAt?: string;
  digitalSignatureHash?: string;
  adminNote?: string;
}

export interface StudentGrade {
  subjectId: string;
  studentId: string;
  nilaiHarian: number;
  nilaiUTS: number;
  nilaiUAS: number;
  nilaiAkhir: number;
}

export interface JournalEntry {
  id: string;
  teacherId: string;
  teacherName: string;
  className: string;
  subject: string;
  date: string;
  jamKe: string;
  materi: string;
  catatan: string;
  createdAt?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  className: string;
  teacherId: string;
  teacherName: string;
  dueDate: string;
  status: 'Open' | 'Closed';
  priority: 'Low' | 'Medium' | 'High';
  createdAt: string;
}

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  timestamp: string;
  device: string;
  ip: string;
  status: 'Success' | 'Failed';
}

export interface MadrasahData {
  nama: string;
  nsm: string;
  npsn: string;
  alamat: string;
  telepon: string;
  email: string;
  website: string;
  kepalaNama: string;
  kepalaNip: string;
  akreditasi: string;
  visi: string;
  misi: string[];
  photo: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'announcement' | 'update' | 'alert' | 'info';
  sender: string;
}
