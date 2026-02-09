import { db, isMockMode } from './firebase';

export interface ClassData {
    id?: string;
    name: string;
    level: string;
    gradeLevel?: string; // Alias untuk level grade
    teacherId?: string;
    teacherName?: string;
    academicYear: string;
    captainId?: string;
    captainName?: string;
    subjects?: string[];
}

const COLLECTION_NAME = 'classes';

export const addClass = async (classData: ClassData): Promise<void> => {
    if (isMockMode) return;
    try {
        if (!db) throw new Error("Database not initialized");
        
        // Jika ID disediakan manual (seperti '10_A'), gunakan sebagai Document ID
        if (classData.id) {
            const docId = classData.id;
            // Hapus properti id dari data sebelum disimpan ke dalam dokumen itu sendiri jika diinginkan, 
            // namun di sini kita biarkan untuk konsistensi data.
            await db.collection(COLLECTION_NAME).doc(docId).set(classData);
        } else {
            // Jika tidak ada ID, gunakan add() untuk ID acak
            await db.collection(COLLECTION_NAME).add(classData);
        }
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
