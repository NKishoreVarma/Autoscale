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
 * Real-time listener on the clients collection, ordered by createdAt descending.
 * @returns {{ clients: Array, loading: boolean, error: string|null }}
 */
export function useClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'clients'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const clientList = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        setClients(clientList);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error listening to clients:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { clients, loading, error };
}

/**
 * Create a new client in the clients collection.
 * @param {Object} clientData - The client data.
 * @returns {Promise<string>} - The new client document ID.
 */
export async function createClient(clientData) {
  const docRef = await addDoc(collection(db, 'clients'), {
    ...clientData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}

/**
 * Update an existing client document.
 * @param {string} clientId - The client document ID.
 * @param {Object} updates - The fields to update.
 */
export async function updateClient(clientId, updates) {
  const docRef = doc(db, 'clients', clientId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

/**
 * Delete a client document.
 * @param {string} clientId - The client document ID.
 */
export async function deleteClient(clientId) {
  const docRef = doc(db, 'clients', clientId);
  await deleteDoc(docRef);
}

/**
 * Convert a lead to a client. Creates a new client document from lead data
 * and updates the lead status to 'Won'.
 * @param {Object} lead - The lead object (must include id, name, email, phone, company, etc.)
 * @returns {Promise<string>} - The new client document ID.
 */
export async function convertLeadToClient(lead) {
  // Create client document from lead data
  const clientData = {
    name: lead.name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    company: lead.company || '',
    industry: lead.industry || '',
    service: lead.service || '',
    source: 'lead',
    sourceLeadId: lead.id,
    status: 'Active',
    notes: lead.message || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'clients'), clientData);

  // Update the lead status to 'Won'
  if (lead.id) {
    const leadRef = doc(db, 'leads', lead.id);
    await updateDoc(leadRef, {
      status: 'Won',
      convertedToClientId: docRef.id,
      convertedAt: serverTimestamp()
    });
  }

  return docRef.id;
}
