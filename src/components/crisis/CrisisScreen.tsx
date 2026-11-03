import { PhoneCall } from 'lucide-react';
import { EMERGENCY_CONTACTS, EMERGENCY_REMINDER } from '@/content/emergency';
import { buttonClass } from '@/components/ui/Button';

interface CrisisScreenProps {
  /** Ringkasan singkat mengapa layar ini muncul. */
  reason?: string;
}

/**
 * Layar krisis (docs/design-system.md §3.6).
 * Menampilkan pesan suportif dan tombol bantuan; tidak ada percakapan biasa.
 */
export default function CrisisScreen({ reason }: CrisisScreenProps) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <section
        role="alert"
        aria-labelledby="crisis-heading"
        className="rounded-card border-2 border-urgency-emergency/40 bg-urgency-emergency-bg p-6 sm:p-8"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-urgency-emergency">Bantuan darurat</p>
        <h1 id="crisis-heading" className="mt-3 text-2xl font-semibold leading-snug text-urgency-emergency-fg sm:text-3xl">
          Kamu tidak harus melewati ini sendirian.
        </h1>
        <p className="mt-3 text-base leading-7 text-urgency-emergency-fg">
          Kalau kamu sedang berpikir untuk menyakiti diri sendiri atau orang lain, ini saatnya menghubungi bantuan
          langsung. TenangCek tidak melanjutkan percakapan biasa untuk situasi seperti ini.
        </p>

        {reason && (
          <p className="mt-3 rounded-control bg-surface/80 px-4 py-3 text-sm leading-6 text-ink-600">
            Catatan: {reason}
          </p>
        )}

        <div className="mt-6 space-y-3">
          {EMERGENCY_CONTACTS.map((contact) => (
            <div key={contact.id} className="rounded-control border border-urgency-emergency/25 bg-surface p-4">
              <p className="text-sm font-semibold text-ink-900">{contact.label}</p>
              <p className="mt-0.5 text-xs leading-5 text-ink-600">{contact.description}</p>
              <a href={`tel:${contact.tel}`} className={buttonClass('danger', 'md', 'mt-3 w-full sm:w-auto')}>
                <PhoneCall className="h-4 w-4" aria-hidden="true" />
                Hubungi {contact.number}
              </a>
            </div>
          ))}
        </div>

        <h2 className="mt-6 text-sm font-semibold text-ink-900">Sambil menunggu bantuan</h2>
        <ol className="mt-2 space-y-2 text-sm leading-6 text-urgency-emergency-fg">
          <li>1. Coba mendekat ke orang yang kamu percaya dan beri tahu apa yang kamu rasakan.</li>
          <li>2. Jauhkan benda yang bisa membahayakan diri sendiri untuk sementara.</li>
          <li>3. Tetap di tempat yang aman sampai bantuan datang atau kamu merasa lebih stabil.</li>
        </ol>

        <p className="mt-5 border-t border-urgency-emergency/20 pt-4 text-xs leading-5 text-urgency-emergency-fg">
          {EMERGENCY_REMINDER}
        </p>
      </section>

      <p className="mt-4 text-center text-xs leading-5 text-ink-400">
        TenangCek adalah alat bantu informasi, bukan layanan darurat dan bukan pengganti tenaga kesehatan profesional.
      </p>
    </div>
  );
}
