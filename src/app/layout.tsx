import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/context/AuthContext';
import { CartProvider } from '@/lib/context/CartContext';
import CartDrawer from '@/components/cart/CartDrawer';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://whitelabelclothing.com'),
  title: 'White Label Clothing | Luxury Monochrome Outerwear & Sweatshirts',
  description: 'More than just a label. Made to be remembered. Premium heavyweight sweatshirts and architectural jackets crafted in pure monochromatic luxury.',
  icons: {
    icon: '/images/brand-logo.png',
  },
  openGraph: {
    title: 'White Label Clothing | Luxury Monochrome Apparel',
    description: 'More than just a label. Made to be remembered.',
    images: [{ url: '/images/hero-winter-collection.png', width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="min-h-screen flex flex-col bg-white text-black selection:bg-black selection:text-white">
        <AuthProvider>
          <CartProvider>
            {children}
            <CartDrawer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
