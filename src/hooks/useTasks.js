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
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

/**
 * Real-time listener on the tasks collection.
 * Optionally filter by projectId.
 * @param {string|null} projectId - Optional project ID to filter tasks.
 * @returns {{ tasks: Array, loading: boolean, error: string|null }}
 */
export function useTasks(projectId = null) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const constraints = [orderBy('createdAt', 'desc')];

    if (projectId) {
      constraints.unshift(where('projectId', '==', projectId));
    }

    const q = query(collection(db, 'tasks'), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const taskList = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        setTasks(taskList);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error listening to tasks:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [projectId]);

  return { tasks, loading, error };
}

/**
 * Create a new task document.
 * @param {Object} taskData - The task data.
 * @returns {Promise<string>} - The new task document ID.
 */
export async function createTask(taskData) {
  const docRef = await addDoc(collection(db, 'tasks'), {
    ...taskData,
    status: taskData.status || 'To Do',
    priority: taskData.priority || 'Medium',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}

/**
 * Update an existing task document.
 * @param {string} taskId - The task document ID.
 * @param {Object} updates - The fields to update.
 */
export async function updateTask(taskId, updates) {
  const docRef = doc(db, 'tasks', taskId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

/**
 * Update only the status of a task.
 * @param {string} taskId - The task document ID.
 * @param {string} newStatus - The new status value (To Do, In Progress, Review, Done).
 */
export async function updateTaskStatus(taskId, newStatus) {
  const docRef = doc(db, 'tasks', taskId);
  const updates = {
    status: newStatus,
    updatedAt: serverTimestamp()
  };
  if (newStatus === 'Done') {
    updates.completedAt = serverTimestamp();
  }
  await updateDoc(docRef, updates);
}

/**
 * Delete a task document.
 * @param {string} taskId - The task document ID.
 */
export async function deleteTask(taskId) {
  const docRef = doc(db, 'tasks', taskId);
  await deleteDoc(docRef);
}
