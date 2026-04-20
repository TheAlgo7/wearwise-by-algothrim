import type { Metadata, Viewport } from 'next';
import { BottomNav } from '@/components/BottomNav';
import { InstallPrompt } from '@/components/InstallPrompt';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import './globals.css';

export const metadata: Metadata = {
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
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon.ico', type: 'image/x-icon' },
    ],
    apple: [{ url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
    shortcut: '/icons/icon.ico',
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
        <div className="mx-auto max-w-xl min-h-dvh">
          {children}
        </div>
        <BottomNav />
        <InstallPrompt />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
