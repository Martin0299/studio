// src/lib/security.ts
/**
 * @fileOverview Basic security utility functions for handling PIN storage and verification.
 * WARNING: This implementation uses localStorage and basic hashing, which is NOT
 * cryptographically secure for production environments. It's suitable only for
 * demonstration or low-security scenarios. For real applications, use platform-native
 * secure storage and stronger hashing/encryption methods.
 */

const PIN_HASH_KEY = 'appPinHash';
const PIN_STATUS_KEY = 'appPinStatus'; // Key to track if PIN is set

/**
 * Basic hash function (NOT cryptographically secure).
 * A simple example; replace with a proper hashing library like bcrypt or Argon2 in a real app.
 * Using native SubtleCrypto for a slightly better, but still basic, browser-based hash.
 */
async function basicHash(pin: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
    return hashHex;
  } catch (error) {
      console.error("Hashing error:", error);
      // Fallback or re-throw depending on desired behavior
      throw new Error("Could not hash PIN.");
  }
}

/**
 * Saves the hashed PIN to localStorage.
 * @param pin - The 4-digit PIN to save.
 */
export async function savePin(pin: string): Promise<void> {
  if (typeof window === 'undefined') return; // Guard against server-side execution
  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    throw new Error("Invalid PIN format. Must be 4 digits.");
  }
  try {
    const hashedPin = await basicHash(pin);
    localStorage.setItem(PIN_HASH_KEY, hashedPin);
    setPinStatus(true); // Mark PIN as set
  } catch (error) {
    console.error("Error saving PIN to localStorage:", error);
    throw error; // Re-throw the error for the caller to handle
  }
}

/**
 * Verifies a provided PIN against the stored hash.
 * @param pin - The 4-digit PIN to verify.
 * @returns True if the PIN is correct, false otherwise.
 */
export async function verifyPin(pin: string): Promise<boolean> {
  if (typeof window === 'undefined') return false; // Guard against server-side execution
   if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    return false; // Invalid format cannot match
  }
  try {
    const storedHash = localStorage.getItem(PIN_HASH_KEY);
    if (!storedHash) {
      return false; // No PIN set
    }
    const providedHash = await basicHash(pin);
    return providedHash === storedHash;
  } catch (error) {
    console.error("Error verifying PIN:", error);
    return false;
  }
}

/**
 * Clears the stored PIN hash from localStorage.
 */
export function clearPin(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PIN_HASH_KEY);
    setPinStatus(false); // Mark PIN as not set
  } catch (error) {
    console.error("Error clearing PIN from localStorage:", error);
  }
}

/**
 * Sets the PIN status flag in localStorage.
 * @param isSet - Boolean indicating whether a PIN is set.
 */
export function setPinStatus(isSet: boolean): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(PIN_STATUS_KEY, JSON.stringify(isSet));
    } catch (error) {
        console.error("Error setting PIN status in localStorage:", error);
    }
}

/**
 * Gets the PIN status flag from localStorage.
 * @returns True if a PIN is considered set, false otherwise.
 */
export function getPinStatus(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const status = localStorage.getItem(PIN_STATUS_KEY);
        // Also check if the hash actually exists for robustness
        const hashExists = !!localStorage.getItem(PIN_HASH_KEY);
        return status ? JSON.parse(status) && hashExists : false;
    } catch (error) {
        console.error("Error getting PIN status from localStorage:", error);
        return false;
    }
}

/**
 * Clears the PIN status flag from localStorage.
 */
export function clearPinStatus(): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(PIN_STATUS_KEY);
        // Optionally clear the hash too if status is cleared explicitly
        // localStorage.removeItem(PIN_HASH_KEY);
    } catch (error) {
        console.error("Error clearing PIN status from localStorage:", error);
    }
}
