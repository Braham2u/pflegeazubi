import { doc, setDoc } from 'firebase/firestore';
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

/**
 * Creates a Firebase Auth account, writes the Firestore user profile,
 * and sends a password-reset email that acts as the invite link.
 * Returns the new user's UID.
 */
export async function inviteAzubi(data: NewAzubiData): Promise<string> {
  if (!db) throw new Error('Firebase not configured');

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
    if (msg === 'EMAIL_EXISTS') throw new Error('Diese E-Mail-Adresse ist bereits registriert.');
    throw new Error(msg);
  }
  const uid: string = signUp.localId;

  // 2 — Write Firestore profile (admin SDK session supplies the auth token)
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
  });

  // 3 — Send invite email (password-reset link acts as the invite)
  const inviteRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: data.email }),
    },
  );
  const invite = await inviteRes.json();
  if (invite.error) throw new Error(invite.error.message);

  return uid;
}
