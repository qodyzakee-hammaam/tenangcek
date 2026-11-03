'use client';

import { useEffect, useRef, type Ref, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/ui/cn';

interface AutoGrowTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Tinggi maksimum (px) sebelum isi mulai bergulir. */
  maxHeight?: number;
  ref?: Ref<HTMLTextAreaElement>;
}

/**
 * Textarea yang tingginya mengikuti panjang ketikan.
 *
 * Satu baris saat kosong, bertambah baris saat pengguna menulis kalimat
 * panjang, lalu menyusut lagi ketika teks dihapus. Setelah `maxHeight`,
 * isinya bergulir agar composer tidak mendorong area percakapan keluar layar.
 */
export default function AutoGrowTextarea({
  maxHeight = 168,
  className,
  value,
  ref,
  ...props
}: AutoGrowTextareaProps) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  const setRefs = (node: HTMLTextAreaElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: HTMLTextAreaElement | null }).current = node;
  };

  // Ukur ulang setiap nilai berubah (termasuk saat dikosongkan setelah kirim).
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    resizeToContent(el, maxHeight);
  }, [value, maxHeight]);

  // Lebar berubah (rotasi layar / resize jendela) berarti tinggi baris ikut berubah.
  useEffect(() => {
    const handleResize = () => {
      const el = innerRef.current;
      if (el) resizeToContent(el, maxHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [maxHeight]);

  return (
    <textarea
      {...props}
      ref={setRefs}
      rows={1}
      value={value}
      className={cn('resize-none', className)}
    />
  );
}

function resizeToContent(el: HTMLTextAreaElement, maxHeight: number) {
  el.style.height = 'auto';
  const nextHeight = Math.min(el.scrollHeight, maxHeight);
  el.style.height = `${nextHeight}px`;
  el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
}
