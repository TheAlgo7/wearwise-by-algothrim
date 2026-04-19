import { AddItemForm } from '@/components/AddItemForm';
import { OneUIHeader } from '@/components/oneui';

export const metadata = { title: 'Add item' };

export default function AddItemPage() {
  return (
    <main className="min-h-dvh">
      <OneUIHeader
        eyebrow="WARDROBE"
        title="Add a piece"
        subtitle="Photograph it. WearWise cleans the background and auto-tags it."
      />
      <div className="reach-zone">
        <AddItemForm />
      </div>
    </main>
  );
}
