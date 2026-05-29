'use client';

import { Languages } from 'lucide-react';
import type { Language } from '@brick/types';
import { LANGUAGE_OPTIONS, useLangStore } from '@/lib/i18n';
import { Select } from '@/components/ui/select';

export function LanguageSwitcher() {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);

  return (
    <div className="flex items-center gap-1">
      <Languages className="h-4 w-4 text-muted-foreground" />
      <Select
        aria-label="Language"
        className="h-9 w-auto border-none pr-8 text-sm shadow-none focus-visible:ring-0"
        value={lang}
        onChange={(e) => setLang(e.target.value as Language)}
      >
        {LANGUAGE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
