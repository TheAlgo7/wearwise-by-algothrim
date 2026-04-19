import { OneUIHeader } from '@/components/oneui';
import { StyleBlueprint } from '@/components/StyleBlueprint';
import { APP_TAGLINE } from '@/lib/constants';

export const metadata = { title: 'Profile' };

export default function ProfilePage() {
  return (
    <main className="min-h-dvh pb-4">
      <OneUIHeader
        eyebrow="BLUEPRINT"
        title="Your style"
        subtitle="This private blueprint is injected into every AI generation so outfits feel like you, not a generic mannequin."
      />
      <div className="reach-zone">
        <StyleBlueprint />
        <p className="text-center text-[11px] text-fog-500 mt-6">
          {APP_TAGLINE} · v0.1
        </p>
      </div>
    </main>
  );
}
