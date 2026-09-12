// Hanwha PeopleLife Daejeon Glory Security & Access Control
// Supports local fallback + real-time cloud synchronization via Firebase Firestore

import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export const AUTH_SESSION_KEY = 'hanwha_auth_session';
export const PASSWORD_STORAGE_KEY = 'hanwha_app_passcode';
export const ADMIN_PASSWORD_STORAGE_KEY = 'hanwha_admin_passcode';

// Default Passwords
export const DEFAULT_USER_PASSCODE = '0000'; // General User (FA) access
export const DEFAULT_ADMIN_PASSCODE = '7788'; // Administrator passcode
export const MASTER_RECOVERY_CODE = 'glory7788'; // Emergency hardcoded recovery

// In-memory synced state from Firestore for zero-latency lookups
let cachedUserPasscode = DEFAULT_USER_PASSCODE;
let cachedAdminPasscode = DEFAULT_ADMIN_PASSCODE;
let hasInitializedCloudSync = false;

// Initialize cached values from localStorage
try {
  const localUser = localStorage.getItem(PASSWORD_STORAGE_KEY);
  if (localUser && localUser.trim().length > 0) {
    cachedUserPasscode = localUser.trim();
  }
  const localAdmin = localStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY);
  if (localAdmin && localAdmin.trim().length > 0) {
    cachedAdminPasscode = localAdmin.trim();
  }
} catch {
  // ignore
}

/**
 * Setup Realtime Cloud Sync with Firebase Firestore
 * Listens to updates in real time so if Admin changes password,
 * all active FA devices receive the new passcode immediately.
 */
export function subscribeToSecuritySettings(
  onChange?: (data: { userPasscode: string; adminPasscode: string; updatedAt?: string }) => void
): () => void {
  const securityDocRef = doc(db, 'settings', 'security');

  const unsubscribe = onSnapshot(
    securityDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.userPasscode && typeof data.userPasscode === 'string') {
          cachedUserPasscode = data.userPasscode.trim();
          try {
            localStorage.setItem(PASSWORD_STORAGE_KEY, cachedUserPasscode);
          } catch {
            // ignore
          }
        }
        if (data.adminPasscode && typeof data.adminPasscode === 'string') {
          cachedAdminPasscode = data.adminPasscode.trim();
          try {
            localStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, cachedAdminPasscode);
          } catch {
            // ignore
          }
        }
        if (onChange) {
          onChange({
            userPasscode: cachedUserPasscode,
            adminPasscode: cachedAdminPasscode,
            updatedAt: data.updatedAt,
          });
        }
      } else {
        // Document doesn't exist yet: initialize it with default passcodes
        setDoc(
          securityDocRef,
          {
            userPasscode: cachedUserPasscode || DEFAULT_USER_PASSCODE,
            adminPasscode: cachedAdminPasscode || DEFAULT_ADMIN_PASSCODE,
            updatedAt: new Date().toISOString(),
            updatedBy: 'System Init',
          },
          { merge: true }
        ).catch((err) => {
          console.warn('Could not initialize security document in cloud:', err);
        });
      }
    },
    (err) => {
      console.warn('Firestore security sync warning (fallback to local):', err);
    }
  );

  return unsubscribe;
}

// Fetch latest from Cloud once if needed
export async function syncFromCloudNow(): Promise<{ userPasscode: string; adminPasscode: string }> {
  try {
    const securityDocRef = doc(db, 'settings', 'security');
    const snap = await getDoc(securityDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.userPasscode) {
        cachedUserPasscode = String(data.userPasscode).trim();
        localStorage.setItem(PASSWORD_STORAGE_KEY, cachedUserPasscode);
      }
      if (data.adminPasscode) {
        cachedAdminPasscode = String(data.adminPasscode).trim();
        localStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, cachedAdminPasscode);
      }
    }
  } catch (err) {
    console.warn('Failed to fetch security settings from cloud:', err);
  }
  return {
    userPasscode: cachedUserPasscode,
    adminPasscode: cachedAdminPasscode,
  };
}

