
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import firebase from 'firebase/compat/app';
import { db, isMockMode } from './firebase';
import { Student } from '../types';

const COLLECTION_NAME = 'students';
const STATS_DOC = 'stats/summary';

export const getStudentsPaginated = async (lastDoc: any = null, limitCount: number = 20): Promise<{data: Student[], lastVisible: any}> => {
  if (isMockMode) return { data: [], lastVisible: null };
  try {
    if (!db) throw new Error("Database not initialized");
    let query = db.collection(COLLECTION_NAME).orderBy('namaLengkap').limit(limitCount);
    if (lastDoc) query = query.startAfter(lastDoc);
    const snapshot = await query.get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];
    return { data, lastVisible };
  } catch (error: any) { throw error; }
};

export const addStudent = async (student: Student): Promise<void> => {
  if (isMockMode) return;
  try {
    if (!db) throw new Error("Database not initialized");
    const cleanId = student.nisn || student.idUnik || db.collection(COLLECTION_NAME).doc().id;
    
    const batch = db.batch();
    const studentRef = db.collection(COLLECTION_NAME).doc(cleanId);
    
    batch.set(studentRef, {
        ...student,
        idUnik: student.idUnik || cleanId,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
    }, { merge: true });

    // Incremental Counter
    batch.set(db.doc(STATS_DOC), {
        totalStudents: firebase.firestore.FieldValue.increment(1)
    }, { merge: true });

    await batch.commit();
  } catch (error) { throw error; }
};

// Fix: Added updateStudent function
export const updateStudent = async (id: string, student: Partial<Student>): Promise<void> => {
  if (isMockMode) return;
  try {
    if (!db) throw new Error("Database not initialized");
    await db.collection(COLLECTION_NAME).doc(id).update({
      ...student,
      lastModified: new Date().toISOString()
    });
  } catch (error) { throw error; }
};

// Fix: Added moveStudentToCollection function for mutation/alumni workflows
export const moveStudentToCollection = async (student: Student, targetCollection: string): Promise<void> => {
    if (isMockMode) return;
    try {
        if (!db) throw new Error("Database not initialized");
        const batch = db.batch();
        const oldRef = db.collection(COLLECTION_NAME).doc(student.id!);
        const newRef = db.collection(targetCollection).doc(student.id!);

        batch.set(newRef, { 
            ...student, 
            movedAt: new Date().toISOString(),
            status: targetCollection === 'alumni' ? 'Lulus' : 'Mutasi'
        });
        batch.delete(oldRef);
        
        // Update stats
        batch.set(db.doc(STATS_DOC), {
            totalStudents: firebase.firestore.FieldValue.increment(-1)
        }, { merge: true });

        await batch.commit();
    } catch (error) { throw error; }
};

// Fix: Added bulkImportStudents function
export const bulkImportStudents = async (students: Student[]): Promise<void> => {
  if (isMockMode) return;
  try {
    if (!db) throw new Error("Database not initialized");
    const batch = db.batch();
    students.forEach(student => {
      const cleanId = student.nisn || student.idUnik || db!.collection(COLLECTION_NAME).doc().id;
      const ref = db!.collection(COLLECTION_NAME).doc(cleanId);
      batch.set(ref, {
          ...student,
          idUnik: student.idUnik || cleanId,
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString()
      }, { merge: true });
    });
    
    batch.set(db.doc(STATS_DOC), {
        totalStudents: firebase.firestore.FieldValue.increment(students.length)
    }, { merge: true });

    await batch.commit();
  } catch (error) { throw error; }
};

export const deleteStudent = async (id: string): Promise<void> => {
    if (isMockMode) return;
    try {
        if (!db) throw new Error("Database not initialized");
        const batch = db.batch();
        batch.delete(db.collection(COLLECTION_NAME).doc(id));
        batch.set(db.doc(STATS_DOC), {
            totalStudents: firebase.firestore.FieldValue.increment(-1)
        }, { merge: true });
        await batch.commit();
    } catch (error) { throw error; }
}

export const getStudents = async (): Promise<Student[]> => {
  if (isMockMode) return [];
  try {
    if (!db) throw new Error("Database not initialized");
    const snapshot = await db.collection(COLLECTION_NAME).limit(100).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
  } catch (error) { return []; }
};

export const repairStudentDatabase = async (onProgress: (msg: string) => void): Promise<number> => {
  if (isMockMode) return 0;
  try {
    if (!db) throw new Error("Database not initialized");
    onProgress("Menghitung ulang statistik master...");
    const snapshot = await db.collection(COLLECTION_NAME).get();
    const total = snapshot.size;
    await db.doc(STATS_DOC).set({ totalStudents: total }, { merge: true });
    onProgress(`Statistik diperbarui: ${total} siswa.`);
    return total;
  } catch (error: any) { throw error; }
};
