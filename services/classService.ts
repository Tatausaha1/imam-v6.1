
import { db, isMockMode } from './firebase';

export interface ClassData {
    id?: string;
    name: string;
    teacherId: string; // ID of the homeroom teacher
    teacherName?: string; // Display name
}

const COLLECTION_NAME = 'classes';

export const addClass = async (classData: ClassData): Promise<void> => {
    if (isMockMode) {
        console.log("Mock add class:", classData);
        return new Promise(resolve => setTimeout(resolve, 500));
    }
    try {
        if (!db) throw new Error("Database not initialized");
        await db.collection(COLLECTION_NAME).add(classData);
    } catch (error) {
        console.error("Error adding class:", error);
        throw error;
    }
};

export const updateClass = async (id: string, classData: Partial<ClassData>): Promise<void> => {
    if (isMockMode) {
        console.log("Mock update class:", id, classData);
        return new Promise(resolve => setTimeout(resolve, 500));
    }
    try {
        if (!db) throw new Error("Database not initialized");
        await db.collection(COLLECTION_NAME).doc(id).update(classData);
    } catch (error) {
        console.error("Error updating class:", error);
        throw error;
    }
};

export const deleteClass = async (id: string): Promise<void> => {
    if (isMockMode) {
        console.log("Mock delete class:", id);
        return new Promise(resolve => setTimeout(resolve, 500));
    }
    try {
        if (!db) throw new Error("Database not initialized");
        await db.collection(COLLECTION_NAME).doc(id).delete();
    } catch (error) {
        console.error("Error deleting class:", error);
        throw error;
    }
};
