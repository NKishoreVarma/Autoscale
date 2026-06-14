import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

/**
 * Real-time listener on the projects collection, ordered by createdAt descending.
 * @returns {{ projects: Array, loading: boolean, error: string|null }}
 */
export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'projects'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const projectList = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        setProjects(projectList);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error listening to projects:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { projects, loading, error };
}

/**
 * Create a new project document.
 * @param {Object} projectData - The project data.
 * @returns {Promise<string>} - The new project document ID.
 */
export async function createProject(projectData) {
  const docRef = await addDoc(collection(db, 'projects'), {
    ...projectData,
    status: projectData.status || 'Planning',
    progress: projectData.progress || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}

/**
 * Update an existing project document.
 * @param {string} projectId - The project document ID.
 * @param {Object} updates - The fields to update.
 */
export async function updateProject(projectId, updates) {
  const docRef = doc(db, 'projects', projectId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

/**
 * Delete a project document.
 * @param {string} projectId - The project document ID.
 */
export async function deleteProject(projectId) {
  const docRef = doc(db, 'projects', projectId);
  await deleteDoc(docRef);
}

/**
 * Update only the status of a project.
 * @param {string} projectId - The project document ID.
 * @param {string} newStatus - The new status value (Planning, In Progress, Review, Completed, On Hold, Cancelled).
 */
export async function updateProjectStatus(projectId, newStatus) {
  const docRef = doc(db, 'projects', projectId);
  await updateDoc(docRef, {
    status: newStatus,
    updatedAt: serverTimestamp()
  });
}

/**
 * Update only the progress of a project.
 * @param {string} projectId - The project document ID.
 * @param {number} progress - The progress value (0-100).
 */
export async function updateProjectProgress(projectId, progress) {
  const docRef = doc(db, 'projects', projectId);
  await updateDoc(docRef, {
    progress: Math.min(100, Math.max(0, progress)),
    updatedAt: serverTimestamp()
  });
}
