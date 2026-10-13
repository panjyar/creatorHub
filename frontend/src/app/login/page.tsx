'use client';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
export default function LoginPage() {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const router=useRouter();
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const data=await api<{token:string;user:{role:string}}>('/auth/login',{method:'POST',body:JSON.stringify({email,password})});localStorage.setItem('memed_token',data.token);localStorage.setItem('memed_role',data.user.role);router.push(data.user.role==='brand'?'/brand':'/creator')}catch(err){setError(err instanceof Error?err.message:'Login failed')}finally{setBusy(false)}}
  return <main className="auth-wrap"><section className="auth-card"><Link className="brand" href="/"><span className="brand-mark">m</span> meme'd</Link><h1 style={{marginTop:30}}>Welcome back</h1><p className="subtle">Log in to manage campaigns or track your earnings.</p><form onSubmit={submit} style={{display:'grid',gap:16,marginTop:25}}><label className="field">Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"/></label><label className="field">Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="At least 8 characters"/></label>{error&&<div className="error">{error}</div>}<button className="button" disabled={busy}>{busy?'Signing in…':'Log in'}</button></form><p className="subtle" style={{marginTop:20}}>New to Meme'd? <Link href="/signup" style={{color:'var(--purple)',fontWeight:700}}>Create an account</Link></p></section></main>;
}
