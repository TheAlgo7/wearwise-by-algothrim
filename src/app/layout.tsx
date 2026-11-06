import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import { BottomNav } from '@/components/BottomNav';
import { InstallPrompt } from '@/components/InstallPrompt';
import { RoleProvider } from '@/components/RoleProvider';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { getRole } from '@/lib/auth';
import './globals.css';

/**
 * The display face, for moments only: greetings, page titles, a look's colour
 * headline, big counts. Every label, button and body line stays on the system
 * stack (SamsungOne on his phone, SF on Ishita's). Variable, so the width axis
 * can open it up slightly without loading a second file.
 */
const display = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-display',
  display: 'swap',
});

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
  // The canvas is true black now, so the status bar should be too.
  themeColor: '#000000',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // `data-role` drives the entire palette swap in globals.css — one attribute
  // re-hues every component without a single conditional in the components.
  const role = await getRole();

  return (
    <html lang="en" className={`${display.variable} dark`} data-role={role === 'partner' ? 'partner' : undefined}>
      <body>
        <RoleProvider role={role}>
          {/* overflow-x: clip. An outfit's light may spill past the figure, but
              never far enough to make the page scroll sideways. `clip`, not
              `hidden`: it is not a scroll container, so sticky headers stick.
              On this wrapper rather than <body>, whose overflow is handed to
              the viewport and does not reliably stop the sideways pan. */}
          <div className="mx-auto max-w-xl min-h-dvh overflow-x-clip pb-nav">
            {children}
          </div>
          <BottomNav />
        </RoleProvider>
        <InstallPrompt />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
