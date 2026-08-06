import { AddModeSwitch } from '@/components/AddModeSwitch';
import { OneUIHeader } from '@/components/oneui';

export const metadata = { title: 'Add item' };

export default function AddItemPage() {
  return (
    <main className="min-h-dvh">
      <OneUIHeader
        title="Add a piece"
        subtitle="Photograph it. WearWise cleans the background and tags it for you."
      />
      <div className="reach-zone">
        <AddModeSwitch />
      </div>
    </main>
  );
}
