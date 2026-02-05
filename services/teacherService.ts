/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import { db, isMockMode } from './firebase';
import { Teacher } from '../types';

const COLLECTION_NAME = 'guru';

export const getTeachers = async (): Promise<Teacher[]> => {
  if (isMockMode) return [];
  try {
    if (!db) throw new Error("Database not initialized");
    const snapshot = await db.collection(COLLECTION_NAME).orderBy('name').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher));
  } catch (error: any) {
    console.error("Error fetching teachers:", error);
    throw error;
  }
};

export const addTeacher = async (teacher: Teacher): Promise<void> => {
  if (isMockMode) return;
  try {
    if (!db) throw new Error("Database not initialized");
    await db.collection(COLLECTION_NAME).add(teacher);
  } catch (error) {
    console.error("Error adding teacher:", error);
    throw error;
  }
};

export const updateTeacher = async (id: string, teacher: Partial<Teacher>): Promise<void> => {
    if (isMockMode) return;
    try {
        if (!db) throw new Error("Database not initialized");
        await db.collection(COLLECTION_NAME).doc(id).update(teacher);
    } catch (error) {
        throw error;
    }
}

export const deleteTeacher = async (id: string): Promise<void> => {
    if (isMockMode) return;
    try {
        if (!db) throw new Error("Database not initialized");
        await db.collection(COLLECTION_NAME).doc(id).delete();
    } catch (error) {
        throw error;
    }
}

// Fix: Added bulkImportTeachers implementation to fix import errors in components/TeacherData.tsx
export const bulkImportTeachers = async (teachers: Teacher[]): Promise<void> => {
  if (isMockMode) return;
  try {
    if (!db) throw new Error("Database not initialized");
    const batch = db.batch();
    teachers.forEach(teacher => {
      // Use nip as document ID if available to prevent duplicates, otherwise generate one
      const docId = teacher.nip || db!.collection(COLLECTION_NAME).doc().id;
      const ref = db!.collection(COLLECTION_NAME).doc(docId);
      batch.set(ref, { ...teacher }, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    console.error("Error bulk importing teachers:", error);
    throw error;
  }
};