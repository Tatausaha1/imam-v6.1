
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
const COLLECTION_ACADEMIC_YEARS = 'academic_years';

const getActiveSessionConfig = async () => {
    if (isMockMode || !db) return null;
    try {
        const snap = await db.collection(COLLECTION_ACADEMIC_YEARS).where('isActive', '==', true).limit(1).get();
        if (snap.empty) return null;
        const data = snap.docs[0].data();
        return data.config || null;
    } catch (e) {
        return null;
    }
};

export const recordAttendanceByScan = async (rawCode: string, session: AttendanceSession, isHaid: boolean = false): Promise<ScanResult> => {
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

    const isPrayerSession = ['Duha', 'Zuhur', 'Ashar'].includes(session);
    
    // FORMAT PENYIMPANAN TERPADU: HH:mm:ss | [META]
    let nowValue = nowFull;
    let meta = "";

    if (isHaid && isPrayerSession) {
        meta = "H";
    } else if (session === 'Masuk' && currentMinutes > masukLimit) {
        meta = `+${currentMinutes - masukLimit}`;
    } else if (session === 'Pulang' && currentMinutes < pulangLimit) {
        meta = `-${pulangLimit - currentMinutes}`;
    }

    if (meta) {
        nowValue = `${nowFull} | ${meta}`;
    }
    
    const fieldMap: Record<string, string> = {
        'Masuk': 'checkIn', 'Duha': 'duha', 'Zuhur': 'zuhur', 'Ashar': 'ashar', 'Pulang': 'checkOut'
    };
    const fieldName = fieldMap[session];

    if (isMockMode) return { success: true, message: "BERHASIL (MOCK)", student: { namaLengkap: "Siswa Simulasi" } as any };
    if (!db) return { success: false, message: "DATABASE OFFLINE" };

    try {
        let studentData: Student | null = null;
        const studentRef = db.collection(COLLECTION_STUDENTS).doc(code);
        const studentSnap = await studentRef.get();
        
        if (studentSnap.exists) {
            studentData = { id: studentSnap.id, ...studentSnap.data() } as Student;
        } else {
            const query = await db.collection(COLLECTION_STUDENTS).where('idUnik', '==', code).limit(1).get();
            if (!query.empty) studentData = { id: query.docs[0].id, ...query.docs[0].data() } as Student;
        }

        if (!studentData) return { success: false, message: `ID "${code}" TIDAK ADA` };

        const attendanceId = `${studentData.id}_${today}`;
        const attendanceRef = db.collection(COLLECTION_ATTENDANCE).doc(attendanceId);
        const docSnapshot = await attendanceRef.get();
        const currentData = docSnapshot?.exists ? docSnapshot.data() : null;

        if (currentData && currentData[fieldName]) {
            return { success: false, message: `SUDAH SCAN ${session.toUpperCase()}` };
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

        // Update status umum
        if (meta === "H") {
            updatePayload.status = 'Haid';
        } else if (!currentData?.status || currentData.status === 'Alpha' || currentData.status === 'Hadir') {
            updatePayload.status = (session === 'Masuk' && currentMinutes > masukLimit) ? 'Terlambat' : 'Hadir';
        }

        await attendanceRef.set(updatePayload, { merge: true });

        return { 
            success: true, 
            message: meta === 'H' ? `${session.toUpperCase()} (HAID)` : `${session.toUpperCase()} BERHASIL`, 
            student: studentData 
        };
    } catch (error: any) {
        return { success: false, message: "ERROR DATABASE" };
    }
};
