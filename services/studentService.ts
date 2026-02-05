
import { db, isMockMode } from './firebase';
import { Student } from '../types';

const COLLECTION_NAME = 'students';

export const getStudents = async (): Promise<Student[]> => {
  if (isMockMode) return [];
  try {
    if (!db) throw new Error("Database not initialized");
    const snapshot = await db.collection(COLLECTION_NAME).orderBy('namaLengkap').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
  } catch (error: any) {
    console.error("Error fetching students:", error);
    throw error;
  }
};

/**
 * Menambahkan atau memperbarui siswa menggunakan idUnik sebagai Document ID (Primary Key)
 */
export const addStudent = async (student: Student): Promise<void> => {
  if (isMockMode) return;
  try {
    if (!db) throw new Error("Database not initialized");
    
    // VALIDASI: idUnik wajib ada karena ini adalah Primary Key
    const cleanId = student.idUnik ? String(student.idUnik).trim() : null;
    
    if (!cleanId) {
        throw new Error("ID Unik wajib diisi sebagai Primary Key sistem.");
    }
    
    await db.collection(COLLECTION_NAME).doc(cleanId).set({
        ...student,
        idUnik: cleanId,
        createdAt: student.createdAt || new Date().toISOString(),
        lastModified: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Error adding student:", error);
    throw error;
  }
};

export const updateStudent = async (id: string, student: Partial<Student>): Promise<void> => {
    if (isMockMode) return;
    try {
        if (!db) throw new Error("Database not initialized");
        await db.collection(COLLECTION_NAME).doc(id).update({
            ...student,
            lastModified: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error updating student", error);
        throw error;
    }
}

export const deleteStudent = async (id: string): Promise<void> => {
    if (isMockMode) return;
    try {
        if (!db) throw new Error("Database not initialized");
        await db.collection(COLLECTION_NAME).doc(id).delete();
    } catch (error) {
        console.error("Error deleting student", error);
        throw error;
    }
}

/**
 * Memindahkan siswa ke koleksi lain (Alumni / Mutasi)
 */
export const moveStudentToCollection = async (id: string, targetCollection: 'alumni' | 'mutasi', reason: string): Promise<void> => {
    if (isMockMode) return;
    try {
        if (!db) throw new Error("Database not initialized");
        
        const studentRef = db.collection(COLLECTION_NAME).doc(id);
        const snap = await studentRef.get();
        
        if (!snap.exists) throw new Error("Data siswa tidak ditemukan.");
        
        const data = snap.data() as Student;
        const targetRef = db.collection(targetCollection).doc(id);
        
        await targetRef.set({
            ...data,
            status: targetCollection === 'alumni' ? 'Lulus' : 'Mutasi',
            movedAt: new Date().toISOString(),
            moveReason: reason,
            lastModified: new Date().toISOString()
        });
        
        await studentRef.delete();
    } catch (error) {
        console.error(`Error moving to ${targetCollection}:`, error);
        throw error;
    }
}

export const bulkImportStudents = async (students: Student[]): Promise<void> => {
  if (isMockMode) return;
  try {
    if (!db) throw new Error("Database not initialized");
    const batch = db.batch();
    
    students.forEach(student => {
      const cleanId = String(student.idUnik || '').trim();
      if (cleanId) {
          const ref = db!.collection(COLLECTION_NAME).doc(cleanId);
          batch.set(ref, { 
              ...student, 
              idUnik: cleanId,
              lastModified: new Date().toISOString()
          }, { merge: true });
      }
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Error bulk importing:", error);
    throw error;
  }
};
