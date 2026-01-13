
import React from 'react';

export enum ViewState {
  ONBOARDING = 'ONBOARDING',
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
}

export interface StatCard {
  title: string;
  value: string;
  change?: string;
  icon: React.ReactNode;
  color: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'surat' | 'cuti' | 'info' | 'alert';
  timestamp: Date;
  read: boolean;
  link?: ViewState;
}

export interface Student {
  id?: string;
  idUnik?: string;
  userlogin?: string;
  namaLengkap: string;
  nisn: string;
  nik?: string;
  email?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  tingkatRombel: string;
  umur?: string;
  status: 'Aktif' | 'Lulus' | 'Mutasi' | 'Keluar' | 'Nonaktif';
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  alamat?: string;
  noTelepon?: string;
  kebutuhanKhusus?: string;
  disabilitas?: string;
  nomorKIPP_PIP?: string;
  namaAyahKandung?: string;
  namaIbuKandung?: string;
  namaWali?: string;
  accountStatus?: string;
  linkedUserId?: string;
}

export interface Teacher {
  id?: string;
  name: string;
  nip: string;
  subject: string;
  status: 'PNS' | 'PPPK' | 'GTY' | 'Honorer';
  phone: string;
  email: string;
  birthDate: string;
  address: string;
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
  adminNote?: string;
  verifiedBy?: string; 
  verifiedAt?: string;
  validatedBy?: string; 
  validatedAt?: string;
  signedBy?: string; 
  signedAt?: string;
  digitalSignatureHash?: string; 
}

export interface StudentGrade {
  subjectId: string;
  studentId: string;
  nilaiHarian: number;
  nilaiUTS: number;
  nilaiUAS: number;
  nilaiAkhir: number;
}

export interface Rapor {
  studentId: string;
  semester: number;
  tahunAjaran: string;
  catatanWaliKelas: string;
  grades: StudentGrade[];
}

export interface JournalEntry {
  id?: string;
  teacherId: string;
  teacherName: string;
  className: string;
  subject: string;
  date: string;
  jamKe: string;
  materi: string;
  catatan?: string;
  createdAt?: string;
}

export interface Assignment {
  id?: string;
  title: string;
  description: string;
  subject: string;
  className: string;
  teacherId: string;
  teacherName: string;
  dueDate: string;
  status: 'Open' | 'Closed';
  priority?: 'Low' | 'Medium' | 'High';
  createdAt: string;
}

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  timestamp: string;
  device: string;
  status: 'Success' | 'Failed';
  ip?: string;
}