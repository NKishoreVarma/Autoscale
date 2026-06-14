import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  query,
  serverTimestamp
} from 'firebase/firestore';

/**
 * Real-time listener for a Firestore collection.
 * @param {string} collectionName - The Firestore collection name.
 * @param {Array} queryConstraints - Array of Firestore query constraints (where, orderBy, limit, etc.)
 * @returns {{ data: Array, loading: boolean, error: string|null }}
 */
export function useCollection(collectionName, queryConstraints = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!collectionName) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let q;
    try {
      const collRef = collection(db, collectionName);
      q = queryConstraints.length > 0
        ? query(collRef, ...queryConstraints)
        : collRef;
    } catch (e) {
      console.error(`Error building query for ${collectionName}:`, e);
      setError(e.message);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        setData(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`Error listening to ${collectionName}:`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
    // Serialize constraints for dependency tracking
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, JSON.stringify(queryConstraints.map(c => c.type || 'constraint'))]);

  return { data, loading, error };
}

/**
 * Real-time listener for a single Firestore document.
 * @param {string} collectionName - The Firestore collection name.
 * @param {string} docId - The document ID.
 * @returns {{ data: Object|null, loading: boolean, error: string|null }}
 */
export function useDocument(collectionName, docId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!collectionName || !docId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const docRef = doc(db, collectionName, docId);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setData({ id: docSnap.id, ...docSnap.data() });
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`Error listening to ${collectionName}/${docId}:`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, docId]);

  return { data, loading, error };
}

/**
 * Add a new document to a Firestore collection with serverTimestamp.
 * @param {string} collectionName - The Firestore collection name.
 * @param {Object} data - The document data.
 * @returns {Promise<string>} - The new document ID.
 */
export async function addDocument(collectionName, data) {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

/**
 * Update an existing Firestore document.
 * @param {string} collectionName - The Firestore collection name.
 * @param {string} docId - The document ID.
 * @param {Object} data - The fields to update.
 */
export async function updateDocument(collectionName, docId, data) {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

/**
 * Delete a Firestore document.
 * @param {string} collectionName - The Firestore collection name.
 * @param {string} docId - The document ID.
 */
export async function deleteDocument(collectionName, docId) {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}
