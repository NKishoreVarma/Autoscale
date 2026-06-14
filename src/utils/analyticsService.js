import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Persists aggregated metrics to analytics/dashboard document.
 */
export async function saveDashboardMetrics(metrics) {
  try {
    const docRef = doc(db, 'analytics', 'dashboard');
    await setDoc(docRef, {
      ...metrics,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log('[AnalyticsService] Dashboard metrics persisted successfully to analytics/dashboard.');
  } catch (err) {
    console.error('[AnalyticsService] Failed to persist dashboard metrics:', err);
  }
}
