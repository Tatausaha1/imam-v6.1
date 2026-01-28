
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

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
  SETTINGS = 'SETTINGS',
  PUSAKA = 'PUSAKA',
  GUIDE = 'GUIDE',
  // Added missing POINTS ViewState
  POINTS = 'POINTS',
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
  visi?: string;
  misi?: string[];
  akreditasi?: string;
  photo?: string;
}

export interface ClassData {
    id?: string;
    name: string;
    level: string; 
    teacherId?: string; 
    teacherName?: string;
    academicYear: string;
    captainId?: string;
    captainName?: string;
    subjects?: string[];
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
  // Added missing discipline points field
  disciplinePoints?: number;
}

export type AttendanceStatus = 'Hadir' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpha' | 'Haid';

export interface AttendanceRecord {
    id: string;
    studentId: string;
    studentName: string;
    gender?: string;
    class: string;
    date: string;
    status: AttendanceStatus;
    // 3 Sesi Terintegrasi
    masukDuha: string | null;
    zuhur: string | null;
    asharPulang: string | null;
}

/**
 * Added missing exports used across components
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface Teacher {
  id?: string;
  name: string;
  nip: string;
  subject: string;
  status: 'PNS' | 'PPPK' | 'GTY' | 'Honorer';
  phone?: string;
  email?: string;
  birthDate?: string;
  address?: string;
  linkedUserId?: string;
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
  priority?: 'High' | 'Medium' | 'Low';
  createdAt?: string;
}

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  timestamp: string;
  device: string;
  ip: string;
  status: 'Success' | 'Failed';
}

// Added missing ViolationMaster export
export interface ViolationMaster {
  id: string;
  category: string;
  description: string;
  points: number;
}

// Added missing DisciplineLog export
export interface DisciplineLog {
  id: string;
  studentId: string;
  studentName: string;
  type: 'Violation' | 'Reward';
  ruleId: string;
  ruleDescription: string;
  points: number;
  date: string;
  recordedBy: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  note?: string;
}
