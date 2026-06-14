/**
 * Neutralizes potentially dangerous HTML inputs to prevent Cross-Site Scripting (XSS).
 * Strips script blocks, javascript: protocol links, and inline Event listeners.
 * 
 * @param {any} value - The input value to sanitize.
 * @returns {any} - The sanitized string or original value.
 */
export function sanitizeInput(value) {
  if (typeof value !== 'string') {
    return value;
  }
  
  return value
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/<[^>]*>/g, ''); // strip remaining HTML brackets to be completely safe in plain text
}
