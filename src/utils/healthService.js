import { doc, getDoc } from 'firebase/firestore';
import { db, auth, storage } from '../firebase';

/**
 * Probes active services to determine live system status.
 * Returns statuses: "ONLINE", "WARNING", "OFFLINE"
 */
export async function checkSystemHealth() {
  const status = {
    firebase: 'OFFLINE',
    firestore: 'OFFLINE',
    auth: 'OFFLINE',
    storage: 'OFFLINE',
    smtp: 'WARNING',
    twilio: 'WARNING',
    website: 'ONLINE'
  };

  // 1. Check Firebase Base App
  try {
    if (auth && auth.app) {
      status.firebase = 'ONLINE';
    }
  } catch (err) {
    console.error('[HealthCheck] Firebase error:', err);
    status.firebase = 'OFFLINE';
  }

  // 2. Check Auth Gateway
  try {
    if (auth) {
      status.auth = 'ONLINE';
    }
  } catch (err) {
    status.auth = 'OFFLINE';
  }

  // 3. Check Storage
  try {
    if (storage) {
      status.storage = 'ONLINE';
    }
  } catch (err) {
    status.storage = 'OFFLINE';
  }

  // 4. Check Firestore
  try {
    const testDoc = await getDoc(doc(db, 'settings', 'company'));
    status.firestore = 'ONLINE';
  } catch (err) {
    console.error('[HealthCheck] Firestore error:', err);
    // If it's a permission error, it's still online (just restricted)
    if (err.code === 'permission-denied') {
      status.firestore = 'ONLINE';
    } else {
      status.firestore = 'OFFLINE';
    }
  }

  // 5. Check SMTP Settings
  try {
    const smtpSnap = await getDoc(doc(db, 'settings', 'smtp'));
    if (smtpSnap.exists()) {
      const data = smtpSnap.data();
      if (data.host && data.username) {
        status.smtp = 'ONLINE';
      } else {
        status.smtp = 'WARNING';
      }
    } else {
      status.smtp = 'WARNING';
    }
  } catch (err) {
    status.smtp = 'OFFLINE';
  }

  // 6. Check Twilio Settings
  try {
    const twilioSnap = await getDoc(doc(db, 'settings', 'twilio'));
    if (twilioSnap.exists()) {
      const data = twilioSnap.data();
      if (data.accountSid && data.phoneNumber) {
        status.twilio = 'ONLINE';
      } else {
        status.twilio = 'WARNING';
      }
    } else {
      status.twilio = 'WARNING';
    }
  } catch (err) {
    status.twilio = 'OFFLINE';
  }

  // 7. Check Website status
  try {
    if (typeof window !== 'undefined' && window.location) {
      status.website = 'ONLINE';
    }
  } catch (err) {
    status.website = 'OFFLINE';
  }

  return status;
}
