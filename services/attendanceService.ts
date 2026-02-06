
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import firebase from 'firebase/compat/app';
import { db, isMockMode } from './firebase';
import { format } from 'date-fns';
import { Student, AttendanceStatus } from '../types';

export type AttendanceSession = 'Masuk' | 'Duha' | 'Zuhur' | 'Ashar' | 'Pulang';

interface ScanResult {
    success: boolean;
    message: string;
    student?: Student;
    timestamp?: string;
    statusRecorded?: AttendanceStatus;
}

const COLLECTION_ATTENDANCE = 'attendance';
const COLLECTION_STUDENTS = 'students';

/**
 * Mencatat presensi harian siswa berdasarkan hasil pindai QR.
 */
export const recordAttendanceByScan = async (rawCode: string, session: AttendanceSession, isHaid: boolean = false): Promise<ScanResult> => {
    const code = String(rawCode || '').replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();
    if (!code) return { success: false, message: "ID KOSONG" };

    const now = new Date();
    const today = format(now, "yyyy-MM-dd");
    const nowFull = format(now, "HH:mm:ss");
    
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // THRESHOLDS
    const startThreshold = 7 * 60 + 30; // 07:30 (Batas Masuk)
    const endThreshold = 16 * 60;       // 16:00 (Batas Pulang)

    const isPrayerSession = ['Duha', 'Zuhur', 'Ashar'].includes(session);
    const effectiveHaid = isHaid && isPrayerSession;
    
    let nowValue = nowFull;
    let meta = "";

    // LOGIKA KOREKSI OTOMATIS
    if (session === 'Masuk' && currentMinutes > startThreshold) {
        const lateMin = currentMinutes - startThreshold;
        meta = `+${lateMin}`;
    } else if (session === 'Pulang' && currentMinutes < endThreshold) {
        const earlyMin = endThreshold - currentMinutes;
        meta = `-${earlyMin}`;
    }

    if (meta) {
        nowValue = `${nowFull} | ${meta}`;
    } else if (effectiveHaid) {
        nowValue = `${nowFull} (Haid)`;
    }
    
    const fieldMap: Record<string, string> = {
        'Masuk': 'checkIn', 
        'Duha': 'duha', 
        'Zuhur': 'zuhur', 
        'Ashar': 'ashar', 
        'Pulang': 'checkOut'
    };
    const fieldName = fieldMap[session];

    if (isMockMode) return { success: true, message: "SIMULASI BERHASIL", student: { namaLengkap: "Siswa Simulasi", idUnik: code } as any };
    if (!db) return { success: false, message: "DATABASE OFFLINE" };

    try {
        let studentData: Student | null = null;
        
        const query = await db.collection(COLLECTION_STUDENTS).where('idUnik', '==', code).limit(1).get();
        if (!query.empty) {
            studentData = { id: query.docs[0].id, ...query.docs[0].data() } as Student;
        }

        if (!studentData) return { success: false, message: `ID "${code}" TIDAK TERDAFTAR` };

        const attendanceId = `${studentData.id}_${today}`;
        const attendanceRef = db.collection(COLLECTION_ATTENDANCE).doc(attendanceId);
        const docSnapshot = await attendanceRef.get();
        const currentData = docSnapshot?.exists ? docSnapshot.data() : null;

        if (currentData && currentData[fieldName]) {
            return { success: false, message: `SUDAH SCAN ${session.toUpperCase()}`, student: studentData };
        }

        const updatePayload: any = { 
            studentId: studentData.id,
            studentName: studentData.namaLengkap,
            class: studentData.tingkatRombel,
            idUnik: studentData.idUnik || code,
            date: today,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            [fieldName]: nowValue
        };

        // Otomatis tentukan status
        if (effectiveHaid) {
            updatePayload.status = 'Haid';
        } else if (currentData?.status && currentData.status !== 'Alpha' && currentData.status !== 'Haid') {
            updatePayload.status = currentData.status;
        } else {
            // Jika masuk lewat dari jam 07:30 simpan sebagai Terlambat di DB, tapi UI akan tampilkan sebagai Hadir
            updatePayload.status = (session === 'Masuk' && currentMinutes > startThreshold) ? 'Terlambat' : 'Hadir';
        }

        await attendanceRef.set(updatePayload, { merge: true });

        return { 
            success: true, 
            message: `${session.toUpperCase()} ${meta ? `(${meta})` : 'BERHASIL'}`, 
            student: studentData 
        };
    } catch (error: any) {
        console.error("Attendance Error:", error);
        return { success: false, message: "GANGGUAN DATABASE" };
    }
};
