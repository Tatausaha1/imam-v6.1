
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
