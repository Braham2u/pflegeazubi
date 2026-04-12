import { User } from '../types';

export interface DemoAccount {
  password: string;
  user: User;
}

// Local demo "database" — keyed by email (lowercase)
// These work in the login form without any Firebase connection
export const DEMO_ACCOUNTS: Record<string, DemoAccount> = {
  'admin@pflegeazubi.de': {
    password: 'Admin123',
    user: {
      id: 'demo-admin',
      name: 'Maria Gruber',
      email: 'admin@pflegeazubi.de',
      role: 'admin',
      primaryFacilityId: 'fac1',
      contractedHoursPerWeek: 40,
      language: 'de',
    },
  },
  'abraham@pflegeazubi.de': {
    password: 'Azubi123',
    user: {
      id: 'demo-a1',
      name: 'Abraham T. Borbor Jr.',
      email: 'abraham@pflegeazubi.de',
      role: 'azubi',
      primaryFacilityId: 'fac1',
      ausbildungYear: 2,
      contractedHoursPerWeek: 40,
      language: 'de',
    },
  },
  'fatima@pflegeazubi.de': {
    password: 'Azubi123',
    user: {
      id: 'demo-a2',
      name: 'Fatima Al-Hassan',
      email: 'fatima@pflegeazubi.de',
      role: 'azubi',
      primaryFacilityId: 'fac1',
      ausbildungYear: 1,
      contractedHoursPerWeek: 38,
      language: 'de',
    },
  },
  'jana@pflegeazubi.de': {
    password: 'Azubi123',
    user: {
      id: 'demo-a3',
      name: 'Jana Müller',
      email: 'jana@pflegeazubi.de',
      role: 'azubi',
      primaryFacilityId: 'fac1',
      ausbildungYear: 3,
      contractedHoursPerWeek: 40,
      language: 'de',
    },
  },
};