// Get User (FA) Passcode
export function getStoredUserPassword(): string {
  try {
    const stored = localStorage.getItem(PASSWORD_STORAGE_KEY);
    if (stored && stored.trim().length > 0) {
      return stored.trim();
    }
  } catch {
    // ignore
  }
  return cachedUserPasscode || DEFAULT_USER_PASSCODE;
}

// Get Admin Passcode
export function getStoredAdminPassword(): string {
  try {
    const stored = localStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY);
    if (stored && stored.trim().length > 0) {
      return stored.trim();
    }
  } catch {
    // ignore
  }
  return cachedAdminPasscode || DEFAULT_ADMIN_PASSCODE;
}

// Save User (FA) Passcode to local AND Firebase Firestore
export async function saveNewUserPassword(newPass: string): Promise<boolean> {
  const cleanPass = newPass.trim();
  cachedUserPasscode = cleanPass;
  try {
    localStorage.setItem(PASSWORD_STORAGE_KEY, cleanPass);
  } catch {
    // ignore
  }

  // Push to Cloud Firestore
  try {
    const securityDocRef = doc(db, 'settings', 'security');
    await setDoc(
      securityDocRef,
      {
        userPasscode: cleanPass,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Admin (Daejeon Glory)',
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error('Failed to sync new user password to cloud:', err);
    // Even if cloud write fails, local is updated
    return true;
  }
}

// Save Admin Passcode to local AND Firebase Firestore
export async function saveNewAdminPassword(newPass: string): Promise<boolean> {
  const cleanPass = newPass.trim();
  cachedAdminPasscode = cleanPass;
  try {
    localStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, cleanPass);
  } catch {
    // ignore
  }

  // Push to Cloud Firestore
  try {
    const securityDocRef = doc(db, 'settings', 'security');
    await setDoc(
      securityDocRef,
      {
        adminPasscode: cleanPass,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Admin (Daejeon Glory)',
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error('Failed to sync new admin password to cloud:', err);
    return true;
  }
}

// Verify User or Admin for general app unlock
export function verifyUserOrAdminPassword(input: string): boolean {
  const cleanInput = input.trim();
  const userPass = getStoredUserPassword();
  const adminPass = getStoredAdminPassword();
  return (
    cleanInput === userPass ||
    cleanInput === adminPass ||
    cleanInput === cachedUserPasscode ||
    cleanInput === cachedAdminPasscode ||
    cleanInput === MASTER_RECOVERY_CODE
  );
}

// Verify Admin Passcode strictly (for accessing LOCK / password modification modal)
export function verifyAdminPassword(input: string): boolean {
  const cleanInput = input.trim();
  const adminPass = getStoredAdminPassword();
  return (
    cleanInput === adminPass ||
    cleanInput === cachedAdminPasscode ||
    cleanInput === MASTER_RECOVERY_CODE
  );
}

// Backwards compatibility aliases
export const verifyPassword = verifyUserOrAdminPassword;
export const getStoredPassword = getStoredUserPassword;
export const saveNewPassword = saveNewUserPassword;
export const DEFAULT_PASSCODE = DEFAULT_USER_PASSCODE;

// Session authentication state
export function isUserAuthenticated(): boolean {
  try {
    const local = localStorage.getItem(AUTH_SESSION_KEY);
    const session = sessionStorage.getItem(AUTH_SESSION_KEY);
    return local === 'true' || session === 'true';
  } catch {
    return false;
  }
}

export function setAuthenticated(remember: boolean): void {
  try {
    sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
    if (remember) {
      localStorage.setItem(AUTH_SESSION_KEY, 'true');
    } else {
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
  } catch {
    // ignore
  }
}

export function clearAuthentication(): void {
  try {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
  } catch {
    // ignore
  }
}
