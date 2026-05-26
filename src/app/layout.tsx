import type { Metadata, Viewport } from 'next';
import { BottomNav } from '@/components/BottomNav';
import { InstallPrompt } from '@/components/InstallPrompt';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://wearwise-by-algothrim.vercel.app'),
  title: {
    default: 'WearWise · Custom for The Algothrim',
    template: '%s · WearWise',
  },
  description:
    'Personal AI-driven wardrobe & outfit generator. Hybrid engine: database bouncer + AI stylist, anchored to your Style Blueprint.',
  applicationName: 'WearWise',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'WearWise',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png',      sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png',      sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico',       type: 'image/x-icon' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: 'WearWise',
    description: 'Personal AI-driven wardrobe & outfit generator.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WearWise',
    description: 'Personal AI-driven wardrobe & outfit generator.',
    images: ['/og-image.png'],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#0d0005',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="mx-auto max-w-xl min-h-dvh pb-nav">
          {children}
        </div>
        <BottomNav />
        <InstallPrompt />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
