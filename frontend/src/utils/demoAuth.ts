import { User } from '../store/authStore';

function buildBaseUser(email: string, name?: string | null): User {
  return {
    id: `demo_${email}`,
    email,
    name: name || email.split('@')[0] || '创业者',
    avatarUrl: null,
    role: 'USER',
    plan: 'FREE',
    consultationsLeft: 0,
    onboardingCompleted: false,
    reports: [],
    diagnosisAnswers: [],
  };
}

export function buildDemoUser(email: string, name?: string | null, existingUser?: User | null): User {
  if (existingUser?.email === email) {
    return {
      ...existingUser,
      name: existingUser.name || name || existingUser.email.split('@')[0] || '创业者',
    };
  }

  return buildBaseUser(email, name);
}

export function buildDemoToken(email: string) {
  return `demo-token-${email}`;
}
