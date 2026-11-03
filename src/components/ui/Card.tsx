import type { ReactNode } from 'react';
import { cn } from '@/lib/ui/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
}

export default function Card({ children, className, as: Tag = 'div' }: CardProps) {
  return (
    <Tag className={cn('rounded-card border border-border bg-surface', className)}>
      {children}
    </Tag>
  );
}
