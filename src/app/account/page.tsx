'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/lib/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { User, Package, MapPin, LogOut, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AccountPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [recentOrdersCount, setRecentOrdersCount] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login?redirect=/account');
      return;
    }

    if (user) {
      const fetchUserData = async () => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        setProfile(profileData);

        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        setRecentOrdersCount(count || 0);
      };

      fetchUserData();
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <div className="flex-1 flex items-center justify-center py-20 text-xs uppercase tracking-widest text-neutral-400">
          Loading Account...
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-[#E5E5E5] gap-4 mb-8">
          <div>
            <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
              Client Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
              Welcome, {profile?.full_name || user.email?.split('@')[0]}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                href="/admin-main/dashboard"
                className="px-4 py-2 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition"
              >
                Admin Dashboard
              </Link>
            )}
            <button
              onClick={signOut}
              className="px-4 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-black text-xs uppercase tracking-widest font-semibold hover:bg-neutral-200 transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Account Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Card 1: Orders */}
          <Link
            href="/account/orders"
            className="p-6 bg-[#F7F7F7] border border-[#E5E5E5] hover:border-black transition flex flex-col justify-between group"
          >
            <div>
              <Package className="w-6 h-6 text-black mb-3" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-black mb-1">
                Order Archive
              </h2>
              <p className="text-xs text-neutral-500">
                Track status, review invoices, and view historical purchases.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-black">
              <span>{recentOrdersCount} {recentOrdersCount === 1 ? 'Order' : 'Orders'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Contact Info */}
          <div className="p-6 bg-[#F7F7F7] border border-[#E5E5E5]">
            <User className="w-6 h-6 text-black mb-3" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-black mb-1">
              Personal Information
            </h2>
            <div className="mt-4 space-y-1.5 text-xs text-neutral-600">
              <p><span className="text-neutral-400">Email:</span> {user.email}</p>
              {profile?.phone && <p><span className="text-neutral-400">Phone:</span> {profile.phone}</p>}
              <p><span className="text-neutral-400">Registered:</span> {new Date(user.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Card 3: Brand Support */}
          <div className="p-6 bg-[#F7F7F7] border border-[#E5E5E5]">
            <ShieldCheck className="w-6 h-6 text-black mb-3" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-black mb-1">
              Client Concierge
            </h2>
            <div className="mt-4 space-y-2 text-xs text-neutral-600">
              <p>Direct Phone: +91 88518 72245</p>
              <p>Email: info.whitelabelclothing@gmail.com</p>
              <a
                href="https://wa.me/918851872245"
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-2 text-black underline font-semibold uppercase tracking-wider text-[11px]"
              >
                Chat on WhatsApp →
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
