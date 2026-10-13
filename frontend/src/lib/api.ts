export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
export function getToken() { if (typeof window === 'undefined') return ''; return localStorage.getItem('memed_token') || ''; }
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Something went wrong');
  return data as T;
}
export type Campaign = { _id: string; name: string; platform: 'instagram' | 'youtube'; budget: number; spent: number; remaining: number; status: string; milestones: { views: number; payout: number }[]; submissionCount?: number };
export type Submission = { _id: string; postUrl: string; views: number; payoutAllocated: number; status: string; campaignId: Campaign | string };
export const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
