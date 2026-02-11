
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

export const recordAttendanceByScan = async (code: string, session: AttendanceSession, isHaid: boolean = false): Promise<any> => {
    const rawId = String(code || '').trim();
    if (!rawId || !db) return { success: false, message: "ID TIDAK VALID" };

    const today = format(new Date(), "yyyy-MM-dd");
    
    try {
        let studentData: Student | null = null;
        
        // --- LAYER 1: DIRECT ACCESS (Paling Hemat) ---
        const refById = db.collection(COLLECTION_STUDENTS).doc(rawId);
        const snapById = await refById.get();
        
        if (snapById.exists) {
            studentData = { id: snapById.id, ...snapById.data() } as Student;
        } else {
            // --- LAYER 2: INDEXED QUERY (idUnik) ---
            const snapByUnik = await db.collection(COLLECTION_STUDENTS).where('idUnik', '==', rawId).limit(1).get();
            if (!snapByUnik.empty) {
                const doc = snapByUnik.docs[0];
                studentData = { id: doc.id, ...doc.data() } as Student;
            } else {
                // --- LAYER 3: FALLBACK (nisn) ---
                const snapByNisn = await db.collection(COLLECTION_STUDENTS).where('nisn', '==', rawId).limit(1).get();
                if (!snapByNisn.empty) {
                    const doc = snapByNisn.docs[0];
                    studentData = { id: doc.id, ...doc.data() } as Student;
                }
            }
        }

        if (!studentData) return { success: false, message: "DATA TIDAK DITEMUKAN" };

        const attId = `${studentData.id}_${today}`;
        const attRef = db.collection(COLLECTION_ATTENDANCE).doc(attId);
        const attSnap = await attRef.get();

        const fieldMap: any = { 'Masuk': 'checkIn', 'Duha': 'duha', 'Zuhur': 'zuhur', 'Ashar': 'ashar', 'Pulang': 'checkOut' };
        const fieldName = fieldMap[session];

        if (attSnap.exists && attSnap.data()?.[fieldName]) {
            return { success: false, message: "SUDAH ABSEN SESI INI" };
        }

        const nowTime = format(new Date(), "HH:mm:ss");
        const payload: any = {
            studentId: studentData.id,
            studentName: studentData.namaLengkap,
            class: studentData.tingkatRombel || '-',
            date: today,
            status: isHaid ? 'Haid' : 'Hadir',
            [fieldName]: isHaid ? `${nowTime} | H` : nowTime,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        // --- TRANSACTION / BATCH BIAYA RENDAH ---
        const batch = db.batch();
        batch.set(attRef, payload, { merge: true });

        // Update Agregasi Statistik (Hanya dilakukan pada scan 'Masuk' untuk hitung kehadiran harian)
        if (session === 'Masuk' && !isHaid) {
            const statsRef = db.doc(STATS_DOC);
            batch.set(statsRef, {
                dailyStats: {
                    [today]: {
                        presentCount: firebase.firestore.FieldValue.increment(1)
                    }
                }
            }, { merge: true });
        }

        await batch.commit();
        return { success: true, message: "PRESENSI BERHASIL", student: studentData };

    } catch (error: any) {
        return { success: false, message: "GANGGUAN KONEKSI" };
    }
};
