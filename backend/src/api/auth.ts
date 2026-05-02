import client, { setAccessToken } from './client';
import type { User } from '../types';

export async function login(email: string, password: string): Promise<{ user: User; accessToken: string }> {
  const res = await client.post<{ accessToken: string; user: User }>('/auth/login', { email, password });
  setAccessToken(res.data.accessToken);
  return res.data;
}

export async function register(email: string, password: string): Promise<{ user: User; accessToken: string }> {
  const res = await client.post<{ accessToken: string; user: User }>('/auth/register', { email, password });
  setAccessToken(res.data.accessToken);
  return res.data;
}

export async function logout(): Promise<void> {
  await client.post('/auth/logout');
  setAccessToken(null);
}

export async function refreshSession(): Promise<User | null> {
  try {
    const res = await client.post<{ accessToken: string }>('/auth/refresh');
    setAccessToken(res.data.accessToken);
    const me = await client.get<{ user: User }>('/auth/me');
    return me.data.user;
  } catch {
    setAccessToken(null);
    return null;
  }
}
