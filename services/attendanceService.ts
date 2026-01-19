
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

/**
 * Mencatat kehadiran berdasarkan pemindaian ID Unik atau NISN
 * Dioptimalkan dengan proteksi rekaman ganda (Anti-Duplicate)
 */
export const recordAttendanceByScan = async (rawCode: any, session: AttendanceSession, isHaid: boolean = false): Promise<ScanResult> => {
    const code = String(rawCode || '').replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();
    
    if (!code) {
        return { success: false, message: "ID TIDAK TERBACA" };
    }

    const today = format(new Date(), "yyyy-MM-dd");
    const now = format(new Date(), "HH:mm:ss");
    const LATE_THRESHOLD = "07:30:00"; 

    const recordValue = isHaid ? "Haid" : now;
    const fieldMap: Record<AttendanceSession, string> = {
        'Masuk': 'checkIn',
        'Duha': 'duha',
        'Zuhur': 'zuhur',
        'Ashar': 'ashar',
        'Pulang': 'checkOut'
    };
    const fieldName = fieldMap[session];

    const getSuccessMessage = (sess: AttendanceSession, isLate: boolean, haid: boolean) => {
        if (haid) return `STATUS HAID BERHASIL DICATAT`;
        if (sess === 'Masuk') return isLate ? "MASUK (TERLAMBAT)" : "MASUK (TEPAT WAKTU)";
        return `${sess.toUpperCase()} BERHASIL DICATAT`;
    };

    // --- MODE SIMULASI ---
    if (isMockMode) {
        return new Promise<ScanResult>(resolve => {
            setTimeout(() => {
                if (code === "000") return resolve({ success: false, message: "ID TIDAK TERDAFTAR" });
                const isLate = session === 'Masuk' && now > LATE_THRESHOLD;
                resolve({
                    success: true,
                    message: getSuccessMessage(session, isLate, isHaid),
                    student: { namaLengkap: 'SISWA SIMULASI', tingkatRombel: 'XII IPA 1', idUnik: code, jenisKelamin: 'Perempuan' } as any,
                    timestamp: recordValue,
                    statusRecorded: isHaid ? 'Haid' : (isLate ? 'Terlambat' : 'Hadir')
                });
            }, 300);
        });
    }

    if (!db) return { success: false, message: "DATABASE OFFLINE" };

    try {
        // 1. Cari Siswa
        let studentDoc: firebase.firestore.DocumentSnapshot | null = null;
        const qIdUnik = await db.collection('students').where('idUnik', '==', code).limit(1).get();
        
        if (!qIdUnik.empty) {
            studentDoc = qIdUnik.docs[0];
        } else {
            const qNisn = await db.collection('students').where('nisn', '==', code).limit(1).get();
            if (!qNisn.empty) studentDoc = qNisn.docs[0];
        }

        if (!studentDoc || !studentDoc.exists) {
            return { success: false, message: `ID "${code}" TIDAK DIKENALI` };
        }

        const studentData = { id: studentDoc.id, ...studentDoc.data() } as Student;

        // 2. Validasi Gender untuk Mode Haid
        if (isHaid && studentData.jenisKelamin === 'Laki-laki') {
            return { success: false, message: "MODE HAID HANYA UNTUK PEREMPUAN", student: studentData };
        }

        const attendanceId = `${studentData.id}_${today}`;
        const attendanceRef = db.collection('attendance').doc(attendanceId);
        const docSnapshot = await attendanceRef.get();
        const currentData = docSnapshot.data();

        // --- 3. PROTEKSI REKAMAN GANDA (REALTIME CHECK) ---
        if (docSnapshot.exists && currentData) {
            // Cek jika sudah Haid (Maka tidak perlu absen Duha/Zuhur/Ashar lagi)
            if (currentData.status === 'Haid' && isHaid) {
                return { success: false, message: "STATUS HAID SUDAH TEREKAM", student: studentData };
            }

            // Cek jika sesi ini sudah pernah discan
            if (currentData[fieldName] && currentData[fieldName] !== 'Alpha') {
                return { success: false, message: `ANDA SUDAH ABSEN ${session.toUpperCase()}`, student: studentData };
            }
        }

        // 4. Proses Simpan
        const isLate = session === 'Masuk' && now > LATE_THRESHOLD;
        const updatePayload: any = { 
            [fieldName]: recordValue,
            studentId: studentData.id,
            studentName: studentData.namaLengkap,
            class: studentData.tingkatRombel,
            idUnik: studentData.idUnik || studentData.nisn || code,
            date: today,
            gender: studentData.jenisKelamin,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (docSnapshot.exists && currentData) {
            if (isHaid) updatePayload.status = 'Haid';
            else if (session === 'Masuk' && !currentData.status) updatePayload.status = isLate ? 'Terlambat' : 'Hadir';
            await attendanceRef.update(updatePayload);
        } else {
            updatePayload.status = isHaid ? 'Haid' : (isLate ? 'Terlambat' : 'Hadir');
            await attendanceRef.set(updatePayload);
        }

        return {
            success: true,
            message: getSuccessMessage(session, isLate, isHaid),
            student: studentData,
            timestamp: recordValue,
            statusRecorded: updatePayload.status || 'Hadir'
        };

    } catch (error: any) {
        console.error("Attendance Error:", error);
        return { success: false, message: "GAGAL MENGHUBUNGI SERVER" };
    }
};
