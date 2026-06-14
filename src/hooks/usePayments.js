import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

/**
 * Real-time listener on the payments collection with computed aggregates.
 * @returns {{ payments: Array, loading: boolean, error: string|null, monthlyRevenue: number, yearlyRevenue: number, outstandingAmount: number }}
 */
export function usePayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'payments'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const paymentList = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        setPayments(paymentList);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error listening to payments:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Calculate aggregates from payment data
  const { monthlyRevenue, yearlyRevenue, outstandingAmount } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let monthly = 0;
    let yearly = 0;
    let outstanding = 0;

    payments.forEach((payment) => {
      const amount = parseFloat(payment.amount) || 0;

      // Determine payment date
      let paymentDate = null;
      if (payment.paymentDate?.toDate) {
        paymentDate = payment.paymentDate.toDate();
      } else if (payment.createdAt?.toDate) {
        paymentDate = payment.createdAt.toDate();
      } else if (payment.paymentDate) {
        paymentDate = new Date(payment.paymentDate);
      }

      if (payment.status === 'Paid' || payment.status === 'paid') {
        // Count toward revenue
        if (paymentDate) {
          if (paymentDate.getFullYear() === currentYear) {
            yearly += amount;
            if (paymentDate.getMonth() === currentMonth) {
              monthly += amount;
            }
          }
        }
      } else if (
        payment.status === 'Pending' ||
        payment.status === 'pending' ||
        payment.status === 'Overdue' ||
        payment.status === 'overdue' ||
        payment.status === 'Partial' ||
        payment.status === 'partial'
      ) {
        // Outstanding
        const paidAmount = parseFloat(payment.paidAmount) || 0;
        outstanding += amount - paidAmount;
      }
    });

    return {
      monthlyRevenue: monthly,
      yearlyRevenue: yearly,
      outstandingAmount: outstanding
    };
  }, [payments]);

  return { payments, loading, error, monthlyRevenue, yearlyRevenue, outstandingAmount };
}

/**
 * Create a new payment document.
 * @param {Object} paymentData - The payment data.
 * @returns {Promise<string>} - The new payment document ID.
 */
export async function createPayment(paymentData) {
  const docRef = await addDoc(collection(db, 'payments'), {
    ...paymentData,
    amount: parseFloat(paymentData.amount) || 0,
    paidAmount: parseFloat(paymentData.paidAmount) || 0,
    status: paymentData.status || 'Pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}

/**
 * Update an existing payment document.
 * @param {string} paymentId - The payment document ID.
 * @param {Object} updates - The fields to update.
 */
export async function updatePayment(paymentId, updates) {
  const docRef = doc(db, 'payments', paymentId);

  const cleanUpdates = { ...updates };
  if (cleanUpdates.amount !== undefined) {
    cleanUpdates.amount = parseFloat(cleanUpdates.amount) || 0;
  }
  if (cleanUpdates.paidAmount !== undefined) {
    cleanUpdates.paidAmount = parseFloat(cleanUpdates.paidAmount) || 0;
  }

  await updateDoc(docRef, {
    ...cleanUpdates,
    updatedAt: serverTimestamp()
  });
}
