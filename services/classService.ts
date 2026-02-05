import { db, isMockMode } from './firebase';

// Fix: Changed teacherId to optional to match ClassData in types.ts and resolve assignability errors in ClassList.tsx
export interface ClassData {
    id?: string;
    name: string;
    level: string;
    teacherId?: string;
    teacherName?: string;
    academicYear: string;
    subjects?: string[];
}

const COLLECTION_NAME = 'kelas';

export const addClass = async (classData: ClassData): Promise<void> => {
    if (isMockMode) return;
    try {
        if (!db) throw new Error("Database not initialized");
        await db.collection(COLLECTION_NAME).add(classData);
    } catch (error) {
        throw error;
    }
};

export const updateClass = async (id: string, classData: Partial<ClassData>): Promise<void> => {
    if (isMockMode) return;
    try {
        if (!db) throw new Error("Database not initialized");
        await db.collection(COLLECTION_NAME).doc(id).update(classData);
    } catch (error) {
        throw error;
    }
};

export const updateClassSubjects = async (id: string, subjects: string[]): Promise<void> => {
    if (isMockMode) return;
    try {
        if (!db) throw new Error("Database not initialized");
        await db.collection(COLLECTION_NAME).doc(id).update({ subjects });
    } catch (error) {
        throw error;
    }
};

export const deleteClass = async (id: string): Promise<void> => {
    if (isMockMode) return;
    try {
        if (!db) throw new Error("Database not initialized");
        await db.collection(COLLECTION_NAME).doc(id).delete();
    } catch (error) {
        throw error;
    }
};