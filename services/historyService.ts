
import { db, isMockMode } from './firebase';
import { LoginHistoryEntry } from '../types';

const COLLECTION_NAME = 'login_logs';

const getDeviceName = (): string => {
    const userAgent = navigator.userAgent;
    if (/android/i.test(userAgent)) return "Android Device";
    if (/iPad|iPhone|iPod/.test(userAgent)) return "iOS Device";
    if (/windows phone/i.test(userAgent)) return "Windows Phone";
    if (/Win/i.test(userAgent)) return "Windows Desktop";
    if (/Mac/i.test(userAgent)) return "Macintosh";
    if (/Linux/i.test(userAgent)) return "Linux Desktop";
    return "Unknown Device";
};

export const logLoginEvent = async (userId: string, status: 'Success' | 'Failed' = 'Success'): Promise<void> => {
    const entry: Omit<LoginHistoryEntry, 'id'> = {
        userId,
        timestamp: new Date().toISOString(),
        device: getDeviceName(),
        ip: '127.0.0.1', // Placeholder
        status
    };

    if (isMockMode) {
        const existing = JSON.parse(localStorage.getItem('mock_login_history') || '[]');
        existing.unshift({ ...entry, id: `log-${Date.now()}` });
        localStorage.setItem('mock_login_history', JSON.stringify(existing.slice(0, 50)));
        return;
    }

    try {
        if (!db) return;
        await db.collection(COLLECTION_NAME).add(entry);
    } catch (error: any) {
        console.warn("Log login gagal disimpan ke cloud:", error.message);
        // Fallback ke local storage jika offline atau error
        const existing = JSON.parse(localStorage.getItem('local_login_history_fallback') || '[]');
        existing.unshift({ ...entry, id: `local-${Date.now()}` });
        localStorage.setItem('local_login_history_fallback', JSON.stringify(existing.slice(0, 50)));
    }
};

export const getLoginHistory = async (userId: string): Promise<LoginHistoryEntry[]> => {
    if (isMockMode) {
        const stored = localStorage.getItem('mock_login_history');
        if (stored) {
            const parsed = JSON.parse(stored);
            return parsed.filter((log: LoginHistoryEntry) => log.userId === userId || userId === 'mock-user-123');
        }
        return [];
    }

    try {
        if (!db) throw new Error("Database not initialized");
        
        // Query ini memerlukan indeks komposit: userId (ASC) + timestamp (DESC)
        const snapshot = await db.collection(COLLECTION_NAME)
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();
        
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoginHistoryEntry));
    } catch (error: any) {
        // Pesan instruksi indeks dihapus untuk kenyamanan pengguna
        console.error("Error fetching login history:", error.message);
        
        // Fallback: Ambil dari local storage jika cloud error
        const stored = localStorage.getItem('local_login_history_fallback');
        if (stored) {
            const parsed = JSON.parse(stored);
            return parsed.filter((log: any) => log.userId === userId);
        }
        
        return [];
    }
};
