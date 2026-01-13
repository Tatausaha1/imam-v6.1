
import { db, isMockMode } from './firebase';
import { format } from 'date-fns';
import { Student } from '../types';

export type AttendanceSession = 'Masuk' | 'Duha' | 'Zuhur' | 'Ashar' | 'Pulang';
export type AttendanceStatus = 'Hadir' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpha';

interface ScanResult {
    success: boolean;
    message: string;
    student?: Student;
    timestamp?: string;
    statusRecorded?: AttendanceStatus;
}

export const recordAttendanceByScan = async (rawCode: string, session: AttendanceSession): Promise<ScanResult> => {
    // 1. Normalisasi Kode (Hapus spasi yang tidak diinginkan)
    const code = (rawCode || '').trim();
    
    // FIX: Validasi path kosong untuk menghindari error Firebase
    if (!code) {
        console.warn(`[AttendanceService] Gagal: Percobaan scan dengan kode kosong.`);
        return { success: false, message: "Kode QR tidak terbaca atau kosong." };
    }

    const today = format(new Date(), "yyyy-MM-dd");
    const now = format(new Date(), "HH:mm:ss");
    
    console.log(`[AttendanceService] Memproses Scan: "${code}" untuk sesi: ${session}`);

    const LATE_THRESHOLD = "07:30:00";

    const getSuccessMessage = (sess: AttendanceSession, isLate: boolean) => {
        if (sess === 'Masuk') return isLate ? "Absensi Masuk (Terlambat)" : "Absensi Masuk Berhasil";
        if (sess === 'Pulang') return "Absensi Pulang Berhasil";
        return `Ibadah ${sess} Tercatat`;
    };

    if (isMockMode) {
        return new Promise<ScanResult>(resolve => {
            setTimeout(() => {
                if (code.length > 2) {
                    const isLate = session === 'Masuk' && now > LATE_THRESHOLD;
                    const status = isLate ? 'Terlambat' : 'Hadir';
                    resolve({
                        success: true,
                        message: getSuccessMessage(session, isLate),
                        student: { id: 'mock', namaLengkap: 'Siswa Simulasi', tingkatRombel: 'XII IPA 1', nisn: code, idUnik: code } as any,
                        timestamp: now,
                        statusRecorded: status
                    });
                } else {
                    resolve({ success: false, message: `Siswa tidak ditemukan.` });
                }
            }, 500);
        });
    }

    if (!db) return { success: false, message: "Koneksi database gagal." };

    try {
        let studentData: Student | undefined;

        // --- STRATEGI PENCARIAN 3 LAPIS ---
        
        // LAPIS 1: Cari langsung berdasarkan ID Dokumen (Paling Cepat)
        const docDirect = await db.collection('students').doc(code).get();
        if (docDirect.exists) {
            studentData = { id: docDirect.id, ...docDirect.data() } as Student;
        }

        // LAPIS 2: Jika belum ketemu, cari di field idUnik
        if (!studentData) {
            const qIdUnik = await db.collection('students').where('idUnik', '==', code).limit(1).get();
            if (!qIdUnik.empty) {
                studentData = { id: qIdUnik.docs[0].id, ...qIdUnik.docs[0].data() } as Student;
            }
        }

        // LAPIS 3: Jika masih belum ketemu, cari di field nisn
        if (!studentData) {
            const qNisn = await db.collection('students').where('nisn', '==', code).limit(1).get();
            if (!qNisn.empty) {
                studentData = { id: qNisn.docs[0].id, ...qNisn.docs[0].data() } as Student;
            }
        }

        if (!studentData || !studentData.id) {
            console.warn(`[AttendanceService] Gagal: Kode "${code}" tidak ditemukan di Lapis 1, 2, atau 3.`);
            return { success: false, message: `Kode "${code}" tidak terdaftar.` };
        }

        console.log(`[AttendanceService] Siswa Ditemukan: ${studentData.namaLengkap}`);

        const attendanceId = `${studentData.id}_${today}`;
        const attendanceRef = db.collection('attendance').doc(attendanceId);
        const docSnapshot = await attendanceRef.get();
        
        const fieldMap: Record<AttendanceSession, string> = {
            'Masuk': 'checkIn',
            'Duha': 'duha',
            'Zuhur': 'zuhur',
            'Ashar': 'ashar',
            'Pulang': 'checkOut'
        };
        
        const fieldName = fieldMap[session];
        let statusRecorded: AttendanceStatus = 'Hadir';
        const isLate = session === 'Masuk' && now > LATE_THRESHOLD;

        if (session === 'Masuk') {
            statusRecorded = isLate ? 'Terlambat' : 'Hadir';
        }

        if (docSnapshot.exists) {
            const currentData = docSnapshot.data();
            const currentStatus = currentData?.status;
            
            // Perbarui status hanya jika sesi Masuk dan status sebelumnya Alpha/Hadir/Kosong
            const shouldUpdateStatus = session === 'Masuk' && (!currentStatus || currentStatus === 'Alpha' || currentStatus === 'Hadir');
            
            const updatePayload: any = { [fieldName]: now };
            if (shouldUpdateStatus) updatePayload.status = statusRecorded;

            await attendanceRef.update(updatePayload);
            if (!shouldUpdateStatus) statusRecorded = currentStatus || 'Hadir';
        } else {
            const initialStatus = session === 'Masuk' ? statusRecorded : 'Hadir';
            await attendanceRef.set({
                studentId: studentData.id,
                studentName: studentData.namaLengkap,
                class: studentData.tingkatRombel,
                date: today,
                status: initialStatus, 
                [fieldName]: now
            });
            statusRecorded = initialStatus;
        }

        return {
            success: true,
            message: getSuccessMessage(session, isLate),
            student: studentData,
            timestamp: now,
            statusRecorded: statusRecorded
        };

    } catch (error: any) {
        console.error("[AttendanceService] Scan Error Detail:", error);
        return { success: false, message: "Terjadi kesalahan sistem database." };
    }
};
