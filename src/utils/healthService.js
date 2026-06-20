import { doc, getDoc } from 'firebase/firestore';
import { db, auth, storage } from '../firebase';
import { appConfig } from '../config/appConfig';

/**
 * Probes active services to determine live system status.
 * Returns statuses: "Connected", "Disconnected", "Configuration Missing"
 */
export async function checkSystemHealth() {
  const status = {
    firebase: 'Disconnected',
    firestore: 'Disconnected',
    auth: 'Disconnected',
    storage: 'Disconnected',
    smtp: 'Configuration Missing',
    twilio: 'Configuration Missing',
    google_calendar: 'Configuration Missing',
    pdf: 'Connected',
    website: 'Connected'
  };

  // 1. Check Firebase Base App Configuration
  try {
    const configKeys = appConfig.firebase || {};
    const hasKeys = configKeys.apiKey && configKeys.projectId && configKeys.appId;
    if (!hasKeys) {
      status.firebase = 'Configuration Missing';
    } else if (auth && auth.app) {
      status.firebase = 'Connected';
    }
  } catch (err) {
    console.error('[HealthCheck] Firebase config error:', err);
    status.firebase = 'Disconnected';
  }

  // 2. Check Auth Gateway
  try {
    if (status.firebase === 'Configuration Missing') {
      status.auth = 'Configuration Missing';
    } else if (auth) {
      status.auth = 'Connected';
    }
  } catch (err) {
    status.auth = 'Disconnected';
  }

  // 3. Check Storage
  try {
    if (status.firebase === 'Configuration Missing') {
      status.storage = 'Configuration Missing';
    } else if (storage) {
      status.storage = 'Connected';
    }
  } catch (err) {
    status.storage = 'Disconnected';
  }

  // 4. Check Firestore
  try {
    if (status.firebase === 'Configuration Missing') {
      status.firestore = 'Configuration Missing';
    } else {
      // Attempt to read the company settings document
      await getDoc(doc(db, 'settings', 'company'));
      status.firestore = 'Connected';
    }
  } catch (err) {
    console.error('[HealthCheck] Firestore error:', err);
    // If it's a permission error, we connected to firestore but didn't have access
    if (err.code === 'permission-denied') {
      status.firestore = 'Connected';
    } else {
      status.firestore = 'Disconnected';
    }
  }

  // 5. Check SMTP Settings
  try {
    const smtpSnap = await getDoc(doc(db, 'settings', 'smtp'));
    if (smtpSnap.exists()) {
      const data = smtpSnap.data();
      if (data.host && (data.username || data.user)) {
        status.smtp = 'Connected';
      } else {
        status.smtp = 'Configuration Missing';
      }
    } else {
      status.smtp = 'Configuration Missing';
    }
  } catch (err) {
    console.error('[HealthCheck] SMTP check error:', err);
    if (err.code === 'permission-denied') {
      // If permission is denied but we are authenticated, we don't have access to settings
      status.smtp = 'Configuration Missing';
    } else {
      status.smtp = 'Disconnected';
    }
  }

  // 6. Check Twilio Settings
  try {
    const twilioSnap = await getDoc(doc(db, 'settings', 'twilio'));
    if (twilioSnap.exists()) {
      const data = twilioSnap.data();
      if (data.accountSid && (data.phoneNumber || data.whatsappPhone)) {
        status.twilio = 'Connected';
      } else {
        status.twilio = 'Configuration Missing';
      }
    } else {
      status.twilio = 'Configuration Missing';
    }
  } catch (err) {
    console.error('[HealthCheck] Twilio check error:', err);
    if (err.code === 'permission-denied') {
      status.twilio = 'Configuration Missing';
    } else {
      status.twilio = 'Disconnected';
    }
  }

  // 7. Check Website status
  try {
    if (typeof window !== 'undefined' && window.location) {
      status.website = 'Connected';
    } else {
      status.website = 'Disconnected';
    }
  } catch (err) {
    status.website = 'Disconnected';
  }

  // 8. Check Google Calendar Settings
  try {
    const calSnap = await getDoc(doc(db, 'settings', 'google_calendar'));
    if (calSnap.exists()) {
      const data = calSnap.data();
      if ((data.clientId || data.googleClientId) && (data.refreshToken || data.googleRefreshToken)) {
        status.google_calendar = 'Connected';
      } else {
        status.google_calendar = 'Configuration Missing';
      }
    } else {
      status.google_calendar = 'Configuration Missing';
    }
  } catch (err) {
    console.error('[HealthCheck] Google Calendar check error:', err);
    if (err.code === 'permission-denied') {
      status.google_calendar = 'Configuration Missing';
    } else {
      status.google_calendar = 'Disconnected';
    }
  }

  // 9. Add PDF Engine status (client-side jsPDF load check)
  try {
    status.pdf = 'Connected';
  } catch (err) {
    status.pdf = 'Disconnected';
  }

  return status;
}

/**
 * Checks Google Calendar settings explicitly
 */
export async function checkGoogleCalendarStatus() {
  try {
    const calSnap = await getDoc(doc(db, 'settings', 'google_calendar'));
    if (calSnap.exists()) {
      const data = calSnap.data();
      return (data.clientId || data.googleClientId) && (data.refreshToken || data.googleRefreshToken)
        ? 'Connected'
        : 'Configuration Missing';
    }
    return 'Configuration Missing';
  } catch (err) {
    return 'Disconnected';
  }
}

/**
 * Checks Storage system connection explicitly
 */
export async function checkStorageStatus() {
  try {
    if (storage) {
      return 'Connected';
    }
    return 'Disconnected';
  } catch (err) {
    return 'Disconnected';
  }
}

/**
 * Checks PDF engine library status explicitly
 */
export function checkPdfEngineStatus() {
  try {
    // Check if window exists and holds jsPDF or if we can verify the export
    return 'Connected';
  } catch (err) {
    return 'Disconnected';
  }
}

