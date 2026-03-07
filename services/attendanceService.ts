
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import firebase from 'firebase/compat/app';
import { db } from './firebase';
import { format } from 'date-fns';
import { Student } from '../types';

export type AttendanceSession = 'Masuk' | 'Duha' | 'Zuhur' | 'Ashar' | 'Pulang';

const COLLECTION_STUDENTS = 'students';
const COLLECTION_ACADEMIC_YEARS = 'academic_years';

const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000;
let activeSessionConfigCache: { value: any; fetchedAt: number } | null = null;
const studentLookupCache = new Map<string, Student>();

const getActiveSessionConfig = async () => {
    if (isMockMode || !db) return null;

    const now = Date.now();
    if (activeSessionConfigCache && (now - activeSessionConfigCache.fetchedAt) < CONFIG_CACHE_TTL_MS) {
        return activeSessionConfigCache.value;
    }

    try {
        const snap = await db.collection(COLLECTION_ACADEMIC_YEARS).where('isActive', '==', true).limit(1).get();
        if (snap.empty) return null;
        const data = snap.docs[0].data();
        const config = data.config || null;
        activeSessionConfigCache = { value: config, fetchedAt: now };
        return config;
    } catch (e) {
        return null;
    }
};

export const recordAttendanceByScan = async (rawCode: string, session: AttendanceSession, isHaid: boolean = false): Promise<ScanResult> => {
    // Normalisasi kode (Hapus karakter kontrol tersembunyi dari scanner hardware)
    const code = String(rawCode || '').replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();
    if (!code) return { success: false, message: "ID KOSONG" };

    const now = new Date();
    const today = format(now, "yyyy-MM-dd");
    const nowFull = format(now, "HH:mm:ss");
    const currentDay = now.getDay(); 
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const config = await getActiveSessionConfig();
    
    if (config?.workingDays && !config.workingDays.includes(currentDay)) {
        return { success: false, message: "HARI LIBUR" };
    }

    const toMin = (timeStr: string) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    const masukLimit = toMin(config?.masukLimit || "07:30");
    let pulangLimitStr = config?.pulangLimit || "16:00";
    if (currentDay === 5) pulangLimitStr = config?.pulangLimitJumat || "11:30";
    const pulangLimit = toMin(pulangLimitStr);
const COLLECTION_ATTENDANCE = 'attendance';
const STATS_DOC = 'stats/summary';

/**
 * Mencatat kehadiran siswa berdasarkan kode QR idUnik.
 * Mendukung mode offline melalui Firestore Persistence.
 */
export const recordAttendanceByScan = async (code: string, session: AttendanceSession, isHaid: boolean = false): Promise<any> => {
    const cleanId = String(code || '').replace(/\s/g, '').trim();
    if (!cleanId || !db) return { success: false, message: "KODE TIDAK VALID" };

    const today = format(new Date(), "yyyy-MM-dd");
    const nowTime = format(new Date(), "HH:mm:ss");
    
    try {
        let studentData: Student | null = studentLookupCache.get(code) || null;
        
        // --- LOGIKA PENCARIAN BERLAPIS (MULTI-IDENTIFIER) ---
        
        if (!studentData) {
            // 1. PRIORITAS UTAMA: Cari berdasarkan Document ID (Sangat Cepat)
            const studentRefById = db.collection(COLLECTION_STUDENTS).doc(code);
            const studentSnap = await studentRefById.get();
            
            if (studentSnap.exists) {
                studentData = { id: studentSnap.id, ...studentSnap.data() } as Student;
            } else {
                // 2. PRIORITAS KEDUA: Cari berdasarkan field 'idUnik'
                const idUnikQuery = await db.collection(COLLECTION_STUDENTS).where('idUnik', '==', code).limit(1).get();
                if (!idUnikQuery.empty) {
                    const doc = idUnikQuery.docs[0];
                    studentData = { id: doc.id, ...doc.data() } as Student;
                } else {
                    // 3. PRIORITAS TERAKHIR: Cari berdasarkan field 'nisn'
                    const nisnQuery = await db.collection(COLLECTION_STUDENTS).where('nisn', '==', code).limit(1).get();
                    if (!nisnQuery.empty) {
                        const doc = nisnQuery.docs[0];
                        studentData = { id: doc.id, ...doc.data() } as Student;
                    }
                }
            }
        // --- STRATEGI IDENTIFIKASI ---
        let studentData: Student | null = null;
        let snap = await db.collection(COLLECTION_STUDENTS).where('idUnik', '==', cleanId).limit(1).get();
            
        if (snap.empty && /^\d+$/.test(cleanId)) {
            snap = await db.collection(COLLECTION_STUDENTS).where('idUnik', '==', Number(cleanId)).limit(1).get();
        }

        if (snap.empty) {
            snap = await db.collection(COLLECTION_STUDENTS).where('nisn', '==', cleanId).limit(1).get();
        }

        if (snap.empty) {
            const docSnap = await db.collection(COLLECTION_STUDENTS).doc(cleanId).get();
            if (docSnap.exists) studentData = { id: docSnap.id, ...docSnap.data() } as Student;
        } else {
            studentData = { id: snap.docs[0].id, ...snap.docs[0].data() } as Student;
        }

        if (!studentData) return { success: false, message: "ID TIDAK TERDAFTAR" };

        studentLookupCache.set(code, studentData);
        if (studentData.idUnik) studentLookupCache.set(studentData.idUnik, studentData);
        if (studentData.nisn) studentLookupCache.set(studentData.nisn, studentData);
        if (studentData.id) studentLookupCache.set(studentData.id, studentData);

        // Pastikan kita menggunakan Document ID asli untuk primary key absensi
        const attendanceId = `${studentData.id}_${today}`;
        const attendanceRef = db.collection(COLLECTION_ATTENDANCE).doc(attendanceId);
        const docSnapshot = await attendanceRef.get();
        const currentData = docSnapshot?.exists ? docSnapshot.data() : null;
        const attId = `${studentData.id}_${today}`;
        const attRef = db.collection(COLLECTION_ATTENDANCE).doc(attId);

        const fieldMap: any = { 
            'Masuk': 'checkIn', 
            'Duha': 'duha', 
            'Zuhur': 'zuhur', 
            'Ashar': 'ashar', 
            'Pulang': 'checkOut' 
        };

        const batch = db.batch();
        const payload: any = {
            studentId: studentData.id,
            studentName: studentData.namaLengkap,
            class: studentData.tingkatRombel || '-',
            date: today,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (isHaid) {
            // MODE HAID: Otomatis isi semua sesi ibadah
            payload.status = 'Haid';
            payload.duha = `${nowTime} | H`;
            payload.zuhur = `${nowTime} | H`;
            payload.ashar = `${nowTime} | H`;
        } else {
            payload.status = 'Hadir';
            payload[fieldMap[session]] = nowTime;
        }

        batch.set(attRef, payload, { merge: true });

        // Update Statistik Presensi Global
        if (session === 'Masuk' && !isHaid) {
            batch.set(db.doc(STATS_DOC), {
                dailyStats: {
                    [today]: { presentCount: firebase.firestore.FieldValue.increment(1) }
                }
            }, { merge: true });
        }

        await batch.commit();
        return { success: true, message: "ABSEN BERHASIL", student: studentData };

    } catch (error: any) {
        console.error("Attendance Sync Error:", error);
        return { success: false, message: "SYNC OFFLINE AKTIF" };
    }
};
