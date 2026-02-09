/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import firebase from 'firebase/compat/app';
import { db, isMockMode } from './firebase';
// Fix: Using subpath import for format to resolve export member error
import format from 'date-fns/format';
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
const COLLECTION_ACADEMIC_YEARS = 'academic_years';

const getActiveSessionConfig = async () => {
    if (isMockMode || !db) return null;
    try {
        const snap = await db.collection(COLLECTION_ACADEMIC_YEARS).where('isActive', '==', true).limit(1).get();
        if (snap.empty) return null;
        return snap.docs[0].data().config || null;
    } catch (e) { return null; }
};

export const recordAttendanceByScan = async (rawCode: string, session: AttendanceSession, isHaid: boolean = false): Promise<ScanResult> => {
    const code = String(rawCode || '').trim();
    if (!code) return { success: false, message: "KODE QR KOSONG" };

    const now = new Date();
    const today = format(now, "yyyy-MM-dd");
    const timestamp = format(now, "HH:mm:ss");
    const currentDay = now.getDay(); 
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const config = await getActiveSessionConfig();
    if (config?.workingDays && !config.workingDays.includes(currentDay)) {
        return { success: false, message: "HARI INI LIBUR SISTEM" };
    }

    const toMin = (timeStr: string) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    const mLimit = toMin(config?.masukLimit || "07:30");
    let pLimitStr = config?.pulangLimit || "16:00";
    if (currentDay === 5) pLimitStr = config?.pulangLimitJumat || "11:30";
    const pLimit = toMin(pLimitStr);

    const isPrayerSession = ['Duha', 'Zuhur', 'Ashar'].includes(session);
    
    let saveValue = timestamp;
    let meta = "";

    if (isHaid && isPrayerSession) {
        meta = "H";
    } else if (session === 'Masuk' && currentMinutes > mLimit) {
        meta = `+${currentMinutes - mLimit}`;
    } else if (session === 'Pulang' && currentMinutes < pLimit) {
        meta = `-${pLimit - currentMinutes}`;
    }

    if (meta) saveValue = `${timestamp} | ${meta}`;
    
    const fieldMap: Record<string, string> = {
        'Masuk': 'checkIn', 'Duha': 'duha', 'Zuhur': 'zuhur', 'Ashar': 'ashar', 'Pulang': 'checkOut'
    };
    const fieldName = fieldMap[session];

    if (isMockMode) return { success: true, message: `${session.toUpperCase()} BERHASIL (MOCK)`, student: { namaLengkap: "SISWA SIMULASI" } as any };
    if (!db) return { success: false, message: "DATABASE OFFLINE" };

    try {
        let studentData: Student | null = null;
        const docRef = db.collection(COLLECTION_STUDENTS).doc(code);
        const docSnap = await docRef.get();
        
        if (docSnap.exists) {
            studentData = { id: docSnap.id, ...docSnap.data() } as Student;
        } else {
            const query = await db.collection(COLLECTION_STUDENTS).where('idUnik', '==', code).limit(1).get();
            if (!query.empty) studentData = { id: query.docs[0].id, ...query.docs[0].data() } as Student;
        }

        if (!studentData) return { success: false, message: "ID TIDAK DIKENAL SISTEM" };

        const attendanceId = `${studentData.id}_${today}`;
        const attendanceRef = db.collection(COLLECTION_ATTENDANCE).doc(attendanceId);
        const currentAttSnap = await attendanceRef.get();
        const currentData = currentAttSnap.exists ? currentAttSnap.data() : null;

        if (currentData && currentData[fieldName]) {
            return { success: false, message: `SUDAH SCAN ${session.toUpperCase()}!`, student: studentData };
        }

        const updatePayload: any = { 
            studentId: studentData.id,
            studentName: studentData.namaLengkap,
            class: studentData.tingkatRombel || '-',
            idUnik: studentData.idUnik || code,
            gender: studentData.jenisKelamin,
            date: today,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            [fieldName]: saveValue
        };

        // Logic Status Harian
        if (meta === 'H') {
            updatePayload.status = 'Haid';
        } else if (!currentData?.status || currentData.status === 'Alpha' || currentData.status === 'Hadir') {
             if (session === 'Masuk') {
                 updatePayload.status = (currentMinutes > mLimit) ? 'Terlambat' : 'Hadir';
             } else {
                 updatePayload.status = currentData?.status || 'Hadir';
             }
        }

        await attendanceRef.set(updatePayload, { merge: true });
        
        let returnMsg = `${session.toUpperCase()} BERHASIL`;
        if (meta === 'H') returnMsg = `${session.toUpperCase()} (HAID) BERHASIL`;
        else if (meta.includes('+')) returnMsg = `${session.toUpperCase()} (TERLAMBAT) BERHASIL`;

        return { 
            success: true, 
            message: returnMsg, 
            student: studentData 
        };
    } catch (error: any) {
        console.error("Attendance Sync Error:", error);
        return { success: false, message: "ERROR SINKRONISASI CLOUD" };
    }
};