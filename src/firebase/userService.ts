/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { auth, db } from './config.ts';
import { handleFirestoreError, OperationType } from './errors.ts';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  authProvider: 'google' | 'password' | 'guest';
  level: number;
  xp: number;
  rank: string;
  coins: number;
  kills: number;
  deaths: number;
  matchesPlayed: number;
  matchesWon: number;
  equippedSkin: string;
  equippedHat: string;
  createdAt: string;
  updatedAt: string;
}

export function createGuestProfile(customCallsign?: string): UserProfile {
  const clean = customCallsign?.trim().replace(/[^a-zA-Z0-9_]/g, '');
  const guestTag = Math.floor(1000 + Math.random() * 9000);
  const username = clean && clean.length >= 2 ? clean.slice(0, 24) : `Guest_${guestTag}`;
  const nowIso = new Date().toISOString();
  return {
    id: `guest_${guestTag}`,
    username,
    displayName: `${username} (Guest)`,
    email: `${username.toLowerCase()}@guest.vanguard.local`,
    avatarUrl: '',
    authProvider: 'guest',
    level: 1,
    xp: 0,
    rank: 'RECRUIT',
    coins: 100,
    kills: 0,
    deaths: 0,
    matchesPlayed: 0,
    matchesWon: 0,
    equippedSkin: 'default',
    equippedHat: 'none',
    createdAt: nowIso,
    updatedAt: nowIso
  };
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Ensures a user document exists in Firestore. If new, populates with starter stats.
 */
export async function ensureUserProfile(user: User, customUsername?: string): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const path = `users/${user.uid}`;

  try {
    const snap = await getDoc(userRef);
    const nowIso = new Date().toISOString();

    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      return data;
    }

    // Determine friendly username
    let chosenUsername = customUsername?.trim();
    if (!chosenUsername) {
      if (user.displayName) {
        chosenUsername = user.displayName.split(' ')[0].replace(/[^a-zA-Z0-9_]/g, '');
      } else if (user.email) {
        chosenUsername = user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
      }
    }
    if (!chosenUsername || chosenUsername.length < 2) {
      chosenUsername = `Operator_${user.uid.slice(0, 5)}`;
    }
    if (chosenUsername.length > 24) {
      chosenUsername = chosenUsername.slice(0, 24);
    }

    const newProfile: UserProfile = {
      id: user.uid,
      username: chosenUsername,
      displayName: user.displayName || chosenUsername,
      email: user.email || `${chosenUsername.toLowerCase()}@vanguard.fps`,
      avatarUrl: user.photoURL || '',
      authProvider: user.providerData.some(p => p.providerId === 'google.com') ? 'google' : 'password',
      level: 1,
      xp: 0,
      rank: 'RECRUIT',
      coins: 100, // Starter signing bonus!
      kills: 0,
      deaths: 0,
      matchesPlayed: 0,
      matchesWon: 0,
      equippedSkin: 'default',
      equippedHat: 'none',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    await setDoc(userRef, newProfile);
    return newProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Primary pre-authorized applet URL used as secure bridge when running on custom subdomains like ominx-vanguard-fps.ai.studio
const PRE_AUTHORIZED_APPLET_URL = 'https://ais-pre-kxn27e3oa4c67wpyez6y7g-194978851223.europe-west1.run.app';

/**
 * Opens a secure authentication bridge popup hosted on an authorized domain to authenticate
 * via Google, then transmits the verified credential back via postMessage.
 */
export function loginViaAuthBridge(): Promise<UserProfile> {
  return new Promise((resolve, reject) => {
    const originParam = encodeURIComponent(window.location.origin);
    const bridgeUrl = `${PRE_AUTHORIZED_APPLET_URL}/auth-bridge.html?origin=${originParam}&auto=1`;

    const width = 500;
    const height = 640;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));

    const popup = window.open(
      bridgeUrl,
      'VanguardGoogleAuthBridge',
      `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
    );

    if (!popup || popup.closed) {
      const customErr: any = new Error(
        'Popup was blocked by your browser. Please allow popups or add ominx-vanguard-fps.ai.studio to Firebase Authorized Domains.'
      );
      customErr.code = 'auth/unauthorized-domain';
      customErr.domain = window.location.hostname;
      reject(customErr);
      return;
    }

    let resolved = false;

    const messageHandler = async (event: MessageEvent) => {
      // Security check: verify event data type
      if (event.data?.type === 'VANGUARD_AUTH_BRIDGE_SUCCESS') {
        const { idToken, accessToken } = event.data;
        cleanup();
        try {
          if (!idToken) {
            throw new Error('No Google token received from Auth Bridge.');
          }
          const cred = GoogleAuthProvider.credential(idToken, accessToken);
          const userCred = await signInWithCredential(auth, cred);
          const profile = await ensureUserProfile(userCred.user);
          resolved = true;
          resolve(profile);
        } catch (signInErr) {
          reject(signInErr);
        }
      } else if (event.data?.type === 'VANGUARD_AUTH_BRIDGE_ERROR') {
        cleanup();
        const err: any = new Error(event.data.error || 'Authentication bridge failed.');
        err.code = event.data.code;
        reject(err);
      }
    };

    const timer = setInterval(() => {
      if (popup.closed && !resolved) {
        cleanup();
        const cancelErr: any = new Error('Google sign-in window was closed.');
        cancelErr.code = 'auth/popup-closed-by-user';
        reject(cancelErr);
      }
    }, 1000);

    const cleanup = () => {
      window.removeEventListener('message', messageHandler);
      clearInterval(timer);
    };

    window.addEventListener('message', messageHandler);
  });
}

/**
 * Signs in using Google.
 * Attempts native signInWithPopup first. If running on a custom domain (such as ominx-vanguard-fps.ai.studio)
 * that is not yet added to the Firebase Console Authorized Domains list, it automatically falls back
 * to the authorized preview domain bridge to ensure Google login succeeds.
 */
export async function loginWithGoogle(): Promise<UserProfile> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return await ensureUserProfile(result.user);
  } catch (err: any) {
    const isDomainError =
      err?.code === 'auth/unauthorized-domain' ||
      err?.message?.includes('unauthorized-domain') ||
      err?.message?.includes('not authorized to run this operation');

    if (isDomainError) {
      console.warn('Direct Google popup blocked by Firebase unauthorized-domain policy. Routing to Authorized Bridge...');
      try {
        return await loginViaAuthBridge();
      } catch (bridgeErr: any) {
        // Tag with the domain for UI instructions
        bridgeErr.domain = window.location.hostname;
        if (!bridgeErr.code) bridgeErr.code = 'auth/unauthorized-domain';
        throw bridgeErr;
      }
    }
    throw err;
  }
}

/**
 * Registers with a chosen in-game callsign (username), email, and password
 */
export async function registerWithUsernameAndPassword(
  username: string,
  email: string,
  pass: string
): Promise<UserProfile> {
  const cleanUsername = username.trim().replace(/[^a-zA-Z0-9_]/g, '');
  if (cleanUsername.length < 2) {
    throw new Error('Callsign must be at least 2 characters (letters, numbers, underscores).');
  }

  // If email was omitted or just username provided, format domain
  const targetEmail = email.includes('@') ? email.trim() : `${cleanUsername.toLowerCase()}@vanguard.fps`;

  const credential = await createUserWithEmailAndPassword(auth, targetEmail, pass);
  await updateProfile(credential.user, { displayName: cleanUsername });

  return await ensureUserProfile(credential.user, cleanUsername);
}

/**
 * Signs in with callsign/email and password
 */
export async function loginWithUsernameOrEmail(
  identifier: string,
  pass: string
): Promise<UserProfile> {
  const trimmed = identifier.trim();
  const targetEmail = trimmed.includes('@') ? trimmed : `${trimmed.toLowerCase()}@vanguard.fps`;

  const credential = await signInWithEmailAndPassword(auth, targetEmail, pass);
  return await ensureUserProfile(credential.user);
}

/**
 * Logs out of Vanguard session
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Syncs combat progress, XP, coins, loadout to Firestore (or local session for guests)
 */
export async function saveUserProgress(
  userId: string,
  updates: Partial<Omit<UserProfile, 'id' | 'createdAt'>>
): Promise<void> {
  if (!userId) return;
  if (userId.startsWith('guest_')) {
    try {
      const existing = JSON.parse(localStorage.getItem('vanguard.guest_profile') || '{}');
      localStorage.setItem('vanguard.guest_profile', JSON.stringify({ ...existing, ...updates }));
    } catch {}
    return;
  }
  const userRef = doc(db, 'users', userId);
  const path = `users/${userId}`;

  try {
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * Real-time listener for current user's profile
 */
export function subscribeToUserProfile(
  userId: string,
  onProfile: (profile: UserProfile | null) => void
): Unsubscribe {
  if (userId.startsWith('guest_')) {
    return () => {};
  }
  const userRef = doc(db, 'users', userId);
  const path = `users/${userId}`;

  return onSnapshot(
    userRef,
    docSnap => {
      if (docSnap.exists()) {
        onProfile(docSnap.data() as UserProfile);
      } else {
        onProfile(null);
      }
    },
    err => {
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}
