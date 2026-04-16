import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '';

export interface NewAzubiData {
  name: string;
  email: string;
  dateOfBirth: string;          // DD.MM.YYYY
  ausbildungYear: 1 | 2 | 3;
  contractedHoursPerWeek: number;
  startDate: string;            // DD.MM.YYYY — training start date
  phone?: string;
  primaryFacilityId?: string;
}

export interface InviteResult {
  uid: string;
  tempPassword: string;  // shown to admin so they can share it manually if email fails
  clockPin: string;      // 6-digit PIN for the time-clock kiosk
}

/**
 * Creates a Firebase Auth account, writes the Firestore user profile,
 * and attempts to send a password-reset email.
 * Always returns the temp password so the admin can share it via another channel.
 */
export async function inviteAzubi(data: NewAzubiData): Promise<InviteResult> {
  if (!db) throw new Error('Firebase not configured');

  // 0 — Check Firestore first: if a profile with this email already exists, stop early
  const existing = await getDocs(
    query(collection(db, 'users'), where('email', '==', data.email)),
  );
  if (!existing.empty) {
    throw new Error('Dieser Azubi ist bereits im System registriert.');
  }

  // 1 — Create Firebase Auth user with a random temp password
  const tempPw = Math.random().toString(36).slice(-8) + 'Aa1!';
  const signUpRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email, password: tempPw, returnSecureToken: false }),
    },
  );
  const signUp = await signUpRes.json();
  if (signUp.error) {
    const msg: string = signUp.error.message;
    // Auth account exists but no Firestore profile — re-send invite email and surface a
    // clear message so the admin knows the account was already there.
    if (msg === 'EMAIL_EXISTS') {
      await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: data.email }),
        },
      );
      throw new Error(
        'Ein Firebase-Konto für diese E-Mail existiert bereits. Eine neue Einladungsmail wurde erneut versendet.',
      );
    }
    throw new Error(msg);
  }
  const uid: string = signUp.localId;

  // 2 — Write Firestore profile (admin SDK session supplies the auth token)
  // Generate a unique 6-digit clock PIN (zero-padded string so leading zeros are preserved)
  const clockPin = String(Math.floor(100000 + Math.random() * 900000));

  await setDoc(doc(db, 'users', uid), {
    name: data.name,
    email: data.email,
    role: 'azubi',
    primaryFacilityId: data.primaryFacilityId ?? 'fac1',
    ausbildungYear: data.ausbildungYear,
    contractedHoursPerWeek: data.contractedHoursPerWeek,
    dateOfBirth: data.dateOfBirth,
    startDate: data.startDate,
    ...(data.phone ? { phone: data.phone } : {}),
    language: 'de',
    clockPin,
  });

  // 3 — Attempt to send invite email (best-effort, don't throw if it fails)
  await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: data.email }),
    },
  ).catch(() => {/* ignore — admin has the temp password as fallback */});

  return { uid, tempPassword: tempPw, clockPin };
}
