'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('info.whitelabelclothing@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg('Authentication failed. Please verify administrator credentials.');
        return;
      }

      if (data.user) {
        // Verify server-side role in public.user_roles
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (roleError || !roleData || roleData.role !== 'admin') {
          await supabase.auth.signOut();
          setErrorMsg('Access denied: This account lacks administrative privileges.');
          return;
        }

        // Redirect to admin dashboard
        router.push('/admin-main/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during administrative login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-white border border-[#E5E5E5] p-8 sm:p-10 shadow-sm">
        {/* Brand Logo */}
        <div className="text-center mb-8">
          <div className="relative h-12 w-36 mx-auto mb-4">
            <Image
              src="/images/brand-logo.png"
              alt="White Label Clothing"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-black text-white text-[10px] uppercase tracking-widest font-semibold mb-2">
            <Lock className="w-3 h-3" />
            <span>Master Console</span>
          </div>
          <h1 className="text-xl font-serif uppercase tracking-wider text-black">
            Administrator Gateway
          </h1>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">
            Protected internal store management system
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 mb-6 bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1.5">
              Admin Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black font-mono"
              placeholder="info.whitelabelclothing@gmail.com"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1.5">
              Admin Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
              placeholder="••••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-black text-white text-xs font-semibold uppercase tracking-widest hover:bg-neutral-800 transition flex items-center justify-center gap-2 mt-2"
          >
            <span>{loading ? 'Verifying Credentials...' : 'Authenticate & Enter'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#E5E5E5] text-center text-[11px] text-neutral-400 space-y-1">
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-black" />
            <span>Session verified with Supabase RLS security definer</span>
          </p>
          <p>Whitelisted Administrator: info.whitelabelclothing@gmail.com</p>
        </div>
      </div>
    </div>
  );
}
