
import { db, isMockMode } from './firebase';
import { Teacher } from '../types';

const COLLECTION_NAME = 'teachers';

const MOCK_TEACHERS: Teacher[] = [
    {
        id: 't1',
        name: 'Budi Santoso, S.Pd',
        nip: '198001012005011001',
        subject: 'Matematika',
        status: 'PNS',
        phone: '081234567890',
        email: 'budi@sekolah.id',
        birthDate: '1980-01-01',
        address: 'Jl. Merdeka No. 1'
    },
    {
        id: 't2',
        name: 'Siti Aminah, M.Ag',
        nip: '198505052010012003',
        subject: 'Fikih',
        status: 'PNS',
        phone: '081298765432',
        email: 'siti@sekolah.id',
        birthDate: '1985-05-05',
        address: 'Jl. Anggrek No. 5'
    },
    {
        id: 't3',
        name: 'Rina Wati, S.Si',
        nip: '-',
        subject: 'Kimia',
        status: 'Honorer',
        phone: '085211223344',
        email: 'rina@sekolah.id',
        birthDate: '1995-03-12',
        address: 'Jl. Mawar No. 12'
    },
    {
        id: 't4',
        name: 'Ahmad Rizky, S.Pd',
        nip: '199002022019031005',
        subject: 'Bahasa Inggris',
        status: 'PPPK',
        phone: '081344556677',
        email: 'ahmad@sekolah.id',
        birthDate: '1990-02-02',
        address: 'Jl. Melati No. 8'
    },
    {
        id: 't5',
        name: 'Drs. H. Syamsul Arifin',
        nip: '196808171995031002',
        subject: 'Kepala Madrasah',
        status: 'PNS',
        phone: '081122334455',
        email: 'kepsek@sekolah.id',
        birthDate: '1968-08-17',
        address: 'Jl. Utama No. 1'
    }
];

export const getTeachers = async (): Promise<Teacher[]> => {
  if (isMockMode) {
      return new Promise(resolve => setTimeout(() => resolve(MOCK_TEACHERS), 600));
  }
  try {
    if (!db) throw new Error("Database not initialized");
    const snapshot = await db.collection(COLLECTION_NAME).orderBy('name').get();
    
    if (snapshot.empty) {
        return [];
    }

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher));
  } catch (error: any) {
    if (error.code === 'permission-denied') {
        console.warn("Akses Firestore ditolak untuk guru (Permission Denied).");
        throw error;
    }
    console.error("Error fetching teachers:", error);
    throw error;
  }
};

export const addTeacher = async (teacher: Teacher): Promise<void> => {
  if (isMockMode) {
      console.log("Mock add teacher:", teacher);
      return new Promise(resolve => setTimeout(resolve, 500));
  }
  try {
    if (!db) throw new Error("Database not initialized");
    await db.collection(COLLECTION_NAME).add(teacher);
  } catch (error) {
    console.error("Error adding teacher:", error);
    throw error;
  }
};

export const updateTeacher = async (id: string, teacher: Partial<Teacher>): Promise<void> => {
    if (isMockMode) {
        console.log("Mock update teacher:", id, teacher);
        return new Promise(resolve => setTimeout(resolve, 500));
    }
    try {
        if (!db) throw new Error("Database not initialized");
        await db.collection(COLLECTION_NAME).doc(id).update(teacher);
    } catch (error) {
        console.error("Error updating teacher", error);
        throw error;
    }
}

export const deleteTeacher = async (id: string): Promise<void> => {
    if (isMockMode) {
        console.log("Mock delete teacher:", id);
        return new Promise(resolve => setTimeout(resolve, 500));
    }
    try {
        if (!db) throw new Error("Database not initialized");
        await db.collection(COLLECTION_NAME).doc(id).delete();
    } catch (error) {
        console.error("Error deleting teacher", error);
        throw error;
    }
}

export const bulkImportTeachers = async (teachers: Teacher[]): Promise<void> => {
  if (isMockMode) {
      console.log("Mock bulk import teachers:", teachers.length);
      return;
  }
  const CHUNK_SIZE = 450;
  const chunks = [];
  
  for (let i = 0; i < teachers.length; i += CHUNK_SIZE) {
    chunks.push(teachers.slice(i, i + CHUNK_SIZE));
  }

  try {
    if (!db) throw new Error("Database not initialized");
    for (const chunk of chunks) {
      const batch = db.batch();
      chunk.forEach(teacher => {
        const docRef = db!.collection(COLLECTION_NAME).doc(); // Auto ID
        batch.set(docRef, teacher);
      });
      await batch.commit();
    }
  } catch (error) {
    console.error("Error bulk importing teachers:", error);
    throw error;
  }
};
