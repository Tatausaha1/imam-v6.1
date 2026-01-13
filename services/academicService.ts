
import { db, isMockMode, auth } from './firebase';
import { JournalEntry, Assignment } from '../types';

const JOURNAL_COLLECTION = 'journals';
const ASSIGNMENT_COLLECTION = 'assignments';

// --- MOCK DATA ---
const MOCK_JOURNALS: JournalEntry[] = [
    {
        id: 'j1',
        teacherId: 'mock-teacher-1',
        teacherName: 'Budi Santoso, S.Pd',
        className: 'X IPA 1',
        subject: 'Matematika Wajib',
        date: new Date().toISOString().split('T')[0],
        jamKe: '1-2',
        materi: 'Persamaan Linear Tiga Variabel',
        catatan: 'Siswa antusias, 2 orang izin ke UKS.'
    },
    {
        id: 'j2',
        teacherId: 'mock-teacher-1',
        teacherName: 'Budi Santoso, S.Pd',
        className: 'XI IPS 2',
        subject: 'Matematika Wajib',
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
        jamKe: '3-4',
        materi: 'Matriks dan Operasi Matriks',
        catatan: 'Kondisi kelas kondusif.'
    }
];

const MOCK_ASSIGNMENTS: Assignment[] = [
    {
        id: 'a1',
        title: 'Latihan Soal SPLTV',
        description: 'Kerjakan LKS Halaman 15 Nomor 1-5. Kumpulkan di meja Bapak besok pagi.',
        subject: 'Matematika Wajib',
        className: 'X IPA 1',
        teacherId: 'mock-teacher-1',
        teacherName: 'Budi Santoso, S.Pd',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // +2 days
        status: 'Open',
        priority: 'Medium',
        createdAt: new Date().toISOString()
    },
    {
        id: 'a2',
        title: 'Proyek Video Sejarah',
        description: 'Buat video pendek durasi 3 menit tentang sejarah proklamasi.',
        subject: 'Sejarah Indonesia',
        className: 'X IPA 1',
        teacherId: 'mock-teacher-2',
        teacherName: 'Ahmad Rizky, S.Pd',
        dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        status: 'Open',
        priority: 'High',
        createdAt: new Date().toISOString()
    }
];

// --- JOURNAL SERVICES ---

export const getJournals = async (teacherId?: string): Promise<JournalEntry[]> => {
    if (isMockMode) {
        return new Promise(resolve => setTimeout(() => resolve(MOCK_JOURNALS), 600));
    }

    try {
        if (!db) throw new Error("Database not initialized");
        
        let query: any = db.collection(JOURNAL_COLLECTION).orderBy('date', 'desc');
        
        // If a specific teacher ID is provided, filter by it. 
        // Otherwise (e.g. Admin), fetch all.
        if (teacherId) {
            query = query.where('teacherId', '==', teacherId);
        }

        const snapshot = await query.get();
        if (snapshot.empty) return [];
        
        return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as JournalEntry));
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            console.warn("Firestore permission denied for journals. Returning empty list.");
            return [];
        }
        console.error("Error fetching journals:", error);
        return [];
    }
};

export const addJournal = async (entry: Omit<JournalEntry, 'id'>): Promise<void> => {
    if (isMockMode) {
        console.log("Mock add journal:", entry);
        MOCK_JOURNALS.unshift({ ...entry, id: `j-${Date.now()}` });
        return new Promise(resolve => setTimeout(resolve, 800));
    }

    try {
        if (!db) throw new Error("Database not initialized");
        await db.collection(JOURNAL_COLLECTION).add({
            ...entry,
            createdAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error adding journal:", error);
        throw error;
    }
};

// --- ASSIGNMENT SERVICES ---

export const getAssignments = async (className?: string): Promise<Assignment[]> => {
    if (isMockMode) {
        const filtered = className 
            ? MOCK_ASSIGNMENTS.filter(a => a.className === className) 
            : MOCK_ASSIGNMENTS;
        return new Promise(resolve => setTimeout(() => resolve(filtered), 600));
    }

    try {
        if (!db) throw new Error("Database not initialized");
        
        let query: any = db.collection(ASSIGNMENT_COLLECTION).orderBy('dueDate', 'asc');
        
        if (className) {
            query = query.where('className', '==', className);
        }

        const snapshot = await query.get();
        if (snapshot.empty) return [];

        return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Assignment));
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            console.warn("Firestore permission denied for assignments. Returning empty list.");
            return [];
        }
        console.error("Error fetching assignments:", error);
        return [];
    }
};

export const addAssignment = async (assignment: Omit<Assignment, 'id' | 'createdAt'>): Promise<void> => {
    const newAssignment = {
        ...assignment,
        priority: assignment.priority || 'Medium',
        createdAt: new Date().toISOString()
    };

    if (isMockMode) {
        console.log("Mock add assignment:", assignment);
        MOCK_ASSIGNMENTS.unshift({ ...newAssignment, id: `a-${Date.now()}` });
        return new Promise(resolve => setTimeout(resolve, 800));
    }

    try {
        if (!db) throw new Error("Database not initialized");
        await db.collection(ASSIGNMENT_COLLECTION).add(newAssignment);
    } catch (error) {
        console.error("Error adding assignment:", error);
        throw error;
    }
};
