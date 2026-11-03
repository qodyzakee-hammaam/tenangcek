import type { Metadata } from 'next';
import CrisisScreen from '@/components/crisis/CrisisScreen';

export const metadata: Metadata = {
  title: 'Bantuan darurat • TenangCek',
  description: 'Akses cepat ke bantuan darurat kesehatan fisik dan kesehatan jiwa.',
};

export default function CrisisPage() {
  return <CrisisScreen />;
}
