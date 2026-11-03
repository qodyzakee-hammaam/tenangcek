import { cn } from '@/lib/ui/cn';

export const STANDARD_DISCLAIMER =
  'TenangCek adalah alat bantu informasi dan tidak menggantikan diagnosis, perawatan, atau nasihat tenaga kesehatan profesional.';

interface DisclaimerProps {
  className?: string;
}

export default function Disclaimer({ className }: DisclaimerProps) {
  return (
    <p className={cn('border-t border-border pt-3 text-xs leading-5 text-ink-400', className)}>
      {STANDARD_DISCLAIMER}
    </p>
  );
}
