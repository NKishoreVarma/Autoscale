import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Logs admin actions into the auditLogs collection.
 * 
 * @param {string} userEmail - Email of the admin performing the action
 * @param {string} role - Role of the admin performing the action
 * @param {string} action - The action performed (e.g., "Updated SMTP Settings", "Created User")
 * @param {string} targetCollection - The collection target of the action
 * @param {string} targetDocument - The document target of the action (id, name, or description)
 * @param {string} details - Additional human-readable details of the action
 */
export async function logAuditAction(userEmail, role, action, targetCollection, targetDocument, details = '') {
  try {
    console.log(`[AuditLogger] Logging action: "${action}" on collection: "${targetCollection}" by ${userEmail} (${role})`);
    
    await addDoc(collection(db, 'auditLogs'), {
      userEmail: userEmail || 'unknown@autoscale.systems',
      role: role || 'viewer',
      action: action,
      targetCollection: targetCollection || '',
      targetDocument: targetDocument || '',
      details: details,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error('[AuditLogger] Failed to write audit log:', err);
  }
}
