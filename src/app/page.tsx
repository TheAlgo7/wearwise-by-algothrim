import { OwnerHome } from '@/components/home/OwnerHome';
import { PartnerHome } from '@/components/home/PartnerHome';
import { getRole } from '@/lib/auth';

export default async function HomePage() {
  const role = await getRole();
  return role === 'partner' ? <PartnerHome /> : <OwnerHome />;
}
