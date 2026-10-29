'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import {
  LayoutDashboard,
  Shirt,
  FolderTree,
  Boxes,
  ShoppingBag,
  Users,
  Tag,
  Home,
  Settings,
  ExternalLink,
  LogOut,
  Menu,
  X,
  ShieldAlert,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, isLoading, signOut } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isLoginPage = pathname === '/admin-main';

  // Protected route check
  useEffect(() => {
    if (!isLoading && !isLoginPage) {
      if (!user || !isAdmin) {
        router.push('/admin-main');
      }
    }
  }, [user, isAdmin, isLoading, isLoginPage, router]);

  // If on admin login page, just render children without sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading || (!isAdmin && !isLoginPage)) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-2 border-black border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs uppercase tracking-widest font-semibold text-black">
          Verifying Administrator Privileges...
        </p>
      </div>
    );
  }

  const navItems = [
    { label: 'Dashboard', href: '/admin-main/dashboard', icon: LayoutDashboard },
    { label: 'Products', href: '/admin-main/products', icon: Shirt },
    { label: 'Categories', href: '/admin-main/categories', icon: FolderTree },
    { label: 'Inventory', href: '/admin-main/inventory', icon: Boxes },
    { label: 'Orders', href: '/admin-main/orders', icon: ShoppingBag },
    { label: 'Customers', href: '/admin-main/customers', icon: Users },
    { label: 'Offers', href: '/admin-main/offers', icon: Tag },
    { label: 'Homepage', href: '/admin-main/homepage', icon: Home },
    { label: 'Store Settings', href: '/admin-main/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col md:flex-row text-black">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-[#E5E5E5] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="p-1.5 text-black hover:opacity-60"
            aria-label="Toggle navigation drawer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/admin-main/dashboard" className="inline-block py-0.5" aria-label="Admin Dashboard">
            <Image
              src="/images/brand-logo.png"
              alt="White Label"
              width={100}
              height={100}
              className="h-7 w-auto object-contain max-w-[100px]"
            />
          </Link>
        </div>
        <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 bg-black text-white">
          Admin
        </span>
      </header>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-3/4 max-w-xs bg-white border-r border-[#E5E5E5] p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-[#E5E5E5] mb-6">
                <Link href="/admin-main/dashboard" className="inline-block py-0.5" aria-label="Admin Dashboard">
                  <Image
                    src="/images/brand-logo.png"
                    alt="White Label"
                    width={100}
                    height={100}
                    className="h-8 w-auto object-contain max-w-[100px]"
                  />
                </Link>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="p-1 text-black"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 text-xs uppercase tracking-wider font-medium transition ${
                        isActive
                          ? 'bg-black text-white'
                          : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-6 border-t border-[#E5E5E5] space-y-2">
              <Link
                href="/"
                target="_blank"
                className="flex items-center justify-between px-3.5 py-2 text-xs uppercase tracking-wider text-neutral-600 hover:text-black"
              >
                <span>View Store</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => {
                  signOut();
                  router.push('/admin-main');
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs uppercase tracking-wider text-red-600 hover:bg-red-50 text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col justify-between w-64 bg-white border-r border-[#E5E5E5] min-h-screen sticky top-0 h-screen p-6 flex-shrink-0">
        <div>
          {/* Logo & Console Title */}
          <div className="pb-6 border-b border-[#E5E5E5] mb-6">
            <Link href="/admin-main/dashboard" className="inline-block mb-3 py-0.5 hover:opacity-80 transition" aria-label="Admin Dashboard">
              <Image
                src="/images/brand-logo.png"
                alt="White Label Clothing"
                width={130}
                height={130}
                className="h-10 w-auto object-contain max-w-[130px]"
              />
            </Link>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold font-mono">
                Admin Console
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/admin-main/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 text-xs uppercase tracking-wider font-medium transition ${
                    isActive
                      ? 'bg-black text-white'
                      : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="pt-6 border-t border-[#E5E5E5] space-y-2">
          <div className="text-[11px] text-neutral-500 truncate mb-2">
            <span className="block text-[9px] uppercase tracking-widest text-neutral-400">Authenticated:</span>
            <span className="font-mono text-black">{user?.email}</span>
          </div>

          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 text-xs uppercase tracking-wider text-neutral-600 hover:text-black hover:bg-neutral-100 transition"
          >
            <span>View Storefront</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={() => {
              signOut();
              router.push('/admin-main');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wider text-red-600 hover:bg-red-50 transition text-left"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Admin View Content */}
      <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
