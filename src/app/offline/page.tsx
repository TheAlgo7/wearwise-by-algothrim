import { OneUIHeader, Squircle } from '@/components/oneui';
import { WifiOff } from 'lucide-react';

export const metadata = { title: 'Offline' };

export default function OfflinePage() {
  return (
    <main className="min-h-dvh">
      <OneUIHeader eyebrow="OFFLINE" title="No connection" />
      <div className="reach-zone">
        <Squircle variant="raised" className="p-8 flex flex-col items-center text-center gap-3">
          <div className="h-16 w-16 rounded-full bg-ink-300 flex items-center justify-center">
            <WifiOff size={28} className="text-fog-300" />
          </div>
          <p className="text-oneui-body text-fog-200 text-pretty">
            You're offline. Your wardrobe and past outfits are cached — new generations resume automatically once the network returns.
          </p>
        </Squircle>
      </div>
    </main>
  );
}
