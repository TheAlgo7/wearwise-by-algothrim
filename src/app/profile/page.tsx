import { OneUIHeader } from '@/components/oneui';
import { StyleBlueprint } from '@/components/StyleBlueprint';
import { APP_TAGLINE } from '@/lib/constants';

export const metadata = { title: 'Profile' };

export default function ProfilePage() {
  return (
    <main className="min-h-dvh pb-4">
      <OneUIHeader
        title="Your style"
        subtitle="The blueprint every recommendation is measured against."
      />
      <div className="reach-zone">
        <StyleBlueprint />
        <p className="text-center text-[11px] mt-6" style={{ color: 'rgba(255,217,218,0.3)' }}>
          {APP_TAGLINE} · v1.4
        </p>
      </div>
    </main>
  );
}
