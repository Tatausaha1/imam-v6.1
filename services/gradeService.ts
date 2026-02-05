
import { db, isMockMode } from './firebase';
import { StudentGrade } from '../types';

const COLLECTION_GRADES = 'nilai';
const COLLECTION_SUBJECTS = 'mapel';

export interface Subject { id: string; name: string; }

export const getSubjects = async (): Promise<Subject[]> => {
    if (isMockMode) return [];
    try {
        if (!db) throw new Error("Database not initialized");
        const snapshot = await db.collection(COLLECTION_SUBJECTS).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
    } catch (error) {
        return [];
    }
};

export const getGradesBySubject = async (subjectId: string): Promise<StudentGrade[]> => {
    if (isMockMode) return [];
    try {
        if (!db) throw new Error("Database not initialized");
        const snapshot = await db.collection(COLLECTION_GRADES).where('subjectId', '==', subjectId).get();
        return snapshot.docs.map(doc => doc.data() as StudentGrade);
    } catch (error) {
        return [];
    }
};

export const getGradesByStudent = async (studentId: string): Promise<StudentGrade[]> => {
    if (isMockMode) return [];
    try {
        if (!db) throw new Error("Database not initialized");
        const snapshot = await db.collection(COLLECTION_GRADES).where('studentId', '==', studentId).get();
        return snapshot.docs.map(doc => doc.data() as StudentGrade);
    } catch (error) {
        return [];
    }
};

export const saveStudentGrade = async (grade: StudentGrade): Promise<void> => {
    if (isMockMode) return;
    try {
        if (!db) throw new Error("Database not initialized");
        const docId = `${grade.subjectId}_${grade.studentId}`;
        const final = (grade.nilaiHarian + grade.nilaiUTS + grade.nilaiUAS) / 3;
        const gradeToSave = { ...grade, nilaiAkhir: parseFloat(final.toFixed(2)) };
        await db.collection(COLLECTION_GRADES).doc(docId).set(gradeToSave, { merge: true });
    } catch (error) {
        throw error;
    }
};
