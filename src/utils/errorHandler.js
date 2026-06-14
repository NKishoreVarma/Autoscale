// Centralized Error Handling System for AutoScale

/**
 * Translates low-level Firebase, network, or API exceptions into user-friendly diagnostic messages.
 * 
 * @param {any} error - The caught exception.
 * @returns {string} - User-friendly localized error string.
 */
export function getFriendlyErrorMessage(error) {
  if (!error) return 'An unknown error occurred. Please try again.';

  const code = error.code || error.message || '';

  // Firebase Auth Errors
  if (code.includes('auth/configuration-not-found')) {
    return 'Authentication is not configured correctly on the backend. Please check the project setup.';
  }
  if (code.includes('auth/invalid-email') || code.includes('invalid-email')) {
    return 'The email address provided is invalid.';
  }
  if (code.includes('auth/user-disabled')) {
    return 'This user account has been disabled by administrators.';
  }
  if (code.includes('auth/user-not-found') || code.includes('auth/wrong-password')) {
    return 'Incorrect email address or password.';
  }
  if (code.includes('auth/email-already-in-use')) {
    return 'This email address is already registered.';
  }
  if (code.includes('auth/popup-closed-by-user')) {
    return 'The Google authentication popup was closed before completion. Please try again.';
  }

  // Firestore Database Errors
  if (code.includes('permission-denied') || code.includes('PERMISSION_DENIED')) {
    return 'Access Denied: You do not have the required permissions to perform this operation.';
  }
  if (code.includes('not-found') || code.includes('NOT_FOUND')) {
    return 'The requested record or resource was not found on the server.';
  }
  if (code.includes('already-exists')) {
    return 'The document or record you are trying to create already exists.';
  }

  // API / Network Errors
  if (code.includes('Failed to fetch') || code.includes('NetworkError')) {
    return 'Connection Lost: Unable to communicate with server. Please check your internet connection.';
  }
  if (code.includes('quota-exceeded') || code.includes('RESOURCE_EXHAUSTED')) {
    return 'System Quota Exceeded: Too many requests. Please wait a moment and try again.';
  }

  // Fallback
  return typeof error === 'string' ? error : error.message || 'An unexpected error occurred. Please contact support.';
}

/**
 * Global helper to dispatch a toast notification
 * 
 * @param {string} message - The message body.
 * @param {'success'|'error'|'info'|'warning'} type - The notification severity.
 */
export function triggerToast(message, type = 'info') {
  const event = new CustomEvent('toast-notify', {
    detail: { message, type }
  });
  window.dispatchEvent(event);
}
