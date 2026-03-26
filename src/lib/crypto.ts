/**
 * AES-GCM encryption/decryption for seed phrase storage in localStorage.
 * Uses the Web Crypto API (browser-native, no external deps).
 */

const STORAGE_KEY = 'intent-dex-encrypted-wallet';
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  if (buffer instanceof Uint8Array) {
    return btoa(String.fromCharCode(...buffer));
  }
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

/**
 * Encrypt a seed phrase with a password and store in localStorage.
 */
export async function encryptAndStore(seedPhrase: string, password: string): Promise<void> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(seedPhrase)
  );

  const payload = {
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    data: bufferToBase64(encrypted),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

/**
 * Decrypt the stored seed phrase from localStorage using the password.
 * Returns null if nothing stored or decryption fails.
 */
export async function decryptFromStorage(password: string): Promise<string | null> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const { salt, iv, data } = JSON.parse(raw);
    const key = await deriveKey(password, base64ToBuffer(salt));

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBuffer(iv) as BufferSource },
      key,
      base64ToBuffer(data) as BufferSource
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    return null; // Wrong password or corrupted data
  }
}

/**
 * Check if an encrypted wallet exists in localStorage.
 */
export function hasStoredWallet(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * Remove stored wallet from localStorage.
 */
export function clearStoredWallet(): void {
  localStorage.removeItem(STORAGE_KEY);
}
