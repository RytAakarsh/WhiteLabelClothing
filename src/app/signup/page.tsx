'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { createClient } from '@/lib/supabase/client';
import { getAppUrl } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/account';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  React.useEffect(() => {
    const errorParam = searchParams.get('error');
    const errorDesc = searchParams.get('error_description');
    if (errorParam || errorDesc) {
      if (errorDesc?.toLowerCase().includes('not enabled') || errorParam === 'unsupported_provider') {
        setErrorMsg('Google Registration is currently pending provider activation in the Supabase console. Please register using your details below.');
      } else {
        setErrorMsg(errorDesc || errorParam || 'Registration failed. Please register with email.');
      }
    }
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            name: fullName.trim(),
            phone: phone.trim(),
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (data.session) {
        router.push(redirectPath);
      } else {
        // Email confirmation might be enabled
        router.push(redirectPath);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during account creation.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const baseUrl = getAppUrl();
      const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent(redirectPath)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });
      if (error) {
        if (error.message?.toLowerCase().includes('not enabled') || error.message?.toLowerCase().includes('provider')) {
          setErrorMsg('Google Sign-In is pending provider credential activation in the Supabase console. Please create your account with email.');
        } else {
          setErrorMsg(error.message);
        }
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google registration could not be completed. Please create an account with email.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto p-6 sm:p-8 bg-white border border-[#E5E5E5] my-12">
      <div className="text-center mb-8">
        <Link href="/" className="inline-block mx-auto mb-4 hover:opacity-80 transition" aria-label="White Label Clothing Home">
          <Image
            src="/images/brand-logo.png"
            alt="White Label Clothing"
            width={140}
            height={140}
            className="h-12 w-auto object-contain mx-auto max-w-[130px]"
            priority
          />
        </Link>
        <h1 className="text-xl font-serif uppercase tracking-wider text-black">
          Client Registration
        </h1>
        <p className="text-xs text-neutral-500 mt-1 uppercase tracking-widest">
          Join White Label for exclusive drops and order tracking
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 mb-6 bg-red-50 border border-red-200 text-xs text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Google Sign Up */}
      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={loading}
        className="w-full py-3.5 px-4 bg-white border border-[#E5E5E5] hover:border-black text-xs font-semibold uppercase tracking-wider text-black flex items-center justify-center gap-3 transition mb-6 shadow-2xs"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
        <span>Sign up with Google</span>
      </button>

      <div className="relative flex items-center justify-center mb-6">
        <div className="border-t border-[#E5E5E5] w-full" />
        <span className="bg-white px-3 text-[10px] uppercase tracking-widest text-neutral-400 absolute">
          Or with Email
        </span>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
            Full Name
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
            placeholder="Aakarsh Mishra"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
            placeholder="you@domain.com"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
            Phone Number (India)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
            placeholder="8851872245"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
            Create Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
            placeholder="At least 6 characters"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-black text-white text-xs font-semibold uppercase tracking-widest hover:bg-neutral-800 transition flex items-center justify-center gap-2"
        >
          <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-[#E5E5E5] text-center">
        <p className="text-xs text-neutral-500">
          Already registered?{' '}
          <Link
            href={`/login?redirect=${encodeURIComponent(redirectPath)}`}
            className="font-semibold text-black hover:underline ml-1 uppercase tracking-wider"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <Suspense fallback={<div className="text-xs uppercase tracking-widest text-center py-20">Loading Registration...</div>}>
          <SignupForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
