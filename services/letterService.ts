
import { db, isMockMode, auth } from './firebase';
import { LetterRequest, LetterStatus, UserRole } from '../types';

const COLLECTION_NAME = 'surat';

export const getLetters = async (isAdmin: boolean): Promise<LetterRequest[]> => {
    if (isMockMode) return [];
    try {
        if (!db || !auth?.currentUser) throw new Error("Not authenticated");
        let query: any = db.collection(COLLECTION_NAME);
        if (!isAdmin) query = query.where('userId', '==', auth.currentUser.uid);
        const snapshot = await query.orderBy('date', 'desc').get();
        return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as LetterRequest));
    } catch (error: any) {
        return [];
    }
};

export const createLetterRequest = async (request: Omit<LetterRequest, 'id'>): Promise<void> => {
    if (isMockMode) return;
    try {
        if (!db) throw new Error("Database not initialized");
        await db.collection(COLLECTION_NAME).add(request);
    } catch (error) {
        throw error;
    }
};

export const updateLetterStatus = async (id: string, status: LetterStatus, data?: Partial<LetterRequest>): Promise<void> => {
    if (isMockMode) return;
    try {
        if (!db) throw new Error("Database not initialized");
        await db.collection(COLLECTION_NAME).doc(id).update({ status, ...data });
    } catch (error) {
        throw error;
    }
};

export const deleteLetter = async (id: string): Promise<void> => {
    if (isMockMode) return;
    try {
        if (!db) throw new Error("Database not initialized");
        await db.collection(COLLECTION_NAME).doc(id).delete();
    } catch (error) {
        throw error;
    }
};
