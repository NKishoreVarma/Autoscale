import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Logs a business operating system activity/event into Firestore activity_logs collection.
 * 
 * @param {string} type - Event type (e.g., 'lead_created', 'proposal_sent', 'client_won', 'invoice_paid', 'project_created', 'task_completed')
 * @param {string} title - Short title describing the event
 * @param {string} description - Details of the event
 * @param {object} metadata - Extra context/key values
 */
export async function logActivity(type, title, description, metadata = {}) {
  try {
    console.log(`[Activity Logger] Logging event "${title}" of type "${type}"`);
    await addDoc(collection(db, 'activity_logs'), {
      type,
      title,
      description,
      metadata,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error('[Activity Logger] Failed to log activity event:', err);
  }
}
