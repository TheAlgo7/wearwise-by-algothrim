import { redirect } from 'next/navigation';

/** Outfits merged into /looks (saved shelf + picks + wear history). */
export default function OutfitsPage() {
  redirect('/looks');
}
