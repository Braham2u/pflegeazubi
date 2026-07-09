import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '';

export interface NewAzubiData {
  name: string;
  email: string;
  dateOfBirth: string;
  ausbildungYear: 1 | 2 | 3;
  contractedHoursPerWeek: number;
  startDate: string;
  phone?: string;
  primaryFacilityId?: string;
}

export interface InviteResult {
  uid: string;
  tempPassword: string;
  clockPin: string;
}

export async function inviteAzubi(data: NewAzubiData): Promise<InviteResult> {
  if (!db) throw new Error('Firebase not configured');

  const existing = await getDocs(
    query(collection(db, 'users'), where('email', '==', data.email)),
  );
  if (!existing.empty) {
    throw new Error('Dieser Azubi ist bereits im System registriert.');
  }

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

  await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: data.email }),
    },
  ).catch(() => {});

  return { uid, tempPassword: tempPw, clockPin };
}

export interface NewSubAdminData {
  name: string;
  email: string;
  primaryFacilityId: string;
}

export async function inviteSubAdmin(data: NewSubAdminData): Promise<{ uid: string; tempPassword: string }> {
  if (!db) throw new Error('Firebase not configured');

  const existing = await getDocs(
    query(collection(db, 'users'), where('email', '==', data.email)),
  );
  if (!existing.empty) {
    throw new Error('Diese E-Mail ist bereits im System registriert.');
  }

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
    if (msg === 'EMAIL_EXISTS') throw new Error('Ein Konto mit dieser E-Mail existiert bereits.');
    throw new Error(msg);
  }
  const uid: string = signUp.localId;

  await setDoc(doc(db, 'users', uid), {
    name: data.name,
    email: data.email,
    role: 'subAdmin',
    primaryFacilityId: data.primaryFacilityId,
    contractedHoursPerWeek: 0,
    language: 'de',
  });

  await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: data.email }),
    },
  ).catch(() => {});

  return { uid, tempPassword: tempPw };
}
