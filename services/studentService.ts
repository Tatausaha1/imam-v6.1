import { db, isMockMode } from './firebase';
import { Student } from '../types';

const COLLECTION_NAME = 'students';

const MOCK_STUDENTS: Student[] = [
    {
        id: 'mock-1',
        idUnik: '15012',
        userlogin: 'adella.siswa',
        namaLengkap: 'DIENDE ADELLYA AQILLA',
        nisn: '0086806447',
        nik: '6307067005080001',
        email: 'adella@siswa.sch.id',
        tempatLahir: 'HULU SUNGAI TENGAH',
        tanggalLahir: '2008-05-30',
        tingkatRombel: '12 A',
        umur: '16 th',
        status: 'Aktif',
        jenisKelamin: 'Perempuan',
        alamat: 'Jl. Perintis Kemerdekaan..., 71315',
        noTelepon: '6285348028887',
        kebutuhanKhusus: 'Tidak',
        disabilitas: '-',
        nomorKIPP_PIP: '',
        namaAyahKandung: 'SOEJARMAN',
        namaIbuKandung: 'NURUL HASANAH',
        namaWali: 'SOEJARMAN'
    }
];

export const getStudents = async (): Promise<Student[]> => {
  if (isMockMode) {
      return new Promise(resolve => setTimeout(() => resolve(MOCK_STUDENTS), 500));
  }
  try {
    if (!db) throw new Error("Database not initialized");
    const snapshot = await db.collection(COLLECTION_NAME).orderBy('namaLengkap').get();
    
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id, 
            ...data,
            idUnik: data.idUnik || data.nisn || doc.id,
            namaLengkap: data.namaLengkap || "Siswa Tanpa Nama",
        } as Student;
    });
  } catch (error: any) {
    console.error("Error fetching students:", error);
    throw error;
  }
};

export const addStudent = async (student: Student): Promise<void> => {
  if (isMockMode) {
      console.log("Mock add student:", student);
      return;
  }
  try {
    if (!db) throw new Error("Database not initialized");
    
    // Gunakan NISN sebagai ID Dokumen agar unik dan mudah dicari scanner
    const docId = student.nisn || db.collection(COLLECTION_NAME).doc().id;
    const finalData = {
        ...student,
        idUnik: student.idUnik || student.nisn || docId,
        createdAt: new Date().toISOString()
    };
    
    await db.collection(COLLECTION_NAME).doc(docId).set(finalData, { merge: true });
  } catch (error) {
    console.error("Error adding student:", error);
    throw error;
  }
};

export const updateStudent = async (id: string, student: Partial<Student>): Promise<void> => {
    if (isMockMode) {
        console.log("Mock update student:", id, student);
        return;
    }
    try {
        if (!db) throw new Error("Database not initialized");
        // Pastikan idUnik tetap sinkron jika NISN berubah
        const updateData = { ...student };
        if (student.nisn && !student.idUnik) {
            updateData.idUnik = student.nisn;
        }
        await db.collection(COLLECTION_NAME).doc(id).update(updateData);
    } catch (error) {
        console.error("Error updating student", error);
        throw error;
    }
}

export const deleteStudent = async (id: string): Promise<void> => {
    if (isMockMode) {
        console.log("Mock delete student:", id);
        return;
    }
    try {
        if (!db) throw new Error("Database not initialized");
        await db.collection(COLLECTION_NAME).doc(id).delete();
    } catch (error) {
        console.error("Error deleting student", error);
        throw error;
    }
}

export const bulkImportStudents = async (students: Student[]): Promise<void> => {
  if (isMockMode) return;
  try {
    if (!db) throw new Error("Database not initialized");
    const batch = db.batch();
    students.forEach(student => {
      const docId = student.nisn || db!.collection(COLLECTION_NAME).doc().id;
      const ref = db!.collection(COLLECTION_NAME).doc(docId);
      batch.set(ref, {
          ...student,
          idUnik: student.idUnik || student.nisn || docId
      }, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    console.error("Error bulk importing:", error);
    throw error;
  }
};